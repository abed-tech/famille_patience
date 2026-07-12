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
    """Rapport de présence d'un événement (JSON, PDF ou Excel)."""

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

        fmt = request.query_params.get("format", "json").lower()

        if fmt == "json":
            counsellor = request.user if request.user.role == "counsellor" else None
            return self.success_response(get_event_report_data(event, request, counsellor_user=counsellor))

        if request.user.role != "admin":
            return self.error_response("Export réservé aux administrateurs.", 403)

        if fmt == "excel":
            buffer = generate_event_excel_report(event, request)
            response = HttpResponse(
                buffer.getvalue(),
                content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            )
            response["Content-Disposition"] = f'attachment; filename="rapport_{event.id}.xlsx"'
            return response

        if fmt == "pdf":
            buffer = generate_event_pdf_report(event, request)
            response = HttpResponse(buffer.getvalue(), content_type="application/pdf")
            response["Content-Disposition"] = f'attachment; filename="rapport_{event.id}.pdf"'
            return response

        return self.error_response("Format non supporté. Utilisez json, pdf ou excel.", 400)
