import { icons } from './icons.js';

let chartInstances = [];

export function destroyCharts() {
    chartInstances.forEach(c => c.destroy());
    chartInstances = [];
}

export function createChart(canvasId, type, labels, data, color = '#ec4899') {
    const canvas = document.getElementById(canvasId);
    if (!canvas || typeof Chart === 'undefined') return;
    const safeLabels = labels?.length ? labels : ['—'];
    const safeData = data?.length ? data : [0];
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, 220);
    gradient.addColorStop(0, color + '40');
    gradient.addColorStop(1, color + '05');

    const chart = new Chart(canvas, {
        type,
        data: {
            labels: safeLabels,
            datasets: [{
                data: safeData,
                backgroundColor: type === 'line' ? gradient : [color, '#f9a8d4', '#fbcfe8', '#fce7f3', '#831843', '#db2777', '#be185d', '#9d174d'],
                borderColor: color,
                borderWidth: type === 'line' ? 2 : 0,
                fill: type === 'line',
                tension: .4,
                pointRadius: type === 'line' ? 3 : 0,
                pointBackgroundColor: color,
            }],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: type === 'doughnut' || type === 'pie' } },
            scales: type === 'line' || type === 'bar' ? {
                x: { grid: { display: false }, ticks: { font: { size: 11 }, color: '#9ca3af' } },
                y: { grid: { color: '#f0f1f5' }, ticks: { font: { size: 11 }, color: '#9ca3af' }, beginAtZero: true },
            } : {},
        },
    });
    chartInstances.push(chart);
    return chart;
}

export function statCard({ label, value, change, icon, accent = '#ec4899', bg = '#fdf2f8', link }) {
    const ch = change > 0 ? 'up' : change < 0 ? 'down' : 'neutral';
    const chText = change ? `${change > 0 ? '+' : ''}${change}%` : '';
    return `<div class="adm-stat-card adm-fade-in" style="--stat-accent:${accent};--stat-bg:${bg}" ${link ? `data-link="${link}"` : ''}>
        <div class="adm-stat-top">
            <div class="adm-stat-icon">${icons[icon] || icons.chart}</div>
            ${chText ? `<span class="adm-stat-change ${ch}">${chText}</span>` : ''}
        </div>
        <div class="adm-stat-value">${value ?? '—'}</div>
        <div class="adm-stat-label">${label}</div>
    </div>`;
}

export function badge(text, type = 'neutral') {
    return `<span class="adm-badge adm-badge-${type}">${text}</span>`;
}

export function statusBadge(status) {
    const map = { active: ['Actif', 'success'], suspended: ['Suspendu', 'warning'], inactive: ['Inactif', 'neutral'], draft: ['Brouillon', 'neutral'], open: ['Ouvert', 'success'], closed: ['Fermé', 'danger'], cancelled: ['Annulé', 'warning'] };
    const [label, type] = map[status] || [status, 'neutral'];
    return badge(label, type);
}

export function confirmModal(title, message, onConfirm) {
    const overlay = document.createElement('div');
    overlay.className = 'adm-modal-overlay';
    overlay.innerHTML = `
        <div class="adm-modal">
            <div class="adm-modal-header"><h3 class="adm-modal-title">${title}</h3></div>
            <div class="adm-modal-body"><p style="color:var(--adm-text-secondary)">${message}</p></div>
            <div class="adm-modal-footer">
                <button class="adm-btn adm-btn-secondary" id="modal-cancel">Annuler</button>
                <button class="adm-btn adm-btn-danger" id="modal-confirm">Confirmer</button>
            </div>
        </div>`;
    document.body.appendChild(overlay);
    overlay.querySelector('#modal-cancel').onclick = () => overlay.remove();
    overlay.querySelector('#modal-confirm').onclick = async () => { overlay.remove(); await onConfirm(); };
    overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
}

export function toast(msg, ms = 3200) {
    import('../../shared/ui.js').then(m => m.fpToast(msg, 'info', ms));
}

export function toastSuccess(msg) {
    import('../../shared/ui.js').then(m => m.fpToast(msg, 'success'));
}

export function toastError(msg) {
    import('../../shared/ui.js').then(m => m.fpToast(msg, 'error'));
}

export function formatDate(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatTime(iso) {
    if (!iso) return '';
    return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

export function formatDateTime(iso) {
    return `${formatDate(iso)} à ${formatTime(iso)}`;
}

export function avatar(name, color = '#ec4899') {
    const initials = (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    return `<div class="adm-avatar" style="background:${color}15;color:${color}">${initials}</div>`;
}

export function emptyState(msg = 'Aucune donnée') {
    return `<div class="adm-empty"><p>${msg}</p></div>`;
}

export function modal(title, bodyHtml, footerHtml = '') {
    const overlay = document.createElement('div');
    overlay.className = 'adm-modal-overlay';
    overlay.innerHTML = `
        <div class="adm-modal" style="max-width:560px">
            <div class="adm-modal-header">
                <h3 class="adm-modal-title">${title}</h3>
                <button class="adm-icon-btn adm-modal-close">${icons.x}</button>
            </div>
            <div class="adm-modal-body">${bodyHtml}</div>
            ${footerHtml ? `<div class="adm-modal-footer">${footerHtml}</div>` : ''}
        </div>`;
    document.body.appendChild(overlay);
    overlay.querySelector('.adm-modal-close').onclick = () => overlay.remove();
    overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
    return overlay;
}
