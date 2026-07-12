import { renderShell } from '../core/layout.js';
import { api } from '../core/api.js';
import { memberCardHtml, qrImageUrl } from '../../shared/member-card.js';

export async function renderCard(router) {
    if (!api.token) { router.navigate('/connexion'); return; }
    let card;
    try {
        card = (await api.getMyCard()).data;
    } catch {
        router.navigate('/connexion');
        return;
    }

    const content = `
        ${memberCardHtml(card)}
        <p style="text-align:center;font-size:12px;color:var(--mb-text-muted);margin-top:16px">
            Présentez cette carte lors des événements de la famille.
        </p>
        <button class="mb-btn mb-btn-secondary" style="width:100%;margin-top:12px" id="go-qr">Voir le QR Code en grand</button>
    `;

    renderShell('card', content, { router, title: 'Ma carte', subtitle: card.member_number });

    document.getElementById('go-qr')?.addEventListener('click', () => router.navigate('/qr-code'));
}

export async function renderQR(router) {
    if (!api.token) { router.navigate('/connexion'); return; }
    let card;
    try {
        card = (await api.getMyCard()).data;
    } catch {
        router.navigate('/connexion');
        return;
    }

    const content = `
        <div class="mb-qr-page">
            <p style="font-size:14px;color:var(--mb-text-muted);margin-bottom:24px">
                Présentez ce code lors du pointage aux événements.
            </p>
            <img src="${qrImageUrl(card.qr_code, 280)}" alt="QR Code" width="280" height="280">
            <p style="font-family:monospace;font-size:12px;color:var(--mb-text-muted);margin-top:20px;word-break:break-all">${card.qr_code}</p>
            <p style="font-size:11px;color:var(--mb-text-muted);margin-top:16px">Ce code est personnel et ne peut pas être modifié.</p>
        </div>
    `;

    renderShell('qr', content, { router, title: 'Mon QR Code', subtitle: 'Pointage événements' });
}
