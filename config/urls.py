from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

from config.redirect_views import ReferentRedirectView, PointageRedirectView, ConseillerRedirectView
from apps.core.views import health_check
from apps.core.seo import (
    LandingView,
    MembreAppView,
    GestionAppView,
    robots_txt,
    sitemap_xml,
)

urlpatterns = [
    path("health/", health_check, name="health_check"),
    path("robots.txt", robots_txt, name="robots_txt"),
    path("sitemap.xml", sitemap_xml, name="sitemap_xml"),
    path("admin/", admin.site.urls),

    # API REST
    path("api/v1/auth/", include("apps.accounts.urls")),
    path("api/v1/members/", include("apps.members.urls")),
    path("api/v1/events/", include("apps.events.urls")),
    path("api/v1/attendance/", include("apps.attendance.urls")),
    path("api/v1/notifications/", include("apps.notifications.urls")),
    path("api/v1/dashboard/", include("apps.dashboard.urls")),

    # Page d'accueil publique (SEO / multi-appareils)
    path("", LandingView.as_view(), name="home"),

    # Application 1 : Membre
    path("membre/", MembreAppView.as_view(), name="app_membre"),
    path("membre/<path:path>", MembreAppView.as_view()),

    # Application 2 : Administrateur (non indexé)
    path("gestion/", GestionAppView.as_view(), name="app_gestion"),
    path("gestion/<path:path>", GestionAppView.as_view()),

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
