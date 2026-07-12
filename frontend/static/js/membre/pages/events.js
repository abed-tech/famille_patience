import { renderShell } from '../core/layout.js';
import { api, refreshAgentStatus, hasAgentAccess } from '../core/api.js';
import { formatDate, formatTime, presenceBadge } from '../core/components.js';
import { icons } from '../../shared/icons.js';

function formatScannedAt(iso) {
    if (!iso) return '—';
    try {
        return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    } catch {
        return '—';
    }
}

function eventPath(ev) {
    const id = ev.event_id || ev.id;
    return id ? `/evenements/${id}` : null;
}

function statusBadge(status) {
    if (status === 'open') {
        return '<span class="mb-agent-ev-badge mb-agent-ev-open">Ouvert</span>';
    }
    if (status === 'closed') {
        return '<span class="mb-agent-ev-badge mb-agent-ev-closed">Clôturé</span>';
    }
    return '';
}

function agentBadge() {
    return '<span class="mb-agent-ev-badge" style="background:#eff6ff;color:#2563eb">Agent</span>';
}

function eventRow(ev, { showPresence = true, showAgentBadge = false } = {}) {
    const path = eventPath(ev);
    const badges = [
        showAgentBadge && ev.is_agent ? agentBadge() : '',
        showPresence ? presenceBadge(ev.attendance) : '',
    ].filter(Boolean).join('');

    const inner = `
        <div class="mb-list-item-top">
            <strong>${ev.name}</strong>
            ${badges ? `<div style="display:flex;gap:4px;flex-wrap:wrap;justify-content:flex-end">${badges}</div>` : ''}
        </div>
        <span class="mb-list-item-meta">
            ${icons.calendar} ${formatDate(ev.date)}${ev.time ? ' · ' + formatTime(ev.time) : ''}
            ${ev.location ? ` · ${icons.mapPin} ${ev.location}` : ''}
        </span>`;

    if (!path) {
        return `<div class="mb-list-item mb-list-item-col mb-list-item-link">${inner}</div>`;
    }
    return `
        <a class="mb-list-item mb-list-item-link mb-list-item-col fp-card-interactive"
           href="/membre${path}" data-go="${path}">
            ${inner}
            <span class="mb-list-item-chevron" aria-hidden="true">${icons.chevron}</span>
        </a>`;
}

function renderParticipationList(items, empty, opts = {}) {
    return items.length
        ? items.map(ev => eventRow(ev, opts)).join('')
        : `<div class="mb-empty"><p>${empty}</p></div>`;
}

function mergeAgentEvents(data, agentOpen, agentClosed) {
    const all = [...(data.upcoming || []), ...(data.participated || []), ...(data.past || [])];
    const known = new Set(all.map(ev => ev.id));

    const normalize = (ev, isAgent) => ({
        id: ev.event_id || ev.id,
        event_id: ev.event_id || ev.id,
        name: ev.name,
        date: ev.date,
        time: ev.time,
        location: ev.location,
        status: ev.status,
        attendance: ev.attendance ?? null,
        is_agent: isAgent,
        present_count: ev.present_count,
        expected_count: ev.expected_count,
    });

    agentOpen.forEach(ev => {
        const id = ev.event_id || ev.id;
        if (!known.has(id)) {
            data.upcoming.unshift(normalize(ev, true));
            known.add(id);
        }
    });
    agentClosed.forEach(ev => {
        const id = ev.event_id || ev.id;
        if (!known.has(id)) {
            data.past.unshift(normalize(ev, true));
            known.add(id);
        }
    });

    const agentIds = new Set([
        ...agentOpen.map(e => e.event_id || e.id),
        ...agentClosed.map(e => e.event_id || e.id),
    ]);
    [...(data.upcoming || []), ...(data.participated || []), ...(data.past || [])].forEach(ev => {
        if (agentIds.has(ev.id)) ev.is_agent = true;
    });
}

function renderEventsView(data) {
    return `
        <div class="mb-stat-row">
            <div class="mb-stat"><div class="mb-stat-value">${data.stats?.attendance_rate ?? 0}%</div><div class="mb-stat-label">Taux présence</div></div>
            <div class="mb-stat"><div class="mb-stat-value">${data.stats?.total_participated ?? 0}</div><div class="mb-stat-label">Participations</div></div>
        </div>
        <p class="mb-section-title">À venir</p>
        <div class="mb-card">${renderParticipationList(data.upcoming || [], 'Aucun événement à venir', { showAgentBadge: true })}</div>
        <p class="mb-section-title">Mes participations</p>
        <div class="mb-card">${renderParticipationList(data.participated || [], 'Aucune participation', { showAgentBadge: true })}</div>
        <p class="mb-section-title">Événements passés</p>
        <div class="mb-card">${renderParticipationList(data.past || [], 'Aucun événement passé', { showAgentBadge: true })}</div>`;
}

export async function renderEvents(router) {
    if (!api.token) { router.navigate('/connexion'); return; }

    await refreshAgentStatus();

    let data;
    try {
        data = (await api.getMyEvents()).data;
        if (hasAgentAccess()) {
            const assigned = (await api.getAgentAssignedEvents()).data || {};
            mergeAgentEvents(data, assigned.open || [], assigned.closed || []);
        }
    } catch {
        router.navigate('/connexion');
        return;
    }

    renderShell('events', renderEventsView(data), {
        router,
        title: 'Mes événements',
        subtitle: `${data?.stats?.total_events ?? 0} événement(s)`,
    });
}

function eventInfoBlock(ev) {
    return `
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:8px">
            <h2 style="font-size:16px;font-weight:700;margin:0">${ev.name}</h2>
            ${statusBadge(ev.status)}
        </div>
        <p style="font-size:13px;color:var(--mb-text-muted);line-height:1.5;margin-bottom:8px">
            ${icons.calendar} ${formatDate(ev.date)}${ev.time ? ` · ${formatTime(ev.time)}` : ''}<br>
            ${ev.location ? `${icons.mapPin} ${ev.location}<br>` : ''}
        </p>
        ${ev.description ? `<p style="font-size:13px;line-height:1.55;margin:0;color:var(--mb-text)">${ev.description}</p>` : ''}`;
}

function attendancesBlock(attendances) {
    if (!attendances?.length) {
        return '<p class="mb-empty" style="padding:12px 0">Aucune présence enregistrée</p>';
    }
    return attendances.map(a => `
        <div class="ptg-history-item">
            <div>
                <strong>${a.member_name || 'Membre'}</strong>
                ${a.member_number ? `<div style="font-size:11px;color:var(--ptg-text-muted)">${a.member_number}</div>` : ''}
            </div>
            <span class="ptg-history-time">${formatScannedAt(a.scanned_at)}</span>
        </div>`).join('');
}

let detailPollTimer = null;

function stopDetailPolling() {
    if (detailPollTimer) {
        clearInterval(detailPollTimer);
        detailPollTimer = null;
    }
}

async function refreshEventDetailStats(eventId) {
    const detail = (await api.getMyEventDetail(eventId)).data;
    const stats = document.querySelector('.mb-pointage-stats');
    if (stats && detail.present_count != null) {
        stats.innerHTML = `
            <div class="mb-pointage-stat">
                <span class="mb-pointage-stat-val">${detail.present_count}</span>
                <span class="mb-pointage-stat-lbl">Présents</span>
            </div>
            <div class="mb-pointage-stat">
                <span class="mb-pointage-stat-val">${detail.expected_count}</span>
                <span class="mb-pointage-stat-lbl">Attendus</span>
            </div>`;
    }
    const list = document.getElementById('ev-attendance-list');
    if (list && detail.attendances) {
        list.innerHTML = attendancesBlock(detail.attendances);
    }
}

export async function renderEventDetail(router, eventId) {
    if (!api.token) { router.navigate('/connexion'); return; }

    stopDetailPolling();
    await refreshAgentStatus();

    let detail;
    try {
        detail = (await api.getMyEventDetail(eventId)).data;
    } catch {
        router.navigate('/evenements');
        return;
    }

    const ev = detail.event || {};
    const att = detail.attendance;
    const isPast = ev.status === 'closed';
    const canRecord = detail.can_record_attendance;
    const showAgentStats = detail.is_agent;

    const content = `
        <div class="mb-event-detail fp-stagger">
            <div class="fp-card ${canRecord ? 'mb-agent-ev-card-live' : ''}" style="padding:16px;margin-bottom:12px">
                ${eventInfoBlock(ev)}
            </div>

            ${showAgentStats ? `
                <div class="mb-pointage-stats" style="margin-bottom:16px">
                    <div class="mb-pointage-stat">
                        <span class="mb-pointage-stat-val">${detail.present_count ?? 0}</span>
                        <span class="mb-pointage-stat-lbl">Présents</span>
                    </div>
                    <div class="mb-pointage-stat">
                        <span class="mb-pointage-stat-val">${detail.expected_count ?? 0}</span>
                        <span class="mb-pointage-stat-lbl">Attendus</span>
                    </div>
                </div>` : ''}

            ${canRecord ? `
                <button type="button" class="fp-btn fp-btn-primary fp-btn-block" id="btn-record-attendance">
                    ${icons.scan} Enregistrer les présences
                </button>
                <p style="font-size:12px;color:var(--mb-text-muted);text-align:center;margin-top:10px">
                    Scanner un QR Code ou saisir l'ID du membre manuellement.
                </p>` : ''}

            <div class="fp-card fp-card-body" style="margin-top:16px">
                <h3 class="fp-card-title" style="margin-bottom:12px">Ma présence</h3>
                <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
                    ${att?.is_present
                        ? `<p style="font-size:14px;margin:0;color:#047857">Présent(e) — enregistré à ${formatScannedAt(att.scanned_at)}</p>`
                        : `<p style="font-size:14px;margin:0;color:var(--mb-text-muted)">${isPast ? 'Absent(e) ou non enregistré(e)' : 'En attente de pointage'}</p>`}
                    ${presenceBadge(att)}
                </div>
            </div>

            ${showAgentStats ? `
                <div class="fp-card fp-card-body" style="margin-top:16px">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
                        <h3 class="fp-card-title">Présences enregistrées</h3>
                        ${canRecord ? '<span class="mb-pointage-live"><span class="mb-live-dot"></span> Temps réel</span>' : ''}
                    </div>
                    <div id="ev-attendance-list">${attendancesBlock(detail.attendances)}</div>
                </div>` : ''}

            ${showAgentStats && isPast && !canRecord ? `
                <div class="fp-card" style="padding:14px;margin-top:12px;background:#f8fafc">
                    <p style="font-size:13px;color:var(--mb-text-muted);margin:0">
                        Événement clôturé — consultation seule.
                    </p>
                </div>` : ''}
        </div>`;

    renderShell('event-detail', content, {
        router,
        title: ev.name || 'Événement',
        subtitle: canRecord ? 'Pointage actif' : (isPast ? 'Événement passé' : 'Consultation'),
        back: true,
        onBack: () => router.navigate('/evenements'),
    });

    document.getElementById('btn-record-attendance')?.addEventListener('click', () => {
        localStorage.setItem('mb_pointage_event', eventId);
        localStorage.setItem('mb_pointage_return', `/evenements/${eventId}`);
        router.navigate('/pointage');
    });

    if (canRecord && showAgentStats) {
        detailPollTimer = setInterval(() => {
            refreshEventDetailStats(eventId).catch(() => {});
        }, 5000);
    }
}

export { stopDetailPolling };
