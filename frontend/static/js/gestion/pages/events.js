import { renderShell } from '../core/layout.js';
import { api, list } from '../core/api.js';
import { statusBadge, confirmModal, toast, modal } from '../core/components.js';
import { icons } from '../core/icons.js';

export async function renderEvents() {
    if (!api.token) return;
    let events = [];
    try {
        events = list(await api.getEvents());
    } catch (e) {
        toast(e.message || 'Impossible de charger les événements');
    }

    renderShell('events', `
        <div class="adm-page-header">
            <div><h2>Événements</h2><p>${events.length} événement(s)</p></div>
            <button class="adm-btn adm-btn-primary" id="btn-create">${icons.plus} Créer</button>
        </div>
        <div class="adm-grid-2">
            ${events.map(e => {
                const actions = e.status === 'draft' ? `<button class="adm-btn adm-btn-primary adm-btn-sm" data-open="${e.id}">Ouvrir</button>` :
                    e.status === 'open' ? `<button class="adm-btn adm-btn-danger adm-btn-sm" data-close="${e.id}">Fermer</button>` :
                    e.status === 'closed' ? `
                        <button class="adm-btn adm-btn-secondary adm-btn-sm" data-report-view="${e.id}">Rapport</button>
                        <button class="adm-btn adm-btn-secondary adm-btn-sm" data-report-pdf="${e.id}">PDF</button>
                        <button class="adm-btn adm-btn-secondary adm-btn-sm" data-report-xls="${e.id}">Excel</button>` : '';
                return `<div class="adm-card" style="padding:20px">
                    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px">
                        <div><h3 style="font-weight:600;font-size:15px">${e.name}</h3><p style="font-size:12px;color:var(--adm-text-muted);margin-top:4px">📅 ${e.date} · ${(e.time || '').toString().slice(0, 5)} · 📍 ${e.location}</p></div>
                        ${statusBadge(e.status)}
                    </div>
                    <div style="display:flex;gap:16px;font-size:12px;color:var(--adm-text-muted);margin-bottom:12px">
                        <span>✅ ${e.attendance_count ?? 0} présences</span>
                    </div>
                    <div style="display:flex;gap:8px">${actions}</div>
                </div>`;
            }).join('') || '<div class="adm-card" style="padding:40px;text-align:center;color:var(--adm-text-muted)">Aucun événement</div>'}
        </div>`);

    document.getElementById('btn-create')?.addEventListener('click', () => {
        const body = `
            <div class="adm-form-group"><label class="adm-label">Nom *</label><input class="adm-input" id="en"></div>
            <div class="adm-form-group"><label class="adm-label">Date *</label><input type="date" class="adm-input" id="ed"></div>
            <div class="adm-form-group"><label class="adm-label">Heure</label><input type="time" class="adm-input" id="et" value="10:00"></div>
            <div class="adm-form-group"><label class="adm-label">Lieu *</label><input class="adm-input" id="el"></div>
            <div class="adm-form-group"><label class="adm-label">Description</label><textarea class="adm-textarea" id="edesc" rows="2"></textarea></div>`;
        const m = modal('Nouvel événement', body, `<button class="adm-btn adm-btn-primary" id="save-ev">Créer</button>`);
        m.querySelector('#save-ev').onclick = async () => {
            try {
                await api.createEvent({
                    name: m.querySelector('#en').value,
                    date: m.querySelector('#ed').value,
                    time: m.querySelector('#et').value,
                    location: m.querySelector('#el').value,
                    description: m.querySelector('#edesc').value,
                    status: 'draft',
                });
                toast('Événement créé');
                m.remove();
                renderEvents();
            } catch (e) { toast(e.message); }
        };
    });

    document.querySelectorAll('[data-open]').forEach(b => b.addEventListener('click', async () => {
        const eventId = b.dataset.open;
        let members = [];
        try {
            members = list(await api.getMembers('status=active')).filter(m => m.has_account);
        } catch (e) {
            toast(e.message || 'Impossible de charger les membres');
            return;
        }

        const body = `
            <p style="font-size:13px;color:var(--adm-text-muted);margin-bottom:16px">
                <strong>Obligatoire :</strong> sélectionnez entre <strong>1 et 5 agents pointeurs</strong>.
                Seuls ces membres verront l'application de pointage pendant l'événement.
                À chaque nouvel événement, effectuez une nouvelle sélection.
            </p>
            <div class="adm-form-group">
                <label class="adm-label">Agents pointeurs *</label>
                <div id="agent-picks" style="max-height:240px;overflow-y:auto;border:1px solid var(--adm-border);border-radius:8px;padding:8px">
                    ${members.length ? members.map(m => `
                        <label style="display:flex;align-items:center;gap:10px;padding:8px;cursor:pointer;border-radius:6px;font-size:13px">
                            <input type="checkbox" class="agent-pick" value="${m.id}" data-name="${m.full_name}">
                            <span><strong>${m.full_name}</strong><br><span style="font-size:11px;color:var(--adm-text-muted)">${m.member_number || ''}</span></span>
                        </label>`).join('') : '<p style="padding:12px;color:var(--adm-text-muted);font-size:13px">Aucun membre avec compte actif — impossible d\'ouvrir l\'événement.</p>'}
                </div>
                <p id="agent-limit-msg" style="font-size:12px;color:var(--adm-danger);margin-top:8px;display:none">Maximum 5 agents pointeurs.</p>
                <p id="agent-required-msg" style="font-size:12px;color:var(--adm-danger);margin-top:8px">Sélectionnez au moins un agent pointeur.</p>
            </div>`;

        const canOpen = members.length > 0;
        const m = modal('Ouvrir l\'événement', body, `
            <button class="adm-btn adm-btn-primary" id="confirm-open" ${canOpen ? 'disabled' : ''}>Ouvrir</button>`);

        const confirmBtn = m.querySelector('#confirm-open');
        const requiredMsg = m.querySelector('#agent-required-msg');

        function updateAgentSelection() {
            const checked = m.querySelectorAll('.agent-pick:checked');
            const limitMsg = m.querySelector('#agent-limit-msg');
            limitMsg.style.display = 'none';
            requiredMsg.style.display = checked.length ? 'none' : 'block';
            if (confirmBtn) confirmBtn.disabled = checked.length === 0;
            m.querySelectorAll('.agent-pick:not(:checked)').forEach(other => {
                other.disabled = checked.length >= 5;
            });
        }

        m.querySelectorAll('.agent-pick').forEach(cb => {
            cb.addEventListener('change', () => {
                const checked = m.querySelectorAll('.agent-pick:checked');
                const limitMsg = m.querySelector('#agent-limit-msg');
                if (checked.length > 5) {
                    cb.checked = false;
                    limitMsg.style.display = 'block';
                }
                updateAgentSelection();
            });
        });
        updateAgentSelection();

        if (confirmBtn) confirmBtn.onclick = async () => {
            const memberIds = [...m.querySelectorAll('.agent-pick:checked')].map(el => el.value);
            if (!memberIds.length) {
                requiredMsg.style.display = 'block';
                toast('Sélectionnez au moins un agent pointeur.');
                return;
            }
            try {
                const r = await api.openEvent(eventId, memberIds);
                toast(r.message || 'Événement ouvert');
                m.remove();
                renderEvents();
            } catch (e) { toast(e.message); }
        };
    }));
    document.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => {
        confirmModal(
            'Fermer l\'événement',
            'L\'application de pointage sera retirée à tous les agents. Les absences seront enregistrées automatiquement et un rapport sera disponible.',
            async () => {
            try {
                const r = await api.closeEvent(b.dataset.close);
                toast(r.message || 'Événement fermé');
                renderEvents();
            } catch (e) { toast(e.message); }
        });
    }));

    document.querySelectorAll('[data-report-view]').forEach(b => b.addEventListener('click', () => showEventReport(b.dataset.reportView)));
    document.querySelectorAll('[data-report-pdf]').forEach(b => b.addEventListener('click', () => downloadReport(b.dataset.reportPdf, 'pdf')));
    document.querySelectorAll('[data-report-xls]').forEach(b => b.addEventListener('click', () => downloadReport(b.dataset.reportXls, 'excel')));
}

let pointageInterval = null;
let qrScanner = null;
let scanCooldown = false;
let cameraPermissionDenied = false;
let refreshPointageLive = null;

export async function renderPointage() {
    if (!api.token) return;

    let openEvents = [];
    try {
        openEvents = list(await api.getOpenEvents());
    } catch (e) {
        toast(e.message || 'Erreur chargement événements');
    }

    const defaultEventId = openEvents[0]?.id || '';

    renderShell('pointage', `
        <div class="adm-page-header">
            <div><h2>Pointage en direct</h2><p style="display:flex;align-items:center;gap:8px"><span class="adm-live-dot"></span> Mise à jour automatique</p></div>
        </div>
        <div class="adm-grid-2" style="margin-bottom:20px">
            <div class="adm-card" style="padding:20px">
                <div class="adm-card-header" style="padding:0;margin-bottom:12px">
                    <span class="adm-card-title">Scanner QR (caméra)</span>
                </div>
                ${openEvents.length ? `
                    <div class="adm-form-group" style="margin-bottom:12px">
                        <label class="adm-label">Événement ouvert</label>
                        <select class="adm-select" id="scan-event">
                            ${openEvents.map(e => `<option value="${e.id}">${e.name} — ${e.date}</option>`).join('')}
                        </select>
                    </div>
                    <div id="qr-reader" class="adm-qr-reader"></div>
                    <p id="scan-status" style="font-size:12px;color:var(--adm-text-muted);margin-top:8px;text-align:center">Placez le QR code devant la caméra</p>
                ` : `<p style="font-size:13px;color:var(--adm-text-muted);padding:16px 0">Aucun événement ouvert. Ouvrez un événement pour activer le scanner.</p>`}
            </div>
            <div class="adm-card" style="padding:20px">
                <div class="adm-card-header" style="padding:0;margin-bottom:12px">
                    <span class="adm-card-title">Pointage manuel</span>
                </div>
                <div class="adm-form-group">
                    <label class="adm-label">Code QR</label>
                    <input class="adm-input" id="manual-qr" placeholder="FP-XXXX ou code QR">
                </div>
                ${openEvents.length ? `
                    <div class="adm-form-group">
                        <label class="adm-label">Événement</label>
                        <select class="adm-select" id="manual-event">
                            ${openEvents.map(e => `<option value="${e.id}">${e.name}</option>`).join('')}
                        </select>
                    </div>
                    <button class="adm-btn adm-btn-primary" id="manual-scan" style="width:100%">Enregistrer la présence</button>
                ` : ''}
            </div>
        </div>
        <div id="pointage-content">
            <div class="adm-stats-grid" id="pointage-stats"></div>
            <div class="adm-grid-2">
                <div class="adm-card"><div class="adm-card-header"><span class="adm-card-title">Agents actifs</span></div><div class="adm-card-body" id="agents-list"></div></div>
                <div class="adm-card"><div class="adm-card-header"><span class="adm-card-title">Derniers scans</span></div><div class="adm-card-body adm-table-wrap" id="scans-list"></div></div>
            </div>
        </div>`, { subtitle: 'Temps réel' });

    async function load() {
        try {
            const data = (await api.getLivePointage()).data;
            updatePointageUI(data);
        } catch { /* silencieux pour le polling */ }
    }
    refreshPointageLive = load;

    if (openEvents.length && typeof Html5Qrcode !== 'undefined') {
        await startQrScanner(defaultEventId);
        document.getElementById('scan-event')?.addEventListener('change', async (e) => {
            if (cameraPermissionDenied) return;
            await stopQrScanner();
            await startQrScanner(e.target.value);
        });
    }

    document.getElementById('manual-scan')?.addEventListener('click', async () => {
        const qr = document.getElementById('manual-qr').value.trim();
        const eventId = document.getElementById('manual-event').value;
        if (!qr) { toast('Saisissez un code QR'); return; }
        try {
            const r = await api.adminScan(qr, eventId, 'manual');
            toast(r.message || `Présence enregistrée : ${r.data?.member_name || ''}`);
            document.getElementById('manual-qr').value = '';
            await load();
        } catch (e) { toast(e.message); }
    });

    await load();
    if (pointageInterval) clearInterval(pointageInterval);
    pointageInterval = setInterval(load, 3000);
}

async function startQrScanner(eventId) {
    const el = document.getElementById('qr-reader');
    if (!el || typeof Html5Qrcode === 'undefined') return;
    if (cameraPermissionDenied) return;

    qrScanner = new Html5Qrcode('qr-reader');
    try {
        await qrScanner.start(
            { facingMode: 'environment' },
            { fps: 8, qrbox: { width: 240, height: 240 } },
            async (decodedText) => {
                if (scanCooldown) return;
                scanCooldown = true;
                const evId = document.getElementById('scan-event')?.value || eventId;
                const status = document.getElementById('scan-status');
                try {
                    const r = await api.adminScan(decodedText, evId, 'qr');
                    if (status) {
                        status.textContent = `✓ ${r.data?.member_name || 'Présence enregistrée'}`;
                        status.style.color = '#10b981';
                    }
                    toast(r.message || 'Présence enregistrée');
                    if (typeof refreshPointageLive === 'function') await refreshPointageLive();
                } catch (e) {
                    if (status) {
                        status.textContent = e.message;
                        status.style.color = '#ef4444';
                    }
                    toast(e.message);
                }
                setTimeout(() => {
                    scanCooldown = false;
                    if (status) {
                        status.textContent = 'Placez le QR code devant la caméra';
                        status.style.color = 'var(--adm-text-muted)';
                    }
                }, 2500);
            },
            () => {},
        );
    } catch (e) {
        const status = document.getElementById('scan-status');
        const errName = e?.name || '';
        cameraPermissionDenied = errName === 'NotAllowedError' || errName === 'PermissionDeniedError';
        if (status) {
            status.textContent = cameraPermissionDenied
                ? 'Accès caméra refusé. Autorisez la caméra dans le navigateur puis rechargez la page. Utilisez le pointage manuel en attendant.'
                : 'Caméra inaccessible. Utilisez le pointage manuel.';
            status.style.color = '#ef4444';
        }
        console.warn('QR scanner:', e);
        await stopQrScanner();
    }
}

async function stopQrScanner() {
    if (qrScanner) {
        try {
            if (qrScanner.isScanning) await qrScanner.stop();
            qrScanner.clear();
        } catch { /* */ }
        qrScanner = null;
    }
}

function updatePointageUI(data) {
    const stats = data.event_stats || {};
    document.getElementById('pointage-stats').innerHTML = Object.values(stats).map(s => `
        <div class="adm-stat-card">
            <div class="adm-stat-label">${s.name}</div>
            <div class="adm-stat-value" style="font-size:20px;margin-top:8px">${s.present} / ${s.total_members}</div>
            <div style="font-size:11px;color:var(--adm-text-muted);margin-top:4px">${s.absent} absents</div>
        </div>`).join('') || '<p style="color:var(--adm-text-muted);padding:16px">Aucun événement ouvert</p>';

    document.getElementById('agents-list').innerHTML = (data.agents || []).map(a => `
        <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--adm-border-light);font-size:13px">
            <span style="font-weight:500">${a.agent_name}</span><span style="color:var(--adm-text-muted)">${a.event_name}</span>
        </div>`).join('') || '<p style="color:var(--adm-text-muted);font-size:13px">Aucun agent actif</p>';

    const scans = data.recent_scans || [];
    document.getElementById('scans-list').innerHTML = scans.length
        ? `<table class="adm-table">
            <thead><tr><th>Membre</th><th>Événement</th><th>Agent</th><th>Date & heure</th></tr></thead>
            <tbody>${scans.map(s => {
                const dt = s.scanned_at ? new Date(s.scanned_at) : null;
                const dateStr = dt
                    ? `${dt.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })} à ${dt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
                    : '—';
                return `<tr>
                    <td>${s.member_name}</td>
                    <td>${s.event_name}</td>
                    <td>${s.agent_name || '—'}</td>
                    <td style="font-size:12px;color:var(--adm-text-muted);white-space:nowrap">${dateStr}</td>
                </tr>`;
            }).join('')}</tbody>
        </table>`
        : '<p style="padding:16px;color:var(--adm-text-muted)">Aucun scan</p>';
}

export async function stopPointagePolling() {
    if (pointageInterval) { clearInterval(pointageInterval); pointageInterval = null; }
    refreshPointageLive = null;
    await stopQrScanner();
}

async function showEventReport(eventId) {
    try {
        const data = (await api.getEventReport(eventId)).data;
        const s = data.summary;
        const body = `
            <div style="margin-bottom:16px">
                <p><strong>${data.event.name}</strong> — ${data.event.date}</p>
                <p style="font-size:13px;color:var(--adm-text-muted)">Attendus: ${s.total_expected} · Présents: ${s.present_count} · Absents: ${s.absent_count} · Taux: ${s.attendance_rate}%</p>
            </div>
            <div class="adm-grid-2">
                <div><h4 style="font-size:13px;margin-bottom:8px">Présents (${data.present.length})</h4>
                    <div style="max-height:200px;overflow-y:auto;font-size:12px">${data.present.map(p => `<div style="padding:4px 0;border-bottom:1px solid var(--adm-border-light)">${p.full_name} · ${p.referrer_name}</div>`).join('') || '—'}</div>
                </div>
                <div><h4 style="font-size:13px;margin-bottom:8px">Absents (${data.absent.length})</h4>
                    <div style="max-height:200px;overflow-y:auto;font-size:12px">${data.absent.map(p => `<div style="padding:4px 0;border-bottom:1px solid var(--adm-border-light)">${p.full_name} · ${p.referrer_name}</div>`).join('') || '—'}</div>
                </div>
            </div>`;
        modal('Rapport d\'événement', body, '');
    } catch (e) { toast(e.message); }
}

async function downloadReport(eventId, format) {
    try {
        const blob = await api.downloadEventReport(eventId, format);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `rapport_${eventId}.${format === 'pdf' ? 'pdf' : 'xlsx'}`;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
        toast('Rapport téléchargé');
    } catch (e) { toast(e.message); }
}
