# Eco-Tracker

A carbon footprint and tree-planting tracker micro-frontend. Track trees you plant, log daily carbon activities, monitor your net environmental impact, set goals, and earn achievements — all stored locally in your browser.

## What It Does

Eco-Tracker helps you understand and reduce your carbon footprint through four main areas:

| Area | Description |
|------|-------------|
| **Dashboard** | At-a-glance view of your net impact — total CO2 offset vs emissions, recent activity, and quick actions |
| **Trees** | Plant and track trees with species info, geolocation, CO2 offset calculations, and health timelines |
| **Footprint** | Log carbon-producing activities (transport, food, energy, shopping) with automatic CO2e calculations |
| **Insights** | Trends, goals, achievements, contextual tips, and data export |

## Architecture

Eco-Tracker is a **remote micro-frontend** loaded dynamically by the shell host app via Module Federation.

```
apps/eco-tracker/           # Angular app (port 4208)
libs/eco-tracker/
  ├── data-access/          # Services, models, storage, static data
  ├── ui/                   # Reusable UI components (cards, charts, map, badges)
  ├── feature-dashboard/    # Dashboard page
  ├── feature-trees/        # Trees feature (list, form, detail, species)
  ├── feature-footprint/    # Footprint feature (log, list, breakdown)
  └── feature-insights/     # Insights feature (trends, goals, achievements)
```

**Key tech:** Angular 21, Bootstrap 5, Leaflet (maps), ng2-charts (charts), localforage (IndexedDB storage), Nominatim (reverse geocoding).

## Pages and Routes

All routes are nested under `/eco-tracker` when loaded inside the shell.

| Route | Page | Description |
|-------|------|-------------|
| `/` | Dashboard | Net impact overview, charts, recent trees and activities |
| `/trees` | Tree List | All planted trees in a grid, with search and filters |
| `/trees/new` | Plant Tree | Form to plant a new tree — pick species, date, location, optional GPS |
| `/trees/species` | Species Encyclopedia | Browse 25+ tree species with CO2 data and care tips |
| `/trees/:id` | Tree Detail | Individual tree info, CO2 offset, event timeline (watered, measured, etc.) |
| `/footprint` | Activity Log | List of all logged carbon activities with delete option |
| `/footprint/log` | Log Activity | Form to log an activity — pick category, type, enter amount |
| `/footprint/breakdown` | Breakdown | Emissions breakdown by category with charts |
| `/insights` | Insights | Net impact summary, monthly trends, contextual tips, data export |
| `/insights/goals` | Goals | Set monthly targets (emission limit, trees planted, offset target) |
| `/insights/achievements` | Achievements | 18 milestones to unlock based on trees, offsets, streaks, and goals |

## Data and Storage

All data is stored **locally in the browser** using IndexedDB (via localforage). Nothing is sent to a server.

**Data stores:**

- `trees` — planted trees with species, date, location, coordinates
- `tree-events` — timeline events per tree (planted, watered, measured, pruned, health-check, note)
- `activities` — carbon activities with category, type, value, and calculated CO2e
- `goals` — monthly targets you set
- `achievements` — unlocked milestones

**Static reference data (built-in):**

- **25 tree species** with CO2 absorption rates, growth info, and care tips
- **29 emission factors** across 4 categories (transport, food, energy, shopping)
- **18 achievements** with unlock thresholds

**External API:** [Nominatim](https://nominatim.openstreetmap.org/) (OpenStreetMap) for reverse geocoding when planting a tree with GPS.

## How to Use

### Step 1 — Start the app

From the monorepo root, run one of:

```bash
# Full setup — shell + all remotes
npm start

# Lightweight — shell + eco-tracker only (recommended for development)
npm run dev

# Standalone — eco-tracker by itself on port 4208
npm run start:eco-tracker
```

Then open:
- **http://localhost:4200/eco-tracker** (via shell)
- **http://localhost:4208** (standalone)

### Step 2 — Plant your first tree

1. From the Dashboard, tap **Plant a Tree** (or the green FAB on mobile)
2. Select a **species** from the dropdown — CO2 absorption rate is shown
3. Set the **date planted**
4. Optionally enter a **location name** or tap the map to **drop a GPS pin**
5. Add any **notes**
6. Tap **Save** — the tree now appears in your list and its CO2 offset starts counting

### Step 3 — Log a carbon activity

1. Navigate to **Footprint** → **Log Activity** (or use the FAB)
2. Pick a **category**: Transport, Food, Energy, or Shopping
3. Pick a **type** (e.g., Car trip, Beef meal, Electricity usage)
4. Enter the **amount** with the shown unit (km, kg, kWh, etc.)
5. The CO2e is calculated automatically using built-in emission factors
6. Tap **Save**

### Step 4 — Check your impact

- **Dashboard** shows your **net status**: are you carbon-positive or carbon-negative?
- **Footprint → Breakdown** shows emissions split by category with charts
- **Insights** shows monthly trends, net impact over time, and contextual tips

### Step 5 — Set goals and earn achievements

1. Go to **Insights → Goals**
2. Add a goal: monthly emission limit, tree target, or offset target
3. Track progress with visual progress bars
4. Go to **Insights → Achievements** to see 18 milestones — plant 10 trees, offset 100kg CO2, maintain a 7-day logging streak, and more

### Step 6 — Export your data

From the **Insights** page, tap **Export Data** to download all your trees, activities, goals, and achievements as a JSON file.

## Services Reference

| Service | What it does |
|---------|--------------|
| `TreeService` | CRUD for trees and tree events, species lookup, CO2 offset calculations |
| `FootprintService` | CRUD for activities, category breakdown, monthly totals, logging streak |
| `InsightsService` | Net impact calculation, monthly trends, goals, achievements, tips, export |
| `StorageService` | IndexedDB persistence via localforage |
| `GeoService` | Browser geolocation, reverse geocoding via Nominatim |

## Theme

Eco-Tracker uses the **Flatly** Bootswatch theme with custom eco-green CSS variables:

| Variable | Value | Usage |
|----------|-------|-------|
| `--eco-primary` | `#40916c` | Buttons, headings, active states |
| `--eco-secondary` | `#52b788` | Accents, hover states |
| `--eco-accent` | `#95d5b2` | Badges, highlights |
| `--eco-warning-color` | `#e76f51` | Emission badges, alerts |
| `--eco-bg` | `#f8fdf6` | Page background |
| `--eco-text` | `#1b4332` | Body text |
