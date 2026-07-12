import { renderShell } from '../core/layout.js';
import { api, changePassword } from '../core/api.js';
import { toast } from '../core/components.js';

export async function renderSettings(router) {
    if (!api.token) { router.navigate('/connexion'); return; }

    const content = `
        <p class="mb-section-title" style="margin-top:0">Sécurité</p>
        <div class="mb-card">
            <form id="pw-form">
                <div class="mb-form-group"><label class="mb-label">Mot de passe actuel</label><input class="mb-input" type="password" name="old" required></div>
                <div class="mb-form-group"><label class="mb-label">Nouveau mot de passe</label><input class="mb-input" type="password" name="new" required minlength="8"></div>
                <div class="mb-form-group"><label class="mb-label">Confirmer</label><input class="mb-input" type="password" name="confirm" required></div>
                <button type="submit" class="mb-btn mb-btn-primary">Modifier le mot de passe</button>
            </form>
        </div>
        <p class="mb-section-title">Préférences</p>
        <div class="mb-card">
            <label class="mb-list-item" style="cursor:pointer">
                <span>Notifications push</span>
                <input type="checkbox" id="pref-notif" checked style="width:20px;height:20px;accent-color:var(--mb-primary)">
            </label>
            <label class="mb-list-item" style="cursor:pointer">
                <span>Rappels d'événements</span>
                <input type="checkbox" id="pref-events" checked style="width:20px;height:20px;accent-color:var(--mb-primary)">
            </label>
        </div>
        <button class="mb-btn mb-btn-secondary" style="width:100%;margin-top:8px;color:#ef4444;border:1px solid #fecaca" id="logout-btn">
            Se déconnecter
        </button>
        <p style="text-align:center;font-size:11px;color:var(--mb-text-muted);margin-top:24px">Famille Patience · v1.0</p>
    `;

    renderShell('settings', content, { router, title: 'Paramètres', subtitle: 'Compte & préférences' });

    const prefs = JSON.parse(localStorage.getItem('membre_prefs') || '{"notif":true,"events":true}');
    document.getElementById('pref-notif').checked = prefs.notif !== false;
    document.getElementById('pref-events').checked = prefs.events !== false;

    const savePrefs = () => {
        localStorage.setItem('membre_prefs', JSON.stringify({
            notif: document.getElementById('pref-notif').checked,
            events: document.getElementById('pref-events').checked,
        }));
    };
    document.getElementById('pref-notif').addEventListener('change', savePrefs);
    document.getElementById('pref-events').addEventListener('change', () => { savePrefs(); toast('Préférences enregistrées'); });

    document.getElementById('pw-form').addEventListener('submit', async e => {
        e.preventDefault();
        const f = e.target;
        if (f.new.value !== f.confirm.value) { toast('Les mots de passe ne correspondent pas'); return; }
        try {
            await changePassword(f.old.value, f.new.value);
            toast('Mot de passe modifié');
            f.reset();
        } catch (ex) { toast(ex.message); }
    });

    document.getElementById('logout-btn').addEventListener('click', () => {
        api.clearTokens();
        router.navigate('/connexion');
    });
}
