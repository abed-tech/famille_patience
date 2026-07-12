import { renderShell } from '../core/layout.js';
import { api, isReferrer } from '../core/api.js';
import { avatarHtml } from '../core/components.js';

export async function renderCounsellor(router) {
    if (!api.token) { router.navigate('/connexion'); return; }
    if (!isReferrer()) { router.navigate('/accueil'); return; }
    let counsellor;
    try {
        counsellor = (await api.getMyCounsellor()).data;
    } catch {
        router.navigate('/accueil');
        return;
    }

    const content = counsellor ? `
        <a href="/membre/mon-conseiller/profil" class="mb-dash-card" data-profile style="text-decoration:none;color:inherit">
            <div class="mb-dash-card-icon" style="background:#ede9fe">🎯</div>
            <div class="mb-dash-card-body" style="display:flex;align-items:center;gap:14px;flex:1">
                ${avatarHtml(counsellor.full_name, counsellor.photo, 56).replace('width:44px;height:44px', 'width:56px;height:56px;font-size:18px')}
                <div>
                    <h3 style="margin:0;font-size:16px">${counsellor.full_name}</h3>
                    <p style="margin:4px 0 0;font-size:13px;color:var(--mb-text-muted)">Votre conseiller</p>
                </div>
            </div>
            <span style="color:var(--mb-text-muted)">›</span>
        </a>
    ` : `
        <div class="mb-empty">
            <div style="font-size:48px;margin-bottom:12px">🎯</div>
            <p>Aucun conseiller ne vous est encore assigné.</p>
        </div>
    `;

    renderShell('counsellor', content, { router, title: 'Mon conseiller', subtitle: 'Votre superviseur' });

    document.querySelector('[data-profile]')?.addEventListener('click', e => {
        e.preventDefault();
        router.navigate('/mon-conseiller/profil');
    });
}

export async function renderCounsellorProfile(router) {
    if (!api.token) { router.navigate('/connexion'); return; }
    if (!isReferrer()) { router.navigate('/accueil'); return; }
    let counsellor;
    try {
        counsellor = (await api.getMyCounsellor()).data;
    } catch {
        router.navigate('/accueil');
        return;
    }

    if (!counsellor) {
        router.navigate('/mon-conseiller');
        return;
    }

    const content = `
        <div class="mb-card" style="text-align:center;padding:32px 24px">
            ${avatarHtml(counsellor.full_name, counsellor.photo, 96).replace('width:44px;height:44px', 'width:96px;height:96px;font-size:32px;margin:0 auto 20px')}
            <h2 style="font-size:20px;font-weight:700;margin:0">${counsellor.full_name}</h2>
            ${counsellor.phone ? `<p style="font-size:14px;color:var(--mb-text-secondary);margin-top:12px">📞 ${counsellor.phone}</p>` : ''}
        </div>
        ${counsellor.qr_code ? `
        <div class="mb-card" style="margin-top:16px;text-align:center;padding:24px">
            <h3 style="font-size:14px;font-weight:600;margin-bottom:16px">QR Code</h3>
            <img src="${counsellor.qr_code}" alt="QR Code conseiller" style="max-width:200px;border-radius:12px;margin:0 auto">
        </div>` : ''}
        <p style="font-size:12px;color:var(--mb-text-muted);text-align:center;margin-top:16px">Consultation en lecture seule</p>
    `;

    renderShell('counsellor-profile', content, {
        router,
        title: counsellor.full_name,
        subtitle: 'Profil conseiller',
        back: true,
        onBack: () => router.navigate('/mon-conseiller'),
    });
}
