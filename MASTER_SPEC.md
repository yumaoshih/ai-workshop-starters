# AI Workshop Friday — Locked Local Specification

Status: SPEC_LOCKED
Owner: 施董
Artifact root: `/shared-artifacts/ai-workshop-friday`

## Goal

A Mac-openable local hub linking nine independent, forkable, static web products. Each product must work without build tools, APIs, credentials, remote images, or network access.

## Locked lineup

1. `001_fasting-clock` — fasting timer
2. `002_water-tracker` — daily water tracker
3. `003_food-wheel` — editable food roulette
4. `004_image-compressor` — browser-local batch image compression
5. `005_bingo-generator` — editable 5×5 bingo card
6. `006_vocabulary-trainer` — flashcard vocabulary trainer
7. `007_travel-guide` — page-turning travel guide with checklist
8. `008_kids-reward-board` — local points and reward redemption
9. `009_group-randomizer` — fair random grouping from pasted names

## Common contract

Each directory contains:

- `index.html` — self-contained, opens via `file://`
- `README.md` — purpose, local use, Fork→Remix→Publish, Level 1–3 tasks
- `DESIGN.md` — surface, tokens, composition, accessibility
- `tests/contract.json` — machine-readable behaviors and selectors
- `evidence/RED.md`, `GREEN.md`, `VISUAL_REVIEW.md`

All products:

- Traditional Chinese UI
- responsive at 390×844 and desktop
- keyboard usable
- persistent state uses namespaced localStorage only
- visible reset action
- zero network requests and remote assets
- no medical, financial, safety, or performance guarantees
- no secrets or authentication
- no generic hero + three-card template
- AI slop target ≤2/10

## Product-specific core behavior

- 001_fasting-clock: presets, start/pause/reset, elapsed/remaining calculation; timer is a convenience tool, not medical advice.
- 002_water-tracker: configurable goal, add/remove intake, same-day persistence, explicit new-day reset.
- 003_food-wheel: edit options, animate spin, select one valid option, prevent empty spin.
- 004_image-compressor: multi-file input, quality control, original/output size, individual downloads; all processing local.
- 005_bingo-generator: 24 editable items + free center, randomized 5×5 board, regenerate, print.
- 006_vocabulary-trainer: add term/meaning, flip card, next/shuffle, learned status, persistence.
- 007_travel-guide: seven pages, next/previous, keyboard and touch, progress, persistent checklist, no remote map dependency.
- 008_kids-reward-board: configurable child/rewards, add/subtract points, block negative balance and unaffordable redemption, persistence.
- 009_group-randomizer: parse/dedupe names, choose group count, assign every name exactly once, group-size difference ≤1, copy output.

## Closure boundary

`BATCH_VERIFIED_LOCAL` requires all nine contract suites and real Chromium flows to pass from this artifact root. Public GitHub/Pages deployment remains separate and requires explicit approval.
