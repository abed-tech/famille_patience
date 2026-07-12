import { renderShell } from '../core/layout.js';
import { api, extractList, isReferrer, isCounsellor } from '../core/api.js';
import { avatarHtml } from '../core/components.js';
import { bindStaffLinks } from './staff-dashboard.js';

export async function renderMyMembers(router) {
    if (!api.token || !isReferrer()) { router.navigate('/accueil'); return; }

    let members = [];
    try {
        members = extractList(await api.getStaffMembers());
    } catch { /* */ }

    const content = `
        <div class="mb-form-group">
            <input class="mb-input" id="search-members" placeholder="Rechercher un membre...">
        </div>
        <div class="mb-filters" style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap">
            <button class="mb-btn mb-btn-secondary adm-filter active" data-filter="all" style="font-size:12px;padding:6px 12px;min-height:auto">Tous</button>
            <button class="mb-btn mb-btn-secondary" data-filter="active" style="font-size:12px;padding:6px 12px;min-height:auto">Actifs</button>
            <button class="mb-btn mb-btn-secondary" data-filter="suspended" style="font-size:12px;padding:6px 12px;min-height:auto">Suspendus</button>
        </div>
        <div id="members-list">
            ${members.map(m => memberCard(m)).join('') || '<div class="mb-empty"><p>Aucun membre assigné</p></div>'}
        </div>`;

    renderShell('my-members', content, { router, title: 'Mes membres', subtitle: `${members.length} membre(s)` });

    document.getElementById('search-members')?.addEventListener('input', e => filterMembers(members, e.target.value));
    document.querySelectorAll('[data-filter]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('[data-filter]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const status = btn.dataset.filter;
            document.querySelectorAll('[data-member]').forEach(el => {
                el.style.display = status === 'all' || el.dataset.status === status ? '' : 'none';
            });
        });
    });
    bindStaffLinks(router, '/mes-membres');
}

function memberCard(m) {
    const statusLabel = { active: 'Actif', suspended: 'Suspendu', inactive: 'Inactif' }[m.status] || m.status;
  const statusClass = m.status === 'active' ? 'mb-badge-success' : 'mb-badge-warning';
    return `
        <a class="mb-dash-card" href="/membre/mes-membres/${m.id}" data-link data-member data-status="${m.status}">
            ${avatarHtml(m.full_name, m.photo, 48)}
            <div class="mb-dash-card-body">
                <h3>${m.full_name}</h3>
                <p>${m.member_number} · ${m.attendance_rate ?? 0}% présence</p>
            </div>
            <span class="mb-badge ${statusClass}">${statusLabel}</span>
        </a>`;
}

function filterMembers(members, q) {
    const lq = q.toLowerCase();
    document.querySelectorAll('[data-member]').forEach(el => {
        el.style.display = el.textContent.toLowerCase().includes(lq) ? '' : 'none';
    });
}

export async function renderStaffMember(router, id) {
    if (!api.token || (!isReferrer() && !isCounsellor())) { router.navigate('/accueil'); return; }

    let m, card;
    try {
        m = (await api.getStaffMember(id)).data;
        card = (await api.getStaffMemberCard(id)).data;
    } catch {
        router.navigate(isReferrer() ? '/mes-membres' : '/mes-referents');
        return;
    }

    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(m.qr_code)}`;

    const content = `
        <div style="text-align:center;margin-bottom:16px">
            ${m.photo ? `<img src="${m.photo}" style="width:88px;height:88px;border-radius:50%;object-fit:cover">` : avatarHtml(m.full_name, null, 88)}
            <h2 style="font-size:18px;font-weight:700;margin:12px 0 4px">${m.full_name}</h2>
            <p style="font-size:12px;color:var(--mb-text-muted)">${m.member_number}</p>
            <p style="font-size:13px;color:var(--mb-primary);font-weight:600;margin-top:8px">${m.attendance_rate}% de présence</p>
        </div>
        <div class="mb-card">
            <div class="mb-list-item"><span class="mb-label">Naissance</span><span>${m.birth_day_month || '—'} <small style="color:var(--mb-text-muted)">(jour/mois)</small></span></div>
            <div class="mb-list-item"><span class="mb-label">Sexe</span><span>${m.gender === 'F' ? 'Féminin' : 'Masculin'}</span></div>
            <div class="mb-list-item"><span class="mb-label">Adresse</span><span>${m.address || '—'}</span></div>
            <div class="mb-list-item"><span class="mb-label">Profession</span><span>${m.profession || '—'}</span></div>
            <div class="mb-list-item"><span class="mb-label">Situation</span><span>${m.marital_status || '—'}</span></div>
            <div class="mb-list-item"><span class="mb-label">Téléphone</span><span>${m.phone_primary || '—'}</span></div>
            <div class="mb-list-item"><span class="mb-label">WhatsApp</span><span>${m.whatsapp || '—'}</span></div>
            <div class="mb-list-item"><span class="mb-label">E-mail</span><span>${m.email || '—'}</span></div>
            <div class="mb-list-item"><span class="mb-label">Baptisé(e)</span><span>${m.is_baptized ? 'Oui' : 'Non'}</span></div>
            <div class="mb-list-item"><span class="mb-label">Pôle</span><span>${m.family_pole_detail?.name || '—'}</span></div>
            <div class="mb-list-item"><span class="mb-label">Département</span><span>${m.church_department_detail?.name || '—'}</span></div>
        </div>
        <p class="mb-section-title">Présences</p>
        <div class="mb-card">${(m.attendances || []).map(a => `
            <div class="mb-list-item"><span>${a.event_name}</span><span class="mb-badge mb-badge-success">${formatShort(a.event_date)}</span></div>
        `).join('') || '<p class="mb-empty">Aucune présence</p>'}</div>
        <p class="mb-section-title">Absences</p>
        <div class="mb-card">${(m.absences || []).map(a => `
            <div class="mb-list-item"><span>${a.event_name}</span><span class="mb-badge mb-badge-warning">${formatShort(a.event_date)}</span></div>
        `).join('') || '<p class="mb-empty">Aucune absence</p>'}</div>
        <p class="mb-section-title">Carte & QR Code <small style="font-weight:400;color:var(--mb-text-muted)">(lecture seule)</small></p>
        <div class="mb-card" style="text-align:center">
            <img src="${qrUrl}" alt="QR" width="140" height="140" style="border-radius:12px;margin:0 auto">
            <p style="font-family:monospace;font-size:11px;color:var(--mb-text-muted);margin-top:12px">${m.qr_code}</p>
        </div>`;

    const backPath = sessionStorage.getItem('mb_member_back') || (isReferrer() ? '/mes-membres' : '/mes-referents');
    sessionStorage.removeItem('mb_member_back');

    renderShell('member-detail', content, {
        router,
        title: m.full_name,
        subtitle: 'Membre',
        back: true,
        onBack: () => router.navigate(backPath),
    });
}

function formatShort(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}
