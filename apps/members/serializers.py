from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.db import transaction

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
    facebook = serializers.URLField(required=False, allow_blank=True)
    instagram = serializers.URLField(required=False, allow_blank=True)

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

    def validate(self, attrs):
        request = self.context.get("request")
        if request and request.FILES.get("photo") and not attrs.get("photo"):
            attrs["photo"] = request.FILES["photo"]

        if attrs.get("photo"):
            from apps.core.security import validate_uploaded_image
            validate_uploaded_image(attrs["photo"])

        if attrs["password"] != attrs.pop("password_confirm"):
            raise serializers.ValidationError({"password_confirm": "Les mots de passe ne correspondent pas."})
        if User.objects.filter(email=attrs["email"]).exists():
            raise serializers.ValidationError({"email": "Cet email est déjà utilisé."})

        has_photo = bool(attrs.get("photo"))
        validate_complete_member_profile(attrs, require_photo=True, has_photo=has_photo)
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        member_email = validated_data.pop("member_email", "")
        password = validated_data.pop("password")

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

        member = Member.objects.create(user=user, **validated_data)

        MemberHistory.objects.create(
            member=member,
            action_type=MemberHistory.ActionType.CREATED,
            description="Auto-inscription via l'application membre",
            performed_by=user,
        )

        return member
