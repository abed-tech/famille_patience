from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework.exceptions import AuthenticationFailed
from django.contrib.auth import get_user_model

from apps.core.mixins import APIResponseMixin
from apps.core.permissions import IsAdmin
from apps.core.app_access import role_allowed_for_app, access_denied_message, APP_POINTAGE
from apps.core.throttling import LoginRateThrottle
from apps.attendance.models import EventAgentAssignment
from apps.events.models import EventStatus
from .serializers import (
    UserSerializer,
    UserCreateSerializer,
    UserUpdateSerializer,
    ChangePasswordSerializer,
)

User = get_user_model()


def _user_from_phone(identifier):
    """Résout un téléphone vers un utilisateur membre."""
    from apps.members.models import Member

    member = (
        Member.objects.filter(phone_primary=identifier, user__isnull=False)
        .select_related("user")
        .first()
    )
    if member and member.user.is_active:
        return member.user
    return User.objects.filter(phone=identifier, is_active=True, role="member").first()


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    app_id = None

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["role"] = user.role
        token["email"] = user.email
        token["full_name"] = user.full_name
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        app_id = self.context.get("app_id")
        if app_id and not role_allowed_for_app(self.user.role, app_id):
            raise AuthenticationFailed(access_denied_message(app_id))

        if app_id == APP_POINTAGE:
            has_active = EventAgentAssignment.objects.filter(
                agent=self.user,
                is_active=True,
                event__status=EventStatus.OPEN,
            ).exists()
            if not has_active:
                raise AuthenticationFailed(
                    "Aucun événement ouvert ne vous autorise à pointer pour le moment."
                )

        data["user"] = UserSerializer(self.user).data
        if app_id:
            data["app"] = app_id
        return data


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer
    throttle_classes = [LoginRateThrottle]

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["app_id"] = self.request.data.get("app")
        return ctx


class AppLoginView(CustomTokenObtainPairView):
    """Connexion scoped par application (membre, gestion, referent, pointage)."""

    throttle_classes = [LoginRateThrottle]

    def post(self, request, *args, **kwargs):
        if self.kwargs.get("app_id") == "membre":
            data = request.data.copy()
            identifier = (data.get("identifier") or data.get("email") or "").strip()
            if identifier:
                if "@" in identifier:
                    data["email"] = identifier
                else:
                    user = _user_from_phone(identifier)
                    if not user:
                        return Response(
                            {"success": False, "error": {"message": "Identifiants incorrects."}},
                            status=status.HTTP_401_UNAUTHORIZED,
                        )
                    data["email"] = user.email
            request._member_login_data = data
        return super().post(request, *args, **kwargs)

    def get_serializer(self, *args, **kwargs):
        if hasattr(self.request, "_member_login_data"):
            kwargs["data"] = self.request._member_login_data
        return super().get_serializer(*args, **kwargs)

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["app_id"] = self.kwargs.get("app_id")
        return ctx

class RegisterView(APIResponseMixin, generics.CreateAPIView):
    """Désactivé — les membres s'inscrivent via /api/v1/members/register/."""

    queryset = User.objects.all()
    serializer_class = UserCreateSerializer
    permission_classes = [IsAdmin]
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return self.created_response(
            UserSerializer(user).data,
            message="Compte créé avec succès.",
        )


class ProfileView(APIResponseMixin, generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user

    def retrieve(self, request, *args, **kwargs):
        serializer = self.get_serializer(self.get_object())
        return self.success_response(serializer.data)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = UserUpdateSerializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return self.success_response(
            UserSerializer(instance).data,
            message="Profil mis à jour.",
        )


class ChangePasswordView(APIResponseMixin, generics.GenericAPIView):
    serializer_class = ChangePasswordSerializer
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = request.user
        if not user.check_password(serializer.validated_data["old_password"]):
            return self.error_response("Mot de passe actuel incorrect.", status.HTTP_400_BAD_REQUEST)

        user.set_password(serializer.validated_data["new_password"])
        user.save()
        return self.success_response(message="Mot de passe modifié avec succès.")


class UserListCreateView(APIResponseMixin, generics.ListCreateAPIView):
    queryset = User.objects.all()
    permission_classes = [IsAdmin]

    def get_serializer_class(self):
        if self.request.method == "POST":
            return UserCreateSerializer
        return UserSerializer

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        role = request.query_params.get("role")
        if role:
            queryset = queryset.filter(role=role)
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(queryset, many=True)
        return self.success_response(serializer.data)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return self.created_response(UserSerializer(user).data, "Utilisateur créé.")


class UserDetailView(APIResponseMixin, generics.RetrieveUpdateDestroyAPIView):
    queryset = User.objects.all()
    permission_classes = [IsAdmin]
    lookup_field = "pk"

    def get_serializer_class(self):
        if self.request.method in ("PUT", "PATCH"):
            return UserUpdateSerializer
        return UserSerializer

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        return self.success_response(UserSerializer(instance).data)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = UserUpdateSerializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return self.success_response(UserSerializer(instance).data, "Utilisateur mis à jour.")

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.is_active = False
        instance.save(update_fields=["is_active"])
        return self.success_response(message="Utilisateur désactivé.")
