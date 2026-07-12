import { router } from '../app.js';
import { api } from '../api.js';

export function renderLayout(content, activePage = '') {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const roleLabels = {
        admin: 'Administrateur',
        counsellor: 'Conseiller',
        referrer: 'Référent',
        member: 'Membre',
        attendance_agent: 'Agent de pointage',
    };

    const navItems = getNavItems(user.role);

    document.getElementById('app').innerHTML = `
        <div class="min-h-screen flex">
            <!-- Sidebar desktop -->
            <aside class="hidden md:flex md:w-64 bg-white border-r border-gray-100 flex-col fixed h-full z-30">
                <div class="p-6 border-b border-gray-100">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 bg-primary-500 rounded-xl flex items-center justify-center">
                            <span class="text-white font-bold text-lg">FP</span>
                        </div>
                        <div>
                            <h1 class="font-bold text-gray-900 text-sm">Famille Patience</h1>
                            <p class="text-xs text-gray-400">${roleLabels[user.role] || ''}</p>
                        </div>
                    </div>
                </div>
                <nav class="flex-1 p-4 space-y-1">
                    ${navItems.map(item => `
                        <a href="${item.path}" data-nav class="sidebar-link ${activePage === item.id ? 'active' : ''}"
                           onclick="event.preventDefault()">
                            <span>${item.icon}</span> ${item.label}
                        </a>
                    `).join('')}
                </nav>
                <div class="p-4 border-t border-gray-100">
                    <div class="flex items-center gap-3 px-2 mb-3">
                        <div class="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 text-xs font-bold">
                            ${(user.first_name || user.email || '?')[0].toUpperCase()}
                        </div>
                        <div class="text-xs">
                            <p class="font-medium text-gray-800 truncate">${user.full_name || user.email || ''}</p>
                        </div>
                    </div>
                    <button id="logout-btn" class="w-full text-left sidebar-link text-red-500 hover:bg-red-50 hover:text-red-600">
                        Déconnexion
                    </button>
                </div>
            </aside>

            <!-- Main content -->
            <main class="flex-1 md:ml-64">
                <!-- Mobile header -->
                <header class="md:hidden bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between sticky top-0 z-20">
                    <div class="flex items-center gap-2">
                        <div class="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
                            <span class="text-white font-bold text-sm">FP</span>
                        </div>
                        <span class="font-bold text-gray-900 text-sm">Famille Patience</span>
                    </div>
                    <button id="mobile-menu-btn" class="p-2 rounded-lg hover:bg-gray-100">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/></svg>
                    </button>
                </header>

                <div class="p-4 md:p-8 fade-in">
                    ${content}
                </div>

                <!-- Mobile bottom nav -->
                <nav class="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex justify-around py-2 z-20">
                    ${navItems.slice(0, 4).map(item => `
                        <a href="${item.path}" data-nav class="flex flex-col items-center gap-0.5 px-3 py-1 text-xs ${activePage === item.id ? 'text-primary-500' : 'text-gray-400'}">
                            <span class="text-lg">${item.icon}</span>
                            ${item.shortLabel || item.label}
                        </a>
                    `).join('')}
                </nav>
            </main>
        </div>
    `;

    document.querySelectorAll('[data-nav]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            router.navigate(link.getAttribute('href'));
        });
    });

    document.getElementById('logout-btn')?.addEventListener('click', () => {
        api.clearTokens();
        router.navigate('/login');
    });
}

function getNavItems(role) {
    const items = [
        { id: 'dashboard', path: '/dashboard', label: 'Tableau de bord', shortLabel: 'Accueil', icon: '📊' },
    ];
    if (['admin', 'counsellor', 'referrer'].includes(role)) {
        items.push({ id: 'members', path: '/members', label: 'Membres', shortLabel: 'Membres', icon: '👥' });
    }
    if (['admin', 'counsellor', 'referrer', 'member'].includes(role)) {
        items.push({ id: 'events', path: '/events', label: 'Événements', shortLabel: 'Events', icon: '📅' });
    }
    return items;
}
