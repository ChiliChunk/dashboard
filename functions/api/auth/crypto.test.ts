import { describe, expect, it } from "vitest";
import { decrypt, encrypt } from "./crypto";

describe("chiffrement du jeton de rafraîchissement", () => {
  const secret = "clé-de-test-suffisamment-longue-pour-sha256";

  it("déchiffre exactement ce qu'il a chiffré", async () => {
    const ciphertext = await encrypt("refresh-token-exemple", secret);
    await expect(decrypt(ciphertext, secret)).resolves.toBe("refresh-token-exemple");
  });

  it("rejette une valeur corrompue", async () => {
    const ciphertext = await encrypt("refresh-token-exemple", secret);
    const corrupted = `${ciphertext.slice(0, -2)}zz`;
    await expect(decrypt(corrupted, secret)).rejects.toThrow();
  });

  it("rejette un déchiffrement avec la mauvaise clé", async () => {
    const ciphertext = await encrypt("refresh-token-exemple", secret);
    await expect(decrypt(ciphertext, "une-autre-clé-différente")).rejects.toThrow();
  });
});
