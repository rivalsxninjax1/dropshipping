from __future__ import annotations

from typing import Any

from rest_framework.viewsets import ModelViewSet

from store.models import AdminActionLog
from store.services.audit import record_admin_action


class AuditedModelViewSet(ModelViewSet):
    """ModelViewSet subclass that records admin operations for auditing."""

    audit_resource: str | None = None

    def get_audit_resource(self) -> str:
        if self.audit_resource:
            return self.audit_resource
        queryset = getattr(self, "queryset", None)
        if queryset is not None and hasattr(queryset, "model"):
            return queryset.model._meta.model_name
        return self.__class__.__name__

    def log_admin_action(
        self,
        *,
        action: str,
        instance=None,
        changes: dict[str, Any] | None = None,
        metadata: dict[str, Any] | None = None,
        status: str = AdminActionLog.Status.SUCCESS,
    ) -> None:
        record_admin_action(
            actor=getattr(getattr(self, "request", None), "user", None),
            request=getattr(self, "request", None),
            resource=self.get_audit_resource(),
            action=action,
            object_pk=str(getattr(instance, "pk", "")) if instance else None,
            changes=changes or {},
            metadata=metadata,
            status=status,
        )

    def perform_create(self, serializer):
        super().perform_create(serializer)
        self.log_admin_action(action="create", instance=serializer.instance, changes=serializer.validated_data)

    def perform_update(self, serializer):
        super().perform_update(serializer)
        self.log_admin_action(action="update", instance=serializer.instance, changes=serializer.validated_data)

    def perform_destroy(self, instance):
        object_pk = str(getattr(instance, "pk", ""))
        super().perform_destroy(instance)
        self.log_admin_action(action="delete", metadata={"object_pk": object_pk})
