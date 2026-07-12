import { icons } from '../../shared/icons.js';
import { swapContent } from '../../shared/shell.js';
import {
    bottomNavHtml, bindBottomNav, refreshBottomNav, POINTAGE_BOTTOM_NAV,
} from '../../shared/bottom-nav.js';

const NAV = [
    { id: 'dashboard', path: '/accueil', label: 'Tableau de bord', icon: 'dashboard' },
    { id: 'scan', path: '/scan', label: 'Pointage des présences', icon: 'scan' },
    { id: 'events', path: '/evenements', label: 'Mes événements', icon: 'calendar' },
];

let shellBound = false;

function updateDrawerNav(pageId) {
    document.querySelectorAll('.ptg-drawer-link').forEach(link => {
        const path = link.dataset.nav || '';
        const item = NAV.find(n => n.path === path);
        link.classList.toggle('active', item?.id === pageId);
    });
}

export function renderShell(pageId, content, { api, router, title, subtitle, back, onBack } = {}) {
    const needsBack = !!back;
    const hasBack = !!document.getElementById('ptg-back-btn');
    const pageTitle = title || 'Pointage';

    if (document.querySelector('.ptg-app') && needsBack === hasBack && swapContent('.ptg-content', content)) {
        const titleEl = document.querySelector('.ptg-header-title');
        if (titleEl) titleEl.textContent = pageTitle;
        const subEl = document.querySelector('.ptg-header-sub');
        if (subEl) subEl.textContent = subtitle || '';
        updateDrawerNav(pageId);
        refreshBottomNav(pageId, POINTAGE_BOTTOM_NAV);
        if (onBack) {
            const btn = document.getElementById('ptg-back-btn');
            if (btn) btn.onclick = onBack;
        }
        return;
    }

    shellBound = false;
    const user = api?.getUser?.() || {};

    document.getElementById('app').innerHTML = `
        <div class="ptg-app fp-has-bottom-nav">
            <header class="ptg-header">
                <div class="ptg-header-left">
                    ${needsBack
                        ? `<button class="ptg-icon-btn" id="ptg-back-btn" aria-label="Retour">${icons.arrowLeft}</button>`
                        : `<button class="ptg-icon-btn" id="ptg-menu-btn" aria-label="Menu">${icons.menu}</button>`}
                    <div>
                        <div class="ptg-header-title">${pageTitle}</div>
                        <div class="ptg-header-sub">${subtitle || user.full_name || 'Agent de pointage'}</div>
                    </div>
                </div>
            </header>
            <main class="ptg-content fp-page-enter">${content}</main>
            ${bottomNavHtml(POINTAGE_BOTTOM_NAV, pageId)}
        </div>
        <div class="ptg-drawer-overlay" id="ptg-drawer-overlay"></div>
        <aside class="ptg-drawer" id="ptg-drawer" aria-label="Menu">
            <div class="ptg-drawer-header">
                <div class="ptg-drawer-user">
                    <div class="ptg-drawer-avatar">${(user.first_name || user.email || 'A')[0].toUpperCase()}</div>
                    <div>
                        <strong>${user.full_name || user.email || 'Agent'}</strong>
                        <span>Pointage</span>
                    </div>
                </div>
                <button class="ptg-icon-btn" id="ptg-drawer-close" aria-label="Fermer">${icons.close}</button>
            </div>
            <nav class="ptg-drawer-nav">
                ${NAV.map(item => `
                    <button type="button" class="ptg-drawer-link ${pageId === item.id ? 'active' : ''}" data-nav="${item.path}">
                        ${icons[item.icon] || icons.scan}
                        <span>${item.label}</span>
                    </button>`).join('')}
            </nav>
            <div class="ptg-drawer-footer">
                <button class="ptg-drawer-link ptg-drawer-logout" id="ptg-logout" type="button">
                    ${icons.logout}
                    <span>Déconnexion</span>
                </button>
            </div>
        </aside>`;

    bindShell(api, router, onBack);
}

function bindShell(api, router, onBack) {
    const overlay = document.getElementById('ptg-drawer-overlay');
    const drawer = document.getElementById('ptg-drawer');
    const open = () => { overlay?.classList.add('open'); drawer?.classList.add('open'); };
    const close = () => { overlay?.classList.remove('open'); drawer?.classList.remove('open'); };

    document.getElementById('ptg-menu-btn')?.addEventListener('click', open);
    document.getElementById('ptg-drawer-close')?.addEventListener('click', close);
    overlay?.addEventListener('click', close);
    document.getElementById('ptg-back-btn')?.addEventListener('click', () => {
        if (onBack) onBack();
        else history.back();
    });

    document.querySelectorAll('.ptg-drawer-link[data-nav]').forEach(btn => {
        btn.addEventListener('click', () => {
            close();
            router.navigate(`${router.base}${btn.dataset.nav}`);
        });
    });

    if (!shellBound) {
        document.getElementById('ptg-logout')?.addEventListener('click', () => {
            api.clearTokens();
            router.navigate(`${router.base}/connexion`);
        });
        shellBound = true;
    }

    bindBottomNav(path => router.navigate(`${router.base}${path}`));
}

export function renderLoginShell(content) {
    shellBound = false;
    document.getElementById('app').innerHTML = content;
}
