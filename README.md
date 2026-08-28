# AI Workshop Friday

九個可直接在瀏覽器執行、Fork 與改作的純前端 Starter。所有工具都不需要 AI API、帳號、金鑰或後端服務。

## GitHub Pages 展示結構

本專案採**一個 GitHub Repository＋九個子路徑**：

| Starter | 展示路徑 |
|---|---|
| 斷食計時器 | `./fasting-clock/` |
| 喝水記錄器 | `./water-tracker/` |
| 食物輪盤 | `./food-wheel/` |
| 圖片瘦身站（轉檔＋壓縮） | `./image-compressor/` |
| 賓果產生器 | `./bingo-generator/` |
| 單字訓練器 | `./vocabulary-trainer/` |
| 翻頁旅行手冊 | `./travel-guide/` |
| 孩子積分板 | `./kids-reward-board/` |
| 隨機分組器 | `./group-randomizer/` |

首頁 `index.html` 是九個作品的統一入口。每個子目錄都有獨立 `index.html`，因此 GitHub Pages 可直接以子路徑展示，不需要九個不同 Repository。

## 本地使用

```bash
python3 -m http.server 4175
```

再開啟 `http://127.0.0.1:4175/`。單一 Starter 也可直接以 `file://` 開啟其 `index.html`。

## 課堂流程

1. Fork 整個 Repository 到自己的 GitHub。
2. 從首頁選一個 Starter，閱讀該目錄的 README。
3. 將 Starter 複製到 `submissions/自己的GitHub帳號/`。
4. 只在自己的投稿資料夾中完成改作並測試。
5. Commit 到自己的 Fork。
6. 從 Fork 向原始 Repository 的 `main` 發出 Pull Request。
7. 老師在 `Files changed` Review 後決定是否 Merge。

首頁的「Fork 電路圖與 Pull Request 操作教學」包含 GitHub 網頁版的完整按鈕路徑與 base／head 方向說明。

## 驗證

```bash
npm ci
npm run verify
```

驗證包含九個目錄的必要檔案、靜態安全條件、Starter 行為測試，以及 Chromium 中的 Pages 路徑 smoke test。

## 發布

`.github/workflows/pages.yml` 使用 GitHub 官方 Pages Actions，將此靜態目錄發布為網站。Repository 的 Pages Source 需設為 **GitHub Actions**。

## 狀態邊界

- 本地測試通過只代表 `BATCH_VERIFIED_LOCAL`。
- GitHub Actions 成功且公開網址逐頁回讀後，才可標記 `PAGES_RUNTIME_VERIFIED`。
- 真實課堂或使用者回饋完成前，不標記成果閉環 `CLOSED`。
