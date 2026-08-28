# GREEN — kids-reward-board

修正後以實際 Chromium／`file://` 重跑。

```bash
npx playwright test tests/starters.spec.js --config=playwright.config.js --grep kids-reward-board
```

結果：6 passed；exit 0。涵蓋負數防護、兌換確認、姓名與餘額保存、重設、主題保存及自訂獎勵保存。

```bash
npx playwright test tests/pages.spec.js --config=playwright.config.js --grep kids-reward-board
```

結果：1 passed；exit 0。GitHub Pages 形式的子路徑可正常載入，無遠端請求與 page error。

```bash
node contract-test.js kids-reward-board
```

結果：12 / 12 通過；exit 0。
