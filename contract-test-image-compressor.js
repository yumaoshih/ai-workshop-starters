#!/usr/bin/env node
// contract-test-image-compressor.js — 動態行為檢查：模擬加入圖片、壓縮、下載按鈕出現
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const ROOT = path.resolve('/shared-artifacts/ai-workshop-friday');
const REPO = '004_image-compressor';
const CONTRACT_PATH = path.join(ROOT, REPO, 'tests', 'contract.json');
const HTML_PATH = path.join(ROOT, REPO, 'index.html');
const TEST_SCRIPT_PATH = __filename;

if (!fs.existsSync(CONTRACT_PATH)) {
  console.error('contract.json missing: ' + CONTRACT_PATH);
  process.exit(1);
}
if (!fs.existsSync(HTML_PATH)) {
  console.error('index.html missing: ' + HTML_PATH);
  process.exit(1);
}

const contract = JSON.parse(fs.readFileSync(CONTRACT_PATH, 'utf8'));
const html = fs.readFileSync(HTML_PATH, 'utf8');

const dom = new JSDOM(html, {
  runScripts: 'dangerously',
  pretendToBeVisual: true,
  resources: 'usable',
});
const win = dom.window;
const doc = dom.window.document;

// 等待初始 script 執行完 (renderGrid、loadStates)
await new Promise(r => setTimeout(r, 150));

// 產生兩張 1x1 像素 PNG 圖片（base64）並轉為 File 物件
const PNG_DATA_URL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
const base64 = PNG_DATA_URL.split(',')[1];
const pngBuffer = Buffer.from(base64, 'base64');

const Blob = win.Blob;
const File = win.File;
const file1 = new File([new Blob([pngBuffer], { type: 'image/png' })], 'test-image-1.png', { type: 'image/png' });
const file2 = new File([new Blob([pngBuffer], { type: 'image/png' })], 'test-image-2.png', { type: 'image/png' });

// 替換 fileInput 的 files（jsdom 接受 File 陣列）
const fileInput = doc.getElementById('fileInput');
if (!fileInput) {
  console.error('找不到 file input');
  process.exit(1);
}
fileInput.files = [file1, file2];

// 觸發 change 事件
const changeEvent = new win.Event('change', { bubbles: true });
fileInput.dispatchEvent(changeEvent);

// 等待 addFiles 內的 FileReader 與 preloadImage 完成
await new Promise(r => setTimeout(r, 350));

// ---------- 檢查 1：原始大小顯示 (.card .orig) ----------
const origElsBefore = doc.querySelectorAll('.card .orig');
let pass_orig_before = origElsBefore.length >= 2;

// ---------- 壓縮流程 ----------
// 設定品質 80
const qualityRange = doc.getElementById('qualityRange');
if (!qualityRange) {
  console.error('找不到 quality range');
  process.exit(1);
}
qualityRange.value = '80';
const inputEvent = new win.Event('input', { bubbles: true });
qualityRange.dispatchEvent(inputEvent);

// 點擊全部壓縮
const compressBtn = doc.getElementById('compressBtn');
if (!compressBtn) {
  console.error('找不到 compress 按鈕');
  process.exit(1);
}
const clickEvent = new win.MouseEvent('click', { bubbles: true });
compressBtn.dispatchEvent(clickEvent);

// 等待 compressAll 處理完（canvas.toDataURL 在 jsdom 中是同步的，但多等一點）
await new Promise(r => setTimeout(r, 450));

// ---------- 檢查 2：壓縮後大小顯示 (.card .out) ----------
const outElsAfter = doc.querySelectorAll('.card .out');
let pass_out_after = outElsAfter.length >= 2;

// ---------- 檢查 3：下載按鈕出現 (button[data-action=download]) ----------
const downloadBtnsAfter = doc.querySelectorAll('.card button[data-action=download]');
let pass_download_after = downloadBtnsAfter.length >= 2;

// ---------- 收集結果 ----------
const fileInputOk = fileInput.getAttribute('multiple') !== null && fileInput.getAttribute('type') === 'file';
const qualityOk = qualityRange.getAttribute('type') === 'range' && qualityRange.getAttribute('min') === '10' && qualityRange.getAttribute('max') === '100';

const results = [
  { id: 'file-input', pass: fileInputOk },
  { id: 'quality-control', pass: qualityOk },
  { id: 'original-size-display', pass: pass_orig_before },
  { id: 'output-size-display', pass: pass_out_after },
  { id: 'download-button', pass: pass_download_after },
];

let passed = results.filter(r => r.pass).length;
let failed = results.filter(r => !r.pass).length;

console.log('REPO: ' + REPO);
console.log('測試腳本: ' + TEST_SCRIPT_PATH);
console.log('流程: 加入 2 張 PNG → 等待 preload → 設定品質 80 → 點擊全部壓縮 → 等待處理');
console.log('-----------------------------------');
for (const r of results) {
  console.log((r.pass ? 'PASS' : 'FAIL') + ' ' + r.id);
}
console.log('-----------------------------------');
console.log('總結: ' + passed + ' / ' + results.length + ' 通過，' + failed + ' 失敗');

if (passed < results.length) {
  process.exit(1);
} else {
  process.exit(0);
}
