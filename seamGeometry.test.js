import { describe, expect, it } from "vitest";
import { buildDecorativeSeams } from "./seamGeometry.js";

function makeDecorativeMap(entries) {
  const map = new Map();
  entries.forEach((entry) => {
    map.set(`${entry.row}:${entry.x}`, entry);
  });
  return map;
}

describe("buildDecorativeSeams", () => {
  it("creates one seam for a horizontal decorative pair", () => {
    const decorativeTilesByCoordinate = makeDecorativeMap([
      { row: 0, x: 0, renderX: 0 },
      { row: 0, x: 1, renderX: 1 },
    ]);
    const seams = buildDecorativeSeams({
      decorativeTilesByCoordinate,
      hexWidth: 100,
      hexHeight: 115.4701,
      rowStep: 86.6025,
      seamSpillPx: 0,
    });

    expect(seams).toHaveLength(1);
    expect(seams[0].centerX).toBeCloseTo(100, 4);
    expect(seams[0].centerY).toBeCloseTo(57.73505, 4);
    expect(seams[0].angle).toBeCloseTo(90, 4);
    expect(seams[0].length).toBeCloseTo(57.7350269, 4);
  });

  it("creates one seam for an upper-right diagonal decorative pair", () => {
    const decorativeTilesByCoordinate = makeDecorativeMap([
      { row: 1, x: 0, renderX: 0 },
      { row: 0, x: 0.5, renderX: 0.5 },
    ]);
    const seams = buildDecorativeSeams({
      decorativeTilesByCoordinate,
      hexWidth: 100,
      hexHeight: 115.4701,
      rowStep: 86.6025,
      seamSpillPx: 0,
    });

    expect(seams).toHaveLength(1);
    expect(seams[0].angle).toBeCloseTo(210, 4);
    expect(seams[0].length).toBeCloseTo(57.7350269, 4);
  });

  it("does not create seams for non-neighbor decorative tiles", () => {
    const decorativeTilesByCoordinate = makeDecorativeMap([
      { row: 0, x: 0, renderX: 0 },
      { row: 0, x: 2, renderX: 2 },
    ]);
    const seams = buildDecorativeSeams({
      decorativeTilesByCoordinate,
      hexWidth: 100,
      hexHeight: 115.4701,
      rowStep: 86.6025,
      seamSpillPx: 0,
    });

    expect(seams).toHaveLength(0);
  });

  it("dedupes each shared side to one seam", () => {
    const decorativeTilesByCoordinate = makeDecorativeMap([
      { row: 0, x: 0, renderX: 0 },
      { row: 0, x: 1, renderX: 1 },
      { row: 1, x: 0.5, renderX: 0.5 },
    ]);
    const seams = buildDecorativeSeams({
      decorativeTilesByCoordinate,
      hexWidth: 100,
      hexHeight: 115.4701,
      rowStep: 86.6025,
      seamSpillPx: 1,
    });

    expect(seams).toHaveLength(3);
    seams.forEach((seam) => {
      expect(seam.length).toBeCloseTo(59.7350269, 4);
    });
  });
});
