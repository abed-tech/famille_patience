/**
 * Utilitaires de routage SPA — évite les conflits entre applications (/membre, /gestion…).
 */

export function normalizeAppPath(pathname, base) {
    const baseClean = base.replace(/\/$/, '');
    let path = (pathname || '').replace(/\/$/, '') || baseClean;
    if (path.startsWith(baseClean)) {
        path = path.slice(baseClean.length) || '/';
    }
    if (!path.startsWith('/')) path = `/${path}`;
    return path.replace(/\/$/, '') || '/';
}

export function ensureAppBase(base) {
    const baseClean = base.replace(/\/$/, '');
    const pathname = location.pathname.replace(/\/$/, '') || baseClean;
    if (!pathname.startsWith(baseClean)) {
        window.location.replace(`${baseClean}/`);
        return false;
    }
    return true;
}

export function appUrl(base, path = '/') {
    const baseClean = base.replace(/\/$/, '');
    const sub = path.startsWith('/') ? path : `/${path}`;
    return `${baseClean}${sub === '/' ? '/' : sub}`;
}
