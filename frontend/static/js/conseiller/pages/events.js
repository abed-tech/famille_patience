import { renderShell } from '../core/layout.js';
import { api } from '../core/api.js';
import { formatDate, statusBadge, toast } from '../core/components.js';

let eventsCache = [];

export async function renderEvents() {
    try {
        eventsCache = (await api.getEvents()).data || [];
    } catch (e) {
        toast(e.message || 'Erreur de chargement');
        return;
    }
    renderEventsList(eventsCache);
}

function renderEventsList(list) {
    const rows = list.length ? list.map(e => `
        <div class="cns-event-card cns-fade-in" data-id="${e.id}">
            <div class="cns-event-card-main">
                <h3>${e.name}</h3>
                <p>${formatDate(e.date)}${e.time ? ' · ' + e.time : ''}${e.location ? ' · ' + e.location : ''}</p>
                ${statusBadge(e.status)}
            </div>
            <div class="cns-event-card-stats">
                <span class="cns-stat-pill cns-stat-present">${e.present_count} présents</span>
                <span class="cns-stat-pill cns-stat-absent">${e.absent_count} absents</span>
            </div>
            <span class="cns-chevron">›</span>
        </div>`).join('') : '<p class="cns-empty">Aucun événement</p>';

    renderShell('events', `
        <div class="cns-filter-bar">
            <input type="search" class="cns-input" id="evt-search" placeholder="Rechercher un événement…">
            <select class="cns-select" id="evt-filter">
                <option value="all">Tous</option>
                <option value="upcoming">À venir</option>
                <option value="open">Ouverts</option>
            </select>
        </div>
        <div class="cns-event-cards" id="evt-list">${rows}</div>`);

    bindEventFilters();
}

function bindEventFilters() {
    const search = document.getElementById('evt-search');
    const filter = document.getElementById('evt-filter');

    const apply = () => {
        let list = [...eventsCache];
        const q = (search?.value || '').toLowerCase().trim();
        if (q) list = list.filter(e => e.name.toLowerCase().includes(q));

        const f = filter?.value || 'all';
        if (f === 'upcoming') list = list.filter(e => e.is_upcoming);
        else if (f === 'open') list = list.filter(e => e.status === 'open');

        const container = document.getElementById('evt-list');
        if (!container) return;
        container.innerHTML = list.length ? list.map(e => `
            <div class="cns-event-card cns-fade-in" data-id="${e.id}">
                <div class="cns-event-card-main">
                    <h3>${e.name}</h3>
                    <p>${formatDate(e.date)}${e.time ? ' · ' + e.time : ''}</p>
                    ${statusBadge(e.status)}
                </div>
                <div class="cns-event-card-stats">
                    <span class="cns-stat-pill cns-stat-present">${e.present_count} présents</span>
                    <span class="cns-stat-pill cns-stat-absent">${e.absent_count} absents</span>
                </div>
                <span class="cns-chevron">›</span>
            </div>`).join('') : '<p class="cns-empty">Aucun résultat</p>';

        bindEventClicks(container);
    };

    search?.addEventListener('input', apply);
    filter?.addEventListener('change', apply);
    bindEventClicks(document.getElementById('evt-list'));
}

function bindEventClicks(container) {
    container?.querySelectorAll('[data-id]').forEach(el => {
        el.addEventListener('click', () => import('../app.js').then(m => m.router.navigate(`/evenements/${el.dataset.id}`)));
    });
}

export async function renderEventDetail(id) {
    let data;
    try {
        data = (await api.getEventAttendance(id)).data;
    } catch (e) {
        toast(e.message || 'Événement introuvable');
        import('../app.js').then(m => m.router.navigate('/evenements'));
        return;
    }

    const ev = data.event;
    const present = data.present || [];
    const absent = data.absent || [];

    const presentRows = present.length ? present.map(p => `
        <tr>
            <td><div class="cns-cell-user">${p.photo ? `<img src="${p.photo}" class="cns-avatar cns-avatar-sm">` : ''}<span>${p.full_name}</span></div></td>
            <td>${p.referrer_name}</td>
            <td>${new Date(p.scanned_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</td>
            <td><span class="cns-mode-pill cns-mode-${p.scan_mode === 'QR Code' ? 'qr' : 'manual'}">${p.scan_mode}</span></td>
        </tr>`).join('') : '<tr><td colspan="4" class="cns-empty">Aucun présent</td></tr>';

    const absentRows = absent.length ? absent.map(a => `
        <tr>
            <td><div class="cns-cell-user">${a.photo ? `<img src="${a.photo}" class="cns-avatar cns-avatar-sm">` : ''}<span>${a.full_name}</span></div></td>
            <td>${a.referrer_name}</td>
        </tr>`).join('') : '<tr><td colspan="2" class="cns-empty">Aucun absent</td></tr>';

    renderShell('event-detail', `
        <div class="cns-event-header">
            <h2>${ev.name}</h2>
            <p>${formatDate(ev.date)}${ev.time ? ' · ' + ev.time : ''}${ev.location ? ' · ' + ev.location : ''}</p>
            <div class="cns-event-summary">
                <span class="cns-stat-pill cns-stat-present">${data.stats.present_count} présents</span>
                <span class="cns-stat-pill cns-stat-absent">${data.stats.absent_count} absents</span>
                <span class="cns-stat-pill">${data.stats.total} membres</span>
            </div>
            ${ev.status === 'closed' ? `<button class="cns-btn cns-btn-secondary cns-mt" id="btn-full-report" style="margin-top:12px">Voir le rapport complet</button>` : ''}
        </div>

        <div class="cns-tabs">
            <button class="cns-tab active" data-tab="present">Présents (${present.length})</button>
            <button class="cns-tab" data-tab="absent">Absents (${absent.length})</button>
        </div>

        <div class="cns-tab-panel active" id="tab-present">
            <div class="cns-filter-bar cns-mt">
                <input type="search" class="cns-input" id="present-search" placeholder="Rechercher…">
            </div>
            <div class="cns-table-wrap cns-mt">
                <table class="cns-table" id="present-table">
                    <thead><tr><th>Membre</th><th>Référent</th><th>Heure</th><th>Mode</th></tr></thead>
                    <tbody>${presentRows}</tbody>
                </table>
            </div>
        </div>

        <div class="cns-tab-panel" id="tab-absent">
            <div class="cns-filter-bar cns-mt">
                <input type="search" class="cns-input" id="absent-search" placeholder="Rechercher…">
            </div>
            <div class="cns-table-wrap cns-mt">
                <table class="cns-table" id="absent-table">
                    <thead><tr><th>Membre</th><th>Référent responsable</th></tr></thead>
                    <tbody>${absentRows}</tbody>
                </table>
            </div>
        </div>`,
        {
            back: true,
            title: ev.name,
            subtitle: 'Présences & absences',
            onBack: () => import('../app.js').then(m => m.router.navigate('/evenements')),
        });

    document.querySelectorAll('.cns-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.cns-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.cns-tab-panel').forEach(p => p.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById(`tab-${tab.dataset.tab}`)?.classList.add('active');
        });
    });

    bindTableSearch('present-search', 'present-table');
    bindTableSearch('absent-search', 'absent-table');

    document.getElementById('btn-full-report')?.addEventListener('click', async () => {
        try {
            const report = (await api.getEventReport(id)).data;
            toast(`Rapport : ${report.summary.present_count} présents, ${report.summary.absent_count} absents (${report.summary.attendance_rate}%)`);
        } catch (e) { toast(e.message); }
    });
}

function bindTableSearch(inputId, tableId) {
    const input = document.getElementById(inputId);
    const table = document.getElementById(tableId);
    if (!input || !table) return;
    input.addEventListener('input', () => {
        const q = input.value.toLowerCase().trim();
        table.querySelectorAll('tbody tr').forEach(row => {
            row.style.display = row.textContent.toLowerCase().includes(q) ? '' : 'none';
        });
    });
}
