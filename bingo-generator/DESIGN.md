# Bingo 產生器 — 設計

## 表面（Surface）

- 紙張感背景：淡米色底，格子為白色卡片圓角
- 中央免費格：獨立粉紅/紫色強調，不可編輯
- 工具列：兩個按鈕（重新產生、列印），左側編輯清單

## 色彩代幣（Tokens）

- `--bg: #f4ede4`  紙張底
- `--card: #ffffff`
- `--accent: #7c5cbf`  紫色強調
- `--free: #e08dc0`   免費格粉紅
- `--text: #2b2622`
- `--border: #d9cfbf`

## 組成（Composition）

- 左：24 個可編輯輸入框（5×5 除中央）
- 右：5×5 賓果板，字母/圖示欄不使用，純文字格
- 中央格固定為「免費」並不可編輯

## 無障礙（Accessibility）

- 按鈕有 `:focus-visible` 藍框
- 格子 tabindex 達到 keyboard 可點擊 mark（未實作 mark 狀態時至少可 focus）
- 螢幕閱讀器可讀每格內容
