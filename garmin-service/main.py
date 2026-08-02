from __future__ import annotations

import json
import os
import sys
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import parse_qs, urlparse

from dotenv import load_dotenv

import garmin_client

sys.stdout.reconfigure(encoding="utf-8")
sys.stderr.reconfigure(encoding="utf-8")

# Boucle locale par défaut. Mettre GARMIN_SERVICE_HOST=0.0.0.0 pour rendre le
# service joignable depuis les autres machines du réseau local (le front tourne
# alors sur un autre poste et ne peut plus passer par 127.0.0.1).
HOST = os.environ.get("GARMIN_SERVICE_HOST", "127.0.0.1")
PORT = 8799
MAX_PAGE_SIZE = 200


def load_credentials() -> tuple[str, str]:
    load_dotenv()
    email = os.environ.get("GARMIN_EMAIL")
    password = os.environ.get("GARMIN_PASSWORD")
    if not email or not password:
        print(
            "Erreur : GARMIN_EMAIL et GARMIN_PASSWORD doivent être définis "
            "dans garmin-service/.env (voir .env.example).",
            file=sys.stderr,
        )
        sys.exit(1)
    return email, password


class Handler(BaseHTTPRequestHandler):
    def _send_json(self, status: int, payload: object) -> None:
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        # Le tableau de bord et ce service tournent tous deux en local mais
        # sur des origines différentes ("localhost" vs "127.0.0.1", ou des
        # ports différents) : sans cet en-tête, le navigateur refuse de lire
        # la réponse (CORS), alors même que la requête a réussi. Le service
        # n'écoutant que sur l'interface de boucle locale (HOST), l'ouvrir
        # aux origines ne l'expose pas au réseau (plan, section 5).
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        segments = [segment for segment in parsed.path.split("/") if segment]

        try:
            if segments == ["activities"]:
                query = parse_qs(parsed.query)
                offset = max(0, int(query.get("offset", ["0"])[0]))
                # Plafonné : une page démesurée annulerait l'intérêt de la
                # pagination (progression affichée, arrêt anticipé).
                limit = min(MAX_PAGE_SIZE, max(1, int(query.get("limit", ["50"])[0])))
                self._send_json(200, garmin_client.get_activity_page(offset, limit))
                return

            self._send_json(404, {"error": "Route inconnue."})
        except Exception as error:  # noqa: BLE001 — renvoyé tel quel au client local
            self._send_json(502, {"error": str(error)})

    def log_message(self, format: str, *args: object) -> None:  # noqa: A002
        sys.stderr.write("%s - %s\n" % (self.address_string(), format % args))


def main() -> None:
    load_credentials()
    server = HTTPServer((HOST, PORT), Handler)
    print(f"Service Garmin local à l'écoute sur http://{HOST}:{PORT}")
    server.serve_forever()


if __name__ == "__main__":
    main()
