import { renderShell } from '../core/layout.js';
import { api, list } from '../core/api.js';
import { avatar, toast, emptyState, modal, confirmModal } from '../core/components.js';
import { icons } from '../core/icons.js';

function photoEl(name, url) {
    if (url) {
        return `<img src="${url}" alt="" style="width:52px;height:52px;border-radius:50%;object-fit:cover;flex-shrink:0">`;
    }
    return avatar(name, '#8b5cf6');
}

async function showPromoteModal(targetRole) {
    const isReferrer = targetRole === 'referrer';
    const title = isReferrer ? 'Ajouter un référent' : 'Ajouter un conseiller';
    const roleLabel = isReferrer ? 'référent' : 'conseiller';

    let members = [];
    try {
        members = list(await api.getMembers()).filter(m =>
            m.has_account && m.user_role === 'member' && m.status === 'active'
        );
    } catch (e) {
        toast(e.message || 'Impossible de charger les membres');
        return;
    }

    if (!members.length) {
        toast('Aucun membre éligible. Seuls les membres inscrits avec un compte actif peuvent être promus.');
        return;
    }

    const body = `
        <p style="font-size:13px;color:var(--adm-text-muted);margin-bottom:16px">
            Choisissez un membre déjà inscrit. Il deviendra automatiquement son propre ${roleLabel}.
        </p>
        <div class="adm-form-group">
            <label class="adm-label">Membre *</label>
            <select class="adm-select" id="promote-member-select">
                <option value="">— Sélectionner un membre —</option>
                ${members.map(m => `<option value="${m.id}">${m.full_name} (${m.member_number})</option>`).join('')}
            </select>
        </div>
        <input class="adm-input" id="promote-search" placeholder="Filtrer la liste..." style="margin-top:8px">`;

    const m = modal(title, body, `<button class="adm-btn adm-btn-primary" id="promote-confirm">Promouvoir</button>`);

    const select = m.querySelector('#promote-member-select');
    const search = m.querySelector('#promote-search');
    const options = [...select.options].slice(1);

    search?.addEventListener('input', () => {
        const q = search.value.toLowerCase();
        select.innerHTML = '<option value="">— Sélectionner un membre —</option>';
        options.forEach(opt => {
            if (opt.textContent.toLowerCase().includes(q)) select.appendChild(opt.cloneNode(true));
        });
    });

    m.querySelector('#promote-confirm')?.addEventListener('click', () => {
        const memberId = select.value;
        if (!memberId) {
            toast('Veuillez sélectionner un membre');
            return;
        }
        const member = members.find(x => x.id === memberId);
        confirmModal(
            `Promouvoir ${roleLabel}`,
            `Confirmer la promotion de ${member?.full_name || 'ce membre'} en ${roleLabel} ?`,
            async () => {
                try {
                    const r = await api.promoteMember(memberId, targetRole);
                    toast(r.message || `Membre promu ${roleLabel}`);
                    m.remove();
                    if (isReferrer) renderReferrers();
                    else renderCounsellors();
                } catch (e) {
                    toast(e.message);
                }
            },
        );
    });
}

export async function renderReferrers() {
    if (!api.token) return;
    let referrers = [];
    try {
        referrers = list(await api.getReferrers());
    } catch (e) {
        toast(e.message || 'Impossible de charger les référents');
    }

    renderShell('referrers', `
        <div class="adm-page-header">
            <div><h2>Référents</h2><p>${referrers.length} référent(s)</p></div>
            <button class="adm-btn adm-btn-primary" id="btn-add-referrer">${icons.plus} Ajouter</button>
        </div>
        <div class="adm-staff-grid">
            ${referrers.length ? referrers.map(r => `
                <button type="button" class="adm-staff-card adm-clickable" data-id="${r.id}">
                    ${photoEl(r.full_name, r.photo)}
                    <div class="adm-staff-card-body">
                        <div class="adm-staff-card-name">${r.full_name}</div>
                        <div class="adm-staff-card-meta">${r.members_count} membre(s) affecté(s)</div>
                    </div>
                </button>`).join('') : emptyState('Aucun référent')}
        </div>`);

    document.getElementById('btn-add-referrer')?.addEventListener('click', () => showPromoteModal('referrer'));
    document.querySelectorAll('.adm-staff-card[data-id]').forEach(card => {
        card.addEventListener('click', () => {
            import('../app.js').then(m => m.router.navigate(`/referents/${card.dataset.id}`));
        });
    });
}

export async function renderCounsellors() {
    if (!api.token) return;
    let counsellors = [];
    try {
        counsellors = list(await api.getCounsellors());
    } catch (e) {
        toast(e.message || 'Impossible de charger les conseillers');
    }

    renderShell('counsellors', `
        <div class="adm-page-header">
            <div><h2>Conseillers</h2><p>${counsellors.length} conseiller(s)</p></div>
            <button class="adm-btn adm-btn-primary" id="btn-add-counsellor">${icons.plus} Ajouter</button>
        </div>
        <div class="adm-staff-grid">
            ${counsellors.length ? counsellors.map(c => `
                <button type="button" class="adm-staff-card adm-clickable" data-id="${c.id}">
                    ${photoEl(c.full_name, c.photo)}
                    <div class="adm-staff-card-body">
                        <div class="adm-staff-card-name">${c.full_name}</div>
                        <div class="adm-staff-card-meta">${c.referrers_count} référent(s) · ${c.members_count} membre(s)</div>
                    </div>
                </button>`).join('') : emptyState('Aucun conseiller')}
        </div>`);

    document.getElementById('btn-add-counsellor')?.addEventListener('click', () => showPromoteModal('counsellor'));
    document.querySelectorAll('.adm-staff-card[data-id]').forEach(card => {
        card.addEventListener('click', () => {
            import('../app.js').then(m => m.router.navigate(`/conseillers/${card.dataset.id}`));
        });
    });
}
