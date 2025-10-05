from django.contrib import admin
from django.urls import path, include, re_path
from django.http import JsonResponse
from rest_framework import permissions
from drf_yasg.views import get_schema_view
from drf_yasg import openapi

schema_view = get_schema_view(
    openapi.Info(
        title="Dropshipper API",
        default_version="v1",
        description="API documentation",
    ),
    public=True,
    permission_classes=(permissions.AllowAny,),
)

urlpatterns = [
    # Friendly root response for humans and uptime checks
    path("", lambda r: JsonResponse({
        "name": "Dropshipper API",
        "docs": "/api/docs/",
        "health": "/api/health/",
        "metrics": "/metrics"
    })),
    path("admin/", admin.site.urls),
    path("", include("django_prometheus.urls")),
    path("api/", include("store.urls")),
    re_path(r"^api/docs/$", schema_view.with_ui("swagger", cache_timeout=0), name="schema-swagger-ui"),
    re_path(r"^api/redoc/$", schema_view.with_ui("redoc", cache_timeout=0), name="schema-redoc"),
]
