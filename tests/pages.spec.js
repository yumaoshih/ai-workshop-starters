const { test, expect } = require('@playwright/test');
const { spawn } = require('child_process');
const path = require('path');
const http = require('http');

const root = path.resolve(__dirname, '..');
const port = 4175;
const base = `http://127.0.0.1:${port}`;
const starters = [
  'fasting-clock',
  'water-tracker',
  'food-wheel',
  'image-compressor',
  'bingo-generator',
  'vocabulary-trainer',
  'travel-guide',
  'kids-reward-board',
  'group-randomizer',
];

let server;

function waitForServer() {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + 10000;
    const probe = () => {
      const req = http.get(`${base}/`, res => {
        res.resume();
        if (res.statusCode === 200) return resolve();
        retry();
      });
      req.on('error', retry);
    };
    const retry = () => {
      if (Date.now() > deadline) return reject(new Error('HTTP server did not become ready'));
      setTimeout(probe, 100);
    };
    probe();
  });
}

test.beforeAll(async () => {
  server = spawn('python3', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], {
    cwd: root,
    stdio: 'ignore',
  });
  await waitForServer();
});

test.afterAll(() => {
  if (server && !server.killed) server.kill('SIGTERM');
});

test('hub exposes exactly nine working Starter links', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(String(error)));
  await page.goto(`${base}/`);
  await expect(page).toHaveTitle(/AI Workshop/);
  const links = page.locator('a[href$="/index.html"]');
  await expect(links).toHaveCount(9);
  for (const starter of starters) {
    await expect(page.locator(`a[href="${starter}/index.html"]`)).toHaveCount(1);
  }
  expect(errors).toEqual([]);
});

for (const starter of starters) {
  test(`${starter} serves from a Pages-style subpath`, async ({ page }) => {
    const errors = [];
    const external = [];
    page.on('pageerror', error => errors.push(String(error)));
    page.on('request', request => {
      const url = new URL(request.url());
      if (url.origin !== base) external.push(request.url());
    });
    const response = await page.goto(`${base}/${starter}/`);
    expect(response.status()).toBe(200);
    await expect(page.locator('body')).not.toBeEmpty();
    expect(await page.title()).not.toBe('');
    expect(errors).toEqual([]);
    expect(external).toEqual([]);
  });
}

test('vocabulary-trainer installs its offline app shell', async ({ page, context }) => {
  await page.goto(`${base}/vocabulary-trainer/`);
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
  await page.reload();
  await expect(page.locator('#unique-count')).toHaveText('4,787');
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('#unique-count')).toHaveText('4,787');
  await expect(page.locator('#app-status')).toHaveText(/離線|可離線/);
  await context.setOffline(false);
});

test('image-compressor processes an uploaded image locally', async ({ page }) => {
  const errors = [];
  const external = [];
  page.on('pageerror', error => errors.push(String(error)));
  page.on('request', request => {
    const url = new URL(request.url());
    if (url.origin !== base) external.push(request.url());
  });
  await page.goto(`${base}/image-compressor/`);
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
  await page.locator('#fileInput').setInputFiles({ name: 'fixture.png', mimeType: 'image/png', buffer: png });
  await expect(page.locator('.card')).toHaveCount(1);
  await expect(page.locator('.orig')).toContainText('原尺寸');
  await page.locator('label[for="formatWebp"]').click();
  await expect(page.locator('#formatWebp')).toBeChecked();
  await page.locator('#compressBtn').click();
  await expect(page.locator('button[data-action="download"]')).toBeVisible();
  await expect(page.locator('button[data-action="download"]')).toContainText('WEBP');
  await expect(page.locator('#downloadAllBtn')).toBeVisible();
  await expect(page.locator('.out')).not.toContainText('0 B');
  expect(errors).toEqual([]);
  expect(external).toEqual([]);
});

test('food-wheel combines editable groups and completes the spin flow locally', async ({ page }) => {
  const errors = [];
  const external = [];
  page.on('pageerror', error => errors.push(String(error)));
  page.on('request', request => {
    const url = new URL(request.url());
    if (url.origin !== base) external.push(request.url());
  });
  await page.goto(`${base}/food-wheel/`);
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  await expect(page.locator('#optionCount')).toHaveText('15');
  await expect(page.locator('#customizePanel')).not.toHaveAttribute('open', '');
  await expect(page.locator('#notebookPanel')).not.toHaveAttribute('open', '');
  const groupList = page.locator('#groupList');
  await page.getByRole('button', { name: '查看右側更多料理分類' }).click();
  await expect.poll(() => groupList.evaluate(element => element.scrollLeft)).toBeGreaterThan(0);
  await page.locator('#notebookPanel > summary').click();
  await expect(page.locator('.guide-tab')).toHaveCount(5);
  await page.getByRole('button', { name: /查看異國風味筆記/ }).click();
  await expect(page.locator('#guideTitle')).toHaveText('異國風味');
  await expect(page.locator('#guidePlaces')).toContainText('89 Corner');
  expect(await page.locator('.guide-tab img').evaluateAll(images => images.every(image => image.complete && image.naturalWidth > 0))).toBe(true);
  const vietnamese = page.locator('.group-chip').filter({ hasText: '越式' });
  await vietnamese.click();
  await expect(page.locator('#optionCount')).toHaveText('12');

  await page.locator('#customizePanel > summary').click();
  await page.getByRole('textbox', { name: '新增食物選項' }).fill('越式咖啡');
  await page.getByRole('button', { name: '加入分類', exact: true }).click();
  await expect(page.locator('#optionCount')).toHaveText('12');
  await vietnamese.click();
  await expect(page.locator('#optionCount')).toHaveText('16');

  await page.getByRole('textbox', { name: '新增料理分類' }).fill('宵夜');
  await page.getByRole('button', { name: '新增分類' }).click();
  await page.getByRole('textbox', { name: '新增食物選項' }).fill('鹽酥雞');
  await page.getByRole('button', { name: '加入分類', exact: true }).click();
  await expect(page.locator('#optionCount')).toHaveText('17');
  await page.reload();
  await page.locator('#customizePanel > summary').click();
  await expect(page.getByRole('button', { name: '從宵夜刪除 鹽酥雞' })).toBeVisible();

  const validOptions = await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem('food-wheel:v3'));
    return state.groups.filter(group => group.active).flatMap(group => group.foods);
  });
  await page.getByRole('button', { name: '幫我決定' }).click();
  await expect(page.getByRole('button', { name: '輪盤旋轉中…' })).toBeDisabled();
  await expect(page.locator('#result')).not.toHaveClass(/empty/, { timeout: 6000 });
  const chosen = await page.locator('#resultValue').innerText();
  expect(validOptions).toContain(chosen);
  await expect(page.locator('#resultThumb')).toBeVisible();
  expect(await page.locator('#resultThumb').evaluate(image => image.complete && image.naturalWidth > 0)).toBe(true);
  await expect(page.locator('#resultHint')).toContainText('過往筆記');
  await expect(page.getByRole('button', { name: '再轉一次' })).toBeEnabled();
  await page.getByRole('button', { name: '查看這組過往美食筆記' }).click();
  await expect(page.locator('#notebookPanel')).toHaveAttribute('open', '');
  await expect(page.getByRole('button', { name: '複製搜尋詞' })).toBeVisible();
  const mapLink = page.getByRole('link', { name: 'Google 地圖查找' });
  await expect(mapLink).toBeVisible();
  await expect(mapLink).toHaveAttribute('target', '_blank');
  await expect(mapLink).toHaveAttribute('href', /google\.com\/maps\/search/);

  expect(errors).toEqual([]);
  expect(external).toEqual([]);
});
