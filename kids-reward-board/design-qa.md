# 小小集點王 — Design QA

## Comparison target

- Source visual truth:
  - `evidence/source-adventure.png` — 852×1846 px.
  - `evidence/source-sticker.png` — 853×1844 px.
  - `evidence/source-shop.png` — 853×1844 px.
- Browser-rendered implementation:
  - `implementation-mobile-adventure.png` — 375×1389 px.
  - `implementation-mobile-sticker.png` — 375×1389 px.
  - `implementation-mobile-shop.png` — 375×1395 px.
  - `implementation-desktop-shop.png` — 1425×1530 px.
  - `implementation-responsive-desktop.png` — 1440×1024 px desktop workspace.
  - `implementation-responsive-mobile.png` — 390×844 px mobile App viewport.
  - `implementation-responsive-mobile-sheet.png` — 390×844 px mobile bottom sheet.
  - `implementation-responsive-narrow-320.png` — 320×720 px narrow mobile viewport.
  - `implementation-theme-picker.png` — 375×812 px.
  - `implementation-narrow-320.png` — 320×1572 px.
- Side-by-side evidence:
  - `design-comparison-adventure.png`.
  - `design-comparison-sticker.png`.
  - `design-comparison-shop.png`.
- Route: `http://127.0.0.1:4176/kids-reward-board/`.
- State: child `小安`, balance 7, target `故事時間 10 分鐘`, 7 / 10 progress.

## Normalization

- Source mocks were generated near 2× mobile density and normalized to a 390px CSS presentation width in the comparison page.
- The in-app browser used a requested 390×844 mobile viewport; its content screenshot excludes the 15px scrollbar and is therefore 375px wide.
- Full-page captures compare the complete single-column flow rather than browser chrome.
- Desktop responsive evidence uses a 1440×1024 viewport and captures the complete two-column first screen.
- Mobile responsive evidence uses a requested 390×844 viewport; browser content width excludes the scrollbar gutter.
- A separate 320×720 capture verifies the narrow breakpoint, stacked bottom actions, and zero horizontal overflow.

## Intentional product constraint

The three source mocks began as independent product directions. The selected product direction intentionally keeps one shared information architecture and interaction model while applying each mock's palette, illustration style, typography mood, point alias, borders, and control treatment as a theme. Differences in section order between the three original mocks are therefore intentional, not implementation drift.

## Findings

No actionable P0, P1, or P2 findings remain.

### Required fidelity surfaces

- **Fonts and typography — passed:** display stacks change by theme while all body text remains readable Traditional Chinese. Headings, point totals, reward names, metadata, and disabled-state explanations keep clear optical hierarchy without clipped text.
- **Spacing and layout rhythm — passed:** the hero, action pair, target reward, reward list, and footer maintain a stable shared order. At 960px and above, desktop becomes a true two-column workspace with a 430px sticky points panel and a flexible rewards panel; the reward list uses two columns. The 390px view is a full-width App shell with sticky header and fixed bottom action bar; at 320px the actions stack without overlap or horizontal clipping.
- **Colors and visual tokens — passed:** each theme maps the selected source palette into the same semantic tokens. Success, danger, disabled, border, surface, and focus states stay understandable across all three palettes and do not rely on color alone.
- **Image quality and asset fidelity — passed:** all three hero visuals are real transparent PNG assets generated from the selected source art direction. They remain sharp, correctly cropped, and free of placeholder, CSS-art, emoji, inline-SVG, or transparency-halo substitutions.
- **Copy and content — passed:** all visible product copy is Traditional Chinese. Point aliases change with the theme while progress and accessibility announcements retain the underlying point meaning. Reward affordability and redemption consequences are explicit.
- **Icons — passed:** the interface does not require decorative UI icons; text labels are used for actions. Custom illustration content is provided by local raster assets.
- **States and interactions — passed:** add, disabled subtract at zero, target selection, affordability, redemption confirmation, theme selection, reward editing, reset choices, focus states, persistence, and reduced motion are implemented.
- **Accessibility — passed:** semantic buttons, labels, progressbar, dialogs, radio roles, disabled reasons, focus indicators, `aria-live`, 44px targets, and reduced-motion handling are present.

## Focused region evidence

- `implementation-theme-picker.png` verifies the dialog hierarchy, three preview choices, selected state, close action, and mobile fit.
- The hero/action/goal regions are legible in each side-by-side comparison, so no additional crop was required.

## Comparison history

### Pass 1

- [P2] The text-only close control wrapped vertically in the mobile theme dialog.
- [P2] Adventure and sticker primary action labels wrapped awkwardly within the two-button row.
- Fixes: increased the close button's minimum width and added no-wrap behavior; shortened theme action labels while preserving meaning; kept generic point meaning in accessible text.

### Pass 2

- Post-fix evidence: `implementation-theme-picker.png`, `implementation-mobile-adventure.png`, `implementation-mobile-sticker.png`, and all three side-by-side comparison images.
- Result: no remaining P0/P1/P2 findings.

### Pass 3 — responsive desktop / mobile adaptation

- [P1] Desktop still rendered as a narrow mobile column and left most of the viewport unused.
- [P2] Mobile controls followed a web-page flow rather than behaving like a frequently used App action surface.
- [P2] The initial 320px pass produced a 3px horizontal overflow because the sticky header offsets did not match the narrow-shell padding.
- Fixes: introduced a 960px two-column desktop workspace, a 760–959px tablet layout, a sticky mobile header, safe-area-aware fixed point actions, mobile bottom-sheet dialogs, and matched 320px header offsets.
- Post-fix evidence: `implementation-responsive-desktop.png`, `implementation-responsive-mobile.png`, `implementation-responsive-mobile-sheet.png`, and `implementation-responsive-narrow-320.png`.
- Result: no remaining P0/P1/P2 findings.

## Browser verification

- In-app browser rendered mobile, narrow, desktop, theme-picker, and all three theme states.
- Responsive runtime checks verified a `430px 678px` desktop grid at 1440×1024, centered 440px desktop dialog, fixed mobile action bar, sticky mobile header, full-width mobile bottom sheet, and no horizontal overflow at 390px or 320px.
- Tested adding points to 7, target progress to 7 / 10, theme switching with unchanged balance, reload persistence, and visible theme selection state.
- Console errors and warnings checked: none.
- Automated Chromium tests additionally covered negative-balance protection, redemption confirmation, name and balance persistence, reset, theme persistence, and custom reward persistence.

## Follow-up polish

- [P3] Future custom themes could optionally provide small reward-category illustrations, but the current text-first reward rows are intentionally robust for user-created rewards.

## Final result

final result: passed
