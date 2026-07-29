import { describe, expect, it } from "vitest";
import { QuotaExceededError, RequestQuota } from "./quota";

describe("RequestQuota", () => {
  it("autorise les requêtes jusqu'à 180 dans la fenêtre locale, puis bloque", () => {
    const quota = new RequestQuota();
    const now = Date.now();
    for (let i = 0; i < 180; i += 1) {
      expect(() => quota.checkAndRecord(now)).not.toThrow();
    }
    expect(() => quota.checkAndRecord(now)).toThrow(QuotaExceededError);
  });

  it("libère la fenêtre glissante après 15 minutes", () => {
    const quota = new RequestQuota();
    const start = Date.now();
    for (let i = 0; i < 180; i += 1) {
      quota.checkAndRecord(start);
    }
    expect(() => quota.checkAndRecord(start + 15 * 60 * 1000 + 1)).not.toThrow();
  });

  it("donne priorité aux en-têtes Strava sur le compteur local en cas de divergence", () => {
    const quota = new RequestQuota();
    const now = Date.now();

    quota.recordHeaders("50,90", "100,200");
    expect(() => quota.checkAndRecord(now)).not.toThrow();

    quota.recordHeaders("50,200", "100,200");
    expect(() => quota.checkAndRecord(now)).toThrow(QuotaExceededError);
  });
});
