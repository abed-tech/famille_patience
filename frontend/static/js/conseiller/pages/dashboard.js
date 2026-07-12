import { renderShell } from '../core/layout.js';
import { api } from '../core/api.js';
import { statCard, createChart, destroyCharts, formatDate, toast } from '../core/components.js';

export async function renderDashboard() {
    let data;
    try {
        data = (await api.getDashboard()).data;
    } catch (e) {
        toast(e.message || 'Impossible de charger le tableau de bord');
        return;
    }

    const s = data.stats || {};
    const upcoming = data.upcoming_events || [];
    const upcomingCount = upcoming.length;

    const statsHtml = `
        <div class="cns-stats-grid">
            ${statCard({ label: 'Référents', value: s.total_referrers, icon: 'userCheck', link: '/referents' })}
            ${statCard({ label: 'Membres suivis', value: s.total_members, icon: 'users', link: '/referents' })}
            ${statCard({ label: 'Taux moyen de présence', value: s.avg_attendance_rate, suffix: '%', icon: 'chart', accent: '#10b981', bg: '#ecfdf5' })}
            ${statCard({ label: 'Événements actifs', value: s.open_events, icon: 'calendar', link: '/evenements' })}
            ${statCard({ label: 'Présents aujourd\'hui', value: s.present_today, icon: 'check', accent: '#10b981', bg: '#ecfdf5' })}
            ${statCard({ label: 'Absents aujourd\'hui', value: s.absent_today, icon: 'x', accent: '#ef4444', bg: '#fef2f2' })}
            ${statCard({ label: 'Prochains événements', value: upcomingCount, icon: 'calendar', accent: '#db2777', bg: '#fdf2f8', link: '/evenements' })}
        </div>`;

    const upcomingHtml = upcoming.length ? `
        <div class="cns-card cns-mt">
            <div class="cns-card-header"><h3>Prochains événements</h3></div>
            <div class="cns-card-body cns-event-list">
                ${upcoming.map(e => `
                    <div class="cns-event-row" data-event="${e.id}">
                        <div><strong>${e.name}</strong><span>${formatDate(e.date)}${e.time ? ' · ' + e.time : ''}</span></div>
                        <span class="cns-chevron">›</span>
                    </div>`).join('')}
            </div>
        </div>` : '';

    const charts = data.charts || {};
    const chartsHtml = `
        <div class="cns-charts-grid cns-mt">
            <div class="cns-chart-card">
                <div class="cns-chart-header"><h3>Évolution du taux de présence</h3></div>
                <div class="cns-chart-wrap"><canvas id="chart-evolution"></canvas></div>
            </div>
            <div class="cns-chart-card">
                <div class="cns-chart-header"><h3>Présences par événement</h3></div>
                <div class="cns-chart-wrap"><canvas id="chart-present"></canvas></div>
            </div>
            <div class="cns-chart-card">
                <div class="cns-chart-header"><h3>Absences par événement</h3></div>
                <div class="cns-chart-wrap"><canvas id="chart-absent"></canvas></div>
            </div>
            <div class="cns-chart-card">
                <div class="cns-chart-header"><h3>Membres par référent</h3></div>
                <div class="cns-chart-wrap"><canvas id="chart-members"></canvas></div>
            </div>
            <div class="cns-chart-card">
                <div class="cns-chart-header"><h3>Taux de présence par référent</h3></div>
                <div class="cns-chart-wrap"><canvas id="chart-att-ref"></canvas></div>
            </div>
        </div>`;

    renderShell('dashboard', statsHtml + upcomingHtml + chartsHtml);

    document.querySelectorAll('[data-link]').forEach(el => {
        el.style.cursor = 'pointer';
        el.addEventListener('click', () => import('../app.js').then(m => m.router.navigate(el.dataset.link)));
    });
    document.querySelectorAll('[data-event]').forEach(el => {
        el.addEventListener('click', () => import('../app.js').then(m => m.router.navigate(`/evenements/${el.dataset.event}`)));
    });

    destroyCharts();
    const c = charts;
    createChart('chart-evolution', 'line', c.attendance_evolution?.map(x => x.label), c.attendance_evolution?.map(x => x.value));
    createChart('chart-present', 'bar', c.present_by_event?.map(x => x.label), c.present_by_event?.map(x => x.value), '#10b981');
    createChart('chart-absent', 'bar', c.absent_by_event?.map(x => x.label), c.absent_by_event?.map(x => x.value), '#ef4444');
    createChart('chart-members', 'doughnut', c.members_by_referrer?.map(x => x.label), c.members_by_referrer?.map(x => x.value));
    createChart('chart-att-ref', 'bar', c.attendance_by_referrer?.map(x => x.label), c.attendance_by_referrer?.map(x => x.value), '#db2777');
}
