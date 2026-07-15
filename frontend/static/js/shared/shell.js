/** Mise à jour rapide du contenu sans reconstruire le shell */

import { onPageScrollReady } from './native-scroll.js';

/** Remonte la page sans animation (fluide, prévisible, iOS-safe). */
export function scrollToTopInstant() {
    onPageScrollReady();
    // Ne scroller QUE le document — pas les sous-conteneurs (évite conflits tactiles)
    const root = document.scrollingElement || document.documentElement;
    const prev = root.style.scrollBehavior;
    root.style.scrollBehavior = 'auto';
    root.scrollTop = 0;
    document.body.scrollTop = 0;
    window.scrollTo(0, 0);
    root.style.scrollBehavior = prev;
}

export function swapContent(selector, html) {
    const el = document.querySelector(selector);
    if (!el) return false;
    el.classList.remove('fp-page-enter', 'fp-page-leave', 'fp-content-leave');
    onPageScrollReady();
    el.innerHTML = html;
    scrollToTopInstant();
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reduced) {
        requestAnimationFrame(() => el.classList.add('fp-page-enter'));
    }
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
