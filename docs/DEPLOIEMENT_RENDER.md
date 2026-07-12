# Déploiement sur Render — guide pas à pas

Ce guide explique comment mettre **Famille Patience** en production sur [Render](https://render.com), étape par étape, même si vous débutez.

---

## 1. Avant de commencer

### Pourquoi Render ?
- Hébergement simple avec GitHub
- PostgreSQL managé
- HTTPS automatique
- Plan gratuit pour tester

### Limites importantes du plan gratuit Render
- Le **disque est éphémère** → les photos ne doivent **jamais** être stockées localement
- Le service **s'endort** après inactivité (première requête lente)
- PostgreSQL gratuit limité en espace

**Solution photos : Cloudinary** (voir section 4).

---

## 2. Préparer le projet localement

### 2.1 Vérifier que tout fonctionne

```bash
python -m venv venv
# Windows :
venv\Scripts\activate
# Mac/Linux :
source venv/bin/activate

pip install -r requirements.txt
cp .env.example .env
# Éditez .env pour le développement local
python manage.py migrate
python manage.py runserver
```

### 2.2 Générer une SECRET_KEY sécurisée

```bash
python -c "import secrets; print(secrets.token_urlsafe(64))"
```

Copiez le résultat — vous en aurez besoin sur Render.

### 2.3 Pousser le code sur GitHub

```bash
git init
git add .
git commit -m "Préparation déploiement Render"
git branch -M main
git remote add origin https://github.com/VOTRE-USER/famille-patience.git
git push -u origin main
```

---

## 3. Créer les services sur Render

### 3.1 Compte Render
1. Allez sur [render.com](https://render.com) et créez un compte
2. Connectez votre compte **GitHub**

### 3.2 Base PostgreSQL
1. Dashboard Render → **New +** → **PostgreSQL**
2. Nom : `fp-database`
3. Plan : **Free**
4. Créez la base
5. Notez l'URL **Internal Database URL** (commence par `postgres://`)

### 3.3 Redis (Upstash — gratuit)
Render n'inclut pas Redis gratuit. Utilisez **Upstash** :

1. [upstash.com](https://upstash.com) → créer un compte
2. **Create Database** → type Redis → région proche de Render
3. Copiez l'URL Redis (`rediss://...`)

**Pourquoi ?** Cache, WebSocket (pointage temps réel), Celery.

### 3.4 Cloudinary (photos — obligatoire)
Voir section 4 ci-dessous.

### 3.5 Service Web (application Django)

**Option A — Blueprint (recommandé)**

1. Render → **New +** → **Blueprint**
2. Connectez le dépôt GitHub
3. Render lit `render.yaml` à la racine
4. Complétez les variables marquées `sync: false`

**Option B — Manuel**

1. **New +** → **Web Service**
2. Connectez GitHub → sélectionnez le dépôt
3. Paramètres :
   - **Runtime** : Python 3
   - **Build Command** : `chmod +x build.sh && ./build.sh`
   - **Start Command** :
     ```
     gunicorn config.wsgi:application --bind 0.0.0.0:$PORT --workers 2 --timeout 120
     ```
   - **Health Check Path** : `/health/`

---

## 4. Variables d'environnement (Render → Environment)

| Variable | Exemple | Obligatoire |
|----------|---------|-------------|
| `DJANGO_SETTINGS_MODULE` | `config.settings.production` | Oui |
| `SECRET_KEY` | (64+ caractères aléatoires) | Oui |
| `DEBUG` | `False` | Oui |
| `DATABASE_URL` | (auto si liée à PostgreSQL) | Oui |
| `REDIS_URL` | `rediss://...` (Upstash) | Oui |
| `ALLOWED_HOSTS` | `mon-app.onrender.com` | Oui |
| `CSRF_TRUSTED_ORIGINS` | `https://mon-app.onrender.com` | Oui |
| `CORS_ALLOWED_ORIGINS` | `https://mon-app.onrender.com` | Oui |
| `CLOUDINARY_CLOUD_NAME` | votre cloud name | Oui |
| `CLOUDINARY_API_KEY` | clé API | Oui |
| `CLOUDINARY_API_SECRET` | secret API | Oui |

**Pourquoi CSRF_TRUSTED_ORIGINS ?** Django 4+ exige la liste explicite des domaines HTTPS pour les formulaires et cookies sécurisés.

---

## 5. Stockage externe des photos (Cloudinary)

### Comparaison des solutions gratuites

| Service | Gratuit | Intégration Django | Recommandation |
|---------|---------|-------------------|----------------|
| **Cloudinary** | ~25 crédits/mois, CDN inclus | `django-cloudinary-storage` — native | **Recommandé** |
| ImageKit | 20 Go bande passante | Bonne, moins d'exemples Django | Alternative |
| Supabase Storage | 1 Go | Nécessite SDK custom | Plus complexe |
| Backblaze B2 | 10 Go stockage | Pas de CDN gratuit intégré | Moins adapté débutant |

### Pourquoi Cloudinary ?
- Intégration Django en **3 lignes de config**
- CDN mondial (images rapides)
- Transformations (redimensionnement automatique)
- Suppression automatique des anciennes photos (déjà codée dans le projet)

### Configuration Cloudinary

1. [cloudinary.com](https://cloudinary.com) → **Sign Up Free**
2. Dashboard → **Product Environment Credentials**
3. Notez : **Cloud name**, **API Key**, **API Secret**
4. Ajoutez-les dans les variables Render (section 4)

### Comment ça marche dans le projet

- En production, `STORAGES["default"]` pointe vers `MediaCloudinaryStorage`
- Upload via formulaire membre → fichier envoyé directement à Cloudinary
- URL publique retournée → affichée dans les apps
- Lors d'un remplacement de photo, l'ancienne est supprimée (`apps/members/signals.py`)

### Affichage
Les URLs Cloudinary (`https://res.cloudinary.com/...`) sont utilisées telles quelles dans le frontend — pas de changement côté JS.

---

## 6. Premier déploiement

1. Push sur `main` → Render build automatiquement
2. Suivez les **Logs** dans le dashboard Render
3. Vérifiez :
   - Build : `collectstatic` + `migrate` OK
   - Health : `https://votre-app.onrender.com/health/` → `{"status":"ok","database":true}`

### Créer le super-admin

Render → Shell (ou en local avec DATABASE_URL de prod) :

```bash
python manage.py createsuperuser
python manage.py setup_local  # données démo (optionnel)
```

---

## 7. Mettre à jour la plateforme

Chaque `git push` sur la branche connectée relance un déploiement.

```bash
git add .
git commit -m "Correction bug pointage"
git push origin main
```

Render exécute automatiquement `build.sh` :
1. `pip install`
2. `collectstatic`
3. `migrate`

---

## 8. Sauvegardes PostgreSQL

### Sauvegarde manuelle

Depuis votre machine (avec l'URL externe de la base Render) :

```bash
pg_dump "postgres://USER:PASS@HOST/DB" -F c -f backup_$(date +%Y%m%d).dump
```

### Restauration

```bash
pg_restore -d "postgres://USER:PASS@HOST/DB" --clean --if-exists backup_20260712.dump
```

### Sauvegardes automatiques
- Plan Render **payant** : backups automatiques PostgreSQL
- Plan **gratuit** : script cron local ou GitHub Action hebdomadaire avec `pg_dump`

Exemple GitHub Action (`.github/workflows/backup.yml`) — à adapter avec secrets `DATABASE_URL`.

---

## 9. Surveillance et logs

- **Logs Render** : Dashboard → votre service → Logs (stdout)
- **Health check** : `/health/` (utilisé par Render)
- **Erreurs API** : journalisées avec `request_id` dans les headers (`X-Request-ID`)

Pour aller plus loin (optionnel) :
- [Sentry](https://sentry.io) — erreurs en temps réel (plan gratuit)
- UptimeRobot — alerte si le site est down

---

## 10. Checklist production

- [ ] `SECRET_KEY` unique (50+ caractères)
- [ ] `DEBUG=False`
- [ ] `ALLOWED_HOSTS` + `CSRF_TRUSTED_ORIGINS` configurés
- [ ] PostgreSQL Render connecté
- [ ] Redis Upstash connecté
- [ ] Cloudinary configuré
- [ ] Super-admin créé
- [ ] `/health/` retourne OK
- [ ] Connexion `/gestion/` testée
- [ ] Upload photo membre testé (URL Cloudinary)

---

## Fichiers de déploiement fournis

| Fichier | Rôle |
|---------|------|
| `render.yaml` | Blueprint Render (web + PostgreSQL) |
| `build.sh` | Install, migrate, collectstatic |
| `runtime.txt` | Python 3.12.4 |
| `requirements.txt` | Dépendances incl. gunicorn, cloudinary |
| `config/settings/production.py` | Sécurité HTTPS, logs, validations |
| `.env.example` | Modèle de variables |

Voir aussi : [SECURITE_PRODUCTION.md](./SECURITE_PRODUCTION.md)
