import { renderShell } from '../core/layout.js';
import { api, list } from '../core/api.js';
import { avatar, statusBadge, formatDate, toast, emptyState, confirmModal } from '../core/components.js';
import { icons } from '../core/icons.js';
import { memberCardHtml, printMemberCard, downloadMemberCard } from '../../shared/member-card.js';

const GENDER = { M: 'Masculin', F: 'Féminin' };
const MARITAL = { single: 'Célibataire', married: 'Marié(e)', divorced: 'Divorcé(e)', widowed: 'Veuf/Veuve' };

function absUrl(url) {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    return `${location.origin}${url.startsWith('/') ? '' : '/'}${url}`;
}

function photoEl(name, url, size = 56) {
    const src = absUrl(url);
    if (src) {
        return `<img src="${src}" alt="" style="width:${size}px;height:${size}px;border-radius:50%;object-fit:cover;flex-shrink:0">`;
    }
    return avatar(name, '#8b5cf6');
}

function infoGrid(items) {
    return `<div class="adm-info-grid">${items.map(([label, val]) => `
        <div class="adm-info-item"><span class="adm-label">${label}</span><p>${val ?? '—'}</p></div>
    `).join('')}</div>`;
}

function staffProfileSection(person, roleLabel) {
    const baptized = person.is_baptized
        ? `Oui${person.baptism_year ? ` (${person.baptism_year})` : ''}`
        : 'Non';
    const icc = person.icc_modules_completed
        ? `Oui — module ${person.icc_module_level || '—'}`
        : 'Non';
    const church = person.serves_in_church
        ? (person.church_department || '—')
        : (person.interested_church_department ? `Intérêt : ${person.interested_church_department}` : 'Non');
    const family = person.serves_in_family
        ? (person.family_pole || '—')
        : (person.interested_family_pole ? `Intérêt : ${person.interested_family_pole}` : 'Non');

    return `
        <div class="adm-profile-hero">
            ${photoEl(person.full_name, person.photo, 72)}
            <div>
                <h2 style="font-size:20px;font-weight:700;margin:0">${person.full_name}</h2>
                <p style="font-size:13px;color:var(--adm-text-muted);margin:4px 0 0">${roleLabel}</p>
            </div>
        </div>
        <div class="adm-card" style="margin-top:20px">
            <div class="adm-card-header"><h3>Informations personnelles</h3></div>
            <div class="adm-card-body">
                ${infoGrid([
                    ['Nom', person.last_name],
                    ['Postnom', person.middle_name],
                    ['Prénom', person.first_name],
                    ['Sexe', GENDER[person.gender] || person.gender_label || '—'],
                    ['Date de naissance', person.date_of_birth ? formatDate(person.date_of_birth) : '—'],
                    ['Adresse', person.address],
                    ['Profession', person.profession],
                    ['Situation matrimoniale', MARITAL[person.marital_status] || person.marital_status_label],
                ])}
            </div>
        </div>
        <div class="adm-card" style="margin-top:16px">
            <div class="adm-card-header"><h3>Contact</h3></div>
            <div class="adm-card-body">
                ${infoGrid([
                    ['Téléphone principal', person.phone_primary || person.phone],
                    ['Téléphone secondaire', person.phone_secondary],
                    ['WhatsApp', person.whatsapp],
                    ['E-mail', person.member_email || person.email],
                ])}
            </div>
        </div>
        <div class="adm-card" style="margin-top:16px">
            <div class="adm-card-header"><h3>Vie chrétienne & service</h3></div>
            <div class="adm-card-body">
                ${infoGrid([
                    ['Baptisé(e)', baptized],
                    ['Modules ICC', icc],
                    ['Service Église', church],
                    ['Famille Patience', family],
                    ['N° membre', person.member_number],
                ])}
            </div>
        </div>`;
}

function memberListHtml(members, emptyMsg = 'Aucun membre affecté') {
    if (!members.length) return `<div class="adm-card" style="margin-top:16px;padding:24px">${emptyState(emptyMsg)}</div>`;
    return `
        <div class="adm-card" style="margin-top:16px">
            <div class="adm-card-header"><h3>Membres affectés (${members.length})</h3></div>
            <div class="adm-card-body adm-click-list">
                ${members.map(m => `
                    <button type="button" class="adm-click-row" data-member="${m.id}">
                        ${photoEl(m.full_name, m.photo, 44)}
                        <div style="flex:1;min-width:0;text-align:left">
                            <div style="font-weight:600;font-size:14px">${m.full_name}</div>
                            ${m.member_number ? `<div style="font-size:12px;color:var(--adm-text-muted)">${m.member_number}</div>` : ''}
                        </div>
                        ${statusBadge(m.status)}
                        ${icons.chevron}
                    </button>`).join('')}
            </div>
        </div>`;
}

function referrerListHtml(referrers, counsellorId) {
    if (!referrers.length) return `<div class="adm-card" style="margin-top:16px;padding:24px">${emptyState('Aucun référent affecté')}</div>`;
    return `
        <div class="adm-card" style="margin-top:16px">
            <div class="adm-card-header"><h3>Référents affectés (${referrers.length})</h3></div>
            <div class="adm-card-body adm-click-list">
                ${referrers.map(r => `
                    <button type="button" class="adm-click-row" data-referrer="${r.id}">
                        ${photoEl(r.full_name, r.photo, 44)}
                        <div style="flex:1;min-width:0;text-align:left">
                            <div style="font-weight:600;font-size:14px">${r.full_name}</div>
                            <div style="font-size:12px;color:var(--adm-text-muted)">${r.members_count} membre(s) affecté(s)</div>
                        </div>
                        ${icons.chevron}
                    </button>`).join('')}
            </div>
        </div>`;
}

function bindMemberClicks(container, backPath) {
    container?.querySelectorAll('[data-member]').forEach(btn => {
        btn.addEventListener('click', () => {
            if (backPath) sessionStorage.setItem('adm_member_back', backPath);
            else sessionStorage.removeItem('adm_member_back');
            import('../app.js').then(m => m.router.navigate(`/membres/${btn.dataset.member}`));
        });
    });
}

function bindReferrerClicks(container, counsellorId) {
    container?.querySelectorAll('[data-referrer]').forEach(btn => {
        btn.addEventListener('click', () => {
            import('../app.js').then(m => {
                const path = counsellorId
                    ? `/conseillers/${counsellorId}/referents/${btn.dataset.referrer}`
                    : `/referents/${btn.dataset.referrer}`;
                m.router.navigate(path);
            });
        });
    });
}

export async function renderReferrerDetail(id, options = {}) {
    if (!api.token) return;
    let data;
    try {
        data = (await api.getReferrer(id)).data;
    } catch (e) {
        toast(e.message || 'Référent introuvable');
        import('../app.js').then(m => m.router.navigate(options.backPath || '/referents'));
        return;
    }

    const r = data.referrer;
    const members = data.members || [];
    const backPath = options.backPath || '/referents';
    const currentPath = options.currentPath || `/referents/${id}`;
    const breadcrumb = options.breadcrumb || 'Référents';

    renderShell('referrer-detail', `
        ${staffProfileSection(r, 'Référent')}
        ${memberListHtml(members)}`,
        {
            back: true,
            title: r.full_name,
            subtitle: breadcrumb,
            onBack: () => import('../app.js').then(m => m.router.navigate(backPath)),
        });

    bindMemberClicks(document.querySelector('.adm-content'), currentPath);
}

export async function renderCounsellorDetail(id) {
    if (!api.token) return;
    let data;
    try {
        data = (await api.getCounsellor(id)).data;
    } catch (e) {
        toast(e.message || 'Conseiller introuvable');
        import('../app.js').then(m => m.router.navigate('/conseillers'));
        return;
    }

    const c = data.counsellor;
    const referrers = data.referrers || [];

    renderShell('counsellor-detail', `
        ${staffProfileSection(c, 'Conseiller')}
        ${referrerListHtml(referrers, id)}`,
        {
            back: true,
            title: c.full_name,
            subtitle: 'Conseillers',
            onBack: () => import('../app.js').then(m => m.router.navigate('/conseillers')),
        });

    bindReferrerClicks(document.querySelector('.adm-content'), id);
}

export async function renderMemberDetail(id, options = {}) {
    if (!api.token) return;
    let member, card;
    try {
        const [mRes, cRes] = await Promise.all([
            api.getMember(id),
            api.getMemberCard(id),
        ]);
        member = mRes.data;
        card = cRes.data;
        if (member.photo) member.photo = absUrl(member.photo);
        if (card.photo) card.photo = absUrl(card.photo);
    } catch (e) {
        toast(e.message || 'Membre introuvable');
        if (options.backPath) import('../app.js').then(m => m.router.navigate(options.backPath));
        else history.back();
        return;
    }

    const baptized = member.is_baptized
        ? `Oui${member.baptism_year ? ` (${member.baptism_year})` : ''}`
        : 'Non';
    const icc = member.icc_modules_completed
        ? `Oui — module ${member.icc_module_level || '—'}`
        : 'Non';
    const churchDept = member.serves_in_church
        ? (member.church_department_detail?.name || '—')
        : (member.interested_church_department_detail?.name
            ? `Intérêt : ${member.interested_church_department_detail.name}` : 'Non');
    const familyPole = member.serves_in_family
        ? (member.family_pole_detail?.name || '—')
        : (member.interested_family_pole_detail?.name
            ? `Intérêt : ${member.interested_family_pole_detail.name}` : 'Non');

    const userRole = member.user_role || 'member';
    const hasAccount = !!member.user_id;

    const backPath = options.backPath || sessionStorage.getItem('adm_member_back') || null;
    sessionStorage.removeItem('adm_member_back');
    const onBack = backPath
        ? () => import('../app.js').then(m => m.router.navigate(backPath))
        : () => history.back();

    renderShell('member-detail', `
        <div class="adm-profile-hero">
            ${photoEl(member.full_name, member.photo, 72)}
            <div>
                <h2 style="font-size:20px;font-weight:700;margin:0">${member.full_name}</h2>
                <p style="font-size:13px;color:var(--adm-text-muted);margin:4px 0 0">${member.member_number} · ${statusBadge(member.status)}</p>
                ${member.referrer_name ? `<p style="font-size:13px;margin:6px 0 0">Référent : ${member.referrer_name}</p>` : ''}
                ${!member.referrer_name && member.counsellor_name ? `<p style="font-size:13px;margin:6px 0 0">Conseiller : ${member.counsellor_name}</p>` : ''}
            </div>
        </div>
        <div class="adm-card" style="margin-top:20px;padding:24px">
            <div class="adm-card-header" style="margin-bottom:16px">
                <h3>Carte de membre</h3>
                <div style="display:flex;gap:8px;flex-wrap:wrap">
                    <button type="button" class="adm-btn adm-btn-secondary adm-btn-sm" id="card-print">Imprimer</button>
                    <button type="button" class="adm-btn adm-btn-secondary adm-btn-sm" id="card-download">Télécharger</button>
                </div>
            </div>
            <div style="display:flex;justify-content:center">${memberCardHtml(card)}</div>
        </div>
        ${hasAccount ? `
        <div class="adm-card" style="margin-top:16px;padding:20px">
            <h3 style="font-size:14px;font-weight:600;margin-bottom:12px">Rôle plateforme</h3>
            <p style="font-size:13px;color:var(--adm-text-muted);margin-bottom:12px">Rôle actuel : <strong>${roleLabel(userRole)}</strong></p>
            <div style="display:flex;gap:8px;flex-wrap:wrap">
                ${userRole !== 'referrer' ? `<button type="button" class="adm-btn adm-btn-secondary adm-btn-sm" id="promote-referrer">Promouvoir référent</button>` : ''}
                ${userRole !== 'counsellor' ? `<button type="button" class="adm-btn adm-btn-secondary adm-btn-sm" id="promote-counsellor">Promouvoir conseiller</button>` : ''}
                ${userRole !== 'member' ? `<button type="button" class="adm-btn adm-btn-ghost adm-btn-sm" id="demote-member">Rétrograder membre</button>` : ''}
            </div>
        </div>` : `
        <div class="adm-card" style="margin-top:16px;padding:16px;font-size:13px;color:var(--adm-text-muted)">
            Ce membre n'a pas de compte utilisateur — la promotion nécessite une inscription via l'application membre.
        </div>`}
        <div class="adm-card" style="margin-top:16px;padding:20px">
            <h3 style="font-size:14px;font-weight:600;margin-bottom:12px">Gestion du membre</h3>
            <div style="display:flex;gap:8px;flex-wrap:wrap">
                <button type="button" class="adm-btn adm-btn-primary adm-btn-sm" id="member-edit">Modifier</button>
                ${member.status === 'active' ? `<button type="button" class="adm-btn adm-btn-secondary adm-btn-sm" id="member-suspend">Suspendre</button>` : ''}
                ${member.status === 'suspended' || member.status === 'inactive' ? `<button type="button" class="adm-btn adm-btn-secondary adm-btn-sm" id="member-reactivate">Réactiver</button>` : ''}
                ${member.status !== 'inactive' ? `<button type="button" class="adm-btn adm-btn-danger adm-btn-sm" id="member-delete">Désactiver</button>` : ''}
            </div>
        </div>
        <div class="adm-grid-2" style="margin-top:16px;gap:16px">
            <div class="adm-card">
                <div class="adm-card-header"><h3>Informations personnelles</h3></div>
                <div class="adm-card-body">
                    ${infoGrid([
                        ['Nom', member.last_name],
                        ['Postnom', member.middle_name],
                        ['Prénom', member.first_name],
                        ['Sexe', GENDER[member.gender] || '—'],
                        ['Date de naissance', member.date_of_birth ? formatDate(member.date_of_birth) : '—'],
                        ['Adresse', member.address],
                        ['Profession', member.profession_name || member.profession],
                        ['Situation matrimoniale', MARITAL[member.marital_status] || member.marital_status],
                    ])}
                </div>
            </div>
            <div class="adm-card">
                <div class="adm-card-header"><h3>Contact & affectation</h3></div>
                <div class="adm-card-body">
                    ${infoGrid([
                        ['Téléphone principal', member.phone_primary],
                        ['Téléphone secondaire', member.phone_secondary],
                        ['WhatsApp', member.whatsapp],
                        ['E-mail', member.email],
                        ['Référent', member.referrer_name],
                        ['Conseiller', member.counsellor_name],
                    ])}
                </div>
            </div>
        </div>
        <div class="adm-card" style="margin-top:16px">
            <div class="adm-card-header"><h3>Vie chrétienne & service</h3></div>
            <div class="adm-card-body">
                ${infoGrid([
                    ['Baptisé(e)', baptized],
                    ['Modules ICC', icc],
                    ['Département Église', churchDept],
                    ['Pôle Famille Patience', familyPole],
                ])}
            </div>
        </div>`,
        {
            back: true,
            title: member.full_name,
            subtitle: options.breadcrumb || 'Membre',
            onBack,
        });

    document.getElementById('card-print')?.addEventListener('click', () => printMemberCard(card));
    document.getElementById('card-download')?.addEventListener('click', () => downloadMemberCard(card));

    document.getElementById('member-edit')?.addEventListener('click', () => {
        import('../app.js').then(m => m.router.navigate(`/membres/${id}/modifier`));
    });

    document.getElementById('member-suspend')?.addEventListener('click', () => {
        confirmModal(
            'Suspendre le membre',
            `${member.full_name} ne pourra plus accéder à l'application tant qu'il est suspendu.`,
            async () => {
                try {
                    const r = await api.memberAction(id, 'suspend');
                    toast(r.message || 'Membre suspendu');
                    renderMemberDetail(id, options);
                } catch (e) { toast(e.message); }
            },
        );
    });

    document.getElementById('member-reactivate')?.addEventListener('click', () => {
        confirmModal(
            'Réactiver le membre',
            `Réactiver ${member.full_name} et lui redonner l'accès ?`,
            async () => {
                try {
                    const r = await api.memberAction(id, 'reactivate');
                    toast(r.message || 'Membre réactivé');
                    renderMemberDetail(id, options);
                } catch (e) { toast(e.message); }
            },
        );
    });

    document.getElementById('member-delete')?.addEventListener('click', () => {
        confirmModal(
            'Désactiver le membre',
            `${member.full_name} sera désactivé (soft-delete). Cette action est réversible via « Réactiver ».`,
            async () => {
                try {
                    const r = await api.memberAction(id, 'delete');
                    toast(r.message || 'Membre désactivé');
                    import('../app.js').then(m => m.router.navigate('/membres'));
                } catch (e) { toast(e.message); }
            },
        );
    });

    document.getElementById('promote-referrer')?.addEventListener('click', () => {
        confirmModal('Promouvoir référent', `${member.full_name} deviendra référent et son propre référent.`, async () => {
            try {
                const r = await api.promoteMember(id, 'referrer');
                toast(r.message || 'Promu référent');
                renderMemberDetail(id, options);
            } catch (e) { toast(e.message); }
        });
    });
    document.getElementById('promote-counsellor')?.addEventListener('click', () => {
        confirmModal('Promouvoir conseiller', `${member.full_name} deviendra conseiller et son propre conseiller.`, async () => {
            try {
                const r = await api.promoteMember(id, 'counsellor');
                toast(r.message || 'Promu conseiller');
                renderMemberDetail(id, options);
            } catch (e) { toast(e.message); }
        });
    });
    document.getElementById('demote-member')?.addEventListener('click', () => {
        confirmModal(
            'Rétrograder en membre',
            `Remettre ${member.full_name} au rôle membre ? Il perdra toutes ses autorisations (membres assignés, supervisions, pointage).`,
            async () => {
                try {
                    const r = await api.promoteMember(id, 'member');
                    toast(r.message || 'Rôle membre restauré');
                    renderMemberDetail(id, options);
                } catch (e) { toast(e.message); }
            },
        );
    });
}

function roleLabel(role) {
    return { member: 'Membre', referrer: 'Référent', counsellor: 'Conseiller', admin: 'Administrateur' }[role] || role;
}
