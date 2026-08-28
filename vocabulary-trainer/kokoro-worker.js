import { KokoroTTS } from 'https://cdn.jsdelivr.net/npm/kokoro-js@1.2.1/dist/kokoro.web.js';

const MODEL_ID = 'onnx-community/Kokoro-82M-v1.0-ONNX';
const MODEL_DTYPE = 'q8';

let tts = null;
let loadingPromise = null;
let activeDevice = null;

function send(type, detail = {}, transfer = []) {
  self.postMessage({ type, ...detail }, transfer);
}

function progressCallback(info = {}) {
  const loaded = Number(info.loaded) || 0;
  const total = Number(info.total) || 0;
  const reportedProgress = Number(info.progress);
  const progress = Number.isFinite(reportedProgress)
    ? reportedProgress
    : (total > 0 ? (loaded / total) * 100 : 0);

  send('progress', {
    status: String(info.status || ''),
    file: String(info.file || ''),
    loaded,
    total,
    progress: Math.max(0, Math.min(100, progress)),
    device: activeDevice,
  });
}

async function loadForDevice(device) {
  activeDevice = device;
  send('loading', { device });
  return KokoroTTS.from_pretrained(MODEL_ID, {
    dtype: MODEL_DTYPE,
    device,
    progress_callback: progressCallback,
  });
}

async function ensureModel() {
  if (tts) return tts;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    // Kokoro recommends fp32 for WebGPU. This app intentionally uses the much
    // smaller q8 model, so WASM is the compatible backend for reliable audio.
    tts = await loadForDevice('wasm');
    send('ready', { device: activeDevice, dtype: MODEL_DTYPE });
    return tts;
  })();

  try {
    return await loadingPromise;
  } catch (error) {
    loadingPromise = null;
    throw error;
  }
}

async function synthesize(message) {
  const model = await ensureModel();
  send('generating', { requestId: message.requestId, word: message.text });
  const audio = await model.generate(message.text, {
    voice: message.voice || 'af_heart',
    speed: Number(message.speed) || 0.9,
  });
  const wav = audio.toWav();
  send('audio', {
    requestId: message.requestId,
    word: message.text,
    buffer: wav,
  }, [wav]);
}

async function disposeModel() {
  if (loadingPromise) {
    try {
      await loadingPromise;
    } catch (error) {
      // A failed load has no model resources left to release.
    }
  }
  if (tts && tts.model && typeof tts.model.dispose === 'function') {
    await tts.model.dispose();
  }
  tts = null;
  loadingPromise = null;
  activeDevice = null;
  send('disposed');
}

self.addEventListener('message', (event) => {
  const message = event.data || {};
  if (message.type === 'dispose') {
    disposeModel().catch((error) => {
      send('error', { stage: 'dispose', message: error instanceof Error ? error.message : String(error) });
    });
    return;
  }
  if (message.type === 'init') {
    ensureModel().catch((error) => {
      send('error', { stage: 'load', message: error instanceof Error ? error.message : String(error) });
    });
    return;
  }
  if (message.type === 'synthesize') {
    synthesize(message).catch((error) => {
      send('error', {
        stage: tts ? 'generate' : 'load',
        requestId: message.requestId,
        message: error instanceof Error ? error.message : String(error),
      });
    });
  }
});
