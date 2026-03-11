import { useEffect } from "react";
import { initGame } from "./script.js";
import { buildPlacedMap, HEX_GEOMETRY, mapDefinitions } from "./mapLayouts.js";
import lightbulbIcon from "./lightbulb.svg";

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
const LETTER_FREQUENCIES_ALPHABETICAL = [...LETTER_FREQUENCIES].sort(([a], [b]) =>
  a.localeCompare(b)
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
const Spacer = () => <div className="spacer" aria-hidden="true" />;

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
  ...MAP_PREVIEWS.filter((preview) => preview.page === PAGE_BONUS),
];

function splitIntoTwoRows(options) {
  const midpoint = Math.ceil(options.length / 2);
  return [options.slice(0, midpoint), options.slice(midpoint)];
}

const STANDARD_MAP_OPTIONS = MAP_OPTIONS.filter((option) => option.page === PAGE_STANDARD);
const BONUS_MAP_OPTIONS = MAP_OPTIONS.filter((option) => option.page === PAGE_BONUS);
const [STANDARD_ROW_1, STANDARD_ROW_2] = splitIntoTwoRows(STANDARD_MAP_OPTIONS);
const [BONUS_ROW_1, BONUS_ROW_2] = splitIntoTwoRows(BONUS_MAP_OPTIONS);

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
  const statsButtonClass = "stats-button";

  const renderHexWord = (word, keyPrefix) => (
    <span className="site-word" aria-label={word}>
      {[...word].map((letter, index) => (
        <span key={`${keyPrefix}-${index}`} className="site-letter-hex" aria-hidden="true">
          {letter}
        </span>
      ))}
    </span>
  );

  return (
    <main className="app">
      <div className="top-controls">
        <button
          id="frequency-open"
          className="frequency-trigger"
          type="button"
          aria-haspopup="dialog"
          aria-controls="frequency-modal"
          aria-label="Open letter frequency"
          title="letter frequency"
        >
          Aa
        </button>
        <button
          id="hex-open"
          className="hex-trigger"
          type="button"
          aria-haspopup="dialog"
          aria-controls="hex-modal"
          aria-label="Open maps"
          title="maps"
        >
          <svg viewBox="0 0 100 115.4701" aria-hidden="true">
            <polygon points="50,8 92,32.25 92,83.22 50,107.47 8,83.22 8,32.25" />
          </svg>
        </button>
        <button
          id="help-open"
          className="help-trigger"
          type="button"
          aria-haspopup="dialog"
          aria-controls="help-modal"
          aria-label="Open help"
        >
          ?
        </button>
      </div>
      <section className="panel">
        <header>
          <h1 className="site-title">
            {renderHexWord("bee", "bee")}
            <img className="site-title-icon" src="/favicon.png" alt="" aria-hidden="true" />
            {renderHexWord("mine", "mine")}
          </h1>
        </header>
        Find the mines, then unscramble the letters to form the hidden word! (Letters may be used more than once.)
        <Spacer />
        <div className="game-actions" role="tablist" aria-label="Game mode">
          <button id="daily-bee" className="mode-option-button" type="button" role="tab">
            Daily Bee
          </button>
          <button id="new-game" className="mode-option-button" type="button" role="tab">
            Endless Mode
          </button>
        </div>
        <div className="stats-row">
          <div id="stats-stack" className="stats">
            <button id="mine-count" className={`${statsButtonClass} stats-display`} type="button">
              Mines: 0
            </button>
            <button
              id="endless-new-game"
              className={`${statsButtonClass} endless-new-game hidden`}
              type="button"
            >
              New Game
            </button>
            <button id="flag-count" className={`${statsButtonClass} stats-display`} type="button">
              Flags: 0
            </button>
          </div>
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
          <p id="legend-shift-n-new-game" className="hidden">
            <strong>Shift-N</strong>: new game
          </p>
          <p>
            <strong>Shift-H</strong>: toggle help
          </p>
          <p>
            <strong>Shift-L</strong>: toggle levels
          </p>
          <p>
            <strong>Shift-A</strong>: toggle letter frequency
          </p>
        </div>
        <div id="unscramble" className="unscramble">
          <div id="prestart-prompt" className="prestart-prompt">
            CLICK ANY TILE TO BEGIN
          </div>
          <div id="guess-stack" className="guess-stack hidden">
            <p id="category-label">CATEGORY:</p>
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
              <div id="word-slots" className="word-slots" aria-label="Word slots" />
              <button
                id="submit-guess"
                className="submit-guess"
                type="button"
                aria-label="Submit guess"
              >
                ↩
              </button>
            </div>
            <div id="flagged-letters" className="flagged-letters" aria-label="Flagged letters" />
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
          <button id="help-close" className="popup-close help-close" type="button" aria-label="Close help">
            &times;
          </button>
          <h2 id="help-title" className="help-title">
            Rules
          </h2>
          <div className="help-layout">
            <div className="help-copy">
              <h3>How It Works</h3>
              <ul className="help-list">
                <li>Click any tile to begin. The first clicked letter is guaranteed to be safe.</li>
                <li>Numbers show how many neighboring tiles hide letters from the secret word.</li>
                <li>Right-click a suspicious tile to flag its letter, then use the flagged letters to build your guess.</li>
                <li>Letters may be used more than once. Press Enter to submit your guess.</li>
              </ul>
              <h3>Tips</h3>
              <ul className="help-list">
                <li>Not all puzzles are perfectly solvable, so sometimes you still need to make an informed guess.</li>
                <li>If your letter bank gets cluttered, press Space to reshuffle it into a new order.</li>
              </ul>
            </div>
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
            Clicking on uncommon letters is a risky but valid way to gain information early.
          </p>
          <div className="frequency-pages">
            <div className="frequency-page" data-frequency-page="alphabetical">
              <div className="frequency-columns" aria-label="English letter frequency, alphabetical">
                {LETTER_FREQUENCY_COLUMNS_ALPHABETICAL.map((column, columnIndex) => (
                  <div
                    key={`frequency-alpha-column-${columnIndex}`}
                    className="frequency-table"
                    role="table"
                    aria-label={`Alphabetical letter frequency column ${columnIndex + 1}`}
                  >
                    <div className="frequency-body" role="rowgroup">
                      {column.map(([letter, frequency]) => (
                        <div key={letter} className="frequency-row" role="row">
                          <span role="cell">{letter}</span>
                          <span role="cell">{frequency}</span>
                          <span className="frequency-bar-wrap" role="cell" aria-hidden="true">
                            <span
                              className="frequency-bar"
                              style={{
                                width: `${(Number.parseFloat(frequency) / MAX_FREQUENCY_VALUE) * 50}px`,
                              }}
                            />
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="frequency-page hidden" data-frequency-page="frequency">
              <div className="frequency-columns" aria-label="English letter frequency, by frequency">
                {LETTER_FREQUENCY_COLUMNS_BY_FREQUENCY.map((column, columnIndex) => (
                  <div
                    key={`frequency-by-frequency-column-${columnIndex}`}
                    className="frequency-table"
                    role="table"
                    aria-label={`Frequency-ranked letter column ${columnIndex + 1}`}
                  >
                    <div className="frequency-body" role="rowgroup">
                      {column.map(([letter, frequency]) => (
                        <div key={letter} className="frequency-row" role="row">
                          <span role="cell">{letter}</span>
                          <span role="cell">{frequency}</span>
                          <span className="frequency-bar-wrap" role="cell" aria-hidden="true">
                            <span
                              className="frequency-bar"
                              style={{
                                width: `${(Number.parseFloat(frequency) / MAX_FREQUENCY_VALUE) * 50}px`,
                              }}
                            />
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <p className="frequency-source">
            Source: Robert Edward Lewand, Cryptological Mathematics
          </p>
          <div className="popup-tabs-wrap">
            <div className="popup-tabs" role="tablist" aria-label="Letter frequency pages">
              <button
                id="frequency-page-alphabetical"
                className="popup-tab popup-tab-active"
                type="button"
                role="tab"
                aria-selected="true"
              >
                Alphabetical
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
        id="hex-modal"
        className="popup-modal hex-modal hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="hex-title"
        aria-hidden="true"
      >
        <div className="popup-card hex-card">
          <button id="hex-close" className="popup-close hex-close" type="button" aria-label="Close hex popup">
            &times;
          </button>
          <h2 id="hex-title" className="help-title">Levels</h2>
          <div className="map-grid" aria-label="Map previews">
            {[{ page: PAGE_STANDARD, rows: [STANDARD_ROW_1, STANDARD_ROW_2] }, { page: PAGE_BONUS, rows: [BONUS_ROW_1, BONUS_ROW_2] }].map((section) => (
              <div key={section.page} className="map-grid-page" data-page={section.page}>
                {section.rows.map((row, rowIndex) => (
                  <div key={`${section.page}-row-${rowIndex}`} className="map-grid-row">
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
                              const centerX = (tile.x - preview.minX) * PREVIEW_HEX_WIDTH + PREVIEW_HEX_HALF_WIDTH;
                              const centerY = tile.row * PREVIEW_ROW_STEP + PREVIEW_HEX_HALF_HEIGHT;
                              return (
                                <g key={tile.key}>
                                  <polygon
                                    className={`preview-hex ${tile.kind}`}
                                    points={getPreviewHexPoints(centerX, centerY)}
                                  />
                                  {tile.kind === "inactive-yellow-eye" ? (
                                    <circle className="preview-face-eye" cx={centerX} cy={centerY} r="1.8" />
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
    </main>
  );
}
