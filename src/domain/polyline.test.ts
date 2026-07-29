import { describe, expect, it } from "vitest";
import { decodePolyline } from "./polyline";

describe("decodePolyline", () => {
  it("décode un tracé connu (exemple de référence de l'algorithme Google)", () => {
    const points = decodePolyline("_p~iF~ps|U_ulLnnqC_mqNvxq`@");
    expect(points).toHaveLength(3);
    expect(points[0]!.lat).toBeCloseTo(38.5, 5);
    expect(points[0]!.lng).toBeCloseTo(-120.2, 5);
    expect(points[1]!.lat).toBeCloseTo(40.7, 5);
    expect(points[2]!.lat).toBeCloseTo(43.252, 3);
  });

  it("renvoie une liste vide pour une chaîne vide", () => {
    expect(decodePolyline("")).toEqual([]);
  });

  it("renvoie une liste vide pour une valeur nulle", () => {
    expect(decodePolyline(null)).toEqual([]);
  });

  it("ne lève pas d'exception sur une chaîne malformée", () => {
    expect(() => decodePolyline("###invalide!!!")).not.toThrow();
  });
});
