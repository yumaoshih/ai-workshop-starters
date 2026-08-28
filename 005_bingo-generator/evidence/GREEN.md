# GREEN — bingo-generator

修正後以實際 Chromium／`file://` 重跑。

```bash
npx playwright test tests/starters.spec.js --config=playwright.config.js --grep bingo-generator
```

結果：7 passed；exit 0。包含產品入口、主持大廳、兩位玩家加入、主持人允許、全員準備、發牌、開題與合法畫記。無遠端請求，測試監聽期間無 page error。

視覺驗證包含桌機入口、主持大廳、手機入口與手機加入畫面。參考稿與實作並排比對記錄在 `design-qa.md`，最終結果為 passed。

靜態契約：6 / 6 通過。
