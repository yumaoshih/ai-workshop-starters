# DESIGN.md — food-wheel

## 表面
暖色系轮盤主題，中心指针式轮盘與可編輯選項列表構成。結果框置於轮盘下方，新增輸入與行動按鈕分層。

## 調色板（tokens）
- --bg: #100a0c
- --panel: #1c1214
- --panel2: #26171a
- --ink: #f3e7e0
- --muted: #b89aa3
- --accent: #ffb86b
- --accent-dim: #b56a2a
- --ring: #4a2c26
- --rose: #ff5a7a
- --leaf: #7fd4a0

## 構圖
- 中心旋轉轮盘（指针）→ 結果框 → 可編輯選項清單 → 新增輸入 → 旋轉/重置按鈕。

## 無障礙
- 選項可刪除，有 aria-label。
- 結果以 aria-live 提示。
- 所有按鈕可鍵盤聚焦。

## 回應式
- 最大寬度 390px，轮盘 200px 在 390×844 與桌面皆可。

## 字體
- -apple-system、PingFang TC、Noto Sans CJK TC 序列。
