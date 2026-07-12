import { renderShell, renderBarChart } from '../core/layout.js';
import { api, isReferrer, isCounsellor } from '../core/api.js';
import { formatDate } from '../core/components.js';

export async function renderStaffDashboard(router) {
    if (!api.token) { router.navigate('/connexion'); return; }

    let data, title, subtitle;
    if (isCounsellor()) {
        data = (await api.getCounsellorDashboard()).data;
        title = 'Espace conseiller';
        subtitle = `${data.stats?.total_referrers ?? 0} référent(s)`;
    } else if (isReferrer()) {
        data = (await api.getReferrerDashboard()).data;
        title = 'Espace référent';
        subtitle = `${data.stats?.total_members ?? 0} membre(s) suivis`;
    } else {
        router.navigate('/accueil');
        return;
    }

    const s = data.stats || {};
    let content = `
        <div class="mb-stat-row" style="grid-template-columns:1fr 1fr">
            ${isReferrer() ? `
                <div class="mb-stat"><div class="mb-stat-value">${s.total_members ?? 0}</div><div class="mb-stat-label">Membres suivis</div></div>
                <div class="mb-stat"><div class="mb-stat-value">${s.avg_attendance_rate ?? 0}%</div><div class="mb-stat-label">Présence moy.</div></div>
                <div class="mb-stat"><div class="mb-stat-value" style="color:#10b981">${s.present_last_event ?? 0}</div><div class="mb-stat-label">Présents (dernier evt.)</div></div>
                <div class="mb-stat"><div class="mb-stat-value" style="color:#f59e0b">${s.absent_last_event ?? 0}</div><div class="mb-stat-label">Absents</div></div>
            ` : `
                <div class="mb-stat"><div class="mb-stat-value">${s.total_members ?? 0}</div><div class="mb-stat-label">Membres supervisés</div></div>
                <div class="mb-stat"><div class="mb-stat-value">${s.total_referrers ?? 0}</div><div class="mb-stat-label">Référents</div></div>
                <div class="mb-stat"><div class="mb-stat-value">${s.avg_attendance_rate ?? 0}%</div><div class="mb-stat-label">Présence moy.</div></div>
            `}
        </div>`;

    if (isReferrer() && data.charts?.attendance?.length) {
        content += `<div class="mb-card"><p class="mb-section-title" style="margin-top:0">Taux de présence par membre</p>${renderBarChart(data.charts.attendance)}</div>`;
    }

    if (isReferrer()) {
        content += `
            <p class="mb-section-title">Dernières inscriptions</p>
            <div class="mb-card">${(data.recent_registrations || []).map(m => memberRow(m, router)).join('') || '<p class="mb-empty">Aucune inscription récente</p>'}</div>
            <p class="mb-section-title">Activité récente</p>
            <div class="mb-card">${(data.recent_activity || []).map(a => `
                <div class="mb-list-item" style="flex-direction:column;align-items:flex-start;gap:4px">
                    <span style="font-size:13px">${a.description}</span>
                    <span style="font-size:11px;color:var(--mb-text-muted)">${a.member_name} · ${formatDate(a.datetime)}</span>
                </div>`).join('') || '<p class="mb-empty">Aucune activité</p>'}</div>`;
    } else {
        content += `
            <p class="mb-section-title">Mes référents</p>
            <div class="mb-card">${(data.referrers || []).map(r => `
                <a class="mb-dash-card" href="/membre/mes-referents/${r.id}" data-link style="margin-bottom:8px">
                    <div class="mb-dash-card-icon" style="background:#fdf2f8">👤</div>
                    <div class="mb-dash-card-body">
                        <h3>${r.full_name}</h3>
                        <p>${r.members_count} membre(s) · ${r.avg_attendance_rate}% présence</p>
                    </div>
                </a>`).join('') || '<p class="mb-empty">Aucun référent assigné</p>'}</div>`;
    }

    renderShell('staff-dash', content, { router, title, subtitle });
    bindStaffLinks(router);
}

function memberRow(m, router) {
    return `
        <a class="mb-dash-card" href="/membre/mes-membres/${m.id}" data-link style="margin-bottom:8px">
            <div class="mb-dash-card-icon" style="background:#fdf2f8">${m.photo ? `<img src="${m.photo}" style="width:100%;height:100%;border-radius:14px;object-fit:cover">` : '👤'}</div>
            <div class="mb-dash-card-body">
                <h3>${m.full_name}</h3>
                <p>${m.member_number} · ${m.attendance_rate}% présence</p>
            </div>
        </a>`;
}

export function bindStaffLinks(router, backPath) {
    document.querySelectorAll('[data-link]').forEach(el => {
        el.addEventListener('click', e => {
            e.preventDefault();
            const href = el.getAttribute('href').replace('/membre', '');
            if (backPath && href.match(/^\/mes-membres\//)) {
                sessionStorage.setItem('mb_member_back', backPath);
            }
            router.navigate(href);
        });
    });
}
