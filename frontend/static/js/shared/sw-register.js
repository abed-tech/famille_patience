/** Enregistre le service worker corrigé (sans cache des pages SPA). */
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/static/js/sw.js')
            .then((reg) => reg.update())
            .catch(() => {});
    });
}
