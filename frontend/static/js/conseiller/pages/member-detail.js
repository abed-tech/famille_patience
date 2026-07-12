import { renderShell } from '../core/layout.js';
import { api } from '../core/api.js';
import { avatarEl, statusBadge, formatDate, formatDateTime, toast } from '../core/components.js';
import { icons } from '../core/icons.js';

export async function renderMemberDetail(id) {
    let member, card;
    try {
        member = (await api.getMember(id)).data;
        try { card = (await api.getMemberCard(id)).data; } catch { card = null; }
    } catch (e) {
        toast(e.message || 'Membre introuvable');
        history.back();
        return;
    }

    const genderMap = { M: 'Homme', F: 'Femme' };
    const maritalMap = {
        single: 'Célibataire', married: 'Marié(e)', divorced: 'Divorcé(e)', widowed: 'Veuf(ve)',
    };

    const attendances = (member.attendances || []).map(a => `
        <div class="cns-history-item cns-history-present">
            <strong>${a.event_name}</strong>
            <span>${formatDate(a.event_date)} · ${formatDateTime(a.scanned_at)}</span>
        </div>`).join('') || '<p class="cns-empty">Aucune présence enregistrée</p>';

    const absences = (member.absences || []).map(a => `
        <div class="cns-history-item cns-history-absent">
            <strong>${a.event_name}</strong>
            <span>${formatDate(a.event_date)}</span>
        </div>`).join('') || '<p class="cns-empty">Aucune absence enregistrée</p>';

    const cardHtml = card ? `
        <div class="cns-member-card">
            ${card.photo ? `<img src="${card.photo}" alt="" class="cns-member-card-photo">` : ''}
            <div class="cns-member-card-body">
                <div class="cns-member-card-name">${card.full_name}</div>
                <div class="cns-member-card-num">N° ${card.member_number}</div>
                ${card.family_pole ? `<div class="cns-member-card-pole">${card.family_pole}</div>` : ''}
                ${statusBadge(card.status)}
            </div>
            ${card.qr_code ? `<img src="${card.qr_code}" alt="QR" class="cns-member-card-qr">` : ''}
        </div>` : '';

    renderShell('member-detail', `
        <div class="cns-profile-hero">
            ${avatarEl(member.full_name, member.photo, 'xl')}
            <div>
                <h2>${member.full_name}</h2>
                <p class="cns-meta">N° ${member.member_number || '—'} · ${member.attendance_rate}% présence</p>
                ${statusBadge(member.status)}
            </div>
        </div>

        <div class="cns-grid-2 cns-mt">
            <div class="cns-card">
                <div class="cns-card-header"><h3>Informations personnelles</h3><span class="cns-readonly">Lecture seule</span></div>
                <div class="cns-card-body cns-info-grid">
                    <div><label>Postnom</label><span>${member.last_name || '—'}</span></div>
                    <div><label>Prénom</label><span>${member.first_name || '—'}</span></div>
                    <div><label>Sexe</label><span>${genderMap[member.gender] || member.gender || '—'}</span></div>
                    <div><label>Naissance</label><span>${member.birth_day_month || '—'}</span></div>
                    <div><label>Adresse</label><span>${member.address || '—'}</span></div>
                    <div><label>Profession</label><span>${member.profession || '—'}</span></div>
                    <div><label>Situation matrimoniale</label><span>${maritalMap[member.marital_status] || member.marital_status || '—'}</span></div>
                </div>
            </div>
            <div class="cns-card">
                <div class="cns-card-header"><h3>Contact & affectation</h3></div>
                <div class="cns-card-body cns-info-grid">
                    <div><label>Téléphone</label><span>${member.phone_primary || '—'}</span></div>
                    <div><label>WhatsApp</label><span>${member.whatsapp || member.phone_secondary || '—'}</span></div>
                    <div><label>E-mail</label><span>${member.email || '—'}</span></div>
                    <div><label>Pôle famille</label><span>${member.family_pole_detail?.name || '—'}</span></div>
                    <div><label>Département</label><span>${member.church_department_detail?.name || '—'}</span></div>
                </div>
            </div>
        </div>

        ${cardHtml ? `<div class="cns-card cns-mt"><div class="cns-card-header"><h3>Carte de membre</h3></div><div class="cns-card-body">${cardHtml}</div></div>` : ''}

        ${member.qr_code ? `
        <div class="cns-card cns-mt">
            <div class="cns-card-header"><h3>QR Code</h3></div>
            <div class="cns-card-body cns-qr-wrap"><img src="${member.qr_code}" alt="QR" class="cns-qr-img"></div>
        </div>` : ''}

        <div class="cns-grid-2 cns-mt">
            <div class="cns-card">
                <div class="cns-card-header"><h3>Historique des présences</h3></div>
                <div class="cns-card-body cns-history-list">${attendances}</div>
            </div>
            <div class="cns-card">
                <div class="cns-card-header"><h3>Historique des absences</h3></div>
                <div class="cns-card-body cns-history-list">${absences}</div>
            </div>
        </div>`,
        {
            back: true,
            title: member.full_name,
            subtitle: 'Profil membre',
            onBack: () => history.back(),
        });
}
