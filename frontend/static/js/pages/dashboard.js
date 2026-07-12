import { renderLayout } from '../components/layout.js';
import { api } from '../api.js';
import { router } from '../app.js';

export async function renderDashboard() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (!api.token) { router.navigate('/login'); return; }

    let stats = {};
    try {
        const res = await api.getDashboard(user.role);
        stats = res.data;
    } catch {
        router.navigate('/login');
        return;
    }

    let content = '';

    if (user.role === 'admin') {
        const s = stats.summary || {};
        content = `
            <h2 class="text-xl font-bold text-gray-900 mb-6">Tableau de bord</h2>
            <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                ${statCard('Membres actifs', s.total_members, '👥', 'primary')}
                ${statCard('Nouveaux (30j)', s.new_members_30d, '✨', 'green')}
                ${statCard('Événements', s.total_events, '📅', 'blue')}
                ${statCard('Taux présence', s.attendance_rate_30d + '%', '📈', 'purple')}
            </div>
            <div class="grid lg:grid-cols-2 gap-6">
                <div class="card">
                    <h3 class="font-semibold text-gray-800 mb-4">Présences récentes</h3>
                    ${renderRecentList(stats.recent_attendances)}
                </div>
                <div class="card">
                    <h3 class="font-semibold text-gray-800 mb-4">Membres par pôle</h3>
                    ${renderPoleList(stats.members_by_family_pole)}
                </div>
            </div>
        `;
    } else if (user.role === 'counsellor') {
        content = `
            <h2 class="text-xl font-bold text-gray-900 mb-6">Espace Conseiller</h2>
            ${statCard('Membres supervisés', stats.total_members, '👥', 'primary')}
            <div class="card mt-6">
                <h3 class="font-semibold mb-4">Mes référents</h3>
                ${(stats.referrers || []).map(r => `
                    <div class="flex justify-between py-3 border-b border-gray-50 last:border-0">
                        <span class="text-sm font-medium">${r.name}</span>
                        <span class="text-xs bg-primary-50 text-primary-600 px-2 py-1 rounded-full">${r.member_count} membres</span>
                    </div>
                `).join('') || '<p class="text-gray-400 text-sm">Aucun référent assigné</p>'}
            </div>
        `;
    } else if (user.role === 'referrer') {
        content = `
            <h2 class="text-xl font-bold text-gray-900 mb-6">Espace Référent</h2>
            ${statCard('Mes membres', stats.total_members, '👥', 'primary')}
            <div class="card mt-6">
                <h3 class="font-semibold mb-4">Liste des membres</h3>
                ${(stats.members || []).map(m => `
                    <div class="flex justify-between py-3 border-b border-gray-50 last:border-0">
                        <span class="text-sm font-medium">${m.full_name}</span>
                        <span class="text-xs text-gray-400">${m.phone || ''}</span>
                    </div>
                `).join('') || '<p class="text-gray-400 text-sm">Aucun membre assigné</p>'}
            </div>
        `;
    } else {
        content = `
            <h2 class="text-xl font-bold text-gray-900 mb-6">Bienvenue, ${user.full_name || ''}</h2>
            <div class="card">
                <p class="text-gray-600 text-sm">Consultez vos événements et votre carte de membre.</p>
            </div>
        `;
    }

    renderLayout(content, 'dashboard');
}

function statCard(label, value, icon, color) {
    const colors = {
        primary: 'bg-primary-50 text-primary-600',
        green: 'bg-green-50 text-green-600',
        blue: 'bg-blue-50 text-blue-600',
        purple: 'bg-purple-50 text-purple-600',
    };
    return `
        <div class="stat-card">
            <div class="flex items-center justify-between mb-2">
                <span class="text-xs text-gray-500 font-medium">${label}</span>
                <span class="w-8 h-8 ${colors[color]} rounded-lg flex items-center justify-center text-sm">${icon}</span>
            </div>
            <p class="text-2xl font-bold text-gray-900">${value ?? '—'}</p>
        </div>
    `;
}

function renderRecentList(items) {
    if (!items?.length) return '<p class="text-gray-400 text-sm">Aucune présence récente</p>';
    return items.map(a => `
        <div class="flex justify-between py-2 border-b border-gray-50 last:border-0 text-sm">
            <span class="font-medium">${a.member}</span>
            <span class="text-gray-400 text-xs">${a.event}</span>
        </div>
    `).join('');
}

function renderPoleList(items) {
    if (!items?.length) return '<p class="text-gray-400 text-sm">Aucune donnée</p>';
    return items.map(p => `
        <div class="flex justify-between py-2 border-b border-gray-50 last:border-0 text-sm">
            <span>${p.family_pole__name}</span>
            <span class="font-semibold text-primary-600">${p.count}</span>
        </div>
    `).join('');
}
