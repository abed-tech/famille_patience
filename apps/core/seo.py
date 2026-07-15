"""Contexte et vues SEO (robots, sitemap, métadonnées)."""

from __future__ import annotations

import json

from django.http import HttpResponse
from django.utils import timezone
from django.views.generic import TemplateView


SITE_NAME = "Famille Patience"
DEFAULT_DESCRIPTION = (
    "Plateforme Famille Patience — inscription, carte membre, événements "
    "et présence pour la famille d'église. Accessible sur mobile et ordinateur."
)


def absolute_url(request, path: str) -> str:
    if path.startswith("http://") or path.startswith("https://"):
        return path
    return request.build_absolute_uri(path)


def seo_context(
    request,
    *,
    title: str,
    description: str = DEFAULT_DESCRIPTION,
    path: str = "/",
    robots: str = "index, follow",
    image: str = "/static/icons/og-image.png",
    page_type: str = "website",
):
    canonical = absolute_url(request, path)
    image_url = absolute_url(request, image)
    json_ld = {
        "@context": "https://schema.org",
        "@type": "WebApplication",
        "name": SITE_NAME,
        "url": canonical,
        "description": description,
        "applicationCategory": "LifestyleApplication",
        "operatingSystem": "Web, iOS, Android, Windows, macOS",
        "inLanguage": "fr-FR",
        "image": image_url,
        "offers": {"@type": "Offer", "price": "0", "priceCurrency": "USD"},
        "publisher": {"@type": "Organization", "name": SITE_NAME, "url": canonical},
    }
    return {
        "seo_title": title,
        "seo_description": description,
        "seo_canonical": canonical,
        "seo_robots": robots,
        "seo_image": image_url,
        "seo_site_name": SITE_NAME,
        "seo_locale": "fr_FR",
        "seo_type": page_type,
        "seo_json_ld": json.dumps(json_ld, ensure_ascii=False),
    }


class LandingView(TemplateView):
    template_name = "landing.html"

    def get_context_data(self, **kwargs):
        ctx = super().get_context_data(**kwargs)
        ctx.update(
            seo_context(
                self.request,
                title=f"{SITE_NAME} — Plateforme de la famille d'église",
                description=DEFAULT_DESCRIPTION,
                path="/",
                robots="index, follow",
            )
        )
        return ctx


class MembreAppView(TemplateView):
    template_name = "membre/index.html"

    def get_context_data(self, **kwargs):
        ctx = super().get_context_data(**kwargs)
        path = self.request.path or "/membre/"
        title_map = {
            "/membre/connexion": f"Connexion — {SITE_NAME}",
            "/membre/inscription": f"Inscription — {SITE_NAME}",
        }
        title = title_map.get(path.rstrip("/") if path != "/membre/" else path, f"Espace membre — {SITE_NAME}")
        # Normaliser /membre/connexion/ → clé sans slash final pour le map
        clean = path.rstrip("/") or "/membre"
        for key, value in title_map.items():
            if clean == key.rstrip("/"):
                title = value
                break
        public = any(clean.endswith(s) for s in ("/membre", "/connexion", "/inscription"))
        ctx.update(
            seo_context(
                self.request,
                title=title,
                description=(
                    "Connectez-vous ou inscrivez-vous à l'espace membre Famille Patience : "
                    "profil, carte, QR code, événements et notifications."
                ),
                path=path,
                robots="index, follow" if public else "noindex, follow",
            )
        )
        return ctx


class GestionAppView(TemplateView):
    template_name = "gestion/index.html"

    def get_context_data(self, **kwargs):
        ctx = super().get_context_data(**kwargs)
        ctx.update(
            seo_context(
                self.request,
                title=f"Administration — {SITE_NAME}",
                description="Espace d'administration réservé. Accès non public.",
                path=self.request.path or "/gestion/",
                robots="noindex, nofollow",
            )
        )
        return ctx


def robots_txt(request):
    sitemap = absolute_url(request, "/sitemap.xml")
    body = "\n".join(
        [
            "User-agent: *",
            "Allow: /",
            "Allow: /membre/",
            "Allow: /membre/connexion",
            "Allow: /membre/inscription",
            "Disallow: /gestion/",
            "Disallow: /admin/",
            "Disallow: /api/",
            "Disallow: /health/",
            f"Sitemap: {sitemap}",
            "",
        ]
    )
    return HttpResponse(body, content_type="text/plain; charset=utf-8")


def sitemap_xml(request):
    now = timezone.now().date().isoformat()
    urls = [
        ("/", "1.0", "weekly"),
        ("/membre/", "0.9", "weekly"),
        ("/membre/connexion", "0.7", "monthly"),
        ("/membre/inscription", "0.8", "monthly"),
    ]
    items = []
    for path, priority, changefreq in urls:
        loc = absolute_url(request, path)
        items.append(
            f"  <url>\n"
            f"    <loc>{loc}</loc>\n"
            f"    <lastmod>{now}</lastmod>\n"
            f"    <changefreq>{changefreq}</changefreq>\n"
            f"    <priority>{priority}</priority>\n"
            f"  </url>"
        )
    xml = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        + "\n".join(items)
        + "\n</urlset>\n"
    )
    return HttpResponse(xml, content_type="application/xml; charset=utf-8")
