from .models import AuditLog


def write_audit(user, action, object_type="", object_id="", payload=None):
    AuditLog.objects.create(
        user=user if user and user.is_authenticated else None,
        action=action,
        object_type=object_type,
        object_id=str(object_id) if object_id is not None else "",
        payload=payload or {},
    )
