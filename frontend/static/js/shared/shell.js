/** Mise à jour rapide du contenu sans reconstruire le shell */

/** Remonte la page sans animation (fluide, prévisible, iOS-safe). */
export function scrollToTopInstant() {
    const roots = [
        document.scrollingElement,
        document.documentElement,
        document.body,
        document.querySelector('.mb-content'),
        document.querySelector('.adm-content'),
        document.querySelector('.adm-main'),
    ].filter(Boolean);

    const prev = document.documentElement.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = 'auto';
    roots.forEach((el) => {
        try {
            if (typeof el.scrollTo === 'function') el.scrollTo(0, 0);
            else el.scrollTop = 0;
        } catch { /* ignore */ }
    });
    window.scrollTo(0, 0);
    document.documentElement.style.scrollBehavior = prev;
}

export function swapContent(selector, html) {
    const el = document.querySelector(selector);
    if (!el) return false;
    el.classList.remove('fp-page-enter', 'fp-page-leave', 'fp-content-leave');
    el.innerHTML = html;
    scrollToTopInstant();
    // Une seule frame : évite le layout thrash du double rAF
    requestAnimationFrame(() => {
        el.classList.add('fp-page-enter');
    });
    return true;
}

export function setNavActive(linkSelector, pageId, attr = 'data-nav') {
    document.querySelectorAll(linkSelector).forEach(link => {
        const id = link.getAttribute(attr)?.replace(/^\//, '') || '';
        const active = link.dataset.pageId === pageId
            || (link.getAttribute('href') || '').includes(pageId);
        link.classList.toggle('active', active);
    });
}

export function updateText(selector, text) {
    const el = document.querySelector(selector);
    if (el && text != null) el.textContent = text;
}
