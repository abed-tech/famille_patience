export function toast(msg, ms = 3200) {
    import('../../shared/ui.js').then(m => m.fpToast(msg, 'info', ms));
}

export function toastSuccess(msg) {
    import('../../shared/ui.js').then(m => m.fpToast(msg, 'success'));
}

export function toastError(msg) {
    import('../../shared/ui.js').then(m => m.fpToast(msg, 'error'));
}

export function avatarHtml(name, photoUrl, size = 44) {
    const initials = (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    if (photoUrl) {
        return `<div class="mb-avatar" style="width:${size}px;height:${size}px"><img src="${photoUrl}" alt="" loading="lazy" decoding="async"></div>`;
    }
    return `<div class="mb-avatar" style="width:${size}px;height:${size}px">${initials}</div>`;
}

export function formatDate(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatTime(t) {
    if (!t) return '';
    return t.toString().slice(0, 5);
}

export function formatDateTime(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) + ' à ' +
        d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

export function presenceBadge(attendance) {
    if (!attendance) return '<span class="mb-badge mb-badge-muted">Non pointé</span>';
    if (attendance.is_present) return '<span class="mb-badge mb-badge-success">Présent</span>';
    return '<span class="mb-badge mb-badge-warning">Absent</span>';
}

export function qrImageUrl(code, size = 200) {
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(code)}&color=ec4899`;
}

export function maritalLabel(v) {
    return { single: 'Célibataire', married: 'Marié(e)', divorced: 'Divorcé(e)', widowed: 'Veuf/Veuve' }[v] || v;
}

export function showLoader(variant = 'dashboard') {
    import('../../shared/ui.js').then(m => m.showContentSkeleton(variant));
}
