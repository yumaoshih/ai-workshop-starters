# Word Lab 設計 QA

## 比對基準

- 參考圖：`/Users/simonaep/ai-workshop-starters/vocabulary-trainer/reference-option-1.png`，原始 853 × 1844 px。
- 實作圖：`/Users/simonaep/ai-workshop-starters/vocabulary-trainer/implementation-mobile-faithful-full.png`，CSS viewport 與輸出皆為 390 × 844 px，device scale factor 1。
- 正規化：參考圖等比例縮放並裁切為 390 × 844；實作以相同尺寸直接擷取。
- 比對狀態：`client` 答對後，包含正確選項、連勝回饋與下一題按鈕。
- 全畫面證據：`/Users/simonaep/ai-workshop-starters/vocabulary-trainer/design-comparison.png`。文字與圖示在全畫面 1:1 檢視已可辨識，因此不另製局部放大圖。

## 比對歷程

1. 第一輪發現 P1：舊版仍是桌機雙欄工具頁，與參考的單一手機遊戲框架不符。已重建為 430 px 置中 App，依序呈現 WORD LAB、分數、進度、單字卡、答案與下一題。
2. 第二輪發現 P2：卡片與答案密度不足，完整字典字串干擾主要答題流程。已放大單字卡與發音鍵，答案只顯示繁中主要詞義；完整資料移入翻面與設定。
3. 第三輪發現 P2：桌面視窗中的長字 `deadline` 曾換行。已加入 `long-word`／`very-long-word` 尺寸規則，重新擷取桌面證據確認單行顯示。
4. 修正後重跑 390 × 844 與 1280 × 720，未發現重疊、裁切或無法操作的核心元件。

## Findings

- 無 P0、P1 或 P2 待修問題。
- P3：參考稿的齒輪是線框，實作使用 Font Awesome 實心齒輪；輪廓位置與功能一致。
- P3：參考稿的彩紙量較多；實作以三顆小星維持較輕的答對回饋，不影響層級或操作。

## Open Questions

- 無。

## Implementation Checklist

- [x] 單一手機遊戲框架與參考順序一致。
- [x] 暖白、深綠、薄荷綠、暖黃的色彩與卡片背景已落實。
- [x] 大型 serif 單字、圓形發音鍵、四個直向答案與答對狀態已落實。
- [x] 手機 390 × 844 的核心流程完整落在首屏。
- [x] 桌面維持置中 430 px App，不展開成複雜工具頁。
- [x] 長單字自動縮放且不換行。
- [x] 完整釋義、音標、詞頻權重、來源排名、筆記與題庫篩選保留在設定／翻面。
- [x] 發音只傳入目前卡片的 `entry.word`，不會朗讀音標字串。
- [x] 正誤結果同時有圖示與文字，不只依賴顏色；答案觸控高度 60 px。
- [x] 數字鍵 1–4、Enter、P、卡片鍵盤翻面、可見焦點與 reduced-motion 已保留。
- [x] 已操作設定面板、全部／TOEIC 篩選、`deadline` 搜尋、答題、下一題、連勝／XP 與重新載入。
- [x] 瀏覽器主流程無 console error。
- [x] JavaScript 語法、manifest／contract JSON 與 `git diff --check` 通過。
- [x] 行為 contract 18 / 18 通過。

final result: passed
