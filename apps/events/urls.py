from django.urls import path

from .views import EventListCreateView, EventDetailView, EventOpenView, EventCloseView
from .report_views import EventReportView

app_name = "events"

urlpatterns = [
    path("", EventListCreateView.as_view(), name="event_list"),
    path("<uuid:pk>/", EventDetailView.as_view(), name="event_detail"),
    path("<uuid:pk>/open/", EventOpenView.as_view(), name="event_open"),
    path("<uuid:pk>/close/", EventCloseView.as_view(), name="event_close"),
    path("<uuid:pk>/report/", EventReportView.as_view(), name="event_report"),
]
