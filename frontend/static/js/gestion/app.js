import { api } from './core/api.js';
import { destroyCharts } from './core/components.js';
import { preparePageLeave, showContentSkeleton, mountError } from '../shared/ui.js';
import { normalizeAppPath, ensureAppBase } from '../shared/router.js';

const BASE = '/gestion';

function setDocumentTitle(path) {
    const map = {
        '/connexion': 'Connexion',
        '/dashboard': 'Tableau de bord',
        '/membres': 'Membres',
        '/referents': 'Référents',
        '/conseillers': 'Conseillers',
        '/evenements': 'Événements',
        '/pointage': 'Pointage',
        '/statistiques': 'Statistiques',
        '/poles': 'Pôles',
        '/departements': 'Départements',
        '/professions': 'Professions',
        '/notifications': 'Notifications',
        '/rapports': 'Rapports',
        '/journal': 'Journal',
        '/parametres': 'Paramètres',
    };
    const key = Object.keys(map).find((p) => path === p || path.startsWith(`${p}/`));
    document.title = `${(key && map[key]) || 'Administration'} — Famille Patience`;
}

const PAGES = {
    '/dashboard': () => import('./pages/dashboard.js').then(m => m.renderDashboard),
    '/membres': () => import('./pages/members.js').then(m => m.renderMembers),
    '/referents': () => import('./pages/staff.js').then(m => m.renderReferrers),
    '/conseillers': () => import('./pages/staff.js').then(m => m.renderCounsellors),
    '/evenements': () => import('./pages/events.js').then(m => m.renderEvents),
    '/pointage': () => import('./pages/events.js').then(m => m.renderPointage),
    '/statistiques': () => import('./pages/extras.js').then(m => m.renderStats),
    '/poles': () => import('./pages/extras.js').then(m => m.renderPoles),
    '/departements': () => import('./pages/extras.js').then(m => m.renderDepartments),
    '/professions': () => import('./pages/extras.js').then(m => m.renderProfessions),
    '/notifications': () => import('./pages/extras.js').then(m => m.renderNotifications),
    '/rapports': () => import('./pages/extras.js').then(m => m.renderReports),
    '/journal': () => import('./pages/extras.js').then(m => m.renderActivity),
    '/parametres': () => import('./pages/extras.js').then(m => m.renderSettings),
};

async function loadPage(path, ...args) {
    const loader = PAGES[path];
    if (!loader) return import('./pages/dashboard.js').then(m => m.renderDashboard());
    const fn = await loader();
    return fn(...args);
}

async function stopPointagePolling() {
    try {
        const m = await import('./pages/events.js');
        m.stopPointagePolling();
    } catch { /* */ }
}

class Router {
    constructor() {
        window.addEventListener('popstate', () => this.resolve());
    }

    resolve() {
        if (!ensureAppBase(BASE)) return;
        stopPointagePolling();
        destroyCharts();
        let path = normalizeAppPath(location.pathname, BASE);
        setDocumentTitle(path);
        if (path === '/') { this.handleRoot(); return; }
        if (path === '/connexion') { renderLogin(); return; }

        const match = this.matchRoute(path);
        if (match) {
            this.guard(() => match.handler(...match.params));
            return;
        }
        this.guard(() => loadPage('/dashboard'));
    }

    matchRoute(path) {
        const patterns = [
            [/^\/conseillers\/([0-9a-f-]+)\/referents\/([0-9a-f-]+)$/, (cid, rid) =>
                import('./pages/staff-detail.js').then(m =>
                    m.renderReferrerDetail(rid, {
                        backPath: `/conseillers/${cid}`,
                        currentPath: `/conseillers/${cid}/referents/${rid}`,
                        breadcrumb: 'Conseiller → Référent',
                    }))],
            [/^\/referents\/([0-9a-f-]+)$/, (id) =>
                import('./pages/staff-detail.js').then(m => m.renderReferrerDetail(id))],
            [/^\/conseillers\/([0-9a-f-]+)$/, (id) =>
                import('./pages/staff-detail.js').then(m => m.renderCounsellorDetail(id))],
            [/^\/membres\/nouveau$/, () =>
                import('./pages/member-create.js').then(m => m.renderMemberCreate())],
            [/^\/membres\/([0-9a-f-]+)\/modifier$/, (id) =>
                import('./pages/member-edit.js').then(m => m.renderMemberEdit(id))],
            [/^\/membres\/([0-9a-f-]+)$/, (id) =>
                import('./pages/staff-detail.js').then(m => m.renderMemberDetail(id))],
            ['/dashboard', () => loadPage('/dashboard')],
            ['/membres', () => loadPage('/membres')],
            ['/referents', () => loadPage('/referents')],
            ['/conseillers', () => loadPage('/conseillers')],
            ['/evenements', () => loadPage('/evenements')],
            ['/pointage', () => loadPage('/pointage')],
            ['/statistiques', () => loadPage('/statistiques')],
            ['/poles', () => loadPage('/poles')],
            ['/departements', () => loadPage('/departements')],
            ['/professions', () => loadPage('/professions')],
            ['/notifications', () => loadPage('/notifications')],
            ['/rapports', () => loadPage('/rapports')],
            ['/journal', () => loadPage('/journal')],
            ['/parametres', () => loadPage('/parametres')],
        ];
        for (const [pattern, handler] of patterns) {
            if (typeof pattern === 'string' && pattern === path) return { handler, params: [] };
            if (pattern instanceof RegExp) {
                const m = path.match(pattern);
                if (m) return { handler, params: m.slice(1) };
            }
        }
        return null;
    }

    navigate(path) {
        preparePageLeave().then(() => {
            history.pushState({}, '', `${BASE}${path}`);
            this.resolve();
        });
    }

    async handleRoot() {
        if (api.token) {
            try {
                const p = await api.getProfile();
                if (p.data?.role !== 'admin') { api.clear(); this.navigate('/connexion'); return; }
                api.setUser(p.data);
                this.navigate('/dashboard');
            } catch { api.clear(); this.navigate('/connexion'); }
        } else this.navigate('/connexion');
    }

    guard(fn) {
        if (!api.token) { this.navigate('/connexion'); return; }
        showContentSkeleton('list');
        Promise.resolve(fn()).catch(err => {
            console.error(err);
            mountError(() => this.resolve());
        });
    }
}

export const router = new Router();

function renderLogin() {
    stopPointagePolling();
    destroyCharts();
    document.getElementById('app').innerHTML = `
        <div class="adm-login-page">
            <div class="adm-login-left">
                <div>
                    <div style="font-size:32px;font-weight:700;letter-spacing:-.03em">Famille Patience</div>
                    <p style="opacity:.8;margin-top:12px;font-size:16px;line-height:1.6">Centre de contrôle de la plateforme.<br>Gérez membres, événements et statistiques.</p>
                </div>
                <p style="opacity:.5;font-size:12px">Administration — Accès restreint</p>
            </div>
            <div class="adm-login-right">
                <form class="adm-login-form" id="login-form">
                    <h1>Connexion</h1>
                    <p>Accédez à votre espace administrateur</p>
                    <div class="adm-form-group"><label class="adm-label">Email</label><input type="email" class="adm-input" name="email" required placeholder="admin@famille-patience.org"></div>
                    <div class="adm-form-group"><label class="adm-label">Mot de passe</label><input type="password" class="adm-input" name="password" required></div>
                    <div id="login-error" style="display:none;color:#ef4444;font-size:13px;background:#fef2f2;padding:10px;border-radius:8px;margin-bottom:12px"></div>
                    <button type="submit" class="adm-btn adm-btn-primary" style="width:100%">Se connecter</button>
                </form>
            </div>
        </div>`;

    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const err = document.getElementById('login-error');
        err.style.display = 'none';
        const f = e.target;
        try {
            const data = await api.login(f.email.value, f.password.value);
            if (data.user?.role !== 'admin') { err.textContent = 'Accès réservé aux administrateurs.'; err.style.display = 'block'; return; }
            api.setTokens(data.access, data.refresh);
            api.setUser(data.user);
            router.navigate('/dashboard');
        } catch (ex) { err.textContent = ex.message; err.style.display = 'block'; }
    });
}

export { stopPointagePolling };

document.addEventListener('DOMContentLoaded', () => router.resolve());
