#!/usr/bin/env node
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const http = require('http');
const path = require('path');
const { WebSocket, WebSocketServer } = require('ws');

const appRoot = __dirname;
const port = Number(process.env.PORT || 4176);
const host = process.env.HOST || '0.0.0.0';
const rooms = new Map();
const ROOM_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const MAX_PLAYERS = 24;
const MAX_SOCKET_MESSAGES_PER_MINUTE = 1200;
const TURN_KEY_ID = process.env.TURN_KEY_ID || '';
const TURN_KEY_API_TOKEN = process.env.TURN_KEY_API_TOKEN || '';
const TURN_API_BASE_URL = process.env.TURN_API_BASE_URL || 'https://rtc.live.cloudflare.com';
const REQUIRE_TURN = process.env.REQUIRE_TURN === 'true';
const TURN_TTL_SECONDS = 4 * 60 * 60;
const DEFAULT_ICE_SERVERS = [
  { urls: 'stun:stun.cloudflare.com:3478' },
  { urls: 'stun:stun.l.google.com:19302' },
];

const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
};

function roomCode() {
  let code = '';
  do {
    code = Array.from({ length: 6 }, () => ROOM_ALPHABET[crypto.randomInt(ROOM_ALPHABET.length)]).join('');
  } while (rooms.has(code));
  return code;
}

function send(socket, message) {
  if (socket && socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message));
}

function sendError(socket, code, message) {
  send(socket, { type: 'error', code, message });
}

function logEvent(event, details = {}) {
  console.log(JSON.stringify({ timestamp: new Date().toISOString(), event, ...details }));
}

function turnConfigured() {
  return Boolean(TURN_KEY_ID && TURN_KEY_API_TOKEN);
}

function normalizeIceServers(value) {
  if (!Array.isArray(value)) return [];
  return value.flatMap(server => {
    if (!server || !server.urls) return [];
    const urls = (Array.isArray(server.urls) ? server.urls : [server.urls])
      .filter(url => typeof url === 'string' && !/:53(?:\?|$)/.test(url));
    if (!urls.length) return [];
    const normalized = { urls };
    if (typeof server.username === 'string') normalized.username = server.username;
    if (typeof server.credential === 'string') normalized.credential = server.credential;
    return [normalized];
  });
}

async function issueIceServers() {
  if (!turnConfigured()) {
    if (REQUIRE_TURN) throw new Error('TURN 尚未完成設定');
    return DEFAULT_ICE_SERVERS;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);
  try {
    const response = await fetch(
      `${TURN_API_BASE_URL}/v1/turn/keys/${encodeURIComponent(TURN_KEY_ID)}/credentials/generate-ice-servers`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${TURN_KEY_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ttl: TURN_TTL_SECONDS }),
        signal: controller.signal,
      },
    );
    if (!response.ok) throw new Error(`TURN 服務回應 ${response.status}`);
    const payload = await response.json();
    const iceServers = normalizeIceServers(payload.iceServers);
    if (!iceServers.some(server => server.urls.some(url => url.startsWith('turn:') || url.startsWith('turns:')))) {
      throw new Error('TURN 服務未提供轉接節點');
    }
    return iceServers;
  } finally {
    clearTimeout(timeout);
  }
}

function normalizedName(value) {
  return typeof value === 'string' ? value.trim().slice(0, 24) : '';
}

function normalizedId(value) {
  return typeof value === 'string' && /^[a-f0-9]{16,40}$/.test(value) ? value : '';
}

function detachSocket(socket) {
  if (socket.role === 'host' && socket.roomCode) {
    const room = rooms.get(socket.roomCode);
    if (room && room.host === socket) {
      room.players.forEach(player => send(player.socket, { type: 'room-closed' }));
      rooms.delete(socket.roomCode);
      logEvent('room.closed', { activeRooms: rooms.size });
    }
  }

  if (socket.role === 'player' && socket.roomCode && socket.playerId) {
    const room = rooms.get(socket.roomCode);
    const player = room && room.players.get(socket.playerId);
    if (room && player && player.socket === socket) {
      room.players.delete(socket.playerId);
      send(room.host, { type: 'player-left', playerId: socket.playerId });
    }
  }

  socket.role = '';
  socket.roomCode = '';
  socket.playerId = '';
}

function handleHostRegistration(socket) {
  detachSocket(socket);
  const code = roomCode();
  rooms.set(code, { host: socket, players: new Map() });
  socket.role = 'host';
  socket.roomCode = code;
  send(socket, { type: 'room-created', roomCode: code });
  logEvent('room.created', { activeRooms: rooms.size });
}

function handleJoin(socket, message) {
  const code = String(message.roomCode || '').trim().toUpperCase();
  const name = normalizedName(message.name);
  const playerId = normalizedId(message.playerId);
  const room = rooms.get(code);

  if (socket.role === 'host' && socket.roomCode === code) {
    sendError(socket, 'same-room', '主持人不能加入自己正在主持的房間');
    return;
  }
  if (!/^[A-HJ-NP-Z2-9]{6}$/.test(code) || !room) {
    sendError(socket, 'room-not-found', '找不到這個房間，請確認房間碼');
    return;
  }
  if (!name || !playerId) {
    sendError(socket, 'invalid-player', '請輸入有效的暱稱後再試一次');
    return;
  }
  if (room.players.size >= MAX_PLAYERS) {
    sendError(socket, 'room-full', '這個房間已經滿了');
    return;
  }
  if (room.players.has(playerId)) {
    sendError(socket, 'duplicate-player', '這次加入申請已經送出');
    return;
  }

  detachSocket(socket);
  room.players.set(playerId, { socket, name, status: 'pending' });
  socket.role = 'player';
  socket.roomCode = code;
  socket.playerId = playerId;
  send(socket, { type: 'join-pending', roomCode: code });
  send(room.host, { type: 'join-request', playerId, name });
  logEvent('player.requested', { roomPlayers: room.players.size });
}

function hostRoom(socket) {
  if (socket.role !== 'host') return null;
  const room = rooms.get(socket.roomCode);
  return room && room.host === socket ? room : null;
}

async function approvePlayer(socket, message) {
  const room = hostRoom(socket);
  const playerId = normalizedId(message.playerId);
  const player = room && room.players.get(playerId);
  if (!player || player.status !== 'pending') {
    sendError(socket, 'request-missing', '這份加入申請已經失效');
    return;
  }
  player.status = 'approving';
  try {
    const iceServers = await issueIceServers();
    if (hostRoom(socket) !== room || room.players.get(playerId) !== player || player.status !== 'approving') return;
    player.status = 'approved';
    send(socket, { type: 'player-approved', playerId, iceServers });
    send(player.socket, { type: 'approved', playerId, iceServers });
    logEvent('player.approved', { roomPlayers: room.players.size, turn: turnConfigured() });
  } catch (error) {
    if (hostRoom(socket) !== room || room.players.get(playerId) !== player) return;
    player.status = 'pending';
    send(socket, { type: 'approval-error', playerId, message: '暫時無法完成入場，請再試一次' });
    logEvent('player.approval_failed', { reason: error.name || 'Error' });
  }
}

function removePlayer(socket, message) {
  const room = hostRoom(socket);
  const playerId = normalizedId(message.playerId);
  const player = room && room.players.get(playerId);
  if (!player) return;
  room.players.delete(playerId);
  send(player.socket, { type: message.reason === 'rejected' ? 'rejected' : 'removed' });
  player.socket.role = '';
  player.socket.roomCode = '';
  player.socket.playerId = '';
  logEvent(message.reason === 'rejected' ? 'player.rejected' : 'player.removed', { roomPlayers: room.players.size });
}

function relaySignal(socket, message) {
  const playerId = normalizedId(message.playerId);
  const signal = message.signal;
  if (!playerId || !signal || typeof signal !== 'object') return;

  if (socket.role === 'host') {
    const room = hostRoom(socket);
    const player = room && room.players.get(playerId);
    if (player && player.status === 'approved') send(player.socket, { type: 'signal', playerId, signal });
    return;
  }

  if (socket.role === 'player' && socket.playerId === playerId) {
    const room = rooms.get(socket.roomCode);
    const player = room && room.players.get(playerId);
    if (room && player && player.socket === socket && player.status === 'approved') {
      send(room.host, { type: 'signal', playerId, name: player.name, signal });
    }
  }
}

function handleMessage(socket, raw) {
  if (raw.length > 65536) return;
  const now = Date.now();
  if (!socket.messageWindowStarted || now - socket.messageWindowStarted > 60000) {
    socket.messageWindowStarted = now;
    socket.messageCount = 0;
  }
  socket.messageCount += 1;
  if (socket.messageCount > MAX_SOCKET_MESSAGES_PER_MINUTE) {
    socket.close(1008, 'rate limit');
    return;
  }
  let message;
  try { message = JSON.parse(raw.toString()); } catch (error) { return; }
  if (!message || typeof message.type !== 'string') return;

  if (message.type === 'create-room') handleHostRegistration(socket);
  else if (message.type === 'join-room') handleJoin(socket, message);
  else if (message.type === 'approve-player') void approvePlayer(socket, message);
  else if (message.type === 'reject-player') removePlayer(socket, { ...message, reason: 'rejected' });
  else if (message.type === 'remove-player') removePlayer(socket, message);
  else if (message.type === 'signal') relaySignal(socket, message);
}

function resolveAsset(requestUrl) {
  let pathname;
  try { pathname = decodeURIComponent(new URL(requestUrl, 'http://localhost').pathname); }
  catch (error) { return null; }

  pathname = pathname.replace(/^\/(?:bingo-generator|005_bingo-generator)(?=\/|$)/, '');
  if (pathname === '' || pathname === '/') pathname = '/index.html';
  const resolved = path.resolve(appRoot, `.${pathname}`);
  return resolved === appRoot || resolved.startsWith(`${appRoot}${path.sep}`) ? resolved : null;
}

const server = http.createServer((request, response) => {
  if (!['GET', 'HEAD'].includes(request.method)) {
    response.writeHead(405).end('Method Not Allowed');
    return;
  }
  let requestPath;
  try { requestPath = new URL(request.url, 'http://localhost').pathname; }
  catch (error) { response.writeHead(400).end('Bad Request'); return; }
  if (requestPath === '/healthz') {
    const ready = !REQUIRE_TURN || turnConfigured();
    const payload = JSON.stringify({
      status: ready ? 'ok' : 'degraded',
      activeRooms: rooms.size,
      turnConfigured: turnConfigured(),
      uptimeSeconds: Math.round(process.uptime()),
    });
    response.writeHead(ready ? 200 : 503, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'Content-Length': Buffer.byteLength(payload),
    }).end(request.method === 'HEAD' ? undefined : payload);
    return;
  }
  const filePath = resolveAsset(request.url);
  if (!filePath) {
    response.writeHead(400).end('Bad Request');
    return;
  }
  fs.stat(filePath, (statError, stats) => {
    if (statError || !stats.isFile()) {
      response.writeHead(404).end('Not Found');
      return;
    }
    response.writeHead(200, {
      'Content-Type': contentTypes[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    if (request.method === 'HEAD') response.end();
    else fs.createReadStream(filePath).pipe(response);
  });
});
server.maxHeadersCount = 100;
server.headersTimeout = 10000;
server.requestTimeout = 15000;

const websocketServer = new WebSocketServer({ noServer: true, maxPayload: 65536, perMessageDeflate: false });
websocketServer.on('connection', socket => {
  socket.isAlive = true;
  socket.on('pong', () => { socket.isAlive = true; });
  socket.on('message', raw => handleMessage(socket, raw));
  socket.on('close', () => detachSocket(socket));
  socket.on('error', () => {});
});

server.on('upgrade', (request, socket, head) => {
  let pathname = '';
  try { pathname = new URL(request.url, 'http://localhost').pathname; }
  catch (error) { socket.destroy(); return; }
  let originHost = '';
  try { originHost = request.headers.origin ? new URL(request.headers.origin).host : ''; } catch (error) {}
  if (pathname !== '/ws' || (originHost && originHost !== request.headers.host)) {
    socket.destroy();
    return;
  }
  websocketServer.handleUpgrade(request, socket, head, upgraded => websocketServer.emit('connection', upgraded, request));
});

const heartbeat = setInterval(() => {
  websocketServer.clients.forEach(socket => {
    if (!socket.isAlive) return socket.terminate();
    socket.isAlive = false;
    socket.ping();
  });
}, 30000);

server.listen(port, host, () => {
  logEvent('server.started', { host, port, turnConfigured: turnConfigured(), requireTurn: REQUIRE_TURN });
  console.log(`一起賓果已開啟：http://127.0.0.1:${port}/bingo-generator/`);
});

function shutdown() {
  clearInterval(heartbeat);
  websocketServer.clients.forEach(socket => socket.close(1001, 'server shutdown'));
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 1000).unref();
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
