export function renderAppShell({ content, activePage, api, router, appBase, appType, navItems, title, accent = 'primary' }) {
    const user = api.getUser();
    const isAdmin = appType === 'gestion';
    const isPointage = appType === 'pointage';

    document.getElementById('app').innerHTML = `
        <div class="min-h-screen flex safe-area">
            <aside class="hidden md:flex md:w-60 lg:w-64 bg-white border-r border-gray-100 flex-col fixed h-full z-30">
                <div class="p-5 border-b border-gray-100">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 ${isAdmin ? 'bg-primary-800' : isPointage ? 'bg-emerald-600' : 'bg-primary-500'} rounded-xl flex items-center justify-center shrink-0">
                            <span class="text-white font-bold text-sm">${title?.icon || 'FP'}</span>
                        </div>
                        <div class="min-w-0">
                            <h1 class="font-bold text-gray-900 text-sm truncate">${title?.label || 'Famille Patience'}</h1>
                            <p class="text-xs text-gray-400 truncate">${title?.subtitle || ''}</p>
                        </div>
                    </div>
                </div>
                <nav class="flex-1 p-3 space-y-0.5 overflow-y-auto">
                    ${navItems.map(item => navLink(item, appBase, activePage)).join('')}
                </nav>
                <div class="p-3 border-t border-gray-100">
                    ${user.email ? `<p class="text-xs text-gray-500 px-2 mb-2 truncate">${user.full_name || user.email}</p>` : ''}
                    <button id="logout-btn" class="sidebar-link text-red-500 hover:bg-red-50 w-full"><span>🚪</span> Déconnexion</button>
                </div>
            </aside>

            <main class="flex-1 md:ml-60 lg:ml-64 w-full min-w-0">
                <header class="md:hidden bg-white border-b border-gray-100 px-3 xs:px-4 py-2.5 flex items-center justify-between sticky top-0 z-20 safe-top">
                    <div class="flex items-center gap-2 min-w-0">
                        <div class="w-8 h-8 ${isAdmin ? 'bg-primary-800' : isPointage ? 'bg-emerald-600' : 'bg-primary-500'} rounded-lg flex items-center justify-center shrink-0">
                            <span class="text-white font-bold text-xs">${title?.icon || 'FP'}</span>
                        </div>
                        <span class="font-bold text-gray-900 text-sm truncate">${title?.short || title?.label || 'FP'}</span>
                    </div>
                    <button id="mobile-menu-btn" class="p-2.5 rounded-xl hover:bg-gray-100 min-w-[44px] min-h-[44px] flex items-center justify-center" aria-label="Menu">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/></svg>
                    </button>
                </header>

                <div class="p-3 xs:p-4 md:p-8 fade-in has-bottom-nav">${content}</div>

                <nav class="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-gray-100 flex justify-around z-20" style="padding-bottom: env(safe-area-inset-bottom)">
                    ${navItems.slice(0, 4).map(item => bottomNavLink(item, appBase, activePage)).join('')}
                </nav>
            </main>
        </div>

        <div id="mobile-drawer" class="mobile-drawer md:hidden">
            <div class="mobile-drawer-backdrop" id="drawer-backdrop"></div>
            <div class="mobile-drawer-panel">
                <div class="p-4 border-b flex justify-between items-center">
                    <span class="font-semibold text-sm">Menu</span>
                    <button id="drawer-close" class="p-2 min-w-[44px] min-h-[44px]">✕</button>
                </div>
                <nav class="flex-1 p-3 space-y-0.5 overflow-y-auto">
                    ${navItems.map(item => drawerLink(item, appBase, activePage)).join('')}
                </nav>
                <div class="p-3 border-t">
                    <button id="drawer-logout" class="sidebar-link text-red-500 w-full">🚪 Déconnexion</button>
                </div>
            </div>
        </div>
    `;

    bindNav(router, appBase, api);
}

function navLink(item, base, active) {
    return `<a href="${base}${item.path}" data-nav class="sidebar-link ${active === item.id ? 'active' : ''}"><span>${item.icon}</span><span>${item.label}</span></a>`;
}
function bottomNavLink(item, base, active) {
    return `<a href="${base}${item.path}" data-nav class="flex flex-col items-center justify-center flex-1 py-2 min-h-[52px] text-[10px] xs:text-xs ${active === item.id ? 'text-primary-500 font-medium' : 'text-gray-400'}"><span class="text-lg">${item.icon}</span><span class="truncate max-w-[64px]">${item.shortLabel || item.label}</span></a>`;
}
function drawerLink(item, base, active) {
    return `<a href="${base}${item.path}" data-drawer-nav class="sidebar-link ${active === item.id ? 'active' : ''}"><span>${item.icon}</span> ${item.label}</a>`;
}

function bindNav(router, appBase, api) {
    const navigate = (path) => router.navigate(path);
    document.querySelectorAll('[data-nav]').forEach(l => l.addEventListener('click', e => { e.preventDefault(); navigate(l.getAttribute('href')); }));
    const drawer = document.getElementById('mobile-drawer');
    const close = () => drawer?.classList.remove('open');
    document.querySelectorAll('[data-drawer-nav]').forEach(l => l.addEventListener('click', e => { e.preventDefault(); close(); navigate(l.getAttribute('href')); }));
    document.getElementById('mobile-menu-btn')?.addEventListener('click', () => drawer?.classList.add('open'));
    document.getElementById('drawer-backdrop')?.addEventListener('click', close);
    document.getElementById('drawer-close')?.addEventListener('click', close);
    const logout = () => { api.clearTokens(); router.navigate(`${appBase}/connexion`); };
    document.getElementById('logout-btn')?.addEventListener('click', logout);
    document.getElementById('drawer-logout')?.addEventListener('click', logout);
}

export const MEMBER_NAV = [
    { id: 'home', path: '/accueil', label: 'Accueil', shortLabel: 'Accueil', icon: '🏠' },
    { id: 'profile', path: '/profil', label: 'Mon profil', shortLabel: 'Profil', icon: '👤' },
    { id: 'card', path: '/carte', label: 'Ma carte', shortLabel: 'Carte', icon: '🪪' },
    { id: 'history', path: '/historique', label: 'Historique', shortLabel: 'Historique', icon: '📋' },
];

export const GESTION_NAV = [
    { id: 'dashboard', path: '/dashboard', label: 'Tableau de bord', shortLabel: 'Stats', icon: '📊' },
    { id: 'members', path: '/membres', label: 'Membres', shortLabel: 'Membres', icon: '👥' },
    { id: 'events', path: '/evenements', label: 'Événements', shortLabel: 'Events', icon: '📅' },
    { id: 'users', path: '/utilisateurs', label: 'Utilisateurs', shortLabel: 'Users', icon: '🔑' },
];

export function getReferentNav(role) {
    const items = [{ id: 'dashboard', path: '/dashboard', label: 'Tableau de bord', shortLabel: 'Accueil', icon: '📊' }];
    items.push({ id: 'members', path: '/membres', label: 'Mes membres', shortLabel: 'Membres', icon: '👥' });
    if (role === 'counsellor') {
        items.push({ id: 'referrers', path: '/referents', label: 'Mes référents', shortLabel: 'Référents', icon: '🎯' });
    }
    return items;
}

export const POINTAGE_NAV = [
    { id: 'scan', path: '/scan', label: 'Scanner', shortLabel: 'Scan', icon: '📷' },
    { id: 'events', path: '/evenements', label: 'Mon événement', shortLabel: 'Event', icon: '📅' },
];
