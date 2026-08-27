---
name: code-generator
description: Build and continue the LibAssist implementation in code/ — a Kiosk AI web app and a mobile companion web app — from the Figma file (pulled live via the REST API) and the persona/value-proposition/scenario pipeline outputs (feature/scope source of truth). The scaffold already exists; this skill's main job past that point is implementing one screen at a time. Use when the user asks to start, continue, or update the actual code/implementation for LibAssist.
---

# Code Generator

## Purpose
Turn the UX pipeline (persona → value proposition → scenario) and the Figma file into a working, demoable implementation under `code/`. This is the stage where the value map stops being prose and becomes screens, components and interaction logic.

## Use this skill when
- The user wants to start, continue, or update the LibAssist implementation in `code/`.
- `persona/output/persona.md`, `value-proposition/output/value-proposition.md` and `scenario/output/scenario.md` already exist.

## Current state (read this before scaffolding anything)
`code/` is **already scaffolded and verified working** — do not re-run `npm create vite` or redo the setup below. Check first:
```bash
cd code && npm run build && npm run test
```
If both pass, the scaffold is intact — skip straight to **Workflow → per-screen build loop**. Only fall back to **Scaffold from scratch** if `code/` is empty or the tree below is missing.

## Required input
- `persona/output/persona.md` — who we're building for, and which needs are in scope.
- `value-proposition/output/value-proposition.md` — the only valid source of **feature scope**: every screen/flow built must trace back to a `Products & Services`, `Pain Reliever` or `Gain Creator` entry. Do not build features that aren't there.
- `scenario/output/scenario.md` — the reference interaction flow (existing-system vs LibAssist) to translate into actual screen-to-screen navigation.
- **The Figma file** — visual source of truth for layout, spacing, color, typography and component states. File key: `Kf12R4YMZqpvHF2xolpJeH` (from `https://www.figma.com/design/Kf12R4YMZqpvHF2xolpJeH/HCI_Project`).

## Figma access — REST API with a personal token (this works, verified)
Plain `WebFetch`/`curl` on the Figma web URL returns **403** — the design surface is only reachable through the API with an authenticated token.

**Setup (one-time, per machine/session):**
1. User generates a token in Figma → Settings → Security → Personal access tokens (read-only "File content" scope is enough).
2. User stores it at the repo root in `.env` (already gitignored — never ask them to paste the token into chat): `FIGMA_TOKEN=figd_...`
3. If `.env`/`FIGMA_TOKEN` is missing when you need it, ask the user for it using this exact flow — do not invent another method.

**Calling the API** (source the token, never print it):
```bash
cd /path/to/repo && set -a && source .env && set +a
FILE_KEY=Kf12R4YMZqpvHF2xolpJeH

# Whole-file tree (pages → top-level frames → children), cheap, good for orientation:
curl -s -H "X-Figma-Token: $FIGMA_TOKEN" "https://api.figma.com/v1/files/$FILE_KEY?depth=3"

# Full detail for specific frames — fills (colors), typography, spacing, layout —
# this is what you actually want before implementing a screen:
curl -s -H "X-Figma-Token: $FIGMA_TOKEN" "https://api.figma.com/v1/files/$FILE_KEY/nodes?ids=5:715,12:2"

# Rendered PNG of specific nodes, for a visual sanity check (Read tool can open the PNG):
curl -s -H "X-Figma-Token: $FIGMA_TOKEN" "https://api.figma.com/v1/images/$FILE_KEY?ids=5:715&format=png"
```
Figma color channels are 0–1 floats (`{r,g,b,a}`) — convert to hex/rgba before writing CSS. Never hand-guess a color/spacing/font value; pull it from the `nodes` endpoint for that frame's id.

## Screen inventory (discovered via `?depth=3`, one page: "Page 1")
Already scaffolded 1:1 into `code/src/kiosk/*.tsx` and `code/src/mobile/*.tsx` (node id + persona/value-prop traceability in each file's top comment). Re-run the depth=3 call above if the Figma file has changed since; otherwise trust this table.

| Screen (route) | Figma frame | node id |
|---|---|---|
| `/kiosk` | kiosk-home | 5:715 |
| `/kiosk/search` | kiosk-search | 12:2 |
| `/kiosk/search/advanced` | kiosk-search-advanced-filter | 34:218 |
| `/kiosk/search/results` | kiosk-search-results (+ afterfilter) | 5:868 / 41:489 |
| `/kiosk/ai-chat` | kiosk-ai-chat | 5:779 |
| `/kiosk/books/:bookId` | kiosk-book-info | 19:243 |
| `/kiosk/scan` | kiosk-book-scan-instruction | 5:971 |
| `/kiosk/scan/step-1` | kiosk-book-scan-step1 (+ fail state) | 20:366 / 39:82 |
| `/kiosk/scan/step-2` | kiosk-book-scan-step2 | 24:72 |
| `/kiosk/borrow-complete` | kiosk-borrow-complete | 5:1033 |
| `/mobile` | Phone-home-screen | 39:286 |
| `/mobile/qr` | Phone-QR | 41:598 |
| `/mobile/location` | Phone-Location | 41:630 |
| `/mobile/phieu-muon` | Phone-PhieuMuon | 49:122 |

**Skip these** — backups/duplicates left over in the file, not separate screens: `kiosk-search-backup` (16:230), `kiosk-search-results-backup` (19:2), `kiosk-borrow-complete-backup` (37:2), the duplicate `kiosk-book-scan-step2` at 39:183, and the extra `Phone-PhieuMuon` variants at 53:50 / 53:85.

## Rules
- Every screen and interaction must trace back to a persona task/goal **and** a value-proposition product/service — the top-of-file comment convention already in every `kiosk/`/`mobile/` page does this; keep it up when you replace a placeholder with real UI.
- Do not invent flows beyond what `scenario.md` dramatizes or `value-proposition.md` maps out. If a Figma frame has no corresponding value-map entry, flag it to the user instead of silently implementing it.
- Visual implementation follows values actually pulled from the Figma `nodes` API — never a hand-picked color/spacing that "looks about right."
- Accessibility is first-class, not a follow-up pass: the persona (Nguyễn Minh Khang) has thị lực kém and the value proposition dedicates a whole Product/Service to it. `src/state/useAccessibilityStore.ts` + the `data-a11y` attribute + `src/styles/tokens.css` already wire the toggle — use real focus states, sufficient contrast, resizable text and ARIA labeling on every kiosk screen from the start, not bolted on later.
- User-facing copy (labels, buttons, messages) is in Vietnamese, matching the rest of the pipeline. Code identifiers, comments and commit messages are in English — the one place in the repo where the two languages coexist deliberately.
- No backend exists yet. Extend the mock data in `code/src/mocks/` (already typed and seeded with real text pulled from the `kiosk-book-info` frame) instead of hardcoding data inline in components — keeps a real API swap-in painless later.

## Tech stack (decided and already scaffolded — do not re-litigate)
| Concern | Choice |
|---|---|
| Framework | React 19 + TypeScript, via Vite |
| Styling | Tailwind CSS v4 (`@tailwindcss/vite`), design tokens in `src/index.css` (shadcn-generated) + `src/styles/tokens.css` (accessibility-mode overrides) |
| UI primitives | shadcn/ui, Radix base, Nova preset — add more with `npx shadcn@latest add <component>` from `code/` |
| Routing | React Router v7, `useRoutes()` in `src/App.tsx` — **not** JSX `<Route>` spreading (see Gotchas) |
| Shared/session state | Zustand — `src/state/useBorrowSessionStore.ts`, `src/state/useAccessibilityStore.ts` |
| Mock data | `src/mocks/` (catalog, availability, loanHistory, libraryMap), typed, no backend yet |
| Testing | Vitest + React Testing Library, jsdom |
| Package manager | npm |

If a true native mobile app is required later, the natural next step is React Native (Expo) reusing the same design tokens — out of scope for now; `/mobile/*` is a responsive web surface in the same app as `/kiosk/*`.

## Output — current tree in `code/`
```
code/
  src/
    kiosk/               # /kiosk/* — one file per screen (table above), routes.tsx wires them
      scan/                # 3-step self-checkout sub-flow
    mobile/               # /mobile/* — same pattern, routes.tsx
    components/
      PlaceholderScreen.tsx  # scaffold stub — delete the import once a screen is real
      ui/                    # shadcn components, added on demand
    mocks/                # typed catalog/availability/loanHistory/libraryMap + index.ts barrel
    state/                # useBorrowSessionStore, useAccessibilityStore
    styles/tokens.css     # a11y-mode token overrides
    App.tsx                # useRoutes() — the two route trees
    main.tsx
  index.html
  package.json
```
Every `kiosk/*.tsx` / `mobile/*.tsx` file currently renders `<PlaceholderScreen title=... figmaNodeId=... tracedTo=... />` — that is the map of what's left to build, screen by screen.

## Workflow

### Per-screen build loop (the normal path — scaffold already exists)
1. Pick the next screen still rendering `PlaceholderScreen` from the table above.
2. Fetch its real design: `curl .../v1/files/$FILE_KEY/nodes?ids=<node id>` (see Figma access section). Pull an image export too if the JSON alone doesn't make the layout obvious.
3. Replace the placeholder with real markup — Tailwind utility classes matching the pulled values, shadcn/ui primitives where they fit, wired to `src/mocks/` and the two Zustand stores as the flow requires.
4. The first time a real color/radius/font value is confirmed for a token already declared in `src/index.css`'s `:root`/`.dark` blocks (still shadcn Nova placeholders), update it there once — don't scatter one-off hex values through components.
5. Verify before moving on: `npm run dev` and actually click the screen; `npm run test`; `npm run build`.
6. Repeat until every route in the table renders real UI instead of `PlaceholderScreen`.

### Scaffold from scratch (only if `code/` is missing/empty — normally skip this)
```bash
cd code
npm create vite@latest . -- --template react-ts
npm install
npm install -D tailwindcss @tailwindcss/vite
npm install react-router-dom zustand
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom @vitest/ui
```
Then, **in this exact order** (see Gotchas for why):
1. Add `@import "tailwindcss";` as the first line of `src/index.css` — shadcn's init refuses to detect Tailwind v4 otherwise.
2. Add the `@/*` → `./src/*` path alias to **both** `tsconfig.json` (root) and `tsconfig.app.json` — shadcn's CLI reads the root config directly and will otherwise write files into a literal `./@/` folder.
3. `npx shadcn@latest init --template vite --base radix -p nova -y < /dev/null` (the `-y` flag alone still prompts interactively in some versions; pipe `/dev/null` to stdin and pass `-p nova` explicitly to avoid hanging).
4. Wire `@tailwindcss/vite`'s plugin and the `@` alias into `vite.config.ts`; add `/// <reference types="vitest/config" />` above the imports so the `test` field type-checks.
5. Rebuild the folder structure above (`kiosk/`, `mobile/`, `mocks/`, `state/`, `styles/tokens.css`) and wire `App.tsx`/`main.tsx` per the Gotchas below.

## Gotchas (all hit and fixed this session — don't rediscover them)
- **Tailwind v4 detection**: `shadcn init` checks for an existing `@import "tailwindcss"` in the CSS file *before* it will proceed — do that first, not after.
- **shadcn CLI + path aliases**: without `paths` in the **root** `tsconfig.json` (not just `tsconfig.app.json`), the CLI silently writes generated files to a literal `./@/components/...` directory instead of resolving to `src/`. If you ever see a folder literally named `@` appear, this is why — move the files into `src/` and fix the root tsconfig.
- **`baseUrl` is deprecated** in the TypeScript version this project uses (build fails with TS5101) — declare `paths` **without** `baseUrl` in both tsconfig files; modern TS resolves `paths` relative to the tsconfig file itself.
- **`vite.config.ts` + Vitest's `test` field**: TypeScript won't recognize `test:` in `defineConfig(...)` unless `/// <reference types="vitest/config" />` is the first line of the file.
- **Don't spread `RouteObject[]` into JSX** `<Route {...route} />` inside `<Routes>` — react-router v7's `RouteObject` and `RouteProps` types disagree on the `lazy` field and it won't compile. Use `useRoutes(routeObjectArray)` instead; it's designed to consume the data-driven route array directly.
- **`__dirname` doesn't exist** in this Vite/Node setup's native config loader — use `import.meta.dirname` in `vite.config.ts`.
- **shadcn's Nova preset ships placeholder oklch colors** in `src/index.css` — they are *not* the real LibAssist palette. Treat every value in the `:root`/`.dark` blocks there as a TODO until replaced with a value actually pulled from Figma.
- **Accessibility mode collapses several tokens onto the same black.** `html[data-a11y='true']` sets `--rule`, `--ink`, `--foreground` and `--border` all to `#000000`. Any element painted `bg-[var(--rule)] text-foreground` therefore becomes black-on-black and vanishes — this really happened to the keyboard's Shift/Backspace/123 keys. When a surface needs both a fill and a legible glyph, give it its own token pair (see `--key-modifier-bg` / `--key-modifier-ink` in `tokens.css`) and override it explicitly in the a11y block. **jsdom cannot catch this** — it does not resolve CSS variables from the stylesheet, so contrast checks belong in the Playwright script (`scripts/shot-aichat.mjs` has one).
- **Negative-margin bleed inside a grid column leaks into the neighbouring column.** `-mx-10` on the on-screen keyboard (to reach the left screen edge) also pushed it 40px past the column's *right* edge, where it silently covered the first character of every heading in the side panel. Bleed one direction only (`-ml-10`).
- **Screen-wide `findByText` in tests resolves before the thing you are waiting for exists.** The kiosk footer shows the opening hours and the AI chat's starter chips repeat whole questions, so `findByText(/07:00/)` and `findByText(/còn trên kệ/)` both matched instantly and the assertions that followed tested nothing. Scope waits to the region (`within(getByRole('log'))`) and match on wording unique to the new content.
- **Voice search needs a secure context in production**: the mic works on `localhost` during dev, but a real kiosk deployment must be served over HTTPS or `SpeechRecognition` never starts. Chrome's recognizer is also a cloud service, so it needs network.
- **The prototype's borrow flow is narrower than the value proposition it serves.** The Figma scan frames carry exactly one book and show a bare "Thẻ thư viện hợp lệ", but Pain 4 is about "nhiều đầu sách cùng lúc" and Gain 3 promises "in phiếu **hoặc đồng bộ app**". The implementation therefore scans up to `MAX_BOOKS_PER_LOAN`, runs a real eligibility check (`lib/borrow.ts`), and offers a QR hand-off next to the printed slip. When a Figma frame is thinner than the value map, say so and widen it — do not implement the frame and quietly drop the promise.
- **Numbers quoted in one screen bind every other screen.** The AI librarian answers "mượn tối đa 5 cuốn trong 14 ngày"; those are now `MAX_BOOKS_PER_LOAN` and `LOAN_DAYS` in `lib/borrow.ts`, asserted by a test. Any figure the app states in prose needs a single constant behind it or the screens start contradicting each other.
- **A kiosk session must expire.** The machine stands in a public hallway: a reader who scans their card and walks away leaves a live session the next person inherits. `lib/useKioskIdle.ts` counts down, warns, then clears — do not remove it from the scan steps.
- **Timer-driven state needs `act()` in tests.** `vi.advanceTimersByTime` runs the interval, but React will not flush the resulting `setState` outside `act()`, so the assertion sees the old UI and the test fails for a reason that has nothing to do with the code.
- **Safari's `SpeechRecognition` can hang forever** — no `onresult`, no `onerror`, no `onend` — most often when the spoken language has no macOS Dictation pack installed. `useSpeechSearch` guards this with a watchdog timer (`WATCHDOG_MS`) that forces a `timeout` status; do not remove it. Chrome is the reference browser for this feature.

## Verification (commands that currently pass — re-run after every screen)
```bash
cd code
npm run build   # tsc -b && vite build
npm run test    # vitest run
npm run lint    # oxlint
npm run dev     # then actually click through the flow scenario.md describes
```
