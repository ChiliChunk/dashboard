"""Accès en lecture seule à Garmin Connect (plan.md, décisions D2 et D3).

Ce module ne porte aucune règle métier : il authentifie la session Garmin et
renvoie les activités sous une forme brute peu remaniée. La normalisation
(catégorie de sport, unités, valeurs manquantes) est faite côté TypeScript
(src/domain/), pas ici.
"""
from __future__ import annotations

import os
from typing import Any

from garminconnect import Garmin

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


def get_activity_page(offset: int, limit: int) -> list[dict[str, Any]]:
    """Une page d'activités, de la plus récente à la plus ancienne (CA1.2).

    Le service ne décide pas ce qui est « nouveau » : il pagine, rien de plus.
    Comparer une activité au curseur de synchronisation est une règle métier,
    donc du ressort de `src/domain/` (plan.md, décision D3). Une page vide ou
    plus courte que `limit` signale la fin de l'historique.
    """
    client = _get_client()
    return client.get_activities(offset, limit)
