import { renderShell } from '../core/layout.js';
import { api, isCounsellor } from '../core/api.js';
import { avatarHtml } from '../core/components.js';
import { bindStaffLinks } from './staff-dashboard.js';

export async function renderMyReferrers(router) {
    if (!api.token || !isCounsellor()) { router.navigate('/accueil'); return; }

    const data = (await api.getCounsellorDashboard()).data;
    const referrers = data.referrers || [];

    const content = `
        <div class="mb-form-group">
            <input class="mb-input" id="search-ref" placeholder="Rechercher un référent...">
        </div>
        <div id="ref-list">
            ${referrers.map(r => `
                <a class="mb-dash-card" href="/membre/mes-referents/${r.id}" data-link data-ref>
                    ${avatarHtml(r.full_name, r.photo, 48)}
                    <div class="mb-dash-card-body">
                        <h3>${r.full_name}</h3>
                        <p>${r.members_count} membre(s) · ${r.avg_attendance_rate}% présence moy.</p>
                    </div>
                </a>`).join('') || '<div class="mb-empty"><p>Aucun référent assigné</p></div>'}
        </div>`;

    renderShell('my-referrers', content, { router, title: 'Mes référents', subtitle: `${referrers.length} référent(s)` });

    document.getElementById('search-ref')?.addEventListener('input', e => {
        const lq = e.target.value.toLowerCase();
        document.querySelectorAll('[data-ref]').forEach(el => {
            el.style.display = el.textContent.toLowerCase().includes(lq) ? '' : 'none';
        });
    });
    bindStaffLinks(router);
}

export async function renderCounsellorReferrer(router, id) {
    if (!api.token || !isCounsellor()) { router.navigate('/accueil'); return; }

    let data;
    try {
        data = (await api.getCounsellorReferrer(id)).data;
    } catch {
        router.navigate('/mes-referents');
        return;
    }

    const r = data.referrer;
    const content = `
        <div class="mb-card" style="text-align:center;padding:24px">
            ${avatarHtml(r.full_name, r.photo, 80)}
            <h2 style="font-size:18px;font-weight:700;margin:12px 0 4px">${r.full_name}</h2>
            <p style="font-size:13px;color:var(--mb-text-muted)">${r.members_count} membre(s) accompagnés</p>
            <p style="font-size:15px;color:var(--mb-primary);font-weight:600;margin-top:8px">${r.avg_attendance_rate}% présence moyenne</p>
        </div>
        <p class="mb-section-title">Membres de ce référent</p>
        <div class="mb-card">
            ${(data.members || []).map(m => `
                <a class="mb-dash-card" href="/membre/mes-membres/${m.id}" data-link data-member-link="${m.id}" style="margin-bottom:8px">
                    ${avatarHtml(m.full_name, m.photo, 40)}
                    <div class="mb-dash-card-body">
                        <h3 style="font-size:13px">${m.full_name}</h3>
                        <p>${m.attendance_rate}% · ${m.status === 'active' ? 'Actif' : m.status}</p>
                    </div>
                </a>`).join('') || '<p class="mb-empty">Aucun membre</p>'}
        </div>`;

    renderShell('referrer-detail', content, {
        router,
        title: r.full_name,
        subtitle: 'Référent',
        back: true,
        onBack: () => router.navigate('/mes-referents'),
    });
    bindStaffLinks(router, `/mes-referents/${id}`);
    document.querySelectorAll('[data-member-link]').forEach(el => {
        el.addEventListener('click', e => {
            e.preventDefault();
            sessionStorage.setItem('mb_member_back', `/mes-referents/${id}`);
            router.navigate(`/mes-membres/${el.dataset.memberLink}`);
        });
    });
}
