import { api, isReferrer, isCounsellor, hasAgentAccess } from './api.js';
import { avatarHtml } from './components.js';
import { icons, navIcon } from './icons.js';
import { swapContent, scrollToTopInstant } from '../../shared/shell.js';
import { unlockNativeScroll } from '../../shared/native-scroll.js';
import {
    bottomNavHtml, bindBottomNav, refreshBottomNav,
    MEMBER_BOTTOM_NAV, REFERRER_BOTTOM_NAV, COUNSELLOR_MEMBER_BOTTOM_NAV,
} from '../../shared/bottom-nav.js';

let navBound = false;
let menuDelegated = false;

const MEMBER_MENU = [
    { id: 'home', path: '/accueil', label: 'Tableau de bord', icon: 'home' },
    { id: 'profile', path: '/profil', label: 'Mon profil', icon: 'user' },
    { id: 'card', path: '/carte', label: 'Carte de membre', icon: 'card' },
    { id: 'events', path: '/evenements', label: 'Mes événements', icon: 'calendar', activeIds: ['event-detail', 'pointage', 'pointage-scan', 'pointage-manual'] },
    { id: 'settings', path: '/parametres', label: 'Paramètres', icon: 'settings' },
];

const REFERRER_EXTRA = [
    { id: 'my-members', path: '/mes-membres', label: 'Mes membres', icon: 'users' },
    { id: 'my-counsellor', path: '/mon-conseiller', label: 'Mon conseiller', icon: 'referrer' },
    { id: 'staff-dash', path: '/encadrement', label: 'Suivi', icon: 'chart' },
];

const COUNSELLOR_EXTRA = [
    { id: 'my-referrers', path: '/mes-referents', label: 'Mes référents', icon: 'users' },
    { id: 'staff-dash', path: '/encadrement', label: 'Suivi', icon: 'chart' },
];

const POINTAGE_MENU = { id: 'pointage', path: '/pointage', label: 'Enregistrer les présences', icon: 'scan', activeIds: ['pointage-scan', 'pointage-manual'] };

function withPointageMenu(items) {
    if (!hasAgentAccess()) return items;
    const idx = items.findIndex(i => i.id === 'events');
    if (idx === -1) return [...items, POINTAGE_MENU];
    const next = [...items];
    next.splice(idx + 1, 0, POINTAGE_MENU);
    return next;
}

function getMenuItems() {
    if (isCounsellor()) {
        return withPointageMenu([
            MEMBER_MENU[0],
            MEMBER_MENU[1],
            ...COUNSELLOR_EXTRA,
            MEMBER_MENU[2],
            MEMBER_MENU[3],
            { id: 'notifications', path: '/notifications', label: 'Notifications', icon: 'bell', badge: true },
            MEMBER_MENU[4],
        ]);
    }
    if (isReferrer()) {
        return withPointageMenu([
            MEMBER_MENU[0],
            MEMBER_MENU[1],
            ...REFERRER_EXTRA,
            MEMBER_MENU[2],
            MEMBER_MENU[3],
            { id: 'notifications', path: '/notifications', label: 'Notifications', icon: 'bell', badge: true },
            MEMBER_MENU[4],
        ]);
    }
    return withPointageMenu([
        MEMBER_MENU[0],
        MEMBER_MENU[1],
        MEMBER_MENU[2],
        MEMBER_MENU[3],
        MEMBER_MENU[4],
        { id: 'referrer', path: '/mon-referent', label: 'Mon référent', icon: 'referrer' },
        { id: 'history', path: '/historique', label: 'Historique', icon: 'history' },
        { id: 'notifications', path: '/notifications', label: 'Notifications', icon: 'bell', badge: true },
    ]);
}

function getBottomNavItems() {
    if (isCounsellor()) return COUNSELLOR_MEMBER_BOTTOM_NAV;
    if (isReferrer()) return REFERRER_BOTTOM_NAV;
    return MEMBER_BOTTOM_NAV;
}

function updateMbDrawerNav(pageId, unread) {
    document.querySelectorAll('.mb-drawer-link[data-drawer-nav]').forEach(link => {
        const href = link.getAttribute('href') || '';
        const path = href.replace('/membre', '') || '/accueil';
        const allItems = [...MEMBER_MENU, ...REFERRER_EXTRA, ...COUNSELLOR_EXTRA,
            POINTAGE_MENU,
            { id: 'referrer', path: '/mon-referent' },
            { id: 'history', path: '/historique' },
            { id: 'notifications', path: '/notifications' },
            { id: 'my-counsellor', path: '/mon-conseiller' },
            { id: 'pointage', path: '/pointage' },
            { id: 'events', path: '/evenements' },
        ];
        const item = allItems.find(m => m.path === path || m.activeIds?.includes(pageId));
        link.classList.toggle('active', item?.id === pageId || item?.activeIds?.includes(pageId));
        const badge = link.querySelector('.mb-drawer-badge');
        if (link.dataset.badge === 'true' && unread > 0) {
            if (!badge) link.insertAdjacentHTML('beforeend', `<span class="mb-drawer-badge">${unread > 99 ? '99+' : unread}</span>`);
        } else {
            badge?.remove();
        }
    });
}

function updateHeader(title, subtitle, needsBack, onBack) {
    const titleEl = document.querySelector('.mb-header-title');
    const subEl = document.querySelector('.mb-header-sub');
    if (titleEl) titleEl.textContent = title;
    if (subtitle) {
        if (subEl) subEl.textContent = subtitle;
        else document.querySelector('.mb-header-titles')?.insertAdjacentHTML('beforeend', `<div class="mb-header-sub">${subtitle}</div>`);
    } else {
        subEl?.remove();
    }

    const left = document.querySelector('.mb-header-left');
    if (left) {
        const wantBack = !!needsBack;
        const hasBack = !!document.getElementById('mb-back-btn');
        if (wantBack !== hasBack) {
            const actionHtml = wantBack
                ? `<button type="button" class="mb-header-action" id="mb-back-btn" aria-label="Retour">${icons.arrowLeft}</button>`
                : `<button type="button" class="mb-header-action" id="mb-menu-btn" aria-label="Menu">${navIcon('menu', false)}</button>`;
            left.querySelector('.mb-header-action')?.remove();
            left.insertAdjacentHTML('afterbegin', actionHtml);
        }
        if (wantBack && onBack) {
            const backBtn = document.getElementById('mb-back-btn');
            if (backBtn) backBtn.onclick = onBack;
        }
    }
}

function setDrawerOpen(open) {
    document.getElementById('mb-drawer-overlay')?.classList.toggle('open', open);
    document.getElementById('mb-drawer')?.classList.toggle('open', open);
    if (open) {
        document.body.dataset.fpScrollY = String(window.scrollY || 0);
        document.documentElement.classList.add('fp-scroll-lock');
        document.body.classList.add('fp-scroll-lock');
    } else {
        unlockNativeScroll();
        if (document.body.dataset.fpScrollY != null) {
            const y = Number(document.body.dataset.fpScrollY) || 0;
            delete document.body.dataset.fpScrollY;
            requestAnimationFrame(() => window.scrollTo(0, y));
        }
    }
}

export function renderShell(pageId, content, options = {}) {
    const stored = api.getUser?.() || {};
    const user = { ...stored, ...(options.header || {}) };
    const unread = options.unread || 0;
    const title = options.title || 'Famille Patience';
    const subtitle = options.subtitle || '';
    const needsBack = !!options.back;

    // Toujours réutiliser le shell existant (plus de remount menu↔retour)
    if (document.querySelector('.mb-app') && swapContent('.mb-content', content)) {
        updateMbDrawerNav(pageId, unread);
        updateHeader(title, subtitle, needsBack, options.onBack);
        refreshBottomNav(pageId, getBottomNavItems());
        return;
    }

    navBound = false;
    const menuItems = getMenuItems();
    const bottomItems = getBottomNavItems();
    const displayName = user.first_name || user.full_name?.split(' ')[0] || '';

    document.getElementById('app').innerHTML = `
        <div class="mb-app fp-has-bottom-nav">
            <header class="mb-header mb-header-ig">
                <div class="mb-header-left">
                    ${needsBack
                        ? `<button type="button" class="mb-header-action" id="mb-back-btn" aria-label="Retour">${icons.arrowLeft}</button>`
                        : `<button type="button" class="mb-header-action" id="mb-menu-btn" aria-label="Menu">${navIcon('menu', false)}</button>`}
                    <div class="mb-header-titles">
                        <div class="mb-header-title">${title}</div>
                        ${subtitle ? `<div class="mb-header-sub">${subtitle}</div>` : ''}
                    </div>
                </div>
            </header>
            <main class="mb-content mb-content-spacious fp-page-enter">${content}</main>
            ${bottomNavHtml(bottomItems, pageId, { badgeCount: unread })}
        </div>
        <div class="mb-drawer-overlay" id="mb-drawer-overlay"></div>
        <aside class="mb-drawer" id="mb-drawer" aria-label="Menu">
            <div class="mb-drawer-header">
                <div class="mb-drawer-user">
                    ${avatarHtml(user.full_name || user.first_name, user.photo, 44)}
                    <div>
                        <strong>${user.full_name || displayName || 'Membre'}</strong>
                        <span>${user.member_number || ''}</span>
                    </div>
                </div>
                <button type="button" class="mb-header-action" id="mb-drawer-close" aria-label="Fermer">${icons.close}</button>
            </div>
            <nav class="mb-drawer-nav">
                ${menuItems.map(item => `
                    <a href="${item.external ? item.path : '/membre' + item.path}"
                       class="mb-drawer-link ${pageId === item.id || item.activeIds?.includes(pageId) ? 'active' : ''}"
                       data-drawer-nav ${item.badge ? 'data-badge="true"' : ''} ${item.external ? 'data-external' : ''}>
                        <span class="mb-drawer-icon">${navIcon(item.icon, pageId === item.id || item.activeIds?.includes(pageId))}</span>
                        <span>${item.label}</span>
                        ${item.badge && unread > 0 ? `<span class="mb-drawer-badge">${unread > 99 ? '99+' : unread}</span>` : ''}
                    </a>`).join('')}
            </nav>
            <div class="mb-drawer-footer">
                <button class="mb-drawer-link mb-drawer-logout" id="mb-logout" type="button">
                    <span class="mb-drawer-icon">${icons.logout}</span>
                    <span>Déconnexion</span>
                </button>
            </div>
        </aside>`;

    scrollToTopInstant();
    bindNav(options.router, options.onBack);
    bindBottomNav(path => options.router.navigate(path));
    if (needsBack && options.onBack) {
        document.getElementById('mb-back-btn')?.addEventListener('click', options.onBack);
    }
}

function bindNav(router, onBack) {
    const open = () => setDrawerOpen(true);
    const close = () => setDrawerOpen(false);

    // Délégation permanente : survit au swap menu ↔ retour
    if (!menuDelegated) {
        menuDelegated = true;
        document.getElementById('app')?.addEventListener('click', (e) => {
            if (e.target.closest('#mb-menu-btn')) open();
        });
    }

    if (navBound) return;
    navBound = true;
    document.getElementById('mb-drawer-close')?.addEventListener('click', close);
    document.getElementById('mb-drawer-overlay')?.addEventListener('click', close);

    const go = (path) => {
        close();
        unlockNativeScroll();
        router.navigate(path);
    };

    document.querySelectorAll('[data-drawer-nav]').forEach(l => {
        l.addEventListener('click', e => {
            if (l.dataset.external) return;
            e.preventDefault();
            go(l.getAttribute('href').replace('/membre', ''));
        });
    });

    document.getElementById('mb-logout')?.addEventListener('click', () => {
        api.clearTokens();
        router.navigate('/connexion');
    });
}

export function renderAuthPage(content) {
    navBound = false;
    document.getElementById('app').innerHTML = `
        <div class="mb-auth mb-fade-in">
            <div class="mb-auth-inner">
                <div class="mb-auth-card">${content}</div>
            </div>
        </div>`;
}

export function authBrand(subtitle = 'Votre espace personnel') {
    return `
        <div class="mb-brand">
            <div class="mb-brand-icon">FP</div>
            <h1>Famille Patience</h1>
            <p>${subtitle}</p>
        </div>`;
}

export function renderBarChart(items, color = '#ec4899') {
    if (!items?.length) return '<p class="mb-empty">Aucune donnée</p>';
    const max = Math.max(...items.map(i => i.value), 1);
    return items.map(i => `
        <div style="margin-bottom:10px">
            <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px">
                <span>${i.label}</span><strong>${i.value}%</strong>
            </div>
            <div style="height:8px;background:var(--mb-border);border-radius:4px;overflow:hidden">
                <div style="height:100%;width:${Math.round(i.value / max * 100)}%;background:${color};border-radius:4px"></div>
            </div>
        </div>`).join('');
}
