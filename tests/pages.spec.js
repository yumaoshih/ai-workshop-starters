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
  await page.locator('#compressBtn').click();
  await expect(page.locator('button[data-action="download"]')).toBeVisible();
  await expect(page.locator('.out')).not.toContainText('0 B');
  expect(errors).toEqual([]);
  expect(external).toEqual([]);
});
