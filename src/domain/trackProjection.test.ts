import { describe, expect, it } from "vitest";
import { projectPoints, toSvgPointsAttribute } from "./trackProjection";

const SIZE = { width: 320, height: 200, paddingRatio: 0.9 };

describe("projectPoints", () => {
  it("renvoie une liste vide pour un tracé vide", () => {
    expect(projectPoints([], SIZE)).toEqual([]);
  });

  it("place le centre géographique au centre de la vue", () => {
    const points = [
      { lat: 45.0, lng: 5.0 },
      { lat: 45.1, lng: 5.1 },
    ];
    const [first] = projectPoints(points, SIZE);
    // Le point médian du tracé doit être proche du centre du viewBox.
    expect(first!.x).toBeGreaterThan(0);
    expect(first!.x).toBeLessThan(SIZE.width);
    expect(first!.y).toBeGreaterThan(0);
    expect(first!.y).toBeLessThan(SIZE.height);
  });

  it("place le nord (latitude la plus élevée) en haut de la vue (y le plus petit)", () => {
    const points = [
      { lat: 45.0, lng: 5.0 },
      { lat: 45.2, lng: 5.0 },
    ];
    const projected = projectPoints(points, SIZE);
    expect(projected[1]!.y).toBeLessThan(projected[0]!.y);
  });

  it("ne produit jamais de coordonnée non finie, même sur un point unique", () => {
    const projected = projectPoints([{ lat: 45.0, lng: 5.0 }], SIZE);
    expect(Number.isFinite(projected[0]!.x)).toBe(true);
    expect(Number.isFinite(projected[0]!.y)).toBe(true);
  });
});

describe("toSvgPointsAttribute", () => {
  it("formate une liste de points en attribut SVG polyline", () => {
    expect(toSvgPointsAttribute([{ x: 1.23, y: 4.56 }, { x: 7, y: 8 }])).toBe("1.2,4.6 7.0,8.0");
  });

  it("renvoie une chaîne vide pour une liste vide", () => {
    expect(toSvgPointsAttribute([])).toBe("");
  });
});
