import { renderShell } from '../core/layout.js';
import { api } from '../core/api.js';
import { avatarHtml } from '../core/components.js';

export async function renderReferrer(router) {
    if (!api.token) { router.navigate('/connexion'); return; }
    let ref;
    try {
        ref = (await api.getMyReferrer()).data;
    } catch {
        router.navigate('/connexion');
        return;
    }

    const content = ref ? `
        <div class="mb-card" style="text-align:center;padding:40px 24px">
            ${avatarHtml(ref.full_name, ref.photo, 96).replace('width:44px;height:44px', 'width:96px;height:96px;font-size:32px;margin:0 auto 20px')}
            <h2 style="font-size:20px;font-weight:700;margin:0">${ref.full_name}</h2>
            <p style="font-size:13px;color:var(--mb-text-muted);margin-top:8px">Votre référent</p>
        </div>
    ` : `
        <div class="mb-empty">
            <div style="font-size:48px;margin-bottom:12px">👤</div>
            <p>Aucun référent ne vous est encore assigné.</p>
        </div>
    `;

    renderShell('referrer', content, { router, title: 'Mon référent', subtitle: 'Votre accompagnateur' });
}
