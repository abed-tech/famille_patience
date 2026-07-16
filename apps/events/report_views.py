"""Vues complémentaires pour les événements."""
from django.http import HttpResponse
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from apps.core.mixins import APIResponseMixin
from apps.events.models import Event
from apps.events.event_reports import (
    get_event_report_data,
    generate_event_excel_report,
    generate_event_pdf_report,
)


class EventReportView(APIResponseMixin, APIView):
    """Rapport de présence d'un événement (JSON, PDF ou Excel).

    Important : utiliser le paramètre ``export`` (pas ``format``).
    ``?format=`` est réservé à la négociation de contenu DRF et provoque
    un 404 lorsque seuls les renderers JSON sont configurés.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            event = Event.objects.get(pk=pk)
        except Event.DoesNotExist:
            return self.error_response("Événement introuvable.", 404)

        if request.user.role not in ("admin", "counsellor"):
            return self.error_response("Accès non autorisé.", 403)

        if request.user.role == "counsellor":
            from apps.members.models import Member
            if not Member.objects.filter(counsellor=request.user).exists():
                return self.error_response("Aucun membre sous votre responsabilité.", 403)

        # ``export`` évite le conflit avec URL_FORMAT_OVERRIDE (format) de DRF.
        fmt = (
            request.query_params.get("export")
            or request.query_params.get("file_format")
            or "json"
        ).lower()
        if fmt in ("xlsx", "xls"):
            fmt = "excel"

        if fmt == "json":
            counsellor = request.user if request.user.role == "counsellor" else None
            return self.success_response(
                get_event_report_data(event, request, counsellor_user=counsellor)
            )

        if request.user.role != "admin":
            return self.error_response("Export réservé aux administrateurs.", 403)

        safe_name = "".join(
            c if c.isalnum() or c in "-_" else "_" for c in (event.name or "event")
        )[:40]
        filename_base = f"rapport_{safe_name}_{event.date}"

        try:
            if fmt == "excel":
                buffer = generate_event_excel_report(event, request)
                response = HttpResponse(
                    buffer.getvalue(),
                    content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                )
                response["Content-Disposition"] = f'attachment; filename="{filename_base}.xlsx"'
                return response

            if fmt == "pdf":
                buffer = generate_event_pdf_report(event, request)
                response = HttpResponse(buffer.getvalue(), content_type="application/pdf")
                response["Content-Disposition"] = f'attachment; filename="{filename_base}.pdf"'
                return response
        except Exception:
            return self.error_response(
                "Impossible de générer le fichier du rapport.",
                500,
            )

        return self.error_response("Format non supporté. Utilisez json, pdf ou excel.", 400)
