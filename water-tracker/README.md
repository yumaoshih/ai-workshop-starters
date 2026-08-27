# 每日飲水記錄

純靜態、localStorage 儲存、不需要網路的每日飲水追蹤工具。

## 本地使用
1. 打開 `index.html`。
2. 設定每日目標（預設 2000 ml）。
3. 點擊「＋ 新增 200ml」或「− 減少 200ml」。
4. 點擊「重新開始新的紀錄」可清空當日。

## 資料儲存
- 當日總量儲存於 `water-tracker:v1:date`。
- 目標儲存於 `water-tracker:v1:goal`。
- 跨天自動歸零。

## Fork → Remix → Publish
1. Fork 此資料夾，調整單位與配色。
2. 不依賴外部資源，可直接改為獨立 HTML。
3. 如需發佈，另開 GitHub/Pages 流程（需額外審核）。

## Level 1–3 任務
- Level 1: 設定目標與新增飲水。
- Level 2: 減少飲水與查看總量。
- Level 3: 調整單位與新增不同量程。
