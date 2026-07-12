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

const editState = {};

function fkId(value) {
    if (value == null || value === '') return '';
    if (typeof value === 'object') return value.id ?? '';
    return String(value);
}

function memberToFormData(member) {
    return {
        last_name: member.last_name || '',
        middle_name: member.middle_name || '',
        first_name: member.first_name || '',
        gender: member.gender || '',
        date_of_birth: member.date_of_birth || '',
        address: member.address || '',
        profession_ref: fkId(member.profession_ref),
        phone_primary: member.phone_primary || '',
        phone_secondary: member.phone_secondary || '',
        whatsapp: member.whatsapp || '',
        member_email: member.email || '',
        facebook: member.facebook || '',
        instagram: member.instagram || '',
        marital_status: member.marital_status || '',
        is_baptized: member.is_baptized != null ? String(member.is_baptized) : '',
        baptism_year: member.baptism_year || '',
        icc_modules_completed: member.icc_modules_completed != null ? String(member.icc_modules_completed) : '',
        icc_module_level: member.icc_module_level || '',
        serves_in_church: member.serves_in_church != null ? String(member.serves_in_church) : '',
        church_department: fkId(member.church_department),
        interested_church_department: fkId(member.interested_church_department),
        serves_in_family: member.serves_in_family != null ? String(member.serves_in_family) : '',
        family_pole: fkId(member.family_pole),
        interested_family_pole: fkId(member.interested_family_pole),
    };
}

export async function renderMemberEdit(memberId, step = 0) {
    if (!api.token) return;

    if (!editState[memberId]) {
        try {
            const res = await api.getMember(memberId);
            editState[memberId] = {
                data: memberToFormData(res.data),
                photoFile: null,
                hasPhoto: !!res.data.photo,
                name: res.data.full_name,
            };
        } catch (e) {
            toast(e.message || 'Membre introuvable');
            router.navigate(`/membres/${memberId}`);
            return;
        }
    }

    const state = editState[memberId];
    const data = state.data;
    const steps = ADMIN_REGISTRATION_STEPS;
    const total = steps.length;
    const stepKey = steps[step].key;
    const progress = ((step + 1) / total) * 100;

    renderShell('members', `
        <div class="adm-page-header">
            <div>
                <h2>Modifier — ${state.name}</h2>
                <p>Étape ${step + 1}/${total} — ${steps[step].title}</p>
            </div>
        </div>
        <div class="adm-card" style="padding:24px;max-width:640px">
            <div class="mb-progress" style="margin-bottom:20px"><div class="mb-progress-bar" style="width:${progress}%"></div></div>
            <form id="adm-reg-form">${renderRegistrationStepHtml(stepKey, data, 'admin')}</form>
            <div id="adm-reg-error" style="display:none;color:#ef4444;font-size:13px;background:#fef2f2;padding:10px;border-radius:8px;margin-top:12px"></div>
            <div style="display:flex;gap:10px;margin-top:20px">
                <button type="button" class="adm-btn adm-btn-secondary" id="adm-reg-cancel">${step > 0 ? 'Précédent' : 'Annuler'}</button>
                <button type="submit" form="adm-reg-form" class="adm-btn adm-btn-primary" style="flex:1">${step < total - 1 ? 'Continuer' : 'Enregistrer'}</button>
            </div>
        </div>`, {
        back: true,
        onBack: () => {
            if (step > 0) renderMemberEdit(memberId, step - 1);
            else {
                delete editState[memberId];
                router.navigate(`/membres/${memberId}`);
            }
        },
    });

    afterStepRender(stepKey, state);

    document.getElementById('adm-reg-cancel')?.addEventListener('click', () => {
        if (step > 0) renderMemberEdit(memberId, step - 1);
        else {
            delete editState[memberId];
            router.navigate(`/membres/${memberId}`);
        }
    });

    document.getElementById('adm-reg-form')?.addEventListener('submit', async e => {
        e.preventDefault();
        saveFormData(document.getElementById('adm-reg-form'), data, step);
        const err = document.getElementById('adm-reg-error');
        const validation = validateRegistrationStep(stepKey, data, {
            requirePhoto: stepKey === 'identity' && !state.hasPhoto,
            hasPhoto: !!state.photoFile || state.hasPhoto,
        });
        if (validation) {
            err.textContent = validation;
            err.style.display = 'block';
            return;
        }
        err.style.display = 'none';
        if (step < total - 1) {
            renderMemberEdit(memberId, step + 1);
            return;
        }
        try {
            const payload = buildRegistrationPayload(data, { includeAccount: false });
            if (payload.member_email !== undefined) {
                payload.email = payload.member_email;
                delete payload.member_email;
            }
            await api.updateMemberComplete(memberId, payload, state.photoFile);
            delete editState[memberId];
            toast('Membre mis à jour');
            router.navigate(`/membres/${memberId}`);
        } catch (ex) {
            err.textContent = ex.message;
            err.style.display = 'block';
        }
    });
}

function afterStepRender(stepKey, state) {
    if (stepKey === 'identity') {
        bindPhotoUpload(file => {
            state.photoFile = file;
            state.hasPhoto = true;
        });
    }
    if (stepKey === 'profession') loadProfessions(state.data);
    if (stepKey === 'faith') bindFaithConditionals();
    if (stepKey === 'church') { loadDepartments(state.data); bindChurchConditionals(); }
    if (stepKey === 'family') { loadFamilyPoles(state.data); bindFamilyConditionals(); }
}

let professionsCache = [];
let departmentsCache = [];
let familyPolesCache = [];

async function loadProfessions(data) {
    try {
        if (!professionsCache.length) professionsCache = list(await api.getProfessions());
        fillSelect(document.getElementById('sel-profession'), professionsCache, data.profession_ref);
    } catch { /* optional */ }
}

async function loadDepartments(data) {
    try {
        if (!departmentsCache.length) departmentsCache = list(await api.getDepartments());
        fillSelect(document.getElementById('sel-church-dept'), departmentsCache, data.church_department);
        fillSelect(document.getElementById('sel-church-interest'), departmentsCache, data.interested_church_department);
    } catch { /* optional */ }
}

async function loadFamilyPoles(data) {
    try {
        if (!familyPolesCache.length) familyPolesCache = list(await api.getPoles());
        fillSelect(document.getElementById('sel-family-pole'), familyPolesCache, data.family_pole);
        fillSelect(document.getElementById('sel-family-interest'), familyPolesCache, data.interested_family_pole);
    } catch { /* optional */ }
}
