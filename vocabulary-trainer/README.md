# Word Lab 高頻英文單字遊戲

把單字卡改造成短回合的四選一快答遊戲。完全收錄 NGSL 1.2、NAWL 1.2、TSL 1.2 三份開放詞表，合計 5,016 筆來源紀錄，跨表合併後為 4,787 個唯一單字；每個單字保留來源、原始排名、繁中釋義、英文簡明釋義及可用音標。

## 功能

- 四選一快答、即時正誤回饋、連勝與 XP，答對會自動加入已學會收藏
- 數字鍵 `1`–`4` 可選答案，`Enter` 可接續下一題，手機版把主要回合集中在單一畫面
- 右上角「設定」集中考試分類、搜尋、詞頻、發音、筆記、自訂單字與授權資訊
- IELTS、TOEFL、TOEIC、通用英文分類
- 依來源排名計算透明的 0–100 學習權重
- 依考試、權重、關鍵字及未學會狀態篩選
- 依權重抽題，高權重單字優先出現
- 使用 Kokoro-82M 在瀏覽器本機產生高品質美式或英式發音，不需帳號、API 金鑰或付費方案
- 可切換回 Web Speech API，顯示並可指定實際裝置聲音
- 翻卡查看繁中與英文釋義
- 標記已學會、建立個人中文筆記
- 加入自己的單字
- 可從 HTTPS 網站安裝成獨立 PWA，完整字庫可離線使用
- 所有個人資料只存在瀏覽器 `localStorage`

## 遊戲規則

每題從完整字庫中產生一個正確繁中主要詞義與三個不重複的干擾選項。答對可獲得至少 10 XP，較高學習權重的單字可得到更多 XP，並累積連勝；答錯會顯示正確答案並中斷連勝。每答對 10 題完成一輪，但學習進度與 XP 會持續保留。

## 本地使用

直接用瀏覽器打開 `index.html`（`file://`）即可使用字庫與裝置語音，不需要伺服器或 API 金鑰。高品質 Kokoro 模式的背景模組需透過 HTTPS 網站或 `localhost` 開啟。若要安裝成 App 與啟用離線快取，也需使用 HTTPS／`localhost`；符合條件時頂部會顯示「安裝 App」。iPhone／iPad 可使用 Safari 的「分享 → 加入主畫面」。

## 高品質離線發音

預設發音引擎是 Apache 2.0 授權的 Kokoro-82M。第一次按「播放發音」時，App 會從 Hugging Face 下載約 90 MB 的 q8 量化 ONNX 模型；下載進度會直接顯示在畫面。模型與聲音資料由瀏覽器快取，之後可在同一瀏覽器離線重複使用，但瀏覽器清除網站資料或自動回收儲存空間後需要重新下載。

合成工作在 Web Worker 中進行，不會阻塞翻卡與操作。為了讓約 90 MB 的 q8 模型穩定產生音訊，固定使用相容性較高的 WASM；Kokoro 官方建議 WebGPU 搭配較大的 fp32 模型，因此本 App 不用 q8／WebGPU 組合。若模型下載或合成仍失敗，則自動回退到裝置語音。「釋放記憶體」只會卸載目前 RAM 中的模型，不會刪除瀏覽器快取。

單字文字只在瀏覽器中交給本機模型合成，不會送到 Azure 或本工具自己的伺服器。Kokoro 模式完全免費且不需建立雲端帳號；首次下載仍需網路流量。

## 裝置語音

切換到「裝置語音」後，工具會讀取瀏覽器 `speechSynthesis.getVoices()` 提供的英文聲音，依 `en-US` 或 `en-GB` 自動挑選；畫面會顯示實際的聲音名稱、語系，以及它是裝置內建或瀏覽器語音服務。使用者也可以從「裝置聲音」選單指定聲音。

聲音清單會因裝置、瀏覽器與已安裝語音套件而不同。裝置內建聲音通常可離線使用；標示為瀏覽器語音服務的聲音則可能需要網路。單字文字與發音設定都不會傳送到本工具自己的伺服器。

## 資料更新

已產生的前端資料位於 `data/vocabulary-data.js`。如來源清單更新，可重新執行建置腳本：

```bash
python3 -m pip install -r vocabulary-trainer/scripts/requirements.txt
python3 vocabulary-trainer/scripts/build_vocabulary_data.py \
  --download \
  --source-dir /private/tmp \
  --output vocabulary-trainer/data/vocabulary-data.js
```

建置腳本要求安裝 `opencc-python-reimplemented`，確保 ECDICT 的簡體內容會轉為臺灣繁體；若缺少套件會直接停止，避免誤產生簡體版資料。

## 權重公式

權重不是官方出題機率。程式會把目前考試所使用清單的原始排名換算為 35–100 分；跨多份相關清單的詞增加 4 分，常見功能詞降低學習優先度，最終限制在 0–100。

- IELTS／TOEFL：NGSL + NAWL
- TOEIC：NGSL + TSL
- 通用英文：NGSL

原始排名不會被權重取代，每張卡仍會顯示來源與排名。

## 授權

完整來源、授權文字及非官方產品聲明請見 [`data/LICENSES.md`](data/LICENSES.md)。

- NGSL、NAWL、TSL：CC BY-SA 4.0
- ECDICT：MIT，Copyright © 2025 Linwei
- Kokoro-82M、Kokoro ONNX、kokoro-js、Transformers.js：Apache License 2.0
- Font Awesome Free 7.2.0：圖示 CC BY 4.0、字型 SIL OFL 1.1、程式碼 MIT
- 備援發音：瀏覽器／作業系統 Web Speech API，不收錄考試官方音檔

本工具不含 IELTS、TOEFL 或 TOEIC 官方真題，亦未獲 ETS 或 IELTS Partners 背書或核准。
