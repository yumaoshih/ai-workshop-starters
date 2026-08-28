# GREEN — fasting-clock

## 測試命令
`node /shared-artifacts/ai-workshop-friday/contract-test.js 001_fasting-clock`

## 測試結果
- 命令：`node /shared-artifacts/ai-workshop-friday/contract-test.js 001_fasting-clock`
- exit code: 0
- 通過 5/5 項行為檢查

## 行為檢查細節
1. preset-existence — 三個預設按鈕（16、18、20 小時）存在。
2. start-pause-reset — 三個行為按鈕（start、pause、reset）可點擊。
3. elapsed-display — 初始顯示 00:00。
4. remaining-display — 初始顯示 00:00。
5. reset-clears-state — 重置後歸零顯示 00:00。

## 附加驗證（手動瀏覽器）
- 開啟 file:// 路徑，可正常選擇預設、開始計時、暫停、重置。
- localStorage 儲存於命名空間 `fasting-clock:v1`。
