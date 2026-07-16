from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from django.contrib.auth import get_user_model
from django.http import HttpResponse
from auditlog.models import LogEntry

from apps.core.mixins import APIResponseMixin
from apps.core.permissions import IsAdmin
from apps.accounts.models import UserRole
from apps.accounts.role_services import (
    apply_role_transition,
    apply_member_role_profile,
    format_role_cleanup_message,
)
from apps.members.models import Member, MemberStatus, MemberHistory
from apps.members.serializers import MemberDetailSerializer
from apps.members.member_delete import MemberDeleteError, permanently_delete_member
from apps.events.models import Event, EventStatus
from .admin_services import get_admin_dashboard_data, get_live_pointage_data
from .admin_staff_services import get_admin_referrer_detail, get_admin_counsellor_detail, _staff_photo_url
from .reports import (
    generate_excel_report, generate_pdf_report, generate_csv_report, get_report_preview,
)

User = get_user_model()


class AdminFullDashboardView(APIResponseMixin, APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        return self.success_response(get_admin_dashboard_data())


class AdminLivePointageView(APIResponseMixin, APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        return self.success_response(get_live_pointage_data())


class AdminActivityLogView(APIResponseMixin, APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        qs = LogEntry.objects.select_related("actor", "content_type").order_by("-timestamp")[:50]
        action_labels = {0: "Création", 1: "Modification", 2: "Suppression"}
        entries = []
        for entry in qs:
            entries.append({
                "id": entry.id,
                "user": entry.actor.email if entry.actor else "Système",
                "action": action_labels.get(entry.action, str(entry.action)),
                "object": entry.object_repr,
                "model": entry.content_type.model if entry.content_type else "",
                "datetime": entry.timestamp.isoformat(),
                "changes": entry.changes_dict if hasattr(entry, "changes_dict") else {},
            })
        return self.success_response(entries)


class AdminReferrersView(APIResponseMixin, APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        referrers = User.objects.filter(role="referrer", is_active=True)
        data = []
        for ref in referrers:
            members = Member.objects.filter(referrer=ref)
            active = members.filter(status=MemberStatus.ACTIVE).count()
            attendances = sum(
                m.attendances.filter(is_present=True).count() for m in members[:50]
            )
            data.append({
                "id": str(ref.id),
                "full_name": ref.full_name,
                "email": ref.email,
                "phone": ref.phone,
                "photo": _staff_photo_url(request, ref),
                "members_count": members.count(),
                "active_members": active,
                "attendances": attendances,
            })
        return self.success_response(data)


class AdminCounsellorsView(APIResponseMixin, APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        counsellors = User.objects.filter(role="counsellor", is_active=True)
        data = []
        for c in counsellors:
            members = Member.objects.filter(counsellor=c)
            referrers = members.filter(referrer__isnull=False).values("referrer").distinct().count()
            data.append({
                "id": str(c.id),
                "full_name": c.full_name,
                "email": c.email,
                "phone": c.phone,
                "photo": _staff_photo_url(request, c),
                "members_count": members.count(),
                "referrers_count": referrers,
            })
        return self.success_response(data)


class AdminReferrerDetailView(APIResponseMixin, APIView):
    permission_classes = [IsAdmin]

    def get(self, request, pk):
        data = get_admin_referrer_detail(request, pk)
        if not data:
            return self.error_response("Référent introuvable.", status.HTTP_404_NOT_FOUND)
        return self.success_response(data)


class AdminCounsellorDetailView(APIResponseMixin, APIView):
    permission_classes = [IsAdmin]

    def get(self, request, pk):
        data = get_admin_counsellor_detail(request, pk)
        if not data:
            return self.error_response("Conseiller introuvable.", status.HTTP_404_NOT_FOUND)
        return self.success_response(data)


class AdminMemberActionView(APIResponseMixin, APIView):
    permission_classes = [IsAdmin]

    def post(self, request, pk):
        try:
            member = Member.objects.get(pk=pk)
        except Member.DoesNotExist:
            return self.error_response("Membre introuvable.", status.HTTP_404_NOT_FOUND)

        action = request.data.get("action")
        if action == "suspend":
            member.status = MemberStatus.SUSPENDED
            member.save(update_fields=["status", "updated_at"])
            MemberHistory.objects.create(
                member=member, action_type=MemberHistory.ActionType.STATUS_CHANGED,
                description="Membre suspendu par l'administrateur", performed_by=request.user,
            )
            return self.success_response(MemberDetailSerializer(member).data, "Membre suspendu.")
        if action == "reactivate":
            member.status = MemberStatus.ACTIVE
            member.save(update_fields=["status", "updated_at"])
            MemberHistory.objects.create(
                member=member, action_type=MemberHistory.ActionType.STATUS_CHANGED,
                description="Membre réactivé par l'administrateur", performed_by=request.user,
            )
            return self.success_response(MemberDetailSerializer(member).data, "Membre réactivé.")
        if action == "delete":
            member.status = MemberStatus.INACTIVE
            member.save(update_fields=["status", "updated_at"])
            MemberHistory.objects.create(
                member=member, action_type=MemberHistory.ActionType.STATUS_CHANGED,
                description="Membre désactivé par l'administrateur", performed_by=request.user,
            )
            return self.success_response(message="Membre désactivé.")
        if action == "purge":
            try:
                summary = permanently_delete_member(member, performed_by=request.user)
            except MemberDeleteError as exc:
                return self.error_response(exc.message, exc.status_code)
            return self.success_response(
                summary,
                f"{summary['full_name']} a été supprimé définitivement de la plateforme.",
            )
        return self.error_response("Action invalide.")


class AdminUserRoleView(APIResponseMixin, APIView):
    permission_classes = [IsAdmin]

    def post(self, request, pk):
        try:
            user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return self.error_response("Utilisateur introuvable.", status.HTTP_404_NOT_FOUND)

        new_role = request.data.get("role")
        valid_roles = ["member", "referrer", "counsellor", "admin"]
        if new_role not in valid_roles:
            return self.error_response("Rôle invalide.")
        old_role = user.role
        cleanup = {}
        if old_role != new_role:
            cleanup = apply_role_transition(user, old_role, new_role)
        user.role = new_role
        user.save(update_fields=["role", "updated_at"])

        if old_role != new_role:
            apply_member_role_profile(user, new_role)

        msg = f"Rôle changé de {old_role} à {new_role}."
        msg += format_role_cleanup_message(cleanup, new_role, old_role)

        return self.success_response({
            "id": str(user.id), "email": user.email, "role": user.role,
            "message": msg,
            "cleanup": cleanup,
        })


class AdminPromoteMemberView(APIResponseMixin, APIView):
    """Promouvoir un membre en référent ou conseiller."""

    permission_classes = [IsAdmin]

    def post(self, request, pk):
        try:
            member = Member.objects.select_related("user").get(pk=pk)
        except Member.DoesNotExist:
            return self.error_response("Membre introuvable.", status.HTTP_404_NOT_FOUND)

        new_role = request.data.get("role")
        if new_role not in ("referrer", "counsellor", "member"):
            return self.error_response("Rôle invalide. Utilisez : referrer, counsellor, member.")

        if not member.user:
            return self.error_response(
                "Ce membre n'a pas de compte utilisateur. Il doit s'inscrire via l'application membre.",
                status.HTTP_400_BAD_REQUEST,
            )

        old_role = member.user.role
        cleanup = apply_role_transition(member.user, old_role, new_role)
        member.user.role = new_role
        member.user.save(update_fields=["role", "updated_at"])

        apply_member_role_profile(member.user, new_role)

        role_labels = {"referrer": "Référent", "counsellor": "Conseiller", "member": "Membre"}
        MemberHistory.objects.create(
            member=member,
            action_type=MemberHistory.ActionType.ASSIGNMENT,
            description=f"Rôle changé : {role_labels.get(old_role, old_role)} → {role_labels.get(new_role)}",
            performed_by=request.user,
            metadata={"old_role": old_role, "new_role": new_role, "cleanup": cleanup},
        )

        msg = f"{member.full_name} est maintenant {role_labels.get(new_role)}."
        if new_role == "referrer":
            msg += " Il est automatiquement défini comme son propre référent."
        elif new_role == "counsellor":
            msg += " Il est automatiquement défini comme son propre conseiller."
        elif new_role == "member" and old_role in ("referrer", "counsellor"):
            msg += format_role_cleanup_message(cleanup, new_role, old_role)

        return self.success_response({
            "member_id": str(member.id),
            "user_id": str(member.user.id),
            "role": new_role,
            "full_name": member.full_name,
        }, msg)


class AdminAssignMemberView(APIResponseMixin, APIView):
    """Affecter un référent ou conseiller à un membre."""

    permission_classes = [IsAdmin]

    def post(self, request, pk):
        try:
            member = Member.objects.get(pk=pk)
        except Member.DoesNotExist:
            return self.error_response("Membre introuvable.", status.HTTP_404_NOT_FOUND)

        referrer_id = request.data.get("referrer_id")
        counsellor_id = request.data.get("counsellor_id")

        if referrer_id:
            try:
                referrer = User.objects.get(pk=referrer_id, role=UserRole.REFERRER)
                member.referrer = referrer
            except User.DoesNotExist:
                return self.error_response("Référent introuvable.")

        if counsellor_id:
            try:
                counsellor = User.objects.get(pk=counsellor_id, role=UserRole.COUNSELLOR)
                member.counsellor = counsellor
            except User.DoesNotExist:
                return self.error_response("Conseiller introuvable.")

        if referrer_id is None and "referrer_id" in request.data:
            member.referrer = None
        if counsellor_id is None and "counsellor_id" in request.data:
            member.counsellor = None

        member.save()
        MemberHistory.objects.create(
            member=member,
            action_type=MemberHistory.ActionType.ASSIGNMENT,
            description="Affectation mise à jour par l'administrateur",
            performed_by=request.user,
        )
        return self.success_response(MemberDetailSerializer(member).data, "Affectation mise à jour.")


class AdminOpenEventsView(APIResponseMixin, APIView):
    """Liste des événements ouverts pour le pointage admin."""

    permission_classes = [IsAdmin]

    def get(self, request):
        events = Event.objects.filter(status=EventStatus.OPEN).values("id", "name", "date", "location")
        return self.success_response([{**e, "id": str(e["id"])} for e in events])


class AdminReportView(APIResponseMixin, APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        period = request.query_params.get("period", "monthly")
        export = request.query_params.get("export") or request.query_params.get("format", "excel")
        module = request.query_params.get("module", "all")
        start_date = request.query_params.get("start_date")
        end_date = request.query_params.get("end_date")

        if export == "preview":
            data = get_report_preview(period, module, start_date, end_date)
            return self.success_response(data)

        filename_base = f"rapport_{module}_{period}"
        if period == "custom" and start_date and end_date:
            filename_base = f"rapport_{module}_{start_date}_{end_date}"

        if export == "pdf":
            buffer = generate_pdf_report(period, module, start_date, end_date)
            response = HttpResponse(buffer.read(), content_type="application/pdf")
            response["Content-Disposition"] = f'attachment; filename="{filename_base}.pdf"'
        elif export == "csv":
            buffer = generate_csv_report(period, module, start_date, end_date)
            response = HttpResponse(buffer.read(), content_type="text/csv; charset=utf-8")
            response["Content-Disposition"] = f'attachment; filename="{filename_base}.csv"'
        else:
            buffer = generate_excel_report(period, module, start_date, end_date)
            response = HttpResponse(
                buffer.read(),
                content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            )
            response["Content-Disposition"] = f'attachment; filename="{filename_base}.xlsx"'
        return response
