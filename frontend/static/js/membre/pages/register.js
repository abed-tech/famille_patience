import { renderAuthPage, authBrand } from '../core/layout.js';
import { api, registerMember, extractList } from '../core/api.js';
import {
    REGISTRATION_STEPS,
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

export function renderRegister(router, step = 0) {
    const steps = REGISTRATION_STEPS;
    const total = steps.length;
    const progress = ((step + 1) / total) * 100;
    const stepKey = steps[step].key;

    renderAuthPage(`
        <div style="margin-bottom:16px">
            <button class="mb-btn-ghost" id="reg-back-top" style="font-size:13px;padding:0;margin-bottom:8px">← Retour</button>
            <h2 style="font-size:17px;font-weight:700;margin:0">Inscription</h2>
            <p style="font-size:12px;color:var(--mb-text-muted);margin:4px 0 0">Étape ${step + 1}/${total} — ${steps[step].title}</p>
            <div class="mb-progress"><div class="mb-progress-bar" style="width:${progress}%"></div></div>
        </div>
        <div class="mb-card">
            <form id="reg-form">${renderRegistrationStepHtml(stepKey, data, 'membre')}</form>
            <div id="reg-error" style="display:none;color:#ef4444;font-size:12px;background:#fef2f2;padding:10px;border-radius:10px;margin-top:12px"></div>
            <div style="display:flex;gap:10px;margin-top:16px">
                ${step > 0 ? '<button type="button" class="mb-btn mb-btn-secondary" id="reg-back" style="flex:1">Précédent</button>' : ''}
                <button type="submit" form="reg-form" class="mb-btn mb-btn-primary" style="flex:2">${step < total - 1 ? 'Continuer' : 'Créer mon compte'}</button>
            </div>
        </div>
    `);

    afterStepRender(stepKey);

    document.getElementById('reg-back-top')?.addEventListener('click', () => {
        if (step > 0) renderRegister(router, step - 1);
        else router.navigate('/connexion');
    });
    document.getElementById('reg-back')?.addEventListener('click', () => renderRegister(router, step - 1));

    document.getElementById('reg-form').addEventListener('submit', async e => {
        e.preventDefault();
        saveFormData(document.getElementById('reg-form'), data, step);
        const err = document.getElementById('reg-error');
        const validation = validateRegistrationStep(stepKey, data, {
            requirePhoto: stepKey === 'identity',
            hasPhoto: !!photoFile,
            requireAccount: stepKey === 'account',
        });
        if (validation) {
            err.textContent = validation;
            err.style.display = 'block';
            return;
        }
        err.style.display = 'none';
        if (step < total - 1) {
            renderRegister(router, step + 1);
            return;
        }
        if (!photoFile) {
            err.textContent = 'La photo de profil est obligatoire.';
            err.style.display = 'block';
            return;
        }
        try {
            await registerMember(buildRegistrationPayload(data), photoFile);
            renderAuthPage(`
                ${authBrand('Bienvenue !')}
                <div class="mb-card" style="text-align:center;padding:28px 20px">
                    <div style="font-size:48px;margin-bottom:12px">🎉</div>
                    <h2 style="font-size:18px;font-weight:700;margin:0 0 8px">Inscription réussie</h2>
                    <p style="font-size:13px;color:var(--mb-text-muted);margin:0 0 20px">Votre carte et QR Code sont prêts. Connectez-vous pour y accéder.</p>
                    <button class="mb-btn mb-btn-primary" id="go-login">Se connecter</button>
                </div>
            `);
            document.getElementById('go-login').onclick = () => router.navigate('/connexion');
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
        if (!professionsCache.length) {
            professionsCache = extractList(await api.getPublicProfessions());
        }
        fillSelect(document.getElementById('sel-profession'), professionsCache, data.profession_ref);
    } catch { /* optional */ }
}

async function loadDepartments() {
    try {
        if (!departmentsCache.length) {
            departmentsCache = extractList(await api.getPublicDepts());
        }
        fillSelect(document.getElementById('sel-church-dept'), departmentsCache, data.church_department);
        fillSelect(document.getElementById('sel-church-interest'), departmentsCache, data.interested_church_department);
    } catch { /* optional */ }
}

async function loadFamilyPoles() {
    try {
        if (!familyPolesCache.length) {
            familyPolesCache = extractList(await api.getPublicFamilyPoles());
        }
        fillSelect(document.getElementById('sel-family-pole'), familyPolesCache, data.family_pole);
        fillSelect(document.getElementById('sel-family-interest'), familyPolesCache, data.interested_family_pole);
    } catch { /* optional */ }
}
