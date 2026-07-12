import { apiCache } from '../../shared/cache.js';

const API = '/api/v1';

export class CounsellorApi {
    constructor() {
        this.prefix = 'conseiller_';
        this.token = localStorage.getItem(`${this.prefix}access_token`);
        this.refresh = localStorage.getItem(`${this.prefix}refresh_token`);
    }

    setTokens(access, refresh) {
        this.token = access;
        this.refresh = refresh;
        localStorage.setItem(`${this.prefix}access_token`, access);
        localStorage.setItem(`${this.prefix}refresh_token`, refresh);
    }

    clear() {
        this.token = null;
        this.refresh = null;
        ['access_token', 'refresh_token', 'user'].forEach(k => localStorage.removeItem(`${this.prefix}${k}`));
        apiCache.invalidatePrefix(this.prefix);
    }

    getUser() { return JSON.parse(localStorage.getItem(`${this.prefix}user`) || '{}'); }
    setUser(u) { localStorage.setItem(`${this.prefix}user`, JSON.stringify(u)); }

    async req(endpoint, opts = {}) {
        const method = (opts.method || 'GET').toUpperCase();
        const cacheKey = `${this.prefix}${endpoint}`;

        if (method === 'GET') {
            const hit = apiCache.get(cacheKey);
            if (hit) return hit;
        } else {
            apiCache.invalidatePrefix(this.prefix);
        }

        const headers = { ...opts.headers };
        if (!(opts.body instanceof FormData) && !headers['Content-Type']) {
            headers['Content-Type'] = 'application/json';
        }
        if (this.token) headers.Authorization = `Bearer ${this.token}`;

        let res = await fetch(`${API}${endpoint}`, { ...opts, headers });

        if (res.status === 401 && this.refresh) {
            const r = await fetch(`${API}/auth/refresh/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refresh: this.refresh }),
            });
            if (r.ok) {
                const d = await r.json();
                this.setTokens(d.access, this.refresh);
                headers.Authorization = `Bearer ${d.access}`;
                res = await fetch(`${API}${endpoint}`, { ...opts, headers });
            } else {
                this.clear();
            }
        }

        const ct = res.headers.get('content-type') || '';
        if (!ct.includes('application/json')) {
            if (!res.ok) throw new Error(`Erreur ${res.status}`);
            return res;
        }

        const data = await res.json();
        if (!res.ok) {
            throw new Error(data.error?.message || data.detail || data.message || 'Erreur serveur');
        }
        if (method === 'GET') apiCache.set(cacheKey, data);
        return data;
    }

    login(email, password) {
        return this.req('/auth/login/conseiller/', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        });
    }

    getProfile() { return this.req('/auth/profile/'); }

    getDashboard() { return this.req('/dashboard/counsellor/full/'); }
    getReferrers() { return this.req('/dashboard/counsellor/referrers/'); }
    getReferrer(id) { return this.req(`/dashboard/counsellor/referrers/${id}/`); }
    getEvents() { return this.req('/dashboard/counsellor/events/'); }
    getEventAttendance(id) { return this.req(`/dashboard/counsellor/events/${id}/attendance/`); }
    getMember(id) { return this.req(`/dashboard/counsellor/members/${id}/`); }
    getMemberCard(id) { return this.req(`/members/${id}/card/`); }
    getEventReport(id) { return this.req(`/events/${id}/report/`); }

    getMyProfile() { return this.req('/members/me/'); }
    getMyCard() { return this.req('/members/me/card/'); }
    getMyDashboard() { return this.req('/members/me/dashboard/'); }
    getMyAttendances() { return this.req('/members/me/attendances/'); }

    async updateMyProfile(data, photoFile) {
        if (photoFile) {
            const fd = new FormData();
            Object.entries(data).forEach(([k, v]) => { if (v != null) fd.append(k, v); });
            fd.append('photo', photoFile);
            return this.reqMultipart('/members/me/', fd, 'PATCH');
        }
        return this.req('/members/me/', { method: 'PATCH', body: JSON.stringify(data) });
    }

    changePassword(oldPassword, newPassword) {
        return this.req('/auth/change-password/', {
            method: 'POST',
            body: JSON.stringify({
                old_password: oldPassword,
                new_password: newPassword,
                new_password_confirm: newPassword,
            }),
        });
    }

    async reqMultipart(endpoint, formData, method = 'POST') {
        const headers = {};
        if (this.token) headers.Authorization = `Bearer ${this.token}`;
        let res = await fetch(`${API}${endpoint}`, { method, headers, body: formData });
        if (res.status === 401 && this.refresh) {
            const r = await fetch(`${API}/auth/refresh/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refresh: this.refresh }),
            });
            if (r.ok) {
                const d = await r.json();
                this.setTokens(d.access, this.refresh);
                headers.Authorization = `Bearer ${d.access}`;
                res = await fetch(`${API}${endpoint}`, { method, headers, body: formData });
            }
        }
        const data = await res.json();
        if (!res.ok) throw new Error(data.error?.message || data.detail || 'Erreur');
        return data;
    }
}

export const api = new CounsellorApi();
