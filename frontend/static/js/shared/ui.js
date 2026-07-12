/**
 * UI partagé — transitions, skeleton, toasts, boutons
 */

let toastStack = null;

function ensureToastStack() {
    if (!toastStack) {
        toastStack = document.createElement('div');
        toastStack.className = 'fp-toast-stack';
        document.body.appendChild(toastStack);
    }
    return toastStack;
}

export function fpToast(message, type = 'info', duration = 3200) {
    const stack = ensureToastStack();
    const el = document.createElement('div');
    el.className = `fp-toast fp-toast-${type}`;
    const icon = type === 'success' ? '✓' : type === 'error' ? '!' : '•';
    el.innerHTML = `<span aria-hidden="true">${icon}</span><span>${message}</span>`;
    stack.appendChild(el);
    setTimeout(() => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(8px)';
        el.style.transition = 'opacity 200ms, transform 200ms';
        setTimeout(() => el.remove(), 220);
    }, duration);
}

export function setButtonLoading(btn, loading) {
    if (!btn) return;
    btn.disabled = loading;
    btn.classList.toggle('fp-btn-loading', loading);
    if (loading) btn.dataset.fpLabel = btn.textContent;
    else if (btn.dataset.fpLabel) btn.textContent = btn.dataset.fpLabel;
}

const CONTENT_SELECTORS = '.mb-content, .cns-content, .adm-content, .ptg-content';

function compactSkeleton(variant) {
    const cards = variant === 'list' ? 3 : 2;
    return `<div class="fp-skeleton-inline">${Array(cards).fill('<div class="fp-skeleton fp-skeleton-card"></div>').join('')}</div>`;
}

export function skeletonHtml(variant = 'dashboard', compact = false) {
    if (compact) return compactSkeleton(variant);
    if (variant === 'list') {
        return `<div class="fp-skeleton-wrap">${Array(4).fill('<div class="fp-skeleton fp-skeleton-card"></div>').join('')}</div>`;
    }
    if (variant === 'profile') {
        return `<div class="fp-skeleton-wrap">
            <div class="fp-skeleton-hero">
                <div class="fp-skeleton fp-skeleton-avatar"></div>
                <div style="flex:1"><div class="fp-skeleton fp-skeleton-line lg"></div><div class="fp-skeleton fp-skeleton-line sm"></div></div>
            </div>
            ${Array(2).fill('<div class="fp-skeleton fp-skeleton-card"></div>').join('')}
        </div>`;
    }
    return `<div class="fp-skeleton-wrap">
        <div class="fp-skeleton-hero">
            <div class="fp-skeleton fp-skeleton-avatar"></div>
            <div style="flex:1"><div class="fp-skeleton fp-skeleton-line lg"></div><div class="fp-skeleton fp-skeleton-line sm"></div></div>
        </div>
        ${Array(3).fill('<div class="fp-skeleton fp-skeleton-card"></div>').join('')}
    </div>`;
}

export function showSkeleton(variant = 'dashboard') {
    const app = document.getElementById('app');
    if (app) app.innerHTML = skeletonHtml(variant);
}

/** Skeleton uniquement dans la zone contenu — shell conservé */
export function showContentSkeleton(variant = 'dashboard') {
    const el = document.querySelector(CONTENT_SELECTORS);
    if (el) {
        el.innerHTML = skeletonHtml(variant, true);
        return;
    }
    showSkeleton(variant);
}

export function animatePageEnter(root) {
    const el = root || document.querySelector(CONTENT_SELECTORS);
    if (el) {
        el.classList.remove('fp-page-leave', 'fp-content-leave');
        el.classList.add('fp-page-enter');
    }
}

export function preparePageLeave() {
    return new Promise(resolve => {
        const content = document.querySelector(CONTENT_SELECTORS);
        if (!content) { resolve(); return; }
        content.classList.add('fp-content-leave');
        setTimeout(() => {
            content.classList.remove('fp-content-leave');
            resolve();
        }, 40);
    });
}

export function createNavigate(base, resolveFn) {
    return async function navigate(path, push = true) {
        await preparePageLeave();
        if (push) history.pushState({}, '', `${base}${path}`);
        resolveFn();
    };
}

export function bindInstantSearch(input, items, renderFn, filterFn) {
    if (!input) return;
    let timer;
    input.addEventListener('input', () => {
        clearTimeout(timer);
        timer = setTimeout(() => {
            const q = input.value.toLowerCase().trim();
            const filtered = q ? items.filter(i => filterFn(i, q)) : items;
            renderFn(filtered);
        }, 80);
    });
}

export function mountError(retryFn) {
    const content = document.querySelector(CONTENT_SELECTORS);
    const html = `
        <div class="fp-empty" style="min-height:40vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px">
            <p>Impossible de charger cette page</p>
            <button class="fp-btn fp-btn-primary" id="fp-retry">Réessayer</button>
        </div>`;
    if (content) content.innerHTML = html;
    else document.getElementById('app').innerHTML = html;
    document.getElementById('fp-retry')?.addEventListener('click', retryFn);
}
