import { renderLayout } from '../components/layout.js';
import { api } from '../api.js';
import { router } from '../app.js';

export async function renderMembers() {
    if (!api.token) { router.navigate('/login'); return; }

    let members = [];
    try {
        const res = await api.getMembers();
        members = res.results || res.data || [];
    } catch (err) {
        members = [];
    }

    const content = `
        <div class="flex items-center justify-between mb-6">
            <h2 class="text-xl font-bold text-gray-900">Membres</h2>
            <span class="text-sm text-gray-400">${members.length} résultat(s)</span>
        </div>
        <div class="space-y-3">
            ${members.length ? members.map(m => `
                <div class="card flex items-center gap-4 !p-4 hover:shadow-md transition-shadow cursor-pointer">
                    <div class="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 font-bold shrink-0">
                        ${m.first_name?.[0] || '?'}${m.last_name?.[0] || ''}
                    </div>
                    <div class="flex-1 min-w-0">
                        <p class="font-semibold text-gray-900 truncate">${m.full_name}</p>
                        <p class="text-xs text-gray-400">${m.member_number} · ${m.phone_primary || ''}</p>
                    </div>
                    <span class="text-xs px-2.5 py-1 rounded-full ${m.status === 'active' ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'}">
                        ${m.status === 'active' ? 'Actif' : m.status}
                    </span>
                </div>
            `).join('') : `
                <div class="card text-center py-12">
                    <p class="text-gray-400">Aucun membre trouvé</p>
                </div>
            `}
        </div>
    `;

    renderLayout(content, 'members');
}
