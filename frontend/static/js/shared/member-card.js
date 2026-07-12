/**
 * Carte de membre — rendu, impression et téléchargement
 */

const ROLE_LABELS = {
    member: 'Membre',
    referrer: 'Référent',
    counsellor: 'Conseiller',
    admin: 'Administrateur',
};

export function qrImageUrl(data, size = 120) {
    if (!data) return '';
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}`;
}

export function memberCardHtml(card, { id = 'fp-member-card' } = {}) {
    const photo = card.photo || '';
    const initials = (card.full_name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    const role = ROLE_LABELS[card.role] || card.role_label || 'Membre';

    return `
        <div class="fp-member-card" id="${id}">
            <div class="fp-member-card-header">
                ${photo
                    ? `<img src="${photo}" alt="" class="fp-member-card-photo">`
                    : `<div class="fp-member-card-photo fp-member-card-photo-fallback">${initials}</div>`}
                <div class="fp-member-card-info">
                    <p class="fp-member-card-brand">Famille Patience</p>
                    <h3 class="fp-member-card-name">${card.full_name || '—'}</h3>
                    <p class="fp-member-card-id">${card.member_number || '—'}</p>
                </div>
            </div>
            <div class="fp-member-card-body">
                <div class="fp-member-card-presence">
                    <span class="fp-member-card-presence-label">N° présence</span>
                    <div class="fp-member-card-presence-box"></div>
                </div>
                <div class="fp-member-card-role">
                    <span class="fp-member-card-role-label">Responsabilité</span>
                    <strong>${role}</strong>
                </div>
                ${card.qr_code
                    ? `<img src="${qrImageUrl(card.qr_code, 100)}" alt="QR Code" class="fp-member-card-qr" width="100" height="100">`
                    : ''}
            </div>
        </div>`;
}

export function printMemberCard(card) {
    const html = buildPrintDocument(card);
    const win = window.open('', '_blank', 'width=420,height=640');
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.onload = () => {
        win.focus();
        win.print();
    };
}

export function downloadMemberCard(card) {
    const html = buildPrintDocument(card);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `carte-${card.member_number || 'membre'}.html`;
    a.click();
    URL.revokeObjectURL(url);
}

function buildPrintDocument(card) {
    const cardHtml = memberCardHtml(card, { id: 'print-card' });
    return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>Carte — ${card.full_name || ''}</title>
<style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Inter, system-ui, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 24px; background: #f3f4f6; }
    .fp-member-card { width: 340px; background: linear-gradient(135deg, #ec4899 0%, #be185d 100%); border-radius: 20px; padding: 24px; color: #fff; box-shadow: 0 12px 32px rgba(236,72,153,.25); }
    .fp-member-card-header { display: flex; align-items: center; gap: 14px; margin-bottom: 18px; }
    .fp-member-card-photo { width: 64px; height: 64px; border-radius: 50%; object-fit: cover; border: 2px solid rgba(255,255,255,.45); flex-shrink: 0; }
    .fp-member-card-photo-fallback { display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,.2); font-size: 22px; font-weight: 700; }
    .fp-member-card-brand { font-size: 11px; opacity: .85; margin: 0; }
    .fp-member-card-name { font-size: 18px; font-weight: 700; margin: 4px 0 0; line-height: 1.2; }
    .fp-member-card-id { font-size: 12px; opacity: .9; margin: 4px 0 0; font-family: monospace; }
    .fp-member-card-body { display: grid; grid-template-columns: 1fr auto; gap: 12px 16px; align-items: end; }
    .fp-member-card-presence-label, .fp-member-card-role-label { display: block; font-size: 10px; opacity: .75; margin-bottom: 4px; text-transform: uppercase; letter-spacing: .04em; }
    .fp-member-card-presence-box { width: 100%; min-width: 120px; height: 36px; border: 2px dashed rgba(255,255,255,.55); border-radius: 8px; background: rgba(255,255,255,.08); }
    .fp-member-card-role strong { font-size: 14px; font-weight: 700; }
    .fp-member-card-qr { border-radius: 10px; background: #fff; padding: 4px; display: block; }
    @media print { body { background: #fff; padding: 0; } .fp-member-card { box-shadow: none; } }
</style>
</head>
<body>${cardHtml}</body>
</html>`;
}
