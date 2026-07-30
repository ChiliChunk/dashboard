"""Accès en lecture seule à Garmin Connect (plan.md, décisions D2 et D3).

Ce module ne porte aucune règle métier : il authentifie la session Garmin et
renvoie les activités sous une forme brute peu remaniée. La normalisation
(catégorie de sport, unités, valeurs manquantes) est faite côté TypeScript
(src/domain/), pas ici.
"""
from __future__ import annotations

import os
from datetime import date, datetime, timezone
from typing import Any

from garminconnect import Garmin

_EARLIEST_DATE = date(1990, 1, 1)

_client: Garmin | None = None


def _get_client() -> Garmin:
    global _client
    if _client is None:
        email = os.environ["GARMIN_EMAIL"]
        password = os.environ["GARMIN_PASSWORD"]
        candidate = Garmin(email=email, password=password)
        candidate.login()
        _client = candidate
    return _client


def _start_time_epoch(activity: dict[str, Any]) -> float:
    raw = activity.get("startTimeLocal") or activity.get("startTimeGMT")
    if not raw:
        return 0.0
    parsed = datetime.strptime(raw, "%Y-%m-%d %H:%M:%S")
    return parsed.replace(tzinfo=timezone.utc).timestamp()


def get_activities_since(after_epoch: int) -> list[dict[str, Any]]:
    """Liste des activités postérieures à `after_epoch` ; un seul appel en lecture (CA1.2)."""
    client = _get_client()
    start_date = (
        datetime.fromtimestamp(after_epoch, tz=timezone.utc).date()
        if after_epoch > 0
        else _EARLIEST_DATE
    )
    end_date = datetime.now(timezone.utc).date()
    activities = client.get_activities_by_date(str(start_date), str(end_date))
    return [a for a in activities if _start_time_epoch(a) > after_epoch]
