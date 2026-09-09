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

function createWindow(label, userAgent, baseUrl = BASE_URL, options = {}) {
  const {
    supportDirectOutputPicker = true,
    supportSinkChange = true,
    supportRtc = true,
    outputLabel = `${label} Salida`,
    selectedOutputLabel = `${label} Bluetooth`,
  } = options;

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
  if (supportSinkChange) {
    window.HTMLMediaElement.prototype.setSinkId = async function setSinkId(value) {
      this.sinkId = value;
    };
  } else {
    delete window.HTMLMediaElement.prototype.setSinkId;
  }

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
    async resume() { this.state = 'running'; }
    async close() { this.state = 'closed'; }
  }
  if (supportSinkChange) {
    FakeAudioContext.prototype.setSinkId = async function setSinkId(value) { this.sinkId = value; };
  }

  window.AudioContext = FakeAudioContext;
  window.webkitAudioContext = FakeAudioContext;

  const deviceListeners = new Set();
  Object.defineProperty(window.navigator, 'mediaDevices', {
    value: {
      async enumerateDevices() {
        return [
          { kind: 'audioinput', deviceId: 'mic-1', label: `${label} Micrófono` },
          { kind: 'audiooutput', deviceId: 'spk-1', label: outputLabel },
        ];
      },
      async getUserMedia() {
        return new FakeMediaStream([new FakeMediaStreamTrack('audio')]);
      },
      ...(supportDirectOutputPicker ? {
        async selectAudioOutput() {
          return { deviceId: 'spk-1', label: selectedOutputLabel };
        },
      } : {}),
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

  if (supportRtc) {
    window.RTCPeerConnection = FakeRTCPeerConnection;
  } else {
    delete window.RTCPeerConnection;
  }

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

  const phone = createWindow(
    'Telefono',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1',
    BASE_URL,
    {
      supportDirectOutputPicker: true,
      supportSinkChange: true,
      supportRtc: true,
      outputLabel: 'Parlante Bluetooth del teléfono',
      selectedOutputLabel: 'Parlante Bluetooth del teléfono',
    },
  );

  const limitedPhone = createWindow(
    'TelefonoSistema',
    'Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 Chrome/130 Mobile Safari/537.36',
    BASE_URL,
    {
      supportDirectOutputPicker: false,
      supportSinkChange: false,
      supportRtc: false,
      outputLabel: 'Parlante Bluetooth del sistema',
      selectedOutputLabel: 'Parlante Bluetooth del sistema',
    },
  );

  try {
    await waitFor(() => phone.window.__micRoomDebug?.snapshot?.(), { label: 'init telefono principal' });
    await waitFor(() => limitedPhone.window.__micRoomDebug?.snapshot?.(), { label: 'init telefono sin selector' });
    await waitFor(() => phone.window.__micRoomDebug.snapshot().serviceWorkerController === true, { label: 'SW telefono principal' });
    await waitFor(() => limitedPhone.window.__micRoomDebug.snapshot().serviceWorkerController === true, { label: 'SW telefono sin selector' });

    const phoneInit = phone.window.__micRoomDebug.snapshot();
    addCheck(
      'App arranca fija en modo Bluetooth local',
      phoneInit.bluetoothOnlyMode === true && phoneInit.modeChosen === true && phoneInit.deviceMode === 'sender' && phoneInit.senderTarget === 'bluetooth-local',
      JSON.stringify({ modeChosen: phoneInit.modeChosen, deviceMode: phoneInit.deviceMode, senderTarget: phoneInit.senderTarget }),
    );
    addCheck(
      'Se ocultan funciones de sala y receptor',
      phoneInit.shareBlockVisible === false && phoneInit.roomSendControlsVisible === false && phoneInit.roomMicControlsVisible === false && phoneInit.peersSectionVisible === false && phoneInit.logSectionVisible === false,
    );
    addCheck(
      'Siguen visibles los controles útiles para Bluetooth',
      phoneInit.outputCardVisible === true
        && !phone.window.document.querySelector('#senderSettingsCard').classList.contains('d-none')
        && !phone.window.document.querySelector('#localModeControls').classList.contains('d-none'),
    );
    addCheck(
      'Service worker se registra en entorno simulado',
      phone.window.__micRoomDebug.snapshot().serviceWorkerController === true && limitedPhone.window.__micRoomDebug.snapshot().serviceWorkerController === true,
    );

    await click(phone.window, '#selectBtOutputBtn');
    await waitFor(() => phone.window.document.querySelector('#outputSelect').value === 'spk-1', { label: 'salida bluetooth elegida' });
    addCheck('Selector directo de Bluetooth actualiza la salida', phone.window.document.querySelector('#outputSelect').value === 'spk-1');
    addCheck('Selector directo deja el nombre del parlante', phone.window.document.querySelector('#localOutputStatus').textContent.includes('Parlante Bluetooth del teléfono'));

    await click(phone.window, '#localStartBtn');
    await waitFor(() => phone.window.__micRoomDebug.snapshot().localPlaybackActive === true, { label: 'modo local continuo activo' });
    addCheck('Micrófono Bluetooth continuo inicia', phone.window.__micRoomDebug.snapshot().localPlaybackActive === true);
    addCheck('Micrófono continuo deja el track habilitado', phone.window.__micRoomDebug.snapshot().localTrack?.enabled === true);

    await click(phone.window, '#localStopBtn');
    await waitFor(() => phone.window.__micRoomDebug.snapshot().localPlaybackActive === false, { label: 'modo local continuo detenido' });
    addCheck('Micrófono Bluetooth continuo se detiene', phone.window.__micRoomDebug.snapshot().localPlaybackActive === false);

    const localPttButton = phone.window.document.querySelector('#localPttBtn');
    localPttButton.dispatchEvent(new phone.window.PointerEvent('pointerdown', { bubbles: true }));
    await waitFor(() => {
      const s = phone.window.__micRoomDebug.snapshot();
      return s.localPlaybackActive === true && s.localPttActive === true && s.localTrack?.enabled === true;
    }, { timeout: 10000, label: 'local ptt activo telefono' });
    addCheck('Pulsa para hablar Bluetooth activa el micrófono al mantener pulsado', phone.window.__micRoomDebug.snapshot().localPttActive === true);

    localPttButton.dispatchEvent(new phone.window.PointerEvent('pointerup', { bubbles: true }));
    await waitFor(() => {
      const s = phone.window.__micRoomDebug.snapshot();
      return s.localPlaybackActive === false && s.localPttActive === false;
    }, { timeout: 10000, label: 'local ptt detenido telefono' });
    addCheck('Pulsa para hablar Bluetooth se detiene al soltar', phone.window.__micRoomDebug.snapshot().localPlaybackActive === false && phone.window.__micRoomDebug.snapshot().localPttActive === false);

    await select(phone.window, '#qualityPreset', 'high');
    await waitFor(() => phone.window.__micRoomDebug.snapshot().bitrateKbps === 72, { timeout: 10000, label: 'preset high local' });
    addCheck('Calidad alta actualiza el bitrate local a 72 kbps', phone.window.__micRoomDebug.snapshot().bitrateKbps === 72);

    await select(phone.window, '#qualityPreset', 'custom');
    const bitrateRange = phone.window.document.querySelector('#bitrateRange');
    bitrateRange.value = '80';
    bitrateRange.dispatchEvent(new phone.window.Event('input', { bubbles: true }));
    bitrateRange.dispatchEvent(new phone.window.Event('change', { bubbles: true }));
    await waitFor(() => phone.window.__micRoomDebug.snapshot().bitrateKbps === 80, { timeout: 10000, label: 'preset custom 80 local' });
    addCheck('Calidad personalizada actualiza el bitrate local a 80 kbps', phone.window.__micRoomDebug.snapshot().bitrateKbps === 80);

    const gain = phone.window.document.querySelector('#filterGain');
    gain.value = '125';
    gain.dispatchEvent(new phone.window.Event('input', { bubbles: true }));
    await waitFor(() => phone.window.__micRoomDebug.snapshot().filterSettings.gain === 125, { timeout: 10000, label: 'ganancia 125 local' });
    addCheck('Los filtros de audio siguen disponibles en modo Bluetooth', phone.window.__micRoomDebug.snapshot().filterSettings.gain === 125);

    const limitedInit = limitedPhone.window.__micRoomDebug.snapshot();
    addCheck(
      'Sin selector directo, el botón queda desactivado y no obliga a WebRTC',
      limitedInit.directOutputPickerEnabled === false && limitedInit.selectBtOutputDisabled === true && limitedInit.bluetoothOnlyMode === true,
    );
    addCheck(
      'Sin soporte de cambio de salida, muestra instrucción de usar Bluetooth del sistema',
      /sistema del tel[eé]fono|salida multimedia/i.test(limitedInit.localOutputStatus),
      limitedInit.localOutputStatus,
    );

    const limitedPttButton = limitedPhone.window.document.querySelector('#localPttBtn');
    limitedPttButton.dispatchEvent(new limitedPhone.window.PointerEvent('pointerdown', { bubbles: true }));
    await waitFor(() => {
      const s = limitedPhone.window.__micRoomDebug.snapshot();
      return s.localPlaybackActive === true && s.localPttActive === true && s.localTrack?.enabled === true;
    }, { timeout: 10000, label: 'local ptt activo telefono sin selector' });
    addCheck('El Bluetooth local funciona aunque el navegador no deje elegir la salida', limitedPhone.window.__micRoomDebug.snapshot().localPttActive === true);

    limitedPttButton.dispatchEvent(new limitedPhone.window.PointerEvent('pointerup', { bubbles: true }));
    await waitFor(() => {
      const s = limitedPhone.window.__micRoomDebug.snapshot();
      return s.localPlaybackActive === false && s.localPttActive === false;
    }, { timeout: 10000, label: 'local ptt detenido telefono sin selector' });
    addCheck('El Bluetooth local también se detiene correctamente en navegadores limitados', limitedPhone.window.__micRoomDebug.snapshot().localPlaybackActive === false);

    addWarning('Bluetooth real no se puede probar dentro de este sandbox porque no hay acceso a hardware Bluetooth.');
    addWarning('La salida Bluetooth final en el teléfono depende del navegador móvil y del sistema operativo reales; aquí validé la lógica, la UI y el fallback de salida por sistema.');
  } finally {
    phone.window.close();
    limitedPhone.window.close();
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
