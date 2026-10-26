from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path


def health(request):
    """Tiny endpoint to confirm the API is up."""
    return JsonResponse({"status": "ok"})


urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/health/", health),
    path("api/", include("todos.urls")),
]
