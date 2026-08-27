# GREEN — bingo-generator

修正後以實際 Chromium／`file://` 重跑。

```bash
npx playwright test tests/starters.spec.js --config=playwright.config.js --grep bingo-generator
```

結果：4 passed；exit 0。無遠端請求，測試監聽期間無 page error。
