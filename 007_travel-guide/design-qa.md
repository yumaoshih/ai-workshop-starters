# Design QA — 翻頁旅行手冊

- Source visual truth: `/Users/simonaep/Downloads/IMG_4865.jpg` and `/Users/simonaep/Downloads/IMG_4864.jpg`
- Implementation screenshots: `/Users/simonaep/ai-workshop-starters/007_travel-guide/implementation-desktop-final.png`, `/Users/simonaep/ai-workshop-starters/007_travel-guide/implementation-desktop-page2-final-viewport.png`, `/Users/simonaep/ai-workshop-starters/007_travel-guide/implementation-mobile-final.png`, `/Users/simonaep/ai-workshop-starters/007_travel-guide/implementation-packing-manager.png`, `/Users/simonaep/ai-workshop-starters/007_travel-guide/implementation-packing-manager-mobile.png`, `/Users/simonaep/ai-workshop-starters/007_travel-guide/implementation-drag-page.png`
- Final combined comparison: `/Users/simonaep/ai-workshop-starters/007_travel-guide/design-comparison-page2-final.png`
- Browser viewport: 1280 × 720 CSS px for final desktop comparison; 390 × 844 CSS px for mobile responsive check
- Pixel dimensions: source 1179 × 1703 px; final desktop viewport capture 1265 × 712 px; final narrow mobile viewport capture 305 × 804 px (browser scrollbar/chrome excluded)
- Density normalization: device pixel ratio 1. The final comparison scales both source and implementation proportionally to 720 px high and places them side by side; no content crop or synthetic frame was added.
- State: page 2 of 7, route overview, prompt synchronized to PAGE 02

## Full-view comparison evidence

`design-comparison-page2-final.png` shows the supplied prompt-to-handbook reference and the implemented booklet/prompt workspace in one comparison image. The implementation intentionally adapts the reference from a static instruction sheet into an interactive reading surface, while retaining the warm paper palette, Traditional Chinese content, watercolor travel imagery, vertical 3:4 handbook, dense information cards, and a prompt beside the generated result.

## Focused region evidence

A separate crop was not required. At the final comparison resolution, the book title, watercolor collage, three itinerary cards, prompt title, prompt body, page badge, and copy action are all legible enough to judge the required fidelity surfaces. The mobile capture was separately inspected for the stacked book/prompt state.

## Required fidelity surfaces

- Fonts and typography: the Traditional Chinese serif display face and system sans-serif supporting copy recreate the hand-lettered editorial hierarchy without remote font loading. Title weight, tracking, body leading, and small mono page labels are consistent. The prompt title remains on one line at the default desktop width after the final fix.
- Spacing and layout rhythm: the desktop two-column split clearly prioritizes the 3:4 booklet while preserving a readable prompt column. Paper margins, book depth, rounded workspace panels, control spacing, and the mobile stacked layout are balanced. No horizontal overflow was observed.
- Colors and visual tokens: warm cream, parchment beige, terracotta, sage, and mist blue track the reference closely and keep sufficient text contrast.
- Image quality and asset fidelity: all three illustrations are local 1200 × 900 px WebP raster assets generated in one watercolor-and-colored-pencil art direction. Crops are sharp and proportionate, with no placeholders, remote calls, CSS drawings, or inline SVG substitutions. Their combined page payload is about 648 KB after optimization.
- Copy and content: all app-specific copy is Traditional Chinese. The seven page prompts correspond to the visible page content, and page 2 explicitly includes the same route overview and slow-travel note shown in the booklet.

## Interaction and browser verification

- Tested next/previous page buttons, page-edge click zones, ArrowLeft/ArrowRight navigation, mobile swipe, first/last-page clamping, prompt synchronization, prompt copy feedback, checklist persistence after reload, and checklist reset.
- Verified exactly seven pages and one active page at a time.
- Checked the browser console after interaction; no errors or warnings were present.
- Verified all visible images loaded from local paths and the page issued no remote asset requests.

## Comparison history

### Pass 1

- [P2] Page 2 had too much unused lower-page space compared with the reference's information density.
- [P2] At the default 1280 px desktop width, the prompt page badge reduced the title's available width and allowed the last character to wrap.

Fixes made:

- Added a bottom-aligned `慢旅提醒` block to page 2 and synchronized that detail in the page 2 prompt.
- Positioned the PAGE badge independently from the title flow so the full prompt title stays on one line.

### Pass 2

Post-fix evidence: `/Users/simonaep/ai-workshop-starters/007_travel-guide/implementation-desktop-page2-final-viewport.png` and `/Users/simonaep/ai-workshop-starters/007_travel-guide/design-comparison-page2-final.png`.

Interaction and responsive review then found:

- [P1] Native touch swipes could be cancelled by the browser's default gesture handling.
- [P1] A user's edited prompt draft was replaced by the default prompt after navigating away and back.
- [P1] Content pages could clip text below 380 px because their fixed 3:4 frame used hidden overflow.
- [P2] Invisible page-edge pointer controls remained in the sequential keyboard tab order.
- [P2] The original local PNG payload was too heavy for a published mobile experience.

Fixes made:

- Added `touch-action: pan-y` and pointer capture/release for reliable horizontal swipes while retaining vertical page scrolling.
- Added a per-page prompt draft model and cleared stale copy feedback on every edit.
- Made content pages internally scrollable on very narrow screens while keeping the cover and end page fixed.
- Removed page-edge zones from sequential keyboard focus; visible previous/next buttons remain fully keyboard accessible.
- Migrated legacy checklist data and replaced loaded PNGs with explicit-dimension 1200 × 900 WebP assets.

### Pass 3

Post-fix runtime evidence:

- At 320 px, pages 2–6 use `overflow-y: auto`; the document has no horizontal overflow.
- All five visible image instances loaded successfully from the three local WebP files at a natural width of 1200 px.
- Prompt edits survived forward/back navigation, and the copy feedback cleared after a new edit.
- Page-edge controls report `tabIndex: -1`; main navigation buttons remain visible and focusable.
- Pointer capture is limited to touch/pen swipes that do not begin on a page edge; real next/previous page-edge clicks advance and return correctly.
- The final console check returned no errors or warnings.

### Pass 4

The luggage checklist was expanded without overloading the compact booklet page:

- Added a categorized library with 47 common packing options and a compact six-item booklet preview.
- Added a full-screen packing manager with custom items, add/remove controls, pointer-based drag sorting, and keyboard-friendly up/down fallbacks.
- Persisted selected items, custom items, order, and checked state, including migration from the earlier checklist storage format.
- Reworked drag sorting to listen at document level so it remains stable when the pointer leaves the small drag handle; the list is rerendered after a drop so disabled move controls stay accurate.

The page-turn interaction now follows the gesture before committing:

- Horizontal pointer movement applies live translation, rotation, and opacity feedback to the active or previous page.
- A 58 px threshold completes the page turn; shorter or mostly vertical gestures return the page to rest.
- Page-edge clicks, visible controls, keyboard navigation, and vertical mobile scrolling remain available.

Post-fix evidence:

- Desktop and 390 × 844 responsive packing-manager captures show the complete library and stacked mobile flow without horizontal overflow.
- Real pointer dragging reordered the selected list, rerendered correct move-button states, and survived reload.
- Custom item creation survived reload; library add/remove returned the count from 14 to 13.
- A real leftward drag advanced the booklet from page 1 to page 2.
- The focused Playwright suite passed all 9 travel-guide tests, including drag-follow styling, page turn, categorized library, canonicalized custom entries, keyboard-focus retention, reordered-list persistence, and v1/v2 storage migration.
- Browser console logs remained empty after interaction.

No actionable P0, P1, or P2 differences remain.

## Follow-up polish

- [P3] A still image cannot communicate the complete page-turn motion curve; the live browser interaction was used to validate that behavior instead.

final result: passed
