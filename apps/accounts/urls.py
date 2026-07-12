from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    CustomTokenObtainPairView,
    AppLoginView,
    RegisterView,
    ProfileView,
    ChangePasswordView,
    UserListCreateView,
    UserDetailView,
)

app_name = "accounts"

urlpatterns = [
    path("login/", CustomTokenObtainPairView.as_view(), name="login"),
    path("login/<str:app_id>/", AppLoginView.as_view(), name="app_login"),
    path("refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("register/", RegisterView.as_view(), name="register"),
    path("profile/", ProfileView.as_view(), name="profile"),
    path("change-password/", ChangePasswordView.as_view(), name="change_password"),
    path("users/", UserListCreateView.as_view(), name="user_list"),
    path("users/<uuid:pk>/", UserDetailView.as_view(), name="user_detail"),
]