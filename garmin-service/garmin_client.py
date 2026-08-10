"""Accès en lecture seule à Garmin Connect (plan.md, décisions D2 et D3).

Ce module ne porte aucune règle métier : il authentifie la session Garmin et
renvoie les activités sous une forme brute peu remaniée. La normalisation
(catégorie de sport, unités, valeurs manquantes) est faite côté TypeScript
(src/domain/), pas ici.

Il porte en revanche toute la tenue de la session : garth rafraîchit bien le
jeton OAuth2 tout seul, mais rien ne rattrape l'échec de ce rafraîchissement,
et rien ne freine la cadence des appels. C'est ce que couvrent le
réamorçage de session et les temporisations ci-dessous.
"""
from __future__ import annotations

import os
import sys
import time
from pathlib import Path
from typing import Any

from garminconnect import Garmin
from garth.exc import GarthHTTPError

_client: Garmin | None = None

# Jetons OAuth persistés sur disque. Garth rafraîchit seul le jeton OAuth2
# (quelques heures de validité) à partir du jeton OAuth1, valable environ un
# an : conserver ce dernier permet de redémarrer le service sans repasser par
# un login complet. Or ce sont justement les logins répétés que Garmin compte
# le plus vite dans son quota de requêtes.
TOKEN_STORE = Path(__file__).with_name(".garmin-tokens")

# Garth réessaie déjà les codes transitoires (429 compris), mais avec trois
# tentatives espacées d'une demi-seconde : trop court pour un quota Garmin,
# qui se compte en dizaines de secondes.
_RETRIES = 4
_BACKOFF_FACTOR = 2.0

# Temporisations entre deux tentatives côté service, après réamorçage de la
# session ou dépassement de quota. Volontairement longues : le service est
# local et mono-utilisateur, attendre coûte moins cher au front qu'une passe
# de synchronisation interrompue.
_ATTEMPT_DELAYS = (2, 10, 30)

# Le front recharge la même page d'activités à chaque rendu initial (et à
# chaque F5). Ce cache très court absorbe ces répétitions sans jamais retarder
# l'apparition d'une sortie de plus d'une minute.
_CACHE_TTL_SECONDS = 60
_cache: dict[tuple[int, int], tuple[float, list[dict[str, Any]]]] = {}


def _new_client(email: str | None = None, password: str | None = None) -> Garmin:
    client = Garmin(email=email, password=password)
    client.garth.configure(retries=_RETRIES, backoff_factor=_BACKOFF_FACTOR)
    return client


def _authenticated_client() -> Garmin:
    """Session Garmin, jetons repris du disque tant qu'ils valent encore."""
    client = _new_client()
    try:
        client.login(str(TOKEN_STORE))
        return client
    except Exception as error:  # noqa: BLE001
        # Jetons absents (premier lancement), illisibles, ou jeton OAuth1
        # périmé/révoqué : ces cas se rattrapent tous de la même façon, par un
        # login complet. Les distinguer n'ouvrirait aucune autre issue.
        print(
            f"Jetons Garmin inutilisables ({error}) : nouvelle authentification.",
            file=sys.stderr,
        )

    client = _new_client(
        email=os.environ["GARMIN_EMAIL"],
        password=os.environ["GARMIN_PASSWORD"],
    )
    client.login()
    client.garth.dump(str(TOKEN_STORE))
    return client


def _status_code(error: GarthHTTPError) -> int | None:
    response = getattr(error.error, "response", None)
    return None if response is None else response.status_code


class GarminRateLimited(Exception):
    """Quota Garmin dépassé, même après les temporisations."""


def get_activity_page(offset: int, limit: int) -> list[dict[str, Any]]:
    """Une page d'activités, de la plus récente à la plus ancienne (CA1.2).

    Le service ne décide pas ce qui est « nouveau » : il pagine, rien de plus.
    Comparer une activité au curseur de synchronisation est une règle métier,
    donc du ressort de `src/domain/` (plan.md, décision D3). Une page vide ou
    plus courte que `limit` signale la fin de l'historique.
    """
    global _client

    key = (offset, limit)
    cached = _cache.get(key)
    if cached is not None and time.monotonic() - cached[0] < _CACHE_TTL_SECONDS:
        return cached[1]

    last_error: Exception | None = None

    for attempt in range(len(_ATTEMPT_DELAYS) + 1):
        try:
            if _client is None:
                _client = _authenticated_client()
            page = _client.get_activities(offset, limit)
            _cache[key] = (time.monotonic(), page)
            return page
        except GarthHTTPError as error:
            status = _status_code(error)
            last_error = error
            if status == 429:
                # La session est bonne, seule la cadence est en cause : la
                # renouveler ne ferait qu'ajouter un login au compteur.
                last_error = GarminRateLimited(
                    "Garmin limite les requêtes (429). Réessayer dans quelques minutes."
                )
            elif status in (401, 403):
                # Le rafraîchissement du jeton OAuth2 par garth peut échouer
                # (jeton OAuth1 révoqué, échange SSO refusé). Sans ce
                # réamorçage, le client gardé en mémoire resterait inutilisable
                # et le service répondrait en erreur jusqu'à un redémarrage
                # manuel — c'est ce qui faisait « lâcher » le service au bout
                # de quelques heures.
                _client = None
            else:
                raise

        if attempt < len(_ATTEMPT_DELAYS):
            time.sleep(_ATTEMPT_DELAYS[attempt])

    assert last_error is not None
    raise last_error
