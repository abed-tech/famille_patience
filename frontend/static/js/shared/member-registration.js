/**
 * Formulaire d'inscription membre — logique partagée (Membre + Admin)
 */

export const ICC_LEVELS = ['001', '101', '201', '301', '401', '501'];

export const REGISTRATION_STEPS = [
    { title: 'Identité', key: 'identity' },
    { title: 'Contact', key: 'contact' },
    { title: 'Profession', key: 'profession' },
    { title: 'Vie chrétienne', key: 'faith' },
    { title: 'Service Église', key: 'church' },
    { title: 'Famille Patience', key: 'family' },
    { title: 'Compte', key: 'account' },
];

export const ADMIN_REGISTRATION_STEPS = REGISTRATION_STEPS.filter(s => s.key !== 'account');

export function esc(s) {
    return String(s ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

export function yesNoSelect(name, value, selectClass = 'mb-select') {
    const v = value === true || value === 'true' ? 'true' : 'false';
    return `
        <select class="${selectClass}" name="${name}" id="${name}">
            <option value="">— Choisir —</option>
            <option value="false" ${v === 'false' ? 'selected' : ''}>Non</option>
            <option value="true" ${v === 'true' ? 'selected' : ''}>Oui</option>
        </select>`;
}

export function saveFormData(form, data, stepIndex) {
    if (!form) return;
    new FormData(form).forEach((val, key) => { data[key] = val; });
    ['profession_ref', 'church_department', 'interested_church_department', 'family_pole', 'interested_family_pole'].forEach(k => {
        if (data[k] === '') data[k] = null;
    });
    if (stepIndex === REGISTRATION_STEPS.length - 1) {
        const pw = form.querySelector('[name="password"]')?.value;
        const pwc = form.querySelector('[name="password_confirm"]')?.value;
        if (pw) data.password = pw;
        if (pwc) data.password_confirm = pwc;
    }
}

export function validateRegistrationStep(stepKey, data, { requirePhoto = false, hasPhoto = false, requireAccount = false } = {}) {
    const v = (k) => String(data[k] ?? '').trim();

    if (stepKey === 'identity') {
        if (!v('last_name')) return 'Le nom est obligatoire.';
        if (!v('middle_name')) return 'Le postnom est obligatoire.';
        if (!v('first_name')) return 'Le prénom est obligatoire.';
        if (!v('date_of_birth')) return 'La date de naissance est obligatoire.';
        if (requirePhoto && !hasPhoto) return 'La photo de profil est obligatoire.';
    }
    if (stepKey === 'contact') {
        if (!v('address')) return "L'adresse physique est obligatoire.";
        if (!v('whatsapp')) return 'Le numéro WhatsApp est obligatoire.';
        if (!v('phone_primary')) return 'Le téléphone principal est obligatoire.';
    }
    if (stepKey === 'profession') {
        if (!data.profession_ref) return 'Sélectionnez une profession.';
        if (!data.marital_status) return 'La situation matrimoniale est obligatoire.';
    }
    if (stepKey === 'faith') {
        if (data.is_baptized !== 'true' && data.is_baptized !== 'false') {
            return 'Indiquez si vous êtes baptisé(e).';
        }
        if (data.is_baptized === 'true' && !v('baptism_year')) {
            return "Indiquez l'année de baptême.";
        }
        if (data.icc_modules_completed !== 'true' && data.icc_modules_completed !== 'false') {
            return 'Indiquez si vous avez suivi les modules ICC.';
        }
        if (data.icc_modules_completed === 'true' && !data.icc_module_level) {
            return 'Sélectionnez le module ICC suivi.';
        }
    }
    if (stepKey === 'church') {
        if (data.serves_in_church !== 'true' && data.serves_in_church !== 'false') {
            return "Indiquez si vous servez dans un département de l'Église.";
        }
        if (data.serves_in_church === 'true' && !data.church_department) {
            return 'Sélectionnez votre département.';
        }
        if (data.serves_in_church === 'false' && !data.interested_church_department) {
            return 'Sélectionnez le département qui vous intéresse.';
        }
    }
    if (stepKey === 'family') {
        if (data.serves_in_family !== 'true' && data.serves_in_family !== 'false') {
            return 'Indiquez si vous servez dans un pôle de la Famille Patience.';
        }
        if (data.serves_in_family === 'true' && !data.family_pole) {
            return 'Sélectionnez votre pôle.';
        }
        if (data.serves_in_family === 'false' && !data.interested_family_pole) {
            return 'Sélectionnez le pôle qui vous intéresse.';
        }
    }
    if (stepKey === 'account' && requireAccount) {
        if (!v('email')) return "L'e-mail de connexion est obligatoire.";
        if (!data.password || data.password.length < 8) return 'Le mot de passe doit contenir au moins 8 caractères.';
        if (data.password !== data.password_confirm) return 'Les mots de passe ne correspondent pas.';
    }
    return null;
}

export function buildRegistrationPayload(data, { includeAccount = true } = {}) {
    const payload = { ...data };
    payload.is_baptized = data.is_baptized === 'true';
    payload.icc_modules_completed = data.icc_modules_completed === 'true';
    payload.serves_in_church = data.serves_in_church === 'true';
    payload.serves_in_family = data.serves_in_family === 'true';

    if (!payload.is_baptized) delete payload.baptism_year;
    if (!payload.icc_modules_completed) delete payload.icc_module_level;

    if (payload.serves_in_church) {
        delete payload.interested_church_department;
    } else {
        delete payload.church_department;
    }

    if (payload.serves_in_family) {
        delete payload.interested_family_pole;
    } else {
        delete payload.family_pole;
    }

    if (!payload.gender) delete payload.gender;
    if (!payload.member_email) delete payload.member_email;
    if (!payload.phone_secondary) delete payload.phone_secondary;

    if (!includeAccount) {
        delete payload.email;
        delete payload.password;
        delete payload.password_confirm;
    }

    return payload;
}

export function fillSelect(sel, items, selectedId, valueKey = 'id', labelKey = 'name') {
    if (!sel) return;
    const first = sel.options[0]?.outerHTML || '<option value="">Choisir</option>';
    sel.innerHTML = first;
    items.forEach(item => {
        const opt = document.createElement('option');
        opt.value = item[valueKey];
        opt.textContent = item[labelKey];
        if (String(selectedId) === String(item[valueKey])) opt.selected = true;
        sel.appendChild(opt);
    });
}

export function bindFaithConditionals() {
    const baptized = document.getElementById('is_baptized');
    const icc = document.getElementById('icc_modules_completed');
    const toggleBaptism = () => {
        const show = baptized?.value === 'true';
        const wrap = document.getElementById('wrap-baptism-year');
        if (wrap) wrap.style.display = show ? '' : 'none';
    };
    const toggleIcc = () => {
        const show = icc?.value === 'true';
        const wrap = document.getElementById('wrap-icc-level');
        if (wrap) wrap.style.display = show ? '' : 'none';
    };
    baptized?.addEventListener('change', toggleBaptism);
    icc?.addEventListener('change', toggleIcc);
    toggleBaptism();
    toggleIcc();
}

export function bindChurchConditionals() {
    const serves = document.getElementById('serves_in_church');
    const toggle = () => {
        const yes = serves?.value === 'true';
        document.getElementById('wrap-church-dept').style.display = yes ? '' : 'none';
        document.getElementById('wrap-church-interest').style.display = yes ? 'none' : '';
    };
    serves?.addEventListener('change', toggle);
    toggle();
}

export function bindFamilyConditionals() {
    const serves = document.getElementById('serves_in_family');
    const toggle = () => {
        const yes = serves?.value === 'true';
        document.getElementById('wrap-family-pole').style.display = yes ? '' : 'none';
        document.getElementById('wrap-family-interest').style.display = yes ? 'none' : '';
    };
    serves?.addEventListener('change', toggle);
    toggle();
}

export function renderRegistrationStepHtml(stepKey, data, style = 'membre') {
    const v = (k) => data[k] ?? '';
    const inputCls = style === 'admin' ? 'adm-input' : 'mb-input';
    const selectCls = style === 'admin' ? 'adm-select' : 'mb-select';
    const textareaCls = style === 'admin' ? 'adm-input' : 'mb-textarea';
    const labelCls = style === 'admin' ? 'adm-label' : 'mb-label';
    const groupCls = style === 'admin' ? 'adm-form-group' : 'mb-form-group';
    const yn = (name) => yesNoSelect(name, v(name), selectCls);

    const fields = {
        identity: `
            <div class="${groupCls}"><label class="${labelCls}">Nom *</label><input class="${inputCls}" name="last_name" value="${esc(v('last_name'))}" required></div>
            <div class="${groupCls}"><label class="${labelCls}">Postnom *</label><input class="${inputCls}" name="middle_name" value="${esc(v('middle_name'))}" required></div>
            <div class="${groupCls}"><label class="${labelCls}">Prénom *</label><input class="${inputCls}" name="first_name" value="${esc(v('first_name'))}" required></div>
            <div class="${groupCls}"><label class="${labelCls}">Date de naissance *</label><input class="${inputCls}" type="date" name="date_of_birth" value="${esc(v('date_of_birth'))}" required></div>
            <div class="${groupCls}"><label class="${labelCls}">Sexe</label>
                <select class="${selectCls}" name="gender">
                    <option value="">Non précisé</option>
                    <option value="F" ${v('gender') === 'F' ? 'selected' : ''}>Féminin</option>
                    <option value="M" ${v('gender') === 'M' ? 'selected' : ''}>Masculin</option>
                </select>
            </div>
            <div class="${groupCls}" style="text-align:center;margin-top:8px">
                <label class="${labelCls}">Photo de profil *</label>
                <div class="${style === 'admin' ? 'adm-photo-upload' : 'mb-photo-upload'}" id="photo-box" style="margin:12px auto;width:96px;height:96px;border-radius:50%;overflow:hidden;border:2px dashed var(--fp-border,#e5e7eb);display:flex;align-items:center;justify-content:center;cursor:pointer">
                    <span id="photo-preview" style="font-size:28px">📷</span>
                    <input type="file" id="photo-input" accept="image/*" style="display:none">
                </div>
            </div>`,
        contact: `
            <div class="${groupCls}"><label class="${labelCls}">Adresse physique *</label><textarea class="${textareaCls}" name="address" rows="2" required>${esc(v('address'))}</textarea></div>
            <div class="${groupCls}"><label class="${labelCls}">Adresse Gmail</label><input class="${inputCls}" type="email" name="member_email" value="${esc(v('member_email'))}" placeholder="exemple@gmail.com"></div>
            <div class="${groupCls}"><label class="${labelCls}">Numéro WhatsApp *</label><input class="${inputCls}" name="whatsapp" value="${esc(v('whatsapp'))}" required></div>
            <div class="${groupCls}"><label class="${labelCls}">Téléphone principal *</label><input class="${inputCls}" name="phone_primary" value="${esc(v('phone_primary'))}" required></div>
            <div class="${groupCls}"><label class="${labelCls}">Téléphone secondaire</label><input class="${inputCls}" name="phone_secondary" value="${esc(v('phone_secondary'))}"></div>`,
        profession: `
            <div class="${groupCls}"><label class="${labelCls}">Profession *</label>
                <select class="${selectCls}" name="profession_ref" id="sel-profession" required>
                    <option value="">Choisir une profession</option>
                </select>
            </div>
            <div class="${groupCls}"><label class="${labelCls}">Situation matrimoniale *</label>
                <select class="${selectCls}" name="marital_status" required>
                    <option value="">Choisir</option>
                    <option value="single" ${v('marital_status') === 'single' ? 'selected' : ''}>Célibataire</option>
                    <option value="married" ${v('marital_status') === 'married' ? 'selected' : ''}>Marié(e)</option>
                    <option value="divorced" ${v('marital_status') === 'divorced' ? 'selected' : ''}>Divorcé(e)</option>
                    <option value="widowed" ${v('marital_status') === 'widowed' ? 'selected' : ''}>Veuf/Veuve</option>
                </select>
            </div>`,
        faith: `
            <div class="${groupCls}"><label class="${labelCls}">Baptisé(e) ? *</label>${yn('is_baptized')}</div>
            <div class="${groupCls}" id="wrap-baptism-year" style="display:none">
                <label class="${labelCls}">En quelle année avez-vous été baptisé(e) ? *</label>
                <input class="${inputCls}" type="number" name="baptism_year" id="baptism_year" min="1900" max="2100" value="${esc(v('baptism_year'))}" placeholder="ex. 2015">
            </div>
            <div class="${groupCls}" style="margin-top:16px"><label class="${labelCls}">Avez-vous suivi les modules de formation de l'ICC ? *</label>${yn('icc_modules_completed')}</div>
            <div class="${groupCls}" id="wrap-icc-level" style="display:none">
                <label class="${labelCls}">Quel module avez-vous suivi ? *</label>
                <select class="${selectCls}" name="icc_module_level" id="icc_module_level">
                    <option value="">Choisir</option>
                    ${ICC_LEVELS.map(l => `<option value="${l}" ${v('icc_module_level') === l ? 'selected' : ''}>${l}</option>`).join('')}
                </select>
            </div>`,
        church: `
            <div class="${groupCls}"><label class="${labelCls}">Servez-vous déjà dans l'Église ? *</label>${yn('serves_in_church')}</div>
            <div class="${groupCls}" id="wrap-church-dept" style="display:none">
                <label class="${labelCls}">Dans quel département servez-vous ? *</label>
                <select class="${selectCls}" name="church_department" id="sel-church-dept">
                    <option value="">Choisir un département</option>
                </select>
            </div>
            <div class="${groupCls}" id="wrap-church-interest" style="display:none">
                <label class="${labelCls}">Quel département vous intéresse ? *</label>
                <select class="${selectCls}" name="interested_church_department" id="sel-church-interest">
                    <option value="">Choisir un département</option>
                </select>
            </div>`,
        family: `
            <div class="${groupCls}"><label class="${labelCls}">Servez-vous déjà dans la Famille Patience ? *</label>${yn('serves_in_family')}</div>
            <div class="${groupCls}" id="wrap-family-pole" style="display:none">
                <label class="${labelCls}">Dans quel pôle servez-vous ? *</label>
                <select class="${selectCls}" name="family_pole" id="sel-family-pole">
                    <option value="">Choisir un pôle</option>
                </select>
            </div>
            <div class="${groupCls}" id="wrap-family-interest" style="display:none">
                <label class="${labelCls}">Quel pôle vous intéresse ? *</label>
                <select class="${selectCls}" name="interested_family_pole" id="sel-family-interest">
                    <option value="">Choisir un pôle</option>
                </select>
            </div>`,
        account: `
            <div class="${groupCls}"><label class="${labelCls}">E-mail de connexion *</label><input class="${inputCls}" type="email" name="email" value="${esc(v('email'))}" required autocomplete="email"></div>
            <div class="${groupCls}"><label class="${labelCls}">Mot de passe *</label><input class="${inputCls}" type="password" name="password" required minlength="8" autocomplete="new-password"></div>
            <div class="${groupCls}"><label class="${labelCls}">Confirmer le mot de passe *</label><input class="${inputCls}" type="password" name="password_confirm" required autocomplete="new-password"></div>
            <p style="font-size:11px;color:var(--mb-text-muted,var(--adm-text-muted))">Votre carte de membre et QR Code seront générés automatiquement.</p>`,
    };
    return fields[stepKey] || '';
}

export function bindPhotoUpload(onFile) {
    const input = document.getElementById('photo-input');
    const box = document.getElementById('photo-box');
    box?.addEventListener('click', () => input?.click());
    input?.addEventListener('change', e => {
        const file = e.target.files[0];
        if (!file) return;
        onFile(file);
        const preview = document.getElementById('photo-preview');
        if (preview) {
            preview.innerHTML = `<img src="${URL.createObjectURL(file)}" style="width:100%;height:100%;object-fit:cover" alt="">`;
        }
    });
}
