from django.urls import path

from .views import AdminDashboardView, ReferrerDashboardView
from .counsellor_views import (
    CounsellorFullDashboardView,
    CounsellorReferrersListView,
    CounsellorReferrerDetailView,
    CounsellorEventsView,
    CounsellorEventAttendanceView,
    CounsellorMemberDetailView,
)
from .admin_views import (
    AdminFullDashboardView,
    AdminLivePointageView,
    AdminActivityLogView,
    AdminReferrersView,
    AdminReferrerDetailView,
    AdminCounsellorsView,
    AdminCounsellorDetailView,
    AdminMemberActionView,
    AdminUserRoleView,
    AdminPromoteMemberView,
    AdminAssignMemberView,
    AdminOpenEventsView,
    AdminReportView,
)

app_name = "dashboard"

urlpatterns = [
    path("admin/", AdminDashboardView.as_view(), name="admin_dashboard"),
    path("admin/full/", AdminFullDashboardView.as_view(), name="admin_full_dashboard"),
    path("admin/live-pointage/", AdminLivePointageView.as_view(), name="admin_live_pointage"),
    path("admin/activity/", AdminActivityLogView.as_view(), name="admin_activity"),
    path("admin/referrers/", AdminReferrersView.as_view(), name="admin_referrers"),
    path("admin/referrers/<uuid:pk>/", AdminReferrerDetailView.as_view(), name="admin_referrer_detail"),
    path("admin/counsellors/", AdminCounsellorsView.as_view(), name="admin_counsellors"),
    path("admin/counsellors/<uuid:pk>/", AdminCounsellorDetailView.as_view(), name="admin_counsellor_detail"),
    path("admin/members/<uuid:pk>/action/", AdminMemberActionView.as_view(), name="admin_member_action"),
    path("admin/members/<uuid:pk>/promote/", AdminPromoteMemberView.as_view(), name="admin_promote_member"),
    path("admin/members/<uuid:pk>/assign/", AdminAssignMemberView.as_view(), name="admin_assign_member"),
    path("admin/open-events/", AdminOpenEventsView.as_view(), name="admin_open_events"),
    path("admin/reports/", AdminReportView.as_view(), name="admin_reports"),
    path("admin/users/<uuid:pk>/role/", AdminUserRoleView.as_view(), name="admin_user_role"),
    path("counsellor/", CounsellorFullDashboardView.as_view(), name="counsellor_dashboard"),
    path("counsellor/full/", CounsellorFullDashboardView.as_view(), name="counsellor_full_dashboard"),
    path("counsellor/referrers/", CounsellorReferrersListView.as_view(), name="counsellor_referrers"),
    path("counsellor/referrers/<uuid:pk>/", CounsellorReferrerDetailView.as_view(), name="counsellor_referrer_detail"),
    path("counsellor/events/", CounsellorEventsView.as_view(), name="counsellor_events"),
    path("counsellor/events/<uuid:pk>/attendance/", CounsellorEventAttendanceView.as_view(), name="counsellor_event_attendance"),
    path("counsellor/members/<uuid:pk>/", CounsellorMemberDetailView.as_view(), name="counsellor_member_detail"),
    path("referrer/", ReferrerDashboardView.as_view(), name="referrer_dashboard"),
]
