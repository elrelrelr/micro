const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const { EventSource } = require('eventsource');
const { webcrypto } = require('crypto');

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:3000';
const OUT_DIR = process.env.OUT_DIR || '/home/user/mic-room/test-results';
const HTML_PATH = '/home/user/mic-room/public/index.html';
const APP_JS_PATH = '/home/user/mic-room/public/app.js';
const SERVER_JS_PATH = '/home/user/mic-room/server.js';

fs.mkdirSync(OUT_DIR, { recursive: true });

const html = fs.readFileSync(HTML_PATH, 'utf8');
const appJs = fs.readFileSync(APP_JS_PATH, 'utf8');
const serverJs = fs.readFileSync(SERVER_JS_PATH, 'utf8');

const report = {
  baseUrl: BASE_URL,
  startedAt: new Date().toISOString(),
  checks: [],
  warnings: [],
  errors: [],
};

function addCheck(name, pass, details = '') {
  report.checks.push({ name, pass, details });
  console.log(`${pass ? '✅' : '❌'} ${name}${details ? ' — ' + details : ''}`);
}

function addWarning(message) {
  report.warnings.push(message);
  console.log(`⚠️  ${message}`);
}

function addError(name, error) {
  const details = error?.stack || error?.message || String(error);
  report.errors.push({ name, details });
  addCheck(name, false, details.split('\n')[0]);
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitFor(predicate, { timeout = 10000, interval = 50, label = 'condición' } = {}) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      const result = await predicate();
      if (result) return result;
    } catch {}
    await delay(interval);
  }
  throw new Error(`Timeout esperando ${label}`);
}

class FakeMediaStreamTrack {
  constructor(kind = 'audio') {
    this.kind = kind;
    this.enabled = true;
    this.muted = false;
    this.readyState = 'live';
    this.contentHint = '';
    this.id = webcrypto.randomUUID();
    this.onended = null;
  }

  stop() {
    if (this.readyState === 'ended') return;
    this.readyState = 'ended';
    const handler = this.onended;
    this.onended = null;
    if (typeof handler === 'function') {
      queueMicrotask(() => handler());
    }
  }

  clone() {
    const clone = new FakeMediaStreamTrack(this.kind);
    clone.enabled = this.enabled;
    clone.muted = this.muted;
    clone.readyState = this.readyState;
    clone.contentHint = this.contentHint;
    return clone;
  }
}

class FakeMediaStream {
  constructor(tracks = []) {
    this._tracks = tracks;
    this.id = webcrypto.randomUUID();
  }

  getTracks() {
    return [...this._tracks];
  }

  getAudioTracks() {
    return this._tracks.filter((track) => track.kind === 'audio');
  }

  addTrack(track) {
    this._tracks.push(track);
  }
}

const rtcRegistry = new Map();

function parseOfferId(description) {
  if (!description?.sdp) return null;
  const match = String(description.sdp).match(/offer:([a-f0-9-]+)/i) || String(description.sdp).match(/answer:([a-f0-9-]+)/i);
  return match ? match[1] : null;
}

function connectRtcPair(offerId) {
  const entry = rtcRegistry.get(offerId);
  if (!entry || !entry.offerer || !entry.answerer || entry.connected) return;
  entry.connected = true;

  const pair = [entry.offerer, entry.answerer];
  for (const pc of pair) {
    pc.connectionState = 'connected';
    pc.iceConnectionState = 'connected';
    pc.signalingState = 'stable';
    pc._dispatchState();
  }

  const wireAudio = (fromPc, toPc) => {
    if (!fromPc._sender?.track || fromPc._sender.track.readyState !== 'live') return;
    const remoteTrack = fromPc._sender.track.clone();
    const remoteStream = new FakeMediaStream([remoteTrack]);
    toPc._remoteStream = remoteStream;
    if (typeof toPc.ontrack === 'function') {
      toPc.ontrack({ streams: [remoteStream], track: remoteTrack });
    }
  };

  wireAudio(entry.offerer, entry.answerer);
  wireAudio(entry.answerer, entry.offerer);
}

function createWindow(label, userAgent, baseUrl = BASE_URL) {
  const dom = new JSDOM(html, {
    url: baseUrl,
    runScripts: 'outside-only',
    pretendToBeVisual: true,
  });

  const { window } = dom;
  const clipboardStore = { text: '' };

  Object.defineProperty(window.navigator, 'userAgent', {
    value: userAgent,
    configurable: true,
  });

  Object.defineProperty(window, 'crypto', {
    value: webcrypto,
    configurable: true,
  });
  window.globalThis.crypto = webcrypto;
  window.self = window;
  window.fetch = global.fetch.bind(global);
  window.Headers = global.Headers;
  window.Request = global.Request;
  window.Response = global.Response;
  window.EventSource = EventSource;
  window.MediaStream = FakeMediaStream;
  window.MediaStreamTrack = FakeMediaStreamTrack;
  window.PointerEvent = window.MouseEvent;
  window.isSecureContext = true;
  window.alert = (message) => {
    console.log(`[${label}] alert: ${message}`);
  };
  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent() { return false; },
  });

  Object.defineProperty(window.navigator, 'standalone', {
    value: false,
    configurable: true,
  });

  const serviceWorkerReady = Promise.resolve({ active: { scriptURL: '/sw.js' } });
  window.navigator.serviceWorker = {
    controller: null,
    ready: serviceWorkerReady,
    async register(scriptUrl) {
      const response = await fetch(new URL(scriptUrl, baseUrl));
      if (!response.ok) throw new Error(`SW HTTP ${response.status}`);
      this.controller = { scriptURL: scriptUrl };
      return { active: this.controller };
    },
  };

  window.navigator.clipboard = {
    async writeText(text) {
      clipboardStore.text = String(text);
    },
    async readText() {
      return clipboardStore.text;
    },
  };

  window.navigator.share = async ({ title, text, url }) => {
    clipboardStore.text = `${title || ''}\n${text || ''}\n${url || ''}`.trim();
  };

  Object.defineProperty(window.HTMLMediaElement.prototype, 'srcObject', {
    get() {
      return this._srcObject || null;
    },
    set(value) {
      this._srcObject = value;
    },
    configurable: true,
  });

  Object.defineProperty(window.HTMLMediaElement.prototype, 'paused', {
    get() {
      return this._paused ?? true;
    },
    set(value) {
      this._paused = Boolean(value);
    },
    configurable: true,
  });

  window.HTMLMediaElement.prototype.play = async function play() {
    this._paused = false;
    return Promise.resolve();
  };
  window.HTMLMediaElement.prototype.pause = function pause() {
    this._paused = true;
  };
  window.HTMLMediaElement.prototype.setSinkId = async function setSinkId(value) {
    this.sinkId = value;
  };

  class FakeAudioNode {
    connect() { return this; }
    disconnect() { return this; }
  }

  class FakeAnalyser extends FakeAudioNode {
    constructor() {
      super();
      this.fftSize = 512;
      this.frequencyBinCount = 256;
    }
    getByteFrequencyData(arr) {
      arr.fill(32);
    }
  }

  class FakeSource extends FakeAudioNode {}

  class FakeGainNode extends FakeAudioNode {
    constructor() {
      super();
      this.gain = { value: 1 };
    }
  }

  class FakeBiquadFilterNode extends FakeAudioNode {
    constructor() {
      super();
      this.type = 'peaking';
      this.frequency = { value: 0 };
      this.Q = { value: 1 };
      this.gain = { value: 0 };
    }
  }

  class FakeMediaStreamDestinationNode extends FakeAudioNode {
    constructor() {
      super();
      this.stream = new FakeMediaStream([new FakeMediaStreamTrack('audio')]);
    }
  }

  class FakeAudioContext {
    constructor() {
      this.state = 'running';
      this.destination = new FakeAudioNode();
      this.sinkId = 'default';
    }
    createMediaStreamSource() { return new FakeSource(); }
    createAnalyser() { return new FakeAnalyser(); }
    createGain() { return new FakeGainNode(); }
    createBiquadFilter() { return new FakeBiquadFilterNode(); }
    createMediaStreamDestination() { return new FakeMediaStreamDestinationNode(); }
    async setSinkId(value) { this.sinkId = value; }
    async resume() { this.state = 'running'; }
    async close() { this.state = 'closed'; }
  }

  window.AudioContext = FakeAudioContext;
  window.webkitAudioContext = FakeAudioContext;

  const deviceListeners = new Set();
  Object.defineProperty(window.navigator, 'mediaDevices', {
    value: {
      async enumerateDevices() {
        return [
          { kind: 'audioinput', deviceId: 'mic-1', label: `${label} Micrófono` },
          { kind: 'audiooutput', deviceId: 'spk-1', label: `${label} Salida` },
        ];
      },
      async getUserMedia() {
        return new FakeMediaStream([new FakeMediaStreamTrack('audio')]);
      },
      async selectAudioOutput() {
        return { deviceId: 'spk-1', label: `${label} Bluetooth` };
      },
      addEventListener(type, fn) {
        if (type === 'devicechange') deviceListeners.add(fn);
      },
      removeEventListener(type, fn) {
        if (type === 'devicechange') deviceListeners.delete(fn);
      },
    },
    configurable: true,
  });

  window.qrcode = function qrcode() {
    return {
      addData() {},
      make() {},
      createDataURL() {
        return 'data:image/png;base64,ZmFrZS1xci1kYXRh';
      },
      createSvgTag() {
        return '<svg></svg>';
      },
    };
  };

  class FakeSender {
    constructor(track, stream) {
      this.track = track;
      this.stream = stream;
      this._parameters = { encodings: [{}] };
    }
    getParameters() {
      return JSON.parse(JSON.stringify(this._parameters));
    }
    async setParameters(params) {
      this._parameters = JSON.parse(JSON.stringify(params));
    }
    async replaceTrack(track) {
      this.track = track;
    }
  }

  class FakeRTCPeerConnection {
    constructor() {
      this.localDescription = null;
      this.remoteDescription = null;
      this.signalingState = 'stable';
      this.connectionState = 'new';
      this.iceConnectionState = 'new';
      this.onicecandidate = null;
      this.ontrack = null;
      this.onconnectionstatechange = null;
      this.oniceconnectionstatechange = null;
      this.onsignalingstatechange = null;
      this.onnegotiationneeded = null;
      this._sender = null;
      this._offerId = null;
      this._remoteStream = null;
    }

    _dispatchState() {
      this.onconnectionstatechange?.();
      this.oniceconnectionstatechange?.();
      this.onsignalingstatechange?.();
    }

    addTrack(track, stream) {
      this._sender = new FakeSender(track, stream);
      Promise.resolve().then(() => this.onnegotiationneeded?.());
      return this._sender;
    }

    removeTrack(sender) {
      if (this._sender === sender) {
        this._sender.track = null;
        this._sender = null;
      }
    }

    async setLocalDescription(description) {
      if (description) {
        this.localDescription = description;
        return;
      }

      if (this.remoteDescription?.type === 'offer') {
        const offerId = parseOfferId(this.remoteDescription) || webcrypto.randomUUID();
        this._offerId = offerId;
        this.localDescription = { type: 'answer', sdp: `answer:${offerId}` };
        const entry = rtcRegistry.get(offerId) || {};
        entry.answerer = this;
        rtcRegistry.set(offerId, entry);
        this.signalingState = 'stable';
        this._dispatchState();
        connectRtcPair(offerId);
      } else {
        const offerId = webcrypto.randomUUID();
        this._offerId = offerId;
        this.localDescription = { type: 'offer', sdp: `offer:${offerId}` };
        const entry = rtcRegistry.get(offerId) || {};
        entry.offerer = this;
        rtcRegistry.set(offerId, entry);
        this.signalingState = 'have-local-offer';
        this._dispatchState();
      }

      Promise.resolve().then(() => {
        this.onicecandidate?.({ candidate: { candidate: 'fake-candidate' } });
        this.onicecandidate?.({ candidate: null });
      });
    }

    async setRemoteDescription(description) {
      this.remoteDescription = description;
      const offerId = parseOfferId(description);
      if (description.type === 'offer') {
        this._offerId = offerId;
        const entry = rtcRegistry.get(offerId) || {};
        entry.answerer = this;
        rtcRegistry.set(offerId, entry);
        this.signalingState = 'have-remote-offer';
      } else if (description.type === 'answer') {
        this._offerId = offerId;
        const entry = rtcRegistry.get(offerId) || {};
        entry.offerer = entry.offerer || this;
        rtcRegistry.set(offerId, entry);
        this.signalingState = 'stable';
        connectRtcPair(offerId);
      }
      this._dispatchState();
    }

    async addIceCandidate() {
      return;
    }

    close() {
      this.connectionState = 'closed';
      this.iceConnectionState = 'closed';
      this.signalingState = 'closed';
      this._dispatchState();
    }
  }

  window.RTCPeerConnection = FakeRTCPeerConnection;

  window.eval(appJs);

  return { window, document: window.document, dom, clipboardStore };
}

async function click(window, selector) {
  const el = window.document.querySelector(selector);
  if (!el) throw new Error(`No existe ${selector}`);
  el.click();
  await delay(0);
}

async function type(window, selector, value) {
  const el = window.document.querySelector(selector);
  if (!el) throw new Error(`No existe ${selector}`);
  el.value = value;
  el.dispatchEvent(new window.Event('input', { bubbles: true }));
  el.dispatchEvent(new window.Event('change', { bubbles: true }));
  await delay(0);
}

async function select(window, selector, value) {
  const el = window.document.querySelector(selector);
  if (!el) throw new Error(`No existe ${selector}`);
  el.value = value;
  el.dispatchEvent(new window.Event('change', { bubbles: true }));
  await delay(0);
}

async function main() {
  addCheck('Servidor JS existe', serverJs.includes('Mic Room listo en http://'), 'server.js cargado');
  addCheck('HTML carga Bootstrap local', /(\/|\.)vendor\/bootstrap\.min\.css/.test(html) && /(\/|\.)vendor\/bootstrap\.bundle\.min\.js/.test(html));
  addCheck('HTML incluye manifest PWA', html.includes('manifest.webmanifest'));
  addCheck('HTML incluye layout responsive Bootstrap', html.includes('container') && html.includes('accordion') && html.includes('col-12') && html.includes('glass-card'));

  const health = await fetch(`${BASE_URL}/api/health`).then((r) => r.json());
  addCheck('API health responde', health.ok === true, JSON.stringify(health));

  const manifest = await fetch(`${BASE_URL}/manifest.webmanifest`).then((r) => r.json());
  addCheck('Manifest PWA responde', manifest.name === 'Mic Room' && manifest.display === 'standalone');

  const swText = await fetch(`${BASE_URL}/sw.js`).then((r) => r.text());
  addCheck('Service worker responde', swText.includes('CACHE_NAME') && swText.includes("/app.js"));

  const localWindow = createWindow('Localhost', 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/130 Safari/537.36', 'http://localhost:3000');
  const pc = createWindow('PC', 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/130 Safari/537.36');
  const phone = createWindow('Telefono', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1');

  try {
    await waitFor(() => localWindow.window.__micRoomDebug?.snapshot?.(), { label: 'init localhost' });
    await waitFor(() => pc.window.__micRoomDebug?.snapshot?.(), { label: 'init PC' });
    await waitFor(() => phone.window.__micRoomDebug?.snapshot?.(), { label: 'init telefono' });

    await type(localWindow.window, '#roomKey', 'prueba-lan');
    await waitFor(() => localWindow.window.__micRoomDebug.snapshot().qrVisible, { label: 'QR localhost visible' });
    const localSnap = localWindow.window.__micRoomDebug.snapshot();
    if (localSnap.networkInfo?.suggestedOrigins?.length) {
      const localShareHost = new URL(localSnap.qrLinkPreview).hostname;
      addCheck(
        'Si abres en localhost, el enlace compartido cambia a IP local',
        localShareHost !== 'localhost' && localShareHost === new URL(localSnap.networkInfo.suggestedOrigins[0].origin).hostname,
        localSnap.qrLinkPreview,
      );
    } else {
      addWarning('No había IP local detectable para validar el reemplazo automático de localhost por IP.');
    }

    const pcInit = pc.window.__micRoomDebug.snapshot();
    const phoneInit = phone.window.__micRoomDebug.snapshot();
    addCheck('App inicializa en ambos entornos', pcInit.joined === false && phoneInit.joined === false && pcInit.modeChosen === false && phoneInit.modeChosen === false);

    await click(pc.window, '#deviceModeSenderBtn');
    await waitFor(() => pc.window.__micRoomDebug.snapshot().deviceMode === 'sender' && pc.window.__micRoomDebug.snapshot().modeChosen === true, { label: 'PC emisor seleccionado' });
    addCheck('El emisor se puede seleccionar', pc.window.__micRoomDebug.snapshot().lastToastMessage.includes('Emisor seleccionado'));

    await waitFor(() => pc.window.__micRoomDebug.snapshot().serviceWorkerController === true, { label: 'SW PC' });
    await waitFor(() => phone.window.__micRoomDebug.snapshot().serviceWorkerController === true, { label: 'SW telefono' });
    addCheck('Service worker se registra en entorno simulado', pc.window.__micRoomDebug.snapshot().serviceWorkerController === true && phone.window.__micRoomDebug.snapshot().serviceWorkerController === true);

    const roomKey = 'arena-demo-2026';
    await type(pc.window, '#roomKey', roomKey);
    await type(pc.window, '#displayName', 'PC emisor');
    await type(phone.window, '#roomKey', roomKey);
    await type(phone.window, '#displayName', 'Telefono receptor');

    await waitFor(() => pc.window.__micRoomDebug.snapshot().qrVisible, { label: 'QR visible' });
    const qrSnap = pc.window.__micRoomDebug.snapshot();
    addCheck('QR se genera al escribir clave', qrSnap.qrVisible === true && qrSnap.qrLinkPreview.includes('#k=arena-demo-2026'));
    addCheck('Huella de sala se calcula', qrSnap.roomFingerprint !== '—', qrSnap.roomFingerprint);
    addCheck('El enlace compartido deja listo al receptor', qrSnap.qrLinkPreview.includes('mode=receiver'));

    await click(pc.window, '#copyLinkBtn');
    await waitFor(() => pc.clipboardStore.text.includes('#k=arena-demo-2026'), { label: 'copiado de enlace' });
    addCheck('Copiar enlace funciona', pc.clipboardStore.text.includes('#k=arena-demo-2026'), pc.clipboardStore.text);

    await select(pc.window, '#senderTarget', 'bluetooth-local');
    await waitFor(() => pc.window.__micRoomDebug.snapshot().senderTarget === 'bluetooth-local', { label: 'selector bluetooth local' });
    await click(pc.window, '#selectBtOutputBtn');
    addCheck('Selector de salida Bluetooth actualiza la salida', pc.window.document.querySelector('#outputSelect').value === 'spk-1');

    await click(pc.window, '#localStartBtn');
    await waitFor(() => pc.window.__micRoomDebug.snapshot().localPlaybackActive === true, { label: 'modo local activo' });
    addCheck('Modo local simple inicia sin sala', pc.window.__micRoomDebug.snapshot().localPlaybackActive === true);
    await click(pc.window, '#localStopBtn');
    await waitFor(() => pc.window.__micRoomDebug.snapshot().localPlaybackActive === false, { label: 'modo local detenido' });
    addCheck('Modo local simple se detiene', pc.window.__micRoomDebug.snapshot().localPlaybackActive === false);

    await select(pc.window, '#senderTarget', 'pc-wifi');
    await waitFor(() => pc.window.__micRoomDebug.snapshot().senderTarget === 'pc-wifi', { label: 'selector PC wifi' });
    await click(phone.window, '#deviceModeReceiverBtn');
    await waitFor(() => phone.window.__micRoomDebug.snapshot().deviceMode === 'receiver' && phone.window.__micRoomDebug.snapshot().modeChosen === true, { label: 'telefono receptor' });
    addCheck('El receptor se puede seleccionar', phone.window.__micRoomDebug.snapshot().lastToastMessage.includes('Receptor seleccionado'));

    await click(pc.window, '#connectBtn');
    await waitFor(() => pc.window.__micRoomDebug.snapshot().joined === true, { label: 'PC entra a sala' });
    addCheck('El emisor queda esperando al receptor', pc.window.__micRoomDebug.snapshot().statusText.includes('esperando receptor'), pc.window.__micRoomDebug.snapshot().statusText);

    await click(phone.window, '#connectBtn');
    await waitFor(() => phone.window.__micRoomDebug.snapshot().joined === true, { label: 'Telefono entra a sala' });
    addCheck('Ambos dispositivos entran a la sala', true);
    addCheck('El receptor usa flujo separado', phone.window.__micRoomDebug.snapshot().connectButtonLabel === 'Conectar como receptor');

    await waitFor(() => pc.window.__micRoomDebug.snapshot().peers.length > 0, { label: 'receptor aparece en lista del emisor' });
    addCheck('El emisor ve al receptor conectado', pc.window.__micRoomDebug.snapshot().peerSummaryText.toLowerCase().includes('receptor'));

    await click(pc.window, '#startMicBtn');
    await waitFor(() => pc.window.__micRoomDebug.snapshot().localTrack?.readyState === 'live', { label: 'microfono live' });
    addCheck('Micrófono local arranca', true);

    await waitFor(() => {
      const s = pc.window.__micRoomDebug.snapshot();
      return s.peers.length > 0 && s.peers.every((peer) => peer.connectionState === 'connected');
    }, { timeout: 15000, label: 'WebRTC conectado emisor' });
    await waitFor(() => {
      const s = phone.window.__micRoomDebug.snapshot();
      return s.peers.length > 0 && s.peers.every((peer) => peer.connectionState === 'connected');
    }, { timeout: 15000, label: 'WebRTC conectado receptor' });
    addCheck('WebRTC conecta ambos peers', true);

    await waitFor(() => {
      const s = phone.window.__micRoomDebug.snapshot();
      return s.peers.some((peer) => peer.remoteAudioHasStream && peer.remoteAudioTrackCount >= 1);
    }, { timeout: 10000, label: 'audio remoto receptor' });
    addCheck('El receptor recibe stream remoto', true, JSON.stringify(phone.window.__micRoomDebug.snapshot().peers));

    await select(pc.window, '#qualityPreset', 'high');
    await waitFor(() => {
      const s = pc.window.__micRoomDebug.snapshot();
      return s.bitrateKbps === 72 && s.peers.some((peer) => peer.senderMaxBitrate === 72000);
    }, { timeout: 10000, label: 'bitrate alto aplicado' });
    addCheck('Calidad alta aplica bitrate 72 kbps', true);

    await select(pc.window, '#qualityPreset', 'custom');
    const bitrateRange = pc.window.document.querySelector('#bitrateRange');
    bitrateRange.value = '80';
    bitrateRange.dispatchEvent(new pc.window.Event('input', { bubbles: true }));
    bitrateRange.dispatchEvent(new pc.window.Event('change', { bubbles: true }));
    await waitFor(() => {
      const s = pc.window.__micRoomDebug.snapshot();
      return s.bitrateKbps === 80 && s.peers.some((peer) => peer.senderMaxBitrate === 80000);
    }, { timeout: 10000, label: 'bitrate custom 80 aplicado' });
    addCheck('Calidad personalizada aplica bitrate 80 kbps', true);

    await select(pc.window, '#talkMode', 'push-to-talk');
    await waitFor(() => {
      const s = pc.window.__micRoomDebug.snapshot();
      return s.talkMode === 'push-to-talk' && s.localTrack && s.localTrack.enabled === false;
    }, { timeout: 10000, label: 'ptt suelto silenciado' });
    addCheck('Push-to-talk silencia al soltar', true);

    const pttButton = pc.window.document.querySelector('#pttButton');
    pttButton.dispatchEvent(new pc.window.PointerEvent('pointerdown', { bubbles: true }));
    await waitFor(() => {
      const s = pc.window.__micRoomDebug.snapshot();
      return s.pttPressed === true && s.localTrack && s.localTrack.enabled === true;
    }, { timeout: 10000, label: 'ptt pulsado activo' });
    addCheck('Push-to-talk activa el track al pulsar', true);

    pttButton.dispatchEvent(new pc.window.PointerEvent('pointerup', { bubbles: true }));
    await waitFor(() => {
      const s = pc.window.__micRoomDebug.snapshot();
      return s.pttPressed === false && s.localTrack && s.localTrack.enabled === false;
    }, { timeout: 10000, label: 'ptt suelto' });
    addCheck('Push-to-talk vuelve a silenciar al soltar', true);

    pc.window.dispatchEvent(new pc.window.KeyboardEvent('keydown', { code: 'Space', bubbles: true }));
    await waitFor(() => pc.window.__micRoomDebug.snapshot().localTrack.enabled === true, { timeout: 10000, label: 'PTT tecla espacio down' });
    pc.window.dispatchEvent(new pc.window.KeyboardEvent('keyup', { code: 'Space', bubbles: true }));
    await waitFor(() => pc.window.__micRoomDebug.snapshot().localTrack.enabled === false, { timeout: 10000, label: 'PTT tecla espacio up' });
    addCheck('Push-to-talk funciona con barra espaciadora', true);

    await click(pc.window, '#localMonitorCheckbox');
    addCheck('Monitoreo local se activa', pc.window.__micRoomDebug.snapshot().localMonitorActive === true);

    await click(pc.window, '#disconnectBtn');
    await click(phone.window, '#disconnectBtn');
    await waitFor(() => pc.window.__micRoomDebug.snapshot().joined === false, { label: 'PC sale de sala' });
    await waitFor(() => phone.window.__micRoomDebug.snapshot().joined === false, { label: 'Telefono sale de sala' });
    addCheck('Salida limpia de la sala', true);

    addWarning('Bluetooth real no se puede probar dentro de este sandbox porque no hay acceso a hardware Bluetooth.');
    addWarning('La instalación completa en Android/iPhone depende del navegador y del sistema operativo reales; aquí validé manifest, service worker, assets PWA y lógica de UI.');
  } finally {
    localWindow.window.close();
    pc.window.close();
    phone.window.close();
  }
}

main()
  .catch((error) => {
    addError('Ejecución general', error);
    process.exitCode = 1;
  })
  .finally(() => {
    report.finishedAt = new Date().toISOString();
    const passed = report.checks.filter((c) => c.pass).length;
    const failed = report.checks.filter((c) => !c.pass).length;
    report.summary = { passed, failed, warnings: report.warnings.length, errors: report.errors.length };
    fs.writeFileSync(path.join(OUT_DIR, 'report.json'), JSON.stringify(report, null, 2));
    fs.writeFileSync(path.join(OUT_DIR, 'report.md'), [
      '# Reporte de pruebas de Mic Room',
      '',
      `- URL base: ${report.baseUrl}`,
      `- Inicio: ${report.startedAt}`,
      `- Fin: ${report.finishedAt}`,
      `- Checks OK: ${passed}`,
      `- Checks fallidos: ${failed}`,
      `- Advertencias: ${report.warnings.length}`,
      '',
      '## Resultados',
      ...report.checks.map((c) => `- ${c.pass ? '✅' : '❌'} **${c.name}**${c.details ? ` — ${c.details}` : ''}`),
      '',
      '## Advertencias',
      ...(report.warnings.length ? report.warnings.map((w) => `- ⚠️ ${w}`) : ['- Ninguna']),
      '',
      '## Errores',
      ...(report.errors.length ? report.errors.map((e) => `- ❌ **${e.name}**\n\n  ${e.details.replace(/\n/g, '\n  ')}`) : ['- Ninguno']),
    ].join('\n'));
  });
