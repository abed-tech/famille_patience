/** Navigation SPA — liens internes via data-go */

export function bindMembreNavigation(router) {
    document.addEventListener('click', (e) => {
        const link = e.target.closest('[data-go]');
        if (!link || !link.closest('.mb-app, .mb-auth')) return;
        e.preventDefault();
        router.navigate(link.dataset.go);
    });
}
