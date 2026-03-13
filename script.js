import { levelCatalog } from "./words.js";
import { buildPlacedMap, getDefaultMapId, mapDefinitions } from "./mapLayouts.js";

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

let boardEl = null;
let statsStackEl = null;
let resultMessageEl = null;
let flagCountEl = null;
let mineCountEl = null;
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
let flaggedLettersEl = null;
let helpOpenBtn = null;
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
let beeFlapTimer = null;
let beeEyesTimer = null;
let beePressTimer = null;
let ignoreNextReplayClick = false;
let dailyRecord = null;
let mapStatsRecord = null;
const CLASSIC_BASE_ROW_COUNT = buildPlacedMap(getDefaultMapId()).rowCount || 6;
const CLASSIC_MAP_ID = getDefaultMapId();
const STANDARD_MAP_DEFINITIONS = mapDefinitions.filter((entry) => entry.category !== PAGE_BONUS);
const BONUS_MAP_DEFINITIONS = mapDefinitions.filter((entry) => entry.category === PAGE_BONUS);
const DAILY_MAP_IDS = mapDefinitions.map((entry) => entry.id).sort((a, b) => a.localeCompare(b));
const MAP_NAME_BY_ID = new Map(mapDefinitions.map((entry) => [entry.id, entry.name]));
const MAP_SORT_INDEX_BY_ID = new Map(mapDefinitions.map((entry, index) => [entry.id, index]));
selectedBonusMapId = SHUFFLE_MAP_ID;

function normalizeWordLetter(letter) {
  return letter;
}

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

function createHexSvg() {
  const svgEl = document.createElementNS(SVG_NS, "svg");
  svgEl.setAttribute("class", "tile-svg");
  svgEl.setAttribute("viewBox", "0 0 100 115.4701");
  svgEl.setAttribute("aria-hidden", "true");

  const polygonEl = document.createElementNS(SVG_NS, "polygon");
  polygonEl.setAttribute("class", "tile-shape");
  polygonEl.setAttribute(
    "points",
    "50,0 100,28.8675 100,86.6025 50,115.4701 0,86.6025 0,28.8675"
  );
  svgEl.appendChild(polygonEl);
  return svgEl;
}

function createInactiveTile(kind) {
  const tileEl = document.createElement("div");
  tileEl.className = `tile tile-inactive tile-inactive-${kind}`;
  tileEl.setAttribute("aria-hidden", "true");
  tileEl.appendChild(createHexSvg());

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

function setWingVisualPosition(element, x, row) {
  element.style.setProperty("--wing-x", String(x));
  element.style.setProperty("--wing-row", String(row));
}

function triggerBeeReaction() {
  if (!boardEl) return;
  boardEl.classList.add("bee-awake");
  boardEl.classList.remove("bee-flap");
  void boardEl.offsetWidth;
  boardEl.classList.add("bee-flap");

  if (beeFlapTimer) {
    clearTimeout(beeFlapTimer);
  }
  beeFlapTimer = setTimeout(() => {
    boardEl.classList.remove("bee-flap");
  }, 260);

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

function createWing(side, lowerRenderX, lowerRow, upperDx) {
  const wingEl = document.createElement("div");
  wingEl.className = `wing wing-${side}`;
  setWingVisualPosition(wingEl, lowerRenderX, lowerRow);

  const upperTile = createInactiveTile("black");
  upperTile.classList.add("wing-tile", "wing-upper");
  setTileVisualPosition(upperTile, upperDx, -1);
  bindBeeReaction(upperTile);

  const lowerTile = createInactiveTile("black");
  lowerTile.classList.add("wing-tile", "wing-lower");
  setTileVisualPosition(lowerTile, 0, 0);
  bindBeeReaction(lowerTile);

  wingEl.append(upperTile, lowerTile);
  return wingEl;
}

function initBoard(mapId) {
  boardEl.innerHTML = "";
  tiles = [];
  const layout = buildPlacedMap(mapId);
  const isClassicMap = mapId === CLASSIC_MAP_ID;
  const { xMin: minX, xSpan, rowCount } = layout;
  boardEl.style.setProperty("--board-x-span", String(xSpan));
  boardEl.style.setProperty("--board-row-count", String(rowCount));
  boardEl.style.setProperty("--board-classic-row-count", String(CLASSIC_BASE_ROW_COUNT));
  neighborsByTileIndex = layout.neighborsByActiveIndex.map((neighborIndexes) => [...neighborIndexes]);
  const wingCandidatesByRow = new Map();

  let index = 0;
  layout.tiles.forEach((entry) => {
    const renderX = entry.x - minX;
    if (entry.kind !== "active") {
      if (
        isClassicMap &&
        entry.kind === "inactive-black" &&
        (entry.row === 0 || entry.row === 1)
      ) {
        const rowEntries = wingCandidatesByRow.get(entry.row) || [];
        rowEntries.push(entry);
        wingCandidatesByRow.set(entry.row, rowEntries);
        return;
      }
      const kind = entry.kind.replace("inactive-", "");
      const tileEl = createInactiveTile(kind);
      setTileVisualPosition(tileEl, renderX, entry.row);
      bindBeeReaction(tileEl);
      boardEl.appendChild(tileEl);
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

  if (isClassicMap) {
    const left = [];
    const right = [];
    [0, 1].forEach((row) => {
      const rowEntries = wingCandidatesByRow.get(row) || [];
      if (rowEntries.length < 2) return;
      rowEntries.sort((a, b) => a.x - b.x);
      left.push(rowEntries[0]);
      right.push(rowEntries[rowEntries.length - 1]);
    });

    if (left.length === 2) {
      const [leftUpper, leftLower] = left.sort((a, b) => a.row - b.row);
      const wingEl = createWing("left", leftLower.x - minX, leftLower.row, leftUpper.x - leftLower.x);
      boardEl.appendChild(wingEl);
    }

    if (right.length === 2) {
      const [rightUpper, rightLower] = right.sort((a, b) => a.row - b.row);
      const wingEl = createWing("right", rightLower.x - minX, rightLower.row, rightUpper.x - rightLower.x);
      boardEl.appendChild(wingEl);
    }
  }
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
  mapStatsRecord = sanitizeMapStatsRecord(null);
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
  const dayNumber = getDayNumberFromLocalDate(date);
  const index = ((dayNumber % DAILY_ELIGIBLE_LEVELS.length) + DAILY_ELIGIBLE_LEVELS.length) % DAILY_ELIGIBLE_LEVELS.length;
  return DAILY_ELIGIBLE_LEVELS[index];
}

function chooseDailyMapId(date = new Date()) {
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
    .split("")
    .map(normalizeWordLetter);
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
  const safeLetters = LETTER_GRID.filter((letter) => !mineLetterSet.has(normalizeWordLetter(letter)));
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
    tile.element.disabled = game.over;
  });
  game.mineCounts = new Set(
    tiles.filter((tile) => tile.isMine).map((tile) => normalizeWordLetter(tile.letter))
  );

  boardEl.classList.remove("bee-awake", "bee-flap", "bee-dead", "bee-won");
  if (game.outcome?.result === "lost") {
    boardEl.classList.add("bee-dead");
  } else if (game.outcome?.result === "won") {
    boardEl.classList.add("bee-won");
  }

  mineCountEl.textContent = game.secretWord ? `Mines: ${game.totalMines}` : "Mines: ?";
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
    if (game.outcome.useCategoryLabel && categoryLabelEl) {
      categoryLabelEl.classList.add("category-label-outcome");
      categoryLabelEl.textContent = game.outcome.message || "";
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
      .map(normalizeWordLetter)
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

function syncGuessValue(nextGuessSlots) {
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
    persistDailyRecord(false);
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

  syncGuessValue(nextGuessSlots);
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

  syncGuessValue(nextGuessSlots);
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

  playableLetters.forEach((letter, index) => {
    if (letter !== chosenLetter) return;
    game.hintedIndexes.add(index);
    game.hintedLetters.add(letter);
    nextGuessSlots[index] = letter;
  });

  syncGuessValue(nextGuessSlots);
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

function getLetterBankLetters() {
  const flaggedLetters = [];
  tiles.forEach((tile) => {
    if (tile.flagCount > 0) {
      flaggedLetters.push(tile.letter);
    }
  });

  const hintedLetters = game?.hintedLetters instanceof Set ? [...game.hintedLetters] : [];
  const combinedLetters = [...flaggedLetters, ...hintedLetters];
  if (combinedLetters.length === 0) {
    return [];
  }

  return [...new Set(combinedLetters)].sort();
}

function shuffleLetterBank() {
  if (!game || game.over || !game.secretWord) return;

  const letters = getLetterBankLetters();
  if (letters.length < 2) return;

  game.letterBankShuffleOrder = shuffle(letters);
  renderFlaggedLetters();
}

function renderFlaggedLetters() {
  if (!flaggedLettersEl) return;
  flaggedLettersEl.innerHTML = "";

  const letterBankLetters = getLetterBankLetters();
  if (letterBankLetters.length === 0) return;

  const storedShuffle = Array.isArray(game?.letterBankShuffleOrder)
    ? game.letterBankShuffleOrder
    : [];
  const lettersToRender =
    storedShuffle.length > 0 &&
    [...storedShuffle].sort().join("") === letterBankLetters.join("")
      ? storedShuffle
      : letterBankLetters;

  if (game) {
    game.letterBankShuffleOrder = [...lettersToRender];
  }

  const typedLetters = new Set(String(game?.currentGuess || "").split(""));
  const hintedLetters = game?.hintedLetters instanceof Set ? game.hintedLetters : new Set();
  lettersToRender.forEach((letter) => {
    const letterEl = document.createElement("span");
    letterEl.className = "flagged-letter";
    if (hintedLetters.has(letter)) {
      letterEl.classList.add("flagged-letter-hint");
    }
    if (typedLetters.has(letter)) {
      letterEl.classList.add("flagged-letter-used");
    }
    letterEl.textContent = letter;
    flaggedLettersEl.appendChild(letterEl);
  });
}

function renderCategoryLabel() {
  if (!categoryLabelEl) return;
  categoryLabelEl.classList.remove("category-label-outcome");
  const categoryText = game && game.secretCategory ? game.secretCategory : "";
  categoryLabelEl.textContent = `${categoryText}`;
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
  game.currentGuess = "";

  mineCountEl.textContent = `Mines: ${game.totalMines}`;
  renderEntryMode();
  renderCategoryLabel();
  renderWordSlots(secretEntry.word, game.guessSlots);
  wordSlotsEl.focus();
  persistDailyRecord(false);
  return true;
}

function startGame(requestedMode = null, options = {}) {
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
    hintsUsed: 0,
    letterBankShuffleOrder: [],
    firstRevealIndex: -1,
    over: false,
    won: false,
    outcome: null,
  };
  initBoard(resolvedMapId);
  boardEl.classList.remove("bee-awake", "bee-flap", "bee-dead", "bee-won");
  if (beeFlapTimer) {
    clearTimeout(beeFlapTimer);
    beeFlapTimer = null;
  }
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
    tile.element.disabled = false;
  });

  wordSlotsEl.innerHTML = "";
  renderEntryMode();
  renderFlaggedLetters();
  renderCategoryLabel();
  mineCountEl.textContent = "Mines: ?";
  resultMessageEl.textContent = "";
  resultMessageEl.classList.add("hidden");
  statsStackEl.classList.remove("hidden");
  updateStats();
  updateHintButtonState();
  updateModeButtons();
  if (mode === GAME_MODE_DAILY && !options.skipDailyPersist) {
    persistDailyRecord(false);
  }
}

function updateStats() {
  const flags = tiles.reduce((total, tile) => total + tile.flagCount, 0);
  flagCountEl.textContent = `Flags: ${flags}`;
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
    boardEl.classList.remove("bee-awake", "bee-flap");
  } else if (result === "won") {
    boardEl.classList.add("bee-won");
    boardEl.classList.remove("bee-dead");
    boardEl.classList.remove("bee-awake", "bee-flap");
  }
  if (useCategoryLabel && categoryLabelEl) {
    categoryLabelEl.classList.add("category-label-outcome");
    categoryLabelEl.textContent = message;
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
  tiles.forEach((tile) => {
    tile.element.disabled = true;
  });
  if (game.mode === GAME_MODE_DAILY) {
    const isFinished = result === "won" || result === "lost";
    persistDailyRecord(isFinished);
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
  if (tile.revealed || tile.flagCount > 0) return;

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
    persistDailyRecord(false);
  }
}

function onToggleFlag(index) {
  if (!game || game.over) return;
  if (!game.secretWord) return;

  const tile = tiles[index];
  if (tile.revealed) return;
  tile.flagCount = tile.flagCount > 0 ? 0 : 1;
  tile.element.classList.toggle("flagged", tile.flagCount > 0);
  tile.valueElement.textContent = tile.flagCount > 0 ? "⚑" : "";

  updateStats();
  if (game.mode === GAME_MODE_DAILY) {
    persistDailyRecord(false);
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
  startGame(GAME_MODE_NORMAL);
  closeHex();
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
  if (game?.mode === GAME_MODE_DAILY) {
    persistDailyRecord(false);
  }
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
  helpModalEl.classList.add("hidden");
  helpModalEl.setAttribute("aria-hidden", "true");
  syncTopControlActiveStates();
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
  hexModalEl.classList.add("hidden");
  hexModalEl.setAttribute("aria-hidden", "true");
  syncTopControlActiveStates();
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
  statsModalEl.classList.add("hidden");
  statsModalEl.setAttribute("aria-hidden", "true");
  syncTopControlActiveStates();
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
  frequencyModalEl.classList.add("hidden");
  frequencyModalEl.setAttribute("aria-hidden", "true");
  syncTopControlActiveStates();
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
  if (!event.target.closest("button.tile")) return;
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
  boardEl = document.getElementById("board");
  statsStackEl = document.getElementById("stats-stack");
  resultMessageEl = document.getElementById("result-message");
  flagCountEl = document.getElementById("flag-count");
  mineCountEl = document.getElementById("mine-count");
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
    !flaggedLettersEl ||
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
  submitGuessBtn.addEventListener("click", onSubmitGuessClick);
  document.addEventListener("click", onGlobalClick);
  document.addEventListener("mousedown", onGlobalMouseDown);
  document.addEventListener("mouseup", onGlobalMouseUp);
  document.addEventListener("keydown", onGlobalKeyDown);
  window.addEventListener("resize", () => {
    scaleVisibleFrequencyPage();
    syncModeButtonWidths();
  });

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
