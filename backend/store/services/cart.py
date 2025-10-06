"""Cart service layer.

Encapsulates cart read/write operations (guest + user) via cache and cookie.
Keeping the same public API shape originally used in views for compatibility.
"""
from __future__ import annotations

from typing import Dict
from django.core.cache import cache
from ..constants import CART_CACHE_PREFIX, CART_COOKIE_NAME, CART_TTL_SECONDS


class CartService:
    COOKIE_NAME = CART_COOKIE_NAME

    @classmethod
    def _key(cls, request) -> str:
        if getattr(request, "user", None) and request.user.is_authenticated:
            return f"{CART_CACHE_PREFIX}user:{request.user.id}"
        cached = getattr(request, "_cart_cache_token", None)
        key = cached or request.COOKIES.get(cls.COOKIE_NAME) or request.headers.get("X-Cart-Key")
        if not key:
            from uuid import uuid4

            key = f"guest:{uuid4().hex}"
        if not cached:
            setattr(request, "_cart_cache_token", key)
        return f"{CART_CACHE_PREFIX}{key}"

    @classmethod
    def get(cls, request) -> Dict[int, int]:
        data = cache.get(cls._key(request))
        return data or {}

    @classmethod
    def set(cls, request, data: Dict[int, int]):
        cache.set(cls._key(request), data, timeout=CART_TTL_SECONDS)

    @classmethod
    def clear(cls, request):
        try:
            cache.delete(cls._key(request))
        except Exception:
            pass


class SavedCartService(CartService):
    SUFFIX = ":saved"

    @classmethod
    def _key(cls, request) -> str:
        return super()._key(request) + cls.SUFFIX
