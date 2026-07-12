import { renderAuthPage, authBrand } from '../core/layout.js';
import { login, api } from '../core/api.js';
import { toast } from '../core/components.js';

const BASE = '/membre';

export function renderLogin(router) {
    renderAuthPage(`
        ${authBrand('Connectez-vous à votre espace')}
        <div class="mb-card">
            <form id="login-form">
                <div class="mb-form-group">
                    <label class="mb-label">Téléphone ou e-mail</label>
                    <input class="mb-input" name="identifier" required autocomplete="username" placeholder="ex: +243... ou email@...">
                </div>
                <div class="mb-form-group">
                    <label class="mb-label">Mot de passe</label>
                    <input class="mb-input" type="password" name="password" required autocomplete="current-password" placeholder="••••••••">
                </div>
                <p style="text-align:right;margin:-6px 0 14px">
                    <a href="#" id="forgot-pw" class="mb-btn-ghost" style="font-size:12px;padding:0">Mot de passe oublié ?</a>
                </p>
                <div id="login-error" class="mb-card" style="display:none;background:#fef2f2;color:#ef4444;font-size:13px;padding:12px;margin-bottom:12px"></div>
                <button type="submit" class="mb-btn mb-btn-primary">Se connecter</button>
            </form>
        </div>
        <p style="text-align:center;font-size:13px;color:var(--mb-text-muted);margin-top:20px">
            Pas encore membre ?
            <a href="${BASE}/inscription" data-link style="color:var(--mb-primary);font-weight:600">Créer un compte</a>
        </p>
    `);

    document.querySelector('[data-link]')?.addEventListener('click', e => {
        e.preventDefault();
        router.navigate('/inscription');
    });

    document.getElementById('forgot-pw')?.addEventListener('click', e => {
        e.preventDefault();
        toast('Contactez votre référent pour réinitialiser votre mot de passe.');
    });

    document.getElementById('login-form').addEventListener('submit', async e => {
        e.preventDefault();
        const err = document.getElementById('login-error');
        err.style.display = 'none';
        const f = e.target;
        try {
            const data = await login(f.identifier.value.trim(), f.password.value);
            api.setTokens(data.access, data.refresh);
            api.setUser(data.user);
            await router.refreshUser();
            router.navigate('/accueil');
        } catch (ex) {
            const msg = ex.message || '';
            if (msg.includes('Administrateur') || msg.includes('administrateur')) {
                err.innerHTML = `${msg}<br><a href="/gestion/" style="color:var(--mb-primary);font-weight:600;margin-top:6px;display:inline-block">Accéder à l'administration →</a>`;
            } else {
                err.textContent = msg;
            }
            err.style.display = 'block';
        }
    });
}
