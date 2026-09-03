---
name: value-proposition-generator
description: Generate a Value Proposition Canvas (customer jobs/pains/gains mapped to products & services/pain relievers/gain creators) from the persona, then render it as a value-proposition.md file and a styled HTML canvas. Use when the user asks to create or update the value proposition from the persona output.
---

# Value Proposition Generator

## Purpose
Derive a Value Proposition Canvas from the persona: map the persona's customer jobs, pains and gains to the corresponding products & services, pain relievers and gain creators.

## Use this skill when
- The user wants to create or update the LibAssist value proposition.
- `persona/output/persona.md` already exists (produced by the `persona-generator` skill).

## Required input
- `persona/output/persona.md` — the unified persona (goals, tasks, pain points, wishes, touch points).

## Rules
- Answer in Vietnamese.
- Do not invent facts that aren't grounded in `persona/output/persona.md`.
- Keep all attributes internally consistent.
- The value proposition must have customer jobs, pains and gains, each pulled from — and traceable back to — the persona's tasks/goals, pain points, and wishes respectively.
- Every pain must map to a pain reliever, every gain must map to a gain creator, and every customer job must map to a product/service — no orphaned items on either side.
- Only read `persona/output/persona.md` to derive the value proposition — do not pull in the scenario or invent new persona data.
- Do not design solutions or UI here — stay at the level of the value map (what relieves the pain / creates the gain), not how it is implemented.

## Output — both files live in `value-proposition/output/`
1. `value-proposition/output/value-proposition.md` — the value proposition in Markdown: a traceability table (persona pain/wish/job → pain reliever/gain creator/product-service) followed by the full canvas written out as text (Customer Profile: Customer Jobs, Pains, Gains; Value Map: Products & Services, Pain Relievers, Gain Creators) and a short fit-analysis section.
2. `value-proposition/output/value-proposition.html` — the same content rendered as a single-page visual canvas, following the **LibAssist Canvas Style template** below.

## Template: LibAssist Canvas Style (for `value-proposition/output/value-proposition.html`)
Reuse the visual system already established in this repo instead of inventing a new look — the legacy `persona/persona.html` and `value-proposition/value-proposition.html` are worked examples of this exact template.

- Fonts: `Plus Jakarta Sans` (headings/body) + `Space Mono` (uppercase mono labels, doc header), loaded via Google Fonts `<link>` tags.
- Color tokens (dark card floating on a light stage):
  - `--page-bg: #E5E5E5` (outer stage background), `--frame: #000000` (solid black framing/borders)
  - `--card-bg: #12151C`
  - `--cyan: #22D3EE`, `--cyan-dim: rgba(34,211,238,0.25–0.4)` — accent color for section numbers, labels, highlights
  - `--white: #F5F7FA`, `--text-muted: #93A0B4`
- Sharp corners everywhere: force `border-radius: 0` globally. This report/canvas style deliberately does **not** use the product UI's 12px radius from `Agents.md` — the two are different design systems.
- Layout must follow the classic Osterwalder Value Proposition Canvas shape, split into two halves connected by a center arrow/badge:
  - **Value Map** (left, drawn as a square/segmented shape): `Products & Services`, `Gain Creators`, `Pain Relievers`.
  - **Customer Profile** (right, drawn as a circle/segmented shape): `Customer Jobs`, `Pains`, `Gains`.
  - A doc header at the top (title + persona name/meta in mono font) above the canvas row.
- The page must be self-contained (inline `<style>`, only the Google Fonts `<link>` as an external resource, no other external JS/CSS) so it opens standalone in a browser.

## Workflow
1. Read `persona/output/persona.md` in full.
2. Extract Customer Jobs (from goals/tasks), Pains (from pain points), and Gains (from wishes).
3. For each Job/Pain/Gain, derive the matching Product & Service / Pain Reliever / Gain Creator, keeping the fit explicit and traceable — no solutioning beyond the value-map level.
4. Write `value-proposition/output/value-proposition.md` with the traceability table and the full canvas content.
5. Render `value-proposition/output/value-proposition.html` from that content, following the LibAssist Canvas Style template above.
6. Save both files under `value-proposition/output/` (create the folder first if it doesn't exist yet).
