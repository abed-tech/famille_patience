import { createApi, extractList } from '../shared/api.js';
import { renderAppShell, getReferentNav } from '../shared/layout.js';

const APP_BASE = '/referent';
const api = createApi('referent');
const TITLE = { icon: 'RC', label: 'Référent / Conseiller', short: 'Staff', subtitle: 'Espace encadrement' };

class Router {
    constructor() {
        this.routes = {
            [`${APP_BASE}/`]: () => this.handleHome(),
            [`${APP_BASE}/connexion`]: () => renderLogin(),
            [`${APP_BASE}/dashboard`]: () => renderDashboard(),
            [`${APP_BASE}/membres`]: () => renderMembers(),
            [`${APP_BASE}/referents`]: () => renderReferrers(),
        };
        window.addEventListener('popstate', () => this.resolve());
    }
    resolve() {
        const path = location.pathname.replace(/\/$/, '') || APP_BASE;
        (this.routes[path] || this.routes[`${APP_BASE}/`])();
    }
    navigate(path, push = true) {
        if (push) history.pushState({}, '', path);
        (this.routes[path] || this.routes[`${APP_BASE}/`])();
    }
    async handleHome() {
        if (api.token) {
            try {
                const p = await api.getProfile();
                if (!['referrer', 'counsellor'].includes(p.data?.role)) { api.clearTokens(); this.navigate(`${APP_BASE}/connexion`); return; }
                api.setUser(p.data);
                this.navigate(`${APP_BASE}/dashboard`);
            } catch { api.clearTokens(); this.navigate(`${APP_BASE}/connexion`); }
        } else this.navigate(`${APP_BASE}/connexion`);
    }
}

const router = new Router();

function renderLogin() {
    document.getElementById('app').innerHTML = `
        <div class="min-h-screen flex items-center justify-center px-4 safe-area bg-gradient-to-br from-primary-50 to-white">
            <div class="w-full max-w-sm fade-in">
                <div class="text-center mb-6">
                    <div class="w-14 h-14 bg-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-3 text-white font-bold">RC</div>
                    <h1 class="text-lg font-bold">Espace Référent / Conseiller</h1>
                    <p class="text-xs text-gray-500 mt-1">Accès réservé au personnel encadrant</p>
                </div>
                <form id="login-form" class="card space-y-3">
                    <input type="email" name="email" required class="input-field" placeholder="Email">
                    <input type="password" name="password" required class="input-field" placeholder="Mot de passe">
                    <div id="login-error" class="hidden text-red-500 text-sm bg-red-50 p-3 rounded-xl"></div>
                    <button type="submit" class="btn-primary w-full">Se connecter</button>
                </form>
            </div>
        </div>`;
    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault(); const err = document.getElementById('login-error'); err.classList.add('hidden');
        try {
            const data = await api.login(e.target.email.value, e.target.password.value);
            if (!['referrer', 'counsellor'].includes(data.user?.role)) {
                err.textContent = 'Accès réservé aux référents et conseillers.'; err.classList.remove('hidden'); return;
            }
            api.setTokens(data.access, data.refresh); api.setUser(data.user);
            router.navigate(`${APP_BASE}/dashboard`);
        } catch (ex) { err.textContent = ex.message; err.classList.remove('hidden'); }
    });
}

async function renderDashboard() {
    if (!api.token) { router.navigate(`${APP_BASE}/connexion`); return; }
    const user = api.getUser();
    let stats = {};
    try { stats = (await api.getDashboard(user.role)).data || {}; } catch { router.navigate(`${APP_BASE}/connexion`); return; }

    let content = `<h2 class="text-lg font-bold mb-4">Bonjour, ${user.first_name || ''}</h2>`;
    if (user.role === 'counsellor') {
        content += `
            <div class="stat-card mb-4"><p class="text-xs text-gray-500">Membres supervisés</p><p class="text-2xl font-bold">${stats.total_members ?? 0}</p></div>
            <div class="card"><h3 class="font-semibold text-sm mb-2">Mes référents</h3>
            ${(stats.referrers || []).map(r => `<div class="flex justify-between py-2 border-b border-gray-50 text-sm"><span>${r.name}</span><span class="text-primary-600 text-xs">${r.member_count} membres</span></div>`).join('') || '<p class="text-gray-400 text-sm">Aucun</p>'}</div>`;
    } else {
        content += `
            <div class="stat-card mb-4"><p class="text-xs text-gray-500">Membres assignés</p><p class="text-2xl font-bold">${stats.total_members ?? 0}</p></div>
            <div class="card">${(stats.members || []).slice(0, 10).map(m => `<div class="py-2 border-b border-gray-50 text-sm flex justify-between"><span class="truncate">${m.full_name}</span><span class="text-gray-400 text-xs">${m.phone || ''}</span></div>`).join('') || '<p class="text-gray-400 text-sm">Aucun membre</p>'}</div>`;
    }
    shell('dashboard', content, user.role);
}

async function renderMembers() {
    if (!api.token) { router.navigate(`${APP_BASE}/connexion`); return; }
    const user = api.getUser();
    let members = [];
    try { members = extractList(await api.getMembers()); } catch { /* */ }
    shell('members', `
        <h2 class="text-lg font-bold mb-4">Mes membres (${members.length})</h2>
        <div class="space-y-2">${members.map(m => `
            <div class="card flex gap-3 !p-3">
                <div class="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 font-bold text-sm shrink-0">${(m.first_name?.[0] || '')}${(m.last_name?.[0] || '')}</div>
                <div class="flex-1 min-w-0"><p class="font-semibold text-sm truncate">${m.full_name}</p><p class="text-xs text-gray-400">${m.phone_primary || ''}</p></div>
                <span class="text-[10px] px-2 py-0.5 rounded-full shrink-0 ${m.status === 'active' ? 'bg-green-50 text-green-600' : 'bg-gray-100'}">${m.status === 'active' ? 'Actif' : m.status}</span>
            </div>`).join('') || '<div class="card text-center py-10 text-gray-400 text-sm">Aucun membre assigné</div>'}
        </div>`, user.role);
}

async function renderReferrers() {
    if (!api.token) { router.navigate(`${APP_BASE}/connexion`); return; }
    const user = api.getUser();
    if (user.role !== 'counsellor') { router.navigate(`${APP_BASE}/dashboard`); return; }
    const stats = (await api.getDashboard('counsellor')).data || {};
    shell('referrers', `
        <h2 class="text-lg font-bold mb-4">Mes référents</h2>
        <div class="space-y-2">${(stats.referrers || []).map(r => `
            <div class="card !p-4 flex justify-between items-center">
                <div><p class="font-semibold text-sm">${r.name}</p><p class="text-xs text-gray-400">${r.member_count} membre(s)</p></div>
            </div>`).join('') || '<div class="card text-center py-10 text-gray-400 text-sm">Aucun référent</div>'}
        </div>`, user.role);
}

function shell(page, content, role) {
    renderAppShell({ content, activePage: page, api, router, appBase: APP_BASE, appType: 'referent', navItems: getReferentNav(role || api.getUser().role), title: TITLE });
}

document.addEventListener('DOMContentLoaded', () => router.resolve());
