export { icons } from '../../shared/icons.js';

export const NAV_ITEMS = [
    { section: 'Principal' },
    { id: 'dashboard', path: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
    { id: 'members', path: '/membres', label: 'Membres', icon: 'users' },
    { id: 'referrers', path: '/referents', label: 'Référents', icon: 'userCheck' },
    { id: 'counsellors', path: '/conseillers', label: 'Conseillers', icon: 'userCog' },
    { id: 'events', path: '/evenements', label: 'Événements', icon: 'calendar' },
    { id: 'pointage', path: '/pointage', label: 'Pointage', icon: 'scan' },
    { section: 'Analyse' },
    { id: 'stats', path: '/statistiques', label: 'Statistiques', icon: 'chart' },
    { id: 'poles', path: '/poles', label: 'Pôles', icon: 'layers' },
    { id: 'departments', path: '/departements', label: 'Départements', icon: 'grid' },
    { id: 'professions', path: '/professions', label: 'Professions', icon: 'file' },
    { section: 'Système' },
    { id: 'notifications', path: '/notifications', label: 'Notifications', icon: 'bell' },
    { id: 'reports', path: '/rapports', label: 'Rapports', icon: 'file' },
    { id: 'activity', path: '/journal', label: 'Journal d\'activité', icon: 'activity' },
    { id: 'settings', path: '/parametres', label: 'Paramètres', icon: 'settings' },
];

export const PAGE_TITLES = {
    dashboard: 'Dashboard',
    members: 'Membres',
    referrers: 'Référents',
    counsellors: 'Conseillers',
    events: 'Événements',
    pointage: 'Pointage en direct',
    stats: 'Statistiques',
    poles: 'Pôles',
    departments: 'Départements',
    professions: 'Professions',
    notifications: 'Notifications',
    reports: 'Rapports',
    activity: 'Journal d\'activité',
    settings: 'Paramètres',
};
