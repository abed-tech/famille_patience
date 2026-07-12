import { icons, NAV_ITEMS, PAGE_TITLES } from './icons.js';
import { api } from './api.js';
import { swapContent } from '../../shared/shell.js';
import {
    bottomNavHtml, bindBottomNav, refreshBottomNav, COUNSELLOR_BOTTOM_NAV,
} from '../../shared/bottom-nav.js';

let shellBound = false;

function updateCnsNav(pageId) {
    document.querySelectorAll('.cns-nav-link[data-nav]').forEach(link => {
        const id = NAV_ITEMS.find(i => i.path === link.dataset.nav)?.id;
        link.classList.toggle('active', id === pageId);
    });
}

export function renderShell(pageId, content, options = {}) {
    const user = api.getUser();
    const title = options.title || PAGE_TITLES[pageId] || 'Conseiller';

    const needsBack = !!options.back;
    const hasBack = !!document.getElementById('back-btn');
    if (document.querySelector('.cns-app') && needsBack === hasBack && swapContent('.cns-content', content)) {
        const titleEl = document.querySelector('.cns-topbar-title');
        if (titleEl) titleEl.textContent = title;
        const subEl = document.querySelector('.cns-topbar-sub');
        if (options.subtitle) {
            if (subEl) subEl.textContent = options.subtitle;
        } else {
            subEl?.remove();
        }
        updateCnsNav(pageId);
        refreshBottomNav(pageId, COUNSELLOR_BOTTOM_NAV);
        return;
    }

    shellBound = false;
    const initials = (user.first_name || user.email || 'C')[0].toUpperCase();

    document.getElementById('app').innerHTML = `
        <div class="cns-sidebar-overlay hidden" id="sidebar-overlay"></div>
        <div class="cns-app">
            <aside class="cns-sidebar" id="sidebar">
                <div class="cns-sidebar-brand">
                    <div class="cns-sidebar-logo">FP</div>
                    <div>
                        <div class="cns-sidebar-title">Famille Patience</div>
                        <div class="cns-sidebar-subtitle">Espace Conseiller</div>
                    </div>
                </div>
                <nav class="cns-nav">
                    ${NAV_ITEMS.map(item => {
                        if (item.section) return `<div class="cns-nav-section">${item.section}</div>`;
                        return `<a href="/conseiller${item.path}" class="cns-nav-link ${pageId === item.id ? 'active' : ''}" data-nav="${item.path}">
                            ${icons[item.icon] || ''}<span>${item.label}</span>
                        </a>`;
                    }).join('')}
                </nav>
                <div class="cns-sidebar-footer">
                    <div class="cns-user-chip">
                        <div class="cns-user-avatar">${initials}</div>
                        <div style="min-width:0">
                            <div class="cns-user-name">${user.full_name || user.email || ''}</div>
                            <div class="cns-user-role">Conseiller</div>
                        </div>
                    </div>
                    <button class="cns-nav-link" id="logout-btn" style="margin-top:4px;color:#ef4444">${icons.logout}<span>Déconnexion</span></button>
                </div>
            </aside>
            <div class="cns-main fp-has-bottom-nav">
                <header class="cns-topbar">
                    <div class="cns-topbar-left">
                        <button class="cns-icon-btn cns-mobile-toggle" id="menu-toggle">${icons.menu}</button>
                        ${options.back ? `<button class="cns-icon-btn" id="back-btn">${icons.arrowLeft}</button>` : ''}
                        <div>
                            <div class="cns-topbar-title">${title}</div>
                            ${options.subtitle ? `<div class="cns-topbar-sub">${options.subtitle}</div>` : ''}
                        </div>
                    </div>
                    <div class="cns-topbar-right">${options.action || ''}</div>
                </header>
                <main class="cns-content cns-fade-in fp-page-enter">${content}</main>
            </div>
            ${bottomNavHtml(COUNSELLOR_BOTTOM_NAV, pageId)}
        </div>`;

    bindShellEvents(options);
}

function bindShellEvents(options) {
    if (shellBound) return;
    shellBound = true;
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    const toggle = () => { sidebar?.classList.toggle('open'); overlay?.classList.toggle('hidden'); };
    document.getElementById('menu-toggle')?.addEventListener('click', toggle);
    overlay?.addEventListener('click', toggle);

    document.querySelectorAll('[data-nav]').forEach(link => {
        link.addEventListener('click', e => {
            e.preventDefault();
            import('../app.js').then(m => m.router.navigate(link.dataset.nav));
            sidebar?.classList.remove('open');
            overlay?.classList.add('hidden');
        });
    });

    document.getElementById('logout-btn')?.addEventListener('click', () => {
        api.clear();
        import('../app.js').then(m => m.router.navigate('/connexion'));
    });

    document.getElementById('back-btn')?.addEventListener('click', () => {
        if (options.onBack) options.onBack();
        else history.back();
    });

    bindBottomNav(path => import('../app.js').then(m => m.router.navigate(path)));
}
