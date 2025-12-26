## SPEAR - Synthetic Precipitative Environmental Attenuation Radar Tool

### Project Architecture
**Purpose**: Desktop application for parametric modeling of SAM/TER vs fighter aircraft engagements with environmental attenuation simulation.

**Stack**: Node.js + TypeScript + Express backend with vanilla JavaScript frontend (single-page application). State management is **backend-centric** - minimize client-side state logic.

**Data Flow**: All persistence via JSON files in `/data/*` directories (mapped from `/src/data` at build). No database - use `fs.promises` for async file I/O.

### Directory Structure
```
/src/               - TypeScript source (ES modules, compiled to /dist)
  index.ts          - Express app entry, readline CLI commands
  /controllers/     - Controller classes (handle req/res, call services)
  /routes/          - router.ts wires controllers to endpoints
  /services/        - Business logic (fileStorage, ituData, radarCalculations, templateRenderer)
  /synthetic/       - Precipitation field generation (QuadTree, PrecipitationCell, SyntheticPrecipitationField)
  /scenario/        - Scenario modeling (Fighter, SAMSystem, Radar, PathAttenuation)
  /types/           - TypeScript interfaces (I* prefix), type aliases (T* prefix)
  /templates/       - EJS templates (layouts/main.ejs, views/*, partials/*)
  /data/            - JSON storage (production uses /data, dev uses src/data)
    /itu/           - attenuationParams.csv (5.0-15GHz, 0.2 GHz steps)
    /platforms/     - {type}_{id}.json (e.g., sam_sam-s400.json)
    /scenarios/     - scenario-{id}.json
/app/site/          - Static assets (served by Express)
  /js/              - blue.js (custom DOM framework), overlay.js, api.js, visualization.js
  /css/, /fonts/
/dist/              - Compiled TypeScript output (gitignored)
```

### Development Workflow
- **Dev**: `npm run dev` - nodemon watches `/src`, rebuilds on `.ts/.json/.ejs` changes, runs `dist/index.js`
- **Build**: `npm run build` - `tsc && copy:templates && copy:data` (copies templates + data to dist/)
- **Production**: `npm start` - runs `node dist/index.js` (port 3000, override with `PORT` env var)
- **Debug**: `npm run debug` - runs with `--inspect-brk=9229` for breakpoints
- **Docker**: Multi-stage Dockerfile (node:22 build, node:22-slim runtime, exposes port 3000)

### ES Modules Configuration
**Critical**: This project uses ES modules (`"type": "module"` in package.json), NOT CommonJS.
- **Import syntax**: `import * as foo from './foo.js'` (always include `.js` extension)
- **Type-only imports**: `import type { IFoo } from './types/index.js'`
- **No `require()`**: Use `import` statements
- **`__dirname` replacement**: 
  ```typescript
  import { fileURLToPath } from 'url';
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  ```
- **tsconfig.json**: `module: "ES2022"`, `target: "ES2022"`, `verbatimModuleSyntax: false`

### Core Domain Models (`/src/types/index.ts`)
**Naming Convention**: Interfaces use `I` prefix, type aliases use `T` prefix

Key interfaces:
- **ISAMSystem**: `{ id, name, nominalRange, pulseModel, manualAcquisitionTime, autoAcquisitionTime, memr, missileVelocity, systemFrequency, missileTrackingFrequency }`
- **IFighterPlatform**: `{ id, type, velocity, rcs: IRCSProfile, harmParams: IHARMParameters }` (note: `harmParams` in JSON, not `harm`)
- **IScenario**: `{ id, name, bounds: { width, height }, timeStep, samPosition, fighterPosition, precipitationField }`
- **IPrecipitationCell**: Gaussian distribution cells - center, size (3-sigma radius), nominal rain rate
- **ISimulationState**: Runtime state - `{ time, sam: IPlatformState, fighter: IPlatformState, missiles: IMissileState[] }`

### Routing & Controller Patterns
**Router**: `/src/routes/router.ts` instantiates controllers, maps routes:
```typescript
router.get('/platforms', (req, res) => platformController.listAll(req, res));
router.post('/platforms', (req, res) => platformController.create(req, res));
```

**Controllers**: Handle HTTP requests, delegate to services, render views:
```typescript
async listAll(req: Request, res: Response): Promise<void> {
  const platforms = await storage.listAllPlatforms();
  const isAPIRequest = req.originalUrl.startsWith('/api/');
  if (!isAPIRequest) {
    await sendView(res, 'platforms', { samSystems, fighters }, { title: 'Platforms', page: 'platforms' });
  } else {
    res.json({ success: true, data: platforms });
  }
}
```

**Dual endpoints**: `/api/platforms` returns JSON, `/platforms` renders HTML (detected via `req.originalUrl.startsWith('/api/')`)

### Template Rendering (`/src/services/templateRenderer.ts`)
**Pattern**: Controllers use `sendView(res, viewName, data, options)` or `sendViewOrJSON()`
- Views stored in `/src/templates/views/*.ejs`
- Layouts in `/src/templates/layouts/main.ejs` (wraps `<%- body %>` with navbar, scripts)
- Options: `{ layout: 'main' | false, page: 'home' | 'platforms' | 'scenarios', title: 'Page Title' }`
- Pass `layout: false` for partial HTML (overlay forms)

### BlueJS Framework - Custom DOM Event Binding
**Critical**: DO NOT use `addEventListener()`. Use BlueJS declarative attributes instead.

**HTML Pattern**:
```html
<button bluejs="btn-edit-<%= item.id %>" 
        bluejs-trigger="click" 
        bluejs-binding="editItem"
        data-id="<%= item.id %>"
        data-type="<%= item.type %>">
  Edit
</button>
```

**JavaScript Registration** (in page `<script>` or `/app/site/js/bindings.js`):
```javascript
bluejs.addBinding('editItem', null, function(e) {
  e?.preventDefault();
  const id = e.currentTarget.getAttribute('data-id');
  const type = e.currentTarget.getAttribute('data-type');
  openOverlay(`/forms/item/edit/${type}/${id}`, 'Edit Item');
});
```

**Key Rules**:
- `bluejs` ID must be unique (use `btn-edit-<%= id %>` in loops)
- `bluejs-trigger` = event type (click, change, load, submit)
- `bluejs-binding` = handler function name (registered via `addBinding()`)
- Pass data via `data-*` attributes, extract in handler with `e.currentTarget.getAttribute()`
- Always call `e?.preventDefault()` at start of handlers
- MutationObserver auto-attaches handlers to dynamically added elements

### Overlay/Modal Pattern (`/app/site/js/overlay.js`)
**Usage**: Forms (create/edit platforms/scenarios) load in overlays:
```javascript
openOverlay('/forms/platform/edit/sam/sam-s400', 'Edit SAM System');
```
- Fetches HTML from server (controller returns `layout: false` for partial)
- Inserts into `#overlayBody`, calls `bluejs.register()` to bind new elements
- Submit handlers call API endpoints, close overlay on success

### Data Storage Patterns (`/src/services/fileStorage.ts`)
**File naming**: `{type}_{id}.json` (e.g., `sam_sam-s400.json`, `fighter_fighter-f16.json`, `scenario-01-clear.json`)

**Key functions**:
```typescript
await storage.loadSAMPlatform(id);      // Reads /data/platforms/sam_{id}.json
await storage.saveSAMPlatform(data);    // Writes /data/platforms/sam_{data.id}.json
await storage.listAllPlatforms();       // Returns { sams: ISAMSystem[], fighters: IFighterPlatform[] }
```

**Data directory**: Production uses `/data` (`DATA_DIR` env var), dev uses `src/data`. Build script copies via `npm run copy:data`.

### ITU Attenuation Data (`/src/services/ituData.ts`)
**CSV Format**: `/src/data/itu/attenuationParams.csv` - matrix with NO headers:
- Each **row** = frequency (5.0 + rowIndex × 0.2 GHz)
- Each **column** = rain rate from `ITU_RAIN_RATES` array [0.01, 0.1, 0.2, 0.5, 1, 2, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60] mm/hr
- Each cell = attenuation in dB/km

**Access**: `getAttenuation(frequency, rainRate)` with **bilinear interpolation**. Cached in memory at startup via `loadITUData()`.

### Synthetic Precipitation Fields (`/src/synthetic/`)
**Components**:
- `PrecipitationCell`: Gaussian distribution - `{ center, size, nominalRate, variance }`
- `QuadTree`: Spatial indexing for O(log n) cell queries by position
- `SyntheticPrecipitationField`: Generates random cells, `sampleRainRate(x, y)` queries overlapping cells, takes max contribution, caps at `nominalRate × maxRainRateCap`

**Path Attenuation**: Ray trace through field, sample rain rate at intervals, accumulate dB/km losses via ITU lookup.

### TypeScript Patterns
- **Strict mode**: `strict: true`, `noUncheckedIndexedAccess: true` (array access returns `T | undefined`)
- **Handle nulls explicitly**: Use optional chaining (`obj?.prop`), nullish coalescing (`obj ?? default`)
- **Type imports**: `import type { IFoo }` for type-only imports (prevents runtime imports)
- **Error handling**: Controllers wrap in try/catch, call `this.handleError(res, error)`

### API Response Format
```typescript
type TAPIResponse<T> = { success: true; data: T } | { success: false; error: string };
```
All `/api/*` endpoints return this format. Frontend checks `response.success` before accessing `response.data`.

### Simulation Runtime (`/src/controllers/SimulationController.ts`)
**Endpoints**:
- `POST /simulation/init` - Load scenario, initialize state
- `POST /simulation/step` - Advance one time step
- `POST /simulation/run` - Run full simulation
- `GET /simulation/state` - Get current simulation state
- `POST /simulation/reset` - Reset to initial state

**State management**: Controller maintains `ISimulationState` in memory, updates platform positions, missile trajectories, checks kill conditions.




