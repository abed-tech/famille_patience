import uuid

from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models

from apps.core.models import TimeStampedModel


class UserRole(models.TextChoices):
    ADMIN = "admin", "Administrateur"
    COUNSELLOR = "counsellor", "Conseiller"
    REFERRER = "referrer", "Référent"
    MEMBER = "member", "Membre"
    ATTENDANCE_AGENT = "attendance_agent", "Agent de pointage"


class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("L'adresse email est obligatoire.")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("role", UserRole.ADMIN)

        if extra_fields.get("is_staff") is not True:
            raise ValueError("Le superutilisateur doit avoir is_staff=True.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Le superutilisateur doit avoir is_superuser=True.")

        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin, TimeStampedModel):
    """Modèle utilisateur personnalisé avec gestion des rôles."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField("Email", unique=True, max_length=255)
    first_name = models.CharField("Prénom", max_length=100, blank=True)
    last_name = models.CharField("Nom", max_length=100, blank=True)
    phone = models.CharField("Téléphone", max_length=20, blank=True)
    role = models.CharField(
        "Rôle",
        max_length=20,
        choices=UserRole.choices,
        default=UserRole.MEMBER,
    )
    is_active = models.BooleanField("Actif", default=True)
    is_staff = models.BooleanField("Accès admin Django", default=False)
    avatar = models.ImageField("Photo", upload_to="avatars/", blank=True, null=True)

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    class Meta:
        verbose_name = "Utilisateur"
        verbose_name_plural = "Utilisateurs"
        ordering = ["-created_at"]

    def __str__(self):
        return self.email

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}".strip() or self.email

    @property
    def is_admin(self):
        return self.role == UserRole.ADMIN

    @property
    def is_counsellor(self):
        return self.role == UserRole.COUNSELLOR

    @property
    def is_referrer(self):
        return self.role == UserRole.REFERRER

    @property
    def is_member(self):
        return self.role == UserRole.MEMBER

    @property
    def is_attendance_agent(self):
        return self.role == UserRole.ATTENDANCE_AGENT
