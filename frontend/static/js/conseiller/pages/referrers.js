import { renderShell } from '../core/layout.js';
import { api } from '../core/api.js';
import { avatarEl, filterBar, toast } from '../core/components.js';

let referrersCache = [];

export async function renderReferrers() {
    try {
        referrersCache = (await api.getReferrers()).data || [];
    } catch (e) {
        toast(e.message || 'Erreur de chargement');
        return;
    }
    renderReferrersList(referrersCache);
}

function renderReferrersList(list) {
    const cards = list.length ? list.map(r => `
        <button type="button" class="cns-ref-card cns-fade-in cns-ref-card-btn" data-id="${r.id}">
            ${avatarEl(r.full_name, r.photo, 'lg')}
            <div class="cns-ref-info">
                <h3>${r.full_name}</h3>
                <p>${r.members_count} membre${r.members_count > 1 ? 's' : ''} affecté${r.members_count > 1 ? 's' : ''}</p>
            </div>
            <span class="cns-chevron">›</span>
        </button>`).join('') : '<p class="cns-empty">Aucun référent affecté</p>';

    renderShell('referrers', `
        ${filterBar({
            searchId: 'ref-search',
            sortId: 'ref-sort',
            sortOptions: [
                { value: 'name', label: 'Nom (A→Z)' },
                { value: 'members', label: 'Membres (↓)' },
                { value: 'rate', label: 'Taux de présence (↓)' },
            ],
        })}
        <div class="cns-ref-grid" id="ref-grid">${cards}</div>`);

    bindReferrerFilters();
}

function bindReferrerFilters() {
    const search = document.getElementById('ref-search');
    const sort = document.getElementById('ref-sort');

    const apply = () => {
        let list = [...referrersCache];
        const q = (search?.value || '').toLowerCase().trim();
        if (q) list = list.filter(r => r.full_name.toLowerCase().includes(q));

        const s = sort?.value || 'name';
        if (s === 'name') list.sort((a, b) => a.full_name.localeCompare(b.full_name));
        else if (s === 'members') list.sort((a, b) => b.members_count - a.members_count);
        else if (s === 'rate') list.sort((a, b) => b.avg_attendance_rate - a.avg_attendance_rate);

        const grid = document.getElementById('ref-grid');
        if (!grid) return;
        grid.innerHTML = list.length ? list.map(r => `
            <button type="button" class="cns-ref-card cns-fade-in cns-ref-card-btn" data-id="${r.id}">
                ${avatarEl(r.full_name, r.photo, 'lg')}
                <div class="cns-ref-info">
                    <h3>${r.full_name}</h3>
                    <p>${r.members_count} membre${r.members_count > 1 ? 's' : ''} affecté${r.members_count > 1 ? 's' : ''}</p>
                </div>
                <span class="cns-chevron">›</span>
            </button>`).join('') : '<p class="cns-empty">Aucun résultat</p>';

        grid.querySelectorAll('[data-id]').forEach(el => {
            el.addEventListener('click', () => import('../app.js').then(m => m.router.navigate(`/referents/${el.dataset.id}`)));
        });
    };

    search?.addEventListener('input', apply);
    sort?.addEventListener('change', apply);
    document.querySelectorAll('[data-id]').forEach(el => {
        el.addEventListener('click', () => import('../app.js').then(m => m.router.navigate(`/referents/${el.dataset.id}`)));
    });
}
