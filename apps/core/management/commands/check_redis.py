"""Vérifie la connexion Redis / Upstash (local et production)."""
from django.core.management.base import BaseCommand

from apps.core.redis_client import ping_native_redis, ping_upstash_rest, redis_health
from config.redis_settings import native_redis_url, upstash_rest_configured


class Command(BaseCommand):
    help = "Teste la connexion Upstash (REST) et Redis natif (Channels, Celery)."

    def handle(self, *args, **options):
        self.stdout.write("=== Vérification Redis / Upstash ===\n")

        if upstash_rest_configured():
            self.stdout.write("Upstash REST (UPSTASH_REDIS_REST_URL)…")
            rest = ping_upstash_rest()
            if rest.get("ok"):
                self.stdout.write(self.style.SUCCESS("  OK — API REST Upstash"))
            else:
                self.stdout.write(self.style.ERROR(f"  ÉCHEC — {rest.get('error')}"))
        else:
            self.stdout.write(self.style.WARNING("Upstash REST : variables non configurées"))

        native_url = native_redis_url()
        if native_url:
            self.stdout.write(f"Redis natif ({native_url.split('@')[-1] if '@' in native_url else '…'})…")
            native = ping_native_redis()
            if native.get("ok"):
                self.stdout.write(self.style.SUCCESS("  OK — Redis natif (Channels / Celery)"))
            else:
                self.stdout.write(self.style.ERROR(f"  ÉCHEC — {native.get('error')}"))
        else:
            self.stdout.write(
                self.style.WARNING(
                    "Redis natif : REDIS_URL / UPSTASH_REDIS_URL non défini — "
                    "WebSockets temps réel et Celery nécessitent l'URL « Redis Connect » Upstash."
                )
            )

        summary = redis_health()
        if summary["ok"]:
            self.stdout.write(self.style.SUCCESS("\nRésultat global : Redis opérationnel"))
        else:
            self.stdout.write(self.style.ERROR("\nRésultat global : problème de configuration Redis"))
            raise SystemExit(1)
