import { icons as shared } from '../../shared/icons.js';

/** Paires outline / filled — style Instagram */
const NAV = {
    home: {
        outline: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5L12 3l9 7.5V20a1.5 1.5 0 01-1.5 1.5H15v-7H9v7H4.5A1.5 1.5 0 013 20v-9.5z"/></svg>',
        filled: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.1 2 11h3v10h5v-6h4v6h5V11h3L12 2.1z"/></svg>',
    },
    calendar: {
        outline: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4.5" width="18" height="17" rx="2.5"/><path d="M16 2.5v4M8 2.5v4M3 10h18"/></svg>',
        filled: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 2a1 1 0 011 1v1h8V3a1 1 0 112 0v1h1.5A2.5 2.5 0 0122 6.5v14a2.5 2.5 0 01-2.5 2.5h-15A2.5 2.5 0 012 20.5v-14A2.5 2.5 0 014.5 4H6V3a1 1 0 011-1zm13 8H4v10.5c0 .28.22.5.5.5h15a.5.5 0 00.5-.5V10z"/></svg>',
    },
    card: {
        outline: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="5.5" width="19" height="13" rx="2.5"/><path d="M2.5 10.5h19"/></svg>',
        filled: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 6a2 2 0 012-2h12a2 2 0 012 2v1H4V6zm-1 4h18v8a2 2 0 01-2 2H5a2 2 0 01-2-2v-8z"/></svg>',
    },
    bell: {
        outline: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 10-12 0c0 6.5-2.5 8.5-2.5 8.5h17S18 14.5 18 8z"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>',
        filled: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a7 7 0 00-7 7c0 5.25-2.5 7.5-2.5 7.5h19S19 14.25 19 9a7 7 0 00-7-7zm0 20a2.5 2.5 0 01-2.45-2h4.9A2.5 2.5 0 0112 22z"/></svg>',
    },
    user: {
        outline: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M5 20c0-3.87 3.13-7 7-7s7 3.13 7 7"/></svg>',
        filled: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a6 6 0 100 12 6 6 0 000-12zm0 14c-4.42 0-8 2.24-8 5v1h16v-1c0-2.76-3.58-5-8-5z"/></svg>',
    },
    search: {
        outline: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>',
        filled: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M10.5 3a7.5 7.5 0 015.96 12.17l4.22 4.22-1.41 1.41-4.22-4.22A7.5 7.5 0 1110.5 3zm0 2a5.5 5.5 0 100 11 5.5 5.5 0 000-11z"/></svg>',
    },
    menu: {
        outline: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
        filled: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 6h16v2H4V6zm0 5h16v2H4v-2zm0 5h16v2H4v-2z"/></svg>',
    },
};

export function navIcon(name, active = false) {
    const pair = NAV[name];
    if (!pair) return shared[name] || '';
    return active ? pair.filled : pair.outline;
}

export function navProfileIcon(photoUrl, name, active = false) {
    const initials = (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    const inner = photoUrl
        ? `<img src="${photoUrl}" alt="">`
        : `<span class="mb-nav-avatar-fallback">${initials}</span>`;
    return `<span class="mb-nav-avatar-wrap ${active ? 'active' : ''}">${inner}</span>`;
}

export const icons = {
    ...shared,
    referrer: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M6 20v-1a6 6 0 0112 0v1"/></svg>',
    history: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>',
    homeFilled: NAV.home.filled,
    calendarFilled: NAV.calendar.filled,
    cardFilled: NAV.card.filled,
    bellFilled: NAV.bell.filled,
};

/** Icônes colorées pour les cartes du dashboard */
export const cardIcons = {
    user: { svg: navIcon('user', true), bg: '#fdf2f8', color: '#ec4899' },
    card: { svg: navIcon('card', true), bg: '#eff6ff', color: '#3b82f6' },
    calendar: { svg: navIcon('calendar', true), bg: '#ecfdf5', color: '#10b981' },
    chart: { svg: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="14" width="4" height="6" rx="1"/><rect x="10" y="10" width="4" height="10" rx="1"/><rect x="16" y="6" width="4" height="14" rx="1"/></svg>', bg: '#fff7ed', color: '#f59e0b' },
};

export function cardIconHtml(key) {
    const c = cardIcons[key];
    if (!c) return '';
    return `<div class="mb-home-card-icon" style="background:${c.bg};color:${c.color}">${c.svg}</div>`;
}
