const API_BASE = '/api/v1';

class ApiClient {
    constructor() {
        this.token = localStorage.getItem('access_token');
        this.refreshToken = localStorage.getItem('refresh_token');
    }

    setTokens(access, refresh) {
        this.token = access;
        this.refreshToken = refresh;
        localStorage.setItem('access_token', access);
        localStorage.setItem('refresh_token', refresh);
    }

    clearTokens() {
        this.token = null;
        this.refreshToken = null;
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
    }

    async request(endpoint, options = {}) {
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers,
        };
        if (this.token) headers['Authorization'] = `Bearer ${this.token}`;

        let response = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });

        if (response.status === 401 && this.refreshToken) {
            const refreshed = await this.refreshAccessToken();
            if (refreshed) {
                headers['Authorization'] = `Bearer ${this.token}`;
                response = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
            }
        }

        const data = await response.json();
        if (!response.ok) throw new Error(data.error?.message || data.detail || 'Erreur serveur');
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
        return this.request('/auth/login/', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        });
    }

    getProfile() { return this.request('/auth/profile/'); }
    getDashboard(role) {
        const routes = {
            admin: '/dashboard/admin/',
            counsellor: '/dashboard/counsellor/',
            referrer: '/dashboard/referrer/',
        };
        return this.request(routes[role] || '/dashboard/admin/');
    }
    getMembers(params = '') { return this.request(`/members/${params}`); }
    getEvents(params = '') { return this.request(`/events/${params}`); }
    getNotifications() { return this.request('/notifications/'); }
}

export const api = new ApiClient();
