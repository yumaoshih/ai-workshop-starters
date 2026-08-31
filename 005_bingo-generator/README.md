# 一起賓果

給朋友聚會、課堂活動與現場破冰使用的多人賓果。打開頁面後直接選「開一局」或「加入遊戲」，不用註冊。

## 產品流程

1. 主持人選擇「聚會破冰」、「朋友默契」或自訂題目。
2. 開一局並把邀請連結分享給朋友。
3. 玩家點開連結後只要輸入暱稱；也可以手動輸入房間碼。
4. 主持人確認名字並允許加入，玩家會自動入場，再按「我準備好了」。
5. 全員準備完成，主持人開始遊戲並依序開題。
6. 玩家只能畫記已開出的題目；連成一線後宣告 Bingo，由主持人確認結果。

## 產品原則

- 所有主要文案都使用「開局、加入、允許、準備、開題」等娛樂產品語言。
- 玩家只需輸入房間碼與暱稱；主持人允許後會自動完成入場。
- 主持人是房間唯一管理者，可允許或移除玩家，並決定何時開始。
- 每位玩家會拿到不同排列的 5×5 卡片，中央格固定為「免費」。
- 題目可在開局前編輯、重新排列與列印。

## 本地使用

多人模式需要啟動房間服務：

```bash
npm install
npm run bingo:dev
```

再開啟 `http://127.0.0.1:4176/bingo-generator/`。直接開啟 `index.html` 仍可預覽畫面與編輯題目，但無法讓其他裝置加入。

## 不同網路的公開部署

公開畫面繼續使用 GitHub Pages；`worker.mjs` 與 `wrangler.jsonc` 會把房間建立、主持人批准與入場配對部署到 Cloudflare Workers＋Durable Objects。公開環境另需兩個 Cloudflare Realtime TURN 祕密值：

- `TURN_KEY_ID`
- `TURN_KEY_API_TOKEN`

服務只會在主持人批准玩家時產生四小時短效憑證，永久金鑰不會傳到瀏覽器。`REQUIRE_TURN=true` 時，缺少金鑰會讓 `/healthz` 回傳 503，避免沒有跨網路備援的版本被誤判為部署成功。部署後再把 Worker 的 WSS 網址填入 `config.js`，GitHub Pages 就會使用公開房間服務。

完整操作與驗收方式請見 [`DEPLOYMENT.md`](DEPLOYMENT.md)。

## 測試

```bash
node contract-test.js 005_bingo-generator
npm run bingo:worker:test
npm run bingo:worker:check
npm run bingo:test
```
