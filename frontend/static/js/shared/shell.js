/** Mise à jour rapide du contenu sans reconstruire le shell */

export function swapContent(selector, html) {
    const el = document.querySelector(selector);
    if (!el) return false;
    el.classList.remove('fp-page-enter');
    el.innerHTML = html;
    requestAnimationFrame(() => el.classList.add('fp-page-enter'));
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
