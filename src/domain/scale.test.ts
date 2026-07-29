import { describe, expect, it } from "vitest";
import { buildAxisScale } from "./scale";

describe("buildAxisScale", () => {
  it("part toujours de zéro (CA5.5)", () => {
    expect(buildAxisScale([50, 80, 30]).min).toBe(0);
  });

  it("le maximum couvre la plus grande valeur, sans troncature", () => {
    expect(buildAxisScale([50, 80, 30]).max).toBe(80);
  });

  it("gère une série entièrement à zéro sans échelle dégénérée", () => {
    const scale = buildAxisScale([0, 0, 0]);
    expect(scale.min).toBe(0);
    expect(scale.max).toBeGreaterThan(0);
  });

  it("gère une série vide", () => {
    const scale = buildAxisScale([]);
    expect(scale.min).toBe(0);
    expect(scale.max).toBeGreaterThan(0);
  });

  it("produit des graduations régulières entre le minimum et le maximum", () => {
    const scale = buildAxisScale([100]);
    expect(scale.ticks[0]).toBe(0);
    expect(scale.ticks[scale.ticks.length - 1]).toBe(100);
  });
});
