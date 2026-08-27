# RED — fasting-clock

## 測試命令
`test -f index.html` → exit 1 (檔案不存在)

## 失敗原因
- 尚未建立 index.html，契約中定義的選項、按鈕、時間顯示皆不存在。
- 缺少 SELECT 元素 `#preset`、按鈕 `data-action`、Elapsed/Remaining 顯示 `.elapsed` `.remaining`。

## 實測結果
- 命令：`test -f /shared-artifacts/ai-workshop-friday/fasting-clock/index.html`
- exit code: 1
- 四項行為檢查皆因檔案缺失無法執行，歸類為 RED。

## 預期 RED 狀態
- 所有五項行為檢查失敗。
