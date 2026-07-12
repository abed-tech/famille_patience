import { api } from './core/api.js';
import { destroyCharts } from './core/components.js';
import { preparePageLeave, showContentSkeleton, mountError } from '../shared/ui.js';
import { normalizeAppPath, ensureAppBase } from '../shared/router.js';

const BASE = '/conseiller';

const PAGES = {
    '/profil': () => import('./pages/profile.js').then(m => m.renderProfile),
    '/dashboard': () => import('./pages/dashboard.js').then(m => m.renderDashboard),
    '/referents': () => import('./pages/referrers.js').then(m => m.renderReferrers),
    '/evenements': () => import('./pages/events.js').then(m => m.renderEvents),
};

async function loadPage(path, ...args) {
    const loader = PAGES[path];
    if (!loader) return import('./pages/dashboard.js').then(m => m.renderDashboard());
    const fn = await loader();
    return fn(...args);
}

class Router {
    constructor() {
        window.addEventListener('popstate', () => this.resolve());
    }

    resolve() {
        if (!ensureAppBase(BASE)) return;
        destroyCharts();
        let path = normalizeAppPath(location.pathname, BASE);
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
            [/^\/referents\/([0-9a-f-]+)$/, (id) => import('./pages/referrer-detail.js').then(m => m.renderReferrerDetail(id))],
            [/^\/membres\/([0-9a-f-]+)$/, (id) => import('./pages/member-detail.js').then(m => m.renderMemberDetail(id))],
            [/^\/evenements\/([0-9a-f-]+)$/, (id) => import('./pages/events.js').then(m => m.renderEventDetail(id))],
            ['/profil', () => loadPage('/profil')],
            ['/dashboard', () => loadPage('/dashboard')],
            ['/referents', () => loadPage('/referents')],
            ['/evenements', () => loadPage('/evenements')],
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
                if (p.data?.role !== 'counsellor') { api.clear(); this.navigate('/connexion'); return; }
                api.setUser(p.data);
                this.navigate('/dashboard');
            } catch { api.clear(); this.navigate('/connexion'); }
        } else this.navigate('/connexion');
    }

    guard(fn) {
        if (!api.token) { this.navigate('/connexion'); return; }
        showContentSkeleton('dashboard');
        Promise.resolve(fn()).catch(err => {
            console.error(err);
            mountError(() => this.resolve());
        });
    }
}

export const router = new Router();

function renderLogin() {
    destroyCharts();
    document.getElementById('app').innerHTML = `
        <div class="cns-login-page">
            <div class="cns-login-hero">
                <div class="cns-login-logo">FP</div>
                <h1>Famille Patience</h1>
                <p>Espace Conseiller — Supervisez vos référents et suivez vos membres en temps réel.</p>
            </div>
            <div class="cns-login-form-wrap">
                <form class="cns-login-form" id="login-form">
                    <h2>Connexion</h2>
                    <p>Accédez à votre tableau de bord conseiller</p>
                    <div class="cns-form-group">
                        <label>Email</label>
                        <input type="email" name="email" required placeholder="conseiller@famille-patience.org">
                    </div>
                    <div class="cns-form-group">
                        <label>Mot de passe</label>
                        <input type="password" name="password" required>
                    </div>
                    <div id="login-error" class="cns-error hidden"></div>
                    <button type="submit" class="cns-btn cns-btn-primary cns-btn-block">Se connecter</button>
                </form>
            </div>
        </div>`;

    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const err = document.getElementById('login-error');
        err.classList.add('hidden');
        const f = e.target;
        try {
            const res = await api.login(f.email.value, f.password.value);
            api.setTokens(res.access, res.refresh);
            api.setUser(res.user);
            router.navigate('/dashboard');
        } catch (ex) {
            err.textContent = ex.message || 'Identifiants incorrects';
            err.classList.remove('hidden');
        }
    });
}

router.resolve();
