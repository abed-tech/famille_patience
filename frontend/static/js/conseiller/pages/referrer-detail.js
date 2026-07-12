import { renderShell } from '../core/layout.js';
import { api } from '../core/api.js';
import { avatarEl, statCard, filterBar, statusBadge, toast } from '../core/components.js';
import { icons } from '../core/icons.js';

let membersCache = [];
let referrerId = null;

export async function renderReferrerDetail(id) {
    referrerId = id;
    let data;
    try {
        data = (await api.getReferrer(id)).data;
    } catch (e) {
        toast(e.message || 'Référent introuvable');
        import('../app.js').then(m => m.router.navigate('/referents'));
        return;
    }

    const r = data.referrer;
    membersCache = data.members || [];

    const qrHtml = r.qr_code
        ? `<img src="${r.qr_code}" alt="QR Code" class="cns-qr-img">`
        : `<div class="cns-qr-placeholder">${icons.qr}<span>QR non disponible</span></div>`;

    renderShell('referrer-detail', `
        <div class="cns-profile-hero">
            ${avatarEl(r.full_name, r.photo, 'xl')}
            <div>
                <h2>${r.full_name}</h2>
                ${r.phone ? `<p class="cns-meta">${icons.phone} ${r.phone}</p>` : ''}
            </div>
        </div>
        <div class="cns-stats-grid cns-mt">
            ${statCard({ label: 'Membres suivis', value: r.members_count, icon: 'users' })}
            ${statCard({ label: 'Taux de présence', value: r.avg_attendance_rate, suffix: '%', icon: 'chart', accent: '#10b981', bg: '#ecfdf5' })}
            ${statCard({ label: 'Événements suivis', value: r.events_count, icon: 'calendar' })}
        </div>
        <div class="cns-grid-2 cns-mt">
            <div class="cns-card">
                <div class="cns-card-header"><h3>QR Code</h3></div>
                <div class="cns-card-body cns-qr-wrap">${qrHtml}</div>
            </div>
            <div class="cns-card">
                <div class="cns-card-header"><h3>Actions</h3></div>
                <div class="cns-card-body">
                    <button class="cns-btn cns-btn-primary cns-btn-block" id="view-members-btn">Voir les membres</button>
                </div>
            </div>
        </div>
        <div id="members-section" class="cns-mt hidden">
            ${filterBar({
                searchId: 'mem-search',
                sortId: 'mem-sort',
                sortOptions: [
                    { value: 'name', label: 'Nom (A→Z)' },
                    { value: 'rate', label: 'Taux de présence (↓)' },
                    { value: 'status', label: 'Statut' },
                ],
            })}
            <div class="cns-table-wrap cns-mt">
                <table class="cns-table" id="mem-table">
                    <thead><tr><th>Membre</th><th>N°</th><th>Présence</th><th>Statut</th></tr></thead>
                    <tbody></tbody>
                </table>
            </div>
        </div>`,
        {
            back: true,
            title: r.full_name,
            subtitle: 'Profil référent',
            onBack: () => import('../app.js').then(m => m.router.navigate('/referents')),
        });

    document.getElementById('view-members-btn')?.addEventListener('click', () => {
        document.getElementById('members-section')?.classList.remove('hidden');
        renderMembersTable(membersCache);
        document.getElementById('members-section')?.scrollIntoView({ behavior: 'smooth' });
    });

    bindMemberFilters();
}

function renderMembersTable(list) {
    const tbody = document.querySelector('#mem-table tbody');
    if (!tbody) return;
    tbody.innerHTML = list.length ? list.map(m => `
        <tr class="cns-clickable" data-mid="${m.id}">
            <td><div class="cns-cell-user">${avatarEl(m.full_name, m.photo, 'sm')}<span>${m.full_name}</span></div></td>
            <td>${m.member_number || '—'}</td>
            <td><span class="cns-rate-pill">${m.attendance_rate}%</span></td>
            <td>${statusBadge(m.status)}</td>
        </tr>`).join('') : '<tr><td colspan="4" class="cns-empty">Aucun membre</td></tr>';

    tbody.querySelectorAll('[data-mid]').forEach(row => {
        row.addEventListener('click', () => import('../app.js').then(m => m.router.navigate(`/membres/${row.dataset.mid}`)));
    });
}

function bindMemberFilters() {
    const search = document.getElementById('mem-search');
    const sort = document.getElementById('mem-sort');
    const apply = () => {
        let list = [...membersCache];
        const q = (search?.value || '').toLowerCase().trim();
        if (q) list = list.filter(m =>
            m.full_name.toLowerCase().includes(q) ||
            (m.member_number || '').toLowerCase().includes(q)
        );
        const s = sort?.value || 'name';
        if (s === 'name') list.sort((a, b) => a.full_name.localeCompare(b.full_name));
        else if (s === 'rate') list.sort((a, b) => b.attendance_rate - a.attendance_rate);
        else if (s === 'status') list.sort((a, b) => (a.status || '').localeCompare(b.status || ''));
        renderMembersTable(list);
    };
    search?.addEventListener('input', apply);
    sort?.addEventListener('change', apply);
}
