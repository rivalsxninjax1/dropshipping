from __future__ import annotations

from collections.abc import Mapping, Sequence
from decimal import Decimal
from typing import Any

from store.models import AdminActionLog


def record_admin_action(
    *,
    actor,
    request,
    resource: str,
    action: str,
    object_pk: str | None = None,
    changes: Mapping[str, Any] | None = None,
    metadata: Mapping[str, Any] | None = None,
    status: str = AdminActionLog.Status.SUCCESS,
) -> None:
    """Persist an immutable admin audit trail entry."""

    AdminActionLog.objects.create(
        actor=actor if getattr(actor, "is_authenticated", False) else None,
        resource=resource,
        action=action,
        object_pk=object_pk or "",
        changes=_serialize_payload(changes or {}),
        metadata=_merge_metadata(metadata, request),
        status=status,
        ip_address=_extract_ip(request),
    )


def _extract_ip(request) -> str | None:
    if not request:
        return None
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


def _merge_metadata(metadata: Mapping[str, Any] | None, request) -> Mapping[str, Any]:
    base: dict[str, Any] = {}
    if metadata:
        base.update(_serialize_payload(metadata))
    if request:
        base.setdefault("method", getattr(request, "method", ""))
        base.setdefault("path", getattr(request, "path", ""))
        base.setdefault("user_agent", request.META.get("HTTP_USER_AGENT", ""))
    return base


def _serialize_payload(value: Any) -> Any:
    if isinstance(value, Mapping):
        return {str(k): _serialize_payload(v) for k, v in value.items()}
    if isinstance(value, (list, tuple, set, frozenset, Sequence)) and not isinstance(value, (str, bytes, bytearray)):
        return [_serialize_payload(v) for v in value]
    if isinstance(value, Decimal):
        return str(value)
    if hasattr(value, "pk"):
        return getattr(value, "pk")
    if isinstance(value, (str, int, float, bool)) or value is None:
        return value
    return str(value)
