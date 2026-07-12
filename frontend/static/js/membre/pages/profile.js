import { renderShell } from '../core/layout.js';
import { api, updateMyProfile } from '../core/api.js';
import { toast, avatarHtml } from '../core/components.js';

export async function renderProfile(router) {
    if (!api.token) { router.navigate('/connexion'); return; }
    let p;
    try {
        p = (await api.getMyProfile()).data;
    } catch {
        router.navigate('/connexion');
        return;
    }

    let photoFile = null;
    const photoUrl = p.photo ? (p.photo.startsWith('http') ? p.photo : p.photo) : null;

    const content = `
        <div style="text-align:center;margin-bottom:20px">
            <div class="mb-photo-upload" id="prof-photo">
                ${photoUrl ? `<img src="${photoUrl}" alt="">` : avatarHtml(p.full_name, null, 88).replace('width:44px;height:44px', 'width:88px;height:88px;font-size:24px')}
                <input type="file" id="photo-input" accept="image/*">
            </div>
            <p style="font-size:12px;color:var(--mb-text-muted)">Appuyez pour changer la photo</p>
        </div>
        <div class="mb-card" style="margin-bottom:16px">
            <div class="mb-list-item"><span class="mb-label">Nom complet</span><strong>${p.full_name}</strong></div>
            <div class="mb-list-item"><span class="mb-label">N° membre</span><strong>${p.member_number}</strong></div>
            <div class="mb-list-item"><span class="mb-label">Pôle famille</span><span>${p.family_pole_detail?.name || '—'}</span></div>
            <div class="mb-list-item"><span class="mb-label">Département</span><span>${p.church_department_detail?.name || '—'}</span></div>
        </div>
        <form id="prof-form" class="mb-card">
            <p class="mb-section-title" style="margin-top:0">Informations modifiables</p>
            <div class="mb-form-group"><label class="mb-label">Adresse</label><textarea class="mb-textarea" name="address" rows="2">${p.address || ''}</textarea></div>
            <div class="mb-form-group"><label class="mb-label">Téléphone</label><input class="mb-input" name="phone_primary" value="${p.phone_primary || ''}"></div>
            <div class="mb-form-group"><label class="mb-label">WhatsApp</label><input class="mb-input" name="whatsapp" value="${p.whatsapp || ''}"></div>
            <div class="mb-form-group"><label class="mb-label">E-mail</label><input class="mb-input" type="email" name="email" value="${p.email || ''}"></div>
            <button type="submit" class="mb-btn mb-btn-primary">Enregistrer</button>
        </form>
        <p style="text-align:center;margin-top:16px;font-size:13px;color:var(--mb-text-muted)">
            Mot de passe · <a href="/membre/parametres" data-go="/parametres" style="color:var(--mb-primary);font-weight:600">Paramètres</a>
        </p>
    `;

    renderShell('profile', content, { router, header: { first_name: p.first_name, full_name: p.full_name, photo: photoUrl, member_number: p.member_number }, title: 'Mon Profil' });

    document.querySelector('[data-go]')?.addEventListener('click', e => {
        e.preventDefault();
        router.navigate(e.target.dataset.go);
    });

    document.getElementById('photo-input')?.addEventListener('change', e => {
        photoFile = e.target.files[0];
        if (photoFile) {
            document.getElementById('prof-photo').innerHTML = `
                <img src="${URL.createObjectURL(photoFile)}" alt="">
                <input type="file" id="photo-input" accept="image/*">`;
            document.getElementById('photo-input').files = e.target.files;
            document.getElementById('photo-input').addEventListener('change', ev => { photoFile = ev.target.files[0]; });
        }
    });

    document.getElementById('prof-form').addEventListener('submit', async e => {
        e.preventDefault();
        const f = e.target;
        const payload = {};
        ['address', 'phone_primary', 'whatsapp', 'email'].forEach(k => { payload[k] = f[k].value; });
        try {
            await updateMyProfile(payload, photoFile);
            toast('Profil mis à jour');
            renderProfile(router);
        } catch (ex) { toast(ex.message); }
    });
}
