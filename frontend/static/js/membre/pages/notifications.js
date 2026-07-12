import { renderShell } from '../core/layout.js';
import { api } from '../core/api.js';
import { formatDateTime } from '../core/components.js';

function notifClass(n) {
    const base = `fp-notif-item ${n.is_read ? '' : 'unread'}`;
    if (n.notification_type === 'member_absence') return `${base} fp-notif-absence`;
    return base;
}

function notifBadge(n) {
    if (n.is_read) return '';
    if (n.notification_type === 'member_absence') {
        return '<span class="fp-notif-badge">Absence</span>';
    }
    return '<span class="fp-notif-badge">Nouveau</span>';
}

export async function renderNotifications(router) {
    if (!api.token) { router.navigate('/connexion'); return; }
    let notifs = [], unread = 0;
    try {
        const res = await api.getNotifications();
        notifs = res.data?.notifications || [];
        unread = res.data?.unread_count || 0;
    } catch {
        router.navigate('/connexion');
        return;
    }

    const content = `
        <div class="fp-notif-list fp-stagger">
            ${notifs.length ? notifs.map(n => `
                <div class="${notifClass(n)}" data-notif="${n.id}" data-read="${n.is_read}">
                    <div class="fp-notif-head">
                        <h3 class="fp-notif-title fp-break-words">${n.title}</h3>
                        ${notifBadge(n)}
                    </div>
                    <p class="fp-notif-msg fp-break-words">${n.message}</p>
                    <span class="fp-notif-time">${formatDateTime(n.created_at)}</span>
                </div>`).join('') : `
                <div class="fp-empty">
                    <p>Aucune notification pour le moment</p>
                </div>`}
        </div>
    `;

    renderShell('notifications', content, {
        router,
        title: 'Notifications',
        subtitle: unread ? `${unread} non lue(s)` : 'Tout est lu',
        unread,
    });

    document.querySelectorAll('[data-notif]').forEach(el => {
        el.addEventListener('click', async () => {
            if (el.dataset.read === 'true') return;
            try {
                await api.markNotificationRead(el.dataset.notif);
                el.dataset.read = 'true';
                el.classList.remove('unread');
                el.querySelector('.fp-notif-badge')?.remove();
            } catch { /* */ }
        });
    });
}
