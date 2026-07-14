#!/usr/bin/env bash
# Script de build Render — install, migrations, fichiers statiques
set -o errexit

echo "==> Installation des dépendances"
pip install --upgrade pip
pip install -r requirements.txt

echo "==> Collecte des fichiers statiques"
python manage.py collectstatic --noinput

echo "==> Migrations base de données"
python manage.py migrate --noinput

echo "==> Bootstrap production (admin + données de base)"
python manage.py bootstrap_prod

echo "==> Build terminé"
