"""Module demonstrating __all__ for export filtering."""

__all__ = ["PublicClass", "public_func", "API_URL"]


class PublicClass:
    """This class is in __all__ and should be exported."""

    pass


class _PrivateClass:
    """Private class, not exported regardless."""

    pass


class InternalHelper:
    """Public class but NOT in __all__, should not be exported."""

    pass


def public_func():
    """This function is in __all__ and should be exported."""
    pass


def _private_helper():
    """Private function, not exported regardless."""
    pass


def another_public_func():
    """Public function but NOT in __all__, should not be exported."""
    pass


API_URL = "https://api.example.com"
MAX_RETRIES = 3
