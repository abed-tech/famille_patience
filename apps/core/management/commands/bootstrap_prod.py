"""
Initialisation production sans Shell Render.

Variables d'environnement optionnelles :
  CREATE_SUPERUSER_EMAIL     — email admin (ex. abednyembwe3@gmail.com)
  CREATE_SUPERUSER_PASSWORD  — mot de passe admin
  BOOTSTRAP_SEED_DATA=true   — crée professions / pôles de base (défaut: true)
"""
import os

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

from apps.accounts.models import UserRole


class Command(BaseCommand):
    help = "Crée le superuser et les données de base depuis les variables d'environnement."

    def handle(self, *args, **options):
        seed = os.getenv("BOOTSTRAP_SEED_DATA", "true").lower() in ("true", "1", "yes")
        if seed:
            self._seed_data()

        email = (os.getenv("CREATE_SUPERUSER_EMAIL") or os.getenv("DJANGO_SUPERUSER_EMAIL") or "").strip()
        password = os.getenv("CREATE_SUPERUSER_PASSWORD") or os.getenv("DJANGO_SUPERUSER_PASSWORD") or ""

        if not email or not password:
            self.stdout.write(
                self.style.WARNING(
                    "CREATE_SUPERUSER_EMAIL / CREATE_SUPERUSER_PASSWORD non définis — "
                    "aucun compte admin créé (ajoutez-les dans Render → Environment)."
                )
            )
            return

        User = get_user_model()
        user = User.objects.filter(email=email).first()
        if user:
            user.set_password(password)
            user.is_staff = True
            user.is_superuser = True
            user.is_active = True
            user.role = UserRole.ADMIN
            user.save(update_fields=["password", "is_staff", "is_superuser", "is_active", "role", "updated_at"])
            self.stdout.write(self.style.SUCCESS(f"Admin mis à jour : {email}"))
        else:
            User.objects.create_superuser(email=email, password=password)
            self.stdout.write(self.style.SUCCESS(f"Admin créé : {email}"))

    def _seed_data(self):
        from apps.members.seed_catalog import ensure_registration_catalog

        ensure_registration_catalog()
        self.stdout.write(self.style.SUCCESS("Données de base (professions, pôles) prêtes."))
