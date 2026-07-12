export { icons } from '../../shared/icons.js';

export const NAV_ITEMS = [
    { section: 'Mon espace' },
    { id: 'profile', path: '/profil', label: 'Mon Profil', icon: 'user' },
    { section: 'Encadrement' },
    { id: 'dashboard', path: '/dashboard', label: 'Tableau de bord', icon: 'dashboard' },
    { id: 'referrers', path: '/referents', label: 'Mes Référents', icon: 'userCheck' },
    { id: 'events', path: '/evenements', label: 'Événements', icon: 'calendar' },
];

export const PAGE_TITLES = {
    profile: 'Mon Profil',
    dashboard: 'Tableau de bord',
    referrers: 'Mes Référents',
    events: 'Événements',
    'referrer-detail': 'Profil référent',
    'member-detail': 'Profil membre',
    'event-detail': 'Présences & absences',
};
