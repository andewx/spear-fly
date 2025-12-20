## SPEAR - Synthetic Precipitative Environmental Attenuation Radar Tool

### Project Architecture
**Purpose**: Localized desktop application for parametric modeling of SAM/TER vs fighter aircraft engagements with environmental attenuation simulation.

**Stack**: Node.js + TypeScript + Express backend with React frontend (single-page application). State management is **backend-centric** - minimize client-side state logic.

**Data Flow**: All persistence via JSON files in `/src/data/*` directories. No database - use `fs.promises` for async file I/O.

### Directory Structure & Conventions
```
/src/               - TypeScript source (compiled to /dist)
  index.ts          - Application entry point
  /controllers/     - Controller classes (PlatformController, ScenarioController, SimulationController)
  /routes/          - Router configuration (router.ts wires controllers to endpoints)
  /services/        - Business logic (fileStorage, ituData, radarCalculations)
  /synthetic/       - Precipitation field generation (QuadTree, PrecipitationCell, SyntheticPrecipitationField)
  /scenario/        - Scenario modeling & path attenuation calculations
  /types/           - TypeScript interfaces & type definitions
  /templates/       - Server-side rendering templates (if needed)
  /data/            - JSON file storage (gitignored)
    /itu/           - ITU attenuation CSV (5.0-15GHz, 0.2 GHz steps, standard rain rates)
    /platforms/     - Saved fighter/SAM platform configs
    /scenarios/     - Saved scenario definitions
    /session/       - User session data
/app/site/          - Static frontend assets (served by Express)
  /css/, /js/, /resources/
/dist/              - Compiled output (generated, gitignored)
```

### Development Workflow
- **Run dev**: `npm run dev` (nodemon with ts-node, watches `/src`)
- **Build**: `npm run build` (tsc compiles to `/dist`)
- **Production**: `npm start` (runs compiled `/dist/index.js`)

### Core Domain Models (to be implemented in `/src/types/`)
**Naming Convention**: Interfaces use `I` prefix (e.g., `ISAMSystem`), type aliases use `T` prefix (e.g., `TSAMSystem`)

1. **ISAMSystem**: Nominal range (1m² RCS), pulse models (short/medium/long for integration), acquisition times (manual/auto), MEMR (Maximum Effective Missile Range), missile velocity (Mach), operating frequencies (system + missile tracking radar)
2. **IFighterPlatform**: Type (F-16/F-22/F-35), velocity, multi-aspect RCS (Swerling 2 model), AGM-88 HARM launch parameters, parametric evasion paths
3. **IScenario**: 2D grid bounds (e.g., 100km × 100km), time step, platform positions, precipitation fields
4. **IPrecipitationCell**: Center position, size, rain rate distribution (Gaussian falloff), intensity. Path-traced attenuation calculated via ITU CSV lookups
Stored as 2D array `attenuationMatrix[freqIdx][rainIdx]`. Each row = frequency (5.0 + i×0.2 GHz), each column = rain rate from `ITU_RAIN_RATES`. Access via `getAttenuation(frequency, rainRate)` with **bilinear interpolation**
- **Synthetic Precipitation Fields** (`/src/synthetic/`):
  - `PrecipitationCell`: Gaussian distribution cells with center, size (3-sigma radius), nominalRate, variance
  - `QuadTree`: Spatial indexing for O(log n) cell queries by position
  - `SyntheticPrecipitationField`: Generates random cells, samples rain rate at (x,y) via `sampleRainRate()`. Overlapping cells: take max contribution, cap at `nominalRate × maxRainRateCap`
- **Path Attenuation** (to be implemented in `/src/scenario/`): Ray trace through synthetic field, query rain rate at sample points, accumulate dB/km losses via ITU lookup
- **Engagement Logic**: Fighter engages when SAM enters vulnerability window (approaching MEMR threshold). Success = AGM kill time < SAM target kill time0, 55, 60] mm/hr. Use **bilinear interpolation** for frequency/rain rate lookups. See `ITU_RAIN_RATES` constant in types
- **Path Attenuation**: Single ray trace through precipitation cells, accumulate dB/km losses along path, apply to radar equation
- **Engagement Logic**: Fighter engages when SAM enters vulnerability window (approaching MEMR threshold). Success = AGM kill time < SAM target kill time
- **Synthetic Precip Fields**: Generate multiple cells with specified nominal rain rate, Gaussian falloff. Overlapping cells: cap at 1σ above nominal intensity (non-additive)

### UI/Visualization Requirements
- **Dark theme** with semi-transparent overlays
- **Visualization layers**: MEMR rings, detection range circles, precipitation heatmap (monochrome high-pass filter)
- Frontend controls for scenario setup, but **computation and state updates happen server-side**

### BlueJS Framework - DOM Event Binding
**Custom DOM Framework**: All DOM event handling uses the BlueJS framework instead of traditional `addEventListener()`.

**Pattern**:
```html
<button bluejs="unique-tag-id" bluejs-trigger="click" bluejs-binding="handlerName">
  Click Me
</button>
```

**Attributes**:
- `bluejs="unique-tag-id"` - Unique identifier for the element
- `bluejs-trigger="eventName"` - Event type (click, change, load, etc.)
- `bluejs-binding="handlerName"` - Name of the registered handler function
- `data-*` attributes - Pass parameters to handlers (accessed via `e.currentTarget.getAttribute('data-*')`)

**Registration**:
```javascript
// Register handler with bluejs
bluejs.addBinding('handlerName', context, handlerFunction);

// Handler signature - receives event object
function handlerFunction(e) {
  e?.preventDefault();
  const element = e.currentTarget;
  const param = element.getAttribute('data-id');
  // ... handler logic
}
```

**Key Features**:
- Automatic mutation observer watches for dynamically added elements
- Handlers automatically attached when DOM elements added
- No manual `addEventListener()` calls required
- Event object passed to all handlers with `currentTarget` reference
- Use `data-*` attributes to pass parameters instead of function arguments

**Example Usage**:
```html
<!-- Create button -->
<button bluejs="btn-create-item" bluejs-trigger="click" bluejs-binding="createItem">
  Create
</button>

<!-- Edit button with parameters -->
<button bluejs="btn-edit-<%= item.id %>" 
        bluejs-trigger="click" 
        bluejs-binding="editItem"
        data-id="<%= item.id %>"
        data-type="<%= item.type %>">
  Edit
</button>

<!-- Register handlers -->
<script>
bluejs.addBinding('createItem', null, function(e) {
  e?.preventDefault();
  openOverlay('/forms/item/create', 'Create Item');
});

bluejs.addBinding('editItem', null, function(e) {
  e?.preventDefault();
  const id = e.currentTarget.getAttribute('data-id');
  const type = e.currentTarget.getAttribute('data-type');
  openOverlay(`/forms/item/edit/${type}/${id}`, 'Edit Item');
});
</script>
```

**Best Practices**:
- Always call `e?.preventDefault()` at start of handlers
- Use `e.currentTarget` to access the bound element
- Extract parameters from `data-*` attributes
- Register all bindings before bluejs initialization or at page load
- Use unique `bluejs` IDs (include item IDs in loops: `btn-edit-<%= id %>`)
- Keep handler functions pure - no closures over loop variables

### TypeScript Configuration Notes
- `strict: true`, `noUncheckedIndexedAccess: true` - handle optionals/nulls explicitly
- `vAPI & Routing Patterns
- **RESTful endpoints** in `/src/routes/`:
  - `GET /api/platforms` - List all platforms
  - `GET /api/platforms/:id` - Get specific platform
  - `POST /api/platforms` - Create platform
  - `PUT /api/platforms/:id` - Update platform
  - `DELETE /api/platforms/:id` - Delete platform
  - Similar patterns for `/api/scenarios`, `/api/sessions`
- **Middleware**: Use concise patterns - avoid over-abstraction. Essential middleware only (JSON parsing, error handling, basic auth if needed)

### erbatimModuleSyntax: true` - use `import type` for type-only imports
- `module: "commonjs"`, `target: "es2022"` - Node.js runtime

### Data Handling Patterns
- Load ITU CSV on startup, cache in memory for interpolation
- Serialize platforms/scenarios as JSON with descriptive names
- Session management: simple in-memory sessions (optional persistence to `/src/data/session/`)




