import { api, setAgentFromDashboard } from './core/api.js';
import { bindMembreNavigation } from './core/navigation.js';
import { preparePageLeave, showContentSkeleton, mountError } from '../shared/ui.js';
import { normalizeAppPath, ensureAppBase } from '../shared/router.js';
import { unlockNativeScroll } from '../shared/native-scroll.js';

const BASE = '/membre';

const PAGE_TITLES = {
    '/': 'Famille Patience',
    '/connexion': 'Connexion',
    '/inscription': 'Inscription',
    '/accueil': 'Accueil',
    '/profil': 'Profil',
    '/carte': 'Ma carte',
    '/qr-code': 'QR Code',
    '/evenements': 'Événements',
    '/historique': 'Historique',
    '/notifications': 'Notifications',
    '/parametres': 'Paramètres',
    '/encadrement': 'Encadrement',
    '/mes-membres': 'Mes membres',
    '/mes-referents': 'Mes référents',
    '/mon-referent': 'Mon référent',
    '/mon-conseiller': 'Mon conseiller',
    '/pointage': 'Pointage',
};

function setDocumentTitle(path) {
    const key = Object.keys(PAGE_TITLES).find((p) => path === p || path.startsWith(`${p}/`));
    const label = (key && PAGE_TITLES[key]) || 'Espace membre';
    document.title = `${label} — Famille Patience`;
}

const PAGES = {
    '/connexion': () => import('./pages/login.js').then(m => m.renderLogin),
    '/inscription': () => import('./pages/register.js').then(m => m.renderRegister),
    '/accueil': () => import('./pages/home.js').then(m => m.renderHome),
    '/profil': () => import('./pages/profile.js').then(m => m.renderProfile),
    '/mon-referent': () => import('./pages/referrer.js').then(m => m.renderReferrer),
    '/mon-conseiller': () => import('./pages/counsellor.js').then(m => m.renderCounsellor),
    '/mon-conseiller/profil': () => import('./pages/counsellor.js').then(m => m.renderCounsellorProfile),
    '/carte': () => import('./pages/card.js').then(m => m.renderCard),
    '/qr-code': () => import('./pages/card.js').then(m => m.renderQR),
    '/evenements': () => import('./pages/events.js').then(m => m.renderEvents),
    '/historique': () => import('./pages/history.js').then(m => m.renderHistory),
    '/notifications': () => import('./pages/notifications.js').then(m => m.renderNotifications),
    '/parametres': () => import('./pages/settings.js').then(m => m.renderSettings),
    '/encadrement': () => import('./pages/staff-dashboard.js').then(m => m.renderStaffDashboard),
    '/mes-membres': () => import('./pages/my-members.js').then(m => m.renderMyMembers),
    '/mes-referents': () => import('./pages/my-referrers.js').then(m => m.renderMyReferrers),
    '/pointage': () => import('./pages/pointage.js').then(m => m.renderPointage),
    '/pointage/scan': () => import('./pages/pointage.js').then(m => m.renderPointageScan),
    '/pointage/manuel': () => import('./pages/pointage.js').then(m => m.renderPointageManual),
};

async function loadPage(path, router, ...args) {
    const loader = PAGES[path];
    if (!loader) return import('./pages/home.js').then(m => m.renderHome(router));
    const fn = await loader();
    return fn(router, ...args);
}

class Router {
    constructor() {
        this.routes = {
            '/': () => this.handleRoot(),
            '/connexion': () => loadPage('/connexion', this),
            '/inscription': () => loadPage('/inscription', this, 0),
            '/accueil': () => this.guard(() => loadPage('/accueil', this)),
            '/profil': () => this.guard(() => loadPage('/profil', this)),
            '/mon-referent': () => this.guard(() => loadPage('/mon-referent', this)),
            '/mon-conseiller': () => this.guard(() => loadPage('/mon-conseiller', this)),
            '/mon-conseiller/profil': () => this.guard(() => loadPage('/mon-conseiller/profil', this)),
            '/carte': () => this.guard(() => loadPage('/carte', this)),
            '/qr-code': () => this.guard(() => loadPage('/qr-code', this)),
            '/evenements': () => this.guard(() => loadPage('/evenements', this)),
            '/historique': () => this.guard(() => loadPage('/historique', this)),
            '/notifications': () => this.guard(() => loadPage('/notifications', this)),
            '/parametres': () => this.guard(() => loadPage('/parametres', this)),
            '/encadrement': () => this.guard(() => loadPage('/encadrement', this)),
            '/mes-membres': () => this.guard(() => loadPage('/mes-membres', this)),
            '/mes-referents': () => this.guard(() => loadPage('/mes-referents', this)),
            '/pointage': () => this.guard(() => loadPage('/pointage', this)),
            '/pointage/scan': () => this.guard(() => loadPage('/pointage/scan', this)),
            '/pointage/manuel': () => this.guard(() => loadPage('/pointage/manuel', this)),
        };
        window.addEventListener('popstate', () => this.resolve());
    }

    resolve() {
        if (!ensureAppBase(BASE)) return;
        let path = normalizeAppPath(location.pathname, BASE);
        if (path.startsWith('/evenements-agent')) {
            path = path.replace('/evenements-agent', '/evenements');
        }
        setDocumentTitle(path);
        if (path === '/') { this.handleRoot(); return; }

        const memberMatch = path.match(/^\/mes-membres\/([^/]+)$/);
        if (memberMatch) {
            this.guard(() => import('./pages/my-members.js').then(m => m.renderStaffMember(this, memberMatch[1])));
            return;
        }
        const refMatch = path.match(/^\/mes-referents\/([^/]+)$/);
        if (refMatch) {
            this.guard(() => import('./pages/my-referrers.js').then(m => m.renderCounsellorReferrer(this, refMatch[1])));
            return;
        }

        const eventMatch = path.match(/^\/evenements\/([0-9a-f-]+)$/);
        if (eventMatch) {
            this.guard(() => import('./pages/events.js').then(m => m.renderEventDetail(this, eventMatch[1])));
            return;
        }

        const fn = this.routes[path];
        if (fn) fn();
        else this.guard(() => loadPage('/accueil', this));
    }

    navigate(path) {
        const current = normalizeAppPath(location.pathname, BASE);
        if (current.startsWith('/pointage') && !path.startsWith('/pointage')) {
            import('./pages/pointage.js').then(m => m.teardownPointage?.()).catch(() => {});
        }
        if (current.match(/^\/evenements\/[0-9a-f-]+$/) && !path.match(/^\/evenements\/[0-9a-f-]+$/)) {
            import('./pages/events.js').then(m => m.stopDetailPolling?.()).catch(() => {});
        }
        unlockNativeScroll();
        preparePageLeave().then(() => {
            history.pushState({}, '', `${BASE}${path}`);
            this.resolve();
        });
    }

    async handleRoot() {
        if (api.token) {
            try {
                await this.refreshUser();
                this.navigate('/accueil');
            } catch {
                api.clearTokens();
                import('./pages/welcome.js').then(m => m.renderWelcome(this));
            }
        } else {
            import('./pages/welcome.js').then(m => m.renderWelcome(this));
        }
    }

    async refreshUser() {
        const [profile, auth, dashboard] = await Promise.all([
            api.getMyProfile().catch(() => null),
            api.getProfile().catch(() => null),
            api.getMyDashboard().catch(() => null),
        ]);
        const user = { ...api.getUser(), ...(auth?.data || {}) };
        if (auth?.data?.role) {
            user.role = auth.data.role;
        }
        if (profile?.data) {
            user.member_profile = profile.data;
            user.first_name = user.first_name || profile.data.first_name;
            user.full_name = profile.data.full_name;
        }
        if (dashboard?.data) {
            setAgentFromDashboard(dashboard.data);
            if (dashboard.data.user_role) {
                user.role = dashboard.data.user_role;
            }
        }
        api.setUser(user);
    }

    guard(fn) {
        if (!api.token) { this.navigate('/connexion'); return; }
        showContentSkeleton('dashboard');
        Promise.resolve(fn()).catch(err => {
            console.error(err);
            if (String(err.message).includes('401') || String(err.message).includes('token')) {
                api.clearTokens();
                this.navigate('/connexion');
                return;
            }
            mountError(() => this.resolve());
        });
    }
}

export const router = new Router();
document.addEventListener('DOMContentLoaded', () => {
    unlockNativeScroll();
    bindMembreNavigation(router);
    router.resolve();
});
