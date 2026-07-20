"""Commande de configuration locale — comptes démo et données initiales."""
from datetime import date

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

from apps.accounts.models import UserRole
from apps.members.models import Member, ChurchPole, FamilyPole, Gender, MemberStatus

User = get_user_model()

DEMO_PASSWORD = "Demo1234!"


class Command(BaseCommand):
    help = "Configure l'environnement local avec des comptes démo et des données de test."

    def handle(self, *args, **options):
        self.stdout.write("Configuration locale Famille Patience...\n")

        admin, created = User.objects.get_or_create(
            email="admin@famille-patience.org",
            defaults={
                "first_name": "Admin",
                "last_name": "Patience",
                "role": UserRole.ADMIN,
                "is_staff": True,
                "is_superuser": True,
            },
        )
        if created:
            admin.set_password(DEMO_PASSWORD)
            admin.save()
            self.stdout.write(self.style.SUCCESS("  + Admin créé"))
        else:
            self.stdout.write("  · Admin existant")

        counsellor, _ = User.objects.get_or_create(
            email="conseiller@famille-patience.org",
            defaults={"first_name": "Jean", "last_name": "Conseiller", "role": UserRole.COUNSELLOR},
        )
        if _:
            counsellor.set_password(DEMO_PASSWORD)
            counsellor.save()

        referrer, _ = User.objects.get_or_create(
            email="referent@famille-patience.org",
            defaults={"first_name": "Marie", "last_name": "Référent", "role": UserRole.REFERRER},
        )
        if _:
            referrer.set_password(DEMO_PASSWORD)
            referrer.save()

        member_user, _ = User.objects.get_or_create(
            email="membre@famille-patience.org",
            defaults={"first_name": "Paul", "last_name": "Membre", "role": UserRole.MEMBER},
        )
        if _:
            member_user.set_password(DEMO_PASSWORD)
            member_user.save()

        church_pole, _ = ChurchPole.objects.get_or_create(name="Louange", defaults={"description": "Pôle louange"})
        family_pole, _ = FamilyPole.objects.get_or_create(name="Jérusalem", defaults={"description": "Pôle famille"})

        family_poles = [
            "Pôle Restauration",
            "Pôle Accueil et Intégration",
            "Pôle Logistique",
            "Pôle Animation (DCA)",
            "Pôle Intercession",
            "Pôle Évangélisation",
            "Pôle Finance",
            "Pôle Secrétariat et Communication",
        ]
        for name in family_poles:
            FamilyPole.objects.get_or_create(name=name)

        from apps.members.models import ChurchDepartment

        departments = [
            "Intendance",
            "Ministère de Louange et Adoration",
            "Couple et Famille",
            "Intégration",
            "MDE",
            "MDDS",
            "MFI",
            "MH2I",
            "EJP",
            "AEF",
            "MJI",
            "Protocole",
            "Accueil",
            "Sécurité",
            "Nettoyage",
            "Communication",
            "Audiovisuel",
            "Secrétariat Général",
            "MDP",
            "Social",
            "Impact Santé",
            "Librairie",
            "Formation",
        ]
        for name in departments:
            ChurchDepartment.objects.get_or_create(name=name, pole=church_pole, defaults={"description": name})

        from apps.members.seed_catalog import ensure_registration_catalog
        ensure_registration_catalog()

        if not Member.objects.filter(member_number="FP-DEMO001").exists():
            Member.objects.create(
                member_number="FP-DEMO001",
                qr_code="FPQR-demo001test",
                last_name="Kabongo",
                first_name="Grace",
                gender=Gender.FEMALE,
                date_of_birth=date(1995, 3, 15),
                address="Kinshasa, RDC",
                profession="Enseignante",
                phone_primary="+243900000001",
                email="grace@example.com",
                church_pole=church_pole,
                family_pole=family_pole,
                referrer=referrer,
                counsellor=counsellor,
                status=MemberStatus.ACTIVE,
            )
            self.stdout.write(self.style.SUCCESS("  + Membre demo cree"))

        from apps.members.utils import user_has_member_profile

        if not user_has_member_profile(member_user):
            Member.objects.create(
                user=member_user,
                last_name="Membre",
                first_name="Paul",
                gender=Gender.MALE,
                date_of_birth=date(1990, 1, 1),
                address="Kinshasa, RDC",
                phone_primary="+243900000002",
                church_pole=church_pole,
                family_pole=family_pole,
                referrer=referrer,
                counsellor=counsellor,
                status=MemberStatus.ACTIVE,
            )
            self.stdout.write(self.style.SUCCESS("  + Profil membre demo lie"))

        if not user_has_member_profile(referrer):
            Member.objects.create(
                user=referrer,
                last_name="Référent",
                first_name="Marie",
                gender=Gender.FEMALE,
                date_of_birth=date(1988, 6, 10),
                address="Kinshasa, RDC",
                phone_primary="+243900000010",
                church_pole=church_pole,
                family_pole=family_pole,
                counsellor=counsellor,
                status=MemberStatus.ACTIVE,
            )
            self.stdout.write(self.style.SUCCESS("  + Profil membre demo referent lie"))

        if not user_has_member_profile(counsellor):
            Member.objects.create(
                user=counsellor,
                last_name="Conseiller",
                first_name="Jean",
                gender=Gender.MALE,
                date_of_birth=date(1985, 2, 20),
                address="Kinshasa, RDC",
                phone_primary="+243900000011",
                church_pole=church_pole,
                family_pole=family_pole,
                status=MemberStatus.ACTIVE,
            )
            self.stdout.write(self.style.SUCCESS("  + Profil membre demo conseiller lie"))

        self.stdout.write(self.style.SUCCESS("\n=== Acces local ===\n"))
        self.stdout.write("App Membre (tous) : http://127.0.0.1:8000/membre/")
        self.stdout.write("App Admin         : http://127.0.0.1:8000/gestion/")
        self.stdout.write("Django Admin      : http://127.0.0.1:8000/admin/\n")
        self.stdout.write(f"Mot de passe demo : {DEMO_PASSWORD}\n")
        self.stdout.write("  admin@famille-patience.org        -> /gestion/")
        self.stdout.write("  conseiller@famille-patience.org   -> /membre/ (interface conseiller)")
        self.stdout.write("  referent@famille-patience.org     -> /membre/ (interface referent)")
        self.stdout.write("  membre@famille-patience.org       -> /membre/ (interface membre)\n")
