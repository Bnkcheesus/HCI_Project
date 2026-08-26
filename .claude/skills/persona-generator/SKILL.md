---
name: persona-generator
description: Generate a realistic LibAssist user persona (name, demographics, quote, goals, tasks, pain points, wishes, touchpoints, tags) from user discovery findings, then render it as a persona.md file and a styled HTML persona canvas. Use when the user asks to create or update the persona from user-discovery output.
---

# Persona Generator

## Purpose
Synthesize the individual users captured during user discovery into one realistic, unified persona, then produce both a Markdown record and a visual HTML canvas of that persona.

## Use this skill when
- The user wants to create or update the LibAssist persona.
- `user-discovery/output/user-discovery.md` already exists with one or more researched users (goals, tasks, pain points, wishes, touch points, quotes, demographics).

## Required input
- `user-discovery/output/user-discovery.md` — the raw user discovery findings (multiple interviewed/researched users).

## Rules
- Answer in Vietnamese.
- Do not invent facts that aren't grounded in `user-discovery/output/user-discovery.md`.
- Keep all attributes internally consistent (goals ↔ tasks ↔ pain points ↔ wishes ↔ touch points must not contradict each other).
- Goals should explain what the user wants to achieve.
- Tasks describe the user's daily activities.
- Pain points explain obstacles.
- Wishes describe improvements desired by the user.
- The representative quote should summarize the user's mindset.
- The persona must have: name, demographic information, quote, goal, task, pain point, wish, touch point, and tag.
- When multiple discovered users are merged into one persona, keep a short synthesis note (which source user contributed which trait) so the merge stays traceable — do not silently blend traits into an inconsistent composite.

## Output — both files live in `persona/output/`
1. `persona/output/persona.md` — the persona in Markdown: a synthesis/matrix section (which discovered user contributed which trait) followed by the full persona profile (name, demographics, quote, goals, tasks, pain points, wishes, touch points, tags) and a short design-implications section.
2. `persona/output/persona.html` — the same persona rendered as a single-page visual canvas, following the **LibAssist Canvas Style template** below.

## Template: LibAssist Canvas Style (for `persona/output/persona.html`)
Reuse the visual system already established in this repo instead of inventing a new look — the legacy `persona/persona.html` and `valueproposition/value-proposition.html` are worked examples of this exact template:

- Fonts: `Plus Jakarta Sans` (headings/body) + `Space Mono` (uppercase mono labels, system/header text), loaded via Google Fonts `<link>` tags.
- Color tokens (dark card floating on a light stage):
  - `--page-bg: #E5E5E5` (outer stage background), `--frame: #000000` (solid black framing/borders)
  - `--card-bg: #12151C`, `--card-subtle: #171B24`
  - `--cyan: #22D3EE`, `--cyan-dim: rgba(34,211,238,0.25–0.4)` — accent color for section numbers, labels, highlights
  - `--white: #F5F7FA`, `--text-muted: #93A0B4`
  - `--danger-bg: rgba(255,107,107,0.12)`, `--danger-border: #FF6B6B`, `--danger-text: #FF8E8E` — reserved for the Pain Points block
- Sharp corners everywhere: force `border-radius: 0` globally. This report/canvas style deliberately does **not** use the product UI's 12px radius from [Agents.md](../../../Agents.md) — the two are different design systems.
- Layout, top to bottom:
  1. A black-framed `system-header` bar (system title in mono font + meta info).
  2. A hero card: persona name, representative quote, demographic/context summary.
  3. A 50/50 two-column grid of numbered sections:
     - Left column: `01. Bối cảnh & Hành vi sử dụng` (Tasks), `02. Mục tiêu cốt lõi` (Goals), `Phân loại & Tags`.
     - Right column: `03. Điểm đau hiện tại` (Pain Points, styled with the danger tokens), `04. Mong muốn giải pháp` (Wishes), `05. Điểm chạm hệ thống` (Touch Points).
  4. A closing dashboard-style footer.
- The page must be self-contained (inline `<style>`, only the Google Fonts `<link>` as an external resource, no other external JS/CSS) so it opens standalone in a browser.

## Workflow
1. Read `user-discovery/output/user-discovery.md` in full.
2. Extract and synthesize a single unified persona: identify the recurring goals/tasks/pain points/wishes across the discovered users, noting which source user each trait mainly comes from.
3. Write `persona/output/persona.md` with the synthesis matrix and the complete persona profile.
4. Render `persona/output/persona.html` from that persona, following the LibAssist Canvas Style template above.
5. Save both files under `persona/output/` (create the folder first if it doesn't exist yet).
