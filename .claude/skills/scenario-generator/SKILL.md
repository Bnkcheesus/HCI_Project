---
name: scenario-generator
description: Generate two paired usage scenarios (existing system vs. the new LibAssist system) plus a comparison matrix, derived from the persona and its value proposition. Use when the user asks to create or update the scenarios from persona/value-proposition output.
---

# Scenario Generator

## Purpose
Dramatize the persona doing a task on the current/existing library process, then show that same task resolved on the new LibAssist system — using the concrete pain relievers, gain creators and products & services already defined in the value proposition, not newly invented features.

## Use this skill when
- The user wants to create or update the LibAssist scenarios.
- `persona/output/persona.md` and `valueproposition/output/value-proposition.md` both already exist.

## Required inputs
- `persona/output/persona.md` — the persona (goals, tasks, pain points, wishes, touch points).
- `valueproposition/output/value-proposition.md` — the value proposition (pains → pain relievers, gains → gain creators, customer jobs → products & services).

## Rules
- Answer in Vietnamese.
- Do not invent facts that aren't grounded in the two source files.
- Keep the scenarios internally consistent with the persona and the value proposition.
- **Scenario 1 (existing system)**: dramatize the persona doing a real task from `persona.md` and running into the persona's actual pain points, exactly as listed — do not pre-resolve anything.
- **Scenario 2 (new system)**: dramatize the *same* task, now resolved on LibAssist. Every "how the new system helps" beat in the narrative must trace back to a specific pain reliever, gain creator, or product/service named in `value-proposition.md` — not a newly invented feature.
- Both scenarios must share the same task/context so they are directly comparable side by side.

## Output
`scenario/output/scenario.md`, structured as:
1. **I. Bối cảnh & Nhân vật** — short recap of the persona and the task being dramatized.
2. **II. Kịch bản 1: Thao tác trên Hệ thống Truyền thống** — the narrative on the existing system + a "Các điểm đau phát lộ" subsection listing which persona pain points surfaced.
3. **III. Kịch bản 2: Tương tác trên Hệ thống LibAssist** — the narrative on the new system + a "Giá trị và Điểm mới trong Tương tác" subsection, each item traced to its pain reliever/gain creator/product in the value proposition.
4. **IV. Bảng So sánh Hiệu quả Tương tác** — a comparison matrix (existing system vs. new system) across the criteria that changed between the two scenarios.

## Workflow
1. Read `persona/output/persona.md` and `valueproposition/output/value-proposition.md` in full.
2. Pick one representative task/context from the persona's tasks to dramatize in both scenarios.
3. Write Scenario 1: narrate that task on the existing system, surfacing the persona's real pain points.
4. Write Scenario 2: narrate the same task on the new system, resolving each surfaced pain point via the matching pain reliever/gain creator/product from the value proposition.
5. Build the comparison matrix contrasting old vs. new across the dimensions touched by both scenarios.
6. Save the result as `scenario/output/scenario.md` (create `scenario/output/` first if it doesn't exist yet).
