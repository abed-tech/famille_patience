import { renderShell } from '../core/layout.js';
import { api, isCounsellor, isReferrer, setAgentFromDashboard } from '../core/api.js';
import { formatDate, avatarHtml } from '../core/components.js';
import { icons as ic, cardIconHtml } from '../core/icons.js';

function roleLabel() {
    if (isCounsellor()) return 'Conseiller';
    if (isReferrer()) return 'Référent';
    return 'Membre';
}

function homeCard(label, desc, path, iconKey) {
    return `
        <a class="mb-home-card fp-card-interactive" href="/membre${path}" data-go="${path}">
            ${cardIconHtml(iconKey)}
            <div class="mb-home-card-body">
                <span class="mb-home-card-label">${label}</span>
                <p class="mb-home-card-desc">${desc}</p>
            </div>
            ${ic.chevron}
        </a>`;
}

export async function renderHome(router) {
    if (!api.token) { router.navigate('/connexion'); return; }

    let dash, notifs = [], staffStats = null;
    try {
        dash = (await api.getMyDashboard()).data;
        if (dash.user_role) {
            api.setUser({ ...api.getUser(), role: dash.user_role });
        }
        const notifP = api.getNotifications()
            .then(r => r.data?.notifications?.slice(0, 3) || [])
            .catch(() => []);
        let staffP = Promise.resolve(null);
        if (isReferrer()) {
            staffP = api.getReferrerDashboard().then(r => r.data?.stats || null).catch(() => null);
        } else if (isCounsellor()) {
            staffP = api.getCounsellorDashboard().then(r => r.data?.stats || null).catch(() => null);
        }
        [notifs, staffStats] = await Promise.all([notifP, staffP]);
    } catch {
        router.navigate('/connexion');
        return;
    }

    const counsellor = dash.counsellor ?? null;

    const p = dash.profile || {};
    const s = dash.stats || {};
    const ref = dash.referrer || counsellor;
    const next = dash.next_event;
    const unread = s.unread_notifications || 0;
    setAgentFromDashboard(dash);

    const agentEvents = dash.active_agent_events || [];

    const supervisorCard = !isCounsellor() ? `
        <a class="mb-home-card fp-card-interactive" href="/membre${isReferrer() ? '/mon-conseiller' : '/mon-referent'}" data-go="${isReferrer() ? '/mon-conseiller' : '/mon-referent'}">
            ${cardIconHtml('user')}
            <div class="mb-home-card-body">
                <span class="mb-home-card-label">${isReferrer() ? 'Mon conseiller' : 'Mon référent'}</span>
                ${ref
                    ? `<div class="mb-home-ref">${avatarHtml(ref.full_name, ref.photo, 40)}<strong>${ref.full_name}</strong></div>`
                    : '<p class="mb-home-card-desc">Non assigné</p>'}
            </div>
            ${ic.chevron}
        </a>` : '';

    const staffCards = isReferrer()
        ? `
            ${homeCard('Mes membres', `${staffStats?.total_members ?? 0} membre(s) sous ma responsabilité`, '/mes-membres', 'user')}
            ${homeCard('Suivi d\'encadrement', `Présence moy. ${staffStats?.avg_attendance_rate ?? 0}%`, '/encadrement', 'chart')}`
        : isCounsellor()
            ? `
            ${homeCard('Mes référents', `${staffStats?.total_referrers ?? 0} référent(s) assigné(s)`, '/mes-referents', 'user')}
            ${homeCard('Suivi d\'encadrement', `${staffStats?.total_members ?? 0} membre(s) supervisés`, '/encadrement', 'chart')}`
            : '';

    const content = `
        <div class="mb-home-hero fp-stagger">
            ${avatarHtml(p.full_name, p.photo, 72)}
            <div>
                <h2 class="mb-home-name">${p.full_name || p.first_name}</h2>
                <p class="mb-home-num">${p.member_number || ''}</p>
                ${(isReferrer() || isCounsellor()) ? `<span class="mb-home-role-badge">${roleLabel()}</span>` : ''}
            </div>
        </div>

        ${staffCards}
        ${supervisorCard}

        <a class="mb-home-card fp-card-interactive" href="/membre/carte" data-go="/carte">
            ${cardIconHtml('card')}
            <div class="mb-home-card-body">
                <span class="mb-home-card-label">Ma carte de membre</span>
                <p class="mb-home-card-desc">Afficher ma carte et mon QR Code</p>
            </div>
            ${ic.chevron}
        </a>

        <a class="mb-home-card fp-card-interactive" href="/membre/evenements" data-go="/evenements">
            ${cardIconHtml('calendar')}
            <div class="mb-home-card-body">
                <span class="mb-home-card-label">Prochain événement</span>
                <p class="mb-home-card-desc">${next ? `${next.name} — ${formatDate(next.date)}` : 'Aucun événement à venir'}</p>
            </div>
            ${ic.chevron}
        </a>

        ${dash.has_agent_access ? `
        <a class="mb-home-card fp-card-interactive mb-home-card-agent" href="/membre/evenements" data-go="/evenements">
            ${cardIconHtml('calendar')}
            <div class="mb-home-card-body">
                <span class="mb-home-card-label">Mes événements</span>
                <p class="mb-home-card-desc">Agent pointeur — ${agentEvents.length === 1 ? agentEvents[0].name : `${agentEvents.length} événement(s)`}</p>
            </div>
            ${ic.chevron}
        </a>` : ''}

        <div class="mb-home-card mb-home-card-static fp-card">
            ${cardIconHtml('chart')}
            <div class="mb-home-card-body">
                <span class="mb-home-card-label">Mon taux de présence</span>
                <p class="mb-home-rate">${s.attendance_rate ?? 0}<span>%</span></p>
            </div>
        </div>

        ${notifs.length ? `
        <div class="mb-home-section">
            <div class="mb-home-section-head">
                <span>Notifications récentes</span>
                <a href="/membre/notifications" data-go="/notifications" class="mb-link">Tout voir</a>
            </div>
            <div class="mb-home-notifs">
                ${notifs.map(n => `
                    <div class="mb-home-notif ${n.is_read ? '' : 'unread'}">
                        <strong>${n.title}</strong>
                        <p>${n.message}</p>
                    </div>`).join('')}
            </div>
        </div>` : ''}
    `;

    renderShell('home', content, {
        router,
        header: p,
        title: p.first_name ? `Bonjour, ${p.first_name}` : 'Tableau de bord',
        subtitle: roleLabel(),
        unread,
    });

    document.querySelectorAll('[data-go]').forEach(el => {
        el.addEventListener('click', e => {
            e.preventDefault();
            router.navigate(el.dataset.go);
        });
    });
}
