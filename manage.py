#!/usr/bin/env python
"""Utilitaire en ligne de commande Django pour Famille Patience."""
import os
import sys


def main():
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Impossible d'importer Django. Vérifiez l'installation et "
            "l'environnement virtuel."
        ) from exc
    execute_from_command_line(sys.argv)


if __name__ == "__main__":
    main()
