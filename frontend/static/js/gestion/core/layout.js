import { icons, NAV_ITEMS, PAGE_TITLES } from './icons.js';
import { api } from './api.js';
import { swapContent, scrollToTopInstant } from '../../shared/shell.js';
import {
    bottomNavHtml, bindBottomNav, refreshBottomNav, ADMIN_BOTTOM_NAV,
} from '../../shared/bottom-nav.js';

let shellBound = false;

function updateAdmNav(pageId) {
    document.querySelectorAll('.adm-nav-link[data-nav]').forEach(link => {
        const id = NAV_ITEMS.find(i => i.path === link.dataset.nav)?.id;
        link.classList.toggle('active', id === pageId);
    });
}

function syncAdmBackButton(needsBack, onBack) {
    const left = document.querySelector('.adm-topbar-left');
    if (!left) return;
    const hasBack = !!document.getElementById('back-btn');
    if (needsBack && !hasBack) {
        left.querySelector('#menu-toggle')?.insertAdjacentHTML(
            'afterend',
            `<button class="adm-icon-btn" id="back-btn" title="Retour">${icons.arrowLeft}</button>`,
        );
    } else if (!needsBack && hasBack) {
        document.getElementById('back-btn')?.remove();
    }
    if (needsBack && onBack) {
        const backBtn = document.getElementById('back-btn');
        if (backBtn) backBtn.onclick = onBack;
    }
}

export function renderShell(pageId, content, options = {}) {
    const user = api.getUser();
    const title = options.title || PAGE_TITLES[pageId] || 'Administration';
    const needsBack = !!options.back;

    if (document.querySelector('.adm-app') && swapContent('.adm-content', content)) {
        const titleEl = document.querySelector('.adm-topbar-title');
        if (titleEl) titleEl.textContent = title;
        const subEl = document.querySelector('.adm-topbar-breadcrumb');
        if (options.subtitle) {
            if (subEl) subEl.textContent = options.subtitle;
            else document.querySelector('.adm-topbar-left div')?.insertAdjacentHTML('beforeend', `<div class="adm-topbar-breadcrumb">${options.subtitle}</div>`);
        } else {
            subEl?.remove();
        }
        syncAdmBackButton(needsBack, options.onBack);
        updateAdmNav(pageId);
        refreshBottomNav(pageId, ADMIN_BOTTOM_NAV);
        return;
    }

    shellBound = false;
    const initials = (user.first_name || user.email || 'A')[0].toUpperCase();

    document.getElementById('app').innerHTML = `
        <div class="adm-sidebar-overlay hidden" id="sidebar-overlay"></div>
        <div class="adm-app">
            <aside class="adm-sidebar" id="sidebar">
                <div class="adm-sidebar-brand">
                    <div class="adm-sidebar-logo">FP</div>
                    <div>
                        <div class="adm-sidebar-title">Famille Patience</div>
                        <div class="adm-sidebar-subtitle">Administration</div>
                    </div>
                </div>
                <nav class="adm-nav">
                    ${NAV_ITEMS.map(item => {
                        if (item.section) return `<div class="adm-nav-section">${item.section}</div>`;
                        return `<a href="/gestion${item.path}" class="adm-nav-link ${pageId === item.id ? 'active' : ''}" data-nav="${item.path}">
                            ${icons[item.icon] || ''}<span>${item.label}</span>
                        </a>`;
                    }).join('')}
                </nav>
                <div class="adm-sidebar-footer">
                    <div class="adm-user-chip">
                        <div class="adm-user-avatar">${initials}</div>
                        <div style="min-width:0">
                            <div class="adm-user-name" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${user.full_name || user.email || ''}</div>
                            <div class="adm-user-role">Administrateur</div>
                        </div>
                    </div>
                    <button class="adm-nav-link" id="logout-btn" style="margin-top:4px;color:#ef4444">${icons.logout}<span>Déconnexion</span></button>
                </div>
            </aside>
            <div class="adm-main fp-has-bottom-nav">
                <header class="adm-topbar">
                    <div class="adm-topbar-left">
                        <button class="adm-icon-btn adm-mobile-toggle" id="menu-toggle">${icons.menu}</button>
                        ${options.back ? `<button class="adm-icon-btn" id="back-btn" title="Retour">${icons.arrowLeft}</button>` : ''}
                        <div>
                            <div class="adm-topbar-title">${title}</div>
                            ${options.subtitle ? `<div class="adm-topbar-breadcrumb">${options.subtitle}</div>` : ''}
                        </div>
                    </div>
                    <div class="adm-topbar-right">
                        <div class="adm-search">
                            ${icons.search}
                            <input type="search" placeholder="Rechercher..." id="global-search">
                        </div>
                        <button class="adm-icon-btn" id="notif-btn" title="Notifications">
                            ${icons.bell}
                            ${options.unread ? '<span class="adm-badge-dot"></span>' : ''}
                        </button>
                        ${options.action || ''}
                    </div>
                </header>
                <main class="adm-content fp-page-enter">${content}</main>
            </div>
            ${bottomNavHtml(ADMIN_BOTTOM_NAV, pageId)}
        </div>`;

    scrollToTopInstant();
    bindShellEvents(options);
}

function setAdmSidebarOpen(open) {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    sidebar?.classList.toggle('open', open);
    overlay?.classList.toggle('hidden', !open);
    document.body.classList.toggle('fp-scroll-lock', open);
}

function bindShellEvents(options = {}) {
    if (shellBound) return;
    shellBound = true;
    const toggle = () => {
        const open = !document.getElementById('sidebar')?.classList.contains('open');
        setAdmSidebarOpen(open);
    };
    document.getElementById('menu-toggle')?.addEventListener('click', toggle);
    document.getElementById('sidebar-overlay')?.addEventListener('click', () => setAdmSidebarOpen(false));

    document.querySelectorAll('[data-nav]').forEach(link => {
        link.addEventListener('click', e => {
            e.preventDefault();
            import('../app.js').then(m => m.router.navigate(link.dataset.nav));
            setAdmSidebarOpen(false);
        });
    });

    document.getElementById('logout-btn')?.addEventListener('click', () => {
        api.clear();
        import('../app.js').then(m => m.router.navigate('/connexion'));
    });

    document.getElementById('notif-btn')?.addEventListener('click', () => {
        import('../app.js').then(m => m.router.navigate('/notifications'));
    });

    document.getElementById('global-search')?.addEventListener('keydown', e => {
        if (e.key === 'Enter' && e.target.value.trim()) {
            import('../app.js').then(m => {
                sessionStorage.setItem('adm_search', e.target.value.trim());
                m.router.navigate('/membres');
            });
        }
    });

    if (options.onBack) {
        document.getElementById('back-btn')?.addEventListener('click', options.onBack);
    }

    bindBottomNav(
        path => import('../app.js').then(m => m.router.navigate(path)),
        { onMenu: () => setAdmSidebarOpen(true) },
    );
}
