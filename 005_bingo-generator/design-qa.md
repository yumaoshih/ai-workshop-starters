# Design QA — 一起賓果

## Comparison Target

- Source visual truth:
  - `evidence/reference-product-landing.png` — 1487 × 1058 px
  - `evidence/reference-product-host-lobby.png` — 1487 × 1058 px
- Implementation screenshots:
  - `evidence/product-landing.png` — 1265 × 990 px
  - `evidence/product-host-lobby.png` — 1265 × 1117 px
  - `evidence/product-mobile-landing.png` — 375 × 812 px
  - `evidence/product-mobile-join.png` — 390 × 844 px
- Combined comparison evidence: `evidence/design-qa-comparison.png` — 1265 × 1244 px
- Browser/CSS viewport: desktop in the Codex in-app browser at its 1265 px content width; responsive checks at 375 × 812 and 390 × 844 CSS px.
- Density normalization: browser screenshots used device scale factor 1. Source and implementation were displayed at equal column widths in the comparison document, preserving aspect ratio instead of resampling source pixels.
- States compared:
  - Product landing with the default「聚會破冰」theme selected.
  - Host lobby with one ready player and one pending join request.

## Full-view Comparison Evidence

The landing implementation preserves the selected reference's centered editorial headline, paired purple/pink entry cards, three theme choices, warm ivory surface, near-black type, and generous whitespace. The host lobby preserves the selected reference's room-code emphasis, two-column lobby composition, pending/approved player grouping, theme control, and large start action.

The implementation adds a compact top navigation and a collapsed request handoff area. These are intentional product-flow additions required to move between host and player paths while keeping the normal lobby visually clean.

## Focused Region Comparison Evidence

- Landing action cards: checked icon scale, card proportions, title hierarchy, border color, button placement, and purple/pink role distinction.
- Host room card: checked room-code scale, centered invite action, helper copy, and collapsed secondary controls.
- Player groups and start action: checked section separation, row affordances, status treatment, disabled/enabled start state, and ready-count copy.
- Mobile join form: checked headline wrapping, field stacking, button width, card padding, and absence of horizontal overflow.

## Required Fidelity Surfaces

- Fonts and typography: system Traditional Chinese stack is consistent across screens. Display headings use a heavy optical weight with tight tracking; small labels remain readable. The visual hierarchy matches the references without remote font dependencies.
- Spacing and layout rhythm: desktop uses the same broad two-column composition and generous margins. Cards, gaps, radii, and lower action band are consistent. Mobile collapses to one column with 18 px page gutters and no horizontal overflow.
- Colors and visual tokens: warm ivory background, near-black foreground, purple primary actions, pink join/approval actions, beige borders, green ready state, and muted helper copy match the selected direction.
- Image quality and asset fidelity: the two entry icons are dedicated raster assets generated for this art direction and remain sharp at their rendered size. No placeholder or improvised CSS illustration is used.
- Copy and content: all visible product copy uses「開一局、加入遊戲、加入申請、入場確認、允許加入、準備好了、開始遊戲」. No networking or implementation terminology is shown in the interface.

## Comparison History

### Iteration 1 — blocked

- [P2] The player join screen displayed an empty game-card region before the room started.
  - Fix: hide the player game card until the host starts the game.
- [P2] Long internal request and confirmation payloads were visible inside otherwise consumer-facing panels.
  - Fix: keep payload fields accessible to the copy flow but visually hide them; automatically collapse the host request area after a valid request is recognized.
- [P2] The first host capture used an empty lobby and did not represent the selected mock's populated state.
  - Fix: capture a real state with one ready player and one pending player request.

### Iteration 2 — passed

- Post-fix evidence: `evidence/design-qa-comparison.png`, `evidence/product-mobile-join.png`.
- No actionable P0, P1, or P2 fidelity issues remain.

## Findings

- No actionable P0, P1, or P2 findings remain.

## Open Questions

- None blocking. The number of sample players differs from the mock because the final evidence uses a smaller real multiplayer session; the layout and player-state treatment are equivalent.

## Implementation Checklist

- [x] Product landing matches the chosen 1 direction.
- [x] Host lobby matches the chosen 3 direction.
- [x] Host approval and all-ready start gate work.
- [x] Player join, ready, board, mark, and Bingo claim flow work.
- [x] Desktop and mobile layouts are visually verified.
- [x] Browser console has no errors or warnings during the primary flow.

## Follow-up Polish

- [P3] A future pass could add a native share sheet when the product moves beyond the current static-page scope.

final result: passed
