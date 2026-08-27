# RED — travel-guide

實際 Chromium／`file://` 測試。

```bash
npx playwright test tests/starters.spec.js --config=playwright.config.js --grep travel-guide
```

結果：4 tests；RED 2 passed / 2 failed；exit 1；缺少重置與 swipe。
