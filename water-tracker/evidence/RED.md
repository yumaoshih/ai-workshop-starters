# RED — water-tracker

## 測試命令
`test -f index.html` → exit 1 (檔案不存在)

## 失敗原因
- 尚未建立 index.html。
- 契約行為：目標設定輸入 `#goal`、新增/減少按鈕、總量顯示 `.total`、重置按鈕皆未實作。

## 實測結果
- 命令：`test -f /shared-artifacts/ai-workshop-friday/water-tracker/index.html`
- exit code: 1
- 五項行為檢查皆因檔案缺失無法執行，歸類為 RED。

## 預期 RED 狀態
- 五項行為全部失敗。
