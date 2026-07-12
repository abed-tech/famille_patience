import { createApi, extractList } from '../shared/api.js';
import { renderLayout, getPortailNav } from '../shared/layout.js';

const APP_BASE = window.APP_BASE || '/portail';
const api = createApi('portail');

class Router {
    constructor() {
        this.routes = {
            [`${APP_BASE}/`]: () => this.handleHome(),
            [`${APP_BASE}/connexion`]: () => renderLogin(),
            [`${APP_BASE}/dashboard`]: () => renderDashboard(),
            [`${APP_BASE}/membres`]: () => renderMembers(),
            [`${APP_BASE}/evenements`]: () => renderEvents(),
        };
        window.addEventListener('popstate', () => this.resolve(false));
    }

    resolve(push = true) {
        const path = location.pathname.replace(/\/$/, '') || APP_BASE;
        const fullPath = path.startsWith(APP_BASE) ? path : `${APP_BASE}${path === '/' ? '' : path}`;
        const handler = this.routes[fullPath] || this.routes[`${APP_BASE}/`];
        if (push && location.pathname !== fullPath) history.pushState({}, '', fullPath);
        handler();
    }

    navigate(path, push = true) {
        if (push) history.pushState({}, '', path);
        const handler = this.routes[path] || this.routes[`${APP_BASE}/`];
        handler();
    }

    async handleHome() {
        if (api.token) {
            try {
                const profile = await api.getProfile();
                const user = profile.data;
                if (user.role === 'admin') {
                    api.clearTokens();
                    location.href = '/gestion/connexion';
                    return;
                }
                api.setUser(user);
                this.navigate(`${APP_BASE}/dashboard`);
            } catch {
                api.clearTokens();
                this.navigate(`${APP_BASE}/connexion`);
            }
        } else {
            this.navigate(`${APP_BASE}/connexion`);
        }
    }
}

const router = new Router();

function renderLogin() {
    document.getElementById('app').innerHTML = `
        <div class="min-h-screen flex flex-col safe-area">
            <div class="px-4 py-3 safe-top">
                <a href="/" class="text-sm text-primary-500 flex items-center gap-1 min-h-[44px]">← Accueil</a>
            </div>
            <div class="flex-1 flex items-center justify-center px-4 xs:px-5 pb-8">
                <div class="w-full max-w-sm fade-in">
                    <div class="text-center mb-6">
                        <div class="w-14 h-14 xs:w-16 xs:h-16 bg-primary-500 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-primary-200">
                            <span class="text-white font-bold text-xl xs:text-2xl">FP</span>
                        </div>
                        <h1 class="text-lg xs:text-xl font-bold text-gray-900">Portail Membres</h1>
                        <p class="text-gray-500 mt-1 text-xs xs:text-sm">Membres, référents, conseillers</p>
                    </div>
                    <form id="login-form" class="card space-y-3 xs:space-y-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
                            <input type="email" name="email" required class="input-field" placeholder="votre@email.com" autocomplete="email">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Mot de passe</label>
                            <input type="password" name="password" required class="input-field" placeholder="••••••••" autocomplete="current-password">
                        </div>
                        <div id="login-error" class="hidden text-red-500 text-sm bg-red-50 p-3 rounded-xl"></div>
                        <button type="submit" class="btn-primary w-full">Se connecter</button>
                    </form>
                    <p class="text-center text-xs text-gray-400 mt-4">
                        Administrateur ? <a href="/gestion/connexion" class="text-primary-500 underline">Espace admin</a>
                    </p>
                </div>
            </div>
        </div>
    `;

    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const form = e.target;
        const errorEl = document.getElementById('login-error');
        errorEl.classList.add('hidden');
        try {
            const data = await api.login(form.email.value, form.password.value);
            if (data.user?.role === 'admin') {
                errorEl.textContent = 'Utilisez l\'espace administration (/gestion/) pour vous connecter.';
                errorEl.classList.remove('hidden');
                return;
            }
            api.setTokens(data.access, data.refresh);
            api.setUser(data.user);
            router.navigate(`${APP_BASE}/dashboard`);
        } catch (err) {
            errorEl.textContent = err.message;
            errorEl.classList.remove('hidden');
        }
    });
}

async function renderDashboard() {
    if (!api.token) { router.navigate(`${APP_BASE}/connexion`); return; }
    const user = api.getUser();
    let stats = {};
    try {
        const res = await api.getDashboard(user.role);
        stats = res.data || {};
    } catch { router.navigate(`${APP_BASE}/connexion`); return; }

    let content = `<h2 class="text-lg xs:text-xl font-bold text-gray-900 mb-4">Bonjour, ${user.first_name || ''}</h2>`;

    if (user.role === 'counsellor') {
        content += `
            <div class="stat-card mb-4"><p class="text-xs text-gray-500">Membres supervisés</p><p class="text-2xl font-bold">${stats.total_members ?? 0}</p></div>
            <div class="card"><h3 class="font-semibold text-sm mb-3">Mes référents</h3>
            ${(stats.referrers || []).map(r => `<div class="flex justify-between py-2.5 border-b border-gray-50 text-sm"><span>${r.name}</span><span class="text-primary-600 text-xs">${r.member_count}</span></div>`).join('') || '<p class="text-gray-400 text-sm">Aucun référent</p>'}
            </div>`;
    } else if (user.role === 'referrer') {
        content += `
            <div class="stat-card mb-4"><p class="text-xs text-gray-500">Mes membres</p><p class="text-2xl font-bold">${stats.total_members ?? 0}</p></div>
            <div class="card">${(stats.members || []).map(m => `<div class="flex justify-between py-2.5 border-b border-gray-50 text-sm"><span class="truncate mr-2">${m.full_name}</span><span class="text-gray-400 text-xs shrink-0">${m.phone || ''}</span></div>`).join('') || '<p class="text-gray-400 text-sm">Aucun membre</p>'}</div>`;
    } else {
        content += `<div class="card"><p class="text-sm text-gray-600">Consultez vos événements et votre profil.</p></div>`;
    }

    renderLayout({ content, activePage: 'dashboard', api, router, appBase: APP_BASE, appType: 'portail', navItems: getPortailNav(user.role) });
}

async function renderMembers() {
    if (!api.token) { router.navigate(`${APP_BASE}/connexion`); return; }
    const user = api.getUser();
    let members = [];
    try { members = extractList(await api.getMembers()); } catch { /* empty */ }

    const content = `
        <div class="flex items-center justify-between mb-4 gap-2">
            <h2 class="text-lg xs:text-xl font-bold text-gray-900">Membres</h2>
            <span class="text-xs text-gray-400 shrink-0">${members.length}</span>
        </div>
        <div class="space-y-2 xs:space-y-3">
            ${members.length ? members.map(m => `
                <div class="card flex items-center gap-3 !p-3 xs:!p-4">
                    <div class="w-10 h-10 xs:w-11 xs:h-11 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 font-bold text-sm shrink-0">${(m.first_name?.[0] || '?')}${(m.last_name?.[0] || '')}</div>
                    <div class="flex-1 min-w-0">
                        <p class="font-semibold text-sm truncate">${m.full_name}</p>
                        <p class="text-xs text-gray-400 truncate">${m.member_number}</p>
                    </div>
                    <span class="text-[10px] xs:text-xs px-2 py-0.5 rounded-full shrink-0 ${m.status === 'active' ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'}">${m.status === 'active' ? 'Actif' : m.status}</span>
                </div>
            `).join('') : '<div class="card text-center py-10"><p class="text-gray-400 text-sm">Aucun membre</p></div>'}
        </div>`;

    renderLayout({ content, activePage: 'members', api, router, appBase: APP_BASE, appType: 'portail', navItems: getPortailNav(user.role) });
}

async function renderEvents() {
    if (!api.token) { router.navigate(`${APP_BASE}/connexion`); return; }
    const user = api.getUser();
    let events = [];
    try { events = extractList(await api.getEvents()); } catch { /* empty */ }

    const statusMap = { draft: ['Brouillon', 'bg-gray-100 text-gray-600'], open: ['Ouvert', 'bg-green-50 text-green-600'], closed: ['Fermé', 'bg-red-50 text-red-600'], cancelled: ['Annulé', 'bg-yellow-50 text-yellow-600'] };

    const content = `
        <h2 class="text-lg xs:text-xl font-bold text-gray-900 mb-4">Événements</h2>
        <div class="space-y-2 xs:space-y-3">
            ${events.length ? events.map(e => {
                const [label, cls] = statusMap[e.status] || statusMap.draft;
                return `<div class="card !p-3 xs:!p-4">
                    <div class="flex justify-between gap-2 items-start">
                        <div class="min-w-0"><p class="font-semibold text-sm truncate">${e.name}</p>
                        <p class="text-xs text-gray-400 mt-0.5">📅 ${e.date} · ${(e.time || '').slice(0, 5)}</p>
                        <p class="text-xs text-gray-400 truncate">📍 ${e.location}</p></div>
                        <span class="text-[10px] xs:text-xs px-2 py-0.5 rounded-full shrink-0 ${cls}">${label}</span>
                    </div>
                </div>`;
            }).join('') : '<div class="card text-center py-10"><p class="text-gray-400 text-sm">Aucun événement</p></div>'}
        </div>`;

    renderLayout({ content, activePage: 'events', api, router, appBase: APP_BASE, appType: 'portail', navItems: getPortailNav(user.role) });
}

document.addEventListener('DOMContentLoaded', () => router.resolve(false));
export { router };
