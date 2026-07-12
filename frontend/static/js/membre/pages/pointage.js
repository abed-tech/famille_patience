import { renderShell } from '../core/layout.js';
import {
    api, refreshAgentStatus, hasAgentAccess, getActiveAgentEvents,
} from '../core/api.js';
import { icons } from '../../shared/icons.js';
import { fpToast, setButtonLoading } from '../../shared/ui.js';

let pollTimer = null;
let qrScanner = null;
let scanCooldown = false;
let selectedEventId = '';

function eventIdOf(ev) {
    return ev?.event_id || ev?.id || '';
}

function resolveSelectedEventId(events) {
    const stored = localStorage.getItem('mb_pointage_event') || '';
    const ids = events.map(eventIdOf).filter(Boolean);
    if (stored && ids.includes(stored)) return stored;
    return ids[0] || '';
}

function setSelectedEventId(id) {
    selectedEventId = id || '';
    if (selectedEventId) {
        localStorage.setItem('mb_pointage_event', selectedEventId);
    } else {
        localStorage.removeItem('mb_pointage_event');
    }
}

function pointageBackPath() {
    return localStorage.getItem('mb_pointage_return') || '/evenements';
}

export function teardownPointage() {
    stopPolling();
    stopQrScanner();
    scanCooldown = false;
}

function stopPolling() {
    if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
    }
}

async function stopQrScanner() {
    if (qrScanner) {
        try {
            await qrScanner.stop();
            qrScanner.clear();
        } catch { /* */ }
        qrScanner = null;
    }
}

async function ensureAgentAccess(router) {
    await refreshAgentStatus();
    if (!hasAgentAccess()) {
        setSelectedEventId('');
        router.navigate('/evenements');
        return false;
    }
    return true;
}

function formatTime(value) {
    if (!value) return '—';
    const s = String(value);
    return s.length >= 5 ? s.slice(0, 5) : s;
}

function eventOptions(events, currentId) {
    return events.map(ev => {
        const id = eventIdOf(ev);
        const label = `${ev.name} — ${ev.date}${ev.time ? ` ${formatTime(ev.time)}` : ''}`;
        return `<option value="${id}" ${id === currentId ? 'selected' : ''}>${label}</option>`;
    }).join('');
}

/** Choix du mode de pointage (spec : QR ou manuel) */
export async function renderPointage(router) {
    if (!api.token) { router.navigate('/connexion'); return; }
    stopPolling();
    await stopQrScanner();

    if (!(await ensureAgentAccess(router))) return;

    const events = getActiveAgentEvents();
    if (!events.length) {
        renderShell('pointage', `
            <div class="fp-card fp-empty">
                <div class="fp-empty-icon">${icons.calendar}</div>
                <p>Aucun événement ouvert ne vous est assigné.</p>
            </div>`, {
            router,
            title: 'Enregistrer les présences',
            back: true,
            onBack: () => router.navigate(pointageBackPath()),
        });
        return;
    }

    setSelectedEventId(resolveSelectedEventId(events));
    const current = events.find(e => eventIdOf(e) === selectedEventId) || events[0];

    const content = `
        <div class="mb-pointage-modes fp-stagger">
            <div class="fp-card" style="padding:14px 16px;margin-bottom:16px">
                <strong>${current.name}</strong>
                <p style="font-size:12px;color:var(--ptg-text-muted);margin-top:4px">
                    ${icons.calendar} ${current.date}${current.time ? ` · ${formatTime(current.time)}` : ''}
                </p>
            </div>
            <p style="font-size:13px;color:var(--mb-text-muted);margin-bottom:12px">
                Choisissez un mode de pointage :
            </p>
            <a href="/membre/pointage/scan" class="mb-home-card fp-card-interactive mb-pointage-mode-card" data-go="/pointage/scan">
                <div class="mb-home-card-body">
                    <span class="mb-home-card-label">${icons.scan} Scanner QR Code</span>
                    <p class="mb-home-card-desc">Ouvre la caméra pour scanner le QR Code du membre.</p>
                </div>
                <span class="mb-list-item-chevron">${icons.chevron}</span>
            </a>
            <a href="/membre/pointage/manuel" class="mb-home-card fp-card-interactive mb-pointage-mode-card" data-go="/pointage/manuel">
                <div class="mb-home-card-body">
                    <span class="mb-home-card-label">Pointage manuel</span>
                    <p class="mb-home-card-desc">Saisir l'ID du membre et sélectionner l'événement.</p>
                </div>
                <span class="mb-list-item-chevron">${icons.chevron}</span>
            </a>
        </div>`;

    renderShell('pointage', content, {
        router,
        title: 'Enregistrer les présences',
        subtitle: current.name,
        back: true,
        onBack: () => router.navigate(pointageBackPath()),
    });
}

/** Pointage manuel — ID membre + événements ouverts uniquement */
export async function renderPointageManual(router) {
    if (!api.token) { router.navigate('/connexion'); return; }
    stopPolling();
    await stopQrScanner();

    if (!(await ensureAgentAccess(router))) return;

    const events = getActiveAgentEvents();
    if (!events.length) {
        router.navigate('/pointage');
        return;
    }

    setSelectedEventId(resolveSelectedEventId(events));

    const content = `
        <div class="mb-pointage fp-stagger">
            <div class="fp-card fp-card-body">
                <h3 class="fp-card-title" style="margin-bottom:16px">Pointage manuel</h3>
                <label class="fp-label" for="ptg-member-id">ID du membre</label>
                <input id="ptg-member-id" class="fp-input" placeholder="N° membre ou code QR" autocomplete="off" style="margin-bottom:14px">
                <label class="fp-label" for="ptg-event-select">Événement</label>
                <select id="ptg-event-select" class="fp-select mb-pointage-select">
                    ${eventOptions(events, selectedEventId)}
                </select>
                <button type="button" id="ptg-manual-submit" class="fp-btn fp-btn-primary fp-btn-block" style="margin-top:16px">
                    Enregistrer la présence
                </button>
            </div>
            <div id="ptg-manual-result" class="fp-card ptg-result hidden" style="margin-top:12px"></div>
        </div>`;

    renderShell('pointage-manual', content, {
        router,
        title: 'Pointage manuel',
        subtitle: 'Enregistrer les présences',
        back: true,
        onBack: () => router.navigate('/pointage'),
    });

    document.getElementById('ptg-event-select')?.addEventListener('change', e => {
        setSelectedEventId(e.target.value);
    });

    const submit = () => {
        const memberId = document.getElementById('ptg-member-id')?.value?.trim();
        if (!memberId) {
            fpToast('Saisissez l\'ID du membre.', 'error');
            return;
        }
        recordScan(memberId, 'manual', router, 'ptg-manual-submit', 'ptg-manual-result');
    };

    document.getElementById('ptg-manual-submit')?.addEventListener('click', submit);
    document.getElementById('ptg-member-id')?.addEventListener('keydown', e => {
        if (e.key === 'Enter') submit();
    });
}

export async function renderPointageScan(router) {
    if (!api.token) { router.navigate('/connexion'); return; }
    stopPolling();

    if (!(await ensureAgentAccess(router))) return;

    const events = getActiveAgentEvents();
    setSelectedEventId(resolveSelectedEventId(events));

    if (!selectedEventId) {
        router.navigate('/pointage');
        return;
    }

    const content = `
        <div class="mb-pointage fp-stagger">
            ${events.length > 1 ? `
                <select id="ptg-event-select" class="fp-select mb-pointage-select">
                    ${eventOptions(events, selectedEventId)}
                </select>` : ''}
            <div class="fp-card ptg-scan-zone">
                <div class="ptg-scan-icon">${icons.qr}</div>
                <p>Scannez le QR Code du membre pour enregistrer sa présence.</p>
                <div id="ptg-qr-reader" class="mb-qr-reader"></div>
                <input id="ptg-qr-input" class="fp-input ptg-qr-input" placeholder="FPQR-… ou n° membre" autocomplete="off">
                <button id="ptg-scan-btn" class="fp-btn fp-btn-primary fp-btn-block">Enregistrer la présence</button>
            </div>
            <div id="ptg-scan-result" class="fp-card ptg-result hidden"></div>
        </div>`;

    renderShell('pointage-scan', content, {
        router,
        title: 'Scanner QR Code',
        subtitle: 'Enregistrer les présences',
        back: true,
        onBack: () => router.navigate('/pointage'),
    });

    document.getElementById('ptg-event-select')?.addEventListener('change', async e => {
        setSelectedEventId(e.target.value);
        await stopQrScanner();
        startCameraScan(router);
    });

    document.getElementById('ptg-scan-btn')?.addEventListener('click', () => {
        const qr = document.getElementById('ptg-qr-input')?.value?.trim();
        if (qr) recordScan(qr, 'qr', router);
    });
    document.getElementById('ptg-qr-input')?.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
            const qr = e.target.value.trim();
            if (qr) recordScan(qr, 'qr', router);
        }
    });

    startCameraScan(router);
}

async function startCameraScan(router) {
    const el = document.getElementById('ptg-qr-reader');
    if (!el || typeof Html5Qrcode === 'undefined' || !selectedEventId) return;
    await stopQrScanner();
    qrScanner = new Html5Qrcode('ptg-qr-reader');
    try {
        await qrScanner.start(
            { facingMode: 'environment' },
            { fps: 8, qrbox: { width: 220, height: 220 } },
            decoded => {
                if (scanCooldown) return;
                if (document.getElementById('ptg-qr-input')) {
                    document.getElementById('ptg-qr-input').value = decoded;
                }
                recordScan(decoded, 'qr', router);
            },
            () => {},
        );
    } catch {
        el.innerHTML = '<p style="font-size:12px;color:var(--ptg-text-muted);padding:8px">Caméra indisponible — saisissez le code manuellement.</p>';
    }
}

async function recordScan(value, mode, router, btnId = 'ptg-scan-btn', resultId = 'ptg-scan-result') {
    if (!selectedEventId || !value || scanCooldown) return;

    scanCooldown = true;
    const btn = document.getElementById(btnId);
    const result = document.getElementById(resultId);
    if (btn) setButtonLoading(btn, true);

    try {
        const res = await api.scanAttendance(value, selectedEventId, mode);
        const name = res.data?.member_name || res.data?.member?.full_name || 'Membre';
        fpToast(res.message || `Présence — ${name}`, 'success');
        if (result) {
            result.className = 'fp-card ptg-result ptg-result-success';
            result.innerHTML = `<p style="font-weight:600">${res.message}</p><p style="margin-top:6px">${name}</p>`;
            result.classList.remove('hidden');
        }
        const input = document.getElementById('ptg-qr-input') || document.getElementById('ptg-member-id');
        if (input) {
            input.value = '';
            input.focus();
        }
    } catch (ex) {
        fpToast(ex.message, 'error');
        if (result) {
            result.className = 'fp-card ptg-result ptg-result-error';
            result.innerHTML = `<p>${ex.message}</p>`;
            result.classList.remove('hidden');
        }
    } finally {
        if (btn) setButtonLoading(btn, false);
        setTimeout(() => { scanCooldown = false; }, 2500);
    }
}

window.addEventListener('beforeunload', () => teardownPointage());
