---
name: code-generator
description: Build and continue the LibAssist implementation in code/ — a Kiosk AI web app and a mobile companion web app — from the Figma file (pulled live via the REST API) and the persona/value-proposition/scenario pipeline outputs (feature/scope source of truth). All 10 kiosk screens are built and tested; the 4 mobile screens are still placeholders. Use when the user asks to build, fix, tweak, or extend anything under code/ — new screens, bug fixes, UI polish, mock data, tests.
---

# Code Generator

## Purpose
Turn the UX pipeline (persona → value proposition → scenario) and the Figma file into a working, demoable implementation under `code/`. This is the stage where the value map stops being prose and becomes screens, components and interaction logic.

## Use this skill when
- The user wants to build, fix, or extend anything in `code/` — a new screen, a bug fix, a UI tweak, mock data, tests.
- `persona/output/persona.md`, `value-proposition/output/value-proposition.md` and `scenario/output/scenario.md` already exist.

## Current state (read this before doing anything else)
```bash
cd code && npm run build && npm run test
```
Both pass. The app is **not a scaffold** — it is a working implementation with real interaction logic, real (non-placeholder) mock data, and 184+ tests. Treat it as a codebase to extend and fix, not a template to redo.

**Kiosk (`/kiosk/*`) — all 10 screens built, tested, and through multiple rounds of real UI polish.** Mobile (`/mobile/*`) — all 4 screens still render `PlaceholderScreen`; nobody has asked for them yet in this session, so don't build them unprompted.

## Required input
- `persona/output/persona.md` — who we're building for, and which needs are in scope.
- `value-proposition/output/value-proposition.md` — the only valid source of **feature scope**: every screen/flow built must trace back to a `Products & Services`, `Pain Reliever` or `Gain Creator` entry. Do not build features that aren't there.
- `scenario/output/scenario.md` — the reference interaction flow (existing-system vs LibAssist) to translate into actual screen-to-screen navigation.
- **The Figma file** — visual source of truth for layout, spacing, color, typography and component states. File key: `Kf12R4YMZqpvHF2xolpJeH` (from `https://www.figma.com/design/Kf12R4YMZqpvHF2xolpJeH/HCI_Project`). Needed less often now that the design system is settled in `src/index.css`/`src/styles/tokens.css` — mainly for a genuinely new screen (mobile) or a frame nobody has looked at yet.

## Figma access — REST API with a personal token
Plain `WebFetch`/`curl` on the Figma web URL returns **403** — the design surface is only reachable through the API with an authenticated token.

**Setup (one-time, per machine/session):**
1. User generates a token in Figma → Settings → Security → Personal access tokens (read-only "File content" scope is enough).
2. User stores it at the repo root in `.env` (already gitignored — never ask them to paste the token into chat): `FIGMA_TOKEN=figd_...`
3. If `.env`/`FIGMA_TOKEN` is missing when you need it, ask the user for it using this exact flow — do not invent another method. **Never print the token.**

**Calling the API** (source the token, never echo it):
```bash
cd /path/to/repo && set -a && source .env && set +a
FILE_KEY=Kf12R4YMZqpvHF2xolpJeH

# Whole-file tree (pages → top-level frames → children), cheap, good for orientation:
curl -s -H "X-Figma-Token: $FIGMA_TOKEN" "https://api.figma.com/v1/files/$FILE_KEY?depth=3"

# Full detail for specific frames — fills (colors), typography, spacing, layout:
curl -s -H "X-Figma-Token: $FIGMA_TOKEN" "https://api.figma.com/v1/files/$FILE_KEY/nodes?ids=5:715,12:2"

# Rendered PNG of specific nodes, for a visual sanity check (Read tool can open the PNG):
curl -s -H "X-Figma-Token: $FIGMA_TOKEN" "https://api.figma.com/v1/images/$FILE_KEY?ids=5:715&format=png"
```
Figma color channels are 0–1 floats (`{r,g,b,a}`) — convert to hex/rgba before writing CSS. For a screen that already exists, prefer the current design system (`src/index.css`, `src/styles/tokens.css`) over re-pulling Figma — the two have diverged intentionally (see "Design system" below), and Figma is no longer the live source of truth for color/type/radius on kiosk screens.

## Screen inventory
| Screen (route) | Figma frame | node id | Status |
|---|---|---|---|
| `/kiosk` | kiosk-home | 5:715 | built |
| `/kiosk/search` | kiosk-search | 12:2 | built |
| `/kiosk/search/results` | kiosk-search-results (+ afterfilter) | 5:868 / 41:489 | built — advanced filter is a panel (`AdvancedFilterPanel`) on this screen, not a separate route |
| `/kiosk/ai-chat` | kiosk-ai-chat | 5:779 | built |
| `/kiosk/books/:bookId` | kiosk-book-info | 19:243 | built |
| `/kiosk/scan` | kiosk-book-scan-instruction | 5:971 | built |
| `/kiosk/scan/step-1` | kiosk-book-scan-step1 (+ fail state) | 20:366 / 39:82 | built |
| `/kiosk/scan/step-2` | kiosk-book-scan-step2 | 24:72 | built |
| `/kiosk/borrow-complete` | kiosk-borrow-complete | 5:1033 | built |
| `/mobile` | Phone-home-screen | 39:286 | **placeholder** |
| `/mobile/qr` | Phone-QR | 41:598 | **placeholder** |
| `/mobile/location` | Phone-Location | 41:630 | **placeholder** |
| `/mobile/phieu-muon` | Phone-PhieuMuon | 49:122 | **placeholder** |

Skip these Figma nodes — backups/duplicates, not separate screens: `kiosk-search-backup` (16:230), `kiosk-search-results-backup` (19:2), `kiosk-borrow-complete-backup` (37:2), the duplicate `kiosk-book-scan-step2` at 39:183, the extra `Phone-PhieuMuon` variants at 53:50 / 53:85.

## Rules
- Every screen and interaction must trace back to a persona task/goal **and** a value-proposition product/service — the top-of-file comment convention in every `kiosk/`/`mobile/` page does this; keep it up when you touch a file.
- Do not invent flows beyond what `scenario.md` dramatizes or `value-proposition.md` maps out. If a Figma frame has no corresponding value-map entry, flag it to the user instead of silently implementing it. If the Figma frame is *narrower* than what the value map promises (has happened: the scan frames show one book, but the value prop promises multi-book borrowing), widen the implementation to match the promise — don't implement the thin version and quietly drop the rest.
- Accessibility is first-class, not a follow-up pass: the persona (Nguyễn Minh Khang) has thị lực kém and the value proposition dedicates a whole Product/Service to it. `src/state/useAccessibilityStore.ts` + the `data-a11y` attribute on `<html>` + `src/styles/tokens.css` wire the toggle. Every interactive element needs a real focus state, WCAG AA contrast **for body text, not just large text**, a ≥48px touch target, and ARIA labeling from the start.
- User-facing copy (labels, buttons, messages, error text) is in Vietnamese. Code identifiers, comments and commit messages are in English — the one place in the repo where the two languages coexist deliberately.
- No backend exists. Data lives in `src/mocks/` — extend it there (see "Mock data" below), never hardcode data inline in a component.
- **Verify on a real browser before calling anything done.** jsdom (what the Vitest suite runs on) does not lay out flexbox/grid, does not resolve CSS custom properties, and cannot measure contrast. Overflow bugs, scroll-container bugs, and a11y-mode contrast bugs are all invisible to `npm run test` and only show up in `scripts/*.mjs` (Playwright) or a manual `npm run dev` click-through. See "Verification" below.

## Tech stack (decided — do not re-litigate)
| Concern | Choice |
|---|---|
| Framework | React 19 + TypeScript, via Vite 8 |
| Styling | Tailwind CSS v4 (`@tailwindcss/vite`) + shadcn/ui (Radix base, Nova preset originally, palette since fully replaced — see "Design system") |
| Routing | React Router v7, `useRoutes()` in `src/App.tsx` — **not** JSX `<Route>` spreading (see Gotchas) |
| Shared/session state | Zustand — `useBorrowSessionStore`, `useAccessibilityStore`, `useChatStore`, `useKeyboardStore` in `src/state/` |
| Mock data | `src/mocks/` — typed, real bibliographic data (see "Mock data") |
| Testing | Vitest + React Testing Library, jsdom, 184+ tests |
| Browser verification | Playwright, ad hoc scripts in `code/scripts/` (not part of `npm run test`) |
| Package manager | npm |

If a true native mobile app is required later, the natural next step is React Native (Expo) reusing the same design tokens — out of scope for now; `/mobile/*` is a responsive web surface in the same app as `/kiosk/*`.

## Output — current tree in `code/`
```
code/
  src/
    kiosk/                 # /kiosk/* — one file per screen, all built (table above)
      scan/                  # 3-step self-checkout sub-flow
    mobile/                 # /mobile/* — all 4 screens still PlaceholderScreen
    components/
      PlaceholderScreen.tsx  # scaffold stub — still used by every mobile screen
      kiosk/                 # ~25 shared kiosk components (cards, keyboard, chat, scan UI...)
      ui/                    # shadcn primitives, added on demand via `npx shadcn@latest add`
    lib/                   # framework-free logic: search.ts, librarian.ts, borrow.ts,
                            # telex.ts, useSpeechSearch.ts, useKioskIdle.ts, kioskSession.ts
    mocks/                  # catalog, availability, libraryMap, libraryStatus, loanHistory,
                            # students — typed, index.ts barrel, no backend yet
    state/                  # the four Zustand stores
    styles/tokens.css       # type scale, composite shadow tokens, a11y-mode overrides
    index.css               # design tokens (:root), fonts, Tailwind entry
    App.tsx                 # useRoutes() — the two route trees
    main.tsx
  scripts/                 # catalog pipeline + Playwright verification (see below)
  docs/
    nguon-du-lieu-catalog.md      # what the mock catalog is and how to regenerate it
    test-cases-muon-sach.md       # borrowing test-case table, Vietnamese
  index.html
  package.json
```

## Mock data — real bibliographic data, generated, not hand-typed
`src/mocks/catalog.ts`, `availability.ts` and `libraryMap.ts` are **generated files** — a header comment in each says so. Do not hand-edit them; edit `scripts/catalog-seed.mjs` (a curated list of ~116 real books, one per faculty shelf) and regenerate:
```bash
npm run catalog            # resolves the seed against Open Library, downloads real cover art
npm run catalog:offline    # regenerates from the cached scripts/catalog-resolved.json, no network
```
Titles, authors, publication years, ISBN-13s and cover art (`public/covers/*.jpg`) come from the free [Open Library](https://openlibrary.org) API — real, not invented. Subjects, shelf codes, floors and Vietnamese descriptions are curation decisions made in the seed file. Vietnamese textbooks and periodicals carry hand-pinned metadata (`pin:` in the seed) because Open Library indexes them with stripped diacritics and no cover art. Full writeup, including the data-cleaning the generator does (author-name dedup, title-case normalization, trailing-credit stripping) in `docs/nguon-du-lieu-catalog.md` — read it before touching the pipeline, it documents real messiness you will otherwise rediscover.

`suggestedBooks` (the four books on the kiosk home screen) is a curated `SUGGESTED_IDS` list in the seed file, not `books.slice(0, 4)` — which four books greet a reader is a deliberate choice (one per faculty, all with real cover art, four different availability states so the reader sees green *and* black chips on the very first screen).

`students.ts` and `loanHistory.ts` are hand-written (not part of the Open Library pipeline) — four demo cards exercising the eligibility rules in `lib/borrow.ts`: a valid card, an expired card, a card with overdue books, a card at the borrowing limit.

## Design system
`src/index.css` (`:root` tokens) and `src/styles/tokens.css` (type scale + composite shadows + a11y overrides) are the **only** place color, spacing-scale, radius and shadow values live. 321+ references across 35 files go through these CSS variables — changing the palette means editing `:root` once, not hunting through components. When you introduce a new visual value, add a token; don't hand-pick a hex/px value in a component.

- **Composite shadow tokens** (`--btn-shadow`, `--field-shadow`, `--card-shadow`, `--lift`, `--lift-2`) — redefining these ~4 lines re-styles every button/field/card in the app at once. Useful when the user wants a different visual "system" (this happened: hand-drawn AI-generated feel → flatter, more deliberate look).
- **Type scale has a display tier** (`--text-display`, `--text-brand`, down to `--text-eyebrow`) — use the scale, don't invent a one-off `font-size`.
- **`html[data-a11y='true']`** (toggled by `useAccessibilityStore`) forces max contrast and flattens several tokens to pure black/white. See Gotchas for the trap this creates.
- Fonts are self-hosted via `@fontsource*` packages (not Google Fonts CDN) so a kiosk with flaky network still renders correctly — check any new font choice has a **Vietnamese subset** before adding it (`api.fontsource.org/v1/fonts/<id>`).

## Navigation pattern — explicit destinations, never `navigate(-1)`
The self-checkout flow (`/kiosk/scan` → `/kiosk/scan/step-1` → `/kiosk/scan/step-2` → `/kiosk/borrow-complete`) and the "quay về" buttons scattered through kiosk screens do **not** use browser history (`navigate(-1)`). History entries get pushed and overwritten in ways that make "back" land on the wrong screen — this bug recurred three separate times in one session before the pattern below settled it for good.

Every screen that can be a *detour* from somewhere else carries its origin explicitly in router state:
```tsx
navigate('/kiosk/scan', { state: { from: `/kiosk/books/${book.id}`, fromOrigin: cameFrom } })
```
`from` is where "Quay về" on the destination screen should go; `fromOrigin` is where *that* screen itself came from, so the chain survives more than one hop. Read it back with:
```tsx
const cameFrom = (useLocation().state as { from?: string } | null)?.from
```
Never derive "where to go back to" from session-store state that might be stale (e.g. a `selectedBookId` left over from a previous visit) — always from the navigation state of *this specific visit*.

## Scroll architecture — full-width scroller, centred track inside it
Every scrollable kiosk screen splits the scrolling element from the width-constraining element:
```tsx
<main className="min-h-0 flex-1 overflow-y-auto">
  <div className="mx-auto flex ... max-w-[1280px] ...">
```
Putting `max-w` + `mx-auto` + `overflow-y-auto` on the *same* element works at 1280px but leaves the scrollbar floating hundreds of pixels from the screen edge on a wider display — the scrollbar's position is tied to the scrolling element's own box, not the content inside it. Keep the outer element full-width and the constraint on a child.

The kiosk home screen additionally must **never scroll** (the subject-shortcut shortcuts at the bottom are the reader's fastest path when they don't know a title, and must always be reachable). That screen uses `h-full min-h-[...]` — not `min-h-full`, which lets the track just grow and nothing ever shrinks — plus `grid-rows-1` on the card grid so the row is genuinely allowed to shrink (an `auto` grid row never goes below its content's natural height, only above it). This whole "shrink to fit, floor below which the page scrolls instead of overlapping" behavior is scoped to the `lg:` breakpoint, where the grid is one row of four cards; narrower than that it wraps to two rows whose combined height cannot be squeezed to fit, and the page scrolls normally.

## Gotchas (all hit and fixed this project — don't rediscover them)
- **`navigate(-1)` is unusable for the checkout/detour flows.** See "Navigation pattern" above.
- **The scrollbar's position depends on which element the scroll and the width-constraint live on.** See "Scroll architecture" above.
- **A `<button>` sizes to fit-content even as a flex container.** A card built as `<button class="flex flex-col">` with a nowrap/`truncate` child (an author line) grows to that child's *natural* width instead of shrinking, blowing the card past its grid track. Fix: `w-full` on the button, `min-w-0` on every ancestor down to the text, so `truncate` actually has something to truncate against. This is why every list `<li>` wrapping such a card also needs `min-w-0` (a flex/grid item defaults to `min-width: auto`).
- **A `<button class="flex flex-col">` needs an explicit `items-stretch`.** The HTML rendering spec gives `<button>` a UA rule of `align-items: flex-start`. Chromium ignores it, **WebKit applies it** — and in a flex *column* the cross axis is horizontal, so every child shrink-wraps to its own text: a `justify-between` header stops spreading, a `flex-1` column stops growing, and anything meant to sit at the right edge (a chip, a chevron, an `absolute right-3` badge) walks inward. **This renders perfectly in Playwright's Chromium and wrongly on the reader's phone** — it is the reason "the chip is missing on my browser" was unreproducible for a whole round. Both `ResultCard` and the mobile home card now name `items-stretch`; `check-chrome.mjs` and `check-mobile.mjs` fail on any flex-column button whose computed `align-items` is still `normal`. That check reads the *declaration*, not the layout, because the browser doing the measuring is the one that gets it right.
- **A flex item with both `aspect-ratio` and a height from `flex-grow` can derive its *width* from the ratio instead.** A book cover styled `aspect-[16/9] grow` blew out past its card in this project — pin `w-full` explicitly so the ratio only has the height left to set.
- **CSS Grid rows never shrink below content height on their own.** `grid-template-rows: auto` (the default) stretches to fill extra space but has no lower bound — `flex-1` on the grid just makes it overflow. Force `grid-rows-1` (→ `minmax(0,1fr)`) where the row must be allowed to shrink.
- **`html[data-a11y='true']` collapses several tokens onto the same black**, including `--rule`, `--ink`, `--foreground`, `--border`. Any element painted `bg-[var(--rule)] text-foreground` becomes black-on-black and vanishes in a11y mode — happened to the on-screen keyboard's Shift/Backspace/123 keys. A surface needing both a fill and a legible glyph needs its own token pair (`--key-modifier-bg`/`--key-modifier-ink` is the existing example) overridden explicitly in the a11y block. **jsdom cannot catch this** — it doesn't resolve CSS variables, so contrast checks only exist in the Playwright scripts.
- **Negative-margin bleed inside a grid/flex column leaks into the neighbour.** `-mx-10` to reach a screen edge also pushes the *other* side 40px past its column boundary, silently covering the next column's content. Bleed one direction only (`-ml-10` or `-mr-10`).
- **Screen-wide `findByText` in tests resolves before the thing you're waiting for exists**, if the same text already appears elsewhere on the page (a footer stat, a starter-chip label that repeats the question). Scope waits with `within(getByRole(...))` and match on wording unique to the new content.
- **Real data has real messiness that placeholder data hides.** Swapping the mock catalog from `"Tác giả A"` to real Open Library records immediately exposed a genuine horizontal-overflow bug (a real 3-author credit is much longer than a placeholder name) and a genuine substring-matching bug in the AI librarian (Vietnamese words swallow each other once diacritics are stripped: "thuật toán" ends in "toán", "khoa học" ends in "hoa học"). Treat "the mock data was too thin to catch this" as a real category of bug, not an excuse.
- **Vietnamese substring matching needs word boundaries, not `includes()`.** Tone-stripped Vietnamese phrases contain one another constantly. Pad the haystack (`` ` ${text} ` ``) and match `` ` ${word} ` `` — see `lib/librarian.ts`'s `matchSubjects`/`titleOrAuthorMentioned` for the pattern, including the "longest alias wins, shorter aliases contained within it lose" tie-break.
- **A kiosk session must expire.** The machine stands in a public hallway: a reader who scans their card and walks away leaves a live session for the next person. `lib/useKioskIdle.ts` counts down, warns, then clears — don't remove it from the scan steps.
- **Timer-driven state needs `act()` in tests.** `vi.advanceTimersByTime` runs the interval, but React won't flush the resulting `setState` outside `act()`.
- **Safari's `SpeechRecognition` can hang forever** — no `onresult`, no `onerror`, no `onend`, often when the spoken language has no macOS Dictation pack installed. `useSpeechSearch` guards this with a watchdog timer (`WATCHDOG_MS`) forcing a `timeout` status — don't remove it. Chrome is the reference browser for voice.
- **Voice search needs a secure context in production** — works on `localhost` in dev, but a real deployment needs HTTPS or `SpeechRecognition` never starts. It's also a cloud service, so it needs network.
- **Numbers stated in one screen's prose must be the one constant everywhere.** The AI librarian says "mượn tối đa 5 cuốn trong 14 ngày" — those are `MAX_BOOKS_PER_LOAN`/`LOAN_DAYS` in `lib/borrow.ts`, asserted by a test. A figure the app states needs a single constant behind it or screens start contradicting each other.
- **A form with one text field and no submit button submits on Enter by itself** — relied on deliberately when a redundant submit button next to a mic was removed from the AI chat composer; the on-screen keyboard's own "Gửi" key covers the touch case, Enter covers the physical-keyboard case.
- **`__dirname` doesn't exist** in this Vite/Node setup's native config loader — use `import.meta.dirname` in `vite.config.ts`.
- **Don't spread `RouteObject[]` into JSX** `<Route {...route} />` — v7's `RouteObject`/`RouteProps` types disagree on `lazy` and it won't compile. Use `useRoutes(routeObjectArray)`.

## Workflow

### Fixing or extending an existing screen (the common case)
1. Read the screen's current source in `src/kiosk/` (or the shared component in `src/components/kiosk/`) — it is real code with comments explaining *why*, not a placeholder.
2. Make the change. If it touches color/spacing/shadow/radius, check whether a token in `src/index.css`/`src/styles/tokens.css` already covers it before hand-picking a value.
3. If it touches navigation, follow the explicit-destination pattern above — never reach for `navigate(-1)`.
4. If it touches a scrollable region or anything sized relative to the viewport, verify on a real browser (see Verification) — this class of bug is invisible to `npm run test`.
5. Run the full verification loop before calling it done.

### Building a new mobile screen (the remaining scope)
1. Fetch its design: `curl .../v1/files/$FILE_KEY/nodes?ids=<node id>` from the table above, plus an image export if the JSON alone doesn't make the layout obvious.
2. Replace the `PlaceholderScreen` with real markup — reuse existing kiosk components/tokens where the mobile UI wants the same thing (design tokens are already shared), write phone-specific ones under `src/components/mobile/` where it doesn't.
3. Wire to `src/mocks/` and the Zustand stores as the flow requires; extend mocks rather than hardcoding.
4. Verify: `npm run dev` and actually use it on a narrow viewport; `npm run test`; `npm run build`.

## Verification (run every time, not just at the end)
```bash
cd code
npm run build     # tsc -b && vite build
npm run test      # vitest run — 184+ tests
npm run lint      # oxlint
npm run dev       # then actually click through the flow — see below
```
**`npm run test` passing is not sufficient sign-off.** jsdom doesn't lay out flexbox/grid, doesn't resolve CSS variables, can't measure contrast, and can't tell you a scrollbar sits 300px from the screen edge. Every layout/overflow/contrast bug this project has hit was invisible to the test suite and only surfaced in a real browser. Use the Playwright scripts in `code/scripts/`:
```bash
node scripts/check-chrome.mjs    # header/footer pinned, no page-level scroll, at several viewport sizes; also checks the home screen fits without scrolling and nothing overlaps
node scripts/check-covers.mjs    # every cover image actually decodes, none are Open Library's placeholder
node scripts/shot-scan.mjs       # walks the full borrow flow to the receipt, screenshots each step
node scripts/shot-aichat.mjs     # AI chat flow, including a11y-mode contrast measurement
node scripts/shot-search.mjs     # on-screen keyboard + Telex + live search
node scripts/shot-results.mjs    # sort/filter/pagination on the results screen
```
These are throwaway/ad hoc scripts, not a fixed suite — write a new one (or a one-off inline Playwright probe) for whatever you just changed rather than assuming an existing script covers it. Always screenshot and actually look at the image (`Read` tool opens PNGs) — "the script printed ok" without looking at the picture has missed real bugs in this project before.
