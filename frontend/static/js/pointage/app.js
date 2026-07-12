import { createApi, extractList } from '../shared/api.js';
import { icons } from '../shared/icons.js';
import { preparePageLeave, showContentSkeleton, mountError, fpToast, setButtonLoading } from '../shared/ui.js';
import { renderShell, renderLoginShell } from './core/layout.js';

const APP_BASE = '/pointage';
const api = createApi('pointage');

let selectedEventId = localStorage.getItem('pointage_event_id') || '';

class Router {
    constructor() {
        this.base = APP_BASE;
        this.routes = {
            [`${APP_BASE}/`]: () => this.handleHome(),
            [`${APP_BASE}/connexion`]: () => renderLogin(this),
            [`${APP_BASE}/accueil`]: () => this.guard(() => renderDashboard(this)),
            [`${APP_BASE}/scan`]: () => this.guard(() => renderScan(this)),
            [`${APP_BASE}/evenements`]: () => this.guard(() => renderEvents(this)),
        };
        window.addEventListener('popstate', () => this.resolve());
    }

    resolve() {
        const path = location.pathname.replace(/\/$/, '') || APP_BASE;
        (this.routes[path] || this.routes[`${APP_BASE}/`])();
    }

    navigate(path, push = true) {
        preparePageLeave().then(() => {
            if (push) history.pushState({}, '', path);
            this.resolve();
        });
    }

    guard(fn) {
        if (!api.token) { this.navigate(`${APP_BASE}/connexion`); return; }
        showContentSkeleton('dashboard');
        Promise.resolve(fn()).catch(err => {
            console.error(err);
            mountError(() => this.resolve());
        });
    }

    async handleHome() {
        if (api.token) {
            try {
                const p = await api.getProfile();
                if (p.data?.role !== 'attendance_agent') {
                    api.clearTokens();
                    this.navigate(`${APP_BASE}/connexion`);
                    return;
                }
                api.setUser(p.data);
                this.navigate(`${APP_BASE}/accueil`, false);
            } catch {
                api.clearTokens();
                this.navigate(`${APP_BASE}/connexion`);
            }
        } else {
            this.navigate(`${APP_BASE}/connexion`, false);
        }
    }
}

const router = new Router();

function renderLogin(router) {
    renderLoginShell(`
        <div class="ptg-login fp-page-enter">
            <div class="ptg-login-card">
                <div class="ptg-login-brand">
                    <div class="ptg-login-logo">${icons.scan}</div>
                    <h1>Pointage</h1>
                    <p>Accès temporaire pendant les événements</p>
                </div>
                <form id="login-form" class="fp-card ptg-form-card">
                    <input type="email" name="email" required class="fp-input" placeholder="Email agent" autocomplete="email">
                    <input type="password" name="password" required class="fp-input" placeholder="Mot de passe" autocomplete="current-password">
                    <div id="login-error" class="ptg-error"></div>
                    <button type="submit" class="fp-btn fp-btn-primary fp-btn-block" id="login-btn">Se connecter</button>
                </form>
            </div>
        </div>`);

    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const err = document.getElementById('login-error');
        const btn = document.getElementById('login-btn');
        err.classList.remove('visible');
        setButtonLoading(btn, true);
        try {
            const data = await api.login(e.target.email.value, e.target.password.value);
            api.setTokens(data.access, data.refresh);
            api.setUser(data.user);
            fpToast('Connexion réussie', 'success');
            router.navigate(`${APP_BASE}/accueil`);
        } catch (ex) {
            err.textContent = ex.message;
            err.classList.add('visible');
            fpToast(ex.message, 'error');
        } finally {
            setButtonLoading(btn, false);
        }
    });
}

async function renderDashboard(router) {
    let events = [];
    try {
        events = extractList(await api.getMyAgentEvents());
    } catch {
        router.navigate(`${APP_BASE}/connexion`);
        return;
    }

    const totalAttendance = events.reduce((s, e) => s + (e.attendance_count || 0), 0);

    const content = `
        <div class="fp-stagger">
            <div class="fp-card" style="padding:24px;text-align:center;margin-bottom:16px">
                <div style="font-size:36px;font-weight:700;color:var(--ptg-primary)">${events.length}</div>
                <div style="font-size:13px;color:var(--ptg-text-muted);margin-top:4px">Événement(s) assigné(s)</div>
            </div>
            <div class="fp-card" style="padding:24px;text-align:center;margin-bottom:16px">
                <div style="font-size:36px;font-weight:700;color:var(--ptg-success)">${totalAttendance}</div>
                <div style="font-size:13px;color:var(--ptg-text-muted);margin-top:4px">Présence(s) enregistrée(s)</div>
            </div>
            <button class="fp-btn fp-btn-primary fp-btn-block" id="go-scan">Commencer le pointage</button>
        </div>`;

    renderShell('dashboard', content, { api, router, title: 'Tableau de bord', subtitle: api.getUser()?.full_name || '' });
    document.getElementById('go-scan')?.addEventListener('click', () => router.navigate(`${APP_BASE}/scan`));
}

async function renderScan() {
    let events = [];
    try {
        events = extractList(await api.getMyAgentEvents());
    } catch {
        router.navigate(`${APP_BASE}/connexion`);
        return;
    }

    if (events.length && !selectedEventId) {
        selectedEventId = events[0].event_id;
        localStorage.setItem('pointage_event_id', selectedEventId);
    }

    const content = events.length ? `
        <div class="fp-stagger">
            <select id="event-select" class="fp-select" style="margin-bottom:12px">
                ${events.map(e => `<option value="${e.event_id}" ${e.event_id === selectedEventId ? 'selected' : ''}>${e.name} — ${e.date}</option>`).join('')}
            </select>
            <div class="fp-card ptg-scan-zone">
                <div class="ptg-scan-icon">${icons.qr}</div>
                <p>Saisissez ou scannez le code QR du membre</p>
                <input id="qr-input" class="fp-input ptg-qr-input" placeholder="FPQR-..." autofocus>
                <button id="scan-btn" class="fp-btn fp-btn-primary fp-btn-block">Enregistrer la présence</button>
            </div>
            <div id="scan-result" class="fp-card ptg-result hidden"></div>
            <div class="fp-card fp-card-body" style="margin-top:12px">
                <h3 class="fp-card-title" style="margin-bottom:12px">Derniers scans</h3>
                <div id="scan-list" class="fp-empty" style="padding:16px 0">Aucun scan</div>
            </div>
        </div>` : `
        <div class="fp-card fp-empty">
            <div class="fp-empty-icon">${icons.calendar}</div>
            <p>Aucun événement ouvert ne vous est assigné.</p>
            <p style="margin-top:8px;font-size:12px">Contactez l'administrateur.</p>
        </div>`;

    renderShell('scan', content, { api, router, title: 'Scanner', subtitle: api.getUser()?.full_name || '' });

    const scans = [];
    document.getElementById('event-select')?.addEventListener('change', (e) => {
        selectedEventId = e.target.value;
        localStorage.setItem('pointage_event_id', selectedEventId);
    });
    document.getElementById('scan-btn')?.addEventListener('click', () => doScan(scans));
    document.getElementById('qr-input')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') doScan(scans);
    });
}

async function doScan(scans) {
    const qr = document.getElementById('qr-input')?.value?.trim();
    const eventId = document.getElementById('event-select')?.value || selectedEventId;
    const result = document.getElementById('scan-result');
    const btn = document.getElementById('scan-btn');
    if (!qr || !eventId) return;

    setButtonLoading(btn, true);
    try {
        const res = await api.scanQR(qr, eventId);
        const d = res.data;
        result.className = 'fp-card ptg-result ptg-result-success';
        result.innerHTML = `<p style="font-weight:600">${res.message}</p><p style="margin-top:6px;font-size:14px">${d.member_name}</p>`;
        result.classList.remove('hidden');
        fpToast(`Présence enregistrée — ${d.member_name}`, 'success');
        scans.unshift({ name: d.member_name, time: new Date().toLocaleTimeString('fr-FR') });
        document.getElementById('scan-list').innerHTML = scans.slice(0, 5).map(s =>
            `<div class="ptg-history-item"><span>${s.name}</span><span class="ptg-history-time">${s.time}</span></div>`
        ).join('');
        document.getElementById('qr-input').value = '';
        document.getElementById('qr-input').focus();
    } catch (ex) {
        result.className = 'fp-card ptg-result ptg-result-error';
        result.innerHTML = `<p>${ex.message}</p>`;
        result.classList.remove('hidden');
        fpToast(ex.message, 'error');
    } finally {
        setButtonLoading(btn, false);
    }
}

async function renderEvents() {
    let events = [];
    try {
        events = extractList(await api.getMyAgentEvents());
    } catch { /* */ }

    const content = `
        <div class="fp-stagger">
            ${events.length ? events.map(e => `
                <div class="fp-card ptg-event-card fp-card-interactive">
                    <h3>${e.name}</h3>
                    <div class="ptg-event-meta">
                        <span>${icons.calendar} ${e.date}</span>
                        <span>${icons.clock} ${(e.time || '').toString().slice(0, 5)}</span>
                        <span>${icons.mapPin} ${e.location || '—'}</span>
                    </div>
                    <div class="ptg-event-count">${icons.check} ${e.attendance_count} présence(s)</div>
                </div>`).join('') : `
                <div class="fp-card fp-empty">
                    <div class="fp-empty-icon">${icons.calendar}</div>
                    <p>Aucun événement assigné</p>
                </div>`}
        </div>`;

    renderShell('events', content, { api, router, title: 'Mon événement' });
}

document.addEventListener('DOMContentLoaded', () => router.resolve());

export { router };
