# GREEN — water-tracker

## 測試命令
`node /shared-artifacts/ai-workshop-friday/contract-test.js 002_water-tracker`

## 測試結果
- 命令：`node /shared-artifacts/ai-workshop-friday/contract-test.js 002_water-tracker`
- exit code: 0
- 通過 5/5 項行為檢查

## 行為檢查細節
1. goal-config — 目標設定輸入欄位存在。
2. add-intake — 新增 200ml 按鈕存在。
3. remove-intake — 減少 200ml 按鈕存在。
4. total-display — 顯示當日總飲水量 0 ml。
5. reset-action — 重置按鈕存在。

## 附加驗證（手動瀏覽器）
- 目標可輸入與儲存。
- 點擊新增/減少更新總量且最低為 0。
- 當日數據儲存於 `water-tracker:v1:date`，目標儲存於 `water-tracker:v1:goal`。
- 跨天自動歸零。
