import uuid

from django.conf import settings
from django.db import models
from auditlog.registry import auditlog

from apps.core.models import TimeStampedModel


class ChurchPole(TimeStampedModel):
    """Pôle de l'église."""

    name = models.CharField("Nom", max_length=100, unique=True)
    description = models.TextField("Description", blank=True)
    is_active = models.BooleanField("Actif", default=True)

    class Meta:
        verbose_name = "Pôle de l'église"
        verbose_name_plural = "Pôles de l'église"
        ordering = ["name"]

    def __str__(self):
        return self.name


class ChurchDepartment(TimeStampedModel):
    """Département de l'église."""

    name = models.CharField("Nom", max_length=100)
    pole = models.ForeignKey(
        ChurchPole,
        on_delete=models.CASCADE,
        related_name="departments",
        verbose_name="Pôle",
    )
    description = models.TextField("Description", blank=True)
    is_active = models.BooleanField("Actif", default=True)

    class Meta:
        verbose_name = "Département de l'église"
        verbose_name_plural = "Départements de l'église"
        ordering = ["pole", "name"]
        unique_together = [("name", "pole")]

    def __str__(self):
        return f"{self.name} ({self.pole.name})"


class FamilyPole(TimeStampedModel):
    """Pôle de la famille Patience."""

    name = models.CharField("Nom", max_length=100, unique=True)
    description = models.TextField("Description", blank=True)
    is_active = models.BooleanField("Actif", default=True)

    class Meta:
        verbose_name = "Pôle de la famille"
        verbose_name_plural = "Pôles de la famille"
        ordering = ["name"]

    def __str__(self):
        return self.name


class Profession(TimeStampedModel):
    """Profession — liste dynamique pour l'inscription."""

    name = models.CharField("Nom", max_length=150, unique=True)
    is_active = models.BooleanField("Actif", default=True)

    class Meta:
        verbose_name = "Profession"
        verbose_name_plural = "Professions"
        ordering = ["name"]

    def __str__(self):
        return self.name


class ICCModuleLevel(models.TextChoices):
    M001 = "001", "001"
    M101 = "101", "101"
    M201 = "201", "201"
    M301 = "301", "301"
    M401 = "401", "401"
    M501 = "501", "501"


class MemberStatus(models.TextChoices):
    ACTIVE = "active", "Actif"
    SUSPENDED = "suspended", "Suspendu"
    INACTIVE = "inactive", "Inactif"
    TRANSFERRED = "transferred", "Transféré"


class Gender(models.TextChoices):
    MALE = "M", "Masculin"
    FEMALE = "F", "Féminin"


class MaritalStatus(models.TextChoices):
    SINGLE = "single", "Célibataire"
    MARRIED = "married", "Marié(e)"
    DIVORCED = "divorced", "Divorcé(e)"
    WIDOWED = "widowed", "Veuf/Veuve"


class Member(TimeStampedModel):
    """Profil complet d'un membre de la Famille Patience."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="member_profile",
        verbose_name="Compte utilisateur",
        null=True,
        blank=True,
    )
    member_number = models.CharField("Numéro de membre", max_length=20, unique=True, editable=False)
    qr_code = models.CharField("Code QR", max_length=100, unique=True, editable=False)
    photo = models.ImageField("Photo", upload_to="members/photos/", blank=True, null=True)

    # Identité
    last_name = models.CharField("Nom", max_length=100)
    middle_name = models.CharField("Postnom", max_length=100, blank=True)
    first_name = models.CharField("Prénom", max_length=100)
    gender = models.CharField("Sexe", max_length=1, choices=Gender.choices, blank=True)
    date_of_birth = models.DateField("Date de naissance")
    address = models.TextField("Adresse")
    profession_ref = models.ForeignKey(
        "Profession",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="members",
        verbose_name="Profession",
    )
    profession = models.CharField("Profession (texte)", max_length=150, blank=True)

    # Contact
    phone_primary = models.CharField("Téléphone principal", max_length=20)
    phone_secondary = models.CharField("Téléphone secondaire", max_length=20, blank=True)
    whatsapp = models.CharField("WhatsApp", max_length=20, blank=True)
    email = models.EmailField("Email", blank=True)
    facebook = models.URLField("Facebook", blank=True)
    instagram = models.URLField("Instagram", blank=True)

    # Informations ecclésiales
    marital_status = models.CharField(
        "Situation matrimoniale",
        max_length=20,
        choices=MaritalStatus.choices,
        default=MaritalStatus.SINGLE,
    )
    is_baptized = models.BooleanField("Baptisé", default=False)
    baptism_year = models.PositiveSmallIntegerField("Année de baptême", null=True, blank=True)
    icc_modules_completed = models.BooleanField("Modules ICC suivis", default=False)
    icc_module_level = models.CharField(
        "Niveau module ICC",
        max_length=3,
        choices=ICCModuleLevel.choices,
        blank=True,
    )
    serves_in_church = models.BooleanField("Sert dans l'église", default=False)
    serves_in_family = models.BooleanField("Sert dans la Famille Patience", default=False)
    church_pole = models.ForeignKey(
        ChurchPole,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="members",
        verbose_name="Pôle de l'église",
    )
    church_department = models.ForeignKey(
        ChurchDepartment,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="members",
        verbose_name="Département de l'église",
    )
    interested_church_department = models.ForeignKey(
        ChurchDepartment,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="interested_members",
        verbose_name="Département souhaité (église)",
    )
    family_pole = models.ForeignKey(
        FamilyPole,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="members",
        verbose_name="Pôle de la famille",
    )
    interested_family_pole = models.ForeignKey(
        FamilyPole,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="interested_members",
        verbose_name="Pôle souhaité (famille)",
    )

    # Affectations
    referrer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_members",
        verbose_name="Référent assigné",
        limit_choices_to={"role": "referrer"},
    )
    counsellor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="supervised_members",
        verbose_name="Conseiller responsable",
        limit_choices_to={"role": "counsellor"},
    )

    registration_date = models.DateField("Date d'inscription", auto_now_add=True)
    status = models.CharField(
        "Statut",
        max_length=20,
        choices=MemberStatus.choices,
        default=MemberStatus.ACTIVE,
    )

    class Meta:
        verbose_name = "Membre"
        verbose_name_plural = "Membres"
        ordering = ["last_name", "first_name"]
        indexes = [
            models.Index(fields=["member_number"]),
            models.Index(fields=["qr_code"]),
            models.Index(fields=["status"]),
            models.Index(fields=["referrer"]),
            models.Index(fields=["counsellor"]),
        ]

    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.member_number})"

    @property
    def full_name(self):
        parts = [self.first_name, self.middle_name, self.last_name]
        return " ".join(p for p in parts if p)


class MemberHistory(TimeStampedModel):
    """Historique des actions et modifications d'un membre."""

    class ActionType(models.TextChoices):
        CREATED = "created", "Création"
        UPDATED = "updated", "Modification"
        STATUS_CHANGED = "status_changed", "Changement de statut"
        ASSIGNMENT = "assignment", "Affectation"
        EVENT_ATTENDANCE = "event_attendance", "Présence événement"
        EVENT_ABSENCE = "event_absence", "Absence événement"

    member = models.ForeignKey(
        Member,
        on_delete=models.CASCADE,
        related_name="history",
        verbose_name="Membre",
    )
    action_type = models.CharField("Type d'action", max_length=30, choices=ActionType.choices)
    description = models.TextField("Description")
    performed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="member_history_actions",
        verbose_name="Effectué par",
    )
    metadata = models.JSONField("Métadonnées", default=dict, blank=True)

    class Meta:
        verbose_name = "Historique membre"
        verbose_name_plural = "Historiques membres"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.member} — {self.get_action_type_display()}"


auditlog.register(Member)
auditlog.register(ChurchPole)
auditlog.register(ChurchDepartment)
auditlog.register(FamilyPole)
auditlog.register(Profession)
