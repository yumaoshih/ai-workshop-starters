# Design QA — food-wheel 3.2.1

## Comparison target

- Usability baseline: `/Users/simonaep/ai-workshop-starters/food-wheel/evidence/usability-audit-01-start.png`
- 001 visual-system reference: `/Users/simonaep/ai-workshop-starters/water-tracker/implementation-mobile-empty-final.png`
- Implemented initial state: `/Users/simonaep/ai-workshop-starters/food-wheel/evidence/implementation-mobile.png`
- Implemented result state: `/Users/simonaep/ai-workshop-starters/food-wheel/evidence/implementation-mobile-result.png`
- Implemented notebook state: `/Users/simonaep/ai-workshop-starters/food-wheel/evidence/implementation-mobile-notebook.png`
- Implemented desktop state: `/Users/simonaep/ai-workshop-starters/food-wheel/evidence/implementation-desktop.png`
- Full-view comparison: `/Users/simonaep/ai-workshop-starters/food-wheel/evidence/design-comparison-mobile.png`
- Iteration comparison: `/Users/simonaep/ai-workshop-starters/food-wheel/evidence/design-qa-iteration-1.png`
- Scroll fix, initial position: `/Users/simonaep/ai-workshop-starters/food-wheel/evidence/implementation-mobile-scroll-start.png`
- Scroll fix, rightmost position: `/Users/simonaep/ai-workshop-starters/food-wheel/evidence/implementation-mobile-scroll-end.png`
- Scroll-fix comparison: `/Users/simonaep/ai-workshop-starters/food-wheel/evidence/design-qa-scroll-fix.png`

The intended change is an information-hierarchy redesign, not a pixel-identical clone of the baseline: the 001 aqua visual language and all existing 003 functionality stay intact, while the primary path becomes “select categories → spin.”

## Capture normalization

- Mobile CSS viewport: 390 × 844, device pixel ratio 1.
- Mobile source and implementation images: 375 × 812 pixels. The in-app browser excludes its scrollbar and browser surface from the saved image; both sides were captured the same way, so no density resampling was required.
- Desktop CSS viewport: 1440 × 1000, device pixel ratio 1; saved image is 1425 × 990 pixels after browser-surface exclusion.
- Compared states: initial/empty, revealed result, result-linked notebook, and desktop initial state.
- The baseline had 12 locally active dishes while the revised capture was reset to the 15-dish default. This content-state difference does not affect the hierarchy comparison.

## Findings

No actionable P0, P1, or P2 findings remain.

## Required fidelity surfaces

- Fonts and typography: passed. The Apple/PingFang/Noto stack, deep-teal hierarchy, compact support text, high-weight headings, and CTA label remain consistent with 001. Step labels add hierarchy without crowding or wrapping.
- Spacing and layout rhythm: passed after two iterations. Category choice now precedes the wheel, both steps are readable above the fold, and the primary button is fully visible in the initial mobile viewport. The added 34px scroll control fits beside “可複選” without changing the card height. Advanced disclosures retain comfortable 62px summary targets and the 480px desktop card remains centered.
- Colors and visual tokens: passed. White surface, pale green background, aqua action, deep teal text, muted gray-green support text, borders, radii, and shadows continue to use the existing tokens.
- Image quality and asset fidelity: passed. Existing generated food illustrations remain sharp and correctly scaled in category chips, result cards, and notebook tabs; no screenshot crops, emoji, custom SVG, CSS drawings, or placeholders were introduced.
- Copy and content: passed. “步驟 1／步驟 2,” “想吃哪一類？,” the live selected-count instruction, and “更多分類／回到前面” make the next action explicit. Existing restaurant notes, copy-search action, and Google Maps action are unchanged.

## Full-view comparison evidence

`evidence/design-comparison-mobile.png` places the pre-change and final mobile screens in one 774 × 860 image. It shows that category selection moved from below the primary task to immediately below the title, while the wheel and aqua CTA retain the original 001-style proportions and palette. The final screen exposes only the two-step core path; the long editor and notebook no longer compete with it.

## Focused states

Separate crops were not needed because all relevant labels and controls are legible at the normalized 375 × 812 captures. Two full-state screenshots provide the necessary focused evidence:

- `evidence/implementation-mobile-result.png` verifies result thumbnail, note hint, copy action, Maps action, and re-spin.
- `evidence/implementation-mobile-notebook.png` verifies that the result action opens the matching notebook disclosure and preserves the food-image tabs and restaurant list.
- `evidence/implementation-mobile-scroll-start.png` and `evidence/implementation-mobile-scroll-end.png` verify the focused category-strip states and readable control labels.

## Comparison history

- Iteration 1 finding [P2]: the first simplified layout still rendered an empty result placeholder before the primary CTA, leaving the button partially below the initial mobile viewport. Evidence: `evidence/implementation-mobile-before-result-hide.png` and the left side of `evidence/design-qa-iteration-1.png`.
- Fix: hide `.result.empty` until a spin completes, so the button follows the wheel immediately while the populated result still appears after spinning.
- Post-fix evidence: the right side of `evidence/design-qa-iteration-1.png` and `evidence/implementation-mobile.png` show the full CTA and readiness instruction in the first viewport. No further P0/P1/P2 issue was found.
- Iteration 2 finding [P1]: on desktop/in-app browser surfaces, the horizontally overflowing category strip supported trackpad and touch scrolling but not mouse drag, leaving later categories difficult to reach. Evidence: the left side of `evidence/design-qa-scroll-fix.png` has no visible fallback control.
- Fix: add mouse pointer drag handling without changing native touch scrolling, suppress category toggles after a drag, and add one explicit “更多分類／回到前面” fallback button.
- Post-fix evidence: the right side of `evidence/design-qa-scroll-fix.png` shows the compact control without layout drift; `evidence/implementation-mobile-scroll-end.png` shows Vietnamese and Korean at the right edge.

## Interaction and browser verification

- Verified both disclosures are closed on first load.
- Verified the five category chips appear before the wheel and the readiness copy reports 5 categories / 15 dishes.
- Verified the explicit button moves the strip from `scrollLeft 1` to the mobile maximum `307`, then returns to `1`.
- Verified an actual mouse drag moves the strip to `scrollLeft 252`; all five groups remain selected and the wheel stays at 15 dishes, so dragging does not trigger a category click.
- Verified the 4.1-second spin completes with a valid dish, changes the CTA to “再轉一次,” and reveals the food thumbnail, copy action, and Google Maps link.
- Verified “查看這組過往美食筆記” opens the matching notebook automatically; the tested result selected `異國風味` correctly.
- Verified “自訂分類與料理” opens on demand and exposes the food input.
- Verified mobile 390 × 844 and desktop 1440 × 1000 layouts.
- Browser console errors checked: none.
- Static contract: 10 / 10 passed. `git diff --check`: passed.

## Follow-up polish

- P3: the category strip stays compact and now exposes both direct manipulation and an explicit fallback. No additional onboarding animation is needed unless later testing shows the control is still missed.

final result: passed
