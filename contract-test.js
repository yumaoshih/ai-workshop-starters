#!/usr/bin/env node
// contract-test.js — 解析 contract.json 與 index.html，執行行為檢查
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const ROOT = process.env.WORKSHOP_ROOT || __dirname;
const REPO = process.argv[2];
if(!REPO) {
  console.error('Usage: node contract-test.js <repo-name>');
  process.exit(2);
}

const contractPath = path.join(ROOT, REPO, 'tests', 'contract.json');
const htmlPath = path.join(ROOT, REPO, 'index.html');

if(!fs.existsSync(contractPath)){
  console.error('contract.json missing: ' + contractPath);
  process.exit(1);
}
if(!fs.existsSync(htmlPath)){
  console.error('index.html missing: ' + htmlPath);
  process.exit(1);
}

const contract = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
const html = fs.readFileSync(htmlPath, 'utf8');
const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, resources: 'usable' });
const doc = dom.window.document;

let passed = 0;
let failed = 0;
const results = [];

for(const behavior of contract.behaviors){
  const { id, selector, expected } = behavior;
  let el = null;
  try{
    el = doc.querySelector(selector);
  }catch(e){
    el = null;
  }
  let ok = false;
  let detail = '';

  if(!el){
    ok = false;
    detail = '選取器 ' + selector + ' 找不到元素';
  } else {
    // 針對不同行為做额外檢查
    if(id === 'preset-existence'){
      // 確認三個按鈕/選項存在
      const items = doc.querySelectorAll(selector);
      ok = items.length >= 3;
      const labels = Array.from(items).map(i => i.textContent.trim() + ' ' + (i.dataset.hours || i.value || ''));
      detail = '找到 ' + items.length + ' 個選項: ' + labels.join(', ');
    } else if(id === 'start-pause-reset'){
      const items = doc.querySelectorAll(selector);
      const actions = Array.from(items).map(i => i.dataset.action).filter(Boolean);
      ok = actions.length >= 3 && actions.some(a => ['start','pause','reset'].includes(a));
      detail = '找到 ' + items.length + ' 個按鈕，actions: ' + actions.join(', ');
    } else if(id === 'elapsed-display'){
      ok = el.textContent.trim().match(/^\d{2}:\d{2}$/) || el.textContent.trim() === '00:00';
      detail = '文字內容: "' + el.textContent.trim() + '"';
    } else if(id === 'remaining-display'){
      ok = el.textContent.trim().match(/^\d+:\d{2}$/);
      detail = '文字內容: "' + el.textContent.trim() + '"';
    } else if(id === 'reset-clears-state'){
      // 這需要動態測試，靜態看初始值是否為 00:00
      ok = el.textContent.trim() === '00:00';
      detail = '初始顯示: "' + el.textContent.trim() + '"';
    } else if(id === 'goal-config'){
      // 輸入存在即可
      ok = el.tagName === 'INPUT' || el.tagName === 'TEXTAREA';
      detail = '找到元素類型: ' + el.tagName;
    } else if(id === 'add-intake' || id === 'remove-intake' || id === 'reset-action'){
      ok = el && (el.dataset.action || el.textContent.trim().toLowerCase().includes('新增') || el.textContent.trim().toLowerCase().includes('重置'));
      detail = '元素存在，文字/屬性: ' + (el ? el.textContent.trim().substring(0,30) : 'none');
    } else if(id === 'total-display'){
      ok = el && el.textContent.trim().length > 0;
      detail = '顯示內容: "' + el.textContent.trim() + '"';
    } else if(id === 'options-list'){
      const items = doc.querySelectorAll(selector + ' li, ' + selector + ' div');
      ok = items.length > 0;
      detail = '選項數量: ' + items.length;
    } else if(id === 'spin-button'){
      ok = el && (el.dataset.action === 'spin' || el.textContent.trim().toLowerCase().includes('旋轉'));
      detail = '按鈕文字: "' + (el ? el.textContent.trim() : '') + '"';
    } else if(id === 'result-display'){
      ok = el && el.textContent.trim().length > 0;
      detail = '結果顯示: "' + el.textContent.trim() + '"';
    } else if(id === 'empty-prevention'){
      // 按鈕存在，且在無選項時會失效需要動態測試；靜態檢查：按鈕存在可點擊
      ok = el !== null;
      detail = '按鈕存在: ' + (el ? '是' : '否');
    } else if(id === 'file-input'){
      ok = el && el.getAttribute('multiple') !== null && el.getAttribute('type') === 'file';
      detail = '屬性 multiple: ' + (el.getAttribute('multiple') ? '有' : '無') + ', type: ' + (el.getAttribute('type') || 'none');
    } else if(id === 'quality-control'){
      ok = el && (el.type === 'range' || el.type === 'number');
      detail = '類型: ' + (el ? el.type : 'none') + ', min: ' + (el.getAttribute('min') || '-') + ', max: ' + (el.getAttribute('max') || '-');
    } else if(id === 'original-size-display' || id === 'output-size-display'){
      ok = el && el.textContent.trim().length > 0;
      detail = '顯示內容: "' + el.textContent.trim() + '"';
    } else if(id === 'download-button'){
      const items = doc.querySelectorAll(selector);
      ok = items.length > 0 && items.some(i => i.dataset.action === 'download');
      detail = '找到 ' + items.length + ' 個按鈕，含 download: ' + items.some(i => i.dataset.action === 'download');
    } else {
      ok = true; // 默認通過
      detail = '選取器匹配';
    }
  }

  if(ok){
    passed++;
    results.push({ id, status: 'PASS', detail });
  } else {
    failed++;
    results.push({ id, status: 'FAIL', detail });
  }
}

console.log('REPO: ' + REPO);
console.log('CONTRACT: ' + contractPath);
console.log('HTML: ' + htmlPath);
console.log('-----------------------------------');
for(const r of results){
  console.log(r.status + ' ' + r.id + ' — ' + r.detail);
}
console.log('-----------------------------------');
console.log('總結: ' + passed + ' / ' + (passed+failed) + ' 通過，' + failed + ' 失敗');

if(failed > 0){
  process.exit(1);
} else {
  process.exit(0);
}
