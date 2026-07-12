from rest_framework.response import Response
from rest_framework import status


class APIResponseMixin:
    """Mixin pour des réponses API cohérentes."""

    def success_response(self, data=None, message="Succès", status_code=status.HTTP_200_OK):
        return Response(
            {"success": True, "message": message, "data": data},
            status=status_code,
        )

    def created_response(self, data=None, message="Créé avec succès"):
        return self.success_response(data, message, status.HTTP_201_CREATED)

    def error_response(self, message, status_code=status.HTTP_400_BAD_REQUEST, details=None):
        return Response(
            {
                "success": False,
                "error": {"message": message, "details": details},
            },
            status=status_code,
        )
