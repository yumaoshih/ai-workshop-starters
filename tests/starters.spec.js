const { test, expect } = require('@playwright/test');
const { spawn } = require('child_process');
const http = require('http');
const path = require('path');
const { pathToFileURL } = require('url');

const root = process.env.WORKSHOP_ROOT || path.resolve(__dirname, '..');
const starterDirectories = {
  'bingo-generator': '005_bingo-generator',
  'vocabulary-trainer': '006_vocabulary-trainer',
  'travel-guide': '007_travel-guide',
  'kids-reward-board': '008_kids-reward-board',
  'group-randomizer': '009_group-randomizer',
};
const url = name => pathToFileURL(path.join(root, starterDirectories[name] || name, 'index.html')).href;
const bingoPort = 4186;
const turnPort = 4187;
const bingoBase = `http://127.0.0.1:${bingoPort}/bingo-generator/`;
let bingoServer;
let turnServer;
let turnCredentialRequests = 0;
let turnAuthorization = '';

function waitForBingoServer() {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + 10000;
    const probe = () => {
      const request = http.get(bingoBase, response => {
        response.resume();
        if (response.statusCode === 200) resolve(); else retry();
      });
      request.on('error', retry);
    };
    const retry = () => Date.now() > deadline ? reject(new Error('Bingo server did not become ready')) : setTimeout(probe, 100);
    probe();
  });
}

function waitForHealth(port) {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + 10000;
    const probe = () => {
      const request = http.get(`http://127.0.0.1:${port}/healthz`, response => {
        let body = '';
        response.on('data', chunk => { body += chunk; });
        response.on('end', () => resolve({ status: response.statusCode, body }));
      });
      request.on('error', () => {
        if (Date.now() > deadline) reject(new Error('Health endpoint did not become ready'));
        else setTimeout(probe, 100);
      });
    };
    probe();
  });
}

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
  test.beforeAll(async () => {
    turnServer = http.createServer((request, response) => {
      turnCredentialRequests += 1;
      turnAuthorization = request.headers.authorization || '';
      const payload = JSON.stringify({
        iceServers: [
          { urls: ['stun:stun.cloudflare.com:3478', 'stun:stun.cloudflare.com:53'] },
          {
            urls: ['turn:127.0.0.1:9?transport=udp', 'turns:127.0.0.1:9?transport=tcp'],
            username: 'short-lived-user',
            credential: 'short-lived-credential',
          },
        ],
      });
      response.writeHead(201, { 'Content-Type': 'application/json' }).end(payload);
    });
    await new Promise((resolve, reject) => {
      turnServer.once('error', reject);
      turnServer.listen(turnPort, '127.0.0.1', resolve);
    });
    bingoServer = spawn('node', ['005_bingo-generator/server.js'], {
      cwd: root,
      env: {
        ...process.env,
        PORT: String(bingoPort),
        HOST: '127.0.0.1',
        REQUIRE_TURN: 'true',
        TURN_KEY_ID: 'test-key',
        TURN_KEY_API_TOKEN: 'test-token',
        TURN_API_BASE_URL: `http://127.0.0.1:${turnPort}`,
      },
      stdio: 'ignore',
    });
    await waitForBingoServer();
  });
  test.afterAll(async () => {
    if (bingoServer && !bingoServer.killed) bingoServer.kill('SIGTERM');
    if (turnServer) await new Promise(resolve => turnServer.close(resolve));
  });

  test('refuses production readiness when TURN credentials are missing', async () => {
    const strictPort = 4188;
    const strictServer = spawn('node', ['005_bingo-generator/server.js'], {
      cwd: root,
      env: {
        ...process.env,
        PORT: String(strictPort),
        HOST: '127.0.0.1',
        REQUIRE_TURN: 'true',
        TURN_KEY_ID: '',
        TURN_KEY_API_TOKEN: '',
      },
      stdio: 'ignore',
    });
    try {
      const health = await waitForHealth(strictPort);
      expect(health.status).toBe(503);
      expect(JSON.parse(health.body)).toMatchObject({ status: 'degraded', turnConfigured: false });
    } finally {
      strictServer.kill('SIGTERM');
    }
  });

  test('renders 24 editable items and a 25-cell board with free center', async ({ page }) => {
    await openLocal(page, 'bingo-generator'); await clearStorage(page);
    await page.locator('#btn-create-room').click();
    await page.locator('#topic-settings summary').click();
    await expect(page.locator('#item-list input')).toHaveCount(24);
    await expect(page.locator('#bingo-board .cell')).toHaveCount(25);
    await expect(page.locator('#bingo-board .cell').nth(12)).toHaveText('免費');
  });
  test('editing persists after reload', async ({ page }) => {
    await openLocal(page, 'bingo-generator'); await clearStorage(page);
    await page.locator('#btn-create-room').click();
    await page.locator('#topic-settings summary').click();
    await page.locator('#item-list input').first().fill('自訂測試格');
    await page.reload();
    await page.locator('#btn-create-room').click();
    await page.locator('#topic-settings summary').click();
    await expect(page.locator('#item-list input').first()).toHaveValue('自訂測試格');
  });
  test('regenerate preserves all 24 edited values exactly once plus free center', async ({ page }) => {
    await openLocal(page, 'bingo-generator'); await clearStorage(page);
    await page.locator('#btn-create-room').click();
    await page.locator('#topic-settings summary').click();
    for (let i=0;i<24;i++) await page.locator('#item-list input').nth(i).fill(`項目${i+1}`);
    await page.locator('#btn-regenerate').click();
    const texts = await page.locator('#bingo-board .cell').allTextContents();
    expect(texts).toHaveLength(25); expect(texts[12]).toBe('免費');
    expect(new Set(texts.filter((_,i)=>i!==12)).size).toBe(24);
  });
  test('has reset and produces no remote requests or page errors', async ({ page }) => {
    const { requests, errors } = await openLocal(page, 'bingo-generator');
    await page.locator('#btn-create-room').click();
    await page.locator('#topic-settings summary').click();
    await expect(page.locator('#btn-reset')).toBeVisible();
    expect(requests.filter(u => !u.startsWith('file:'))).toEqual([]); expect(errors).toEqual([]);
  });

  test('opens a host room and a productized player join flow', async ({ page }) => {
    await openLocal(page, 'bingo-generator'); await clearStorage(page);
    await expect(page.locator('#role-host')).toHaveAttribute('aria-selected', 'true');
    await page.locator('#btn-create-room').click();
    await expect(page.locator('#room-code')).toHaveText(/[A-Z0-9]{6}/);
    await expect(page.locator('#btn-start-game')).toBeDisabled();

    await page.locator('#role-player').click();
    await expect(page.locator('#role-player')).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('#player-room-code')).toBeVisible();
    await expect(page.locator('#btn-create-offer')).toBeVisible();
    await expect(page.locator('#host-offer-input, #player-offer-output, #player-answer-input')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: '加入朋友的賓果局' })).toBeVisible();

    await page.goto(`${url('bingo-generator')}?room=ABC234`);
    await expect(page.locator('#role-player')).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('#player-room-code')).toHaveValue('ABC234');
    await expect(page.locator('#player-message')).toContainText('房間碼已填好');
  });

  test('connects an approved player over RTCDataChannel and starts a game', async ({ browser }) => {
    const context = await browser.newContext();
    const health = await context.request.get(`http://127.0.0.1:${bingoPort}/healthz`);
    expect(health.status()).toBe(200);
    expect(await health.json()).toMatchObject({ status: 'ok', turnConfigured: true });
    const host = await context.newPage();
    const player = await context.newPage();
    await host.goto(bingoBase);
    await host.evaluate(() => localStorage.clear());
    await host.reload();
    await host.locator('#btn-create-room').click();
    await expect(host.locator('#room-code')).toHaveText(/[A-Z0-9]{6}/);
    const roomCode = (await host.locator('#room-code').textContent()).trim();

    await player.goto(bingoBase);
    await player.locator('#role-player').click();
    await player.locator('#player-room-code').fill(roomCode);
    await player.locator('#player-name').fill('小明');
    await player.locator('#btn-create-offer').click();
    await expect(player.locator('#player-connection-status')).toContainText('等待主持人允許');
    const firstRequest = host.locator('#pending-player-list .pending').filter({ hasText: '小明' });
    await expect(firstRequest).toBeVisible();
    await firstRequest.getByRole('button', { name: '允許加入' }).click();
    await expect(player.locator('#player-connection-status')).toContainText('已加入', { timeout: 15000 });
    await player.locator('#btn-player-ready').click();
    await expect(host.locator('#host-player-list')).toContainText('準備好了', { timeout: 15000 });

    const secondPlayer = await context.newPage();
    await secondPlayer.goto(bingoBase);
    await secondPlayer.locator('#role-player').click();
    await secondPlayer.locator('#player-room-code').fill(roomCode);
    await secondPlayer.locator('#player-name').fill('小華');
    await secondPlayer.locator('#btn-create-offer').click();
    const secondRequest = host.locator('#pending-player-list .pending').filter({ hasText: '小華' });
    await expect(secondRequest).toBeVisible();
    await secondRequest.getByRole('button', { name: '允許加入' }).click();
    await expect(host.locator('#btn-start-game')).toBeDisabled();
    await expect(secondPlayer.locator('#player-connection-status')).toContainText('已加入', { timeout: 15000 });
    await secondPlayer.locator('#btn-player-ready').click();
    await expect(host.locator('#btn-start-game')).toBeEnabled();

    await host.locator('#btn-start-game').click();
    await expect(player.locator('#player-game-status')).toContainText('遊戲進行中', { timeout: 15000 });
    await expect(secondPlayer.locator('#player-game-status')).toContainText('遊戲進行中', { timeout: 15000 });
    await expect(player.locator('#player-board .cell')).toHaveCount(25);
    await player.locator('#player-board .cell').first().click();
    await expect(player.locator('#player-board .cell.marked')).toHaveCount(1);
    await host.locator('#btn-call-next').click();
    const called = (await player.locator('#player-current-call').textContent()).trim();
    await expect(player.locator('#player-board .cell', { hasText: called })).toHaveCount(1);
    await player.locator('#player-board .cell', { hasText: called }).click();
    await expect(player.locator('#player-board .cell.marked', { hasText: called })).toHaveCount(1);
    await player.locator('#btn-claim-bingo').click();
    await expect(player.locator('#player-message')).toContainText('還沒有連成一線');
    expect(turnCredentialRequests).toBe(2);
    expect(turnAuthorization).toBe('Bearer test-token');
    await context.close();
  });
});

test.describe('vocabulary-trainer', () => {
  async function openSettings(page, { advanced = false } = {}) {
    await page.getByRole('button', { name: '開啟遊戲設定' }).click();
    await expect(page.locator('#settings-panel')).toBeVisible();
    if (advanced) {
      const section = page.locator('.advanced-section');
      if (!(await section.getAttribute('open'))) await section.locator('summary').click();
    }
  }

  test('loads the complete merged bank, adds a term, and flips the card', async ({ page }) => {
    await openLocal(page, 'vocabulary-trainer'); await clearStorage(page);
    await openSettings(page, { advanced: true });
    await expect(page.locator('#unique-count')).toHaveText('4,787');
    await expect(page.locator('#source-count')).toHaveText('5,016');
    await page.locator('#term-input').fill('workshopverify'); await page.locator('#meaning-input').fill('工作坊驗證詞');
    await page.locator('#btn-add').click();
    await expect(page.locator('#unique-count')).toHaveText('4,788');
    await page.getByRole('button', { name: '完成' }).click();
    await expect(page.locator('#card-term')).toHaveText('workshopverify');
    await page.locator('#card').click(); await expect(page.locator('#card')).toHaveClass(/flipped/);
    await expect(page.locator('#card-meaning')).toHaveText('工作坊驗證詞');
  });
  test('learned status persists across reload', async ({ page }) => {
    await openLocal(page, 'vocabulary-trainer'); await clearStorage(page);
    await openSettings(page);
    await page.locator('#btn-learned').click(); await page.reload();
    await openSettings(page);
    await expect(page.locator('#btn-learned')).toHaveText('取消已學會');
  });
  test('next and shuffle remain in a valid card range', async ({ page }) => {
    await openLocal(page, 'vocabulary-trainer'); await clearStorage(page);
    await openSettings(page);
    await page.locator('#btn-next').click(); await expect(page.locator('#card-position')).toHaveText('2 / 4787');
    await page.locator('#btn-shuffle').click(); await expect(page.locator('#card-position')).toHaveText('1 / 4787');
  });
  test('filters by exam and exposes weighting, pronunciation, and licenses', async ({ page }) => {
    await openLocal(page, 'vocabulary-trainer'); await clearStorage(page);
    await openSettings(page, { advanced: true });
    await page.getByRole('button', { name: 'TOEIC' }).click();
    await expect(page.locator('#pool-count')).not.toHaveText('4,787');
    await page.locator('#search-input').fill('deadline');
    await expect(page.locator('#card-term')).toHaveText('deadline');
    await expect(page.locator('#weight-badge')).toContainText('學習權重');
    await expect(page.locator('#source-label')).toContainText('TSL');
    await expect(page.locator('#btn-speak')).toBeEnabled();
    await expect(page.locator('link[rel="manifest"]')).toHaveAttribute('href', 'manifest.webmanifest');
    await expect(page.locator('#licenses')).toContainText('CC BY-SA 4.0');
  });
  test('shows and uses the actual English voice selected from the device', async ({ page }) => {
    await page.addInitScript(() => {
      const mockVoices = [
        { name: 'Workshop US', lang: 'en-US', voiceURI: 'urn:workshop:us', localService: true, default: true },
        { name: 'Workshop UK', lang: 'en-GB', voiceURI: 'urn:workshop:uk', localService: false, default: false },
      ];
      class MockUtterance {
        constructor(text) { this.text = text; }
      }
      Object.defineProperty(window, 'SpeechSynthesisUtterance', { configurable: true, value: MockUtterance });
      Object.defineProperty(window, 'speechSynthesis', {
        configurable: true,
        value: {
          cancel() {},
          getVoices() { return mockVoices; },
          speak(utterance) {
            window.__spokenVoice = utterance.voice && utterance.voice.voiceURI;
            if (utterance.onstart) utterance.onstart();
          },
        },
      });
    });
    await openLocal(page, 'vocabulary-trainer'); await clearStorage(page);
    await openSettings(page);
    await expect(page.locator('#voice-select')).toContainText('Workshop US');
    await page.locator('#speech-engine').selectOption('system');
    await page.locator('#voice-select').selectOption('urn:workshop:us');
    await expect(page.locator('#voice-info')).toContainText('Workshop US · en-US · 裝置內建');
    await page.getByRole('button', { name: '完成' }).click();
    await page.locator('#btn-speak').click();
    expect(await page.evaluate(() => window.__spokenVoice)).toBe('urn:workshop:us');
  });
  test('loads Kokoro in a worker, reports progress, plays audio, and releases memory', async ({ page }) => {
    await page.addInitScript(() => {
      class MockAudio {
        constructor(src) { this.src = src; }
        play() { window.__kokoroPlayed = true; return Promise.resolve(); }
        pause() {}
      }
      class MockWorker {
        constructor() { window.__kokoroWorkerCreated = true; }
        emit(data) { queueMicrotask(() => this.onmessage({ data })); }
        postMessage(message) {
          if (message.type === 'dispose') {
            this.emit({ type: 'disposed' });
            return;
          }
          if (message.type !== 'synthesize') return;
          window.__kokoroRequest = message;
          this.emit({ type: 'loading', device: 'wasm' });
          this.emit({
            type: 'progress', status: 'progress', file: 'onnx/model_quantized.onnx',
            loaded: 46180558, total: 92361116, progress: 50,
          });
          this.emit({ type: 'ready', device: 'wasm', dtype: 'q8' });
          this.emit({ type: 'generating', requestId: message.requestId, word: message.text });
          this.emit({ type: 'audio', requestId: message.requestId, word: message.text, buffer: new ArrayBuffer(48) });
        }
        terminate() { window.__kokoroWorkerTerminated = true; }
      }
      Object.defineProperty(window, 'AudioContext', { configurable: true, value: undefined });
      Object.defineProperty(window, 'webkitAudioContext', { configurable: true, value: undefined });
      Object.defineProperty(window, 'Audio', { configurable: true, value: MockAudio });
      Object.defineProperty(window, 'Worker', { configurable: true, value: MockWorker });
    });
    await openLocal(page, 'vocabulary-trainer'); await clearStorage(page);
    await openSettings(page);
    await expect(page.locator('#speech-engine')).toHaveValue('kokoro');
    await expect(page.locator('#kokoro-voice-select')).toHaveValue('af_heart');
    await page.getByRole('button', { name: '完成' }).click();
    await page.locator('#btn-speak').click();
    await openSettings(page);
    await expect(page.locator('#model-status')).toHaveText('高品質模型已就緒');
    await expect(page.locator('#model-progress')).toHaveAttribute('aria-valuenow', '100');
    expect(await page.evaluate(() => window.__kokoroRequest.voice)).toBe('af_heart');
    expect(await page.evaluate(() => window.__kokoroPlayed)).toBe(true);
    await page.locator('#btn-release-model').click();
    await expect(page.locator('#model-status')).toHaveText('已釋放模型記憶體');
    expect(await page.evaluate(() => window.__kokoroWorkerTerminated)).toBe(true);
  });
  test('reset restores defaults and produces no remote requests or page errors', async ({ page }) => {
    const { requests, errors } = await openLocal(page, 'vocabulary-trainer'); await clearStorage(page);
    await openSettings(page, { advanced: true });
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
    await page.locator('#main').dispatchEvent('pointermove', { clientX: 230, clientY: 302, pointerId: 1 });
    await expect(page.locator('#main')).toHaveClass(/is-dragging/);
    await expect(page.locator('.page.active')).toHaveAttribute('style', /translateX/);
    await page.locator('#main').dispatchEvent('pointerup', { clientX: 80, clientY: 300, pointerId: 1 });
    await expect(page.locator('#progress')).toHaveText('2 / 7');
    expect(requests.filter(u => !u.startsWith('file:'))).toEqual([]); expect(errors).toEqual([]);
  });
  test('page-edge click turns the booklet', async ({ page }) => {
    await openLocal(page, 'travel-guide'); await clearStorage(page);
    await page.locator('#next-zone').click();
    await expect(page.locator('#progress')).toHaveText('2 / 7');
    await page.locator('#prev-zone').click();
    await expect(page.locator('#progress')).toHaveText('1 / 7');
  });
  test('turns the page and keeps the editable prompt in sync', async ({ page }) => {
    await openLocal(page, 'travel-guide'); await clearStorage(page);
    await expect(page.locator('#prompt-page')).toHaveText('PAGE 01');
    await expect(page.locator('#prompt-text')).toHaveValue(/臺南慢旅手帖/);
    await page.locator('#btn-next').click();
    await expect(page.locator('.page').first()).toHaveClass(/turned/);
    await expect(page.locator('#prompt-page')).toHaveText('PAGE 02');
    await expect(page.locator('#prompt-text')).toHaveValue(/旅程總覽/);
    await page.locator('#copy-prompt').click();
    await expect(page.locator('#copy-status')).not.toBeEmpty();
  });
  test('keeps per-page prompt drafts and excludes invisible edge zones from tab order', async ({ page }) => {
    await openLocal(page, 'travel-guide'); await clearStorage(page);
    await page.locator('#prompt-text').fill('我的封面提示詞');
    await page.locator('#btn-next').click();
    await page.locator('#btn-prev').click();
    await expect(page.locator('#prompt-text')).toHaveValue('我的封面提示詞');
    await expect(page.locator('#prev-zone')).toHaveAttribute('tabindex', '-1');
    await expect(page.locator('#next-zone')).toHaveAttribute('tabindex', '-1');
  });
  test('offers categorized packing items and persists custom items', async ({ page }) => {
    await openLocal(page, 'travel-guide'); await clearStorage(page);
    await page.locator('#btn-manage-checklist').click();
    await expect(page.locator('#packing-dialog')).toBeVisible();
    await expect(page.locator('.category-tab')).toHaveCount(7);
    await expect(page.locator('.library-item')).toHaveCount(47);
    await expect(page.locator('.packing-row')).toHaveCount(13);
    const firstHandleBox = await page.locator('.drag-handle').first().boundingBox();
    const fourthRowBox = await page.locator('.packing-row').nth(3).boundingBox();
    expect(firstHandleBox).not.toBeNull(); expect(fourthRowBox).not.toBeNull();
    await page.locator('.drag-handle').first().dispatchEvent('pointerdown', {
      clientX: firstHandleBox.x + firstHandleBox.width / 2,
      clientY: firstHandleBox.y + firstHandleBox.height / 2,
      pointerId: 2
    });
    await page.locator('body').dispatchEvent('pointermove', {
      clientX: fourthRowBox.x + 20,
      clientY: fourthRowBox.y + fourthRowBox.height * .8,
      pointerId: 2
    });
    await page.locator('body').dispatchEvent('pointerup', {
      clientX: fourthRowBox.x + 20,
      clientY: fourthRowBox.y + fourthRowBox.height * .8,
      pointerId: 2
    });
    await expect(page.locator('.packing-row').first()).toContainText('交通票券');
    await expect(page.locator('.packing-row').nth(3)).toContainText('身分證');
    await expect(page.locator('.packing-row').first().getByRole('button', { name: '上移' })).toBeDisabled();
    await page.locator('.packing-row').filter({ hasText: '身分證' }).getByRole('button', { name: '上移' }).click();
    await expect(page.locator('.packing-row').filter({ hasText: '身分證' }).getByRole('button', { name: '上移' })).toBeFocused();
    await expect(page.locator('#packing-announcement')).toContainText('身分證 已移至第 3 項');
    await page.locator('.packing-row').filter({ hasText: '身分證' }).getByRole('button', { name: '上移' }).click();
    await page.locator('.packing-row').filter({ hasText: '身分證' }).getByRole('button', { name: '上移' }).click();
    await expect(page.getByRole('button', { name: '拖曳排序：身分證' })).toBeFocused();
    await expect(page.locator('#packing-announcement')).toContainText('身分證 已移至第 1 項');
    await page.locator('.packing-row').filter({ hasText: '身分證' }).getByRole('button', { name: '下移' }).click();
    await page.locator('.packing-row').filter({ hasText: '個人藥品' }).getByRole('button', { name: '下移' }).click();
    await expect(page.getByRole('button', { name: '拖曳排序：個人藥品' })).toBeFocused();
    await expect(page.locator('#packing-announcement')).toContainText('個人藥品 已移至第 13 項');
    await page.locator('.packing-row').filter({ hasText: '個人藥品' }).getByRole('button', { name: '上移' }).click();
    await page.locator('#custom-item-input').fill('護照');
    await page.locator('#custom-item-form button[type="submit"]').click();
    await expect(page.locator('.packing-row[data-id="passport"]')).toHaveCount(1);
    await expect(page.getByRole('button', { name: '護照 已加入' })).toHaveAttribute('aria-pressed', 'true');
    await page.locator('.packing-row[data-id="passport"]').getByRole('button', { name: '移除' }).click();
    await page.locator('#custom-item-input').fill('我的專用枕頭');
    await page.locator('#custom-item-form button[type="submit"]').click();
    await expect(page.locator('.packing-row')).toHaveCount(14);
    await expect(page.locator('#packing-sortable')).toContainText('我的專用枕頭');
    await page.reload();
    await page.locator('#btn-manage-checklist').click();
    await expect(page.locator('.packing-row').first()).toContainText('交通票券');
    await expect(page.locator('#packing-sortable')).toContainText('我的專用枕頭');
  });
  test('migrates v1 and v2 checklist data into the canonical v3 model', async ({ page }) => {
    await openLocal(page, 'travel-guide'); await clearStorage(page);
    await page.evaluate(() => {
      localStorage.setItem('travel-v2:checklist', JSON.stringify([
        { id: 'legacy-id', label: '證件與車票', done: true },
        { id: 'id-card', label: '身分證', done: false },
        { id: 'custom-bottle', label: '我的折疊水壺', done: true }
      ]));
    });
    await page.reload();
    await page.locator('#btn-manage-checklist').click();
    await expect(page.locator('.packing-row').first()).toContainText('身分證');
    await expect(page.locator('.packing-row').first().getByRole('checkbox')).toBeChecked();
    await expect(page.locator('.packing-row[data-id="id-card"]')).toHaveCount(1);
    await expect(page.locator('#packing-sortable')).toContainText('我的折疊水壺');
    const v2Migrated = await page.evaluate(() => JSON.parse(localStorage.getItem('travel-v3:checklist')));
    expect(v2Migrated[0]).toMatchObject({ id: 'id-card', label: '身分證', done: true });
    expect(v2Migrated.filter(item => item.id === 'id-card')).toHaveLength(1);

    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem('travel-v1:checklist', JSON.stringify([
        { label: '記得護照／證件', done: true },
        { label: '我的相機背帶', done: false }
      ]));
    });
    await page.reload();
    await page.locator('#btn-manage-checklist').click();
    await expect(page.locator('.packing-row').first()).toContainText('護照');
    await expect(page.locator('.packing-row[data-id="passport"]')).toHaveCount(1);
    await expect(page.locator('.packing-row[data-id="passport"] input')).toBeChecked();
    await expect(page.locator('#packing-sortable')).toContainText('我的相機背帶');
    const v1Migrated = await page.evaluate(() => JSON.parse(localStorage.getItem('travel-v3:checklist')));
    expect(v1Migrated[0]).toMatchObject({ id: 'passport', label: '護照', done: true });
  });
});

test.describe('kids-reward-board', () => {
  test('never allows a negative balance', async ({ page }) => {
    await openLocal(page, 'kids-reward-board'); await clearStorage(page);
    await expect(page.locator('#btn-subtract-points')).toBeDisabled();
    await page.locator('#btn-subtract-points').evaluate(button => button.click());
    await expect(page.locator('#balance')).toHaveText('0');
  });
  test('blocks unaffordable redemption and permits affordable redemption', async ({ page }) => {
    await openLocal(page, 'kids-reward-board'); await clearStorage(page);
    const firstReward = page.locator('#reward-list .redeem-btn').first();
    await expect(firstReward).toBeDisabled();
    await page.locator('#btn-add-points').click(); await page.locator('#btn-add-points').click();
    await expect(firstReward).toBeEnabled(); await firstReward.click();
    await expect(page.locator('#redeem-dialog')).toBeVisible();
    await page.locator('#btn-confirm-redeem').click();
    await expect(page.locator('#balance')).toHaveText('0');
  });
  test('name and balance persist across reload', async ({ page }) => {
    await openLocal(page, 'kids-reward-board'); await clearStorage(page);
    await page.locator('#child-name-input').fill('小葵'); await page.locator('#btn-save-name').click();
    await page.locator('#btn-add-points').click(); await page.reload();
    await expect(page.locator('#child-name-input')).toHaveValue('小葵'); await expect(page.locator('#balance')).toHaveText('1');
  });
  test('reset returns to zero and produces no remote requests/page errors', async ({ page }) => {
    const { requests, errors } = await openLocal(page, 'kids-reward-board'); await clearStorage(page);
    await page.locator('#btn-add-points').click(); await page.locator('#btn-reset').click();
    await expect(page.locator('#reset-dialog')).toBeVisible();
    await page.locator('#btn-reset-points').click(); await expect(page.locator('#balance')).toHaveText('0');
    expect(requests.filter(u => !u.startsWith('file:'))).toEqual([]); expect(errors).toEqual([]);
  });
  test('switches themes without changing points and persists the choice', async ({ page }) => {
    await openLocal(page, 'kids-reward-board'); await clearStorage(page);
    await page.locator('#btn-add-points').click(); await page.locator('#btn-add-points').click();
    await page.locator('#btn-open-theme').click();
    await page.locator('[data-theme-option="sticker"]').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'sticker');
    await expect(page.locator('#balance')).toHaveText('2');
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'sticker');
    await expect(page.locator('#balance')).toHaveText('2');
  });
  test('adds and persists a custom reward', async ({ page }) => {
    await openLocal(page, 'kids-reward-board'); await clearStorage(page);
    await page.locator('#btn-edit-rewards').click();
    await page.locator('#new-reward-name').fill('公園散步 20 分鐘');
    await page.locator('#new-reward-cost').fill('6');
    await page.locator('#btn-add-reward').click();
    await page.locator('#btn-save-rewards').click();
    await expect(page.locator('#reward-list')).toContainText('公園散步 20 分鐘');
    await page.reload();
    await expect(page.locator('#reward-list')).toContainText('公園散步 20 分鐘');
  });
  test('uses a desktop workspace and a mobile app shell at their breakpoints', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1024 });
    await openLocal(page, 'kids-reward-board'); await clearStorage(page);
    await expect(page.locator('.responsive-workspace')).toHaveCSS('display', 'grid');
    await expect(page.locator('.points-panel')).toHaveCSS('position', 'sticky');
    await expect(page.locator('.reward-list')).toHaveCSS('grid-template-columns', /\d+(\.\d+)?px \d+(\.\d+)?px/);

    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.locator('.responsive-workspace')).not.toHaveCSS('display', 'grid');
    await expect(page.locator('.point-actions')).toHaveCSS('position', 'fixed');
    await page.locator('#btn-open-theme').click();
    await expect(page.locator('#theme-dialog')).toBeVisible();
    const sheet = await page.locator('#theme-dialog').boundingBox();
    expect(sheet?.x).toBe(0);
    expect(sheet?.width).toBeGreaterThanOrEqual(375);
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
