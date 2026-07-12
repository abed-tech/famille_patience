import { renderLayout } from '../components/layout.js';
import { api } from '../api.js';
import { router } from '../app.js';

export async function renderEvents() {
    if (!api.token) { router.navigate('/login'); return; }

    let events = [];
    try {
        const res = await api.getEvents();
        events = res.results || res.data || [];
    } catch {
        events = [];
    }

    const statusLabels = {
        draft: { label: 'Brouillon', class: 'bg-gray-100 text-gray-600' },
        open: { label: 'Ouvert', class: 'bg-green-50 text-green-600' },
        closed: { label: 'Fermé', class: 'bg-red-50 text-red-600' },
        cancelled: { label: 'Annulé', class: 'bg-yellow-50 text-yellow-600' },
    };

    const content = `
        <div class="flex items-center justify-between mb-6">
            <h2 class="text-xl font-bold text-gray-900">Événements</h2>
        </div>
        <div class="space-y-3">
            ${events.length ? events.map(e => {
                const st = statusLabels[e.status] || statusLabels.draft;
                return `
                    <div class="card !p-4 hover:shadow-md transition-shadow">
                        <div class="flex items-start justify-between gap-3">
                            <div>
                                <p class="font-semibold text-gray-900">${e.name}</p>
                                <p class="text-xs text-gray-400 mt-1">📍 ${e.location}</p>
                                <p class="text-xs text-gray-400">📅 ${e.date} · ${e.time?.slice(0, 5) || ''}</p>
                            </div>
                            <span class="text-xs px-2.5 py-1 rounded-full shrink-0 ${st.class}">${st.label}</span>
                        </div>
                        ${e.attendance_count !== undefined ? `
                            <div class="mt-3 pt-3 border-t border-gray-50 flex items-center gap-2 text-xs text-gray-500">
                                <span>✅ ${e.attendance_count} présence(s)</span>
                            </div>
                        ` : ''}
                    </div>
                `;
            }).join('') : `
                <div class="card text-center py-12">
                    <p class="text-gray-400">Aucun événement</p>
                </div>
            `}
        </div>
    `;

    renderLayout(content, 'events');
}
