import { describe, expect, it } from "vitest";
import { onRequestPost } from "./token";

const env = {
  STRAVA_CLIENT_ID: "test-id",
  STRAVA_CLIENT_SECRET: "test-secret",
  SESSION_ENCRYPTION_KEY: "clé-de-test-suffisamment-longue-pour-sha256",
};

describe("/api/auth/token", () => {
  it("renvoie 401 quand le cookie de session est absent", async () => {
    const request = new Request("https://app.example/api/auth/token", { method: "POST" });
    const response = await onRequestPost({ request, env });
    expect(response.status).toBe(401);
  });

  it("renvoie 401 quand le cookie de session est corrompu", async () => {
    const request = new Request("https://app.example/api/auth/token", {
      method: "POST",
      headers: { Cookie: "sdd_session=42|valeur-non-dechiffrable" },
    });
    const response = await onRequestPost({ request, env });
    expect(response.status).toBe(401);
  });

  it("renvoie 401 quand le cookie de session est mal formé (pas de séparateur)", async () => {
    const request = new Request("https://app.example/api/auth/token", {
      method: "POST",
      headers: { Cookie: "sdd_session=valeur-sans-separateur" },
    });
    const response = await onRequestPost({ request, env });
    expect(response.status).toBe(401);
  });
});
