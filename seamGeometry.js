const HEX_SIDE_NEIGHBOR_OFFSETS = Object.freeze([
  Object.freeze({ dx: -1, dy: 0 }),
  Object.freeze({ dx: 1, dy: 0 }),
  Object.freeze({ dx: -0.5, dy: -1 }),
  Object.freeze({ dx: 0.5, dy: -1 }),
  Object.freeze({ dx: -0.5, dy: 1 }),
  Object.freeze({ dx: 0.5, dy: 1 }),
]);

export function buildDecorativeSeams({
  decorativeTilesByCoordinate,
  hexWidth,
  hexHeight,
  rowStep,
  seamSpillPx = 0,
}) {
  if (!(decorativeTilesByCoordinate instanceof Map)) return [];
  if (!Number.isFinite(hexWidth) || !Number.isFinite(hexHeight) || !Number.isFinite(rowStep)) {
    return [];
  }
  if (hexWidth <= 0 || hexHeight <= 0 || rowStep <= 0) return [];

  const sideLength = hexWidth / Math.sqrt(3);
  const seams = [];

  decorativeTilesByCoordinate.forEach((tileData) => {
    const { row, x, renderX } = tileData || {};
    if (!Number.isFinite(row) || !Number.isFinite(x) || !Number.isFinite(renderX)) return;

    HEX_SIDE_NEIGHBOR_OFFSETS.forEach(({ dx, dy }) => {
      const neighborRow = row + dy;
      const neighborX = x + dx;
      const neighborKey = `${neighborRow}:${neighborX}`;
      const neighborData = decorativeTilesByCoordinate.get(neighborKey);
      if (!neighborData) return;

      const isCanonicalOwner = row < neighborRow || (row === neighborRow && x < neighborX);
      if (!isCanonicalOwner) return;

      const centerAX = hexWidth * renderX + hexWidth / 2;
      const centerAY = rowStep * row + hexHeight / 2;
      const centerBX = hexWidth * neighborData.renderX + hexWidth / 2;
      const centerBY = rowStep * neighborData.row + hexHeight / 2;

      seams.push({
        centerX: (centerAX + centerBX) / 2,
        centerY: (centerAY + centerBY) / 2,
        angle: (Math.atan2(centerBY - centerAY, centerBX - centerAX) * 180) / Math.PI + 90,
        length: Math.max(0, sideLength + seamSpillPx * 2),
      });
    });
  });

  return seams;
}

