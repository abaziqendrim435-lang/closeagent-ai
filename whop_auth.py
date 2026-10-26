"""Whop license-key gate for the hosted (SaaS) version of CloseAgent.

Customers buy a monthly plan on Whop and receive a software license key.
The app asks for that key and checks it server-side against the Whop API.

Env vars (set on the server, never shipped to customers):
  WHOP_API_KEY     — account API key with `member:basic:read` permission
  WHOP_PRODUCT_ID  — the CloseAgent product id (prod_...), optional but recommended
If WHOP_API_KEY is not set, the gate is disabled (local/dev mode).
"""

from __future__ import annotations

import os
import time

import requests

WHOP_MEMBERSHIP_URL = "https://api.whop.com/api/v1/memberships/{key}"
ACCESS_STATUSES = frozenset({"active", "trialing", "completed", "past_due"})
RECHECK_SECONDS = 30 * 60


def gate_enabled() -> bool:
    return bool(os.environ.get("WHOP_API_KEY", "").strip())


def verify_license(license_key: str) -> tuple[bool, str]:
    """Return (has_access, message)."""
    key = license_key.strip()
    if not key:
        return False, "Enter your license key."
    api_key = os.environ.get("WHOP_API_KEY", "").strip()
    product_id = os.environ.get("WHOP_PRODUCT_ID", "").strip()
    try:
        response = requests.get(
            WHOP_MEMBERSHIP_URL.format(key=requests.utils.quote(key, safe="")),
            headers={"Authorization": f"Bearer {api_key}"},
            timeout=15,
        )
    except requests.RequestException:
        return False, "Could not reach Whop to verify your license. Please try again."

    if response.status_code in (403, 404):
        return False, "License key not found. Copy it from your Whop purchase page."
    if response.status_code >= 400:
        return False, f"Whop verification failed ({response.status_code}). Please try again."

    try:
        data = response.json()
    except ValueError:
        return False, "Unexpected response from Whop."

    if product_id and data.get("product_id") and data["product_id"] != product_id:
        return False, "This license key belongs to a different product."
    status = str(data.get("status") or "").lower()
    if status not in ACCESS_STATUSES:
        return False, f"Your subscription is {status or 'inactive'}. Renew it on Whop to continue."
    return True, "ok"


def needs_recheck(checked_at: float) -> bool:
    return time.time() - checked_at > RECHECK_SECONDS
