import { apiCache } from './cache.js';

const API_BASE = '/api/v1';

/** Applications autorisées pour la connexion scoped */
export const APPS = {
    membre: 'membre',
    gestion: 'gestion',
    referent: 'referent',
    pointage: 'pointage',
};

export class ApiClient {
    constructor(appId, storagePrefix) {
        this.appId = appId;
        this.prefix = storagePrefix || `${appId}_`;
        this.token = localStorage.getItem(`${this.prefix}access_token`);
        this.refreshToken = localStorage.getItem(`${this.prefix}refresh_token`);
    }

    setTokens(access, refresh) {
        this.token = access;
        this.refreshToken = refresh;
        localStorage.setItem(`${this.prefix}access_token`, access);
        localStorage.setItem(`${this.prefix}refresh_token`, refresh);
    }

    clearTokens() {
        this.token = null;
        this.refreshToken = null;
        localStorage.removeItem(`${this.prefix}access_token`);
        localStorage.removeItem(`${this.prefix}refresh_token`);
        localStorage.removeItem(`${this.prefix}user`);
        apiCache.invalidatePrefix(this.prefix);
    }

    getUser() {
        return JSON.parse(localStorage.getItem(`${this.prefix}user`) || '{}');
    }

    setUser(user) {
        localStorage.setItem(`${this.prefix}user`, JSON.stringify(user));
    }

    async request(endpoint, options = {}) {
        const { cache: memCache, ...fetchOptions } = options;
        const method = (fetchOptions.method || 'GET').toUpperCase();
        const cacheKey = `${this.prefix}${endpoint}`;
        const useCache = method === 'GET' && memCache !== false;

        if (useCache) {
            const hit = apiCache.get(cacheKey);
            if (hit) return hit;
        } else if (method !== 'GET') {
            apiCache.invalidatePrefix(this.prefix);
        }

        const headers = { 'Content-Type': 'application/json', ...fetchOptions.headers };
        if (this.token) headers['Authorization'] = `Bearer ${this.token}`;

        let response = await fetch(`${API_BASE}${endpoint}`, { ...fetchOptions, headers });

        if (response.status === 401 && this.refreshToken) {
            const refreshed = await this.refreshAccessToken();
            if (refreshed) {
                headers['Authorization'] = `Bearer ${this.token}`;
                response = await fetch(`${API_BASE}${endpoint}`, { ...fetchOptions, headers });
            }
        }

        const data = await response.json();
        if (!response.ok) {
            let msg = data.error?.message || data.detail;
            if (!msg && typeof data === 'object') {
                const fieldErr = Object.entries(data).find(([, v]) => Array.isArray(v) && v.length);
                if (fieldErr) msg = `${fieldErr[0]}: ${fieldErr[1][0]}`;
            }
            throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg) || 'Erreur serveur');
        }

        if (useCache) apiCache.set(cacheKey, data);
        return data;
    }

    async refreshAccessToken() {
        try {
            const res = await fetch(`${API_BASE}/auth/refresh/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refresh: this.refreshToken }),
            });
            if (!res.ok) { this.clearTokens(); return false; }
            const data = await res.json();
            this.setTokens(data.access, this.refreshToken);
            return true;
        } catch {
            this.clearTokens();
            return false;
        }
    }

    login(email, password) {
        return this.request(`/auth/login/${this.appId}/`, {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        });
    }

    getProfile() { return this.request('/auth/profile/'); }

    // --- Membre ---
    registerMember(data) {
        return this.request('/members/register/', { method: 'POST', body: JSON.stringify(data) });
    }
    getMyProfile() { return this.request('/members/me/'); }
    updateMyProfile(data) {
        return this.request('/members/me/', { method: 'PATCH', body: JSON.stringify(data) });
    }
    getMyCard() { return this.request('/members/me/card/'); }
    getMyHistory() { return this.request('/members/me/history/'); }
    getMyAttendances() { return this.request('/members/me/attendances/'); }
    getPublicPoles() { return this.request('/members/public/poles/church/'); }
    getPublicDepts(poleId) {
        const q = poleId ? `?pole=${poleId}` : '';
        return this.request(`/members/public/departments/church/${q}`);
    }
    getPublicFamilyPoles() { return this.request('/members/public/poles/family/'); }
    getPublicProfessions() { return this.request('/members/public/professions/'); }

    // --- Staff / Admin ---
    getDashboard(role) {
        const routes = { admin: '/dashboard/admin/', counsellor: '/dashboard/counsellor/', referrer: '/dashboard/referrer/' };
        return this.request(routes[role] || '/dashboard/admin/');
    }
    getMembers(params = '') { return this.request(`/members/${params}`); }
    getEvents(params = '') { return this.request(`/events/${params}`); }
    createMember(data) { return this.request('/members/', { method: 'POST', body: JSON.stringify(data) }); }
    createEvent(data) { return this.request('/events/', { method: 'POST', body: JSON.stringify(data) }); }
    openEvent(id) { return this.request(`/events/${id}/open/`, { method: 'POST' }); }
    closeEvent(id) { return this.request(`/events/${id}/close/`, { method: 'POST' }); }
    getNotifications() { return this.request('/notifications/'); }

    // --- Pointage ---
    getMyAgentEvents() { return this.request('/attendance/my-events/'); }
    scanQR(qrCode, eventId) {
        return this.request('/attendance/scan/', {
            method: 'POST',
            body: JSON.stringify({ qr_code: qrCode, event_id: eventId }),
        });
    }
}

export function extractList(data) {
    return data.results || data.data || (Array.isArray(data) ? data : []);
}

export function createApi(appId) {
    return new ApiClient(appId, `${appId}_`);
}
