import hmac

def constant_time_compare(val1: str, val2: str) -> bool:
    """Return True if the two strings are equal, False otherwise, in constant time."""
    return hmac.compare_digest(str(val1 or ""), str(val2 or ""))
