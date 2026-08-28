# DESIGN.md — 斷食小日子

## 視覺方向
以參考 App 的手繪生活感為核心：米白方格紙、深藍筆觸、黃／綠重點色，以及白熊與小貓插圖。介面維持手機 App 的單欄節奏，桌面上則置中呈現 430px App 畫布。

## 調色板（tokens）
- `--paper: #faf9f5`：方格紙底色
- `--ink: #211650`：主要文字與手繪線
- `--green: #83cf61`：主要行動與選取提示
- `--yellow: #ffd42a`：進度、推薦與視覺重點
- `--muted: #77728d`：輔助文字

## 核心流程
1. 首頁引導並進入「選擇斷食計畫」。
2. 日計畫／週計畫切換，計畫卡顯示斷食與進食時數。
3. 確認選擇、開始時間與預計完成時間。
4. 計時頁支援開始、暫停、繼續、重置與結束確認。

## 圖像資產
- `assets/grid-paper-background.png`：方格紙背景。
- `assets/welcome-fasting-friends-cutout.png`：首頁與計時頁陪伴角色。
- `assets/plan-celebration-cats-cutout.png`：計畫選擇與確認頁插圖。
- `assets/icon-close.png`、`assets/icon-back.png`：手繪導覽圖示。

## 無障礙
- 所有核心控制皆使用語意化按鈕、tab、progress 與 dialog。
- 觸控目標至少 44px，提供鍵盤焦點、reduced-motion 與 aria-live 公告。
- 插圖具有替代文字；純裝飾圖示由按鈕的 aria-label 說明。

## 回應式
- 主要驗證尺寸為 393×852；桌面最大寬度 430px 並置中。
- 低高度螢幕會縮減插圖與間距，底部主要操作保持可見。

## 字體
- 系統字體序列：`-apple-system`、`PingFang TC`、`Noto Sans TC`、`Microsoft JhengHei`。
