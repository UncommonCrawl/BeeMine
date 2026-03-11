import { describe, expect, it } from "vitest";
import { buildPlacedMap, mapDefinitions } from "./mapLayouts.js";

describe("mapLayouts", () => {
  it("builds every registered map without throwing", () => {
    expect(mapDefinitions.length).toBeGreaterThan(0);
    mapDefinitions.forEach((mapDefinition) => {
      expect(() => buildPlacedMap(mapDefinition.id)).not.toThrow();
    });
  });

  it("builds the classic map with active tiles and neighbor data", () => {
    const classic = buildPlacedMap("classic");
    expect(classic.activeTiles.length).toBeGreaterThan(0);
    expect(classic.neighborsByActiveIndex.length).toBe(classic.activeTiles.length);
  });

  it("parses D4D as decorative + four active + decorative", () => {
    const map = buildPlacedMap("new-map-1");
    const topRowTiles = map.tiles.filter((tile) => tile.row === 0);
    const topKinds = topRowTiles.map((tile) => tile.kind);
    expect(topKinds).toEqual([
      "inactive-black",
      "active",
      "active",
      "active",
      "active",
      "inactive-black",
    ]);
  });

  it("parses ESE as eye-smile-eye", () => {
    const map = buildPlacedMap("new-map-1");
    const bottomRow = Math.max(...map.tiles.map((tile) => tile.row));
    const bottomKinds = map.tiles.filter((tile) => tile.row === bottomRow).map((tile) => tile.kind);
    expect(bottomKinds).toEqual([
      "inactive-yellow-eye",
      "inactive-yellow-smile",
      "inactive-yellow-eye",
    ]);
  });

  it("exposes both standard and bonus map categories", () => {
    const categories = new Set(mapDefinitions.map((definition) => definition.category));
    expect(categories.has("standard")).toBe(true);
    expect(categories.has("bonus")).toBe(true);
  });
});
