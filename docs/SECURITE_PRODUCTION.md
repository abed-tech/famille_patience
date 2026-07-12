# Sécurité & robustesse — Famille Patience

Document de référence : mesures implémentées et bonnes pratiques.

---

## 1. Protections implémentées

### Injection SQL
- **ORM Django exclusivement** — pas de SQL brut non paramétré
- Requêtes via `Model.objects.filter()` et serializers DRF

### XSS (Cross-Site Scripting)
- API **JSON uniquement** en production (pas de Browsable API)
- Templates Django échappent le HTML par défaut
- Frontend SPA : pas d'`innerHTML` avec données utilisateur non échappées (préférer `textContent`)

### CSRF
- Middleware `CsrfViewMiddleware` actif
- Cookies CSRF `HttpOnly` + `Secure` en production
- `CSRF_TRUSTED_ORIGINS` explicite en production

### Clickjacking
- `X_FRAME_OPTIONS = DENY` — la plateforme ne peut pas être intégrée dans une iframe

### Brute Force (connexion)
- **Rate limiting** : 10 tentatives / minute / IP sur `/api/v1/auth/login/`
- Fichier : `apps/core/throttling.py` → `LoginRateThrottle`

### Vol de session
- JWT avec **rotation** des refresh tokens + **blacklist**
- Cookies session `Secure`, `HttpOnly`, `SameSite=Lax`
- HTTPS forcé en production (`SECURE_SSL_REDIRECT`)

### Upload malveillant
- Validation Pillow : contenu réel vérifié (pas seulement l'extension)
- Types autorisés : JPEG, PNG, WebP
- Taille max : **5 Mo**
- Fichier : `apps/core/security.py`

### Permissions & escalade de privilèges
- Rôles vérifiés par classe (`IsAdmin`, `IsStaffRole`, `IsMember`, etc.)
- Agent pointeur = affectation **temporaire par événement**, pas un rôle permanent
- Login scoped par app (`/auth/login/gestion/` vs `/auth/login/membre/`)

### API non sécurisées
- `DEFAULT_PERMISSION_CLASSES = IsAuthenticated` (sauf endpoints publics explicites)
- Gestionnaire d'exceptions unifié — pas de stack trace exposée
- Middleware `ApiErrorMiddleware` — JSON même en cas d'erreur 500

### Configuration Django production
- `SECRET_KEY` obligatoire (min. 50 caractères)
- `DEBUG=False` forcé
- HSTS activé (1 an)
- Headers sécurité complets dans `config/settings/production.py`

---

## 2. Robustesse — gestion des erreurs

| Couche | Comportement |
|--------|--------------|
| Validators serializers | Erreurs 400 avec message clair |
| Permissions DRF | 403 sans détail sensible |
| `custom_exception_handler` | Format JSON uniforme `{success, error}` |
| Exceptions non gérées API | 500 JSON générique + log serveur |
| `ApiErrorMiddleware` | Filet de sécurité pour `/api/*` |
| Frontend SPA | `mountError()` + retry sur échec réseau |

**Principe :** l'utilisateur voit un message compréhensible ; les détails techniques restent dans les logs.

---

## 3. Journalisation

- Middleware `RequestLoggingMiddleware` : méthode, chemin, statut, durée
- Header `X-Request-ID` pour corréler les incidents
- Logs structurés en production (`config/settings/production.py`)

---

## 4. Performances

| Élément | Mesure |
|---------|--------|
| Static files | WhiteNoise + compression gzip |
| Cache | Redis (sessions, API cache frontend 45s dev) |
| PostgreSQL | `CONN_MAX_AGE=600`, index sur status/member_number/qr_code |
| Pagination | 20 éléments par page API |
| Images | Cloudinary CDN |
| JS/CSS | Service Worker réseau d'abord pour les mises à jour |

---

## 5. Ce que Render ne protège pas seul

| Menace | Mitigation |
|--------|------------|
| DDoS massif | Cloudflare (gratuit) devant Render |
| Scan automatisé | Rate limiting (implémenté) + WAF Cloudflare |
| Fuite secrets | Variables d'environnement Render, jamais dans Git |

---

## 6. Commandes utiles

```bash
# Vérifier la configuration Django
DJANGO_SETTINGS_MODULE=config.settings.production python manage.py check --deploy

# Audit dépendances (installer pip-audit)
pip install pip-audit
pip-audit -r requirements.txt
```

---

## 7. Checklist avant mise en ligne

- [ ] `.env` jamais commité (vérifier `.gitignore`)
- [ ] Comptes admin avec mots de passe forts
- [ ] CORS limité au domaine de production
- [ ] Cloudinary actif (pas de media local)
- [ ] Redis actif
- [ ] Backups PostgreSQL planifiés
- [ ] Health check `/health/` OK
