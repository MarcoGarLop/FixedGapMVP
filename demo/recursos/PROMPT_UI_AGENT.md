# Prompt: FixedGap UI/UX Implementation Agent

> Use this document as full context to build or refine the FixedGap user-facing interfaces.
> It covers architecture, data flow, visual identity, and every file the agent may need to touch.

---

## 1. PROJECT IDENTITY

**FixedGap** is a post-stroke motor rehabilitation telemonitoring Software as a Medical Device (SaMD).  
It uses **MediaPipe Hand Landmarker** (21 3D keypoints, 30fps webcam) + **gamified 3D scenes** (Three.js) to capture fine motor biomarkers during gameplay, then uploads structured clinical data to **Supabase** (PostgreSQL).

**Current stage:** Pilot — collecting normative data from healthy volunteers to build a comparison database before introducing patients.

---

## 2. TECH STACK

| Layer | Technology |
|-------|-----------|
| Build | Vite 8 (ESM, `esnext` target) |
| UI rendering | Vanilla JS (no React/Vue/Svelte) |
| 3D | Three.js r184 |
| Animations | GSAP 3.15 |
| Hand tracking | @mediapipe/tasks-vision 0.10.35 |
| Backend/Auth/DB | Supabase JS v2.110 (PostgreSQL 15+) |
| Font | Nunito (600, 700, 800) via Google Fonts |
| Dev server | localhost:5173 (fixed port) |

---

## 3. VISUAL IDENTITY & STYLE GUIDE

### Color Palette (from `styles.css`)

| Role | Value | Usage |
|------|-------|-------|
| Background (games) | `#f4ede4` | Warm cream, base body |
| Background (UI screens) | `linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)` | Dark blue gradient for auth/dashboard |
| Primary accent | `#4facfe` → `#00f2fe` (gradient) | Buttons, avatars, links |
| Success green | `#6bab7d` / `#5a9a6c` | Game "Next" button, OK states |
| Error red | `#ff6b6b` / `#ff4757` | Error messages, delete icons |
| Text primary (dark bg) | `#fff` | Titles on dark screens |
| Text secondary (dark bg) | `#a8c4e0` / `#8da9c4` | Subtitles, labels |
| Text primary (light bg) | `#3d3428` / `#2A2218` | Game HUD text |
| Text secondary (light bg) | `#8a7d6d` / `#6b5d4d` | Muted labels |
| Card surface (glassmorphism) | `rgba(255, 255, 255, 0.05)` + `backdrop-filter: blur(16px)` | Auth cards, subject cards |
| Borders (glassmorphism) | `rgba(255, 255, 255, 0.1)` | Card borders |

### Typography

- **Font family:** `'Nunito', sans-serif` everywhere
- **Weights:** 600 (body), 700 (labels, buttons), 800 (titles, numbers)
- **Titles:** 32px, weight 800, letter-spacing -0.5px
- **Labels/uppercase:** 13px, weight 700, letter-spacing 0.5px, uppercase
- **Body:** 15px, weight 600

### Component Patterns

- **Cards:** `border-radius: 24px` (auth), `16px` (subject cards), `12px` (inputs/buttons)
- **Buttons primary:** gradient bg `#4facfe → #00f2fe`, text `#0f1c2e`, weight 800, shadow `0 10px 20px rgba(0,242,254,0.3)`
- **Buttons secondary:** `rgba(255,255,255,0.1)` bg, `1px solid rgba(255,255,255,0.2)` border
- **Inputs:** `rgba(0,0,0,0.2)` bg, `1px solid rgba(255,255,255,0.15)` border, `border-radius: 12px`, focus: border `#4facfe` + blue glow
- **Hover:** `translateY(-2px)` or `translateY(-4px)` for cards, scale(1.03-1.05)
- **Loading:** spinner with `border-top-color` animation
- **Transitions:** GSAP for page/view transitions (fade+slide, elastic error shake)

### Animation Philosophy (GSAP)

- **Page enter:** `opacity: 0, y: 20-30` → `opacity: 1, y: 0`, duration 0.4-0.6s, ease `power3.out`
- **Page exit:** `opacity: 0, y: -30` or `x: -20`, duration 0.3-0.4s, ease `power2.in`
- **Error shake:** `fromTo x: -10 → 0`, ease `elastic.out(1, 0.3)`
- **Cards appear:** stagger 0.05-0.1s per card
- **Button press:** scale(0.95-0.98) feedback

---

## 4. APPLICATION FLOW

```
init() → getCurrentUser()
  ├── User logged in  → renderDashboard()
  └── No user         → renderLogin()

renderLogin()
  └── login(username, password) → onSuccess → renderDashboard()

renderDashboard()
  ├── "Nuevo Sujeto" → renderCreateSubject()
  ├── "Ir al Dashboard Clínico" → /dashboard/ (separate prebuilt SPA)
  ├── "Cerrar Sesión" → logout() → renderLogin()
  └── Click subject card → setActiveSubject(id) → runDemo()

renderCreateSubject()
  ├── Submit → createSubject(data) → onCreated → renderDashboard()
  └── Cancel → renderDashboard()

runDemo()
  ├── startPlaythrough()
  ├── for each game in [pastillero, jarra, interruptores]:
  │     startGame(name) → waitForNext() → cleanup()
  ├── commitPlaythrough('right') → uploads to Supabase (blocking, shows loader)
  └── renderDashboard()
```

---

## 5. FILE MAP (relevant to UI/UX)

### Entry & Core
| File | Purpose |
|------|---------|
| `index.html` | Single page, loads Nunito font + `/src/styles.css` + `/src/main.js` |
| `src/main.js` | App orchestrator: routing between login/dashboard/create/game flow |
| `src/styles.css` | ALL styles (736 lines): game HUD, clinical view, auth, dashboard, chat |
| `src/menu.js` | Legacy menu (not currently used in main flow) |
| `src/tetrisLoader.js` | Loading spinner screen component |

### UI Views (vanilla JS, inject innerHTML, use GSAP)
| File | Purpose |
|------|---------|
| `src/ui/loginView.js` | Login form with username/password, GSAP animations, error handling |
| `src/ui/dashboardView.js` | Subject list, header with operator name, buttons (new subject, clinical dashboard, logout) + chat widget init |
| `src/ui/createSubjectView.js` | Form: display_name, birth_year, sex, dominant_hand, subject_type, notes |
| `src/ui/chatWidget.js` | Floating chat FAB + drawer (conversations list, message view, new chat) |
| `src/ui/nextButton.js` | In-game "Next" button overlay (clay 3D style), resolves a Promise on click or `demo:next` event |

### Database Layer (Supabase)
| File | Purpose |
|------|---------|
| `src/database/supabaseClient.js` | Singleton `createClient(URL, KEY)` from env vars |
| `src/database/auth.js` | `login(username, pw)` (fake domain `@fixedgap.local`), `logout()`, `getCurrentUser()`, `getOperatorProfile()` |
| `src/database/subjects.js` | CRUD: `createSubject()`, `listSubjects()`, `getSubject()`, `deactivateSubject()` |
| `src/database/sessions.js` | `createSession(subjectId)`, `updateSessionQuality()`, `listSessionsForSubject()` |
| `src/database/uploadSession.js` | `uploadPlaythrough(subjectId, games)` — orchestrates session creation + game_results inserts |
| `src/database/metricsTransform.js` | `transformGameResult(finalized, sessionId, playOrder, accumulator)` — maps 38+ metric columns |
| `src/database/chat.js` | Realtime messaging: `createConversation()`, `loadConversations()`, `loadMessages()`, `sendMessage()`, `subscribeToMessages()` |
| `src/database/index.js` | Re-exports all database modules |

### Clinical / Metrics
| File | Purpose |
|------|---------|
| `src/clinical/metrics.js` | Per-frame `computeHandMetrics(landmarks)` — 1-Euro filter, SPARC FFT, tremor Hz, quality gate |
| `src/clinical/sessionMetrics.js` | `BiomarkerAccumulator` class — accumulates frames during game, segments by repetition, produces `finalize()` output |
| `src/clinical/sessionRecorder.js` | `startPlaythrough()`, `recordGame()`, `commitPlaythrough()` — persists to localStorage + Supabase |
| `src/clinical/clinicalView.js` | Real-time clinical dashboard overlay (10-card grid with live hand tracking) |

### Games
| File | Purpose |
|------|---------|
| `src/games/pastillero/game.js` | Pill sorting game (pinch precision) — uses PinchDetector, Hand3D |
| `src/games/jarra/game.js` | Water pouring game (wrist rotation) — uses WristRotationDetector |
| `src/games/interruptores/game.js` | Switch flipping game (bilateral, middle-finger pinch) — two-hand tracking |

---

## 6. DATABASE SCHEMA (Supabase)

### Tables
- **operators** — `id` (linked to auth.users), `username` (unique), `display_name`
- **subjects** — `id`, `operator_id` (FK), `display_name`, `birth_year`, `sex`, `dominant_hand`, `subject_type`, `patient_data` (jsonb), `notes`, `is_active`
- **sessions** — `id`, `subject_id`, `operator_id`, `started_at`, `ended_at`, `completed`, `games_played`, `device` (jsonb), `quality_frames_pct`, `avg_fps`
- **game_results** — `id`, `session_id`, `game_key`, `play_order`, `duration_ms`, + **38 metric columns** organized by domain (A-L) + `repetitions` (jsonb), `outcome` (jsonb), `metrics_display` (jsonb)
- **conversations** — `id`, `type` (direct/group), `name`
- **conversation_participants** — `conversation_id`, `operator_id`, `hidden`
- **messages** — `id`, `conversation_id`, `sender_id`, `content`

### Auth Model
- Username-only login (privacy requirement: NO email collection)
- Implementation: `supabase.auth.signInWithPassword({ email: username + '@fixedgap.local', password })`
- Email confirmation disabled in Supabase settings
- Operators table stores the actual `username` for display

### Row Level Security
- Each operator sees ONLY their own subjects/sessions/game_results
- Operators can see all other operators (needed for chat directory)
- Messages visible only to conversation participants

### Data Flow: Game → Database
```
Game finishes → BiomarkerAccumulator.finalize()
  → recordGame(finalized, accumulator)  [stores in memory]
  
All 3 games done → commitPlaythrough('right')
  → localStorage persist (legacy)
  → uploadPlaythrough(subjectId, games)
    → createSession(subjectId)  [inserts session row]
    → for each game:
        transformGameResult(finalized, sessionId, order, accumulator)
        → insert into game_results [flat columns]
    → updateSessionQuality(sessionId, %, fps)
    → trigger auto-updates: games_played, completed, ended_at
```

---

## 7. KEY CONSTRAINTS & REQUIREMENTS

1. **No email collection** — operators identified by username only (pilot privacy requirement)
2. **Non-destructive upload** — localStorage always works; Supabase upload is best-effort but now blocking (shows loader, reports errors)
3. **Incremental DB design** — new metrics added via `ALTER TABLE ADD COLUMN`, never destructive migrations
4. **3-game sequence is mandatory** — pastillero → jarra → interruptores, always in that order
5. **Subject selection required before gameplay** — `setActiveSubject(id)` must be called
6. **GSAP for all transitions** — no CSS-only page transitions; use GSAP for consistency
7. **Single `styles.css` file** — all styles live here, no CSS modules or separate files
8. **Vanilla JS only** — no frameworks, no JSX, no build-time templating
9. **`#app` is the root container** — all views render inside `document.getElementById('app')`
10. **Views are functions** that receive `container` and inject innerHTML, then wire event listeners

---

## 8. CURRENT UI ISSUES / IMPROVEMENT AREAS

- The dashboard could show subject session history (last played, total sessions)
- No confirmation dialog before starting a game session
- No way to edit or view subject details after creation
- The chat widget could benefit from unread message count
- Mobile/tablet responsiveness is not addressed
- The loading screen between games is minimal
- No visual feedback for successful Supabase upload beyond console.log

---

## 9. HOW TO ADD A NEW VIEW

Pattern used throughout the app:

```javascript
import gsap from 'gsap';

export function showMyView(container, onComplete, onCancel) {
  container.innerHTML = `
    <div class="my-screen">
      <!-- HTML structure -->
    </div>
  `;

  const screen = container.querySelector('.my-screen');
  
  // Entry animation
  gsap.fromTo(screen, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' });

  // Wire events
  document.getElementById('my-btn').addEventListener('click', () => {
    // Exit animation
    gsap.to(screen, { opacity: 0, duration: 0.3, onComplete: () => onComplete(data) });
  });
}
```

Then in `main.js`:
```javascript
function renderMyView() {
  app.innerHTML = '';
  showMyView(app, (result) => { renderDashboard(); }, () => { renderDashboard(); });
}
```

Add styles to `src/styles.css` under a clearly commented section.

---

## 10. SUPABASE API PATTERNS

All database calls follow this pattern:

```javascript
import { supabase } from './supabaseClient.js';

// Read (RLS automatically filters by auth.uid())
const { data, error } = await supabase
  .from('table_name')
  .select('*')
  .eq('column', value)
  .order('created_at', { ascending: false });

// Insert
const { data, error } = await supabase
  .from('table_name')
  .insert({ column: value })
  .select()
  .single();

// Update
const { error } = await supabase
  .from('table_name')
  .update({ column: newValue })
  .eq('id', id);

// Auth
const { data: { user } } = await supabase.auth.getUser();
```

---

## 11. GAME KEY MAPPING (Critical)

The internal game names differ from database keys:

| Internal (finalize output) | DB game_key | Display name |
|---------------------------|-------------|--------------|
| `slingshot` | `pastillero` | Pastillero |
| `flappy` | `interruptores` | Interruptores |
| `water` | `jarra` | Jarra de Agua |

This mapping lives in `src/database/metricsTransform.js` as `GAME_KEY_MAP`.

---

## 12. ENVIRONMENT

- **Vite env vars:** `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (in `.env`, gitignored)
- **Dev server:** `npm run dev` → http://localhost:5173
- **Build:** `npm run build` → `dist/`
- **Separate dashboard app:** Pre-built SPA at `/public/dashboard/` (served at `/dashboard/` route)

---

## 13. INSTRUCTIONS FOR THE AGENT

When implementing UI changes:

1. **Read `src/styles.css` first** to understand existing class names and avoid conflicts
2. **Follow the vanilla JS view pattern** (function that receives container, injects HTML, wires events)
3. **Use GSAP** for all enter/exit/hover animations — match existing timing and easing
4. **Maintain the dark-blue glassmorphism aesthetic** for all non-game screens
5. **Test the golden path**: login → dashboard → select subject → play games → upload → back to dashboard
6. **Never break the metric pipeline**: `recordGame()` and `commitPlaythrough()` must continue working
7. **All styles go in `src/styles.css`** — add new sections with clear comment headers
8. **Handle errors gracefully** — show user-facing error messages, don't just console.log
9. **Responsive consideration**: min-width ~360px mobile, max-width ~1200px desktop
10. **No external dependencies** — work with what's installed (gsap, three, supabase-js, mediapipe)
