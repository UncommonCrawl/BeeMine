const HEX_HEIGHT_RATIO = 1.154700538;
const HEX_ROW_STEP_RATIO = 0.75;
const DEFAULT_ROW_STAGGER = 0.5;

export const HEX_GEOMETRY = Object.freeze({
  heightRatio: HEX_HEIGHT_RATIO,
  rowStepRatio: HEX_ROW_STEP_RATIO,
  rowStagger: DEFAULT_ROW_STAGGER,
});

export const MAP_TILE_KIND = Object.freeze({
  ACTIVE: "active",
  INACTIVE_BLACK: "inactive-black",
  INACTIVE_YELLOW_EYE: "inactive-yellow-eye",
  INACTIVE_YELLOW_SMILE: "inactive-yellow-smile",
});

const SPEC_TOKEN_TO_LAYOUT_TOKEN = Object.freeze({
  A: "A",
  B: "B",
  D: "B",
  E: "E",
  S: "S",
  G: ".",
  ".": ".",
});

const LAYOUT_TOKEN_TO_TILE_KIND = Object.freeze({
  A: MAP_TILE_KIND.ACTIVE,
  B: MAP_TILE_KIND.INACTIVE_BLACK,
  E: MAP_TILE_KIND.INACTIVE_YELLOW_EYE,
  S: MAP_TILE_KIND.INACTIVE_YELLOW_SMILE,
  ".": null,
});

const RAW_MAP_DEFINITIONS = [
  {
    category: "standard",
    id: "classic",
    name: "Classic",
    rows: [
      "D6D",
      "D5D",
      "6",
      "5",
      "4",
      "ESE",
    ],
  },
  {
    category: "standard",
    id: "new-map-1",
    name: "Turtle",
    rows: [
      "D4D",
      "D5D",
      "6",
      "7",
      "4",
      "ESE",
    ],
  },
  {
    category: "standard",
    id: "froggy",
    name: "Froggy",
    rows: [
      "DGGGGD",
      "D5D",
      "6",
      "7",
      "1G4G1",
      "1GESEG1",
    ],
  },
  {
    category: "standard",
    id: "its-a-bird",
    name: "It's a Bird!",
    rows: [
      "4",
      "1G3G1",
      "2G2G2",
      "D7D",
      "DD4DD",
      "ESE",
    ],
  },
  {
    category: "standard",
    id: "its-a-plane",
    name: "It's a Plane!",
    rows: [
      "4",
      "3",
      "D6D",
      "D7D",
      "D6D",
      "ESE",
    ],
  },
  {
    category: "standard",
    id: "king",
    name: "King Bee",
    rows: [
      "3",
      "4",
      "5",
      "2DD2",
      "2ESE2",
      "3DD3",
    ],
  },
  {
    category: "standard",
    id: "queen",
    name: "Queen Bee",
    rows: [
      "3",
      "6",
      "7",
      "3DD3",
      "2ESE2",
    ],
  },
  {
    category: "bonus",
    id: "pisces",
    name: "Pisces",
    rows: [
      "1G1",
      "4",
      "1G3G1",
      "6",
      "5",
      "4",
      "ESE",
    ],
  },
  {
    category: "bonus",
    id: "leo",
    name: "Leo",
    rows: [
      "5",
      "6",
      "2ESE2",
      "6",
      "5",
    ],
  },
  {
    category: "bonus",
    id: "bell",
    name: "Bell",
    rows: [
      "1",
      "4",
      "5",
      "4",
      "5",
      "6",
      "1",
    ],
  },
  {
    category: "bonus",
    id: "pretzel",
    name: "Pretzel",
    rows: [
      "6",
      "1G3G1",
      "6",
      "1G1G1",
      "4",
      "1G1",
    ],
  },
  {
    category: "bonus",
    id: "llama",
    name: "Llama",
    rows: [
      "1GGG1",
      "4",
      "1ESE1",
      "6",
      "5",
      "4",
      "3",
    ],
  },
  {
    category: "bonus",
    id: "octopus",
    name: "Octopus",
    rows: [
      "2",
      "3",
      "2G2G2",
      "5",
      "1G4G1",
      "2ESE2",
    ],
  },
  {
    category: "bonus",
    id: "triforce",
    name: "Triforce",
    rows: [
      "D",
      "2",
      "1D1",
      "4",
      "1GGG1",
      "2GG2",
      "1D1G1D1",
      "8",
    ],
  },
  {
    category: "bonus",
    id: "alien",
    name: "Alien",
    rows: [
      "EGGE",
      "1S1",
      "4",
      "D5D",
      "D6D",
      "5",
      "DD4DD",
    ],
  },
];

function assert(condition, message) {
  if (!condition) {
    throw new Error(`[mapLayouts] ${message}`);
  }
}

function expandRowSpec(rowSpec, mapId, rowIndex) {
  const input = String(rowSpec || "")
    .trim()
    .replace(/\s+/g, "");
  assert(input.length > 0, `Row ${rowIndex} in map "${mapId}" is empty.`);

  const layoutTokens = [];
  let index = 0;
  while (index < input.length) {
    const char = input[index];

    if (char === ",") {
      index += 1;
      continue;
    }

    if (char >= "0" && char <= "9") {
      const count = Number.parseInt(char, 10);
      assert(count > 0, `Zero-length segment in row ${rowIndex} of map "${mapId}".`);
      for (let repeat = 0; repeat < count; repeat += 1) {
        layoutTokens.push("A");
      }
      index += 1;
      continue;
    }

    const normalizedChar = char.toUpperCase();
    const mappedToken = SPEC_TOKEN_TO_LAYOUT_TOKEN[normalizedChar];
    assert(
      typeof mappedToken === "string",
      `Unknown row token "${char}" in row ${rowIndex} of map "${mapId}".`
    );
    index += 1;
    layoutTokens.push(mappedToken);
  }

  assert(layoutTokens.length > 0, `Row ${rowIndex} in map "${mapId}" has no tiles or gaps.`);
  return layoutTokens;
}

function validateRowStarts(rowStarts, rowCount) {
  assert(Array.isArray(rowStarts), "rowStarts must be an array.");
  assert(
    rowStarts.length === rowCount,
    `rowStarts length (${rowStarts.length}) must match row count (${rowCount}).`
  );
  rowStarts.forEach((start, index) => {
    assert(
      typeof start === "number" && Number.isFinite(start),
      `rowStarts[${index}] must be a finite number.`
    );
    assert(start >= 0, `rowStarts[${index}] cannot be negative.`);
  });
}

function buildMapDefinition(rawDefinition) {
  assert(rawDefinition && typeof rawDefinition === "object", "Map definition must be an object.");
  const id = String(rawDefinition.id || "").trim();
  const name = String(rawDefinition.name || "").trim();
  const category = String(rawDefinition.category || "standard").trim().toLowerCase();
  assert(id.length > 0, "Map id is required.");
  assert(name.length > 0, `Map "${id}" must have a name.`);
  assert(category === "standard" || category === "bonus", `Map "${id}" has invalid category "${category}".`);

  const rawRows = Array.isArray(rawDefinition.rows) ? rawDefinition.rows : rawDefinition.layout;
  assert(Array.isArray(rawRows) && rawRows.length > 0, `Map "${id}" must have at least one row.`);

  const rows = rawRows.map((rowSpec, rowIndex) => expandRowSpec(rowSpec, id, rowIndex));
  const widestRowLength = rows.reduce((max, rowTokens) => Math.max(max, rowTokens.length), 0);
  const defaultRowStarts = rows.map((rowTokens) => (widestRowLength - rowTokens.length) / 2);
  const rowStarts = rawDefinition.rowStarts ? [...rawDefinition.rowStarts] : defaultRowStarts;
  validateRowStarts(rowStarts, rows.length);

  rows.forEach((rowTokens, rowIndex) => {
    rowTokens.forEach((token, columnIndex) => {
      assert(
        Object.prototype.hasOwnProperty.call(LAYOUT_TOKEN_TO_TILE_KIND, token),
        `Unknown tile token "${token}" at row ${rowIndex}, column ${columnIndex} in map "${id}".`
      );
    });
  });

  return Object.freeze({
    id,
    category,
    name,
    rows,
    rowStarts: Object.freeze(rowStarts),
    widestRowLength,
  });
}

const MAP_DEFINITIONS = RAW_MAP_DEFINITIONS.map(buildMapDefinition);
const MAP_DEFINITION_BY_ID = new Map(MAP_DEFINITIONS.map((definition) => [definition.id, definition]));

function getMapDefinition(mapId) {
  const definition = MAP_DEFINITION_BY_ID.get(mapId);
  assert(definition, `Unknown map id "${mapId}".`);
  return definition;
}

function buildActiveNeighborLookup(activeTiles) {
  const indexByCoordinate = new Map();
  activeTiles.forEach((tile, index) => {
    indexByCoordinate.set(`${tile.row}:${tile.x}`, index);
  });

  const neighborOffsets = [
    [-1, 0],
    [1, 0],
    [-0.5, -1],
    [0.5, -1],
    [-0.5, 1],
    [0.5, 1],
  ];

  return activeTiles.map((tile) => {
    const results = [];
    neighborOffsets.forEach(([dx, dy]) => {
      const neighborKey = `${tile.row + dy}:${tile.x + dx}`;
      const neighborIndex = indexByCoordinate.get(neighborKey);
      if (typeof neighborIndex === "number") {
        results.push(neighborIndex);
      }
    });
    return Object.freeze(results);
  });
}

export function buildPlacedMap(mapId) {
  const definition = getMapDefinition(mapId);
  const tiles = [];

  definition.rows.forEach((rowTokens, rowIndex) => {
    const rowStart = definition.rowStarts[rowIndex];
    rowTokens.forEach((token, col) => {
      const kind = LAYOUT_TOKEN_TO_TILE_KIND[token];
      if (!kind) return;
      tiles.push({
        key: `${rowIndex}:${col}:${kind}`,
        kind,
        row: rowIndex,
        col,
        x: col + rowStart,
      });
    });
  });

  const activeTiles = tiles.filter((tile) => tile.kind === MAP_TILE_KIND.ACTIVE);
  assert(activeTiles.length > 0, `Map "${mapId}" must contain at least one active tile.`);
  const minX = tiles.reduce((min, tile) => Math.min(min, tile.x), Infinity);
  const maxX = tiles.reduce((max, tile) => Math.max(max, tile.x), -Infinity);
  const neighborsByActiveIndex = buildActiveNeighborLookup(activeTiles);

  return Object.freeze({
    id: definition.id,
    category: definition.category,
    name: definition.name,
    width: definition.widestRowLength,
    rowCount: definition.rows.length,
    xMin: minX,
    xMax: maxX,
    xSpan: maxX - minX + 1,
    tiles: Object.freeze(tiles),
    activeTiles: Object.freeze(activeTiles),
    neighborsByActiveIndex: Object.freeze(neighborsByActiveIndex),
  });
}

export const mapDefinitions = Object.freeze(
  MAP_DEFINITIONS.map((definition) => ({
    id: definition.id,
    category: definition.category,
    name: definition.name,
  }))
);

export function getDefaultMapId() {
  const classic = MAP_DEFINITIONS.find((definition) => definition.id === "classic");
  if (classic) return classic.id;
  const firstStandard = MAP_DEFINITIONS.find((definition) => definition.category === "standard");
  return firstStandard?.id || MAP_DEFINITIONS[0]?.id || "";
}
