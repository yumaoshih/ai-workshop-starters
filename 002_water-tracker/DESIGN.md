# DESIGN.md — water-tracker

## 表面
深藍冷色調，中心為抽象水滴形狀與圓環進度示意。上方目標輸入組，兩側行動按鈕，底部重置。

## 調色板（tokens）
- --bg: #06141f
- --panel: #0d2536
- --panel2: #0f2c40
- --ink: #e6f2f7
- --muted: #8fb4c6
- --accent: #39e0d6
- --accent-dim: #1f8a82
- --ring: #1c4a60
- --warn: #f4c97a

## 構圖
- 目標輸入列 → 中心水滴與總量大數字 → 新增/減少按鈕 → 資訊列 → 重置。

## 無障礙
- 所有按鈕可鍵盤聚焦。
- 目標輸入有 label 與 sr-only 說明。
- 總量變化以 aria-live 提示。

## 回應式
- 最大寬度 390px，圓滴與字體在 390×844 與桌面皆可。

## 字體
- -apple-system、PingFang TC、Noto Sans CJK TC 序列。
