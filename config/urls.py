from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.views.generic import RedirectView, TemplateView

from config.redirect_views import ReferentRedirectView, PointageRedirectView, ConseillerRedirectView
from apps.core.views import health_check

urlpatterns = [
    path("health/", health_check, name="health_check"),
    path("admin/", admin.site.urls),

    # API REST
    path("api/v1/auth/", include("apps.accounts.urls")),
    path("api/v1/members/", include("apps.members.urls")),
    path("api/v1/events/", include("apps.events.urls")),
    path("api/v1/attendance/", include("apps.attendance.urls")),
    path("api/v1/notifications/", include("apps.notifications.urls")),
    path("api/v1/dashboard/", include("apps.dashboard.urls")),

    # Racine → Application Membre (seule app visible publiquement)
    path("", RedirectView.as_view(url="/membre/", permanent=False)),

    # Application 1 : Membre
    path("membre/", TemplateView.as_view(template_name="membre/index.html"), name="app_membre"),
    path("membre/<path:path>", TemplateView.as_view(template_name="membre/index.html")),

    # Application 2 : Administrateur (URL séparée, non liée depuis l'app membre)
    path("gestion/", TemplateView.as_view(template_name="gestion/index.html"), name="app_gestion"),
    path("gestion/<path:path>", TemplateView.as_view(template_name="gestion/index.html")),

    # Conseiller → espace membre unifié
    path("conseiller/", ConseillerRedirectView.as_view(), name="app_conseiller"),
    path("conseiller/<path:path>", ConseillerRedirectView.as_view()),

    # Référent → espace membre unifié
    path("referent/", ReferentRedirectView.as_view(), name="app_referent"),
    path("referent/<path:path>", ReferentRedirectView.as_view()),

    # Agent de pointage → espace membre (autorisation temporaire)
    path("pointage/", PointageRedirectView.as_view(), name="app_pointage"),
    path("pointage/<path:path>", PointageRedirectView.as_view()),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

admin.site.site_header = "Famille Patience — Administration"
admin.site.site_title = "Famille Patience"
admin.site.index_title = "Gestion de la famille d'église"
