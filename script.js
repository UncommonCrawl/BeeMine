import { levelCatalog } from "./words.js";
import { buildPlacedMap, getDefaultMapId, mapDefinitions } from "./mapLayouts.js";
import { dailySchedule } from "./dailySchedule.js";

const MIN_WORD_LENGTH = 6;
const LEVEL_ENTRIES =
  levelCatalog && typeof levelCatalog === "object"
    ? Object.entries(levelCatalog).flatMap(([category, words]) => {
        if (!Array.isArray(words)) return [];
        return words.map((word) => ({
          id: `lvl_${category.toLowerCase()}_${String(word || "").toLowerCase()}`,
          word: String(word || "").toUpperCase(),
          category,
          hidden: false,
        }));
      })
    : [];
const LETTER_GRID = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const SVG_NS = "http://www.w3.org/2000/svg";
const SHUFFLE_MAP_ID = "shuffle";
const GAME_MODE_NORMAL = "normal";
const GAME_MODE_DAILY = "daily";
const DAILY_STATE_STORAGE_KEY = "beemine.daily.v1";
const MAP_STATS_STORAGE_KEY = "beemine.mapstats.v1";
const PAGE_STANDARD = "standard";
const PAGE_BONUS = "bonus";
const FREQUENCY_PAGE_ALPHABETICAL = "alphabetical";
const FREQUENCY_PAGE_FREQUENCY = "frequency";
const DAILY_PERSIST_DEBOUNCE_MS = 500;
const STATS_TAB_DAILY = "daily";
const STATS_TAB_ENDLESS = "endless";
const STATS_RESULT_WON = "won";
const STATS_RESULT_LOST = "lost";
const TRIFORCE_MAP_ID = "triforce";
const FIRST_CLICK_SAFE_NEIGHBOR_DISTRIBUTION = [
  { safeNeighbors: 6, weight: 40 },
  { safeNeighbors: 5, weight: 40 },
  { safeNeighbors: 4, weight: 40 },
  { safeNeighbors: 3, weight: 40 },
  { safeNeighbors: 2, weight: 30 },
  { safeNeighbors: 1, weight: 15 },
  { safeNeighbors: 0, weight: 5 },
];
const DECORATIVE_EDGE_SEGMENTS = Object.freeze([
  Object.freeze({ edgeKey: "left", dx: -1, dy: 0, x1: 0, y1: 28.8675, x2: 0, y2: 86.6025 }),
  Object.freeze({ edgeKey: "right", dx: 1, dy: 0, x1: 100, y1: 28.8675, x2: 100, y2: 86.6025 }),
  Object.freeze({
    edgeKey: "upper-left",
    dx: -0.5,
    dy: -1,
    x1: 0,
    y1: 28.8675,
    x2: 50,
    y2: 0,
  }),
  Object.freeze({
    edgeKey: "upper-right",
    dx: 0.5,
    dy: -1,
    x1: 50,
    y1: 0,
    x2: 100,
    y2: 28.8675,
  }),
  Object.freeze({
    edgeKey: "lower-left",
    dx: -0.5,
    dy: 1,
    x1: 0,
    y1: 86.6025,
    x2: 50,
    y2: 115.4701,
  }),
  Object.freeze({
    edgeKey: "lower-right",
    dx: 0.5,
    dy: 1,
    x1: 100,
    y1: 86.6025,
    x2: 50,
    y2: 115.4701,
  }),
]);
let boardEl = null;
let statsStackEl = null;
let resultMessageEl = null;
let flagCountEl = null;
let mineCountEl = null;
let flagCountValueEl = null;
let mineCountValueEl = null;
let newGameBtn = null;
let dailyBeeBtn = null;
let endlessNewGameBtn = null;
let unscrambleEl = null;
let prestartPromptEl = null;
let prestartPromptMainEl = null;
let guessStackEl = null;
let categoryLabelEl = null;
let wordSlotsEl = null;
let hintLetterBtn = null;
let submitGuessBtn = null;
let shuffleBankBtn = null;
let flaggedLettersEl = null;
let helpOpenBtn = null;
let topControlsToggleBtn = null;
let topControlsActionsEl = null;
let helpModalEl = null;
let helpCloseBtn = null;
let legendShiftNNewGameEl = null;
let frequencyOpenBtn = null;
let frequencyModalEl = null;
let frequencyCloseBtn = null;
let statsOpenBtn = null;
let statsModalEl = null;
let statsCloseBtn = null;
let statsResetBtn = null;
let statsEndlessGridEl = null;
let statsPageSections = [];
let statsTabDailyBtn = null;
let statsTabEndlessBtn = null;
let statsDailyWinRateEl = null;
let statsDailyAvgHintsEl = null;
let statsDailyCurrentStreakEl = null;
let statsDailyLongestStreakEl = null;
let hexOpenBtn = null;
let hexModalEl = null;
let hexCloseBtn = null;
let mapOptionButtons = [];
let mapPageSections = [];
let pageStandardBtn = null;
let pageBonusBtn = null;
let frequencyPageSections = [];
let frequencyPageAlphabeticalBtn = null;
let frequencyPageFrequencyBtn = null;
let topControlsEl = null;

let tiles = [];
let game = null;
let neighborsByTileIndex = [];
let selectedPage = PAGE_STANDARD;
let selectedFrequencyPage = FREQUENCY_PAGE_ALPHABETICAL;
let selectedStatsTab = STATS_TAB_DAILY;
let selectedStandardMapId = SHUFFLE_MAP_ID;
let selectedBonusMapId = null;
let lastShuffledStandardMapId = null;
let lastShuffledBonusMapId = null;
let beeEyesTimer = null;
let beePressTimer = null;
let dailyPersistTimer = null;
let ignoreNextReplayClick = false;
let dailyRecord = null;
let mapStatsRecord = null;
const STANDARD_MAP_DEFINITIONS = mapDefinitions.filter((entry) => entry.category !== PAGE_BONUS);
const BONUS_MAP_DEFINITIONS = mapDefinitions.filter((entry) => entry.category === PAGE_BONUS);
const DAILY_MAP_IDS = mapDefinitions.map((entry) => entry.id).sort((a, b) => a.localeCompare(b));
const MAP_NAME_BY_ID = new Map(mapDefinitions.map((entry) => [entry.id, entry.name]));
const MAP_SORT_INDEX_BY_ID = new Map(mapDefinitions.map((entry, index) => [entry.id, index]));
selectedBonusMapId = SHUFFLE_MAP_ID;

function getPlayableWordLetters(word) {
  return String(word || "")
    .toUpperCase()
    .replace(/[^A-Z]/g, "");
}

function getPlayableWordLength(word) {
  return getPlayableWordLetters(word).length;
}

function isVisibleWordSeparator(character) {
  return character === " " || character === "-";
}

const ELIGIBLE_LEVELS = LEVEL_ENTRIES.filter(
  (entry) => !entry.hidden && getPlayableWordLength(entry.word) >= MIN_WORD_LENGTH
);
const DAILY_ELIGIBLE_LEVELS = [...ELIGIBLE_LEVELS].sort((a, b) => a.id.localeCompare(b.id));
const DAILY_ENTRY_BY_KEY = new Map(
  DAILY_ELIGIBLE_LEVELS.map((entry) => [`${entry.category}::${entry.word}`, entry])
);
const DAILY_SCHEDULE_BY_DATE = new Map(
  (Array.isArray(dailySchedule) ? dailySchedule : [])
    .filter(
      (entry) =>
        entry &&
        typeof entry === "object" &&
        typeof entry.date === "string" &&
        typeof entry.category === "string" &&
        typeof entry.word === "string" &&
        typeof entry.mapId === "string"
    )
    .map((entry) => [
      entry.date,
      { category: entry.category, word: entry.word, mapId: entry.mapId },
    ])
);

function neighbors(index) {
  const neighborIndexes = neighborsByTileIndex[index];
  return Array.isArray(neighborIndexes) ? neighborIndexes : [];
}

function shuffle(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function createHexSvg(options = {}) {
  const includeDecorativeSharedEdges = Boolean(options.includeDecorativeSharedEdges);
  const hexPoints = "50,0 100,28.8675 100,86.6025 50,115.4701 0,86.6025 0,28.8675";
  const svgEl = document.createElementNS(SVG_NS, "svg");
  svgEl.setAttribute("class", "tile-svg");
  svgEl.setAttribute("viewBox", "0 0 100 115.4701");
  svgEl.setAttribute("aria-hidden", "true");

  if (includeDecorativeSharedEdges) {
    const fillPolygonEl = document.createElementNS(SVG_NS, "polygon");
    fillPolygonEl.setAttribute("class", "tile-shape tile-shape-fill");
    fillPolygonEl.setAttribute("points", hexPoints);
    svgEl.appendChild(fillPolygonEl);

    const edgeLayerEl = document.createElementNS(SVG_NS, "g");
    edgeLayerEl.setAttribute("class", "tile-nonshared-edge-layer");
    DECORATIVE_EDGE_SEGMENTS.forEach((segment) => {
      const edgeEl = document.createElementNS(SVG_NS, "line");
      edgeEl.setAttribute("class", "tile-nonshared-edge");
      edgeEl.setAttribute("data-edge-key", segment.edgeKey);
      edgeEl.setAttribute("x1", String(segment.x1));
      edgeEl.setAttribute("y1", String(segment.y1));
      edgeEl.setAttribute("x2", String(segment.x2));
      edgeEl.setAttribute("y2", String(segment.y2));
      edgeLayerEl.appendChild(edgeEl);
    });
    svgEl.appendChild(edgeLayerEl);

    const sharedSeamLayerEl = document.createElementNS(SVG_NS, "g");
    sharedSeamLayerEl.setAttribute("class", "tile-shared-seam-layer");
    DECORATIVE_EDGE_SEGMENTS.forEach((segment) => {
      const seamEl = document.createElementNS(SVG_NS, "line");
      seamEl.setAttribute("class", "tile-shared-seam-edge");
      seamEl.setAttribute("data-edge-key", segment.edgeKey);
      seamEl.setAttribute("x1", String(segment.x1));
      seamEl.setAttribute("y1", String(segment.y1));
      seamEl.setAttribute("x2", String(segment.x2));
      seamEl.setAttribute("y2", String(segment.y2));
      sharedSeamLayerEl.appendChild(seamEl);
    });
    svgEl.appendChild(sharedSeamLayerEl);
  } else {
    const polygonEl = document.createElementNS(SVG_NS, "polygon");
    polygonEl.setAttribute("class", "tile-shape");
    polygonEl.setAttribute("points", hexPoints);
    svgEl.appendChild(polygonEl);
  }

  return svgEl;
}

function createInactiveTile(kind) {
  const tileEl = document.createElement("div");
  tileEl.className = `tile tile-inactive tile-inactive-${kind}`;
  tileEl.setAttribute("aria-hidden", "true");
  tileEl.appendChild(createHexSvg({ includeDecorativeSharedEdges: true }));

  if (kind === "yellow-eye") {
    const eyeEl = document.createElement("span");
    eyeEl.className = "tile-face-eye";
    tileEl.appendChild(eyeEl);
  } else if (kind === "yellow-smile") {
    const smileEl = document.createElement("span");
    smileEl.className = "tile-face-smile";
    smileEl.textContent = ")";
    tileEl.appendChild(smileEl);
  }

  return tileEl;
}

function setTileVisualPosition(element, x, row) {
  element.style.setProperty("--tile-x", String(x));
  element.style.setProperty("--tile-row", String(row));
}

function triggerBeeReaction() {
  if (!boardEl) return;
  boardEl.classList.add("bee-awake");

  if (beeEyesTimer) {
    clearTimeout(beeEyesTimer);
  }
  beeEyesTimer = setTimeout(() => {
    boardEl.classList.remove("bee-awake");
  }, 400);
}

function shouldRestoreGuessFocus() {
  return Boolean(
    game &&
      !game.over &&
      game.secretWord &&
      !isHelpOpen() &&
      !isHexOpen() &&
      !isFrequencyOpen() &&
      !isStatsOpen()
  );
}

function bindBeeReaction(element) {
  element.addEventListener("click", () => {
    triggerBeeReaction();
  });
  element.addEventListener("contextmenu", (event) => {
    event.preventDefault();
    triggerBeeReaction();
  });
}

function applyDecorativeSharedEdges(decorativeTilesByCoordinate) {
  decorativeTilesByCoordinate.forEach((tileData) => {
    DECORATIVE_EDGE_SEGMENTS.forEach((segment) => {
      const neighborKey = `${tileData.row + segment.dy}:${tileData.x + segment.dx}`;
      const hasDecorativeNeighbor = decorativeTilesByCoordinate.has(neighborKey);
      const edgeEl = tileData.element.querySelector(
        `.tile-nonshared-edge[data-edge-key="${segment.edgeKey}"]`
      );
      if (!edgeEl) return;
      edgeEl.classList.toggle("is-shared", hasDecorativeNeighbor);

      const seamEl = tileData.element.querySelector(
        `.tile-shared-seam-edge[data-edge-key="${segment.edgeKey}"]`
      );
      const isCanonicalOwner =
        hasDecorativeNeighbor &&
        (tileData.row < tileData.row + segment.dy ||
          (tileData.row === tileData.row + segment.dy && tileData.x < tileData.x + segment.dx));
      if (seamEl) {
        seamEl.classList.toggle("is-visible", isCanonicalOwner);
      }
    });
  });
}

function initBoard(mapId) {
  boardEl.innerHTML = "";
  tiles = [];
  const layout = buildPlacedMap(mapId);
  const { xMin: minX, xSpan, rowCount } = layout;
  boardEl.style.setProperty("--board-x-span", String(xSpan));
  boardEl.style.setProperty("--board-row-count", String(rowCount));
  neighborsByTileIndex = layout.neighborsByActiveIndex.map((neighborIndexes) => [...neighborIndexes]);
  const decorativeTilesByCoordinate = new Map();

  let index = 0;
  layout.tiles.forEach((entry) => {
    const renderX = entry.x - minX;
    if (entry.kind !== "active") {
      const kind = entry.kind.replace("inactive-", "");
      const tileEl = createInactiveTile(kind);
      setTileVisualPosition(tileEl, renderX, entry.row);
      bindBeeReaction(tileEl);
      boardEl.appendChild(tileEl);
      decorativeTilesByCoordinate.set(`${entry.row}:${entry.x}`, {
        element: tileEl,
        row: entry.row,
        x: entry.x,
        renderX,
      });
      return;
    }

    const tileIndex = index;
    const letter = LETTER_GRID[index % LETTER_GRID.length];
    const tileEl = document.createElement("button");
    tileEl.type = "button";
    tileEl.className = "tile";
    tileEl.dataset.index = String(index);
    setTileVisualPosition(tileEl, renderX, entry.row);
    tileEl.appendChild(createHexSvg());

    const letterEl = document.createElement("div");
    letterEl.className = "tile-letter";
    letterEl.textContent = letter;

    const valueEl = document.createElement("div");
    valueEl.className = "tile-value";

    tileEl.append(letterEl, valueEl);

    tileEl.addEventListener("click", (event) => {
      if (event.metaKey) {
        onToggleFlag(tileIndex);
        if (shouldRestoreGuessFocus()) {
          requestAnimationFrame(() => {
            focusWordSlots();
          });
        }
        return;
      }
      onReveal(tileIndex);
      if (shouldRestoreGuessFocus()) {
        requestAnimationFrame(() => {
          focusWordSlots();
        });
      }
    });
    tileEl.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      onToggleFlag(tileIndex);
      if (shouldRestoreGuessFocus()) {
        requestAnimationFrame(() => {
          focusWordSlots();
        });
      }
    });

    boardEl.appendChild(tileEl);

    tiles.push({
      index,
      x: entry.x,
      row: entry.row,
      letter,
      letterElement: letterEl,
      element: tileEl,
      valueElement: valueEl,
      revealed: false,
      flagCount: 0,
      mineCount: 0,
      isMine: false,
      adjacentMines: 0,
    });

    index += 1;
  });

  applyDecorativeSharedEdges(decorativeTilesByCoordinate);
}

function getActiveMapDefinitions() {
  return selectedPage === PAGE_BONUS ? BONUS_MAP_DEFINITIONS : STANDARD_MAP_DEFINITIONS;
}

function getSelectedMapIdForPage() {
  return selectedPage === PAGE_BONUS ? selectedBonusMapId : selectedStandardMapId;
}

function setSelectedMapIdForPage(mapId) {
  if (selectedPage === PAGE_BONUS) {
    selectedBonusMapId = mapId;
  } else {
    selectedStandardMapId = mapId;
  }
}

function chooseResolvedMapId() {
  const selectedMapId = getSelectedMapIdForPage();
  if (selectedMapId !== SHUFFLE_MAP_ID) {
    return selectedMapId || getDefaultMapId();
  }

  const candidateIds = getActiveMapDefinitions().map((entry) => entry.id);
  if (candidateIds.length === 0) {
    return getDefaultMapId();
  }

  const lastShuffledMapId =
    selectedPage === PAGE_BONUS ? lastShuffledBonusMapId : lastShuffledStandardMapId;
  const allowedIds =
    candidateIds.length > 1
      ? candidateIds.filter((mapId) => mapId !== lastShuffledMapId)
      : candidateIds;
  const roll = Math.floor(Math.random() * allowedIds.length);
  return allowedIds[roll] || candidateIds[0];
}

function shuffleBoardLetters() {
  const shuffledLetters = shuffle(LETTER_GRID).slice(0, tiles.length);
  tiles.forEach((tile, index) => {
    tile.letter = shuffledLetters[index] || LETTER_GRID[index % LETTER_GRID.length];
    tile.letterElement.textContent = tile.letter;
  });
}

function clearBoardLetters() {
  tiles.forEach((tile) => {
    tile.letter = "";
    tile.letterElement.textContent = "";
  });
}

function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatLocalDateLabel(date = new Date()) {
  const yearTwoDigits = String(date.getFullYear()).slice(-2);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${month}.${day}.${yearTwoDigits}`;
}

function readDailyRecordFromStorage() {
  try {
    const rawValue = window.localStorage.getItem(DAILY_STATE_STORAGE_KEY);
    if (!rawValue) return null;
    const parsed = JSON.parse(rawValue);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch (_error) {
    return null;
  }
}

function writeDailyRecordToStorage(record) {
  dailyRecord = record && typeof record === "object" ? record : null;
  try {
    if (!dailyRecord) {
      window.localStorage.removeItem(DAILY_STATE_STORAGE_KEY);
      return;
    }
    window.localStorage.setItem(DAILY_STATE_STORAGE_KEY, JSON.stringify(dailyRecord));
  } catch (_error) {
    // Ignore persistence failures and continue with in-memory state.
  }
}

function getTodayDailyRecord() {
  const todayKey = getLocalDateKey();
  if (dailyRecord && dailyRecord.dateKey === todayKey) {
    return dailyRecord;
  }
  const stored = readDailyRecordFromStorage();
  if (!stored || stored.dateKey !== todayKey) {
    dailyRecord = null;
    return null;
  }
  dailyRecord = stored;
  return dailyRecord;
}

function hasCompletedDailyBeeToday() {
  const record = getTodayDailyRecord();
  return Boolean(record && record.completed);
}

function createEmptyStatsBucket() {
  return {
    played: 0,
    wins: 0,
    losses: 0,
    hintsTotal: 0,
    hintRounds: 0,
  };
}

function createEmptyStatsRecord() {
  return {
    version: 2,
    endless: {
      maps: {},
    },
    daily: {
      outcomesByDate: {},
    },
  };
}

function toFiniteNumber(value) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : 0;
}

function sanitizeStatsBucket(bucket) {
  const normalized = createEmptyStatsBucket();
  if (!bucket || typeof bucket !== "object") return normalized;
  normalized.played = Math.max(0, Math.floor(toFiniteNumber(bucket.played)));
  normalized.wins = Math.max(0, Math.floor(toFiniteNumber(bucket.wins)));
  normalized.losses = Math.max(0, Math.floor(toFiniteNumber(bucket.losses)));
  normalized.hintsTotal = Math.max(0, toFiniteNumber(bucket.hintsTotal));
  const hasHintRounds = Number.isFinite(Number(bucket.hintRounds));
  normalized.hintRounds = hasHintRounds
    ? Math.max(0, Math.floor(toFiniteNumber(bucket.hintRounds)))
    : normalized.wins;
  return normalized;
}

function sanitizeEndlessStats(endlessStats) {
  const normalized = {
    maps: {},
  };
  const maps = endlessStats && typeof endlessStats === "object" ? endlessStats.maps : null;
  if (!maps || typeof maps !== "object") return normalized;

  Object.entries(maps).forEach(([mapId, bucket]) => {
    if (!mapId) return;
    normalized.maps[mapId] = sanitizeStatsBucket(bucket);
  });
  return normalized;
}

function sanitizeDailyStats(dailyStats) {
  const normalized = {
    outcomesByDate: {}, // { [dateKey]: { result: "won"|"lost", hintsUsed: number } }
  };
  if (!dailyStats || typeof dailyStats !== "object") return normalized;

  const outcomesByDate =
    dailyStats.outcomesByDate && typeof dailyStats.outcomesByDate === "object"
      ? dailyStats.outcomesByDate
      : dailyStats.outcomes && typeof dailyStats.outcomes === "object"
        ? dailyStats.outcomes
        : {};

  Object.entries(outcomesByDate).forEach(([dateKey, value]) => {
    if (!dateKey) return;
    const isLegacyString = typeof value === "string";
    const result = isLegacyString ? value : value?.result;
    if (result !== STATS_RESULT_WON && result !== STATS_RESULT_LOST) return;
    const hintsUsedRaw = isLegacyString ? null : value?.hintsUsed;
    const hintsUsed = Number.isFinite(Number(hintsUsedRaw)) ? Math.max(0, Number(hintsUsedRaw)) : 0;
    normalized.outcomesByDate[dateKey] = {
      result,
      hintsUsed,
    };
  });
  return normalized;
}

function sanitizeMapStatsRecord(record) {
  const normalized = createEmptyStatsRecord();
  if (!record || typeof record !== "object") return normalized;

  // Migrate legacy endless-only structure into version 2.
  const legacyMaps =
    record.maps && typeof record.maps === "object"
      ? record.maps
      : record.byMap && typeof record.byMap === "object"
        ? record.byMap
        : null;
  if (legacyMaps) {
    normalized.endless.maps = sanitizeEndlessStats({ maps: legacyMaps }).maps;
  }

  const endlessSource = record.endless && typeof record.endless === "object" ? record.endless : null;
  if (endlessSource) {
    normalized.endless = sanitizeEndlessStats(endlessSource);
  }

  const dailySource = record.daily && typeof record.daily === "object" ? record.daily : null;
  if (dailySource) {
    normalized.daily = sanitizeDailyStats(dailySource);
  }

  return normalized;
}

function readMapStatsFromStorage() {
  try {
    const rawValue = window.localStorage.getItem(MAP_STATS_STORAGE_KEY);
    if (!rawValue) return null;
    const parsed = JSON.parse(rawValue);
    return sanitizeMapStatsRecord(parsed);
  } catch (_error) {
    return null;
  }
}

function writeMapStatsToStorage(record) {
  mapStatsRecord = sanitizeMapStatsRecord(record);
  try {
    window.localStorage.setItem(MAP_STATS_STORAGE_KEY, JSON.stringify(mapStatsRecord));
  } catch (_error) {
    // Ignore persistence failures and continue with in-memory state.
  }
}

function getMapStatsRecord() {
  if (mapStatsRecord) return mapStatsRecord;
  mapStatsRecord = readMapStatsFromStorage() || sanitizeMapStatsRecord(null);
  return mapStatsRecord;
}

function getMapDisplayName(mapId) {
  return MAP_NAME_BY_ID.get(mapId) || mapId;
}

function isTriforceMap(mapId) {
  if (!mapId) return false;
  if (String(mapId).toLowerCase() === TRIFORCE_MAP_ID) return true;
  const mapName = getMapDisplayName(mapId);
  return String(mapName).toLowerCase() === "triforce";
}

function buildCombinedBucket(buckets) {
  return buckets.reduce((combined, bucket) => {
    const safeBucket = sanitizeStatsBucket(bucket);
    combined.played += safeBucket.played;
    combined.wins += safeBucket.wins;
    combined.losses += safeBucket.losses;
    combined.hintsTotal += safeBucket.hintsTotal;
    combined.hintRounds += safeBucket.hintRounds;
    return combined;
  }, createEmptyStatsBucket());
}

function formatRate(part, total) {
  if (total <= 0) return "--";
  return `${((part / total) * 100).toFixed(1)}%`;
}

function formatAverageHints(hintsTotal, hintRounds) {
  if (hintRounds <= 0) return "--";
  return (hintsTotal / hintRounds).toFixed(2);
}

function updateEndlessStatsGrid() {
  if (!statsEndlessGridEl) {
    return;
  }

  const record = getMapStatsRecord();
  const endlessMaps = record.endless.maps || {};
  const standardMapIds = STANDARD_MAP_DEFINITIONS.map((entry) => entry.id).filter(
    (mapId) => !isTriforceMap(mapId)
  );
  const bonusMapIds = BONUS_MAP_DEFINITIONS.map((entry) => entry.id).filter(
    (mapId) => !isTriforceMap(mapId)
  );
  const knownMapIds = mapDefinitions.map((entry) => entry.id);
  const unknownMapIds = Object.keys(endlessMaps).filter(
    (mapId) => !MAP_SORT_INDEX_BY_ID.has(mapId) && !isTriforceMap(mapId)
  );
  unknownMapIds.sort((a, b) => getMapDisplayName(a).localeCompare(getMapDisplayName(b)));
  const unknownEntries = unknownMapIds
    .filter((mapId) => !knownMapIds.includes(mapId))
    .map((mapId) => ({
      label: getMapDisplayName(mapId),
      bucket: sanitizeStatsBucket(endlessMaps[mapId]),
      isOverall: false,
    }));

  const standardOverallBucket = buildCombinedBucket(
    standardMapIds.map((mapId) => sanitizeStatsBucket(endlessMaps[mapId]))
  );
  const bonusOverallBucket = buildCombinedBucket(
    bonusMapIds.map((mapId) => sanitizeStatsBucket(endlessMaps[mapId]))
  );

  const standardEntries = [
    { label: "Overall - Standard", bucket: standardOverallBucket, isOverall: true },
    ...standardMapIds.map((mapId) => ({
      label: getMapDisplayName(mapId),
      bucket: sanitizeStatsBucket(endlessMaps[mapId]),
      isOverall: false,
    })),
  ];
  const bonusEntries = [
    { label: "Overall - Bonus", bucket: bonusOverallBucket, isOverall: true },
    ...bonusMapIds.map((mapId) => ({
      label: getMapDisplayName(mapId),
      bucket: sanitizeStatsBucket(endlessMaps[mapId]),
      isOverall: false,
    })),
    ...unknownEntries,
  ];
  const entries = [...standardEntries, ...bonusEntries].slice(0, 16);

  statsEndlessGridEl.innerHTML = "";
  entries.forEach((entry) => {
    const winRateText =
      entry.bucket.played <= 0 ? "--" : formatRate(entry.bucket.wins, entry.bucket.played);
    const avgHintsText =
      entry.bucket.played <= 0
        ? "--"
        : formatAverageHints(entry.bucket.hintsTotal, entry.bucket.hintRounds);

    const tileEl = document.createElement("article");
    tileEl.className = `endless-stat-card${entry.isOverall ? " endless-stat-card-overall" : ""}`;

    const titleEl = document.createElement("h3");
    titleEl.className = "endless-stat-title";
    titleEl.textContent = entry.label;

    const metricsEl = document.createElement("div");
    metricsEl.className = "endless-stat-metrics";

    const winStackEl = document.createElement("div");
    winStackEl.className = "endless-stat-stack";
    const winLabelEl = document.createElement("span");
    winLabelEl.className = "endless-stat-stack-label";
    winLabelEl.textContent = "Win %";
    const winValueEl = document.createElement("span");
    winValueEl.className = "endless-stat-stack-value";
    winValueEl.textContent = winRateText;
    winStackEl.append(winLabelEl, winValueEl);

    const avgStackEl = document.createElement("div");
    avgStackEl.className = "endless-stat-stack";
    const avgLabelEl = document.createElement("span");
    avgLabelEl.className = "endless-stat-stack-label";
    avgLabelEl.textContent = "Avg. Hints";
    const avgValueEl = document.createElement("span");
    avgValueEl.className = "endless-stat-stack-value";
    avgValueEl.textContent = avgHintsText;
    avgStackEl.append(avgLabelEl, avgValueEl);

    metricsEl.append(winStackEl, avgStackEl);
    tileEl.append(titleEl, metricsEl);
    statsEndlessGridEl.appendChild(tileEl);
  });
}

function getDayNumberFromDateKey(dateKey) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(dateKey))) return null;
  const [year, month, day] = String(dateKey).split("-").map((value) => Number.parseInt(value, 10));
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null;
  return Math.floor(Date.UTC(year, month - 1, day) / 86_400_000);
}

function summarizeDailyStats(outcomesByDate) {
  const entries = Object.entries(outcomesByDate || {})
    .map(([dateKey, value]) => {
      const result = typeof value === "string" ? value : value?.result;
      const hintsUsedRaw = typeof value === "string" ? 0 : value?.hintsUsed;
      const hintsUsed = Number.isFinite(Number(hintsUsedRaw)) ? Math.max(0, Number(hintsUsedRaw)) : 0;
      return {
        dateKey,
        result,
        hintsUsed,
        dayNumber: getDayNumberFromDateKey(dateKey),
      };
    })
    .filter((entry) => entry.result === STATS_RESULT_WON || entry.result === STATS_RESULT_LOST)
    .filter((entry) => Number.isInteger(entry.dayNumber))
    .sort((a, b) => a.dayNumber - b.dayNumber);

  const summary = {
    wins: 0,
    losses: 0,
    currentStreak: 0,
    longestStreak: 0,
    winRateText: "--",
    avgHintsText: "--",
  };

  let runningStreak = 0;
  let previousDay = null;
  let wonHintSum = 0;
  let wonHintCount = 0;
  entries.forEach((entry) => {
    if (entry.result === STATS_RESULT_WON) {
      if (previousDay !== null && entry.dayNumber === previousDay + 1) {
        runningStreak += 1;
      } else {
        runningStreak = 1;
      }
      summary.wins += 1;
      wonHintSum += entry.hintsUsed;
      wonHintCount += 1;
      summary.longestStreak = Math.max(summary.longestStreak, runningStreak);
    } else {
      runningStreak = 0;
      summary.losses += 1;
    }
    previousDay = entry.dayNumber;
  });

  const totalCompleted = summary.wins + summary.losses;
  if (totalCompleted > 0) {
    summary.winRateText = `${((summary.wins / totalCompleted) * 100).toFixed(1)}%`;
  }
  if (wonHintCount > 0) {
    summary.avgHintsText = (wonHintSum / wonHintCount).toFixed(2);
  }

  if (entries.length === 0) {
    return summary;
  }

  const latestEntry = entries[entries.length - 1];
  if (latestEntry.result !== STATS_RESULT_WON) {
    summary.currentStreak = 0;
    return summary;
  }

  let expectedDay = latestEntry.dayNumber;
  let streakCount = 0;
  for (let index = entries.length - 1; index >= 0; index -= 1) {
    const entry = entries[index];
    if (entry.result !== STATS_RESULT_WON) break;
    if (entry.dayNumber !== expectedDay) break;
    streakCount += 1;
    expectedDay -= 1;
  }
  summary.currentStreak = streakCount;
  return summary;
}

function updateDailyStatsPanel() {
  if (
    !statsDailyWinRateEl ||
    !statsDailyAvgHintsEl ||
    !statsDailyCurrentStreakEl ||
    !statsDailyLongestStreakEl
  ) {
    return;
  }
  const record = getMapStatsRecord();
  const summary = summarizeDailyStats(record.daily.outcomesByDate);
  statsDailyWinRateEl.textContent = summary.winRateText;
  statsDailyAvgHintsEl.textContent = summary.avgHintsText;
  statsDailyCurrentStreakEl.textContent = String(summary.currentStreak);
  statsDailyLongestStreakEl.textContent = String(summary.longestStreak);
}

function updateStatsViews() {
  updateDailyStatsPanel();
  updateEndlessStatsGrid();
}

function trackCompletedGameStats(result) {
  if (!game || (result !== STATS_RESULT_WON && result !== STATS_RESULT_LOST)) return;

  const record = getMapStatsRecord();
  if (game.mode === GAME_MODE_DAILY) {
    const dateKey = game.dailyDateKey || getLocalDateKey();
    record.daily.outcomesByDate[dateKey] = {
      result,
      hintsUsed: Math.max(0, toFiniteNumber(game.hintsUsed)),
    };
  } else {
    const mapId = game.mapId || getDefaultMapId();
    const hintsUsed = Math.max(0, toFiniteNumber(game.hintsUsed));
    if (!record.endless.maps[mapId]) {
      record.endless.maps[mapId] = createEmptyStatsBucket();
    }

    const mapBucket = record.endless.maps[mapId];
    mapBucket.played += 1;
    if (result === STATS_RESULT_WON) {
      mapBucket.wins += 1;
      mapBucket.hintsTotal += hintsUsed;
      mapBucket.hintRounds += 1;
    } else {
      mapBucket.losses += 1;
    }
  }

  writeMapStatsToStorage(record);
  updateStatsViews();
}

function resetMapStats() {
  const record = getMapStatsRecord();
  if (selectedStatsTab === STATS_TAB_DAILY) {
    record.daily = sanitizeDailyStats(null);
  } else {
    record.endless = sanitizeEndlessStats(null);
  }
  mapStatsRecord = sanitizeMapStatsRecord(record);
  try {
    window.localStorage.setItem(MAP_STATS_STORAGE_KEY, JSON.stringify(mapStatsRecord));
  } catch (_error) {
    // Ignore persistence failures and continue with in-memory state.
  }
  updateStatsViews();
}

function getDayNumberFromLocalDate(date = new Date()) {
  return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000);
}

function getDayNumberFromUtcDate(date = new Date()) {
  return Math.floor(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) / 86_400_000
  );
}

function chooseDailySecretEntry(date = new Date()) {
  if (DAILY_ELIGIBLE_LEVELS.length === 0) return null;
  const dateKey = getLocalDateKey(date);
  const scheduledEntry = DAILY_SCHEDULE_BY_DATE.get(dateKey);
  if (scheduledEntry) {
    const key = `${scheduledEntry.category}::${String(scheduledEntry.word).toUpperCase()}`;
    const matchedEntry = DAILY_ENTRY_BY_KEY.get(key);
    if (matchedEntry) return matchedEntry;
  }

  // Fallback keeps Daily Bee playable when the schedule does not include the date.
  const dayNumber = getDayNumberFromLocalDate(date);
  const index =
    ((dayNumber % DAILY_ELIGIBLE_LEVELS.length) + DAILY_ELIGIBLE_LEVELS.length) %
    DAILY_ELIGIBLE_LEVELS.length;
  return DAILY_ELIGIBLE_LEVELS[index];
}

function chooseDailyMapId(date = new Date()) {
  const dateKey = getLocalDateKey(date);
  const scheduledEntry = DAILY_SCHEDULE_BY_DATE.get(dateKey);
  if (scheduledEntry && DAILY_MAP_IDS.includes(scheduledEntry.mapId)) {
    return scheduledEntry.mapId;
  }

  if (DAILY_MAP_IDS.length === 0) return getDefaultMapId();
  const dayNumber = getDayNumberFromUtcDate(date);
  const index = ((dayNumber % DAILY_MAP_IDS.length) + DAILY_MAP_IDS.length) % DAILY_MAP_IDS.length;
  return DAILY_MAP_IDS[index];
}

function chooseWeightedFirstClickSafeNeighborTarget(maxNeighborCount) {
  const candidates = FIRST_CLICK_SAFE_NEIGHBOR_DISTRIBUTION.filter(
    (entry) => entry.safeNeighbors <= maxNeighborCount && entry.weight > 0
  );
  if (candidates.length === 0) return Math.max(0, maxNeighborCount);

  const totalWeight = candidates.reduce((total, entry) => total + entry.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const entry of candidates) {
    roll -= entry.weight;
    if (roll <= 0) return entry.safeNeighbors;
  }
  return candidates[candidates.length - 1].safeNeighbors;
}

function extractWordMineLetterData(secretWord) {
  const wordLetters = getPlayableWordLetters(secretWord)
    .split("");
  return {
    wordLetters,
    mineLetterSet: new Set(wordLetters),
  };
}

function countFirstClickSafeNeighborsForWord(secretWord, firstRevealIndex) {
  if (firstRevealIndex < 0) return 0;
  const neighborIndexes = neighbors(firstRevealIndex);
  const { mineLetterSet } = extractWordMineLetterData(secretWord);
  return neighborIndexes.reduce((total, neighborIndex) => {
    const neighborTile = tiles[neighborIndex];
    return total + (mineLetterSet.has(neighborTile.letter) ? 0 : 1);
  }, 0);
}

function assignPrestartLetters(mode) {
  if (mode === GAME_MODE_DAILY) {
    clearBoardLetters();
    return;
  }
  shuffleBoardLetters();
}

function assignDailyLettersAfterFirstClick(firstRevealIndex, secretWord) {
  if (firstRevealIndex < 0 || firstRevealIndex >= tiles.length) return false;
  const { mineLetterSet } = extractWordMineLetterData(secretWord);
  const safeLetters = LETTER_GRID.filter((letter) => !mineLetterSet.has(letter));
  if (safeLetters.length === 0) return false;

  const firstClickedLetter = safeLetters[Math.floor(Math.random() * safeLetters.length)];
  const shuffledRemainingLetters = shuffle(LETTER_GRID.filter((letter) => letter !== firstClickedLetter));
  const fallbackPool = shuffledRemainingLetters.length > 0 ? shuffledRemainingLetters : LETTER_GRID;
  let remainingCursor = 0;

  tiles.forEach((tile, index) => {
    if (index === firstRevealIndex) {
      tile.letter = firstClickedLetter;
      tile.letterElement.textContent = firstClickedLetter;
      return;
    }
    const letter =
      shuffledRemainingLetters[remainingCursor] ||
      fallbackPool[remainingCursor % fallbackPool.length] ||
      firstClickedLetter;
    tile.letter = letter;
    tile.letterElement.textContent = letter;
    remainingCursor += 1;
  });

  return true;
}

function captureTileSnapshot(tile) {
  return {
    letter: tile.letter,
    revealed: Boolean(tile.revealed),
    flagCount: Number(tile.flagCount) || 0,
    mineCount: Number(tile.mineCount) || 0,
    isMine: Boolean(tile.isMine),
    adjacentMines: Number(tile.adjacentMines) || 0,
    mineHit: tile.element.classList.contains("mine-hit"),
  };
}

function captureDailySnapshot() {
  if (!game || game.mode !== GAME_MODE_DAILY) return null;
  return {
    mapId: game.mapId,
    secretWord: game.secretWord,
    secretCategory: game.secretCategory,
    totalMines: game.totalMines,
    currentGuess: game.currentGuess,
    guessSlots: Array.isArray(game.guessSlots) ? [...game.guessSlots] : [],
    hintedIndexes: game.hintedIndexes instanceof Set ? [...game.hintedIndexes] : [],
    hintedLetters: game.hintedLetters instanceof Set ? [...game.hintedLetters] : [],
    hintedLetterOrder: Array.isArray(game.hintedLetterOrder) ? [...game.hintedLetterOrder] : [],
    hintsUsed: Number(game.hintsUsed) || 0,
    letterBankShuffleOrder: Array.isArray(game.letterBankShuffleOrder)
      ? [...game.letterBankShuffleOrder]
      : [],
    firstRevealIndex: Number.isInteger(game.firstRevealIndex) ? game.firstRevealIndex : -1,
    over: Boolean(game.over),
    won: Boolean(game.won),
    outcome: game.outcome ? { ...game.outcome } : null,
    tiles: tiles.map(captureTileSnapshot),
  };
}

function persistDailyRecord(completedOverride = null) {
  if (!game || game.mode !== GAME_MODE_DAILY) return;
  const snapshot = captureDailySnapshot();
  if (!snapshot) return;
  const completed =
    typeof completedOverride === "boolean"
      ? completedOverride
      : Boolean(game.over && (game.outcome?.result === "won" || game.outcome?.result === "lost"));
  writeDailyRecordToStorage({
    dateKey: game.dailyDateKey || getLocalDateKey(),
    completed,
    snapshot,
  });
  updateModeButtons();
}

function clearDailyPersistTimer() {
  if (!dailyPersistTimer) return;
  clearTimeout(dailyPersistTimer);
  dailyPersistTimer = null;
}

function scheduleDailyRecordPersist() {
  if (!game || game.mode !== GAME_MODE_DAILY) return;
  clearDailyPersistTimer();
  dailyPersistTimer = setTimeout(() => {
    dailyPersistTimer = null;
    persistDailyRecord(false);
  }, DAILY_PERSIST_DEBOUNCE_MS);
}

function flushDailyRecordPersist(completedOverride = null) {
  if (!game || game.mode !== GAME_MODE_DAILY) return;
  clearDailyPersistTimer();
  persistDailyRecord(completedOverride);
}

function applyTileSnapshot(tile, snapshot) {
  tile.letter = String(snapshot.letter || "");
  tile.letterElement.textContent = tile.letter;
  tile.revealed = Boolean(snapshot.revealed);
  tile.flagCount = Number(snapshot.flagCount) || 0;
  tile.mineCount = Number(snapshot.mineCount) || 0;
  tile.isMine = Boolean(snapshot.isMine);
  tile.adjacentMines = Number(snapshot.adjacentMines) || 0;

  tile.element.className = "tile";
  tile.valueElement.textContent = "";
  if (tile.revealed) {
    tile.element.classList.add("revealed");
    tile.valueElement.textContent = tile.isMine
      ? "*"
      : tile.adjacentMines > 0
        ? String(tile.adjacentMines)
        : "";
  } else if (tile.flagCount > 0) {
    tile.element.classList.add("flagged");
    tile.valueElement.textContent = "⚑";
  }

  if (snapshot.mineHit) {
    tile.element.classList.add("mine-hit");
  }
}

function restoreDailyGameFromSnapshot(snapshot) {
  if (!snapshot || !Array.isArray(snapshot.tiles) || snapshot.tiles.length !== tiles.length) {
    return false;
  }

  game.secretWord = snapshot.secretWord || null;
  game.secretCategory = snapshot.secretCategory || null;
  game.totalMines = Number(snapshot.totalMines) || 0;
  game.currentGuess = String(snapshot.currentGuess || "");
  game.guessSlots = Array.isArray(snapshot.guessSlots) ? [...snapshot.guessSlots] : [];
  game.hintedIndexes = new Set(Array.isArray(snapshot.hintedIndexes) ? snapshot.hintedIndexes : []);
  game.hintedLetters = new Set(Array.isArray(snapshot.hintedLetters) ? snapshot.hintedLetters : []);
  game.hintedLetterOrder = Array.isArray(snapshot.hintedLetterOrder)
    ? [...snapshot.hintedLetterOrder]
    : [...game.hintedLetters];
  game.hintsUsed = Number(snapshot.hintsUsed) || 0;
  game.letterBankShuffleOrder = Array.isArray(snapshot.letterBankShuffleOrder)
    ? [...snapshot.letterBankShuffleOrder]
    : [];
  game.firstRevealIndex = Number.isInteger(snapshot.firstRevealIndex) ? snapshot.firstRevealIndex : -1;
  game.over = Boolean(snapshot.over);
  game.won = Boolean(snapshot.won);
  game.outcome = snapshot.outcome && typeof snapshot.outcome === "object" ? { ...snapshot.outcome } : null;

  tiles.forEach((tile, index) => {
    applyTileSnapshot(tile, snapshot.tiles[index] || {});
  });
  game.mineCounts = new Set(tiles.filter((tile) => tile.isMine).map((tile) => tile.letter));

  boardEl.classList.remove("bee-awake", "bee-dead", "bee-won");
  if (game.outcome?.result === "lost") {
    boardEl.classList.add("bee-dead");
  } else if (game.outcome?.result === "won") {
    boardEl.classList.add("bee-won");
  }

  setMineCountDisplay(game.secretWord ? game.totalMines : "?");
  renderEntryMode();
  renderCategoryLabel();
  if (game.secretWord) {
    if (game.over && (game.outcome?.result === "won" || game.outcome?.result === "lost")) {
      renderWordSlots(game.secretWord, game.secretWord, game.outcome.result);
    } else {
      renderWordSlots(game.secretWord, game.guessSlots);
    }
  } else {
    wordSlotsEl.innerHTML = "";
  }

  if (game.over && game.outcome) {
    if (game.outcome.useCategoryLabel && flaggedLettersEl) {
      renderFlaggedLetters();
      resultMessageEl.textContent = "";
      resultMessageEl.classList.add("hidden");
    } else {
      resultMessageEl.textContent = game.outcome.message || "";
      resultMessageEl.classList.remove("hidden");
    }
  } else {
    resultMessageEl.textContent = "";
    resultMessageEl.classList.add("hidden");
  }

  statsStackEl.classList.remove("hidden");
  updateStats();
  updateSubmitGuessVisibility();
  updateHintButtonState();
  updateModeButtons();
  return true;
}

function assignMinesForSecretWord(secretWord) {
  const uniqueMineLetters = new Set(
    getPlayableWordLetters(secretWord)
      .split("")
  );

  tiles.forEach((tile) => {
    tile.mineCount = uniqueMineLetters.has(tile.letter) ? 1 : 0;
    tile.isMine = tile.mineCount > 0;
  });

  tiles.forEach((tile) => {
    tile.adjacentMines = neighbors(tile.index).reduce(
      (total, neighborIndex) => total + tiles[neighborIndex].mineCount,
      0
    );
  });
  return uniqueMineLetters;
}

function renderWordSlots(secretWord, guessValue = "", revealState = null) {
  wordSlotsEl.innerHTML = "";
  const guessLetters = Array.isArray(guessValue)
    ? guessValue
    : String(guessValue || "")
        .toUpperCase()
        .split("");
  const displayCharacters = String(secretWord || "").toUpperCase().split("");
  const hintedIndexes = game?.hintedIndexes instanceof Set ? game.hintedIndexes : new Set();
  let playableIndex = 0;

  displayCharacters.forEach((character) => {
    const slotEl = document.createElement("span");
    slotEl.className = "word-slot";
    if (isVisibleWordSeparator(character)) {
      slotEl.classList.add("word-slot-separator");
      slotEl.textContent = character === " " ? "\u00A0" : character;
    } else {
      slotEl.textContent = revealState ? character : guessLetters[playableIndex] || "_";
      if (revealState) {
        slotEl.classList.add(`word-slot-${revealState}`);
      } else if (hintedIndexes.has(playableIndex)) {
        slotEl.classList.add("word-slot-hint");
      }
      playableIndex += 1;
    }
    wordSlotsEl.appendChild(slotEl);
  });
}

function syncGuessValue(nextGuessSlots, persistStrategy = "debounced") {
  if (!game || !game.secretWord) return;
  const maxGuessLength = getPlayableWordLength(game.secretWord);
  if (!Array.isArray(game.guessSlots) || game.guessSlots.length !== maxGuessLength) {
    game.guessSlots = Array.from({ length: maxGuessLength }, () => "");
  }
  if (Array.isArray(nextGuessSlots) && nextGuessSlots.length === maxGuessLength) {
    game.guessSlots = nextGuessSlots.map((entry) => {
      const cleaned = String(entry || "").toUpperCase().replace(/[^A-Z]/g, "");
      return cleaned.slice(0, 1);
    });
  }
  game.currentGuess = game.guessSlots.join("");
  renderWordSlots(game.secretWord, game.guessSlots);
  renderFlaggedLetters();
  updateSubmitGuessVisibility();
  updateHintButtonState();
  if (game?.mode === GAME_MODE_DAILY) {
    if (persistStrategy === "immediate") {
      flushDailyRecordPersist(false);
    } else if (persistStrategy === "debounced") {
      scheduleDailyRecordPersist();
    }
  }
}

function appendGuessLetters(rawLetters) {
  if (!game || game.over || !game.secretWord) return;
  const incomingLetters = String(rawLetters || "")
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .split("");
  if (incomingLetters.length === 0) return;
  const nextGuessSlots = [...game.guessSlots];
  const hintedIndexes = game.hintedIndexes instanceof Set ? game.hintedIndexes : new Set();

  incomingLetters.forEach((letter) => {
    const targetIndex = nextGuessSlots.findIndex(
      (slotLetter, index) => !hintedIndexes.has(index) && !slotLetter
    );
    if (targetIndex >= 0) {
      nextGuessSlots[targetIndex] = letter;
    }
  });

  syncGuessValue(nextGuessSlots, "debounced");
}

function removeLastTypedGuessLetter() {
  if (!game || game.over || !game.secretWord) return;
  const nextGuessSlots = [...game.guessSlots];
  const hintedIndexes = game.hintedIndexes instanceof Set ? game.hintedIndexes : new Set();

  for (let index = nextGuessSlots.length - 1; index >= 0; index -= 1) {
    if (hintedIndexes.has(index)) continue;
    if (!nextGuessSlots[index]) continue;
    nextGuessSlots[index] = "";
    break;
  }

  syncGuessValue(nextGuessSlots, "debounced");
}

function revealRandomHintLetter() {
  if (!game || game.over || !game.secretWord) return;
  const playableLetters = getPlayableWordLetters(game.secretWord).split("");
  if (playableLetters.length === 0) return;

  const chosenIndex = playableLetters.findIndex((_, index) => !game.hintedIndexes.has(index));
  if (chosenIndex < 0) return;

  const chosenLetter = playableLetters[chosenIndex];
  const nextGuessSlots = [...game.guessSlots];
  game.hintsUsed += 1;
  if (!game.hintedLetters.has(chosenLetter)) {
    if (!Array.isArray(game.hintedLetterOrder)) {
      game.hintedLetterOrder = [];
    }
    game.hintedLetterOrder.push(chosenLetter);
  }

  playableLetters.forEach((letter, index) => {
    if (letter !== chosenLetter) return;
    game.hintedIndexes.add(index);
    game.hintedLetters.add(letter);
    nextGuessSlots[index] = letter;
  });

  syncGuessValue(nextGuessSlots, "immediate");
  if (game.currentGuess === getPlayableWordLetters(game.secretWord)) {
    game.won = true;
    setGameOver(getWinMessage(), "won", true);
  }
}

function getWinMessage() {
  const hintCount = Number.isFinite(game?.hintsUsed) ? game.hintsUsed : 0;
  const hintLabel = hintCount === 1 ? "hint" : "hints";
  const replaySuffix = game?.mode === GAME_MODE_DAILY ? "" : " Play again? (Enter/Click)";
  return `You won with ${hintCount} ${hintLabel}!${replaySuffix}`;
}

function updateHintButtonState() {
  if (!hintLetterBtn) return;
  hintLetterBtn.classList.remove("hint-letter-inactive", "hint-letter-hidden");
  hintLetterBtn.setAttribute("aria-disabled", "false");
  const hasGame = Boolean(game && game.secretWord);
  if (!hasGame) {
    hintLetterBtn.disabled = true;
    return;
  }
  if (game.over) {
    hintLetterBtn.disabled = false;
    hintLetterBtn.classList.add("hint-letter-hidden");
    hintLetterBtn.setAttribute("aria-disabled", "true");
    return;
  }
  const targetLength = getPlayableWordLength(game.secretWord);
  const hintedCount = game.hintedIndexes instanceof Set ? game.hintedIndexes.size : 0;
  hintLetterBtn.disabled = hintedCount >= targetLength;
}

function getHintedLetterOrder() {
  if (!game) return [];
  const hintedLetters = game.hintedLetters instanceof Set ? game.hintedLetters : new Set();
  if (hintedLetters.size === 0) return [];
  const rawOrder = Array.isArray(game.hintedLetterOrder) ? game.hintedLetterOrder : [];
  const seen = new Set();
  const ordered = [];
  rawOrder.forEach((letter) => {
    if (!hintedLetters.has(letter) || seen.has(letter)) return;
    seen.add(letter);
    ordered.push(letter);
  });
  hintedLetters.forEach((letter) => {
    if (seen.has(letter)) return;
    seen.add(letter);
    ordered.push(letter);
  });
  return ordered;
}

function getLetterBankState() {
  const hintedOrder = getHintedLetterOrder();
  const hintedSet = new Set(hintedOrder);
  const nonHintFlaggedSet = new Set();
  tiles.forEach((tile) => {
    if (tile.flagCount <= 0 || hintedSet.has(tile.letter)) return;
    nonHintFlaggedSet.add(tile.letter);
  });
  const nonHintFlaggedLetters = [...nonHintFlaggedSet].sort();
  return {
    letters: [...hintedOrder, ...nonHintFlaggedLetters],
    hintedOrder,
    hintedSet,
  };
}

function mergeStoredShuffleWithAvailableLetters(storedShuffle, availableLetters) {
  const remainingCounts = new Map();
  availableLetters.forEach((item) => {
    remainingCounts.set(item, (remainingCounts.get(item) || 0) + 1);
  });
  const merged = [];

  storedShuffle.forEach((item) => {
    const remaining = remainingCounts.get(item) || 0;
    if (remaining <= 0) return;
    merged.push(item);
    remainingCounts.set(item, remaining - 1);
  });
  availableLetters.forEach((item) => {
    const remaining = remainingCounts.get(item) || 0;
    if (remaining <= 0) return;
    merged.push(item);
    remainingCounts.set(item, remaining - 1);
  });

  return merged;
}

function prioritizeNewLettersOverPlaceholders(orderedItems, previousItems) {
  if (!Array.isArray(orderedItems) || orderedItems.length === 0) return [];
  if (!Array.isArray(previousItems) || previousItems.length === 0) return [...orderedItems];

  const previousCounts = new Map();
  previousItems.forEach((item) => {
    if (item === "?") return;
    previousCounts.set(item, (previousCounts.get(item) || 0) + 1);
  });

  const nextCounts = new Map();
  orderedItems.forEach((item) => {
    if (item === "?") return;
    nextCounts.set(item, (nextCounts.get(item) || 0) + 1);
  });

  const remainingAddedCounts = new Map();
  nextCounts.forEach((count, item) => {
    const previousCount = previousCounts.get(item) || 0;
    if (count > previousCount) {
      remainingAddedCounts.set(item, count - previousCount);
    }
  });

  const addedItemsInOrder = [];
  orderedItems.forEach((item) => {
    if (item === "?") return;
    const remaining = remainingAddedCounts.get(item) || 0;
    if (remaining <= 0) return;
    addedItemsInOrder.push(item);
    remainingAddedCounts.set(item, remaining - 1);
  });

  if (addedItemsInOrder.length === 0) return [...orderedItems];

  const prioritized = [...orderedItems];
  addedItemsInOrder.forEach((item) => {
    const placeholderIndex = prioritized.indexOf("?");
    if (placeholderIndex < 0) return;
    const itemIndex = prioritized.lastIndexOf(item);
    if (itemIndex <= placeholderIndex) return;
    [prioritized[placeholderIndex], prioritized[itemIndex]] = [
      prioritized[itemIndex],
      prioritized[placeholderIndex],
    ];
  });

  return prioritized;
}

function setMineCountDisplay(value) {
  if (!mineCountValueEl) return;
  mineCountValueEl.textContent = String(value);
}

function setFlagCountDisplay(value) {
  if (!flagCountValueEl) return;
  flagCountValueEl.textContent = String(value);
}

function shuffleLetterBank() {
  if (!game || game.over || !game.secretWord) return;

  const { letters, hintedOrder } = getLetterBankState();
  const placeholderCount = Math.max(0, Number(game.totalMines || 0) - letters.length);
  const nonHintLetters = letters.slice(hintedOrder.length);
  const shufflePool = [...nonHintLetters, ...Array.from({ length: placeholderCount }, () => "?")];
  if (shufflePool.length < 2) return;
  game.letterBankShuffleOrder = [...hintedOrder, ...shuffle(shufflePool)];
  renderFlaggedLetters();
}

function renderFlaggedLetters() {
  if (!flaggedLettersEl) return;
  flaggedLettersEl.innerHTML = "";
  flaggedLettersEl.classList.remove(
    "flagged-letters-outcome",
    "flagged-letters-outcome-won",
    "flagged-letters-outcome-lost"
  );

  if (game?.over && game?.outcome?.useCategoryLabel) {
    if (game.outcome?.result === "won") {
      flaggedLettersEl.classList.add("flagged-letters-outcome-won");
    } else if (game.outcome?.result === "lost") {
      flaggedLettersEl.classList.add("flagged-letters-outcome-lost");
    }
    flaggedLettersEl.classList.add("flagged-letters-outcome");
    flaggedLettersEl.textContent = game.outcome.message || "";
    return;
  }

  const { letters: letterBankLetters, hintedOrder, hintedSet } = getLetterBankState();
  const mineSlotCount = Number.isFinite(game?.totalMines) ? Math.max(0, Number(game.totalMines)) : 0;
  const placeholderCount = Math.max(0, mineSlotCount - letterBankLetters.length);
  const letterBankItems = [
    ...letterBankLetters,
    ...Array.from({ length: placeholderCount }, () => "?"),
  ];

  const storedShuffle = Array.isArray(game?.letterBankShuffleOrder)
    ? game.letterBankShuffleOrder
    : [];
  const mergedLetters = storedShuffle.length > 0
    ? mergeStoredShuffleWithAvailableLetters(storedShuffle, letterBankItems)
    : letterBankItems;
  const candidateLetters = prioritizeNewLettersOverPlaceholders(mergedLetters, storedShuffle);
  const lettersToRender = [...hintedOrder];
  candidateLetters.forEach((letter) => {
    if (hintedSet.has(letter)) return;
    lettersToRender.push(letter);
  });

  if (game) {
    game.letterBankShuffleOrder = [...lettersToRender];
  }

  const typedLetters = new Set(String(game?.currentGuess || "").split(""));
  const hintedLetters = game?.hintedLetters instanceof Set ? game.hintedLetters : new Set();
  lettersToRender.forEach((letter) => {
    const letterEl = document.createElement("span");
    if (letter === "?") {
      letterEl.className = "flagged-letter flagged-letter-placeholder";
    } else {
      letterEl.className = "flagged-letter";
      if (hintedLetters.has(letter)) {
        letterEl.classList.add("flagged-letter-hint");
      }
      if (typedLetters.has(letter)) {
        letterEl.classList.add("flagged-letter-used");
      }
    }
    letterEl.textContent = letter;
    flaggedLettersEl.appendChild(letterEl);
  });
}

function renderCategoryLabel() {
  if (!categoryLabelEl) return;
  const categoryText = game && game.secretCategory ? game.secretCategory : "";
  categoryLabelEl.textContent = categoryText || "?";
}

function updateSubmitGuessVisibility() {
  if (!submitGuessBtn) return;
  const targetLength = game?.secretWord ? getPlayableWordLength(game.secretWord) : 0;
  const shouldShow = Boolean(
    game && !game.over && game.secretWord && targetLength > 0 && game.currentGuess.length >= targetLength
  );
  submitGuessBtn.classList.toggle("submit-guess-visible", shouldShow);
}

function syncModeButtonWidths() {
  if (!newGameBtn || !dailyBeeBtn) return;
  newGameBtn.style.width = "";
  dailyBeeBtn.style.width = "";
  const maxWidth = Math.max(newGameBtn.offsetWidth, dailyBeeBtn.offsetWidth);
  if (maxWidth <= 0) return;
  const syncedWidth = `${Math.ceil(maxWidth)}px`;
  newGameBtn.style.width = syncedWidth;
  dailyBeeBtn.style.width = syncedWidth;
}

function setDailyBeeButtonLabel(statusSymbol = "", dateLabel = "") {
  if (!dailyBeeBtn) return;
  dailyBeeBtn.textContent = "";
  if (statusSymbol) {
    dailyBeeBtn.append(document.createTextNode(`${statusSymbol} `));
  }
  const dailyBeeTextEl = document.createElement("strong");
  dailyBeeTextEl.textContent = "Daily Bee";
  dailyBeeBtn.append(dailyBeeTextEl);
  if (dateLabel) {
    dailyBeeBtn.append(document.createTextNode(` ${dateLabel}`));
  }
}

function updateModeButtons() {
  if (!newGameBtn || !dailyBeeBtn || !endlessNewGameBtn) return;
  const isDailyMode = game?.mode === GAME_MODE_DAILY;
  const todayRecord = getTodayDailyRecord();
  const completedDailyBee = Boolean(todayRecord && todayRecord.completed);
  const dailyOutcome = todayRecord?.snapshot?.outcome?.result;
  const dailyStatusSymbol = completedDailyBee ? (dailyOutcome === "lost" ? "✖" : "✓") : "";
  setDailyBeeButtonLabel(dailyStatusSymbol, formatLocalDateLabel());
  newGameBtn.textContent = "Endless Mode";
  newGameBtn.classList.toggle("mode-button-active", !isDailyMode);
  newGameBtn.setAttribute("aria-selected", String(!isDailyMode));
  newGameBtn.tabIndex = !isDailyMode ? 0 : -1;
  dailyBeeBtn.classList.toggle("mode-button-active", isDailyMode);
  dailyBeeBtn.setAttribute("aria-selected", String(isDailyMode));
  dailyBeeBtn.tabIndex = isDailyMode ? 0 : -1;
  endlessNewGameBtn.classList.toggle("hidden", isDailyMode);
  legendShiftNNewGameEl?.classList.toggle("hidden", isDailyMode);
  syncModeButtonWidths();
}

function renderEntryMode() {
  if (!prestartPromptEl || !guessStackEl) return;
  const hasStarted = Boolean(game && game.secretWord);
  const promptText =
    game?.mode === GAME_MODE_DAILY
      ? "CLICK ANY TILE TO BEGIN"
      : "CLICK ANY TILE TO BEGIN";
  if (prestartPromptMainEl) {
    prestartPromptMainEl.textContent = promptText;
  } else {
    prestartPromptEl.textContent = promptText;
  }
  prestartPromptEl.classList.toggle("entry-pane-hidden", hasStarted);
  prestartPromptEl.setAttribute("aria-hidden", String(hasStarted));
  guessStackEl.classList.toggle("entry-pane-hidden", !hasStarted);
  guessStackEl.setAttribute("aria-hidden", String(!hasStarted));
  updateSubmitGuessVisibility();
  updateHintButtonState();
}

function chooseSecretWord(excludedLetter, firstRevealIndex = -1, desiredSafeNeighborCount = null) {
  const safeEntries = ELIGIBLE_LEVELS.filter(
    (entry) => !entry.word.includes(excludedLetter)
  );
  if (safeEntries.length === 0) return null;
  if (firstRevealIndex < 0 || typeof desiredSafeNeighborCount !== "number") {
    return safeEntries[Math.floor(Math.random() * safeEntries.length)];
  }

  const scoredEntries = safeEntries.map((entry) => ({
    entry,
    safeNeighborCount: countFirstClickSafeNeighborsForWord(entry.word, firstRevealIndex),
  }));
  const exactMatches = scoredEntries.filter(
    (candidate) => candidate.safeNeighborCount === desiredSafeNeighborCount
  );
  if (exactMatches.length > 0) {
    return exactMatches[Math.floor(Math.random() * exactMatches.length)].entry;
  }
  // If the weighted target is impossible for the current letter layout, ignore it.
  return safeEntries[Math.floor(Math.random() * safeEntries.length)];
}

function initializeWordAfterFirstClick(firstRevealIndex) {
  let secretEntry = null;
  if (game.mode === GAME_MODE_DAILY) {
    secretEntry = chooseDailySecretEntry();
    if (!secretEntry) {
      setGameOver("No eligible daily word found. Start a new game.");
      return false;
    }
    const assigned = assignDailyLettersAfterFirstClick(firstRevealIndex, secretEntry.word);
    if (!assigned) {
      setGameOver("No safe first-click letter available for today's Daily Bee. Start a new game.");
      return false;
    }
  } else {
    const firstClickedLetter = tiles[firstRevealIndex]?.letter || "";
    const firstClickNeighborCount = neighbors(firstRevealIndex).length;
    const desiredSafeNeighborCount = chooseWeightedFirstClickSafeNeighborTarget(firstClickNeighborCount);
    secretEntry = chooseSecretWord(firstClickedLetter, firstRevealIndex, desiredSafeNeighborCount);
    if (!secretEntry) {
      setGameOver(`No valid word excludes "${firstClickedLetter}". Start a new game.`);
      return false;
    }
  }

  game.secretWord = secretEntry.word;
  game.secretCategory = secretEntry.category;
  game.mineCounts = assignMinesForSecretWord(secretEntry.word);
  game.totalMines = game.mineCounts.size;
  game.guessSlots = Array.from({ length: getPlayableWordLength(secretEntry.word) }, () => "");
  game.hintedIndexes = new Set();
  game.hintedLetters = new Set();
  game.hintedLetterOrder = [];
  game.currentGuess = "";

  setMineCountDisplay(game.totalMines);
  renderEntryMode();
  renderCategoryLabel();
  renderWordSlots(secretEntry.word, game.guessSlots);
  wordSlotsEl.focus();
  if (game.mode === GAME_MODE_DAILY) {
    flushDailyRecordPersist(false);
  }
  return true;
}

function startGame(requestedMode = null, options = {}) {
  clearDailyPersistTimer();
  ignoreNextReplayClick = false;
  const mode =
    requestedMode === GAME_MODE_DAILY || requestedMode === GAME_MODE_NORMAL
      ? requestedMode
      : game?.mode === GAME_MODE_DAILY
        ? GAME_MODE_DAILY
        : GAME_MODE_NORMAL;
  const forcedMapId = options && typeof options.forcedMapId === "string" ? options.forcedMapId : null;
  const resolvedMapId = forcedMapId || chooseResolvedMapId();
  if (getSelectedMapIdForPage() === SHUFFLE_MAP_ID) {
    if (selectedPage === PAGE_BONUS) {
      lastShuffledBonusMapId = resolvedMapId;
    } else {
      lastShuffledStandardMapId = resolvedMapId;
    }
  }
  game = {
    mode,
    dailyDateKey: mode === GAME_MODE_DAILY ? getLocalDateKey() : null,
    mapId: resolvedMapId,
    secretWord: null,
    secretCategory: null,
    mineCounts: new Set(),
    totalMines: 0,
    currentGuess: "",
    guessSlots: [],
    hintedIndexes: new Set(),
    hintedLetters: new Set(),
    hintedLetterOrder: [],
    hintsUsed: 0,
    letterBankShuffleOrder: [],
    firstRevealIndex: -1,
    over: false,
    won: false,
    outcome: null,
  };
  initBoard(resolvedMapId);
  boardEl.classList.remove("bee-awake", "bee-dead", "bee-won");
  if (beeEyesTimer) {
    clearTimeout(beeEyesTimer);
    beeEyesTimer = null;
  }
  assignPrestartLetters(mode);

  tiles.forEach((tile) => {
    tile.revealed = false;
    tile.flagCount = 0;
    tile.mineCount = 0;
    tile.isMine = false;
    tile.adjacentMines = 0;
    tile.element.className = "tile";
    tile.valueElement.textContent = "";
  });

  wordSlotsEl.innerHTML = "";
  renderEntryMode();
  renderFlaggedLetters();
  renderCategoryLabel();
  setMineCountDisplay("?");
  resultMessageEl.textContent = "";
  resultMessageEl.classList.add("hidden");
  statsStackEl.classList.remove("hidden");
  updateStats();
  updateHintButtonState();
  updateModeButtons();
  if (mode === GAME_MODE_DAILY && !options.skipDailyPersist) {
    flushDailyRecordPersist(false);
  }
}

function updateStats() {
  const flags = tiles.reduce((total, tile) => total + tile.flagCount, 0);
  setFlagCountDisplay(flags);
  renderFlaggedLetters();
}

function revealAllMines() {
  tiles.forEach((tile) => {
    if (tile.isMine) {
      tile.element.classList.add("revealed");
      tile.valueElement.textContent = "*";
    }
  });
}

function setGameOver(message, result = null, useCategoryLabel = false) {
  game.over = true;
  game.outcome = { message, result, useCategoryLabel };
  if (result === "won" || result === "lost") {
    trackCompletedGameStats(result);
  }
  if (result === "won" || result === "lost") {
    ignoreNextReplayClick = true;
  }
  if (result === "lost") {
    boardEl.classList.add("bee-dead");
    boardEl.classList.remove("bee-won");
    boardEl.classList.remove("bee-awake");
  } else if (result === "won") {
    boardEl.classList.add("bee-won");
    boardEl.classList.remove("bee-dead");
    boardEl.classList.remove("bee-awake");
  }
  if (useCategoryLabel && flaggedLettersEl) {
    renderFlaggedLetters();
    resultMessageEl.textContent = "";
    resultMessageEl.classList.add("hidden");
  } else {
    resultMessageEl.textContent = message;
    resultMessageEl.classList.remove("hidden");
  }
  if (result === "won" || result === "lost") {
    statsStackEl.classList.remove("hidden");
  } else {
    statsStackEl.classList.add("hidden");
  }
  if (game.secretWord && result) {
    renderWordSlots(game.secretWord, game.secretWord, result);
  }
  if (submitGuessBtn) {
    submitGuessBtn.classList.remove("submit-guess-visible");
  }
  updateHintButtonState();
  revealAllMines();
  if (game.mode === GAME_MODE_DAILY) {
    const isFinished = result === "won" || result === "lost";
    if (isFinished) {
      flushDailyRecordPersist(true);
    } else {
      flushDailyRecordPersist(false);
    }
  }
}

function revealSafeArea(startIndex) {
  const queue = [startIndex];
  const visited = new Set();

  while (queue.length > 0) {
    const index = queue.shift();
    if (visited.has(index)) continue;
    visited.add(index);

    const tile = tiles[index];
    if (tile.flagCount > 0 || tile.isMine) continue;
    if (tile.revealed) {
      if (tile.adjacentMines === 0) {
        neighbors(index).forEach((neighborIndex) => queue.push(neighborIndex));
      }
      continue;
    }

    tile.revealed = true;
    tile.element.classList.add("revealed");
    tile.valueElement.textContent = tile.adjacentMines > 0 ? String(tile.adjacentMines) : "";

    if (tile.adjacentMines === 0) {
      neighbors(index).forEach((neighborIndex) => queue.push(neighborIndex));
    }
  }
}

function onReveal(index) {
  if (!game || game.over) return;

  const tile = tiles[index];
  if (!tile || tile.revealed || tile.flagCount > 0) return;

  if (!game.secretWord) {
    game.firstRevealIndex = index;
    const initialized = initializeWordAfterFirstClick(index);
    if (!initialized) return;
  }

  if (tile.isMine) {
    tile.revealed = true;
    tile.element.classList.add("revealed");
    tile.element.classList.add("mine-hit");
    tile.valueElement.textContent = "*";
    setGameOver(
      game?.mode === GAME_MODE_DAILY ? "Boom!" : "Boom! Play again? (Enter/Click)",
      "lost",
      true
    );
    return;
  }

  if (tile.adjacentMines === 0) {
    revealSafeArea(index);
  } else {
    tile.revealed = true;
    tile.element.classList.add("revealed");
    tile.valueElement.textContent = String(tile.adjacentMines);

    const adjacentBlankIndexes = neighbors(index).filter((neighborIndex) => {
      const neighborTile = tiles[neighborIndex];
      return !neighborTile.isMine && neighborTile.adjacentMines === 0;
    });

    adjacentBlankIndexes.forEach((blankIndex) => revealSafeArea(blankIndex));
  }

  updateStats();
  if (game.mode === GAME_MODE_DAILY) {
    flushDailyRecordPersist(false);
  }
}

function onToggleFlag(index) {
  if (!game || game.over) return;
  if (!game.secretWord) return;

  const tile = tiles[index];
  if (!tile || tile.revealed) return;
  tile.flagCount = tile.flagCount > 0 ? 0 : 1;
  tile.element.classList.toggle("flagged", tile.flagCount > 0);
  tile.valueElement.textContent = tile.flagCount > 0 ? "⚑" : "";

  updateStats();
  if (game.mode === GAME_MODE_DAILY) {
    flushDailyRecordPersist(false);
  }
}

function startNormalGame() {
  startGame(GAME_MODE_NORMAL);
}

function startDailyGame() {
  const record = getTodayDailyRecord();
  const snapshot = record?.snapshot;
  if (snapshot && snapshot.mapId) {
    startGame(GAME_MODE_DAILY, { forcedMapId: snapshot.mapId, skipDailyPersist: true });
    const restored = restoreDailyGameFromSnapshot(snapshot);
    if (restored) {
      return;
    }
  }
  startGame(GAME_MODE_DAILY, { forcedMapId: chooseDailyMapId() });
}

function switchToEndlessMode() {
  if (game?.mode === GAME_MODE_NORMAL) return;
  startNormalGame();
}

function startEndlessNewGame() {
  if (game?.mode !== GAME_MODE_NORMAL) return;
  startNormalGame();
}

function activateModeTab(mode) {
  if (mode === GAME_MODE_DAILY) {
    startDailyGame();
    dailyBeeBtn?.focus();
    return;
  }
  switchToEndlessMode();
  newGameBtn?.focus();
}

function onModeTabKeyDown(event) {
  const key = event.key;
  if (
    key !== "ArrowLeft" &&
    key !== "ArrowRight" &&
    key !== "Home" &&
    key !== "End"
  ) {
    return;
  }
  event.preventDefault();

  const isOnDaily = event.currentTarget === dailyBeeBtn;
  if (key === "Home") {
    activateModeTab(GAME_MODE_DAILY);
    return;
  }
  if (key === "End") {
    activateModeTab(GAME_MODE_NORMAL);
    return;
  }
  if (key === "ArrowRight") {
    activateModeTab(isOnDaily ? GAME_MODE_NORMAL : GAME_MODE_DAILY);
    return;
  }
  if (key === "ArrowLeft") {
    activateModeTab(isOnDaily ? GAME_MODE_NORMAL : GAME_MODE_DAILY);
  }
}

function selectMap(mapId) {
  const activeMapIds = getActiveMapDefinitions().map((entry) => entry.id);
  if (mapId === SHUFFLE_MAP_ID) {
    setSelectedMapIdForPage(SHUFFLE_MAP_ID);
  } else if (activeMapIds.includes(mapId)) {
    setSelectedMapIdForPage(mapId);
  } else {
    return;
  }
  closeHex();
  startGame(GAME_MODE_NORMAL);
}

function onMapOptionClick(event) {
  const mapId = event.currentTarget?.dataset?.mapId;
  if (!mapId) return;
  selectMap(mapId);
}

function updatePageTabsUI() {
  if (pageStandardBtn) {
    const isActive = selectedPage === PAGE_STANDARD;
    pageStandardBtn.classList.toggle("popup-tab-active", isActive);
    pageStandardBtn.setAttribute("aria-selected", String(isActive));
  }
  if (pageBonusBtn) {
    const isActive = selectedPage === PAGE_BONUS;
    pageBonusBtn.classList.toggle("popup-tab-active", isActive);
    pageBonusBtn.setAttribute("aria-selected", String(isActive));
  }
}

function updateMapOptionVisibility() {
  mapPageSections.forEach((sectionEl) => {
    const page = sectionEl.dataset.page || PAGE_STANDARD;
    sectionEl.classList.toggle("hidden", page !== selectedPage);
  });
}

function setSelectedPage(page) {
  if (page !== PAGE_STANDARD && page !== PAGE_BONUS) return;
  selectedPage = page;
  updatePageTabsUI();
  updateMapOptionVisibility();
}

function checkGuess() {
  if (!game || game.over || !game.secretWord) return;
  if (game.currentGuess === getPlayableWordLetters(game.secretWord)) {
    game.won = true;
    setGameOver(getWinMessage(), "won", true);
    return;
  }
  setGameOver(
    game?.mode === GAME_MODE_DAILY ? "Incorrect!" : "Incorrect! Play again? (Enter/Click)",
    "lost",
    true
  );
}

function onSubmitGuess() {
  checkGuess();
}

function onHintLetterClick() {
  revealRandomHintLetter();
  focusWordSlots();
}

function handleShiftCommand(event) {
  const key = String(event.key).toLowerCase();
  const code = String(event.code || "");
  const isShiftOptionCommand =
    event.shiftKey && event.altKey && !event.metaKey && !event.ctrlKey;
  const isShiftCommand =
    event.shiftKey && !event.metaKey && !event.ctrlKey && !event.altKey;

  if (isShiftOptionCommand && (code === "KeyD" || key === "d")) {
    event.preventDefault();
    event.beeShiftCommandHandled = true;
    writeDailyRecordToStorage(null);
    startGame(GAME_MODE_DAILY, { forcedMapId: chooseDailyMapId() });
    return true;
  }

  if (!isShiftCommand) return false;
  if (event.beeShiftCommandHandled) return true;

  if (key === "h") {
    event.preventDefault();
    event.beeShiftCommandHandled = true;
    if (isHelpOpen()) {
      closeHelp();
    } else {
      openHelp();
    }
    return true;
  }

  if (key === "l") {
    event.preventDefault();
    event.beeShiftCommandHandled = true;
    if (isHexOpen()) {
      closeHex();
    } else {
      openHex();
    }
    return true;
  }

  if (key === "a") {
    event.preventDefault();
    event.beeShiftCommandHandled = true;
    if (isFrequencyOpen()) {
      closeFrequency();
    } else {
      openFrequency();
    }
    return true;
  }

  if (key === "s") {
    event.preventDefault();
    event.beeShiftCommandHandled = true;
    if (isStatsOpen()) {
      closeStats();
    } else {
      openStats();
    }
    return true;
  }

  if (key === "n") {
    if (game?.mode !== GAME_MODE_NORMAL) return false;
    event.preventDefault();
    event.beeShiftCommandHandled = true;
    startEndlessNewGame();
    return true;
  }

  return false;
}

function onWordSlotsKeyDown(event) {
  if (!game) return;

  if (handleShiftCommand(event)) return;

  if (game.over) {
    if (game.mode === GAME_MODE_DAILY) return;
    if (event.key === "Enter") {
      event.preventDefault();
      startGame();
    }
    return;
  }

  if (!game.secretWord) return;

  if (event.key === "Enter") {
    event.preventDefault();
    onSubmitGuess();
    return;
  }

  if (event.key === "Backspace") {
    event.preventDefault();
    removeLastTypedGuessLetter();
    return;
  }

  if (event.key === " " || event.code === "Space") {
    event.preventDefault();
    shuffleLetterBank();
    return;
  }

  if (event.shiftKey && /^[a-z]$/i.test(event.key)) {
    event.preventDefault();
    return;
  }

  if (/^[a-z]$/i.test(event.key)) {
    event.preventDefault();
    if (game.currentGuess.length >= getPlayableWordLength(game.secretWord)) return;
    appendGuessLetters(event.key);
  }
}

function onWordSlotsPaste(event) {
  if (!game || game.over || !game.secretWord) return;
  event.preventDefault();
  const pasted = event.clipboardData?.getData("text") || "";
  appendGuessLetters(pasted);
}

function focusWordSlots() {
  if (!wordSlotsEl) return;
  wordSlotsEl.focus({ preventScroll: true });
}

function onSubmitGuessClick() {
  if (!game || game.over) return;
  onSubmitGuess();
  focusWordSlots();
}

function isHelpOpen() {
  return Boolean(helpModalEl && !helpModalEl.classList.contains("hidden"));
}

function isHexOpen() {
  return Boolean(hexModalEl && !hexModalEl.classList.contains("hidden"));
}

function isFrequencyOpen() {
  return Boolean(frequencyModalEl && !frequencyModalEl.classList.contains("hidden"));
}

function isStatsOpen() {
  return Boolean(statsModalEl && !statsModalEl.classList.contains("hidden"));
}

function syncTopControlActiveStates() {
  if (helpOpenBtn) {
    helpOpenBtn.classList.toggle("is-active", isHelpOpen());
  }
  if (hexOpenBtn) {
    hexOpenBtn.classList.toggle("is-active", isHexOpen());
  }
  if (frequencyOpenBtn) {
    frequencyOpenBtn.classList.toggle("is-active", isFrequencyOpen());
  }
  if (statsOpenBtn) {
    statsOpenBtn.classList.toggle("is-active", isStatsOpen());
  }
}

function isCompactTopControlsLayout() {
  if (!topControlsToggleBtn || typeof window === "undefined" || typeof window.getComputedStyle !== "function") {
    return false;
  }
  return window.getComputedStyle(topControlsToggleBtn).display !== "none";
}

function setTopControlsExpanded(isExpanded) {
  if (!topControlsEl || !topControlsToggleBtn || !topControlsActionsEl) return;
  const expanded = Boolean(isExpanded);
  topControlsEl.classList.toggle("is-expanded", expanded);
  topControlsToggleBtn.setAttribute("aria-expanded", String(expanded));
  topControlsActionsEl.setAttribute("aria-hidden", String(!expanded));
}

function closeTopControlsMenu() {
  if (!isCompactTopControlsLayout()) return;
  setTopControlsExpanded(false);
}

function toggleTopControlsMenu() {
  if (!isCompactTopControlsLayout()) return;
  const isExpanded = Boolean(topControlsEl?.classList.contains("is-expanded"));
  setTopControlsExpanded(!isExpanded);
}

function syncTopControlsLayout() {
  if (!topControlsEl || !topControlsToggleBtn || !topControlsActionsEl) return;
  if (isCompactTopControlsLayout()) {
    const isExpanded = topControlsEl.classList.contains("is-expanded");
    topControlsToggleBtn.setAttribute("aria-expanded", String(isExpanded));
    topControlsActionsEl.setAttribute("aria-hidden", String(!isExpanded));
    return;
  }
  topControlsEl.classList.remove("is-expanded");
  topControlsToggleBtn.setAttribute("aria-expanded", "false");
  topControlsActionsEl.setAttribute("aria-hidden", "false");
}

function openHelp() {
  if (!helpModalEl) return;
  closeStats();
  closeFrequency();
  closeHex();
  helpModalEl.classList.remove("hidden");
  helpModalEl.setAttribute("aria-hidden", "false");
  syncTopControlActiveStates();
}

function closeHelp() {
  if (!helpModalEl) return;
  const wasOpen = !helpModalEl.classList.contains("hidden");
  helpModalEl.classList.add("hidden");
  helpModalEl.setAttribute("aria-hidden", "true");
  syncTopControlActiveStates();
  if (wasOpen) {
    closeTopControlsMenu();
  }
}

function onHelpModalClick(event) {
  if (event.target === helpModalEl) {
    closeHelp();
  }
}

function openHex() {
  if (!hexModalEl) return;
  closeStats();
  closeFrequency();
  closeHelp();
  updateMapOptionVisibility();
  hexModalEl.classList.remove("hidden");
  hexModalEl.setAttribute("aria-hidden", "false");
  syncTopControlActiveStates();
}

function closeHex() {
  if (!hexModalEl) return;
  const wasOpen = !hexModalEl.classList.contains("hidden");
  hexModalEl.classList.add("hidden");
  hexModalEl.setAttribute("aria-hidden", "true");
  syncTopControlActiveStates();
  if (wasOpen) {
    closeTopControlsMenu();
  }
}

function onHexModalClick(event) {
  if (event.target === hexModalEl) {
    closeHex();
  }
}

function openStats() {
  if (!statsModalEl) return;
  closeHelp();
  closeHex();
  closeFrequency();
  updateStatsTabsUI();
  updateStatsPageVisibility();
  updateStatsViews();
  statsModalEl.classList.remove("hidden");
  statsModalEl.setAttribute("aria-hidden", "false");
  syncTopControlActiveStates();
}

function closeStats() {
  if (!statsModalEl) return;
  const wasOpen = !statsModalEl.classList.contains("hidden");
  statsModalEl.classList.add("hidden");
  statsModalEl.setAttribute("aria-hidden", "true");
  syncTopControlActiveStates();
  if (wasOpen) {
    closeTopControlsMenu();
  }
}

function onStatsModalClick(event) {
  if (event.target === statsModalEl) {
    closeStats();
  }
}

function updateStatsTabsUI() {
  if (statsTabDailyBtn) {
    const isActive = selectedStatsTab === STATS_TAB_DAILY;
    statsTabDailyBtn.classList.toggle("popup-tab-active", isActive);
    statsTabDailyBtn.setAttribute("aria-selected", String(isActive));
  }
  if (statsTabEndlessBtn) {
    const isActive = selectedStatsTab === STATS_TAB_ENDLESS;
    statsTabEndlessBtn.classList.toggle("popup-tab-active", isActive);
    statsTabEndlessBtn.setAttribute("aria-selected", String(isActive));
  }
}

function updateStatsPageVisibility() {
  statsPageSections.forEach((sectionEl) => {
    const page = sectionEl.dataset.statsPage || STATS_TAB_DAILY;
    sectionEl.classList.toggle("hidden", page !== selectedStatsTab);
  });
}

function setSelectedStatsTab(tab) {
  if (tab !== STATS_TAB_DAILY && tab !== STATS_TAB_ENDLESS) return;
  selectedStatsTab = tab;
  updateStatsTabsUI();
  updateStatsPageVisibility();
}

function updateFrequencyTabsUI() {
  if (frequencyPageAlphabeticalBtn) {
    const isActive = selectedFrequencyPage === FREQUENCY_PAGE_ALPHABETICAL;
    frequencyPageAlphabeticalBtn.classList.toggle("popup-tab-active", isActive);
    frequencyPageAlphabeticalBtn.setAttribute("aria-selected", String(isActive));
  }
  if (frequencyPageFrequencyBtn) {
    const isActive = selectedFrequencyPage === FREQUENCY_PAGE_FREQUENCY;
    frequencyPageFrequencyBtn.classList.toggle("popup-tab-active", isActive);
    frequencyPageFrequencyBtn.setAttribute("aria-selected", String(isActive));
  }
}

function updateFrequencyPageVisibility() {
  frequencyPageSections.forEach((sectionEl) => {
    const page = sectionEl.dataset.frequencyPage || FREQUENCY_PAGE_ALPHABETICAL;
    sectionEl.classList.toggle("hidden", page !== selectedFrequencyPage);
  });
}

function scaleVisibleFrequencyPage() {
  const activeSection = frequencyPageSections.find((sectionEl) => !sectionEl.classList.contains("hidden"));
  if (!activeSection) return;
  const columnsEl = activeSection.querySelector(".frequency-columns");
  if (!columnsEl) return;

  columnsEl.style.transform = "";

  const availableWidth = activeSection.clientWidth;
  const availableHeight = activeSection.clientHeight;
  const naturalWidth = columnsEl.scrollWidth;
  const naturalHeight = columnsEl.scrollHeight;

  if (
    availableWidth <= 0 ||
    availableHeight <= 0 ||
    naturalWidth <= 0 ||
    naturalHeight <= 0
  ) {
    return;
  }

  const scale = Math.min(1, availableWidth / naturalWidth, availableHeight / naturalHeight);
  columnsEl.style.transform = `scale(${scale})`;
}

function setSelectedFrequencyPage(page) {
  if (page !== FREQUENCY_PAGE_ALPHABETICAL && page !== FREQUENCY_PAGE_FREQUENCY) return;
  selectedFrequencyPage = page;
  updateFrequencyTabsUI();
  updateFrequencyPageVisibility();
  requestAnimationFrame(() => {
    scaleVisibleFrequencyPage();
  });
}

function openFrequency() {
  if (!frequencyModalEl) return;
  closeStats();
  closeHelp();
  closeHex();
  updateFrequencyTabsUI();
  updateFrequencyPageVisibility();
  frequencyModalEl.classList.remove("hidden");
  frequencyModalEl.setAttribute("aria-hidden", "false");
  syncTopControlActiveStates();
  requestAnimationFrame(() => {
    scaleVisibleFrequencyPage();
  });
}

function closeFrequency() {
  if (!frequencyModalEl) return;
  const wasOpen = !frequencyModalEl.classList.contains("hidden");
  frequencyModalEl.classList.add("hidden");
  frequencyModalEl.setAttribute("aria-hidden", "true");
  syncTopControlActiveStates();
  if (wasOpen) {
    closeTopControlsMenu();
  }
}

function onFrequencyModalClick(event) {
  if (event.target === frequencyModalEl) {
    closeFrequency();
  }
}

function onGlobalClick(event) {
  if (!game) return;
  if (isHelpOpen() || isHexOpen() || isFrequencyOpen() || isStatsOpen()) return;
  if (
    helpModalEl?.contains(event.target) ||
    helpOpenBtn?.contains(event.target) ||
    frequencyModalEl?.contains(event.target) ||
    frequencyOpenBtn?.contains(event.target) ||
    hexModalEl?.contains(event.target) ||
    hexOpenBtn?.contains(event.target) ||
    statsModalEl?.contains(event.target) ||
    statsOpenBtn?.contains(event.target)
  ) {
    return;
  }
  if (game.over) {
    if (!game.secretWord) return;
    if (game.mode === GAME_MODE_DAILY) return;
    if (ignoreNextReplayClick) {
      ignoreNextReplayClick = false;
      return;
    }
    startGame();
    return;
  }
  if (!game.secretWord) return;
  requestAnimationFrame(() => {
    focusWordSlots();
  });
}

function onGlobalMouseDown(event) {
  if (event.button !== 0 || !boardEl) return;
  if (!(event.target instanceof Element)) return;
  if (!event.target.closest(".tile[data-index]")) return;
  boardEl.classList.remove("bee-press");
  if (beePressTimer) {
    clearTimeout(beePressTimer);
  }
  beePressTimer = setTimeout(() => {
    boardEl.classList.add("bee-press");
    beePressTimer = null;
  }, 500);
}

function onGlobalMouseUp(event) {
  if (event.button !== 0 || !boardEl) return;
  if (beePressTimer) {
    clearTimeout(beePressTimer);
    beePressTimer = null;
  }
  boardEl.classList.remove("bee-press");
}

function onGlobalKeyDown(event) {
  if (handleShiftCommand(event)) return;
  if (event.defaultPrevented) return;

  if (isHelpOpen() || isHexOpen() || isFrequencyOpen() || isStatsOpen()) {
    if (event.key === "Escape") {
      event.preventDefault();
      closeHelp();
      closeHex();
      closeFrequency();
      closeStats();
    }
    return;
  }

  if (game?.over && event.key === "Enter") {
    if (game.mode === GAME_MODE_DAILY) {
      return;
    }
    event.preventDefault();
    startGame();
    return;
  }

  if (game && !game.over && !game.secretWord && event.key === "Enter") {
    event.preventDefault();
    startGame();
    return;
  }

  if (game && !game.over && game.secretWord) {
    if (event.key === "Enter") {
      event.preventDefault();
      onSubmitGuess();
      focusWordSlots();
      return;
    }

    if (event.key === "Backspace") {
      event.preventDefault();
      removeLastTypedGuessLetter();
      focusWordSlots();
      return;
    }

    if (event.key === " " || event.code === "Space") {
      event.preventDefault();
      shuffleLetterBank();
      focusWordSlots();
      return;
    }

    if (event.shiftKey && /^[a-z]$/i.test(event.key)) {
      event.preventDefault();
      return;
    }

    if (/^[a-z]$/i.test(event.key)) {
      event.preventDefault();
      if (game.currentGuess.length >= getPlayableWordLength(game.secretWord)) return;
      appendGuessLetters(event.key);
      focusWordSlots();
      return;
    }
  }
}

function getInitialMode() {
  return hasCompletedDailyBeeToday() ? GAME_MODE_NORMAL : GAME_MODE_DAILY;
}

export function initGame() {
  dailyRecord = getTodayDailyRecord();
  mapStatsRecord = getMapStatsRecord();
  topControlsEl = document.querySelector(".top-controls");
  topControlsActionsEl = document.getElementById("top-controls-actions");
  topControlsToggleBtn = document.getElementById("top-controls-toggle");
  boardEl = document.getElementById("board");
  statsStackEl = document.getElementById("stats-stack");
  resultMessageEl = document.getElementById("result-message");
  flagCountEl = document.getElementById("flag-count");
  mineCountEl = document.getElementById("mine-count");
  flagCountValueEl = document.getElementById("flag-count-value");
  mineCountValueEl = document.getElementById("mine-count-value");
  newGameBtn = document.getElementById("new-game");
  dailyBeeBtn = document.getElementById("daily-bee");
  endlessNewGameBtn = document.getElementById("endless-new-game");
  unscrambleEl = document.getElementById("unscramble");
  prestartPromptEl = document.getElementById("prestart-prompt");
  prestartPromptMainEl = document.getElementById("prestart-prompt-main");
  guessStackEl = document.getElementById("guess-stack");
  categoryLabelEl = document.getElementById("category-label");
  wordSlotsEl = document.getElementById("word-slots");
  hintLetterBtn = document.getElementById("hint-letter");
  submitGuessBtn = document.getElementById("submit-guess");
  shuffleBankBtn = document.getElementById("shuffle-bank");
  flaggedLettersEl = document.getElementById("flagged-letters");
  helpOpenBtn = document.getElementById("help-open");
  helpModalEl = document.getElementById("help-modal");
  helpCloseBtn = document.getElementById("help-close");
  legendShiftNNewGameEl = document.getElementById("legend-shift-n-new-game");
  frequencyOpenBtn = document.getElementById("frequency-open");
  frequencyModalEl = document.getElementById("frequency-modal");
  frequencyCloseBtn = document.getElementById("frequency-close");
  statsOpenBtn = document.getElementById("stats-open");
  statsModalEl = document.getElementById("stats-modal");
  statsCloseBtn = document.getElementById("stats-close");
  statsResetBtn = document.getElementById("stats-reset");
  statsEndlessGridEl = document.getElementById("stats-endless-grid");
  statsPageSections = Array.from(document.querySelectorAll(".stats-page[data-stats-page]"));
  statsTabDailyBtn = document.getElementById("stats-tab-daily");
  statsTabEndlessBtn = document.getElementById("stats-tab-endless");
  statsDailyWinRateEl = document.getElementById("stats-daily-win-rate");
  statsDailyAvgHintsEl = document.getElementById("stats-daily-avg-hints");
  statsDailyCurrentStreakEl = document.getElementById("stats-daily-current-streak");
  statsDailyLongestStreakEl = document.getElementById("stats-daily-longest-streak");
  hexOpenBtn = document.getElementById("hex-open");
  hexModalEl = document.getElementById("hex-modal");
  hexCloseBtn = document.getElementById("hex-close");
  frequencyPageSections = Array.from(
    document.querySelectorAll(".frequency-page[data-frequency-page]")
  );
  frequencyPageAlphabeticalBtn = document.getElementById("frequency-page-alphabetical");
  frequencyPageFrequencyBtn = document.getElementById("frequency-page-frequency");
  mapPageSections = Array.from(document.querySelectorAll(".map-grid-page[data-page]"));
  pageStandardBtn = document.getElementById("page-standard");
  pageBonusBtn = document.getElementById("page-bonus");
  mapOptionButtons = Array.from(document.querySelectorAll(".map-option[data-map-id]"));

  if (
    !boardEl ||
    !statsStackEl ||
    !resultMessageEl ||
    !flagCountEl ||
    !mineCountEl ||
    !flagCountValueEl ||
    !mineCountValueEl ||
    !newGameBtn ||
    !dailyBeeBtn ||
    !endlessNewGameBtn ||
    !unscrambleEl ||
    !prestartPromptEl ||
    !guessStackEl ||
    !categoryLabelEl ||
    !wordSlotsEl ||
    !hintLetterBtn ||
    !submitGuessBtn ||
    !shuffleBankBtn ||
    !flaggedLettersEl ||
    !topControlsEl ||
    !topControlsActionsEl ||
    !topControlsToggleBtn ||
    !helpOpenBtn ||
    !helpModalEl ||
    !helpCloseBtn ||
    !frequencyOpenBtn ||
    !frequencyModalEl ||
    !frequencyCloseBtn ||
    !statsOpenBtn ||
    !statsModalEl ||
    !statsCloseBtn ||
    !statsResetBtn ||
    !statsEndlessGridEl ||
    statsPageSections.length === 0 ||
    !statsTabDailyBtn ||
    !statsTabEndlessBtn ||
    !statsDailyWinRateEl ||
    !statsDailyAvgHintsEl ||
    !statsDailyCurrentStreakEl ||
    !statsDailyLongestStreakEl ||
    !hexOpenBtn ||
    !hexModalEl ||
    !hexCloseBtn ||
    frequencyPageSections.length === 0 ||
    !frequencyPageAlphabeticalBtn ||
    !frequencyPageFrequencyBtn ||
    mapPageSections.length === 0 ||
    !pageStandardBtn ||
    !pageBonusBtn
  ) {
    return;
  }

  wordSlotsEl.tabIndex = 0;
  newGameBtn.addEventListener("click", switchToEndlessMode);
  newGameBtn.addEventListener("keydown", onModeTabKeyDown);
  dailyBeeBtn.addEventListener("click", startDailyGame);
  dailyBeeBtn.addEventListener("keydown", onModeTabKeyDown);
  endlessNewGameBtn.addEventListener("click", startEndlessNewGame);
  helpOpenBtn.addEventListener("click", openHelp);
  topControlsToggleBtn.addEventListener("click", toggleTopControlsMenu);
  helpCloseBtn.addEventListener("click", closeHelp);
  helpModalEl.addEventListener("click", onHelpModalClick);
  frequencyOpenBtn.addEventListener("click", openFrequency);
  frequencyCloseBtn.addEventListener("click", closeFrequency);
  frequencyModalEl.addEventListener("click", onFrequencyModalClick);
  statsOpenBtn.addEventListener("click", openStats);
  statsCloseBtn.addEventListener("click", closeStats);
  statsResetBtn.addEventListener("click", resetMapStats);
  statsModalEl.addEventListener("click", onStatsModalClick);
  statsTabDailyBtn.addEventListener("click", () => {
    setSelectedStatsTab(STATS_TAB_DAILY);
  });
  statsTabEndlessBtn.addEventListener("click", () => {
    setSelectedStatsTab(STATS_TAB_ENDLESS);
  });
  hexOpenBtn.addEventListener("click", openHex);
  hexCloseBtn.addEventListener("click", closeHex);
  hexModalEl.addEventListener("click", onHexModalClick);
  mapOptionButtons.forEach((buttonEl) => {
    buttonEl.addEventListener("click", onMapOptionClick);
  });
  pageStandardBtn.addEventListener("click", () => {
    setSelectedPage(PAGE_STANDARD);
  });
  pageBonusBtn.addEventListener("click", () => {
    setSelectedPage(PAGE_BONUS);
  });
  frequencyPageAlphabeticalBtn.addEventListener("click", () => {
    setSelectedFrequencyPage(FREQUENCY_PAGE_ALPHABETICAL);
  });
  frequencyPageFrequencyBtn.addEventListener("click", () => {
    setSelectedFrequencyPage(FREQUENCY_PAGE_FREQUENCY);
  });
  wordSlotsEl.addEventListener("keydown", onWordSlotsKeyDown);
  wordSlotsEl.addEventListener("paste", onWordSlotsPaste);
  wordSlotsEl.addEventListener("click", focusWordSlots);
  hintLetterBtn.addEventListener("click", onHintLetterClick);
  shuffleBankBtn.addEventListener("click", () => {
    shuffleLetterBank();
    focusWordSlots();
  });
  submitGuessBtn.addEventListener("click", onSubmitGuessClick);
  document.addEventListener("click", onGlobalClick);
  document.addEventListener("mousedown", onGlobalMouseDown);
  document.addEventListener("mouseup", onGlobalMouseUp);
  document.addEventListener("keydown", onGlobalKeyDown);
  window.addEventListener("resize", () => {
    scaleVisibleFrequencyPage();
    syncModeButtonWidths();
    syncTopControlsLayout();
  });

  syncTopControlsLayout();
  syncTopControlActiveStates();
  updatePageTabsUI();
  updateMapOptionVisibility();
  updateFrequencyTabsUI();
  updateFrequencyPageVisibility();
  updateStatsTabsUI();
  updateStatsPageVisibility();
  updateStatsViews();
  if (getInitialMode() === GAME_MODE_DAILY) {
    startDailyGame();
  } else {
    startNormalGame();
  }
}
