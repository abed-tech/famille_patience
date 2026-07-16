import { renderShell } from '../core/layout.js';
import { api } from '../core/api.js';
import { statCard, createChart, destroyCharts, formatDateTime, toast } from '../core/components.js';
import { icons } from '../core/icons.js';

let dashboardScanInterval = null;

export function stopDashboardScanPolling() {
    if (dashboardScanInterval) {
        clearInterval(dashboardScanInterval);
        dashboardScanInterval = null;
    }
}

function renderScansTable(scans) {
    return (scans || []).map(s => `
        <tr>
            <td>${s.member_name}</td>
            <td>${s.event_name}</td>
            <td>${s.agent_name || '—'}</td>
            <td>${formatDateTime(s.scanned_at)}</td>
        </tr>`).join('')
        || '<tr><td colspan="4" style="text-align:center;color:var(--adm-text-muted)">Aucun scan</td></tr>';
}

export async function renderDashboard() {
    stopDashboardScanPolling();
    if (!api.token) return;
    let data;
    try {
        data = (await api.getDashboard()).data;
    } catch (e) {
        toast(e.message || 'Impossible de charger le tableau de bord');
        return;
    }

    const s = data.stats || {};
    const statsHtml = `
        <div class="adm-stats-grid">
            ${statCard({ label: 'Total membres', value: s.total_members?.value, change: s.total_members?.change, icon: 'users', link: '/membres' })}
            ${statCard({ label: 'Nouveaux (30j)', value: s.new_members?.value, change: s.new_members?.change, icon: 'plus', accent: '#10b981', bg: '#ecfdf5', link: '/membres' })}
            ${statCard({ label: 'Membres actifs', value: s.active_members?.value, icon: 'check', accent: '#3b82f6', bg: '#eff6ff' })}
            ${statCard({ label: 'Suspendus', value: s.suspended_members?.value, icon: 'x', accent: '#f59e0b', bg: '#fffbeb' })}
            ${statCard({ label: 'Référents', value: s.referrers?.value, icon: 'userCheck', link: '/referents' })}
            ${statCard({ label: 'Conseillers', value: s.counsellors?.value, icon: 'userCog', link: '/conseillers' })}
            ${statCard({ label: 'Événements', value: s.total_events?.value, icon: 'calendar', link: '/evenements' })}
            ${statCard({ label: 'Événements actifs', value: s.open_events?.value, icon: 'calendar', accent: '#10b981', bg: '#ecfdf5' })}
            ${statCard({ label: 'Présences du jour', value: s.attendances_today?.value, icon: 'scan', accent: '#10b981', bg: '#ecfdf5' })}
            ${statCard({ label: 'Absences du jour', value: s.absences_today?.value, icon: 'x', accent: '#ef4444', bg: '#fef2f2' })}
            ${statCard({ label: 'Taux de présence', value: (s.attendance_rate?.value ?? 0) + '%', icon: 'chart' })}
            ${statCard({ label: 'Notifications', value: s.unread_notifications?.value, icon: 'bell', link: '/notifications' })}
        </div>`;

    const charts = data.charts || {};
    const chartsHtml = `
        <div class="adm-charts-grid">
            <div class="adm-chart-card"><h3>Évolution des inscriptions</h3><div class="adm-chart-wrap"><canvas id="chart-reg"></canvas></div></div>
            <div class="adm-chart-card"><h3>Présences (14 jours)</h3><div class="adm-chart-wrap"><canvas id="chart-att"></canvas></div></div>
            <div class="adm-chart-card"><h3>Répartition Homme / Femme</h3><div class="adm-chart-wrap"><canvas id="chart-gender"></canvas></div></div>
            <div class="adm-chart-card"><h3>Répartition par âge</h3><div class="adm-chart-wrap"><canvas id="chart-age"></canvas></div></div>
            <div class="adm-chart-card"><h3>Par pôle famille</h3><div class="adm-chart-wrap"><canvas id="chart-poles"></canvas></div></div>
            <div class="adm-chart-card"><h3>Par département</h3><div class="adm-chart-wrap"><canvas id="chart-dept"></canvas></div></div>
        </div>`;

    const activityHtml = (data.activity || []).map(a => `
        <div class="adm-timeline-item">
            <div class="adm-timeline-dot">${icons.activity}</div>
            <div class="adm-timeline-content">
                <div class="adm-timeline-title">${a.title}</div>
                <div class="adm-timeline-desc">${a.description}</div>
                <div class="adm-timeline-time">${formatDateTime(a.datetime)}</div>
            </div>
        </div>`).join('');

    renderShell('dashboard', `
        ${statsHtml}
        ${chartsHtml}
        <div class="adm-grid-2">
            <div class="adm-card">
                <div class="adm-card-header"><span class="adm-card-title">Activité récente</span></div>
                <div class="adm-card-body"><div class="adm-timeline">${activityHtml || '<p class="adm-empty">Aucune activité</p>'}</div></div>
            </div>
            <div class="adm-card">
                <div class="adm-card-header"><span class="adm-card-title">Derniers pointages</span><span class="adm-live-dot"></span></div>
                <div class="adm-card-body adm-table-wrap">
                    <table class="adm-table">
                        <thead><tr><th>Membre</th><th>Événement</th><th>Agent</th><th>Date & heure</th></tr></thead>
                        <tbody id="dashboard-scans-body">${renderScansTable(data.recent_scans)}</tbody>
                    </table>
                </div>
            </div>
        </div>`, { unread: s.unread_notifications?.value > 0 });

    document.querySelectorAll('[data-link]').forEach(el => {
        el.addEventListener('click', () => import('../app.js').then(m => m.router.navigate(el.dataset.link)));
    });

    destroyCharts();
    const c = charts;
    createChart('chart-reg', 'line', c.registrations?.map(x => x.label), c.registrations?.map(x => x.value));
    createChart('chart-att', 'bar', c.attendances?.map(x => x.label), c.attendances?.map(x => x.value), '#10b981');
    createChart('chart-gender', 'doughnut', c.gender?.map(x => x.label), c.gender?.map(x => x.value));
    createChart('chart-age', 'bar', c.age?.map(x => x.label), c.age?.map(x => x.value), '#8b5cf6');
    createChart('chart-poles', 'bar', c.poles?.map(x => x.label), c.poles?.map(x => x.value), '#f59e0b');
    createChart('chart-dept', 'bar', c.departments?.map(x => x.label), c.departments?.map(x => x.value), '#3b82f6');

    async function refreshScans() {
        try {
            const live = (await api.getLivePointage()).data;
            const body = document.getElementById('dashboard-scans-body');
            if (body && live?.recent_scans) {
                body.innerHTML = renderScansTable(live.recent_scans);
            }
        } catch { /* polling silencieux */ }
    }

    dashboardScanInterval = setInterval(refreshScans, 3000);
}
