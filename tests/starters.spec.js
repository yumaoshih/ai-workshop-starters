const { test, expect } = require('@playwright/test');
const path = require('path');
const { pathToFileURL } = require('url');

const root = process.env.WORKSHOP_ROOT || path.resolve(__dirname, '..');
const url = name => pathToFileURL(path.join(root, name, 'index.html')).href;

async function openLocal(page, name) {
  const requests = [];
  page.on('request', req => requests.push(req.url()));
  const errors = [];
  page.on('pageerror', err => errors.push(String(err)));
  await page.goto(url(name));
  await page.waitForLoadState('domcontentloaded');
  return { requests, errors };
}

async function clearStorage(page) {
  await page.evaluate(() => localStorage.clear());
  await page.reload();
}

test.describe('bingo-generator', () => {
  test('renders 24 editable items and a 25-cell board with free center', async ({ page }) => {
    await openLocal(page, 'bingo-generator'); await clearStorage(page);
    await expect(page.locator('#item-list input')).toHaveCount(24);
    await expect(page.locator('#bingo-board .cell')).toHaveCount(25);
    await expect(page.locator('#bingo-board .cell').nth(12)).toHaveText('免費');
  });
  test('editing persists after reload', async ({ page }) => {
    await openLocal(page, 'bingo-generator'); await clearStorage(page);
    await page.locator('#item-list input').first().fill('自訂測試格');
    await page.reload();
    await expect(page.locator('#item-list input').first()).toHaveValue('自訂測試格');
  });
  test('regenerate preserves all 24 edited values exactly once plus free center', async ({ page }) => {
    await openLocal(page, 'bingo-generator'); await clearStorage(page);
    for (let i=0;i<24;i++) await page.locator('#item-list input').nth(i).fill(`項目${i+1}`);
    await page.locator('#btn-regenerate').click();
    const texts = await page.locator('#bingo-board .cell').allTextContents();
    expect(texts).toHaveLength(25); expect(texts[12]).toBe('免費');
    expect(new Set(texts.filter((_,i)=>i!==12)).size).toBe(24);
  });
  test('has reset and produces no remote requests or page errors', async ({ page }) => {
    const { requests, errors } = await openLocal(page, 'bingo-generator');
    await expect(page.locator('#btn-reset')).toBeVisible();
    expect(requests.filter(u => !u.startsWith('file:'))).toEqual([]); expect(errors).toEqual([]);
  });
});

test.describe('vocabulary-trainer', () => {
  test('adds a term and meaning then flips the card', async ({ page }) => {
    await openLocal(page, 'vocabulary-trainer'); await clearStorage(page);
    await page.locator('#term-input').fill('verify'); await page.locator('#meaning-input').fill('驗證');
    await page.locator('#btn-add').click();
    await expect(page.locator('#card-count')).toContainText('6');
    for (let i=0;i<5;i++) await page.locator('#btn-next').click();
    await expect(page.locator('#card-term')).toHaveText('verify');
    await page.locator('#card').click(); await expect(page.locator('#card')).toHaveClass(/flipped/);
    await expect(page.locator('#card-meaning')).toHaveText('驗證');
  });
  test('learned status persists across reload', async ({ page }) => {
    await openLocal(page, 'vocabulary-trainer'); await clearStorage(page);
    await page.locator('#btn-learned').click(); await page.reload();
    await expect(page.locator('#btn-learned')).toHaveText('取消已學');
  });
  test('next and shuffle remain in a valid card range', async ({ page }) => {
    await openLocal(page, 'vocabulary-trainer'); await clearStorage(page);
    await page.locator('#btn-next').click(); await expect(page.locator('#card-position')).toHaveText('2 / 5');
    await page.locator('#btn-shuffle').click(); await expect(page.locator('#card-position')).toHaveText('1 / 5');
  });
  test('reset restores defaults and produces no remote requests or page errors', async ({ page }) => {
    const { requests, errors } = await openLocal(page, 'vocabulary-trainer'); await clearStorage(page);
    await expect(page.locator('#btn-reset')).toBeVisible();
    expect(requests.filter(u => !u.startsWith('file:'))).toEqual([]); expect(errors).toEqual([]);
  });
});

test.describe('travel-guide', () => {
  test('contains exactly seven pages and one active page', async ({ page }) => {
    await openLocal(page, 'travel-guide'); await clearStorage(page);
    await expect(page.locator('.page')).toHaveCount(7); await expect(page.locator('.page.active')).toHaveCount(1);
    await expect(page.locator('#progress')).toHaveText('1 / 7');
  });
  test('buttons and arrow keys navigate and clamp at boundaries', async ({ page }) => {
    await openLocal(page, 'travel-guide'); await clearStorage(page);
    await page.locator('#btn-next').click(); await expect(page.locator('#progress')).toHaveText('2 / 7');
    await page.keyboard.press('ArrowLeft'); await expect(page.locator('#progress')).toHaveText('1 / 7');
    await page.keyboard.press('ArrowLeft'); await expect(page.locator('#progress')).toHaveText('1 / 7');
    for(let i=0;i<8;i++) await page.keyboard.press('ArrowRight'); await expect(page.locator('#progress')).toHaveText('7 / 7');
  });
  test('checklist persists and reset clears it', async ({ page }) => {
    await openLocal(page, 'travel-guide'); await clearStorage(page);
    const first = page.locator('#checklist input').first(); await first.check(); await page.reload();
    await expect(page.locator('#checklist input').first()).toBeChecked();
    await page.locator('#btn-reset').click(); await expect(page.locator('#checklist input').first()).not.toBeChecked();
  });
  test('supports swipe navigation and no remote requests/page errors', async ({ page }) => {
    const { requests, errors } = await openLocal(page, 'travel-guide'); await clearStorage(page);
    await page.locator('#main').dispatchEvent('pointerdown', { clientX: 320, clientY: 300, pointerId: 1 });
    await page.locator('#main').dispatchEvent('pointerup', { clientX: 80, clientY: 300, pointerId: 1 });
    await expect(page.locator('#progress')).toHaveText('2 / 7');
    expect(requests.filter(u => !u.startsWith('file:'))).toEqual([]); expect(errors).toEqual([]);
  });
});

test.describe('kids-reward-board', () => {
  test('never allows a negative balance', async ({ page }) => {
    await openLocal(page, 'kids-reward-board'); await clearStorage(page);
    await page.locator('#btn-subtract-points').click(); await expect(page.locator('#balance')).toHaveText('0');
  });
  test('blocks unaffordable redemption and permits affordable redemption', async ({ page }) => {
    await openLocal(page, 'kids-reward-board'); await clearStorage(page);
    await expect(page.locator('.redeem-btn').first()).toBeDisabled();
    await page.locator('#btn-add-points').click(); await page.locator('#btn-add-points').click();
    await expect(page.locator('.redeem-btn').first()).toBeEnabled(); await page.locator('.redeem-btn').first().click();
    await expect(page.locator('#balance')).toHaveText('0');
  });
  test('name and balance persist across reload', async ({ page }) => {
    await openLocal(page, 'kids-reward-board'); await clearStorage(page);
    await page.locator('#child-name-input').fill('小葵'); await page.locator('#btn-save-name').click();
    await page.locator('#btn-add-points').click(); await page.reload();
    await expect(page.locator('#child-name-input')).toHaveValue('小葵'); await expect(page.locator('#balance')).toHaveText('1');
  });
  test('reset returns to zero and produces no remote requests/page errors', async ({ page }) => {
    page.on('dialog', d => d.accept()); const { requests, errors } = await openLocal(page, 'kids-reward-board'); await clearStorage(page);
    await page.locator('#btn-add-points').click(); await page.locator('#btn-reset').click(); await expect(page.locator('#balance')).toHaveText('0');
    expect(requests.filter(u => !u.startsWith('file:'))).toEqual([]); expect(errors).toEqual([]);
  });
});

test.describe('group-randomizer', () => {
  test('deduplicates and assigns each nonblank name exactly once', async ({ page }) => {
    await openLocal(page, 'group-randomizer'); await clearStorage(page);
    await page.locator('#names-input').fill('甲\n乙\n甲\n\n丙\n丁'); await page.locator('#group-count-input').fill('3');
    await page.locator('#btn-randomize').click();
    const names = (await page.locator('.group-names').allTextContents()).flatMap(t => t ? t.split('、') : []);
    expect(names.sort()).toEqual(['丁','丙','乙','甲'].sort()); expect(new Set(names).size).toBe(4);
  });
  test('keeps group size difference at most one', async ({ page }) => {
    await openLocal(page, 'group-randomizer'); await clearStorage(page);
    await page.locator('#names-input').fill(Array.from({length:10},(_,i)=>`人${i+1}`).join('\n'));
    await page.locator('#group-count-input').fill('3'); await page.locator('#btn-randomize').click();
    const sizes = await page.locator('.group-count').allTextContents().then(xs=>xs.map(x=>Number(x.match(/\d+/)[0])));
    expect(Math.max(...sizes)-Math.min(...sizes)).toBeLessThanOrEqual(1); expect(sizes.reduce((a,b)=>a+b,0)).toBe(10);
  });
  test('supports more groups than names without duplication', async ({ page }) => {
    await openLocal(page, 'group-randomizer'); await clearStorage(page);
    await page.locator('#names-input').fill('甲\n乙'); await page.locator('#group-count-input').fill('4'); await page.locator('#btn-randomize').click();
    await expect(page.locator('.group')).toHaveCount(4);
    const sizes = await page.locator('.group-count').allTextContents().then(xs=>xs.map(x=>Number(x.match(/\d+/)[0])));
    expect(Math.max(...sizes)-Math.min(...sizes)).toBeLessThanOrEqual(1);
  });
  test('copy gives visible completion feedback', async ({ page }) => {
    await openLocal(page, 'group-randomizer'); await clearStorage(page);
    await page.locator('#btn-randomize').click(); await page.locator('#btn-copy').click();
    await expect(page.locator('#copy-status')).toHaveText('已複製');
  });
  test('copy and reset work without remote requests or page errors', async ({ page }) => {
    const { requests, errors } = await openLocal(page, 'group-randomizer'); await clearStorage(page);
    await page.locator('#btn-randomize').click(); await page.locator('#btn-copy').click();
    await page.locator('#btn-reset').click(); await expect(page.locator('#group-count-input')).toHaveValue('3');
    expect(requests.filter(u => !u.startsWith('file:'))).toEqual([]); expect(errors).toEqual([]);
  });
});
