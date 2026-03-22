import { useEffect } from "react";
import { initGame } from "./script.js";
import { buildPlacedMap, HEX_GEOMETRY, mapDefinitions } from "./mapLayouts.js";
import lightbulbIcon from "./Icons/lightbulb.svg";
import mineIcon from "./Icons/mine.svg";
import flagIcon from "./Icons/flag.svg";
import shuffleIcon from "./Icons/Shuffle.svg";

const SHUFFLE_MAP_ID = "shuffle";
const LETTER_FREQUENCIES = [
  ["E", "12.70%"],
  ["T", "9.06%"],
  ["A", "8.17%"],
  ["O", "7.51%"],
  ["I", "6.97%"],
  ["N", "6.75%"],
  ["S", "6.33%"],
  ["H", "6.09%"],
  ["R", "5.99%"],
  ["D", "4.25%"],
  ["L", "4.03%"],
  ["C", "2.78%"],
  ["U", "2.76%"],
  ["M", "2.41%"],
  ["W", "2.36%"],
  ["F", "2.23%"],
  ["G", "2.02%"],
  ["Y", "1.97%"],
  ["P", "1.93%"],
  ["B", "1.49%"],
  ["V", "0.98%"],
  ["K", "0.77%"],
  ["J", "0.15%"],
  ["X", "0.15%"],
  ["Q", "0.10%"],
  ["Z", "0.07%"],
];
const MAX_FREQUENCY_VALUE = LETTER_FREQUENCIES.reduce((max, [, frequency]) => {
  const numericValue = Number.parseFloat(frequency);
  return Number.isFinite(numericValue) ? Math.max(max, numericValue) : max;
}, 0);
const LETTER_FREQUENCIES_ALPHABETICAL = [...LETTER_FREQUENCIES].sort(
  ([a], [b]) => a.localeCompare(b),
);
const LETTER_FREQUENCY_COLUMNS_BY_FREQUENCY = [
  LETTER_FREQUENCIES.slice(0, 13),
  LETTER_FREQUENCIES.slice(13),
];
const LETTER_FREQUENCY_COLUMNS_ALPHABETICAL = [
  LETTER_FREQUENCIES_ALPHABETICAL.slice(0, 13),
  LETTER_FREQUENCIES_ALPHABETICAL.slice(13),
];
const PREVIEW_HEX_WIDTH = 20;
const PREVIEW_HEX_HEIGHT = PREVIEW_HEX_WIDTH * HEX_GEOMETRY.heightRatio;
const PREVIEW_HEX_HALF_WIDTH = PREVIEW_HEX_WIDTH / 2;
const PREVIEW_HEX_QUARTER_HEIGHT = PREVIEW_HEX_HEIGHT / 4;
const PREVIEW_HEX_HALF_HEIGHT = PREVIEW_HEX_HEIGHT / 2;
const PREVIEW_ROW_STEP = PREVIEW_HEX_HEIGHT * HEX_GEOMETRY.rowStepRatio;
const SHUFFLE_PREVIEW_WIDTH = PREVIEW_HEX_WIDTH * 6;
const SHUFFLE_PREVIEW_HEIGHT = PREVIEW_HEX_HEIGHT + PREVIEW_ROW_STEP * 2;
const PAGE_STANDARD = "standard";
const PAGE_BONUS = "bonus";

const MAP_PREVIEWS = mapDefinitions.map((mapDefinition) => {
  const placedMap = buildPlacedMap(mapDefinition.id);
  return {
    id: mapDefinition.id,
    page: mapDefinition.category || PAGE_STANDARD,
    name: mapDefinition.name,
    tiles: placedMap.tiles,
    minX: placedMap.xMin,
    width: placedMap.xSpan * PREVIEW_HEX_WIDTH,
    height: PREVIEW_HEX_HEIGHT + PREVIEW_ROW_STEP * (placedMap.rowCount - 1),
  };
});
const MAP_OPTIONS = [
  {
    id: SHUFFLE_MAP_ID,
    page: PAGE_STANDARD,
    name: "Shuffle (Default)",
    tiles: [],
    minX: 0,
    width: SHUFFLE_PREVIEW_WIDTH,
    height: SHUFFLE_PREVIEW_HEIGHT,
    isShuffle: true,
  },
  ...MAP_PREVIEWS.filter((preview) => preview.page === PAGE_STANDARD),
  {
    id: SHUFFLE_MAP_ID,
    page: PAGE_BONUS,
    name: "Shuffle",
    tiles: [],
    minX: 0,
    width: SHUFFLE_PREVIEW_WIDTH,
    height: SHUFFLE_PREVIEW_HEIGHT,
    isShuffle: true,
  },
  ...MAP_PREVIEWS.filter((preview) => preview.page === PAGE_BONUS),
];

function splitIntoTwoRows(options) {
  const midpoint = Math.ceil(options.length / 2);
  return [options.slice(0, midpoint), options.slice(midpoint)];
}

const STANDARD_MAP_OPTIONS = MAP_OPTIONS.filter(
  (option) => option.page === PAGE_STANDARD,
);
const BONUS_MAP_OPTIONS = MAP_OPTIONS.filter(
  (option) => option.page === PAGE_BONUS,
);
const [STANDARD_ROW_1, STANDARD_ROW_2] = splitIntoTwoRows(STANDARD_MAP_OPTIONS);
const [BONUS_ROW_1, BONUS_ROW_2] = splitIntoTwoRows(BONUS_MAP_OPTIONS);
const DAILY_OUTCOME_DECOR_ROWS = ["GG", "G", "DGGGGD", "DGGGD", "GG", "ESE"];
const DAILY_OUTCOME_DECOR_MAX_WIDTH = Math.max(
  ...DAILY_OUTCOME_DECOR_ROWS.map((row) => row.length),
);
const DAILY_OUTCOME_DECOR_CENTER_X = (DAILY_OUTCOME_DECOR_MAX_WIDTH - 1) / 2;
const DAILY_OUTCOME_DECOR_TILES = DAILY_OUTCOME_DECOR_ROWS.flatMap(
  (rowSpec, rowIndex) => {
    const row = String(rowSpec || "").toUpperCase();
    const rowStart = (DAILY_OUTCOME_DECOR_MAX_WIDTH - row.length) / 2;
    return row.split("").flatMap((token, columnIndex) => {
      if (token === "G" || token === ".") return [];
      const x = rowStart + columnIndex - DAILY_OUTCOME_DECOR_CENTER_X;
      const variantClassName =
        token === "E" || token === "S"
          ? "daily-outcome-decor-tile-face"
          : "daily-outcome-decor-tile-decor";
      return [
        {
          key: `daily-decor-${rowIndex}-${columnIndex}-${token}`,
          token,
          x,
          variantClassName,
          style: {
            "--decor-x": String(x),
            "--decor-row": String(rowIndex),
          },
        },
      ];
    });
  },
);
const DAILY_OUTCOME_DECOR_WING_LEFT_TILES = DAILY_OUTCOME_DECOR_TILES.filter(
  (tile) => tile.variantClassName === "daily-outcome-decor-tile-decor" && tile.x < 0,
);
const DAILY_OUTCOME_DECOR_WING_RIGHT_TILES = DAILY_OUTCOME_DECOR_TILES.filter(
  (tile) => tile.variantClassName === "daily-outcome-decor-tile-decor" && tile.x > 0,
);
const DAILY_OUTCOME_DECOR_CENTER_TILES = DAILY_OUTCOME_DECOR_TILES.filter(
  (tile) =>
    !(tile.variantClassName === "daily-outcome-decor-tile-decor" && (tile.x < 0 || tile.x > 0)),
);

function getPreviewHexPoints(centerX, centerY) {
  return [
    `${centerX},${centerY - PREVIEW_HEX_HALF_HEIGHT}`,
    `${centerX + PREVIEW_HEX_HALF_WIDTH},${centerY - PREVIEW_HEX_QUARTER_HEIGHT}`,
    `${centerX + PREVIEW_HEX_HALF_WIDTH},${centerY + PREVIEW_HEX_QUARTER_HEIGHT}`,
    `${centerX},${centerY + PREVIEW_HEX_HALF_HEIGHT}`,
    `${centerX - PREVIEW_HEX_HALF_WIDTH},${centerY + PREVIEW_HEX_QUARTER_HEIGHT}`,
    `${centerX - PREVIEW_HEX_HALF_WIDTH},${centerY - PREVIEW_HEX_QUARTER_HEIGHT}`,
  ].join(" ");
}

export default function App() {
  useEffect(() => {
    initGame();
  }, []);

  const renderHexWord = (word, keyPrefix, wordClassName) => (
    <span className={`site-word ${wordClassName}`} aria-label={word}>
      {[...word].map((letter, index) => (
        <span
          key={`${keyPrefix}-${index}`}
          className={`site-letter-hex${index === 0 ? " site-letter-hex-initial" : ""}`}
          aria-hidden="true"
        >
          <span className="site-letter-char">{letter}</span>
        </span>
      ))}
    </span>
  );

  return (
    <main className="app">
      <div className="top-controls">
        <div
          id="top-controls-actions"
          className="top-controls-actions"
          aria-hidden="false"
        >
          <button
            id="help-open"
            className="top-control-hex help-trigger"
            type="button"
            aria-haspopup="dialog"
            aria-controls="help-modal"
            aria-label="Open help"
          >
            <span className="top-control-icon">?</span>
          </button>
          <button
            id="hex-open"
            className="top-control-hex hex-trigger"
            type="button"
            aria-haspopup="dialog"
            aria-controls="hex-modal"
            aria-label="Open maps"
            title="maps"
          >
            <span
              className="top-control-icon top-control-icon-map"
              aria-hidden="true"
            >
              <svg viewBox="0 0 100 115.4701" focusable="false">
                <polygon points="50,8 92,32.25 92,83.22 50,107.47 8,83.22 8,32.25" />
              </svg>
            </span>
          </button>
          <button
            id="stats-open"
            className="top-control-hex stats-trigger"
            type="button"
            aria-haspopup="dialog"
            aria-controls="stats-modal"
            aria-label="Open stats"
            title="stats"
          >
            <span className="top-control-icon">%</span>
          </button>
          <button
            id="frequency-open"
            className="top-control-hex frequency-trigger"
            type="button"
            aria-haspopup="dialog"
            aria-controls="frequency-modal"
            aria-label="Open letter frequency"
            title="letter frequency"
          >
            <span className="top-control-icon">Aa</span>
          </button>
        </div>
        <button
          id="top-controls-toggle"
          className="top-control-hex top-control-toggle"
          type="button"
          aria-label="Toggle controls"
          aria-controls="top-controls-actions"
          aria-expanded="false"
          title="menu"
        >
          <span
            className="top-control-icon top-control-icon-menu"
            aria-hidden="true"
          >
            <svg viewBox="0 0 24 24" focusable="false">
              <rect x="4" y="6" width="16" height="2" rx="1" />
              <rect x="4" y="11" width="16" height="2" rx="1" />
              <rect x="4" y="16" width="16" height="2" rx="1" />
            </svg>
          </span>
        </button>
      </div>
      <section className="panel">
        <header>
          <h1 className="site-title">
            <img
              className="site-title-icon site-title-icon-left"
              src="/favicon.png"
              alt=""
              aria-hidden="true"
            />
            <span className="site-title-words">
              {renderHexWord("bee", "bee", "site-word-bee")}
              {renderHexWord("mine", "mine", "site-word-mine")}
            </span>
            <img
              className="site-title-icon site-title-icon-right"
              src="/favicon.png"
              alt=""
              aria-hidden="true"
            />
          </h1>
        </header>
        <p className="site-tagline">
          Find the mines. Unscramble the letters.{" "}
          <strong>Guess the word!</strong>
        </p>
        <div className="game-actions" role="tablist" aria-label="Game mode">
          <button
            id="daily-bee"
            className="mode-option-button"
            type="button"
            role="tab"
          >
            Daily Bee
          </button>
          <button
            id="new-game"
            className="mode-option-button"
            type="button"
            role="tab"
          >
            Endless Mode
          </button>
        </div>
        <p id="result-message" className="result-message hidden" />
      </section>
      <section id="board" className="board" aria-label="Bee Mine board" />

      <section className="status-panel">
        <div className="legend-lower-left">
          <p>
            <strong>Left-click</strong>: reveal tile
          </p>
          <p>
            <strong>Right-click</strong>: place flag
          </p>
          <p>
            <strong>Space</strong>: shuffle letter bank
          </p>
          <p>
            <strong>Enter</strong>: submit guess
          </p>
          <p id="legend-shift-n-new-game" className="hidden">
            <strong>Shift-N</strong>: new game
          </p>
        </div>
        <div id="unscramble" className="unscramble">
          <div id="prestart-prompt" className="prestart-prompt">
            <span id="prestart-prompt-main">CLICK ANY TILE TO BEGIN</span>
            <span className="prestart-subnote">
              BEE CAREFUL: LETTERS MAY APPEAR MULTIPLE TIMES IN THE ANSWER!
            </span>
          </div>
          <div
            id="guess-stack"
            className="guess-stack entry-pane-hidden"
            aria-hidden="true"
          >
            <div className="stats-row stats-row-bottom">
              <div id="stats-stack" className="stats">
                <button
                  id="category-label"
                  className="stats-button stats-display"
                  type="button"
                >
                  ?
                </button>
                <button
                  id="mine-count"
                  className="stats-button stats-display"
                  type="button"
                >
                  <span className="stat-icon-wrap" aria-hidden="true">
                    <img
                      className="stat-icon-image"
                      src={mineIcon}
                      alt=""
                      aria-hidden="true"
                    />
                  </span>
                  <span id="mine-count-value" className="stat-count-value">
                    0
                  </span>
                </button>
                <button
                  id="flag-count"
                  className="stats-button stats-display"
                  type="button"
                >
                  <span className="stat-icon-wrap" aria-hidden="true">
                    <img
                      className="stat-icon-image"
                      src={flagIcon}
                      alt=""
                      aria-hidden="true"
                    />
                  </span>
                  <span id="flag-count-value" className="stat-count-value">
                    0
                  </span>
                </button>
                <button
                  id="endless-new-game"
                  className="stats-button endless-new-game hidden"
                  type="button"
                >
                  New Game
                </button>
              </div>
            </div>
            <div aria-hidden="true" style={{ height: "13px" }} />
            <div className="guess-entry-row">
              <button
                id="hint-letter"
                className="hint-letter"
                type="button"
                aria-label="Reveal a hint letter"
                title="Reveal a hint letter"
              >
                <img src={lightbulbIcon} alt="" aria-hidden="true" />
              </button>
              <div
                id="word-slots"
                className="word-slots"
                aria-label="Word slots"
              />
              <button
                id="submit-guess"
                className="submit-guess"
                type="button"
                aria-label="Submit guess"
              >
                ↩
              </button>
            </div>
            <div aria-hidden="true" style={{ height: "13px" }} />
            <div className="letter-bank-row">
              <div className="letter-bank-center">
                <button
                  id="shuffle-bank"
                  className="letter-bank-shuffle"
                  type="button"
                  aria-label="Shuffle letter bank"
                  title="Shuffle letter bank"
                >
                  <img
                    className="letter-bank-shuffle-icon"
                    src={shuffleIcon}
                    alt=""
                    aria-hidden="true"
                  />
                </button>
                <div
                  id="flagged-letters"
                  className="flagged-letters"
                  aria-label="Flagged letters"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        id="help-modal"
        className="popup-modal help-modal hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-title"
        aria-hidden="true"
      >
        <div className="popup-card help-card">
          <button
            id="help-close"
            className="popup-close help-close"
            type="button"
            aria-label="Close help"
          >
            &times;
          </button>
          <h2 id="help-title" className="help-title">
            Rules
          </h2>
          <div className="help-layout">
            <div className="help-copy">
              <div aria-hidden="true" style={{ height: "8px" }} />

              <h3>How It Works</h3>

              <p>Selecting any tile begins the game.</p>
              <p>
                Each number indicates exactly how many adjacent hexagons contain
                a mine.
              </p>
              <p>
                Right-clicking a tile flags its letter. Flagged letters show up
                in the letter bank.
              </p>
              <p>Rearrange the flagged letters to find the answer.</p>
              <p>Press ENTER to submit!</p>
              <div aria-hidden="true" style={{ height: "13px" }} />

              <h3>Tips</h3>
              <p>Letters may be used multiple times.</p>
              <p>
                Clicking on uncommon letters is a useful but risky way to reveal
                more of the map.
              </p>
              <p>SPACE shuffles the letter bank.</p>
              <p>There's no timer. Just bee yourself and have fun!</p>
            </div>
          </div>
          <div className="game-actions help-actions">
            <button
              id="help-close-window"
              className="mode-option-button mode-button-active"
              type="button"
            >
              Close
            </button>
          </div>
        </div>
      </section>

      <section
        id="frequency-modal"
        className="popup-modal frequency-modal hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="frequency-title"
        aria-hidden="true"
      >
        <div className="popup-card frequency-card">
          <button
            id="frequency-close"
            className="popup-close frequency-close"
            type="button"
            aria-label="Close letter frequency"
          >
            &times;
          </button>
          <h2 id="frequency-title" className="help-title">
            Letter Frequency
          </h2>
          <p className="frequency-note">
            (Clicking on uncommon letters can be a good strategy... or a risky
            one!)
          </p>
          <div className="frequency-pages">
            <div className="frequency-page" data-frequency-page="alphabetical">
              <div
                className="frequency-columns table-modal-columns popup-columns-split"
                aria-label="English letter frequency, alphabetical"
              >
                {LETTER_FREQUENCY_COLUMNS_ALPHABETICAL.map(
                  (column, columnIndex) => (
                    <table
                      key={`frequency-alpha-column-${columnIndex}`}
                      className="table-modal-table frequency-table"
                      aria-label={`Alphabetical letter frequency column ${columnIndex + 1}`}
                    >
                      <thead>
                        <tr>
                          <th scope="col">Letter</th>
                          <th scope="col">Freq</th>
                          <th scope="col" aria-hidden="true" />
                        </tr>
                      </thead>
                      <tbody className="frequency-body">
                        {column.map(([letter, frequency]) => (
                          <tr key={letter} className="frequency-row">
                            <td>{letter}</td>
                            <td>{frequency}</td>
                            <td
                              className="frequency-bar-wrap"
                              aria-hidden="true"
                            >
                              <span
                                className="frequency-bar"
                                style={{
                                  width: `${(Number.parseFloat(frequency) / MAX_FREQUENCY_VALUE) * 50}px`,
                                }}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ),
                )}
              </div>
            </div>
            <div
              className="frequency-page hidden"
              data-frequency-page="frequency"
            >
              <div
                className="frequency-columns table-modal-columns popup-columns-split"
                aria-label="English letter frequency, by frequency"
              >
                {LETTER_FREQUENCY_COLUMNS_BY_FREQUENCY.map(
                  (column, columnIndex) => (
                    <table
                      key={`frequency-by-frequency-column-${columnIndex}`}
                      className="table-modal-table frequency-table"
                      aria-label={`Frequency-ranked letter column ${columnIndex + 1}`}
                    >
                      <thead>
                        <tr>
                          <th scope="col">Letter</th>
                          <th scope="col">Freq</th>
                          <th scope="col" aria-hidden="true" />
                        </tr>
                      </thead>
                      <tbody className="frequency-body">
                        {column.map(([letter, frequency]) => (
                          <tr key={letter} className="frequency-row">
                            <td>{letter}</td>
                            <td>{frequency}</td>
                            <td
                              className="frequency-bar-wrap"
                              aria-hidden="true"
                            >
                              <span
                                className="frequency-bar"
                                style={{
                                  width: `${(Number.parseFloat(frequency) / MAX_FREQUENCY_VALUE) * 50}px`,
                                }}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ),
                )}
              </div>
            </div>
          </div>
          <p className="frequency-source">
            Source: Robert Edward Lewand, Cryptological Mathematics
          </p>
          <div className="popup-tabs-wrap">
            <div
              className="popup-tabs"
              role="tablist"
              aria-label="Letter frequency pages"
            >
              <button
                id="frequency-page-alphabetical"
                className="popup-tab popup-tab-active"
                type="button"
                role="tab"
                aria-selected="true"
              >
                By Alphabetical Order
              </button>
              <button
                id="frequency-page-frequency"
                className="popup-tab"
                type="button"
                role="tab"
                aria-selected="false"
              >
                By Frequency
              </button>
            </div>
          </div>
        </div>
      </section>

      <section
        id="stats-modal"
        className="popup-modal stats-modal hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="stats-title"
        aria-hidden="true"
      >
        <div className="popup-card table-modal-card stats-card">
          <button
            id="stats-close"
            className="popup-close stats-close"
            type="button"
            aria-label="Close stats"
          >
            &times;
          </button>
          <h2 id="stats-title" className="help-title">
            Stats
          </h2>
          <div className="table-modal-body stats-table-wrap">
            <div className="stats-pages">
              <div className="stats-page" data-stats-page="daily">
                <section
                  className="daily-stats-grid"
                  aria-label="Daily Bee stats"
                >
                  <article className="daily-stat-card">
                    <h3 className="daily-stat-label">Win Rate %</h3>
                    <p id="stats-daily-win-rate" className="daily-stat-value">
                      --
                    </p>
                  </article>
                  <article className="daily-stat-card">
                    <h3 className="daily-stat-label">Avg. Hints</h3>
                    <p id="stats-daily-avg-hints" className="daily-stat-value">
                      --
                    </p>
                  </article>
                  <article className="daily-stat-card">
                    <h3 className="daily-stat-label">Current Streak</h3>
                    <p
                      id="stats-daily-current-streak"
                      className="daily-stat-value"
                    >
                      0
                    </p>
                  </article>
                  <article className="daily-stat-card">
                    <h3 className="daily-stat-label">Longest Streak</h3>
                    <p
                      id="stats-daily-longest-streak"
                      className="daily-stat-value"
                    >
                      0
                    </p>
                  </article>
                </section>
              </div>
              <div className="stats-page hidden" data-stats-page="endless">
                <section
                  id="stats-endless-grid"
                  className="endless-stats-grid"
                  aria-label="Endless Mode map stats grid"
                />
              </div>
            </div>
          </div>
          <div className="table-modal-actions stats-actions">
            <button id="stats-reset" className="stats-reset" type="button">
              Reset
            </button>
          </div>
          <div className="popup-tabs-wrap">
            <div className="popup-tabs" role="tablist" aria-label="Stats pages">
              <button
                id="stats-tab-daily"
                className="popup-tab popup-tab-active"
                type="button"
                role="tab"
                aria-selected="true"
              >
                Daily Bee
              </button>
              <button
                id="stats-tab-endless"
                className="popup-tab"
                type="button"
                role="tab"
                aria-selected="false"
              >
                Endless Mode
              </button>
            </div>
          </div>
        </div>
      </section>

      <section
        id="dev-modal"
        className="popup-modal dev-modal hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dev-title"
        aria-hidden="true"
      >
        <div className="popup-card dev-card">
          <button
            id="dev-close"
            className="popup-close dev-close"
            type="button"
            aria-label="Close dev stats"
          >
            &times;
          </button>
          <h2 id="dev-title" className="help-title">
            Dev: Guess Rate by Length
          </h2>
          <table
            className="table-modal-table dev-table"
            aria-label="Guess rate by letter count"
          >
            <thead>
              <tr>
                <th scope="col">Letters</th>
                <th scope="col">Guess Rate</th>
                <th scope="col">Attempts</th>
                <th scope="col">Avg. Hints</th>
              </tr>
            </thead>
            <tbody id="dev-guess-rate-body" />
          </table>
        </div>
      </section>

      <section
        id="hex-modal"
        className="popup-modal hex-modal hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="hex-title"
        aria-hidden="true"
      >
        <div className="popup-card hex-card">
          <button
            id="hex-close"
            className="popup-close hex-close"
            type="button"
            aria-label="Close hex popup"
          >
            &times;
          </button>
          <h2 id="hex-title" className="help-title">
            Levels
          </h2>
          <div className="map-grid" aria-label="Map previews">
            {[
              { page: PAGE_STANDARD, rows: [STANDARD_ROW_1, STANDARD_ROW_2] },
              { page: PAGE_BONUS, rows: [BONUS_ROW_1, BONUS_ROW_2] },
            ].map((section) => (
              <div
                key={section.page}
                className="map-grid-page"
                data-page={section.page}
              >
                {section.rows.map((row, rowIndex) => (
                  <div
                    key={`${section.page}-row-${rowIndex}`}
                    className="map-grid-row"
                  >
                    {row.map((preview) => (
                      <button
                        key={preview.id}
                        className="map-option"
                        type="button"
                        data-map-id={preview.id}
                        data-page={preview.page}
                      >
                        <span className="map-preview-wrap" aria-hidden="true">
                          <svg
                            className={`map-preview map-preview-${preview.id}`}
                            viewBox={`-2 -2 ${preview.width + 4} ${preview.height + 4}`}
                          >
                            {preview.isShuffle ? (
                              <text
                                className="preview-shuffle-label"
                                x={preview.width / 2}
                                y={preview.height / 2}
                                textAnchor="middle"
                                dominantBaseline="central"
                              >
                                ↻
                              </text>
                            ) : null}
                            {preview.tiles.map((tile) => {
                              const centerX =
                                (tile.x - preview.minX) * PREVIEW_HEX_WIDTH +
                                PREVIEW_HEX_HALF_WIDTH;
                              const centerY =
                                tile.row * PREVIEW_ROW_STEP +
                                PREVIEW_HEX_HALF_HEIGHT;
                              return (
                                <g key={tile.key}>
                                  <polygon
                                    className={`preview-hex ${tile.kind}`}
                                    points={getPreviewHexPoints(
                                      centerX,
                                      centerY,
                                    )}
                                  />
                                  {tile.kind === "inactive-yellow-eye" ? (
                                    <circle
                                      className="preview-face-eye"
                                      cx={centerX}
                                      cy={centerY}
                                      r="1.8"
                                    />
                                  ) : null}
                                  {tile.kind === "inactive-yellow-smile" ? (
                                    <path
                                      className="preview-face-smile"
                                      d={`M ${centerX - 3.8} ${centerY + 1.8} Q ${centerX} ${centerY + 5.2} ${centerX + 3.8} ${centerY + 1.8}`}
                                    />
                                  ) : null}
                                </g>
                              );
                            })}
                          </svg>
                        </span>
                        <span className="map-option-label">{preview.name}</span>
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div className="popup-tabs-wrap">
            <div className="popup-tabs" role="tablist" aria-label="Game pages">
              <button
                id="page-standard"
                className="popup-tab popup-tab-active"
                type="button"
                role="tab"
                aria-selected="true"
              >
                Standard
              </button>
              <button
                id="page-bonus"
                className="popup-tab"
                type="button"
                role="tab"
                aria-selected="false"
              >
                Bonus
              </button>
            </div>
          </div>
        </div>
      </section>

      <section
        id="daily-outcome-modal"
        className="popup-modal daily-outcome-modal hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="daily-outcome-title"
        aria-hidden="true"
      >
        <div id="daily-outcome-card" className="popup-card daily-outcome-card">
          <div id="daily-outcome-decor" className="daily-outcome-decor" aria-hidden="true">
            <div className="daily-outcome-decor-wing daily-outcome-decor-wing-left">
              {DAILY_OUTCOME_DECOR_WING_LEFT_TILES.map((tile) => (
                <span
                  key={tile.key}
                  className={`daily-outcome-decor-tile ${tile.variantClassName}`}
                  style={tile.style}
                />
              ))}
            </div>
            <div className="daily-outcome-decor-wing daily-outcome-decor-wing-right">
              {DAILY_OUTCOME_DECOR_WING_RIGHT_TILES.map((tile) => (
                <span
                  key={tile.key}
                  className={`daily-outcome-decor-tile ${tile.variantClassName}`}
                  style={tile.style}
                />
              ))}
            </div>
            {DAILY_OUTCOME_DECOR_CENTER_TILES.map((tile) => (
              <span
                key={tile.key}
                className={`daily-outcome-decor-tile ${tile.variantClassName}`}
                style={tile.style}
              >
                {tile.token === "E" ? (
                  <span className="daily-outcome-face-eye" />
                ) : null}
                {tile.token === "S" ? (
                  <span className="daily-outcome-face-smile">)</span>
                ) : null}
              </span>
            ))}
          </div>
          <div className="daily-outcome-core">
            <button
              id="daily-outcome-close"
              className="popup-close daily-outcome-close"
              type="button"
              aria-label="Close Daily Bee outcome"
            >
              &times;
            </button>
            <h2
              id="daily-outcome-title"
              className="help-title daily-outcome-title daily-outcome-title-win"
            >
              YOU WIN!
            </h2>
            <div className="daily-outcome-spacer" aria-hidden="true" />
            <p id="daily-outcome-summary" className="daily-stat-label">
              You solved today&apos;s puzzle in [hint] hints, making you a
            </p>
            <div className="daily-outcome-spacer" aria-hidden="true" />
            <p
              id="daily-outcome-rank"
              className="daily-stat-value daily-outcome-rank-pill"
            >
              [RANK] BEE
            </p>
            <div className="daily-outcome-spacer" aria-hidden="true" />
            <p className="prestart-prompt">SHARE</p>
            <div className="daily-outcome-spacer" aria-hidden="true" />
            <div className="daily-outcome-share-row">
              <div className="daily-outcome-share-option">
                <button
                  id="daily-outcome-copy"
                  className="daily-outcome-clipboard-button"
                  type="button"
                  aria-label="Copy Daily Bee result"
                >
                  <span
                    className="daily-outcome-clipboard-icon"
                    aria-hidden="true"
                  />
                </button>
                <p className="daily-outcome-share-subtitle">Copy/Paste</p>
              </div>
              <div className="daily-outcome-share-option">
                <button
                  id="daily-outcome-sms"
                  className="daily-outcome-sms-button"
                  type="button"
                  aria-label="Share Daily Bee result by SMS"
                >
                  <span className="daily-outcome-sms-icon" aria-hidden="true">
                    SMS
                  </span>
                </button>
                <p className="daily-outcome-share-subtitle">SMS</p>
              </div>
            </div>
            <div className="daily-outcome-spacer" aria-hidden="true" />
            <div className="game-actions daily-outcome-actions">
              <button
                id="daily-outcome-play-endless"
                className="mode-option-button mode-button-active"
                type="button"
              >
                PLAY ENDLESS
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
