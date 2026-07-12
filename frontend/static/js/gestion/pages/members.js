import { renderShell } from '../core/layout.js';
import { api, list } from '../core/api.js';
import { statusBadge, toast, emptyState, formatDate } from '../core/components.js';
import { icons } from '../core/icons.js';
import { router } from '../app.js';

let membersCache = [];

function absUrl(url) {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    return `${location.origin}${url.startsWith('/') ? '' : '/'}${url}`;
}

function photoEl(name, url, size = 48) {
    const src = absUrl(url);
    if (src) {
        return `<img src="${src}" alt="" style="width:${size}px;height:${size}px;border-radius:50%;object-fit:cover;flex-shrink:0;border:2px solid var(--adm-border-light,#f3f4f6)">`;
    }
    const initials = (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    return `<div style="width:${size}px;height:${size}px;border-radius:50%;background:#fdf2f8;color:#ec4899;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;flex-shrink:0">${initials}</div>`;
}

function assignmentLine(m) {
    if (m.referrer_name) return `<span class="adm-member-assignment">Référent : ${m.referrer_name}</span>`;
    if (m.counsellor_name) return `<span class="adm-member-assignment">Conseiller : ${m.counsellor_name}</span>`;
    return '';
}

function memberListItem(m) {
    return `
        <button type="button" class="adm-member-row adm-clickable" data-id="${m.id}">
            ${photoEl(m.full_name, m.photo)}
            <div class="adm-member-row-body">
                <div class="adm-member-row-name">${m.full_name}</div>
                ${assignmentLine(m)}
                <div class="adm-member-row-meta">${m.member_number} · ${formatDate(m.registration_date)}</div>
            </div>
            <div class="adm-member-row-right">
                ${statusBadge(m.status)}
                ${icons.chevron}
            </div>
        </button>`;
}

export async function renderMembers() {
    if (!api.token) return;
    const search = sessionStorage.getItem('adm_search') || '';
    sessionStorage.removeItem('adm_search');

    try {
        membersCache = list(await api.getMembers());
    } catch (e) {
        membersCache = [];
        toast(e.message || 'Impossible de charger les membres');
    }

    const filtered = search
        ? membersCache.filter(m => `${m.full_name} ${m.member_number} ${m.phone_primary} ${m.referrer_name || ''} ${m.counsellor_name || ''}`.toLowerCase().includes(search.toLowerCase()))
        : membersCache;

    renderShell('members', `
        <div class="adm-page-header">
            <div><h2>Membres</h2><p>${filtered.length} membre(s) enregistré(s)</p></div>
            <button class="adm-btn adm-btn-primary" id="btn-add">${icons.plus} Nouveau membre</button>
        </div>
        <div class="adm-filters">
            <input class="adm-input" style="max-width:280px" id="search-input" placeholder="Rechercher..." value="${search}">
            <button class="adm-filter-chip active" data-filter="all">Tous</button>
            <button class="adm-filter-chip" data-filter="active">Actifs</button>
            <button class="adm-filter-chip" data-filter="suspended">Suspendus</button>
            <button class="adm-filter-chip" data-filter="inactive">Inactifs</button>
        </div>
        <div class="adm-card">
            <div class="adm-click-list" id="members-list">
                ${filtered.length ? filtered.map(m => memberListItem(m)).join('') : emptyState('Aucun membre')}
            </div>
        </div>`, { action: '' });

    bindMembersEvents();
}

function bindMembersEvents() {
    document.getElementById('btn-add')?.addEventListener('click', () => router.navigate('/membres/nouveau'));
    document.getElementById('search-input')?.addEventListener('input', e => filterList(e.target.value));
    document.querySelectorAll('[data-filter]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('[data-filter]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const status = btn.dataset.filter;
            document.querySelectorAll('.adm-member-row').forEach(row => {
                const id = row.dataset.id;
                const member = membersCache.find(m => m.id === id);
                row.style.display = status === 'all' || member?.status === status ? '' : 'none';
            });
        });
    });
    document.querySelectorAll('.adm-member-row[data-id]').forEach(btn => {
        btn.addEventListener('click', () => router.navigate(`/membres/${btn.dataset.id}`));
    });
}

function filterList(q) {
    const lq = q.toLowerCase();
    document.querySelectorAll('.adm-member-row').forEach(row => {
        row.style.display = row.textContent.toLowerCase().includes(lq) ? '' : 'none';
    });
}
