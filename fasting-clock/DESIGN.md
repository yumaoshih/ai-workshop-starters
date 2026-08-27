# DESIGN.md — fasting-circle

## 表面
深色靜心面板，中心圓環代表禁食進度。預設選項以平鋪按鈕群組呈現，行為按鈕三連排。

## 調色板（tokens）
- --bg: #0b0d10
- --panel: #161a1f
- --ink: #e8edf2
- --muted: #8a94a3
- --accent: #7ee787
- --accent-dim: #3c6b44
- --ring: #2a3138
- --warn: #f2b86b

## 構圖
- 中央 SVG 圓環進度 + 大號時間數字，下方預設選項、行為按鈕、資訊列。
- 距離頂部與底部留白，強化專注感。

## 無障礙
- 所有互動元素可聚焦、可鍵盤操作。
- 時間顯示 aria-live 提示。
- 提供 sr-only 公告區域。

## 回應式
- 最大寬度 390px，390×844 與桌面皆可呈現。
- 字體與圓環大小在小螢幕微調。

## 字體
- -apple-system、PingFang TC、Noto Sans CJK TC 序列。
