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

## Production (Render)

- **[docs/DEPLOIEMENT_RENDER.md](docs/DEPLOIEMENT_RENDER.md)** — déploiement pas à pas (GitHub, PostgreSQL, Redis, Cloudinary)
- **[docs/SECURITE_PRODUCTION.md](docs/SECURITE_PRODUCTION.md)** — sécurité, robustesse, monitoring
- Fichiers : `render.yaml`, `build.sh`, `runtime.txt`, `.env.example`

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

### 3. Celery (optionnel)

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
