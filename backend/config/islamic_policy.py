# Compatibility shim — the module was renamed to safe_policy.py
# All existing imports of backend.config.islamic_policy continue to work.
from backend.config.safe_policy import (  # noqa: F401
    APPROVED_DOMAINS,
    DOMAIN_VISUAL_STYLE,
    ISLAMIC_NEGATIVE_PROMPT,
    OUT_OF_SCOPE,
    check_deny_list,
    check_domain,
)
