/**
 * Barre de navigation inférieure fixe — partagée entre les apps FP
 */

import { icons } from './icons.js';

export function bottomNavHtml(items, pageId, { badgeCount = 0 } = {}) {
    return `
        <nav class="fp-bottom-nav" aria-label="Navigation principale">
            ${items.map(item => {
                const active = pageId === item.id || item.activeIds?.includes(pageId);
                const showBadge = (item.badge || item.id === 'notifications') && badgeCount > 0;
                return `
                    <button type="button"
                        class="fp-bottom-nav-item ${active ? 'active' : ''}"
                        data-bottom-nav="${item.path}"
                        data-nav-id="${item.id}"
                        aria-label="${item.label}"
                        aria-current="${active ? 'page' : 'false'}">
                        <span class="fp-bottom-nav-icon">${item.iconHtml || icons[item.icon] || ''}</span>
                        <span class="fp-bottom-nav-label">${item.label}</span>
                        ${showBadge ? '<span class="fp-bottom-nav-dot" aria-hidden="true"></span>' : ''}
                    </button>`;
            }).join('')}
        </nav>`;
}

export function bindBottomNav(navigateFn, { onMenu } = {}) {
    document.querySelectorAll('[data-bottom-nav]').forEach(btn => {
        btn.addEventListener('click', () => {
            const path = btn.dataset.bottomNav;
            if (path === '__menu__') {
                onMenu?.();
                return;
            }
            if (path) navigateFn(path);
        });
    });
}

export function refreshBottomNav(pageId, items) {
    document.querySelectorAll('.fp-bottom-nav-item').forEach(btn => {
        const id = btn.dataset.navId;
        const item = items.find(i => i.id === id);
        const active = item && (pageId === item.id || item.activeIds?.includes(pageId));
        btn.classList.toggle('active', !!active);
        btn.setAttribute('aria-current', active ? 'page' : 'false');
    });
}

export const MEMBER_BOTTOM_NAV = [
    { id: 'home', path: '/accueil', label: 'Accueil', icon: 'home', activeIds: ['staff-dash', 'referrer', 'counsellor', 'counsellor-profile'] },
    { id: 'events', path: '/evenements', label: 'Événements', icon: 'calendar', activeIds: ['event-agent-detail', 'pointage', 'pointage-scan'] },
    { id: 'card', path: '/carte', label: 'Carte', icon: 'card', activeIds: ['qr'] },
    { id: 'notifications', path: '/notifications', label: 'Alertes', icon: 'bell', badge: true },
    { id: 'profile', path: '/profil', label: 'Profil', icon: 'user', activeIds: ['settings', 'history'] },
];

export const REFERRER_BOTTOM_NAV = [
    { id: 'home', path: '/accueil', label: 'Accueil', icon: 'home', activeIds: ['staff-dash'] },
    { id: 'my-members', path: '/mes-membres', label: 'Membres', icon: 'users', activeIds: ['member-detail'] },
    { id: 'card', path: '/carte', label: 'Carte', icon: 'card' },
    { id: 'notifications', path: '/notifications', label: 'Alertes', icon: 'bell', badge: true },
    { id: 'profile', path: '/profil', label: 'Profil', icon: 'user', activeIds: ['settings'] },
];

export const COUNSELLOR_MEMBER_BOTTOM_NAV = [
    { id: 'home', path: '/accueil', label: 'Accueil', icon: 'home' },
    { id: 'my-referrers', path: '/mes-referents', label: 'Référents', icon: 'users', activeIds: ['referrer-detail', 'member-detail'] },
    { id: 'card', path: '/carte', label: 'Carte', icon: 'card' },
    { id: 'notifications', path: '/notifications', label: 'Alertes', icon: 'bell', badge: true },
    { id: 'profile', path: '/profil', label: 'Profil', icon: 'user' },
];

export const COUNSELLOR_BOTTOM_NAV = [
    { id: 'dashboard', path: '/dashboard', label: 'Accueil', icon: 'dashboard' },
    { id: 'referrers', path: '/referents', label: 'Référents', icon: 'userCheck', activeIds: ['referrer-detail', 'member-detail'] },
    { id: 'events', path: '/evenements', label: 'Événements', icon: 'calendar', activeIds: ['event-detail'] },
    { id: 'profile', path: '/profil', label: 'Profil', icon: 'user' },
];

export const ADMIN_BOTTOM_NAV = [
    { id: 'dashboard', path: '/dashboard', label: 'Accueil', icon: 'dashboard', activeIds: ['stats', 'activity'] },
    { id: 'members', path: '/membres', label: 'Membres', icon: 'users', activeIds: ['member-detail', 'referrers', 'counsellors', 'referrer-detail', 'counsellor-detail'] },
    { id: 'events', path: '/evenements', label: 'Événements', icon: 'calendar', activeIds: ['pointage'] },
    { id: 'reports', path: '/rapports', label: 'Rapports', icon: 'file' },
    { id: 'menu', path: '__menu__', label: 'Menu', icon: 'menu' },
];

export const POINTAGE_BOTTOM_NAV = [
    { id: 'dashboard', path: '/accueil', label: 'Accueil', icon: 'dashboard' },
    { id: 'scan', path: '/scan', label: 'Pointage', icon: 'scan' },
    { id: 'events', path: '/evenements', label: 'Événements', icon: 'calendar' },
];
