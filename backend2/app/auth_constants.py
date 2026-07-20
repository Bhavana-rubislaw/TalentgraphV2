"""
Centralized, deliberately generic auth-facing messages.

These exist so that no auth endpoint leaks account existence, role, or
lockout state through distinct wording - every failure path returns one of
these fixed strings.
"""

LOGIN_FAIL_MSG = "Incorrect email or password"
SIGNUP_NEUTRAL_MSG = "If this email is not already registered, your account has been created"
GENERIC_INPUT_ERROR = "Invalid request. Please check your input and try again."
