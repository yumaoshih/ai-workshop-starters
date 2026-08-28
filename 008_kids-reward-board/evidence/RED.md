# RED — kids-reward-board

實際 Chromium／`file://` 測試。

```bash
npx playwright test tests/starters.spec.js --config=playwright.config.js --grep kids-reward-board
```

結果：4 tests；RED 3 passed / 1 failed；exit 1；姓名未跨 reload 回填。
