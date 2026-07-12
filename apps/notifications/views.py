from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated

from apps.core.mixins import APIResponseMixin
from .models import Notification
from .serializers import NotificationSerializer


class NotificationListView(APIResponseMixin, generics.ListAPIView):
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(recipient=self.request.user)

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)
        unread = queryset.filter(is_read=False).count()
        return self.success_response({"notifications": serializer.data, "unread_count": unread})


class NotificationMarkReadView(APIResponseMixin, generics.GenericAPIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            notification = Notification.objects.get(pk=pk, recipient=request.user)
        except Notification.DoesNotExist:
            return self.error_response("Notification introuvable.", status.HTTP_404_NOT_FOUND)
        notification.is_read = True
        notification.save(update_fields=["is_read"])
        return self.success_response(message="Notification marquée comme lue.")
