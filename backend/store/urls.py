from django.urls import path, include
from rest_framework_simplejwt.views import TokenRefreshView
from .routers import api_urlpatterns
from .auth import EmailTokenObtainPairView


urlpatterns = [
    path("", include(api_urlpatterns)),
    path("auth/login/", EmailTokenObtainPairView.as_view(), name="auth_login"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
]
