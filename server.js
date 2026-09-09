const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { URL } = require('url');

const HOST = process.env.HOST || '0.0.0.0';
const PORT = Number(process.env.PORT || 3000);
const PUBLIC_DIR = path.join(__dirname, 'public');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
};

const rooms = new Map();

function getRoom(roomId) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, { peers: new Map() });
  }
  return rooms.get(roomId);
}

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
  });
  res.end(body);
}

function getLocalAddresses() {
  const interfaces = os.networkInterfaces();
  const candidates = [];

  for (const [name, addresses] of Object.entries(interfaces)) {
    for (const info of addresses || []) {
      if (!info || info.internal || info.family !== 'IPv4') continue;
      const address = String(info.address || '').trim();
      if (!address) continue;
      candidates.push({
        interface: name,
        address,
      });
    }
  }

  const interfaceScore = (name) => {
    const value = String(name || '').toLowerCase();
    if (/(wi-?fi|wlan|wireless)/.test(value)) return 0;
    if (/(ethernet|eth|enp|eno|lan)/.test(value)) return 1;
    if (/(tailscale|zerotier|hamachi|tun|tap)/.test(value)) return 6;
    if (/(virtualbox|vbox|vmware|hyper-v|vethernet|docker|wsl|loopback)/.test(value)) return 8;
    return 3;
  };

  const addressScore = (address) => {
    if (/^192\.168\./.test(address)) return 1;
    if (/^10\./.test(address)) return 2;
    if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(address)) return 3;
    if (/^169\.254\./.test(address)) return 9;
    return 5;
  };

  return candidates.sort((a, b) => {
    const scoreA = interfaceScore(a.interface) * 10 + addressScore(a.address);
    const scoreB = interfaceScore(b.interface) * 10 + addressScore(b.address);
    return scoreA - scoreB || a.interface.localeCompare(b.interface) || a.address.localeCompare(b.address);
  });
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > 2 * 1024 * 1024) {
        reject(new Error('Body too large'));
        req.destroy();
      }
    });
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

function writeSse(res, event) {
  res.write(`data: ${JSON.stringify(event)}\n\n`);
}

function notifyRoom(roomId, event, excludePeerId = null) {
  const room = rooms.get(roomId);
  if (!room) return;
  for (const [peerId, peer] of room.peers.entries()) {
    if (peerId === excludePeerId) continue;
    if (peer.sse) {
      writeSse(peer.sse, event);
    }
  }
}

function cleanupPeer(roomId, peerId, reason = 'left') {
  const room = rooms.get(roomId);
  if (!room) return;
  const peer = room.peers.get(peerId);
  if (!peer) return;

  if (peer.keepAlive) {
    clearInterval(peer.keepAlive);
  }
  if (peer.sse) {
    try {
      peer.sse.end();
    } catch {}
  }

  room.peers.delete(peerId);
  if (peer.ready) {
    notifyRoom(roomId, { type: 'peer-left', peerId, reason }, peerId);
  }

  if (room.peers.size === 0) {
    rooms.delete(roomId);
  }
}

function sanitizeStaticPath(requestPath) {
  const decoded = decodeURIComponent(requestPath);
  const normalized = path.normalize(decoded).replace(/^([.][.][/\\])+/, '');
  let filePath = path.join(PUBLIC_DIR, normalized);
  if (filePath.endsWith(path.sep)) {
    filePath = path.join(filePath, 'index.html');
  }
  if (!filePath.startsWith(PUBLIC_DIR)) {
    return null;
  }
  return filePath;
}

async function handleApi(req, res, url) {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    });
    res.end();
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/health') {
    sendJson(res, 200, { ok: true, rooms: rooms.size, time: new Date().toISOString() });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/network-info') {
    const forwardedProto = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim();
    const protocol = forwardedProto || (req.socket.encrypted ? 'https' : 'http');
    const hostHeader = String(req.headers.host || '');
    const hostParts = hostHeader.split(':');
    const requestedHost = hostParts[0] || 'localhost';
    const requestedPort = hostParts[1] || String(PORT);
    const addresses = getLocalAddresses();
    const suggestedOrigins = addresses.map(({ interface: iface, address }) => ({
      interface: iface,
      address,
      origin: `${protocol}://${address}:${requestedPort}`,
    }));

    sendJson(res, 200, {
      ok: true,
      requestedHost,
      requestedPort,
      protocol,
      addresses,
      suggestedOrigins,
    });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/join') {
    try {
      const body = await readBody(req);
      const roomId = String(body.roomId || '').trim();
      const peerId = String(body.peerId || '').trim();
      const name = String(body.name || '').trim().slice(0, 80) || 'Dispositivo';

      if (!roomId || !peerId) {
        sendJson(res, 400, { ok: false, error: 'roomId and peerId are required' });
        return;
      }

      const room = getRoom(roomId);
      const existing = room.peers.get(peerId);
      if (existing) {
        cleanupPeer(roomId, peerId, 'replaced');
      }

      const existingPeers = [...room.peers.entries()]
        .filter(([, peer]) => peer.ready && peer.sse)
        .map(([id, peer]) => ({
          peerId: id,
          name: peer.name,
          joinedAt: peer.joinedAt,
        }));

      room.peers.set(peerId, {
        peerId,
        name,
        joinedAt: Date.now(),
        sse: null,
        keepAlive: null,
        ready: false,
      });

      sendJson(res, 200, { ok: true, peers: existingPeers });
    } catch (error) {
      sendJson(res, 400, { ok: false, error: error.message });
    }
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/events') {
    const roomId = String(url.searchParams.get('roomId') || '').trim();
    const peerId = String(url.searchParams.get('peerId') || '').trim();

    if (!roomId || !peerId) {
      sendJson(res, 400, { ok: false, error: 'roomId and peerId are required' });
      return;
    }

    const room = rooms.get(roomId);
    const peer = room?.peers.get(peerId);
    if (!peer) {
      sendJson(res, 404, { ok: false, error: 'Peer not joined' });
      return;
    }

    if (peer.sse && peer.sse !== res) {
      try {
        peer.sse.end();
      } catch {}
      if (peer.keepAlive) clearInterval(peer.keepAlive);
    }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'X-Accel-Buffering': 'no',
    });
    res.write('\n');

    peer.sse = res;
    peer.ready = true;
    peer.keepAlive = setInterval(() => {
      try {
        res.write(': keepalive\n\n');
      } catch {}
    }, 15000);

    writeSse(res, { type: 'ready', peerId, roomId });
    notifyRoom(roomId, {
      type: 'peer-joined',
      peerId,
      name: peer.name,
      joinedAt: peer.joinedAt,
    }, peerId);

    req.on('close', () => {
      const currentRoom = rooms.get(roomId);
      const currentPeer = currentRoom?.peers.get(peerId);
      if (currentPeer && currentPeer.sse === res) {
        cleanupPeer(roomId, peerId, 'connection-closed');
      }
    });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/send') {
    try {
      const body = await readBody(req);
      const roomId = String(body.roomId || '').trim();
      const from = String(body.from || '').trim();
      const to = String(body.to || '').trim();
      const data = body.data;

      if (!roomId || !from || !to || !data) {
        sendJson(res, 400, { ok: false, error: 'roomId, from, to and data are required' });
        return;
      }

      const room = rooms.get(roomId);
      const target = room?.peers.get(to);
      if (!room || !target || !target.sse) {
        sendJson(res, 404, { ok: false, error: 'Target peer is offline' });
        return;
      }

      writeSse(target.sse, {
        type: 'signal',
        from,
        to,
        data,
      });

      sendJson(res, 200, { ok: true });
    } catch (error) {
      sendJson(res, 400, { ok: false, error: error.message });
    }
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/leave') {
    try {
      const body = await readBody(req);
      const roomId = String(body.roomId || '').trim();
      const peerId = String(body.peerId || '').trim();
      if (!roomId || !peerId) {
        sendJson(res, 400, { ok: false, error: 'roomId and peerId are required' });
        return;
      }
      cleanupPeer(roomId, peerId, 'manual-leave');
      sendJson(res, 200, { ok: true });
    } catch (error) {
      sendJson(res, 400, { ok: false, error: error.message });
    }
    return;
  }

  sendJson(res, 404, { ok: false, error: 'Not found' });
}

function getCacheControl(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (filePath.endsWith(`${path.sep}sw.js`) || ['.html', '.js', '.css', '.webmanifest'].includes(ext)) {
    return 'no-cache';
  }
  return 'public, max-age=86400';
}

function handleStatic(req, res, url) {
  let pathname = url.pathname;
  if (pathname === '/') pathname = '/index.html';
  const filePath = sanitizeStaticPath(pathname);
  if (!filePath) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.stat(filePath, (statErr, stat) => {
    if (statErr || !stat.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
      'Cache-Control': getCacheControl(filePath),
    });

    fs.createReadStream(filePath).pipe(res);
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  if (url.pathname.startsWith('/api/')) {
    handleApi(req, res, url).catch((error) => {
      sendJson(res, 500, { ok: false, error: error.message || 'Internal error' });
    });
    return;
  }

  handleStatic(req, res, url);
});

server.listen(PORT, HOST, () => {
  console.log(`Mic Room listo en http://${HOST}:${PORT}`);
});

process.on('SIGTERM', () => {
  console.log('Apagando servidor...');
  server.close(() => process.exit(0));
});
