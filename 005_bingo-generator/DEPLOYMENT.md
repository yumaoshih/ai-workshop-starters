# 一起賓果公開部署

## 目標

讓不同 Wi‑Fi、行動網路與受限 NAT 下的主持人和玩家，仍能使用同一個公開邀請連結完成申請、批准、入場與遊戲。

## 架構

- Render Web Service：提供網頁、公開 HTTPS/WSS 房間服務與健康檢查。
- WebRTC DataChannel：承載遊戲資料。
- Cloudflare Realtime TURN：只有直連失敗時才轉接資料。
- 單一 Render instance：房間狀態目前保存在記憶體；請勿水平擴充成多台 instance。

## Cloudflare TURN

1. 在 Cloudflare Dashboard 建立 Realtime TURN key。
2. 保存 TURN Key ID 與 API token；不要提交到 Git。
3. Render 初次建立 Blueprint 時，把它們分別填入 `TURN_KEY_ID` 與 `TURN_KEY_API_TOKEN`。

後端會呼叫 Cloudflare 的 `generate-ice-servers` API，產生四小時短效憑證，並移除瀏覽器通常會封鎖的 port 53 URL。

官方文件：<https://developers.cloudflare.com/realtime/turn/generate-credentials/>

## Render

1. 將 Repository 推送到 GitHub。
2. 在 Render 選擇 New → Blueprint，連接此 Repository。
3. Render 會讀取根目錄的 `render.yaml`。
4. 填入兩個 TURN 祕密值並建立服務。
5. 等待 `/healthz` 通過，取得 `https://…onrender.com` 公開網址。

官方文件：<https://render.com/docs/infrastructure-as-code>

免費 instance 可用於驗收，但閒置後會休眠。正式活動若不希望第一次開啟等待冷啟動，請在確認費用後改用不休眠方案。

## 發布後驗收

1. `GET /healthz` 必須回傳 HTTP 200、`status: "ok"`、`turnConfigured: true`。
2. 主持人用公開網址開房並複製邀請。
3. 玩家在另一個瀏覽器環境開啟邀請，房間碼應自動填好。
4. 玩家送出申請，主持人應立即看到暱稱。
5. 主持人批准後，玩家應自動顯示「已加入」。
6. 玩家按「我準備好了」，主持人的「開始遊戲」應啟用。
7. 開局後，兩端應同步題目與玩家畫記狀態。

## 本機驗證

```bash
npm run bingo:test
npm run verify
```

測試會啟動假的 TURN 憑證服務，驗證伺服器確實使用 Bearer token 取得短效 ICE 設定，也驗證缺少 TURN 憑證時正式健康檢查會拒絕通過。
