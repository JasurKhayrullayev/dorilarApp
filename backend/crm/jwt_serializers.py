from django.conf import settings
from django.core.cache import cache
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer


class LockedTokenObtainPairSerializer(TokenObtainPairSerializer):
    """5 marta noto'g'ri parol — 15 daqiqalik blok (TZ 5.1, 6.3)."""

    def validate(self, attrs):
        ident = attrs.get(self.username_field) or ""
        block_key = f"{settings.LOGIN_FAIL_CACHE_PREFIX}block:{ident}"
        fail_key = f"{settings.LOGIN_FAIL_CACHE_PREFIX}fail:{ident}"
        if cache.get(block_key):
            raise AuthenticationFailed(
                {"detail": "Hisob 15 daqiqaga bloklangan. Keyinroq urinib ko'ring.", "code": "account_locked"}
            )
        try:
            data = super().validate(attrs)
        except AuthenticationFailed:
            n = int(cache.get(fail_key, 0)) + 1
            if n >= 5:
                cache.set(block_key, 1, timeout=900)
                cache.delete(fail_key)
            else:
                cache.set(fail_key, n, timeout=900)
            raise
        cache.delete(fail_key)
        cache.delete(block_key)
        return data
