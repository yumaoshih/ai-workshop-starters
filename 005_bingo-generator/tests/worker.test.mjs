import assert from 'node:assert/strict';
import test from 'node:test';
import worker, { BingoRooms, originAllowed } from '../worker.mjs';

class FakeSocket {
  constructor() {
    this.readyState = 1;
    this.messages = [];
    this.attachment = null;
    this.closeCode = null;
  }

  send(value) {
    this.messages.push(JSON.parse(value));
  }

  close(code) {
    this.closeCode = code;
    this.readyState = 3;
  }

  serializeAttachment(value) {
    this.attachment = structuredClone(value);
  }

  deserializeAttachment() {
    return structuredClone(this.attachment);
  }
}

class FakeContext {
  constructor() {
    this.sockets = [];
  }

  acceptWebSocket(socket) {
    this.sockets.push(socket);
  }

  getWebSockets() {
    return this.sockets.filter(socket => socket.readyState === 1);
  }

  addSocket() {
    const socket = new FakeSocket();
    socket.serializeAttachment({});
    this.sockets.push(socket);
    return socket;
  }
}

function lastMessage(socket, type) {
  return socket.messages.findLast(message => !type || message.type === type);
}

test('Cloudflare room service completes approval and signaling with short-lived TURN credentials', async () => {
  const context = new FakeContext();
  const host = context.addSocket();
  const player = context.addSocket();
  const env = {
    REQUIRE_TURN: 'true',
    TURN_KEY_ID: 'test-key',
    TURN_KEY_API_TOKEN: 'test-token',
    TURN_API_BASE_URL: 'https://turn.test',
  };
  const rooms = new BingoRooms(context, env);
  const originalFetch = globalThis.fetch;
  let turnRequest;
  globalThis.fetch = async (url, options) => {
    turnRequest = { url, options };
    return new Response(JSON.stringify({
      iceServers: [
        { urls: ['stun:stun.cloudflare.com:3478', 'stun:stun.cloudflare.com:53'] },
        {
          urls: ['turn:turn.cloudflare.com:3478?transport=udp', 'turns:turn.cloudflare.com:5349?transport=tcp'],
          username: 'short-user',
          credential: 'short-secret',
        },
      ],
    }), { status: 201, headers: { 'Content-Type': 'application/json' } });
  };

  try {
    await rooms.webSocketMessage(host, JSON.stringify({ type: 'create-room' }));
    const roomCode = lastMessage(host, 'room-created').roomCode;
    assert.match(roomCode, /^[A-HJ-NP-Z2-9]{6}$/);

    const playerId = '0123456789abcdef';
    await rooms.webSocketMessage(player, JSON.stringify({ type: 'join-room', roomCode, playerId, name: '小明' }));
    assert.deepEqual(lastMessage(player, 'join-pending'), { type: 'join-pending', roomCode });
    assert.deepEqual(lastMessage(host, 'join-request'), { type: 'join-request', playerId, name: '小明' });

    await rooms.webSocketMessage(host, JSON.stringify({ type: 'approve-player', playerId }));
    assert.equal(turnRequest.url, 'https://turn.test/v1/turn/keys/test-key/credentials/generate-ice-servers');
    assert.equal(turnRequest.options.headers.Authorization, 'Bearer test-token');
    assert.deepEqual(JSON.parse(turnRequest.options.body), { ttl: 14400 });

    const approval = lastMessage(player, 'approved');
    assert.equal(approval.playerId, playerId);
    assert.equal(approval.iceServers.some(server => server.urls.some(url => /:53(?:\?|$)/.test(url))), false);
    assert.equal(approval.iceServers.some(server => server.urls.some(url => url.startsWith('turn'))), true);

    const hostSignal = { description: { type: 'answer', sdp: 'host-answer' } };
    await rooms.webSocketMessage(host, JSON.stringify({ type: 'signal', playerId, signal: hostSignal }));
    assert.deepEqual(lastMessage(player, 'signal').signal, hostSignal);

    const playerSignal = { candidate: { candidate: 'player-candidate' } };
    await rooms.webSocketMessage(player, JSON.stringify({ type: 'signal', playerId, signal: playerSignal }));
    assert.deepEqual(lastMessage(host, 'signal').signal, playerSignal);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('approval returns a recoverable error when required TURN secrets are missing', async () => {
  const context = new FakeContext();
  const host = context.addSocket();
  const player = context.addSocket();
  const rooms = new BingoRooms(context, { REQUIRE_TURN: 'true' });

  await rooms.webSocketMessage(host, JSON.stringify({ type: 'create-room' }));
  const roomCode = lastMessage(host, 'room-created').roomCode;
  const playerId = 'fedcba9876543210';
  await rooms.webSocketMessage(player, JSON.stringify({ type: 'join-room', roomCode, playerId, name: '小華' }));
  await rooms.webSocketMessage(host, JSON.stringify({ type: 'approve-player', playerId }));

  assert.deepEqual(lastMessage(host, 'approval-error'), {
    type: 'approval-error',
    playerId,
    message: '暫時無法完成入場，請再試一次',
  });
  assert.equal(player.deserializeAttachment().status, 'pending');
});

test('closing the host ends the temporary room for every player', async () => {
  const context = new FakeContext();
  const host = context.addSocket();
  const player = context.addSocket();
  const rooms = new BingoRooms(context, { REQUIRE_TURN: 'false' });

  await rooms.webSocketMessage(host, JSON.stringify({ type: 'create-room' }));
  const roomCode = lastMessage(host, 'room-created').roomCode;
  await rooms.webSocketMessage(player, JSON.stringify({
    type: 'join-room',
    roomCode,
    playerId: '1111111111111111',
    name: '朋友',
  }));
  host.readyState = 3;
  rooms.webSocketClose(host);

  assert.deepEqual(lastMessage(player, 'room-closed'), { type: 'room-closed' });
  assert.equal(player.deserializeAttachment().role, '');
});

test('public endpoint checks origins and reports degraded health without TURN secrets', async () => {
  const env = {
    REQUIRE_TURN: 'true',
    ALLOWED_ORIGINS: 'https://yumaoshih.github.io',
    ALLOW_PRIVATE_ORIGINS: 'true',
    BINGO_ROOMS: {
      idFromName: name => name,
      get: () => ({ fetch: async () => new Response(JSON.stringify({ activeRooms: 3 })) }),
    },
  };

  assert.equal(originAllowed('https://yumaoshih.github.io', env), true);
  assert.equal(originAllowed('http://172.16.10.89:4176', env), true);
  assert.equal(originAllowed('https://example.com', env), false);

  const response = await worker.fetch(new Request('https://rooms.example/healthz'), env);
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), {
    status: 'degraded',
    activeRooms: 3,
    turnConfigured: false,
    service: 'cloudflare-workers',
  });
});
