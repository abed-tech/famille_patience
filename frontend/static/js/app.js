import { api } from './api.js';
import { renderLogin } from './pages/login.js';
import { renderDashboard } from './pages/dashboard.js';
import { renderMembers } from './pages/members.js';
import { renderEvents } from './pages/events.js';
import { renderLayout } from './components/layout.js';

class Router {
    constructor() {
        this.routes = {
            '/': () => this.handleHome(),
            '/login': () => renderLogin(),
            '/dashboard': () => renderDashboard(),
            '/members': () => renderMembers(),
            '/events': () => renderEvents(),
        };
        window.addEventListener('popstate', () => this.navigate(location.pathname, false));
    }

    navigate(path, push = true) {
        if (push) history.pushState({}, '', path);
        const handler = this.routes[path] || this.routes['/'];
        handler();
    }

    async handleHome() {
        if (api.token) {
            try {
                const profile = await api.getProfile();
                localStorage.setItem('user', JSON.stringify(profile.data));
                this.navigate('/dashboard');
            } catch {
                api.clearTokens();
                this.navigate('/login');
            }
        } else {
            this.navigate('/login');
        }
    }
}

const router = new Router();

document.addEventListener('DOMContentLoaded', () => {
    router.navigate(location.pathname || '/');
});

export { router, renderLayout };
