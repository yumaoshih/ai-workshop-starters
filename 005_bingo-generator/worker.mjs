const ROOM_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const MAX_PLAYERS = 24;
const MAX_SOCKET_MESSAGES_PER_MINUTE = 1200;
const MAX_MESSAGE_BYTES = 65536;
const TURN_TTL_SECONDS = 4 * 60 * 60;
const DEFAULT_ICE_SERVERS = [
  { urls: ['stun:stun.cloudflare.com:3478'] },
  { urls: ['stun:stun.l.google.com:19302'] },
];

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

function turnConfigured(env) {
  return Boolean(env.TURN_KEY_ID && env.TURN_KEY_API_TOKEN);
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

async function issueIceServers(env) {
  if (!turnConfigured(env)) {
    if (env.REQUIRE_TURN === 'true') throw new Error('TURN is not configured');
    return DEFAULT_ICE_SERVERS;
  }

  const apiBase = env.TURN_API_BASE_URL || 'https://rtc.live.cloudflare.com';
  const response = await fetch(
    `${apiBase}/v1/turn/keys/${encodeURIComponent(env.TURN_KEY_ID)}/credentials/generate-ice-servers`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.TURN_KEY_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ttl: TURN_TTL_SECONDS }),
      signal: AbortSignal.timeout(6000),
    },
  );
  if (!response.ok) throw new Error(`TURN responded with ${response.status}`);
  const payload = await response.json();
  const iceServers = normalizeIceServers(payload.iceServers);
  const hasRelay = iceServers.some(server => server.urls.some(url => url.startsWith('turn:') || url.startsWith('turns:')));
  if (!hasRelay) throw new Error('TURN response has no relay server');
  return iceServers;
}

function normalizedName(value) {
  return typeof value === 'string' ? value.trim().slice(0, 24) : '';
}

function normalizedId(value) {
  return typeof value === 'string' && /^[a-f0-9]{16,40}$/.test(value) ? value : '';
}

function emptySocketState() {
  return {
    role: '',
    roomCode: '',
    playerId: '',
    name: '',
    status: '',
    messageWindowStarted: 0,
    messageCount: 0,
  };
}

function readSocketState(socket) {
  try {
    return { ...emptySocketState(), ...(socket.deserializeAttachment() || {}) };
  } catch (error) {
    return emptySocketState();
  }
}

function writeSocketState(socket, nextState) {
  try { socket.serializeAttachment({ ...emptySocketState(), ...nextState }); } catch (error) {}
}

function safeSend(socket, message) {
  if (!socket || socket.readyState !== 1) return;
  try { socket.send(JSON.stringify(message)); } catch (error) {}
}

function sendError(socket, code, message) {
  safeSend(socket, { type: 'error', code, message });
}

function logEvent(event, details = {}) {
  console.log(JSON.stringify({ timestamp: new Date().toISOString(), event, ...details }));
}

function newRoomCode(existingRooms) {
  let code = '';
  do {
    const values = new Uint8Array(6);
    crypto.getRandomValues(values);
    code = Array.from(values, value => ROOM_ALPHABET[value % ROOM_ALPHABET.length]).join('');
  } while (existingRooms.has(code));
  return code;
}

export function originAllowed(origin, env) {
  if (!origin) return false;
  let parsed;
  try { parsed = new URL(origin); } catch (error) { return false; }

  const allowed = String(env.ALLOWED_ORIGINS || '')
    .split(',')
    .map(value => value.trim())
    .filter(Boolean);
  if (allowed.includes(parsed.origin)) return true;
  if (env.ALLOW_PRIVATE_ORIGINS !== 'true' || parsed.protocol !== 'http:') return false;
  return /^(localhost|127\.0\.0\.1|10(?:\.\d{1,3}){3}|192\.168(?:\.\d{1,3}){2}|172\.(?:1[6-9]|2\d|3[01])(?:\.\d{1,3}){2})$/.test(parsed.hostname);
}

export class BingoRooms {
  constructor(ctx, env) {
    this.ctx = ctx;
    this.env = env;
  }

  roomIndex() {
    const rooms = new Map();
    for (const socket of this.ctx.getWebSockets()) {
      const state = readSocketState(socket);
      if (state.role === 'host' && state.roomCode) {
        rooms.set(state.roomCode, { host: socket, players: new Map() });
      }
    }
    for (const socket of this.ctx.getWebSockets()) {
      const state = readSocketState(socket);
      const room = state.role === 'player' && rooms.get(state.roomCode);
      if (room && state.playerId) {
        room.players.set(state.playerId, { socket, name: state.name, status: state.status });
      }
    }
    return rooms;
  }

  detachSocket(socket) {
    const state = readSocketState(socket);
    const connectedSockets = this.ctx.getWebSockets();

    if (state.role === 'host' && state.roomCode) {
      for (const connected of connectedSockets) {
        const connectedState = readSocketState(connected);
        if (connectedState.role === 'player' && connectedState.roomCode === state.roomCode) {
          safeSend(connected, { type: 'room-closed' });
          writeSocketState(connected, emptySocketState());
        }
      }
      const activeRooms = connectedSockets.filter(connected => {
        const connectedState = readSocketState(connected);
        return connected !== socket && connectedState.role === 'host' && connectedState.roomCode;
      }).length;
      logEvent('room.closed', { activeRooms });
    }

    if (state.role === 'player' && state.roomCode && state.playerId) {
      for (const connected of connectedSockets) {
        const connectedState = readSocketState(connected);
        if (connectedState.role === 'host' && connectedState.roomCode === state.roomCode) {
          safeSend(connected, { type: 'player-left', playerId: state.playerId });
          break;
        }
      }
    }

    writeSocketState(socket, emptySocketState());
  }

  handleHostRegistration(socket) {
    this.detachSocket(socket);
    const rooms = this.roomIndex();
    const roomCode = newRoomCode(rooms);
    writeSocketState(socket, { ...emptySocketState(), role: 'host', roomCode });
    safeSend(socket, { type: 'room-created', roomCode });
    logEvent('room.created', { activeRooms: rooms.size + 1 });
  }

  handleJoin(socket, message) {
    const roomCode = String(message.roomCode || '').trim().toUpperCase();
    const name = normalizedName(message.name);
    const playerId = normalizedId(message.playerId);
    const current = readSocketState(socket);
    const rooms = this.roomIndex();
    const room = rooms.get(roomCode);

    if (current.role === 'host' && current.roomCode === roomCode) {
      sendError(socket, 'same-room', '主持人不能加入自己正在主持的房間');
      return;
    }
    if (!/^[A-HJ-NP-Z2-9]{6}$/.test(roomCode) || !room) {
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

    this.detachSocket(socket);
    writeSocketState(socket, {
      ...emptySocketState(),
      role: 'player',
      roomCode,
      playerId,
      name,
      status: 'pending',
    });
    safeSend(socket, { type: 'join-pending', roomCode });
    safeSend(room.host, { type: 'join-request', playerId, name });
    logEvent('player.requested', { roomPlayers: room.players.size + 1 });
  }

  hostRoom(socket) {
    const state = readSocketState(socket);
    if (state.role !== 'host') return null;
    const room = this.roomIndex().get(state.roomCode);
    return room && room.host === socket ? room : null;
  }

  async approvePlayer(socket, message) {
    const room = this.hostRoom(socket);
    const playerId = normalizedId(message.playerId);
    const player = room && room.players.get(playerId);
    if (!player || player.status !== 'pending') {
      sendError(socket, 'request-missing', '這份加入申請已經失效');
      return;
    }

    const playerState = readSocketState(player.socket);
    writeSocketState(player.socket, { ...playerState, status: 'approving' });
    try {
      const iceServers = await issueIceServers(this.env);
      const currentRoom = this.hostRoom(socket);
      const currentPlayer = currentRoom && currentRoom.players.get(playerId);
      if (!currentPlayer || currentPlayer.socket !== player.socket || currentPlayer.status !== 'approving') return;

      writeSocketState(player.socket, { ...readSocketState(player.socket), status: 'approved' });
      safeSend(socket, { type: 'player-approved', playerId, iceServers });
      safeSend(player.socket, { type: 'approved', playerId, iceServers });
      logEvent('player.approved', { roomPlayers: currentRoom.players.size, turn: turnConfigured(this.env) });
    } catch (error) {
      const currentRoom = this.hostRoom(socket);
      const currentPlayer = currentRoom && currentRoom.players.get(playerId);
      if (!currentPlayer || currentPlayer.socket !== player.socket) return;
      writeSocketState(player.socket, { ...readSocketState(player.socket), status: 'pending' });
      safeSend(socket, { type: 'approval-error', playerId, message: '暫時無法完成入場，請再試一次' });
      logEvent('player.approval_failed', { reason: error.name || 'Error' });
    }
  }

  removePlayer(socket, message) {
    const room = this.hostRoom(socket);
    const playerId = normalizedId(message.playerId);
    const player = room && room.players.get(playerId);
    if (!player) return;
    safeSend(player.socket, { type: message.reason === 'rejected' ? 'rejected' : 'removed' });
    writeSocketState(player.socket, emptySocketState());
    logEvent(message.reason === 'rejected' ? 'player.rejected' : 'player.removed', { roomPlayers: room.players.size - 1 });
  }

  relaySignal(socket, message) {
    const playerId = normalizedId(message.playerId);
    const signal = message.signal;
    if (!playerId || !signal || typeof signal !== 'object' || Array.isArray(signal)) return;
    const state = readSocketState(socket);

    if (state.role === 'host') {
      const room = this.hostRoom(socket);
      const player = room && room.players.get(playerId);
      if (player && player.status === 'approved') safeSend(player.socket, { type: 'signal', playerId, signal });
      return;
    }

    if (state.role === 'player' && state.playerId === playerId) {
      const room = this.roomIndex().get(state.roomCode);
      const player = room && room.players.get(playerId);
      if (room && player && player.socket === socket && player.status === 'approved') {
        safeSend(room.host, { type: 'signal', playerId, name: player.name, signal });
      }
    }
  }

  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === '/healthz') {
      return json({ activeRooms: this.roomIndex().size });
    }
    if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') {
      return new Response('Expected WebSocket', { status: 426 });
    }

    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];
    this.ctx.acceptWebSocket(server);
    writeSocketState(server, emptySocketState());
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(socket, raw) {
    if (typeof raw !== 'string' || new TextEncoder().encode(raw).byteLength > MAX_MESSAGE_BYTES) {
      socket.close(1009, 'message too large');
      return;
    }

    const now = Date.now();
    const state = readSocketState(socket);
    if (!state.messageWindowStarted || now - state.messageWindowStarted > 60000) {
      state.messageWindowStarted = now;
      state.messageCount = 0;
    }
    state.messageCount += 1;
    writeSocketState(socket, state);
    if (state.messageCount > MAX_SOCKET_MESSAGES_PER_MINUTE) {
      socket.close(1008, 'rate limit');
      return;
    }

    let message;
    try { message = JSON.parse(raw); } catch (error) { return; }
    if (!message || typeof message.type !== 'string') return;

    if (message.type === 'create-room') this.handleHostRegistration(socket);
    else if (message.type === 'join-room') this.handleJoin(socket, message);
    else if (message.type === 'approve-player') await this.approvePlayer(socket, message);
    else if (message.type === 'reject-player') this.removePlayer(socket, { ...message, reason: 'rejected' });
    else if (message.type === 'remove-player') this.removePlayer(socket, message);
    else if (message.type === 'signal') this.relaySignal(socket, message);
  }

  webSocketClose(socket) {
    this.detachSocket(socket);
  }

  webSocketError(socket) {
    this.detachSocket(socket);
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/healthz') {
      const ready = env.REQUIRE_TURN !== 'true' || turnConfigured(env);
      try {
        const id = env.BINGO_ROOMS.idFromName('global-lobby-v1');
        const roomHealth = await env.BINGO_ROOMS.get(id).fetch(new Request('https://internal/healthz'));
        const roomState = await roomHealth.json();
        return json({
          status: ready ? 'ok' : 'degraded',
          activeRooms: roomState.activeRooms || 0,
          turnConfigured: turnConfigured(env),
          service: 'cloudflare-workers',
        }, ready ? 200 : 503);
      } catch (error) {
        return json({ status: 'degraded', turnConfigured: turnConfigured(env), service: 'cloudflare-workers' }, 503);
      }
    }

    if (url.pathname !== '/ws') return new Response('Not Found', { status: 404 });
    if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') {
      return new Response('Expected WebSocket', { status: 426 });
    }
    if (!originAllowed(request.headers.get('Origin'), env)) {
      return new Response('Origin not allowed', { status: 403 });
    }

    const id = env.BINGO_ROOMS.idFromName('global-lobby-v1');
    return env.BINGO_ROOMS.get(id).fetch(request);
  },
};
