from __future__ import annotations

from typing import Optional

from django.db import connection


_HAS_UNACCENT: Optional[bool] = None
_HAS_UNACCENT_WRAPPER: Optional[bool] = None


def _check_unaccent_available() -> bool:
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'unaccent')"
            )
            row = cursor.fetchone()
            return bool(row[0]) if row else False
    except Exception:
        return False


def _check_unaccent_wrapper() -> bool:
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT EXISTS("
                "SELECT 1 FROM pg_proc "
                "WHERE oid = 'public.unaccent_immutable(text)'::regprocedure)"
            )
            row = cursor.fetchone()
            return bool(row[0]) if row else False
    except Exception:
        return False


def refresh_unaccent_capability() -> tuple[bool, bool]:
    global _HAS_UNACCENT, _HAS_UNACCENT_WRAPPER
    has_unaccent = _check_unaccent_available()
    _HAS_UNACCENT = has_unaccent
    _HAS_UNACCENT_WRAPPER = _check_unaccent_wrapper() if has_unaccent else False
    return _HAS_UNACCENT, _HAS_UNACCENT_WRAPPER


def has_unaccent() -> bool:
    global _HAS_UNACCENT
    if _HAS_UNACCENT is None:
        refresh_unaccent_capability()
    return bool(_HAS_UNACCENT)


def has_unaccent_wrapper() -> bool:
    global _HAS_UNACCENT_WRAPPER
    if _HAS_UNACCENT_WRAPPER is None:
        refresh_unaccent_capability()
    return bool(_HAS_UNACCENT_WRAPPER)
