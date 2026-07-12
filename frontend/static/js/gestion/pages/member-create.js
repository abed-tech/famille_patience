import { renderShell } from '../core/layout.js';
import { api, list } from '../core/api.js';
import { toast } from '../core/components.js';
import { router } from '../app.js';
import {
    ADMIN_REGISTRATION_STEPS,
    saveFormData,
    validateRegistrationStep,
    buildRegistrationPayload,
    fillSelect,
    bindFaithConditionals,
    bindChurchConditionals,
    bindFamilyConditionals,
    renderRegistrationStepHtml,
    bindPhotoUpload,
} from '../../shared/member-registration.js';

const data = {};
let photoFile = null;
let professionsCache = [];
let departmentsCache = [];
let familyPolesCache = [];

export function renderMemberCreate(step = 0) {
    if (!api.token) return;

    const steps = ADMIN_REGISTRATION_STEPS;
    const total = steps.length;
    const stepKey = steps[step].key;
    const progress = ((step + 1) / total) * 100;

    renderShell('members', `
        <div class="adm-page-header">
            <div>
                <h2>Nouveau membre</h2>
                <p>Étape ${step + 1}/${total} — ${steps[step].title}. Tous les champs marqués * sont obligatoires.</p>
            </div>
        </div>
        <div class="adm-card" style="padding:24px;max-width:640px">
            <div class="mb-progress" style="margin-bottom:20px"><div class="mb-progress-bar" style="width:${progress}%"></div></div>
            <form id="adm-reg-form">${renderRegistrationStepHtml(stepKey, data, 'admin')}</form>
            <div id="adm-reg-error" style="display:none;color:#ef4444;font-size:13px;background:#fef2f2;padding:10px;border-radius:8px;margin-top:12px"></div>
            <div style="display:flex;gap:10px;margin-top:20px">
                <button type="button" class="adm-btn adm-btn-secondary" id="adm-reg-cancel">${step > 0 ? 'Précédent' : 'Annuler'}</button>
                <button type="submit" form="adm-reg-form" class="adm-btn adm-btn-primary" style="flex:1">${step < total - 1 ? 'Continuer' : 'Créer le membre'}</button>
            </div>
        </div>`, { back: true, onBack: () => {
        if (step > 0) renderMemberCreate(step - 1);
        else router.navigate('/membres');
    } });

    afterStepRender(stepKey);

    document.getElementById('adm-reg-cancel')?.addEventListener('click', () => {
        if (step > 0) renderMemberCreate(step - 1);
        else router.navigate('/membres');
    });

    document.getElementById('adm-reg-form')?.addEventListener('submit', async e => {
        e.preventDefault();
        saveFormData(document.getElementById('adm-reg-form'), data, step);
        const err = document.getElementById('adm-reg-error');
        const validation = validateRegistrationStep(stepKey, data, {
            requirePhoto: stepKey === 'identity',
            hasPhoto: !!photoFile,
        });
        if (validation) {
            err.textContent = validation;
            err.style.display = 'block';
            return;
        }
        err.style.display = 'none';
        if (step < total - 1) {
            renderMemberCreate(step + 1);
            return;
        }
        if (!photoFile) {
            err.textContent = 'La photo de profil est obligatoire.';
            err.style.display = 'block';
            return;
        }
        try {
            await api.createMemberComplete(buildRegistrationPayload(data, { includeAccount: false }), photoFile);
            toast('Membre créé avec succès');
            router.navigate('/membres');
        } catch (ex) {
            err.textContent = ex.message;
            err.style.display = 'block';
        }
    });
}

function afterStepRender(stepKey) {
    if (stepKey === 'identity') bindPhotoUpload(file => { photoFile = file; });
    if (stepKey === 'profession') loadProfessions();
    if (stepKey === 'faith') bindFaithConditionals();
    if (stepKey === 'church') { loadDepartments(); bindChurchConditionals(); }
    if (stepKey === 'family') { loadFamilyPoles(); bindFamilyConditionals(); }
}

async function loadProfessions() {
    try {
        if (!professionsCache.length) professionsCache = list(await api.getProfessions());
        fillSelect(document.getElementById('sel-profession'), professionsCache, data.profession_ref);
    } catch { /* optional */ }
}

async function loadDepartments() {
    try {
        if (!departmentsCache.length) departmentsCache = list(await api.getDepartments());
        fillSelect(document.getElementById('sel-church-dept'), departmentsCache, data.church_department);
        fillSelect(document.getElementById('sel-church-interest'), departmentsCache, data.interested_church_department);
    } catch { /* optional */ }
}

async function loadFamilyPoles() {
    try {
        if (!familyPolesCache.length) familyPolesCache = list(await api.getPoles());
        fillSelect(document.getElementById('sel-family-pole'), familyPolesCache, data.family_pole);
        fillSelect(document.getElementById('sel-family-interest'), familyPolesCache, data.interested_family_pole);
    } catch { /* optional */ }
}
