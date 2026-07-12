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

    const palette = ['#ec4899', '#f472b6', '#f9a8d4', '#fbcfe8', '#db2777', '#be185d', '#831843', '#fce7f3'];
    const chart = new Chart(canvas, {
        type,
        data: {
            labels: safeLabels,
            datasets: [{
                label: '',
                data: safeData,
                backgroundColor: type === 'line' ? gradient : palette.slice(0, safeData.length),
                borderColor: color,
                borderWidth: type === 'line' ? 2 : 0,
                fill: type === 'line',
                tension: .4,
                pointRadius: type === 'line' ? 4 : 0,
                pointBackgroundColor: color,
                pointHoverRadius: 6,
            }],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { display: type === 'doughnut' || type === 'pie' },
                tooltip: { backgroundColor: '#1f2937', padding: 10, cornerRadius: 8 },
            },
            scales: type === 'line' || type === 'bar' ? {
                x: { grid: { display: false }, ticks: { font: { size: 11 }, color: '#9ca3af', maxRotation: 45 } },
                y: { grid: { color: '#f0f1f5' }, ticks: { font: { size: 11 }, color: '#9ca3af' }, beginAtZero: true },
            } : {},
        },
    });
    chartInstances.push(chart);
    return chart;
}

export function statCard({ label, value, icon, accent = '#ec4899', bg = '#fdf2f8', link, suffix = '' }) {
    return `<div class="cns-stat-card fp-card-interactive cns-fade-in" style="--stat-accent:${accent};--stat-bg:${bg}" ${link ? `data-link="${link}"` : ''}>
        <div class="cns-stat-icon">${icons[icon] || icons.chart}</div>
        <div class="cns-stat-value">${value ?? '—'}${suffix}</div>
        <div class="cns-stat-label">${label}</div>
    </div>`;
}

export function badge(text, type = 'neutral') {
    return `<span class="cns-badge cns-badge-${type}">${text}</span>`;
}

export function statusBadge(status) {
    const map = {
        active: ['Actif', 'success'], suspended: ['Suspendu', 'warning'],
        inactive: ['Inactif', 'neutral'], open: ['Ouvert', 'success'],
        closed: ['Fermé', 'danger'], cancelled: ['Annulé', 'warning'],
    };
    const [label, type] = map[status] || [status, 'neutral'];
    return badge(label, type);
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
    return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatTime(iso) {
    if (!iso) return '';
    return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

export function formatDateTime(iso) {
    return `${formatDate(iso)} à ${formatTime(iso)}`;
}

export function avatarEl(name, photo, size = 'md') {
    if (photo) return `<img src="${photo}" alt="" class="cns-avatar cns-avatar-${size}">`;
    const initials = (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    return `<div class="cns-avatar cns-avatar-${size} cns-avatar-fallback">${initials}</div>`;
}

export function emptyState(msg = 'Aucune donnée') {
    return `<div class="cns-empty"><p>${msg}</p></div>`;
}

export function filterBar({ searchId = 'search', sortId = 'sort', sortOptions = [] }) {
    return `<div class="cns-filter-bar">
        <div class="cns-search">${icons.search}<input type="search" id="${searchId}" placeholder="Rechercher…"></div>
        ${sortOptions.length ? `<select class="cns-select" id="${sortId}">
            ${sortOptions.map(o => `<option value="${o.value}">${o.label}</option>`).join('')}
        </select>` : ''}
    </div>`;
}
