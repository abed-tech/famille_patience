import { renderShell } from '../core/layout.js';
import { api } from '../core/api.js';
import { avatarEl, formatDate, formatDateTime, toast } from '../core/components.js';

function qrImageUrl(code, size = 160) {
    if (!code) return '';
    if (code.startsWith('http')) return code;
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(code)}`;
}

export async function renderProfile() {
    let profile, card, dash, attendances;
    try {
        [profile, card, dash, attendances] = await Promise.all([
            api.getMyProfile().then(r => r.data),
            api.getMyCard().then(r => r.data).catch(() => null),
            api.getMyDashboard().then(r => r.data).catch(() => ({ stats: {} })),
            api.getMyAttendances().then(r => r.data).catch(() => []),
        ]);
    } catch (e) {
        toast(e.message || 'Impossible de charger le profil');
        return;
    }

    let photoFile = null;
    const photoUrl = profile.photo || null;
    const rate = dash.stats?.attendance_rate ?? 0;
    const history = Array.isArray(attendances) ? attendances.slice(0, 10) : (attendances?.results || []).slice(0, 10);

    renderShell('profile', `
        <div class="cns-profile-hero">
            <div class="cns-photo-upload" id="cns-photo-wrap">
                ${avatarEl(profile.full_name, photoUrl, 'xl')}
                <input type="file" id="cns-photo-input" accept="image/*" hidden>
                <button type="button" class="cns-photo-btn" id="cns-photo-btn">Changer la photo</button>
            </div>
            <div>
                <h2>${profile.full_name}</h2>
                <p class="cns-meta">N° ${profile.member_number || '—'}</p>
                <p class="cns-meta cns-rate-highlight">${rate}% de présence</p>
            </div>
        </div>

        ${card ? `
        <div class="cns-card cns-mt">
            <div class="cns-card-header"><h3>Ma carte de membre</h3></div>
            <div class="cns-card-body">
                <div class="cns-member-card-preview">
                    ${card.photo ? `<img src="${card.photo}" alt="" class="cns-member-card-photo">` : ''}
                    <div>
                        <div class="cns-member-card-name">${card.full_name}</div>
                        <div class="cns-member-card-num">${card.member_number}</div>
                        ${card.family_pole ? `<div class="cns-member-card-pole">${card.family_pole}</div>` : ''}
                    </div>
                    ${card.qr_code ? `<img src="${qrImageUrl(card.qr_code, 80)}" alt="QR" class="cns-member-card-qr">` : ''}
                </div>
            </div>
        </div>` : ''}

        ${profile.qr_code ? `
        <div class="cns-card cns-mt">
            <div class="cns-card-header"><h3>Mon QR Code</h3></div>
            <div class="cns-card-body cns-qr-wrap">
                <img src="${qrImageUrl(profile.qr_code)}" alt="QR Code" class="cns-qr-img">
            </div>
        </div>` : ''}

        <div class="cns-card cns-mt">
            <div class="cns-card-header"><h3>Informations personnelles</h3></div>
            <div class="cns-card-body cns-info-grid">
                <div><label>Sexe</label><span>${profile.gender === 'F' ? 'Féminin' : 'Masculin'}</span></div>
                <div><label>Date de naissance</label><span>${profile.date_of_birth || '—'}</span></div>
                <div><label>Pôle famille</label><span>${profile.family_pole_detail?.name || '—'}</span></div>
                <div><label>Département</label><span>${profile.church_department_detail?.name || '—'}</span></div>
                <div><label>Profession</label><span>${profile.profession || '—'}</span></div>
                <div><label>Statut</label><span>${profile.status === 'active' ? 'Actif' : profile.status}</span></div>
            </div>
        </div>

        <div class="cns-card cns-mt">
            <div class="cns-card-header"><h3>Informations modifiables</h3></div>
            <div class="cns-card-body">
                <form id="cns-prof-form" class="cns-form-stack">
                    <div class="cns-form-group"><label>Adresse</label><textarea name="address" rows="2">${profile.address || ''}</textarea></div>
                    <div class="cns-form-group"><label>Téléphone</label><input name="phone_primary" value="${profile.phone_primary || ''}"></div>
                    <div class="cns-form-group"><label>WhatsApp</label><input name="whatsapp" value="${profile.whatsapp || ''}"></div>
                    <div class="cns-form-group"><label>E-mail</label><input type="email" name="email" value="${profile.email || ''}"></div>
                    <button type="submit" class="cns-btn cns-btn-primary">Enregistrer</button>
                </form>
            </div>
        </div>

        <div class="cns-card cns-mt">
            <div class="cns-card-header"><h3>Mot de passe</h3></div>
            <div class="cns-card-body">
                <form id="cns-pw-form" class="cns-form-stack">
                    <div class="cns-form-group"><label>Mot de passe actuel</label><input type="password" name="old" required></div>
                    <div class="cns-form-group"><label>Nouveau mot de passe</label><input type="password" name="new" required minlength="8"></div>
                    <div class="cns-form-group"><label>Confirmer</label><input type="password" name="confirm" required></div>
                    <button type="submit" class="cns-btn cns-btn-secondary">Modifier le mot de passe</button>
                </form>
            </div>
        </div>

        <div class="cns-card cns-mt">
            <div class="cns-card-header"><h3>Historique de participation</h3></div>
            <div class="cns-card-body cns-history-list">
                ${history.length ? history.map(a => `
                    <div class="cns-history-item ${a.is_present ? 'cns-history-present' : 'cns-history-absent'}">
                        <strong>${a.event?.name || a.event_name || 'Événement'}</strong>
                        <span>${formatDate(a.event?.date || a.event_date)} · ${a.is_present ? 'Présent' : 'Absent'}${a.scanned_at ? ' · ' + formatDateTime(a.scanned_at) : ''}</span>
                    </div>`).join('') : '<p class="cns-empty">Aucune participation enregistrée</p>'}
            </div>
        </div>`,
        { title: 'Mon Profil', subtitle: 'Espace personnel' });

    document.getElementById('cns-photo-btn')?.addEventListener('click', () => {
        document.getElementById('cns-photo-input')?.click();
    });
    document.getElementById('cns-photo-input')?.addEventListener('change', async e => {
        photoFile = e.target.files[0];
        if (!photoFile) return;
        try {
            await api.updateMyProfile({}, photoFile);
            toast('Photo mise à jour');
            renderProfile();
        } catch (ex) { toast(ex.message); }
    });

    document.getElementById('cns-prof-form')?.addEventListener('submit', async e => {
        e.preventDefault();
        const f = e.target;
        const payload = {
            address: f.address.value,
            phone_primary: f.phone_primary.value,
            whatsapp: f.whatsapp.value,
            email: f.email.value,
        };
        try {
            await api.updateMyProfile(payload, photoFile);
            toast('Profil mis à jour');
            renderProfile();
        } catch (ex) { toast(ex.message); }
    });

    document.getElementById('cns-pw-form')?.addEventListener('submit', async e => {
        e.preventDefault();
        const f = e.target;
        if (f.new.value !== f.confirm.value) { toast('Les mots de passe ne correspondent pas'); return; }
        try {
            await api.changePassword(f.old.value, f.new.value);
            toast('Mot de passe modifié');
            f.reset();
        } catch (ex) { toast(ex.message); }
    });
}
