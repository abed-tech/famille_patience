/**
 * Garantit un scroll natif 1 doigt (iOS/Android).
 * - Débloque un éventuel fp-scroll-lock coincé
 * - Ne touche jamais preventDefault sur touchmove
 */

export function unlockNativeScroll() {
    document.body.classList.remove('fp-scroll-lock');
    document.documentElement.classList.remove('fp-scroll-lock');
    delete document.body.dataset.fpScrollY;
    // Remettre overflow / touch explicites au cas où un style inline a fuité
    document.body.style.removeProperty('overflow');
    document.body.style.removeProperty('touch-action');
    document.body.style.removeProperty('position');
    document.body.style.removeProperty('top');
    document.body.style.removeProperty('width');
    document.documentElement.style.removeProperty('overflow');
    document.documentElement.style.removeProperty('touch-action');
}

/** À appeler à chaque navigation SPA */
export function onPageScrollReady() {
    unlockNativeScroll();
}
