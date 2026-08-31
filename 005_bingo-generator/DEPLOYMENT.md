# 一起賓果公開部署

## 目標

GitHub Pages 保留為公開遊戲畫面；Cloudflare Worker 與 Durable Object 負責建立房間、主持人批准與入場配對。玩家在不同 Wi‑Fi、行動網路或受限網路下，仍使用同一個邀請連結加入。

## 架構

- GitHub Pages：發布 `005_bingo-generator/` 靜態畫面。
- Cloudflare Worker：提供公開 HTTPS 健康檢查與 WSS 房間入口。
- Cloudflare Durable Object：暫存房間、主持人與玩家連線；使用 WebSocket Hibernation API，閒置時可休眠。
- Cloudflare Realtime TURN：只有玩家無法直接連線時才轉接資料。
- WebRTC DataChannel：承載開局後的遊戲資料。

## 前置需求

1. Node.js 22 以上（Repository 已提供 `.nvmrc`）。
2. Cloudflare 帳號。
3. GitHub Pages 已從這個 Repository 發布。

```bash
nvm use
npm ci
```

## 建立 Cloudflare Worker

設定檔位於 `005_bingo-generator/wrangler.jsonc`。第一次部署前可先執行不會建立雲端資源的打包檢查：

```bash
npm run bingo:worker:check
```

登入並部署：

```bash
npx wrangler login
npx wrangler deploy --config 005_bingo-generator/wrangler.jsonc
```

部署完成後會取得 `https://…workers.dev` 網址。Worker 的 `/healthz` 是健康檢查，`/ws` 是房間入口。

官方文件：

- <https://developers.cloudflare.com/workers/wrangler/commands/#deploy-1>
- <https://developers.cloudflare.com/durable-objects/best-practices/websockets/>

## 設定跨網路備援

1. 在 Cloudflare Dashboard 建立 Realtime TURN key。
2. 建立只用於該 TURN key 的 API token。
3. 將兩個永久祕密值保存為 Worker secrets；不要寫入 Git 或前端：

```bash
npx wrangler secret put TURN_KEY_ID --config 005_bingo-generator/wrangler.jsonc
npx wrangler secret put TURN_KEY_API_TOKEN --config 005_bingo-generator/wrangler.jsonc
```

服務只在主持人批准玩家時產生四小時短效憑證，永久祕密值不會送到瀏覽器。瀏覽器通常會封鎖的 port 53 URL 也會被移除。

官方文件：<https://developers.cloudflare.com/realtime/turn/generate-credentials/>

## 連接 GitHub Pages

把 `005_bingo-generator/config.js` 的 `signalUrl` 更新為 Worker 的 WSS 網址：

```js
window.BINGO_CONFIG = Object.freeze({
  signalUrl: 'wss://你的-worker.workers.dev/ws',
});
```

提交並推送後，等待 GitHub Pages 發布完成。公開頁面會使用 Cloudflare 房間服務；本機以 `npm run bingo:dev` 啟動時，`signalUrl` 留空即可自動使用本機 `/ws`。

## 發布後驗收

1. `GET https://你的-worker.workers.dev/healthz` 回傳 HTTP 200、`status: "ok"`、`turnConfigured: true`。
2. 主持人從 GitHub Pages 開房並複製邀請。
3. 玩家在另一個瀏覽器或行動網路開啟邀請，房間碼自動填好。
4. 玩家送出申請，主持人立即看到暱稱。
5. 主持人批准後，玩家自動顯示「已加入」。
6. 玩家按「我準備好了」，主持人的「開始遊戲」啟用。
7. 開局後，兩端同步題目、畫記與 Bingo 結果。

## 本機驗證

```bash
npm run bingo:worker:test
npm run bingo:worker:check
npm run bingo:test
npm run verify
```

測試會驗證 Durable Object 的房間生命週期、主持人批准、訊號轉送、短效 TURN 憑證、缺少祕密值時拒絕正式就緒，以及既有的完整多人遊戲流程。
