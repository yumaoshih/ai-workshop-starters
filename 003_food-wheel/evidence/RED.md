# RED — food-wheel

## 測試命令
`test -f index.html` → exit 1 (檔案不存在)

## 失敗原因
- 尚未建立 index.html。
- 選項列表 `ul.options`、旋轉按鈕、結果顯示 `.result` 均未存在。

## 實測結果
- 命令：`test -f /shared-artifacts/ai-workshop-friday/003_food-wheel/index.html`
- exit code: 1
- 四項行為檢查皆因檔案缺失無法執行，歸類為 RED。

## 預期 RED 狀態
- 四項行為全部失敗。
