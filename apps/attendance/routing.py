from django.urls import re_path

from .consumers import AttendanceConsumer

websocket_urlpatterns = [
    re_path(r"ws/events/(?P<event_id>[0-9a-f-]+)/attendance/$", AttendanceConsumer.as_asgi()),
]
