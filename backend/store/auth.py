from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView
from django.contrib.auth import get_user_model


class EmailTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        # custom claims
        token["email"] = user.email
        token["role"] = getattr(user, "role", "customer")
        token["is_staff"] = bool(getattr(user, "is_staff", False))
        return token

    def validate(self, attrs):
        # Ensure the serializer accepts 'email' as the identifier
        # TokenObtainPairSerializer uses the User.USERNAME_FIELD internally (email in our case)
        data = super().validate(attrs)
        user = self.user
        data["user"] = {
            "id": user.id,
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "role": getattr(user, "role", "customer"),
            "is_staff": bool(user.is_staff),
        }
        return data


class EmailTokenObtainPairView(TokenObtainPairView):
    serializer_class = EmailTokenObtainPairSerializer
