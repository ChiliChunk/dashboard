import { describe, expect, it } from "vitest";
import { onRequestGet } from "./callback";

const env = {
  STRAVA_CLIENT_ID: "test-id",
  STRAVA_CLIENT_SECRET: "test-secret",
  SESSION_ENCRYPTION_KEY: "clé-de-test-suffisamment-longue-pour-sha256",
};

describe("/api/auth/callback — rejet sans exception non gérée (CA1.4)", () => {
  it("redirige avec un message quand l'état ne correspond pas au cookie", async () => {
    const request = new Request(
      "https://app.example/api/auth/callback?code=abc&state=different-state",
      { headers: { Cookie: "sdd_state=cookie-state|%2F" } },
    );
    const response = await onRequestGet({ request, env });
    expect(response.status).toBe(302);
    const location = new URL(response.headers.get("Location") ?? "", "https://app.example");
    expect(location.searchParams.get("auth_error")).toBe("etat_invalide");
  });

  it("redirige avec un message quand Strava renvoie un paramètre error", async () => {
    const request = new Request(
      "https://app.example/api/auth/callback?error=access_denied&state=cookie-state",
      { headers: { Cookie: "sdd_state=cookie-state|%2F" } },
    );
    const response = await onRequestGet({ request, env });
    expect(response.status).toBe(302);
    const location = new URL(response.headers.get("Location") ?? "", "https://app.example");
    expect(location.searchParams.get("auth_error")).toBe("refus");
  });

  it("redirige sans lever d'exception quand aucun cookie d'état n'est présent", async () => {
    const request = new Request(
      "https://app.example/api/auth/callback?code=abc&state=x",
    );
    const response = await onRequestGet({ request, env });
    expect(response.status).toBe(302);
  });
});
