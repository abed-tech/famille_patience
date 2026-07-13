# Famille Patience

Plateforme professionnelle de gestion pour la Famille Patience — famille d'église.

## Stack technique

| Composant | Technologie |
|-----------|-------------|
| Backend | Django 5.1 + DRF |
| Auth | JWT (SimpleJWT) |
| BDD | PostgreSQL 16 |
| Temps réel | Django Channels + WebSockets |
| Cache / Broker | Redis 7 |
| Tâches async | Celery |
| Frontend | HTML5 + Tailwind CSS + ES6 SPA |
| PWA | Service Worker + Manifest |

## Architecture

```
icc/
├── config/                 # Configuration Django
│   ├── settings/           # base, development, production
│   ├── urls.py
│   ├── asgi.py             # HTTP + WebSockets
│   └── celery.py
├── apps/
│   ├── core/               # Modèles de base, permissions, exceptions
│   ├── accounts/           # Utilisateurs, rôles, JWT
│   ├── members/            # Profils membres, QR, historique
│   ├── events/             # Gestion des événements
│   ├── attendance/         # Pointage, agents, WebSockets
│   ├── notifications/      # Notifications système
│   └── dashboard/          # Tableaux de bord par rôle
└── frontend/               # SPA (templates + static)
```

## Rôles utilisateurs

- **Administrateur** — accès complet
- **Conseiller** — supervise référents et statistiques
- **Référent** — consulte ses membres assignés
- **Membre / Référent / Conseiller** — espace unifié `/membre/` (interface adaptée au rôle)
- **Agent de pointeur** — affectation temporaire par événement (voir [docs/SPECIFICATION.md](docs/SPECIFICATION.md))

## Spécification

La spécification fonctionnelle détaillée (agent pointeur, accès, événements) est dans **[docs/SPECIFICATION.md](docs/SPECIFICATION.md)**.

## Déploiement sur Render

Guide détaillé : **[docs/DEPLOIEMENT_RENDER.md](docs/DEPLOIEMENT_RENDER.md)** · Sécurité : **[docs/SECURITE_PRODUCTION.md](docs/SECURITE_PRODUCTION.md)**

Fichiers utiles : `render.yaml`, `build.sh`, `runtime.txt`, `.env.example`

### Prérequis

- Dépôt GitHub à jour
- Compte [Render](https://render.com) (gratuit pour tester)
- Compte [Upstash](https://upstash.com) (Redis gratuit)
- Compte [Cloudinary](https://cloudinary.com) (photos — **obligatoire**, le disque Render est éphémère)

### 1. Préparer le projet

```bash
python -c "import secrets; print(secrets.token_urlsafe(64))"   # SECRET_KEY à conserver
git add .
git commit -m "Préparation déploiement Render"
git push origin main
```

### 2. Créer les services Render

**Option recommandée — Blueprint**

1. Render → **New +** → **Blueprint**
2. Connectez le dépôt GitHub
3. Render lit `render.yaml` (web + PostgreSQL)
4. Complétez les variables marquées `sync: false`

**Services à configurer en parallèle**

| Service | Où | Rôle |
|---------|-----|------|
| PostgreSQL | Render → **New +** → **PostgreSQL** | Base de données (`fp-database`) |
| Redis | [Upstash](https://upstash.com) → **Create Database** | Cache, WebSockets, Celery |
| Cloudinary | [cloudinary.com](https://cloudinary.com) → Dashboard | Stockage photos (CDN) |

### 3. Variables d'environnement (Render → Environment)

| Variable | Valeur | Obligatoire |
|----------|--------|-------------|
| `DJANGO_SETTINGS_MODULE` | `config.settings.production` | Oui |
| `SECRET_KEY` | clé aléatoire 64+ caractères | Oui |
| `DEBUG` | `False` | Oui |
| `DATABASE_URL` | auto (base liée) ou URL PostgreSQL | Oui |
| `REDIS_URL` | `rediss://...` (Upstash) | Oui |
| `ALLOWED_HOSTS` | `votre-app.onrender.com` | Oui |
| `CSRF_TRUSTED_ORIGINS` | `https://votre-app.onrender.com` | Oui |
| `CORS_ALLOWED_ORIGINS` | `https://votre-app.onrender.com` | Oui |
| `CLOUDINARY_CLOUD_NAME` | cloud name Cloudinary | Oui |
| `CLOUDINARY_API_KEY` | clé API Cloudinary | Oui |
| `CLOUDINARY_API_SECRET` | secret API Cloudinary | Oui |

Paramètres du service web (si création manuelle) :

- **Build Command** : `chmod +x build.sh && ./build.sh`
- **Start Command** : `gunicorn config.wsgi:application --bind 0.0.0.0:$PORT --workers 2 --timeout 120`
- **Health Check Path** : `/health/`

### 4. Premier déploiement

1. Push sur `main` → Render build automatiquement (`pip install`, `migrate`, `collectstatic`)
2. Vérifiez les logs dans le dashboard Render
3. Testez : `https://votre-app.onrender.com/health/` → `{"status":"ok","database":true}`

Créer l'administrateur (Render → **Shell**) :

```bash
python manage.py createsuperuser
python manage.py setup_local   # données démo (optionnel)
```

### 5. Mises à jour

Chaque push sur la branche connectée relance le déploiement :

```bash
git add .
git commit -m "Description du changement"
git push origin main
```

### Checklist production

- [ ] `SECRET_KEY` unique, `DEBUG=False`
- [ ] `ALLOWED_HOSTS`, `CSRF_TRUSTED_ORIGINS`, `CORS_ALLOWED_ORIGINS` configurés
- [ ] PostgreSQL, Redis (Upstash) et Cloudinary connectés
- [ ] `/health/` OK · super-admin créé
- [ ] Connexion `/gestion/` et upload photo membre testés

## Démarrage rapide

### 1. Prérequis

- Python 3.11+
- Docker & Docker Compose (optionnel — PostgreSQL + Redis)

### 2. Installation

```bash
cd icc
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements.txt
copy .env.example .env       # USE_SQLITE=true pour dev sans Docker
python manage.py migrate
python manage.py setup_local # Comptes démo + données test
python manage.py runserver
```

### 3. Accès local

| URL | Application | Public |
|-----|-------------|--------|
| http://127.0.0.1:8000/membre/ | **Membre** — inscription, profil, carte, événements | Oui |
| http://127.0.0.1:8000/gestion/ | **Administrateur** — gestion complète | Non |
| http://127.0.0.1:8000/admin/ | Django Admin (backend) | Non |

Les URLs `/conseiller/`, `/referent/` et `/pointage/` redirigent vers `/membre/`.

### 4. Comptes démo (après `setup_local`)

Mot de passe pour tous : `Demo1234!`

| Email | Application |
|-------|-------------|
| admin@famille-patience.org | `/gestion/` |
| conseiller@famille-patience.org | `/membre/` |
| referent@famille-patience.org | `/membre/` |
| membre@famille-patience.org | `/membre/` |

### 5. Celery (optionnel)

```bash
celery -A config worker -l info
```

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `POST /api/v1/auth/login/` | Connexion JWT |
| `POST /api/v1/auth/refresh/` | Rafraîchir le token |
| `GET /api/v1/auth/profile/` | Profil utilisateur |
| `GET/POST /api/v1/members/` | Liste / création membres |
| `GET/POST /api/v1/events/` | Liste / création événements |
| `POST /api/v1/events/{id}/open/` | Ouvrir un événement |
| `POST /api/v1/events/{id}/close/` | Fermer un événement |
| `POST /api/v1/attendance/scan/` | Scanner un QR Code |
| `GET /api/v1/dashboard/admin/` | Tableau de bord admin |
| `WS /ws/events/{id}/attendance/` | Présences temps réel |

## Prochaines étapes

- [ ] Module scan QR caméra (agent de pointage)
- [ ] Génération PDF carte de membre
- [ ] Envoi notifications email/SMS (Celery)
- [ ] Tests automatisés
- [ ] Build Tailwind production (npm)

## Licence

Projet privé — Famille Patience.
