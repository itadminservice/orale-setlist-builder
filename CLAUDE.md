# Órale — Setlist Builder

Live app: https://setlist.oraleband.com  
GitHub: https://github.com/itadminservice/orale-setlist-builder  
Netlify site ID: `137a638d-4651-4a33-8d5d-618ccfa3d0ab` (site name: `orale-setlist-app`)  
Subdomain: `setlist.oraleband.com` via CNAME → Netlify

---

## Architecture

Single-page app with no build step. All source is in two places:

| Path | Purpose |
|---|---|
| `public/index.html` | Entire frontend — HTML, CSS, and JS in one file |
| `netlify/functions/` | Three serverless Node.js functions (Notion API proxy) |
| `netlify.toml` | Netlify build config (`publish = "public"`, `functions = "netlify/functions"`) |

### Why a proxy? 
The Notion API token cannot be exposed in the browser. All Notion calls go through Netlify serverless functions that inject `NOTION_TOKEN` server-side.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Hosting | Netlify |
| Functions | Netlify serverless (Node.js, CommonJS) |
| Notion API | v2022-06-28 |
| Drag & drop | SortableJS 1.15 (CDN) |
| Frontend | Vanilla JS, no framework, no bundler |

---

## Environment Variables

| Variable | Where set | Notes |
|---|---|---|
| `NOTION_TOKEN` | Netlify dashboard → Environment Variables | Format: `ntn_...` |

---

## Netlify Functions

### `songs.js` — GET `/.netlify/functions/songs`
Queries the Notion Song Library database, returns all songs sorted A–Z.

Fields returned per song:
```
id, title, artist, key, feel, duration, youtube, tempo, status, homework, notes
```

### `save-setlist.js` — POST `/.netlify/functions/save-setlist`
Creates a new entry in the Notion Setlist Library with song relation + ordered body blocks.

Body: `{ name, songs, purpose?, date }`

### `get-setlists.js` — GET `/.netlify/functions/get-setlists`
- No params → lists all saved setlists (id, name, date, status)
- `?id=<pageId>` → returns `{ orderedIds }` for that setlist (song page IDs in order; `"BREAK"` for set breaks)

---

## Notion Database IDs

| Database | ID |
|---|---|
| 🎵 Song Library | `e59ac45e-8b84-4b48-9e8f-1df29c80c7ee` |
| 🎶 Setlist Library | `0afb7176-9d6e-4f37-b18b-7c9ac8adbfa4` |

### Song Library schema (fields used by the app)

| Notion Property | Type | Used for |
|---|---|---|
| Song Title | Title | Display, search, save |
| Artist | Rich text | Display, save |
| Key | Select | Key badge, Stage Print, Copy Text |
| Feel | Multi-select | Filter chips (`Dance`, `Soul`, `Latin`, `Rock`, `R&B`, `Slow Groove`) |
| Duration (min) | Number | Time totals |
| YouTube Reference | URL | YT badge link, Rehearsal print URL |
| Tempo | Rich text (number stored as text) | BPM in Copy Text |
| Status | Select (`Active`, `Learning`, `Retired`) | Passed through, not filtered |
| HomeWork | Checkbox | 📝 Homework filter |
| Notes | Rich text | Shown in Rehearsal print under song title |

> To add a new song: add it directly in Notion. It appears in the app on next page load — no code changes needed.

---

## Frontend Features

| Feature | How it works |
|---|---|
| Song Library panel | Loads from Notion on page load via `songs.js`; searchable by title/artist, filterable by Feel tag and Homework checkbox |
| Tap/click to add | Click a song card to add it to the setlist |
| Drag to reorder | SortableJS on setlist panel; pool supports drag-clone to setlist on desktop |
| Set Break | Inserts a visual divider; rendered as `"BREAK"` in saved ordered IDs |
| Load Setlist | Modal listing saved setlists from Notion; supports Replace or Append |
| Save to Notion | POSTs name, date, purpose, song relation, and ordered IDs to `save-setlist.js` |
| Copy Text | Plain-text list (title · key · BPM) for texting to band members |
| Stage Print | Full-screen white overlay, two-column landscape layout (num · title · key), optimized for music stand; triggers `window.print()` in landscape `@page` |
| Full Print | Uses same rendered DOM + `@media print` CSS; hides app chrome, shows header/footer, renders YouTube URL as visible text |
| Rehearsal Print | Same as Full Print but adds `body.rehearsal-print` class before printing, which reveals `.item-notes` blocks (Notion Notes field) under each song title |
| Mobile tab UI | Library / Setlist tabs below 700px; song count badge on Setlist tab |

---

## Print Architecture

The app has three distinct print modes, all using `window.print()`:

**Full Print** (`printSetlist()`): Sets `#print-header` / `#print-footer` innerHTML, calls `window.print()`. `@media print` CSS hides app chrome and re-styles `.setlist-item` elements already in the DOM.

**Stage Print** (`stagePrint()`): Builds a separate `#stage-print-overlay` div with custom HTML, adds `.visible` class, attaches `beforeprint`/`afterprint` listeners to hide siblings, sets `@page { size: landscape }`, calls `window.print()`.

**Rehearsal Print** (`printRehearsal()`): Adds `body.rehearsal-print` class, then calls `printSetlist()`. The extra class activates `body.rehearsal-print .item-notes { display: block }` in the print stylesheet, revealing per-song notes that are hidden (`display: none`) in normal view. Class is removed on `afterprint`.

---

## Deploying

**Draft preview** (non-production — safe to test):
```
netlify deploy --dir=public --functions=netlify/functions --site=137a638d-4651-4a33-8d5d-618ccfa3d0ab
```

**Production deploy:**
```
netlify deploy --dir=public --functions=netlify/functions --site=137a638d-4651-4a33-8d5d-618ccfa3d0ab --prod
```

No build step. Changes to `public/index.html` or `netlify/functions/*.js` take effect immediately on next deploy.

---

## Planned / Future Features

- Fill in Tempo (BPM) for all songs in Song Library
- Load Setlist → edit → re-save as a new version
- Ladies Night song cleanup (missing Set, Duration, Chords)
- Per-song notes field for sub musicians
