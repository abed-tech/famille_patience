import logging

from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import DataError, IntegrityError, transaction

from apps.accounts.models import UserRole
from .registration_validation import validate_complete_member_profile, as_bool
from .models import (
    Member,
    MemberHistory,
    ChurchPole,
    ChurchDepartment,
    FamilyPole,
    Profession,
    ICCModuleLevel,
)

User = get_user_model()
logger = logging.getLogger("famille_patience")


def member_photo_url(member, request=None):
    """URL photo sans lever d'exception (Cloudinary / stockage)."""
    if not getattr(member, "photo", None):
        return None
    try:
        url = member.photo.url
    except Exception:
        return None
    if request and url and str(url).startswith("/"):
        return request.build_absolute_uri(url)
    return url


def normalize_optional_url(value):
    value = (value or "").strip()
    if not value:
        return ""
    if value.lower() in ("null", "undefined", "none"):
        return ""
    if not value.startswith(("http://", "https://")):
        return f"https://{value}"
    return value[:200]


class ChurchPoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChurchPole
        fields = ("id", "name", "description", "is_active")


class ChurchDepartmentSerializer(serializers.ModelSerializer):
    pole_name = serializers.CharField(source="pole.name", read_only=True)

    class Meta:
        model = ChurchDepartment
        fields = ("id", "name", "pole", "pole_name", "description", "is_active")


class FamilyPoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = FamilyPole
        fields = ("id", "name", "description", "is_active")


class ProfessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Profession
        fields = ("id", "name", "is_active")


class MemberHistorySerializer(serializers.ModelSerializer):
    performed_by_name = serializers.CharField(source="performed_by.full_name", read_only=True)

    class Meta:
        model = MemberHistory
        fields = (
            "id",
            "action_type",
            "description",
            "performed_by",
            "performed_by_name",
            "metadata",
            "created_at",
        )


class MemberListSerializer(serializers.ModelSerializer):
    full_name = serializers.ReadOnlyField()
    referrer_name = serializers.CharField(source="referrer.full_name", read_only=True, default=None)
    counsellor_name = serializers.CharField(source="counsellor.full_name", read_only=True, default=None)
    user_role = serializers.SerializerMethodField()
    has_account = serializers.SerializerMethodField()

    def get_user_role(self, obj):
        return obj.user.role if obj.user_id else "member"

    def get_has_account(self, obj):
        return bool(obj.user_id)

    class Meta:
        model = Member
        fields = (
            "id",
            "member_number",
            "full_name",
            "first_name",
            "last_name",
            "photo",
            "gender",
            "phone_primary",
            "status",
            "referrer",
            "referrer_name",
            "counsellor",
            "counsellor_name",
            "user_role",
            "has_account",
            "registration_date",
        )


class MemberDetailSerializer(serializers.ModelSerializer):
    full_name = serializers.ReadOnlyField()
    user_id = serializers.SerializerMethodField()
    user_role = serializers.SerializerMethodField()
    photo = serializers.SerializerMethodField()
    church_pole_detail = ChurchPoleSerializer(source="church_pole", read_only=True)
    church_department_detail = ChurchDepartmentSerializer(source="church_department", read_only=True)
    family_pole_detail = FamilyPoleSerializer(source="family_pole", read_only=True)
    interested_church_department_detail = ChurchDepartmentSerializer(
        source="interested_church_department", read_only=True
    )
    interested_family_pole_detail = FamilyPoleSerializer(source="interested_family_pole", read_only=True)
    profession_name = serializers.CharField(source="profession_ref.name", read_only=True)
    referrer_name = serializers.CharField(source="referrer.full_name", read_only=True)
    counsellor_name = serializers.CharField(source="counsellor.full_name", read_only=True)

    def get_user_id(self, obj):
        return str(obj.user_id) if obj.user_id else None

    def get_user_role(self, obj):
        return obj.user.role if obj.user_id else None

    def get_photo(self, obj):
        return member_photo_url(obj, self.context.get("request"))

    class Meta:
        model = Member
        fields = (
            "id",
            "member_number",
            "qr_code",
            "photo",
            "last_name",
            "middle_name",
            "first_name",
            "full_name",
            "gender",
            "date_of_birth",
            "address",
            "profession_ref",
            "profession",
            "profession_name",
            "phone_primary",
            "phone_secondary",
            "whatsapp",
            "email",
            "facebook",
            "instagram",
            "marital_status",
            "is_baptized",
            "baptism_year",
            "icc_modules_completed",
            "icc_module_level",
            "serves_in_church",
            "serves_in_family",
            "church_pole",
            "church_pole_detail",
            "church_department",
            "church_department_detail",
            "interested_church_department",
            "interested_church_department_detail",
            "family_pole",
            "family_pole_detail",
            "interested_family_pole",
            "interested_family_pole_detail",
            "referrer",
            "referrer_name",
            "counsellor",
            "counsellor_name",
            "user_id",
            "user_role",
            "registration_date",
            "status",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("member_number", "qr_code", "registration_date", "created_at", "updated_at")


class MemberCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Member
        exclude = ("member_number", "qr_code", "registration_date", "created_at", "updated_at")

    def validate(self, attrs):
        request = self.context.get("request")
        is_create = self.instance is None

        if request and request.FILES.get("photo") and not attrs.get("photo"):
            attrs["photo"] = request.FILES["photo"]

        if attrs.get("photo"):
            from apps.core.security import validate_uploaded_image
            validate_uploaded_image(attrs["photo"])

        for key in ("is_baptized", "icc_modules_completed", "serves_in_church", "serves_in_family"):
            if key in attrs:
                attrs[key] = as_bool(attrs[key])

        if is_create:
            has_photo = bool(attrs.get("photo")) or bool(request and request.FILES.get("photo"))
            validate_complete_member_profile(attrs, require_photo=True, has_photo=has_photo)
        else:
            profession_ref = attrs.get("profession_ref")
            if profession_ref:
                attrs["profession"] = profession_ref.name

        return attrs

    def create(self, validated_data):
        request = self.context.get("request")
        member = super().create(validated_data)
        MemberHistory.objects.create(
            member=member,
            action_type=MemberHistory.ActionType.CREATED,
            description="Membre inscrit dans le système",
            performed_by=request.user if request and request.user.is_authenticated else None,
        )
        return member

    def update(self, instance, validated_data):
        request = self.context.get("request")
        profession_ref = validated_data.get("profession_ref")
        if profession_ref:
            validated_data["profession"] = profession_ref.name
        member = super().update(instance, validated_data)
        MemberHistory.objects.create(
            member=member,
            action_type=MemberHistory.ActionType.UPDATED,
            description="Profil membre mis à jour",
            performed_by=request.user if request and request.user.is_authenticated else None,
        )
        return member


class MemberSelfUpdateSerializer(serializers.ModelSerializer):
    """Champs modifiables par le membre lui-même."""

    class Meta:
        model = Member
        fields = (
            "photo",
            "address",
            "profession_ref",
            "phone_primary",
            "phone_secondary",
            "whatsapp",
            "email",
            "facebook",
            "instagram",
            "marital_status",
        )

    def update(self, instance, validated_data):
        request = self.context.get("request")
        if validated_data.get("photo"):
            from apps.core.security import validate_uploaded_image
            validate_uploaded_image(validated_data["photo"])
        profession_ref = validated_data.get("profession_ref")
        if profession_ref:
            validated_data["profession"] = profession_ref.name
        member = super().update(instance, validated_data)
        MemberHistory.objects.create(
            member=member,
            action_type=MemberHistory.ActionType.UPDATED,
            description="Profil mis à jour par le membre",
            performed_by=request.user if request and request.user.is_authenticated else None,
        )
        return member


class MemberRegistrationSerializer(serializers.Serializer):
    """Inscription complète d'un nouveau membre (compte + profil)."""

    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True)

    last_name = serializers.CharField(max_length=100)
    middle_name = serializers.CharField(max_length=100)
    first_name = serializers.CharField(max_length=100)
    gender = serializers.ChoiceField(
        choices=[("M", "Masculin"), ("F", "Féminin")],
        required=False,
        allow_blank=True,
    )
    date_of_birth = serializers.DateField()
    address = serializers.CharField()
    profession_ref = serializers.PrimaryKeyRelatedField(
        queryset=Profession.objects.filter(is_active=True),
    )

    phone_primary = serializers.CharField(max_length=20)
    phone_secondary = serializers.CharField(max_length=20, required=False, allow_blank=True)
    whatsapp = serializers.CharField(max_length=20)
    member_email = serializers.EmailField(required=False, allow_blank=True)
    facebook = serializers.CharField(required=False, allow_blank=True, max_length=255)
    instagram = serializers.CharField(required=False, allow_blank=True, max_length=255)

    marital_status = serializers.ChoiceField(
        choices=["single", "married", "divorced", "widowed"],
    )
    is_baptized = serializers.CharField()
    baptism_year = serializers.IntegerField(required=False, allow_null=True, min_value=1900, max_value=2100)
    icc_modules_completed = serializers.CharField()
    icc_module_level = serializers.ChoiceField(
        choices=ICCModuleLevel.choices,
        required=False,
        allow_blank=True,
        allow_null=True,
    )

    serves_in_church = serializers.CharField()
    church_department = serializers.PrimaryKeyRelatedField(
        queryset=ChurchDepartment.objects.filter(is_active=True),
        required=False,
        allow_null=True,
    )
    interested_church_department = serializers.PrimaryKeyRelatedField(
        queryset=ChurchDepartment.objects.filter(is_active=True),
        required=False,
        allow_null=True,
    )

    serves_in_family = serializers.CharField()
    family_pole = serializers.PrimaryKeyRelatedField(
        queryset=FamilyPole.objects.filter(is_active=True),
        required=False,
        allow_null=True,
    )
    interested_family_pole = serializers.PrimaryKeyRelatedField(
        queryset=FamilyPole.objects.filter(is_active=True),
        required=False,
        allow_null=True,
    )
    photo = serializers.ImageField()

    def to_internal_value(self, data):
        # FormData : convertir les chaînes vides en null pour les FK / champs optionnels
        empty_as_null = {
            "church_department",
            "interested_church_department",
            "family_pole",
            "interested_family_pole",
            "baptism_year",
            "gender",
            "facebook",
            "instagram",
            "member_email",
            "phone_secondary",
            "icc_module_level",
        }
        cleaned = {}
        getlist = getattr(data, "getlist", None)
        keys = data.keys() if hasattr(data, "keys") else []
        for key in keys:
            values = getlist(key) if getlist else [data.get(key)]
            value = values[0] if values else None
            if key in empty_as_null and value in ("", "null", "undefined", None):
                if key == "icc_module_level":
                    cleaned[key] = ""
                else:
                    cleaned[key] = None
            else:
                cleaned[key] = value
        if "photo" not in cleaned:
            request = self.context.get("request")
            if request and request.FILES.get("photo"):
                cleaned["photo"] = request.FILES["photo"]
        return super().to_internal_value(cleaned)

    def validate(self, attrs):
        request = self.context.get("request")
        if request and request.FILES.get("photo") and not attrs.get("photo"):
            attrs["photo"] = request.FILES["photo"]

        if attrs.get("photo"):
            from apps.core.security import validate_uploaded_image

            try:
                validate_uploaded_image(attrs["photo"])
            except DjangoValidationError as exc:
                raise serializers.ValidationError({"photo": list(exc.messages)}) from exc

        if attrs["password"] != attrs.pop("password_confirm", None):
            raise serializers.ValidationError({"password_confirm": "Les mots de passe ne correspondent pas."})
        if User.objects.filter(email=attrs["email"]).exists():
            raise serializers.ValidationError({"email": "Cet email est déjà utilisé."})

        attrs["facebook"] = normalize_optional_url(attrs.get("facebook"))
        attrs["instagram"] = normalize_optional_url(attrs.get("instagram"))

        # Assurer les listes de référence (prod sans Shell)
        from .seed_catalog import ensure_registration_catalog

        ensure_registration_catalog()

        has_photo = bool(attrs.get("photo"))
        validate_complete_member_profile(attrs, require_photo=True, has_photo=has_photo)
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        member_email = validated_data.pop("member_email", "") or ""
        password = validated_data.pop("password")
        validated_data.pop("password_confirm", None)

        # Nettoyage des Optionals null
        for key in (
            "church_department",
            "interested_church_department",
            "family_pole",
            "interested_family_pole",
            "facebook",
            "instagram",
            "baptism_year",
            "icc_module_level",
            "gender",
        ):
            if key in validated_data and validated_data[key] in (None, ""):
                if key in ("baptism_year",):
                    validated_data[key] = None
                elif key in ("icc_module_level", "gender", "facebook", "instagram"):
                    validated_data[key] = ""
                else:
                    validated_data[key] = None

        user = User.objects.create_user(
            email=validated_data.pop("email"),
            password=password,
            first_name=validated_data["first_name"],
            last_name=validated_data["last_name"],
            phone=validated_data["phone_primary"],
            role=UserRole.MEMBER,
        )

        if member_email:
            validated_data["email"] = member_email

        profession_ref = validated_data.get("profession_ref")
        if profession_ref and not validated_data.get("profession"):
            validated_data["profession"] = profession_ref.name

        try:
            member = Member.objects.create(user=user, **validated_data)
        except (IntegrityError, DataError) as exc:
            logger.exception("Inscription: erreur base de données")
            raise serializers.ValidationError(
                {"detail": "Impossible de créer le profil (données invalides ou déjà utilisées)."}
            ) from exc
        except Exception as exc:
            logger.exception("Inscription: échec création membre (souvent Cloudinary)")
            msg = str(exc).lower()
            detail = str(exc).strip()[:180] or type(exc).__name__
            if validated_data.get("photo") is not None or "cloudinary" in msg or "upload" in msg:
                raise serializers.ValidationError(
                    {
                        "photo": (
                            f"Échec upload photo (Cloudinary) : {detail}. "
                            "Sur Render : CLOUDINARY_CLOUD_NAME + CLOUDINARY_API_KEY + "
                            "CLOUDINARY_API_SECRET ; supprimez CLOUDINARY_URL si malformée."
                        )
                    }
                ) from exc
            raise

        MemberHistory.objects.create(
            member=member,
            action_type=MemberHistory.ActionType.CREATED,
            description="Auto-inscription via l'application membre",
            performed_by=user,
        )

        return member
