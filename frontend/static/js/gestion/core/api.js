const API = '/api/v1';

import { apiCache } from '../../shared/cache.js';

export class AdminApi {
    constructor() {
        this.prefix = 'gestion_';
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
        const { cache: memCache, ...fetchOpts } = opts;
        const method = (fetchOpts.method || 'GET').toUpperCase();
        const cacheKey = `${this.prefix}${endpoint}`;
        const useCache = method === 'GET' && memCache !== false;

        if (useCache) {
            const hit = apiCache.get(cacheKey);
            if (hit) return hit;
        } else if (method !== 'GET') {
            apiCache.invalidatePrefix(this.prefix);
        }

        const headers = { ...fetchOpts.headers };
        if (!(fetchOpts.body instanceof FormData) && !headers['Content-Type']) {
            headers['Content-Type'] = 'application/json';
        }
        if (this.token) headers.Authorization = `Bearer ${this.token}`;

        let res = await fetch(`${API}${endpoint}`, { ...fetchOpts, headers });

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
                res = await fetch(`${API}${endpoint}`, { ...fetchOpts, headers });
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
            const msg = data.error?.message
                || data.error?.details
                || (typeof data.error?.details === 'object' ? Object.values(data.error.details).flat().join(' ') : null)
                || data.detail
                || data.message
                || 'Erreur serveur';
            throw new Error(typeof msg === 'string' ? msg : 'Erreur serveur');
        }
        if (useCache) apiCache.set(cacheKey, data);
        return data;
    }

    async downloadReport({ period = 'monthly', format: fmt = 'excel', module = 'all', startDate, endDate } = {}) {
        const params = new URLSearchParams({ period, export: fmt, module });
        if (period === 'custom' && startDate && endDate) {
            params.set('start_date', startDate);
            params.set('end_date', endDate);
        }
        const headers = {};
        if (this.token) headers.Authorization = `Bearer ${this.token}`;
        let res = await fetch(`${API}/dashboard/admin/reports/?${params}`, { headers });

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
                res = await fetch(`${API}/dashboard/admin/reports/?${params}`, { headers });
            }
        }

        if (!res.ok) throw new Error('Impossible de générer le rapport');
        const blob = await res.blob();
        const ext = fmt === 'pdf' ? 'pdf' : fmt === 'csv' ? 'csv' : 'xlsx';
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `rapport_${module}_${period}.${ext}`;
        a.click();
        URL.revokeObjectURL(url);
    }

    async getReportPreview({ period = 'monthly', module = 'all', startDate, endDate } = {}) {
        const params = new URLSearchParams({ period, export: 'preview', module });
        if (period === 'custom' && startDate && endDate) {
            params.set('start_date', startDate);
            params.set('end_date', endDate);
        }
        const data = await this.req(`/dashboard/admin/reports/?${params}`);
        return data.data;
    }

    login(email, password) { return this.req('/auth/login/gestion/', { method: 'POST', body: JSON.stringify({ email, password }) }); }
    getProfile() { return this.req('/auth/profile/'); }
    getDashboard() { return this.req('/dashboard/admin/full/'); }
    getLivePointage() { return this.req('/dashboard/admin/live-pointage/', { cache: false }); }
    getActivityLog() { return this.req('/dashboard/admin/activity/'); }
    getReferrers() { return this.req('/dashboard/admin/referrers/'); }
    getReferrer(id) { return this.req(`/dashboard/admin/referrers/${id}/`); }
    getCounsellors() { return this.req('/dashboard/admin/counsellors/'); }
    getCounsellor(id) { return this.req(`/dashboard/admin/counsellors/${id}/`); }
    getOpenEvents() { return this.req('/dashboard/admin/open-events/', { cache: false }); }
    getMembers(q = '') {
        const sep = q && !q.startsWith('?') ? '?' : '';
        const extra = q ? `${sep}${q.replace(/^\?/, '')}&` : '?';
        return this.req(`/members/${extra}ordering=last_name,first_name&page_size=500`);
    }
    getMember(id) { return this.req(`/members/${id}/`); }
    getMemberCard(id) { return this.req(`/members/${id}/card/`); }
    getMemberHistory(id) { return this.req(`/members/${id}/history/`); }
    createMember(d) { return this.req('/members/', { method: 'POST', body: JSON.stringify(d) }); }

    async createMemberComplete(data, photoFile) {
        if (!photoFile) throw new Error('La photo de profil est obligatoire.');
        const fd = new FormData();
        Object.entries(data).forEach(([k, v]) => {
            if (v !== null && v !== undefined && v !== '') fd.append(k, v);
        });
        fd.append('photo', photoFile);
        const headers = {};
        if (this.token) headers.Authorization = `Bearer ${this.token}`;
        let res = await fetch(`${API}/members/`, { method: 'POST', headers, body: fd });
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
                res = await fetch(`${API}/members/`, { method: 'POST', headers, body: fd });
            }
        }
        const body = await res.json();
        if (!res.ok) {
            const details = body.error?.details;
            const msg = body.error?.message
                || (details && typeof details === 'object'
                    ? Object.entries(details).map(([k, v]) => `${k}: ${Array.isArray(v) ? v[0] : v}`).join(' ')
                    : null)
                || body.detail
                || 'Impossible de créer le membre';
            throw new Error(msg);
        }
        apiCache.invalidatePrefix(this.prefix);
        return body;
    }

    async updateMemberComplete(id, data, photoFile = null) {
        const fd = new FormData();
        Object.entries(data).forEach(([k, v]) => {
            if (v !== null && v !== undefined && v !== '') fd.append(k, v);
        });
        if (photoFile) fd.append('photo', photoFile);
        const headers = {};
        if (this.token) headers.Authorization = `Bearer ${this.token}`;
        let res = await fetch(`${API}/members/${id}/`, { method: 'PATCH', headers, body: fd });
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
                res = await fetch(`${API}/members/${id}/`, { method: 'PATCH', headers, body: fd });
            }
        }
        const body = await res.json();
        if (!res.ok) {
            const details = body.error?.details;
            const msg = body.error?.message
                || (details && typeof details === 'object'
                    ? Object.entries(details).map(([k, v]) => `${k}: ${Array.isArray(v) ? v[0] : v}`).join(' ')
                    : null)
                || body.detail
                || 'Impossible de mettre à jour le membre';
            throw new Error(msg);
        }
        apiCache.invalidatePrefix(this.prefix);
        return body;
    }

    memberAction(id, action) { return this.req(`/dashboard/admin/members/${id}/action/`, { method: 'POST', body: JSON.stringify({ action }) }); }
    promoteMember(id, role) { return this.req(`/dashboard/admin/members/${id}/promote/`, { method: 'POST', body: JSON.stringify({ role }) }); }
    assignMember(id, data) { return this.req(`/dashboard/admin/members/${id}/assign/`, { method: 'POST', body: JSON.stringify(data) }); }
    setUserRole(id, role) { return this.req(`/dashboard/admin/users/${id}/role/`, { method: 'POST', body: JSON.stringify({ role }) }); }
    adminScan(qr_code, event_id, scan_mode = 'qr') {
        return this.req('/attendance/admin-scan/', {
            method: 'POST',
            body: JSON.stringify({ qr_code, event_id, scan_mode }),
        });
    }
    getEventReport(id) { return this.req(`/events/${id}/report/`); }
    async downloadEventReport(id, format) {
        // Utiliser ``export`` et non ``format`` : DRF intercepte ?format= et
        // renvoie 404 (seul JSONRenderer est configuré).
        const exportFmt = format === 'pdf' ? 'pdf' : 'excel';
        const headers = {};
        if (this.token) headers.Authorization = `Bearer ${this.token}`;
        let res = await fetch(`${API}/events/${id}/report/?export=${exportFmt}`, { headers });
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
                res = await fetch(`${API}/events/${id}/report/?export=${exportFmt}`, { headers });
            }
        }
        if (!res.ok) {
            let msg = 'Erreur lors du téléchargement';
            try {
                const err = await res.json();
                msg = err.error?.message || err.detail || msg;
            } catch { /* réponse binaire ou non-JSON */ }
            throw new Error(msg);
        }
        const ctype = res.headers.get('content-type') || '';
        if (ctype.includes('application/json')) {
            const err = await res.json();
            throw new Error(err.error?.message || err.detail || 'Réponse inattendue du serveur');
        }
        return res.blob();
    }
    getEvents() { return this.req('/events/?page_size=100'); }
    createEvent(d) { return this.req('/events/', { method: 'POST', body: JSON.stringify(d) }); }
    openEvent(id, memberIds = []) {
        return this.req(`/events/${id}/open/`, {
            method: 'POST',
            body: JSON.stringify({ member_ids: memberIds }),
        });
    }
    assignAgent(eventId, memberId) {
        return this.req(`/attendance/events/${eventId}/agents/`, {
            method: 'POST',
            body: JSON.stringify({ member_id: memberId }),
        });
    }
    closeEvent(id) { return this.req(`/events/${id}/close/`, { method: 'POST' }); }
    getPoles() { return this.req('/members/poles/family/'); }
    getChurchPoles() { return this.req('/members/poles/church/'); }
    createChurchPole(d) { return this.req('/members/poles/church/', { method: 'POST', body: JSON.stringify(d) }); }
    updateChurchPole(id, d) { return this.req(`/members/poles/church/${id}/`, { method: 'PATCH', body: JSON.stringify(d) }); }
    deleteChurchPole(id) { return this.req(`/members/poles/church/${id}/`, { method: 'DELETE' }); }
    getDepartments() { return this.req('/members/departments/church/'); }
    getProfessions() { return this.req('/members/professions/'); }
    createPole(d) { return this.req('/members/poles/family/', { method: 'POST', body: JSON.stringify(d) }); }
    updatePole(id, d) { return this.req(`/members/poles/family/${id}/`, { method: 'PATCH', body: JSON.stringify(d) }); }
    deletePole(id) { return this.req(`/members/poles/family/${id}/`, { method: 'DELETE' }); }
    createDepartment(d) { return this.req('/members/departments/church/', { method: 'POST', body: JSON.stringify(d) }); }
    updateDepartment(id, d) { return this.req(`/members/departments/church/${id}/`, { method: 'PATCH', body: JSON.stringify(d) }); }
    deleteDepartment(id) { return this.req(`/members/departments/church/${id}/`, { method: 'DELETE' }); }
    createProfession(d) { return this.req('/members/professions/', { method: 'POST', body: JSON.stringify(d) }); }
    updateProfession(id, d) { return this.req(`/members/professions/${id}/`, { method: 'PATCH', body: JSON.stringify(d) }); }
    deleteProfession(id) { return this.req(`/members/professions/${id}/`, { method: 'DELETE' }); }
    getNotifications() { return this.req('/notifications/'); }
    getUsers() { return this.req('/auth/users/'); }
}

export const api = new AdminApi();

export const list = (d) => {
    if (!d) return [];
    if (Array.isArray(d)) return d;
    if (d.results) return d.results;
    if (Array.isArray(d.data)) return d.data;
    if (d.data?.results) return d.data.results;
    return [];
};
