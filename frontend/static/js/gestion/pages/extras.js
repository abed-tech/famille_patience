import { renderShell } from '../core/layout.js';
import { api, list } from '../core/api.js';
import { createChart, destroyCharts, formatDateTime, emptyState, toast, modal, confirmModal } from '../core/components.js';

export async function renderStats() {
    if (!api.token) return;
    let data;
    try {
        data = (await api.getDashboard()).data;
    } catch (e) {
        toast(e.message || 'Impossible de charger les statistiques');
        return;
    }
    const c = data.charts || {};

    renderShell('stats', `
        <div class="adm-page-header"><div><h2>Centre d'analyse</h2><p>Statistiques détaillées de la plateforme</p></div></div>
        <div class="adm-filters">
            <button class="adm-filter-chip active">30 jours</button>
            <button class="adm-filter-chip">90 jours</button>
            <button class="adm-filter-chip">12 mois</button>
        </div>
        <div class="adm-charts-grid">
            <div class="adm-chart-card"><h3>Inscriptions</h3><div class="adm-chart-wrap"><canvas id="s-reg"></canvas></div></div>
            <div class="adm-chart-card"><h3>Présences</h3><div class="adm-chart-wrap"><canvas id="s-att"></canvas></div></div>
            <div class="adm-chart-card"><h3>Genre</h3><div class="adm-chart-wrap"><canvas id="s-gen"></canvas></div></div>
            <div class="adm-chart-card"><h3>Âge</h3><div class="adm-chart-wrap"><canvas id="s-age"></canvas></div></div>
            <div class="adm-chart-card"><h3>Pôles</h3><div class="adm-chart-wrap"><canvas id="s-pole"></canvas></div></div>
            <div class="adm-chart-card"><h3>Événements</h3><div class="adm-chart-wrap"><canvas id="s-ev"></canvas></div></div>
        </div>`);

    destroyCharts();
    createChart('s-reg', 'line', c.registrations?.map(x => x.label), c.registrations?.map(x => x.value));
    createChart('s-att', 'bar', c.attendances?.map(x => x.label), c.attendances?.map(x => x.value), '#10b981');
    createChart('s-gen', 'doughnut', c.gender?.map(x => x.label), c.gender?.map(x => x.value));
    createChart('s-age', 'bar', c.age?.map(x => x.label), c.age?.map(x => x.value), '#8b5cf6');
    createChart('s-pole', 'bar', c.poles?.map(x => x.label), c.poles?.map(x => x.value), '#f59e0b');
    createChart('s-ev', 'line', c.events?.map(x => x.label), c.events?.map(x => x.value), '#3b82f6');
}

export async function renderActivity() {
    if (!api.token) return;
    let entries = [];
    try { entries = list(await api.getActivityLog()); } catch { /* */ }

    renderShell('activity', `
        <div class="adm-page-header"><div><h2>Journal d'activité</h2><p>Historique complet des actions</p></div></div>
        <div class="adm-filters">
            <input class="adm-input" style="max-width:280px" id="act-search" placeholder="Rechercher...">
        </div>
        <div class="adm-card">
            <div class="adm-table-wrap">
                <table class="adm-table" id="act-table">
                    <thead><tr><th>Utilisateur</th><th>Action</th><th>Objet</th><th>Date</th></tr></thead>
                    <tbody>${entries.map(e => `<tr>
                        <td style="font-weight:500">${e.user}</td>
                        <td><span class="adm-badge adm-badge-primary">${e.action}</span></td>
                        <td style="color:var(--adm-text-muted);font-size:12px">${e.object}</td>
                        <td style="font-size:12px;color:var(--adm-text-muted)">${formatDateTime(e.datetime)}</td>
                    </tr>`).join('') || `<tr><td colspan="4">${emptyState('Aucune activité')}</td></tr>`}</tbody>
                </table>
            </div>
        </div>`);

    document.getElementById('act-search')?.addEventListener('input', e => {
        const q = e.target.value.toLowerCase();
        document.querySelectorAll('#act-table tbody tr').forEach(r => {
            r.style.display = r.textContent.toLowerCase().includes(q) ? '' : 'none';
        });
    });
}

export async function renderNotifications() {
    if (!api.token) return;
    let notifs = [];
    try { const r = await api.getNotifications(); notifs = r.data?.notifications || list(r); } catch { /* */ }

    renderShell('notifications', `
        <div class="adm-page-header">
            <div><h2>Notifications</h2><p>${notifs.length} notification(s)</p></div>
            <button class="adm-btn adm-btn-primary" disabled>Envoyer (bientôt)</button>
        </div>
        <div class="adm-card">
            ${notifs.length ? notifs.map(n => `
                <div style="padding:16px 20px;border-bottom:1px solid var(--adm-border-light);display:flex;justify-content:space-between;gap:12px">
                    <div><div style="font-weight:500;font-size:13px">${n.title}</div><div style="font-size:12px;color:var(--adm-text-muted);margin-top:2px">${n.message}</div></div>
                    <span class="adm-badge ${n.is_read ? 'adm-badge-neutral' : 'adm-badge-primary'}">${n.is_read ? 'Lu' : 'Non lu'}</span>
                </div>`).join('') : emptyState('Aucune notification')}
        </div>`);
}

export async function renderReports() {
    if (!api.token) return;

    const periods = [
        { label: 'Aujourd\'hui', key: 'daily' },
        { label: 'Cette semaine', key: 'weekly' },
        { label: 'Ce mois', key: 'monthly' },
        { label: 'Cette année', key: 'yearly' },
        { label: 'Personnalisé', key: 'custom' },
    ];
    const modules = [
        { label: 'Complet', key: 'all' },
        { label: 'Membres', key: 'members' },
        { label: 'Inscriptions', key: 'registrations' },
        { label: 'Présences', key: 'attendance' },
        { label: 'Événements', key: 'events' },
        { label: 'Référents', key: 'referrers' },
        { label: 'Conseillers', key: 'counsellors' },
        { label: 'Pôles FP', key: 'poles' },
        { label: 'Départements', key: 'departments' },
        { label: 'Professions', key: 'professions' },
    ];

    let state = { period: 'monthly', module: 'all', startDate: '', endDate: '' };

    renderShell('reports', `
        <div class="adm-page-header">
            <div><h2>Rapports</h2><p>Consultez, filtrez et exportez les rapports de la plateforme</p></div>
        </div>
        <div class="adm-card" style="padding:20px;margin-bottom:20px">
            <div class="adm-filters" style="margin-bottom:16px" id="rpt-periods">
                ${periods.map(p => `<button type="button" class="adm-filter-chip ${p.key === state.period ? 'active' : ''}" data-period="${p.key}">${p.label}</button>`).join('')}
            </div>
            <div id="rpt-custom-range" class="hidden" style="display:flex;flex-wrap:wrap;gap:12px;margin-bottom:16px;align-items:flex-end">
                <div class="adm-form-group" style="margin:0">
                    <label class="adm-label">Date début</label>
                    <input type="date" class="adm-input" id="rpt-start">
                </div>
                <div class="adm-form-group" style="margin:0">
                    <label class="adm-label">Date fin</label>
                    <input type="date" class="adm-input" id="rpt-end">
                </div>
                <button type="button" class="adm-btn adm-btn-primary adm-btn-sm" id="rpt-apply-custom">Appliquer</button>
            </div>
            <div class="adm-form-group" style="margin-bottom:0">
                <label class="adm-label">Module</label>
                <select class="adm-input" id="rpt-module" style="max-width:320px">
                    ${modules.map(m => `<option value="${m.key}">${m.label}</option>`).join('')}
                </select>
            </div>
        </div>
        <div id="rpt-preview" class="adm-card" style="padding:20px;margin-bottom:20px">
            <p style="color:var(--adm-text-muted);font-size:13px">Chargement de l'aperçu…</p>
        </div>
        <div class="adm-card" style="padding:20px">
            <h3 style="font-weight:600;margin-bottom:12px">Exporter</h3>
            <p style="font-size:13px;color:var(--adm-text-muted);margin-bottom:16px">Formats professionnels avec tableaux structurés et statistiques</p>
            <div style="display:flex;flex-wrap:wrap;gap:10px">
                <button type="button" class="adm-btn adm-btn-primary" data-export="pdf">Télécharger PDF</button>
                <button type="button" class="adm-btn adm-btn-secondary" data-export="excel">Télécharger Excel</button>
                <button type="button" class="adm-btn adm-btn-secondary" data-export="csv">Télécharger CSV</button>
            </div>
        </div>`);

    const customEl = document.getElementById('rpt-custom-range');
    const previewEl = document.getElementById('rpt-preview');

    function toggleCustomRange() {
        const show = state.period === 'custom';
        customEl.classList.toggle('hidden', !show);
        customEl.style.display = show ? 'flex' : 'none';
    }

    async function loadPreview() {
        previewEl.innerHTML = '<p style="color:var(--adm-text-muted);font-size:13px">Chargement de l\'aperçu…</p>';
        try {
            const data = await api.getReportPreview({
                period: state.period,
                module: state.module,
                startDate: state.startDate,
                endDate: state.endDate,
            });
            previewEl.innerHTML = `
                <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;margin-bottom:16px">
                    <div>
                        <h3 style="font-weight:600">${data.module_label}</h3>
                        <p style="font-size:13px;color:var(--adm-text-muted)">${data.period_label} · ${data.start_display} → ${data.end_display}</p>
                    </div>
                </div>
                <div class="adm-stats-grid" style="margin-bottom:16px">
                    ${(data.summary || []).map(s => `
                        <div class="adm-stat-card">
                            <div class="adm-stat-value">${s.value}</div>
                            <div class="adm-stat-label">${s.label}</div>
                        </div>`).join('')}
                </div>
                ${data.preview_rows?.length ? `
                    <h4 style="font-size:13px;font-weight:600;margin-bottom:8px">Aperçu (${data.preview_rows.length} entrées)</h4>
                    <div style="overflow-x:auto">
                        <table class="adm-table">
                            <thead><tr><th>Libellé</th><th>Détail</th><th>Info</th></tr></thead>
                            <tbody>
                                ${data.preview_rows.map(r => `<tr><td>${r.label}</td><td>${r.detail}</td><td>${r.meta}</td></tr>`).join('')}
                            </tbody>
                        </table>
                    </div>` : '<p style="font-size:13px;color:var(--adm-text-muted)">Aucune donnée détaillée pour cette sélection.</p>'}`;
        } catch (e) {
            previewEl.innerHTML = `<p style="color:var(--adm-danger);font-size:13px">${e.message || 'Impossible de charger l\'aperçu'}</p>`;
        }
    }

    document.querySelectorAll('[data-period]').forEach(btn => {
        btn.addEventListener('click', () => {
            state.period = btn.dataset.period;
            document.querySelectorAll('[data-period]').forEach(b => b.classList.toggle('active', b === btn));
            toggleCustomRange();
            if (state.period !== 'custom') loadPreview();
        });
    });

    document.getElementById('rpt-module')?.addEventListener('change', e => {
        state.module = e.target.value;
        loadPreview();
    });

    document.getElementById('rpt-apply-custom')?.addEventListener('click', () => {
        state.startDate = document.getElementById('rpt-start')?.value || '';
        state.endDate = document.getElementById('rpt-end')?.value || '';
        if (!state.startDate || !state.endDate) {
            toast('Veuillez sélectionner une plage de dates');
            return;
        }
        loadPreview();
    });

    document.querySelectorAll('[data-export]').forEach(btn => {
        btn.addEventListener('click', async () => {
            if (state.period === 'custom' && (!state.startDate || !state.endDate)) {
                toast('Veuillez définir la plage de dates personnalisée');
                return;
            }
            const orig = btn.textContent;
            btn.disabled = true;
            btn.textContent = 'Génération…';
            try {
                await api.downloadReport({
                    period: state.period,
                    format: btn.dataset.export,
                    module: state.module,
                    startDate: state.startDate,
                    endDate: state.endDate,
                });
                toast('Rapport téléchargé');
            } catch (e) {
                toast(e.message || 'Erreur de génération');
            } finally {
                btn.disabled = false;
                btn.textContent = orig;
            }
        });
    });

    toggleCustomRange();
    loadPreview();
}

export async function renderPoles() {
    await renderReferenceCrud({
        pageId: 'poles',
        title: 'Pôles de la Famille Patience',
        entityLabel: 'pôle',
        columns: [
            { key: 'name', label: 'Nom' },
            { key: 'description', label: 'Description', muted: true },
            { key: 'is_active', label: 'Statut', badge: true },
        ],
        load: () => api.getPoles(),
        create: (d) => api.createPole(d),
        update: (id, d) => api.updatePole(id, d),
        remove: (id) => api.deletePole(id),
        formFields: (item) => `
            <div class="adm-form-group"><label class="adm-label">Nom *</label>
                <input class="adm-input" name="name" value="${item?.name || ''}" required></div>
            <div class="adm-form-group"><label class="adm-label">Description</label>
                <textarea class="adm-input" name="description" rows="2">${item?.description || ''}</textarea></div>
            <div class="adm-form-group"><label class="adm-label">Actif</label>
                <select class="adm-input" name="is_active">
                    <option value="true" ${item?.is_active !== false ? 'selected' : ''}>Actif</option>
                    <option value="false" ${item?.is_active === false ? 'selected' : ''}>Inactif</option>
                </select></div>`,
        parseForm: (fd) => ({
            name: fd.get('name'),
            description: fd.get('description') || '',
            is_active: fd.get('is_active') === 'true',
        }),
    });
}

export async function renderDepartments() {
    let churchPoles = [];
    try { churchPoles = list(await api.getChurchPoles()); } catch { /* */ }

    await renderReferenceCrud({
        pageId: 'departments',
        title: 'Départements (ministères)',
        entityLabel: 'département',
        columns: [
            { key: 'name', label: 'Nom' },
            { key: 'pole_name', label: 'Pôle église', muted: true },
            { key: 'is_active', label: 'Statut', badge: true },
        ],
        load: () => api.getDepartments(),
        create: (d) => api.createDepartment(d),
        update: (id, d) => api.updateDepartment(id, d),
        remove: (id) => api.deleteDepartment(id),
        formFields: (item) => `
            <div class="adm-form-group"><label class="adm-label">Nom *</label>
                <input class="adm-input" name="name" value="${item?.name || ''}" required></div>
            <div class="adm-form-group"><label class="adm-label">Pôle église *</label>
                <select class="adm-input" name="pole" required>
                    <option value="">Choisir</option>
                    ${churchPoles.map(p => `<option value="${p.id}" ${String(item?.pole) === String(p.id) ? 'selected' : ''}>${p.name}</option>`).join('')}
                </select></div>
            <div class="adm-form-group"><label class="adm-label">Description</label>
                <textarea class="adm-input" name="description" rows="2">${item?.description || ''}</textarea></div>
            <div class="adm-form-group"><label class="adm-label">Actif</label>
                <select class="adm-input" name="is_active">
                    <option value="true" ${item?.is_active !== false ? 'selected' : ''}>Actif</option>
                    <option value="false" ${item?.is_active === false ? 'selected' : ''}>Inactif</option>
                </select></div>`,
        parseForm: (fd) => ({
            name: fd.get('name'),
            pole: Number(fd.get('pole')),
            description: fd.get('description') || '',
            is_active: fd.get('is_active') === 'true',
        }),
    });
}

export async function renderProfessions() {
    await renderReferenceCrud({
        pageId: 'professions',
        title: 'Professions',
        entityLabel: 'profession',
        columns: [
            { key: 'name', label: 'Nom' },
            { key: 'is_active', label: 'Statut', badge: true },
        ],
        load: () => api.getProfessions(),
        create: (d) => api.createProfession(d),
        update: (id, d) => api.updateProfession(id, d),
        remove: (id) => api.deleteProfession(id),
        formFields: (item) => `
            <div class="adm-form-group"><label class="adm-label">Nom *</label>
                <input class="adm-input" name="name" value="${item?.name || ''}" required></div>
            <div class="adm-form-group"><label class="adm-label">Actif</label>
                <select class="adm-input" name="is_active">
                    <option value="true" ${item?.is_active !== false ? 'selected' : ''}>Actif</option>
                    <option value="false" ${item?.is_active === false ? 'selected' : ''}>Inactif</option>
                </select></div>`,
        parseForm: (fd) => ({
            name: fd.get('name'),
            is_active: fd.get('is_active') === 'true',
        }),
    });
}

async function renderReferenceCrud(cfg) {
    if (!api.token) return;
    let items = [];
    try { items = list(await cfg.load()); } catch (e) {
        toast(e.message || 'Impossible de charger les données');
    }

    const renderTable = () => items.map(item => `
        <tr data-id="${item.id}">
            ${cfg.columns.map(col => {
                if (col.badge) {
                    const active = item[col.key] !== false;
                    return `<td><span class="adm-badge ${active ? 'adm-badge-primary' : 'adm-badge-neutral'}">${active ? 'Actif' : 'Inactif'}</span></td>`;
                }
                const val = item[col.key] || '—';
                return `<td style="${col.muted ? 'color:var(--adm-text-muted);font-size:12px' : 'font-weight:500'}">${val}</td>`;
            }).join('')}
            <td style="text-align:right;white-space:nowrap">
                <button class="adm-btn adm-btn-secondary adm-btn-sm" data-edit="${item.id}">Modifier</button>
                <button class="adm-btn adm-btn-secondary adm-btn-sm" data-toggle="${item.id}">${item.is_active !== false ? 'Désactiver' : 'Activer'}</button>
                <button class="adm-btn adm-btn-secondary adm-btn-sm" data-delete="${item.id}">Supprimer</button>
            </td>
        </tr>`).join('');

    renderShell(cfg.pageId, `
        <div class="adm-page-header">
            <div><h2>${cfg.title}</h2><p>${items.length} élément(s)</p></div>
            <button class="adm-btn adm-btn-primary" id="ref-create">Nouveau ${cfg.entityLabel}</button>
        </div>
        <div class="adm-card">
            <div class="adm-table-wrap">
                <table class="adm-table" id="ref-table">
                    <thead><tr>
                        ${cfg.columns.map(c => `<th>${c.label}</th>`).join('')}
                        <th style="text-align:right">Actions</th>
                    </tr></thead>
                    <tbody>${renderTable() || `<tr><td colspan="${cfg.columns.length + 1}">${emptyState('Aucun élément')}</td></tr>`}</tbody>
                </table>
            </div>
        </div>`);

    const refresh = async () => {
        items = list(await cfg.load());
        const tbody = document.querySelector('#ref-table tbody');
        if (tbody) tbody.innerHTML = renderTable() || `<tr><td colspan="${cfg.columns.length + 1}">${emptyState('Aucun élément')}</td></tr>`;
        bindActions();
    };

    const openForm = (item = null) => {
        const overlay = modal(
            item ? `Modifier le ${cfg.entityLabel}` : `Nouveau ${cfg.entityLabel}`,
            `<form id="ref-form">${cfg.formFields(item)}</form>`,
            `<button class="adm-btn adm-btn-secondary adm-modal-cancel">Annuler</button>
             <button class="adm-btn adm-btn-primary" id="ref-save">${item ? 'Enregistrer' : 'Créer'}</button>`
        );
        overlay.querySelector('.adm-modal-cancel').onclick = () => overlay.remove();
        overlay.querySelector('#ref-save').onclick = async () => {
            const fd = new FormData(overlay.querySelector('#ref-form'));
            const payload = cfg.parseForm(fd);
            try {
                if (item) await cfg.update(item.id, payload);
                else await cfg.create(payload);
                toast(item ? 'Mis à jour' : 'Créé');
                overlay.remove();
                await refresh();
            } catch (e) {
                toast(e.message || 'Erreur');
            }
        };
    };

    const bindActions = () => {
        document.querySelectorAll('[data-edit]').forEach(btn => {
            btn.onclick = () => {
                const item = items.find(i => String(i.id) === btn.dataset.edit);
                if (item) openForm(item);
            };
        });
        document.querySelectorAll('[data-toggle]').forEach(btn => {
            btn.onclick = async () => {
                const item = items.find(i => String(i.id) === btn.dataset.toggle);
                if (!item) return;
                try {
                    await cfg.update(item.id, { is_active: item.is_active === false });
                    toast(item.is_active === false ? 'Activé' : 'Désactivé');
                    await refresh();
                } catch (e) { toast(e.message); }
            };
        });
        document.querySelectorAll('[data-delete]').forEach(btn => {
            btn.onclick = () => {
                const item = items.find(i => String(i.id) === btn.dataset.delete);
                if (!item) return;
                confirmModal('Supprimer', `Supprimer « ${item.name} » ? Si des membres y sont liés, l'élément sera désactivé.`, async () => {
                    try {
                        await cfg.remove(item.id);
                        toast('Supprimé ou désactivé');
                        await refresh();
                    } catch (e) { toast(e.message); }
                });
            };
        });
    };

    document.getElementById('ref-create')?.addEventListener('click', () => openForm());
    bindActions();
}

export async function renderSettings() {
    renderShell('settings', `
        <div class="adm-page-header"><div><h2>Paramètres</h2><p>Configuration de la plateforme</p></div></div>
        <div class="adm-grid-2">
            ${[
                ['Général', 'Nom, logo, fuseau horaire'],
                ['Sécurité', 'Mots de passe, sessions, JWT'],
                ['Rôles & permissions', 'Gestion des accès'],
                ['Cartes de membre', 'Modèle et champs affichés'],
                ['QR Codes', 'Format et préfixe'],
                ['Événements', 'Limite agents, durée'],
                ['Sauvegardes', 'Export base de données'],
                ['Personnalisation', 'Couleurs et thème'],
            ].map(([t, d]) => `
                <div class="adm-card" style="padding:20px;cursor:pointer;transition:all .2s" onmouseover="this.style.borderColor='var(--adm-primary)'" onmouseout="this.style.borderColor=''">
                    <h3 style="font-weight:600;font-size:14px">${t}</h3>
                    <p style="font-size:12px;color:var(--adm-text-muted);margin-top:4px">${d}</p>
                </div>`).join('')}
        </div>`);
}
