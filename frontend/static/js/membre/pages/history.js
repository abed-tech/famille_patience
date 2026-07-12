import { renderShell } from '../core/layout.js';
import { api, extractList } from '../core/api.js';
import { formatDate, formatDateTime } from '../core/components.js';

export async function renderHistory(router) {
    if (!api.token) { router.navigate('/connexion'); return; }
    let events, history, attendances;
    try {
        const [evRes, histRes, attRes] = await Promise.all([
            api.getMyEvents(),
            api.getMyHistory(),
            api.getMyAttendances(),
        ]);
        events = evRes.data;
        history = extractList(histRes);
        attendances = extractList(attRes);
    } catch {
        router.navigate('/connexion');
        return;
    }

    const presents = attendances.filter(a => a.is_present);
    const absents = attendances.filter(a => !a.is_present);

    const content = `
        <div class="mb-stat-row" style="grid-template-columns:1fr 1fr 1fr">
            <div class="mb-stat"><div class="mb-stat-value" style="font-size:18px">${events.stats?.attendance_rate ?? 0}%</div><div class="mb-stat-label">Présence</div></div>
            <div class="mb-stat"><div class="mb-stat-value" style="font-size:18px">${presents.length}</div><div class="mb-stat-label">Présences</div></div>
            <div class="mb-stat"><div class="mb-stat-value" style="font-size:18px">${events.stats?.total_events ?? 0}</div><div class="mb-stat-label">Événements</div></div>
        </div>
        <p class="mb-section-title">Présences</p>
        <div class="mb-card">
            ${presents.length ? presents.map(a => `
                <div class="mb-list-item">
                    <div><strong>${a.event_name}</strong><br><span style="font-size:11px;color:var(--mb-text-muted)">${formatDate(a.event_date)}</span></div>
                    <span class="mb-badge mb-badge-success">Présent</span>
                </div>`).join('') : '<div class="mb-empty"><p>Aucune présence</p></div>'}
        </div>
        <p class="mb-section-title">Absences</p>
        <div class="mb-card">
            ${absents.length ? absents.map(a => `
                <div class="mb-list-item">
                    <div><strong>${a.event_name}</strong><br><span style="font-size:11px;color:var(--mb-text-muted)">${formatDate(a.event_date)}</span></div>
                    <span class="mb-badge mb-badge-warning">Absent</span>
                </div>`).join('') : '<div class="mb-empty"><p>Aucune absence</p></div>'}
        </div>
        <p class="mb-section-title">Activité</p>
        <div class="mb-card">
            ${history.length ? history.map(h => `
                <div class="mb-list-item" style="flex-direction:column;align-items:flex-start;gap:4px">
                    <span>${h.description}</span>
                    <span style="font-size:11px;color:var(--mb-text-muted)">${formatDateTime(h.created_at)}</span>
                </div>`).join('') : '<div class="mb-empty"><p>Aucune activité</p></div>'}
        </div>
    `;

    renderShell('history', content, { router, title: 'Mon historique', subtitle: 'Présences & activité' });
}
