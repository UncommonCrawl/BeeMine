# Map Layout Framework

All map layout logic is centralized in [`mapLayouts.js`](/Users/keithherrmann/Downloads/BeeMine/mapLayouts.js).

## Row Format

- Every map is defined as an array of row specs.
- Supported compact notation:
  - `5` = five active tiles (`AAAAA`)
  - `D4D` = decorative, four active, decorative
  - `D3G3D` = decorative, three active, three gaps, decorative
  - `S` = one smile tile
- Supported explicit tokens:
  - `A` active
  - `B` decorative black
  - `E` decorative yellow-eye
  - `S` decorative yellow-smile
  - `.` gap
- Letter tokens (`D`, `G`, `A`, `B`, `E`, `S`, `.`) are always single-tile tokens.
- Numbers always mean a run of active tiles.

Example:

```txt
5
4
5
```

```txt
D3G3D
4
```

## Ground Rules Enforced

- Hexes are point-up vertical.
- Rows are horizontally centered in the stack by default.
- Neighboring logic uses the six canonical hex directions.
- Border/mine counts are computed from active (`A`) tiles only.
- Decorative and gap tiles do not affect mine adjacency.
- Unknown tokens throw validation errors.
- Rows are auto-centered by default.

## Adding A New Map

1. Open [`mapLayouts.js`](/Users/keithherrmann/Downloads/BeeMine/mapLayouts.js).
2. Add a new entry in `RAW_MAP_DEFINITIONS` with `id`, `name`, `category` (`standard` or `bonus`), and `rows`.
3. Use `G` (or `.`) to add explicit gaps where needed.
4. If you need a custom start position, use optional `rowStarts`.
5. Run `npm run build` to validate and compile.

The board renderer (`script.js`) and map preview UI (`app.jsx`) both use this same source, so new maps appear consistently in both places.
