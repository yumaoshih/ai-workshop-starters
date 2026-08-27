# RED — bingo-generator

實際 Chromium／`file://` 測試。

```bash
npx playwright test tests/starters.spec.js --config=playwright.config.js --grep bingo-generator
```

結果：4 tests；RED 3 passed / 1 failed；exit 1；缺少可見重置。
