from django.urls import path

from .views import AssignAgentView, ScanQRView, EventAttendanceListView, AdminScanQRView
from .agent_views import (
    MyAgentEventsView,
    AgentAssignedEventsListView,
    AgentEventDetailView,
    AgentEventDashboardView,
    AgentMemberSearchView,
)

app_name = "attendance"

urlpatterns = [
    path("my-events/", MyAgentEventsView.as_view(), name="my_agent_events"),
    path("assigned-events/", AgentAssignedEventsListView.as_view(), name="agent_assigned_events"),
    path("events/<uuid:pk>/detail/", AgentEventDetailView.as_view(), name="agent_event_detail"),
    path("events/<uuid:pk>/dashboard/", AgentEventDashboardView.as_view(), name="agent_event_dashboard"),
    path("events/<uuid:pk>/search/", AgentMemberSearchView.as_view(), name="agent_member_search"),
    path("events/<uuid:pk>/agents/", AssignAgentView.as_view(), name="assign_agent"),
    path("events/<uuid:pk>/attendances/", EventAttendanceListView.as_view(), name="event_attendances"),
    path("scan/", ScanQRView.as_view(), name="scan_qr"),
    path("admin-scan/", AdminScanQRView.as_view(), name="admin_scan_qr"),
]