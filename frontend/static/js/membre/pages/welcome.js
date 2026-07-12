import { renderAuthPage, authBrand } from '../core/layout.js';

const BASE = '/membre';

export function renderWelcome(router) {
    renderAuthPage(`
        ${authBrand('Votre espace personnel')}
        <div style="display:flex;flex-direction:column;gap:12px">
            <a href="${BASE}/connexion" class="mb-btn mb-btn-primary" data-link style="text-decoration:none">Se connecter</a>
            <a href="${BASE}/inscription" class="mb-btn mb-btn-secondary" data-link style="text-decoration:none">S'inscrire</a>
        </div>
        <p style="text-align:center;font-size:12px;color:var(--mb-text-muted);margin-top:28px;line-height:1.6">
            Gérez votre profil, votre carte de membre<br>et suivez vos événements en toute simplicité.
        </p>
    `);

    document.querySelectorAll('[data-link]').forEach(l => {
        l.addEventListener('click', e => {
            e.preventDefault();
            router.navigate(l.getAttribute('href').replace(BASE, ''));
        });
    });
}
