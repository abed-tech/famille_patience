import { router } from '../app.js';
import { api } from '../api.js';

export function renderLogin() {
    document.getElementById('app').innerHTML = `
        <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-primary-100 px-4">
            <div class="w-full max-w-md fade-in">
                <div class="text-center mb-8">
                    <div class="w-16 h-16 bg-primary-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary-200">
                        <span class="text-white font-bold text-2xl">FP</span>
                    </div>
                    <h1 class="text-2xl font-bold text-gray-900">Famille Patience</h1>
                    <p class="text-gray-500 mt-1 text-sm">Connectez-vous à votre espace</p>
                </div>

                <form id="login-form" class="card space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                        <input type="email" name="email" required class="input-field" placeholder="votre@email.com">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1.5">Mot de passe</label>
                        <input type="password" name="password" required class="input-field" placeholder="••••••••">
                    </div>
                    <div id="login-error" class="hidden text-red-500 text-sm bg-red-50 p-3 rounded-xl"></div>
                    <button type="submit" class="btn-primary w-full">Se connecter</button>
                </form>
            </div>
        </div>
    `;

    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const form = e.target;
        const errorEl = document.getElementById('login-error');
        errorEl.classList.add('hidden');

        try {
            const data = await api.login(form.email.value, form.password.value);
            api.setTokens(data.access, data.refresh);
            localStorage.setItem('user', JSON.stringify(data.user));
            router.navigate('/dashboard');
        } catch (err) {
            errorEl.textContent = err.message;
            errorEl.classList.remove('hidden');
        }
    });
}
