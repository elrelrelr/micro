const els = {
  deviceModeSenderBtn: document.getElementById('deviceModeSenderBtn'),
  deviceModeReceiverBtn: document.getElementById('deviceModeReceiverBtn'),
  senderModePanel: document.getElementById('senderModePanel'),
  receiverModePanel: document.getElementById('receiverModePanel'),
  toastContainer: document.getElementById('toastContainer'),
  deviceModeHint: document.getElementById('deviceModeHint'),
  roomProgressText: document.getElementById('roomProgressText'),
  connectionCardTitle: document.getElementById('connectionCardTitle'),
  connectionCardHint: document.getElementById('connectionCardHint'),
  senderTargetBlock: document.getElementById('senderTargetBlock'),
  senderTarget: document.getElementById('senderTarget'),
  senderTargetHint: document.getElementById('senderTargetHint'),
  bluetoothOnlyNote: document.getElementById('bluetoothOnlyNote'),
  roomJoinBlock: document.getElementById('roomJoinBlock'),
  roomKey: document.getElementById('roomKey'),
  displayName: document.getElementById('displayName'),
  roomRole: document.getElementById('roomRole'),
  roomModeHint: document.getElementById('roomModeHint'),
  connectBtn: document.getElementById('connectBtn'),
  disconnectBtn: document.getElementById('disconnectBtn'),
  shareBlock: document.getElementById('shareBlock'),
  senderSettingsCard: document.getElementById('senderSettingsCard'),
  outputCard: document.getElementById('outputCard'),
  outputCardTitle: document.getElementById('outputCardTitle'),
  outputCardHint: document.getElementById('outputCardHint'),
  receiverOutputActions: document.getElementById('receiverOutputActions'),
  localModeControls: document.getElementById('localModeControls'),
  roomSendControlsCard: document.getElementById('roomSendControlsCard'),
  startMicBtn: document.getElementById('startMicBtn'),
  stopMicBtn: document.getElementById('stopMicBtn'),
  unlockAudioBtn: document.getElementById('unlockAudioBtn'),
  localStartBtn: document.getElementById('localStartBtn'),
  localStopBtn: document.getElementById('localStopBtn'),
  selectBtOutputBtn: document.getElementById('selectBtOutputBtn'),
  localModeStatus: document.getElementById('localModeStatus'),
  localOutputStatus: document.getElementById('localOutputStatus'),
  randomKeyBtn: document.getElementById('randomKeyBtn'),
  copyLinkBtn: document.getElementById('copyLinkBtn'),
  copyQrLinkBtn: document.getElementById('copyQrLinkBtn'),
  shareQrBtn: document.getElementById('shareQrBtn'),
  shareQrSecondaryBtn: document.getElementById('shareQrSecondaryBtn'),
  clearLogBtn: document.getElementById('clearLogBtn'),
  installBtn: document.getElementById('installBtn'),
  installStatus: document.getElementById('installStatus'),
  inputSelect: document.getElementById('inputSelect'),
  outputSelect: document.getElementById('outputSelect'),
  localMonitorCheckbox: document.getElementById('localMonitorCheckbox'),
  localMonitor: document.getElementById('localMonitor'),
  statusText: document.getElementById('statusText'),
  roomFingerprint: document.getElementById('roomFingerprint'),
  qrBox: document.getElementById('qrBox'),
  qrLinkPreview: document.getElementById('qrLinkPreview'),
  qualityPreset: document.getElementById('qualityPreset'),
  bitrateRange: document.getElementById('bitrateRange'),
  bitrateValue: document.getElementById('bitrateValue'),
  qualityHint: document.getElementById('qualityHint'),
  talkMode: document.getElementById('talkMode'),
  pttButton: document.getElementById('pttButton'),
  pttState: document.getElementById('pttState'),
  pttHint: document.getElementById('pttHint'),
  filterGain: document.getElementById('filterGain'),
  filterBass: document.getElementById('filterBass'),
  filterPresence: document.getElementById('filterPresence'),
  filterTreble: document.getElementById('filterTreble'),
  filterGainValue: document.getElementById('filterGainValue'),
  filterBassValue: document.getElementById('filterBassValue'),
  filterPresenceValue: document.getElementById('filterPresenceValue'),
  filterTrebleValue: document.getElementById('filterTrebleValue'),
  meterText: document.getElementById('meterText'),
  meterBar: document.getElementById('meterBar'),
  peerSummaryText: document.getElementById('peerSummaryText'),
  peersList: document.getElementById('peersList'),
  logBox: document.getElementById('logBox'),
};

const QUALITY_PRESETS = {
  low: { bitrateKbps: 24, description: 'Prioriza ahorro de red y voz clara para redes flojas.' },
  balanced: { bitrateKbps: 48, description: 'Buena calidad para voz con latencia razonable.' },
  high: { bitrateKbps: 72, description: 'Más detalle en la voz, ideal si la red está estable.' },
  max: { bitrateKbps: 96, description: 'Muy alta calidad para LAN o Wi‑Fi muy buena.' },
};

const state = {
  serverOrigin: getInitialServerOrigin(),
  shareOrigin: window.location.origin,
  shareableRoomLink: window.location.href,
  networkInfo: null,
  networkInfoLogged: false,
  joined: false,
  roomKey: '',
  roomId: '',
  roomRole: '',
  deviceMode: '',
  modeChosen: false,
  rolePanelOpen: '',
  senderTarget: 'pc-wifi',
  peerId: crypto.randomUUID(),
  displayName: '',
  eventSource: null,
  peers: new Map(),
  localPlaybackActive: false,
  roomSendActive: false,
  talkMode: 'always-on',
  pttPressed: false,
  preferredSinkId: 'default',
  selectedOutputLabel: 'Salida del sistema',
  deferredInstallPrompt: null,
  qrDataUrl: '',
  previewToken: 0,
  rawStream: null,
  processedStream: null,
  rawTrack: null,
  localTrack: null,
  processingContext: null,
  sourceNode: null,
  analyserNode: null,
  meterTimer: null,
  filterNodes: null,
  monitorConnected: false,
  lastToastMessage: '',
};

function log(message, level = 'info') {
  const stamp = new Date().toLocaleTimeString();
  const prefix = level === 'error' ? '⛔' : level === 'warn' ? '⚠️' : level === 'success' ? '✅' : '•';
  els.logBox.textContent += `[${stamp}] ${prefix} ${message}\n`;
  els.logBox.scrollTop = els.logBox.scrollHeight;
}

function setRoomStatus(text) {
  els.statusText.textContent = text;
  els.statusText.className = 'badge rounded-pill border';
  const normalized = String(text || '').toLowerCase();
  if (/(conectado|recibiendo|hablando|activo|listo)/.test(normalized)) {
    els.statusText.classList.add('text-bg-success');
  } else if (/(conectando|esperando|preparando)/.test(normalized)) {
    els.statusText.classList.add('text-bg-warning', 'text-dark');
  } else if (normalized.includes('error') || normalized.includes('interrumpida') || normalized.includes('compatible')) {
    els.statusText.classList.add('text-bg-danger');
  } else {
    els.statusText.classList.add('text-bg-dark', 'border-secondary-subtle');
  }
}

function setLocalStatus(text, theme = 'secondary') {
  els.localModeStatus.textContent = text;
  els.localModeStatus.className = `alert alert-${theme} border-0 mb-0 status-panel`;
}

function setInstallStatus(text, extraClass = 'text-body-secondary') {
  els.installStatus.textContent = text;
  els.installStatus.className = `small ${extraClass}`;
}

function showToast(message, tone = 'success') {
  if (!els.toastContainer || !message) return;
  state.lastToastMessage = String(message);
  const toast = document.createElement('div');
  toast.className = `mini-toast ${tone}`;
  toast.textContent = message;
  els.toastContainer.appendChild(toast);
  window.setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-4px)';
  }, 2600);
  window.setTimeout(() => toast.remove(), 3000);
}

function setMeter(percent, text) {
  const clamped = Math.max(0, Math.min(100, Number(percent) || 0));
  els.meterBar.style.width = `${clamped}%`;
  els.meterBar.className = 'progress-bar progress-bar-striped progress-bar-animated';
  if (clamped > 75) els.meterBar.classList.add('bg-danger');
  else if (clamped > 45) els.meterBar.classList.add('bg-warning');
  else els.meterBar.classList.add('bg-success');
  if (text) els.meterText.textContent = text;
}

function shortId(value) {
  return value ? `${value.slice(0, 6)}…${value.slice(-4)}` : '—';
}

function sanitizeName(name) {
  return (name || '').trim().slice(0, 80) || `Dispositivo ${state.peerId.slice(0, 4)}`;
}

function isSenderMode() {
  return state.deviceMode === 'sender';
}

function isReceiverMode() {
  return state.deviceMode === 'receiver';
}

function getSenderTargetMeta(target = state.senderTarget) {
  if (target === 'bluetooth-local') {
    return {
      id: 'bluetooth-local',
      label: 'parlante o audífonos Bluetooth de este mismo dispositivo',
      shortLabel: 'Bluetooth local',
      requiresRoom: false,
      shareRx: '',
    };
  }
  if (target === 'phone-wifi') {
    return {
      id: 'phone-wifi',
      label: 'otro teléfono por la misma red Wi‑Fi',
      shortLabel: 'otro teléfono',
      requiresRoom: true,
      shareRx: 'phone',
    };
  }
  return {
    id: 'pc-wifi',
    label: 'un PC por la misma red Wi‑Fi',
    shortLabel: 'PC',
    requiresRoom: true,
    shareRx: 'pc',
  };
}

function isWifiTarget(target = state.senderTarget) {
  return getSenderTargetMeta(target).requiresRoom;
}

function isBluetoothTarget(target = state.senderTarget) {
  return !isWifiTarget(target);
}

function setVisible(el, visible) {
  if (!el) return;
  el.classList.toggle('d-none', !visible);
}

function getInitialServerOrigin() {
  const raw = new URLSearchParams(window.location.search).get('signal');
  if (!raw) return window.location.origin;
  try {
    return new URL(raw).origin;
  } catch {
    return window.location.origin;
  }
}

function syncSignalQuery(url) {
  if (!url) return;
  if (state.serverOrigin && state.serverOrigin !== window.location.origin) {
    url.searchParams.set('signal', state.serverOrigin);
  } else {
    url.searchParams.delete('signal');
  }
}

function parseHashState() {
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  return {
    key: params.get('k') || '',
    mode: params.get('mode') === 'receiver' ? 'receiver' : params.get('mode') === 'sender' ? 'sender' : '',
    rx: params.get('rx') === 'phone' ? 'phone-wifi' : params.get('rx') === 'pc' ? 'pc-wifi' : '',
  };
}

function buildHashParams({ forShare = false } = {}) {
  const params = new URLSearchParams();
  const key = els.roomKey.value.trim();
  if (key) params.set('k', key);

  if (forShare && state.modeChosen && isSenderMode() && isWifiTarget()) {
    params.set('mode', 'receiver');
    const rx = getSenderTargetMeta().shareRx;
    if (rx) params.set('rx', rx);
    return params;
  }

  if (state.modeChosen && state.deviceMode === 'receiver') {
    params.set('mode', 'receiver');
    const rx = getSenderTargetMeta().shareRx;
    if (rx) params.set('rx', rx);
  }

  return params;
}

function generateRandomKey() {
  return [crypto.randomUUID().slice(0, 4), crypto.randomUUID().slice(0, 4), crypto.randomUUID().slice(0, 4)].join('-');
}

async function sha256Hex(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function api(path, options = {}) {
  return fetch(`${state.serverOrigin}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  }).then(async (response) => {
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.ok === false) {
      throw new Error(data.error || `Error HTTP ${response.status}`);
    }
    return data;
  });
}

function isLocalhostHostname(hostname) {
  return ['localhost', '127.0.0.1', '::1', '[::1]'].includes(String(hostname || '').toLowerCase());
}

function getCurrentRoomLink() {
  const url = new URL(window.location.origin + window.location.pathname);
  syncSignalQuery(url);
  const params = buildHashParams();
  url.hash = params.toString();
  return url.toString();
}

function updateCurrentHashInHistory() {
  const url = new URL(window.location.href);
  syncSignalQuery(url);
  const params = buildHashParams();
  url.hash = params.toString();
  history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
}

async function getPreferredShareOrigin() {
  const currentUrl = new URL(window.location.href);
  if (!isLocalhostHostname(currentUrl.hostname)) {
    state.shareOrigin = currentUrl.origin;
    return state.shareOrigin;
  }

  if (state.networkInfo?.suggestedOrigins?.length) {
    state.shareOrigin = state.networkInfo.suggestedOrigins[0].origin;
    return state.shareOrigin;
  }

  try {
    const info = await api('/api/network-info', { method: 'GET' });
    state.networkInfo = info;
    if (info.suggestedOrigins?.length) {
      state.shareOrigin = info.suggestedOrigins[0].origin;
      if (!state.networkInfoLogged) {
        state.networkInfoLogged = true;
        log(`En tu teléfono usa esta base: ${state.shareOrigin}${window.location.pathname}`, 'warn');
      }
      return state.shareOrigin;
    }
  } catch (error) {
    log(`No pude detectar la IP local para compartir: ${error.message}`, 'warn');
  }

  state.shareOrigin = currentUrl.origin;
  return state.shareOrigin;
}

async function getShareableRoomLink() {
  const origin = await getPreferredShareOrigin();
  const url = new URL(origin + window.location.pathname);
  syncSignalQuery(url);
  const params = buildHashParams({ forShare: state.modeChosen && isSenderMode() && isWifiTarget() });
  url.hash = params.toString();
  state.shareableRoomLink = url.toString();
  return state.shareableRoomLink;
}

function applyHashKey() {
  const hash = parseHashState();
  if (hash.key && !els.roomKey.value.trim()) {
    els.roomKey.value = hash.key;
  }
  if (hash.mode === 'receiver') {
    state.modeChosen = true;
    state.deviceMode = 'receiver';
    state.roomRole = 'receiver';
    state.rolePanelOpen = 'receiver';
  }
  if (hash.rx) {
    state.senderTarget = hash.rx;
  }
}

function isStandaloneApp() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

function isTextInputTarget(target) {
  if (!target) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
}

function getBitrateKbps() {
  return Math.min(128, Math.max(16, Number(els.bitrateRange.value) || 48));
}

function getFilterSettings() {
  return {
    gain: Number(els.filterGain.value) || 100,
    bass: Number(els.filterBass.value) || 0,
    presence: Number(els.filterPresence.value) || 0,
    treble: Number(els.filterTreble.value) || 0,
  };
}

function updateFilterLabels() {
  const values = getFilterSettings();
  els.filterGainValue.textContent = `${values.gain}%`;
  els.filterBassValue.textContent = `${values.bass > 0 ? '+' : ''}${values.bass} dB`;
  els.filterPresenceValue.textContent = `${values.presence > 0 ? '+' : ''}${values.presence} dB`;
  els.filterTrebleValue.textContent = `${values.treble > 0 ? '+' : ''}${values.treble} dB`;
}

function applyFiltersToNodes() {
  updateFilterLabels();
  if (!state.filterNodes) return;
  const values = getFilterSettings();
  state.filterNodes.inputGain.gain.value = values.gain / 100;
  state.filterNodes.bass.gain.value = values.bass;
  state.filterNodes.presence.gain.value = values.presence;
  state.filterNodes.treble.gain.value = values.treble;
}

function syncBitrateUi() {
  const bitrate = getBitrateKbps();
  els.bitrateValue.textContent = `${bitrate} kbps`;
  if (els.qualityPreset.value === 'custom') {
    els.qualityHint.textContent = `Calidad personalizada: ${bitrate} kbps para adaptar voz y latencia a tu red.`;
    return;
  }
  els.qualityHint.textContent = (QUALITY_PRESETS[els.qualityPreset.value] || QUALITY_PRESETS.balanced).description;
}

function applyPresetSelection(presetKey) {
  const info = QUALITY_PRESETS[presetKey];
  if (!info) return;
  els.qualityPreset.value = presetKey;
  els.bitrateRange.value = String(info.bitrateKbps);
  syncBitrateUi();
}

function hasRemoteAudioActive() {
  return [...state.peers.values()].some((peer) => Boolean(peer.audio?.srcObject));
}

function setRolePanelExpanded(mode, expanded) {
  const isSender = mode === 'sender';
  const button = isSender ? els.deviceModeSenderBtn : els.deviceModeReceiverBtn;
  const panel = isSender ? els.senderModePanel : els.receiverModePanel;
  if (!button || !panel) return;
  button.classList.toggle('collapsed', !expanded);
  button.setAttribute('aria-expanded', expanded ? 'true' : 'false');
  panel.classList.toggle('show', expanded);
}

function updateModeButtonsVisual() {
  const senderActive = state.modeChosen && isSenderMode();
  const receiverActive = state.modeChosen && isReceiverMode();

  els.deviceModeSenderBtn.classList.toggle('active', senderActive);
  els.deviceModeReceiverBtn.classList.toggle('active', receiverActive);

  setRolePanelExpanded('sender', state.rolePanelOpen === 'sender');
  setRolePanelExpanded('receiver', state.rolePanelOpen === 'receiver');
}

function updatePeersEmptyState() {
  if (state.peers.size > 0) return;
  els.peersList.classList.add('empty-state', 'p-4', 'text-center');
  if (!state.modeChosen) {
    els.peersList.textContent = 'Primero selecciona si este dispositivo será emisor o receptor.';
    return;
  }
  if (isSenderMode() && isWifiTarget()) {
    els.peersList.textContent = state.joined
      ? 'Sala creada. Falta que el receptor abra el enlace y pulse “Conectar como receptor”.'
      : 'Cuando el receptor entre a la sala, aparecerá aquí.';
    return;
  }
  if (isReceiverMode()) {
    els.peersList.textContent = state.joined
      ? 'Receptor listo. Esperando que el emisor entre con la misma clave.'
      : 'Cuando te conectes como receptor, aquí aparecerá el emisor.';
    return;
  }
  els.peersList.textContent = 'Bluetooth local listo. Este modo no necesita otro dispositivo web.';
}

function updatePeerSummary() {
  if (!state.modeChosen) {
    els.peerSummaryText.textContent = 'Primero elige Emisor o Receptor.';
    updatePeersEmptyState();
    return;
  }
  if (isSenderMode() && isBluetoothTarget()) {
    els.peerSummaryText.textContent = 'Bluetooth local: este modo no necesita que otro dispositivo abra la web.';
    updatePeersEmptyState();
    return;
  }
  if (!state.joined) {
    els.peerSummaryText.textContent = isReceiverMode()
      ? 'Conecta este receptor con la misma clave del emisor.'
      : 'Aquí verás cuándo el receptor ya está listo.';
    updatePeersEmptyState();
    return;
  }
  if (state.peers.size === 0) {
    els.peerSummaryText.textContent = isReceiverMode()
      ? 'Receptor conectado. Aún falta que entre el emisor.'
      : 'Sala conectada. Aún falta que entre el receptor.';
    updatePeersEmptyState();
    return;
  }
  if (isReceiverMode()) {
    els.peerSummaryText.textContent = hasRemoteAudioActive()
      ? `Audio recibiéndose desde ${state.peers.size} dispositivo(s).`
      : `Emisor detectado (${state.peers.size}). Esperando que active el micrófono.`;
    return;
  }
  els.peerSummaryText.textContent = state.roomSendActive
    ? `Enviando audio a ${state.peers.size} dispositivo(s).`
    : `Receptor detectado (${state.peers.size}). Ya puedes hablar.`;
}

function refreshPrimaryStatus() {
  let status = 'elige rol';
  let progress = 'Selecciona Emisor o Receptor para ver el siguiente paso.';

  if (!state.modeChosen) {
    setRoomStatus(status);
    els.roomProgressText.textContent = progress;
    return;
  }

  if (isSenderMode() && isBluetoothTarget()) {
    status = state.localPlaybackActive ? 'bluetooth activo' : 'listo para bluetooth';
    progress = state.localPlaybackActive
      ? 'Bluetooth local activo. Tu voz ya sale por la salida elegida.'
      : 'Empareja Bluetooth, elige la salida y pulsa “Hablar por Bluetooth”.';
  } else if (!state.joined) {
    status = isReceiverMode() ? 'receptor pendiente' : 'sala pendiente';
    progress = isReceiverMode()
      ? 'Escribe la clave del emisor y pulsa “Conectar como receptor”.'
      : 'Elige el destino, escribe una clave y crea la sala.';
  } else if (state.peers.size === 0) {
    status = isReceiverMode() ? 'esperando emisor' : 'esperando receptor';
    progress = isReceiverMode()
      ? 'Receptor listo. Esperando que el emisor entre con la misma clave.'
      : 'Sala lista. Esperando que el receptor aparezca en la lista.';
  } else if (isReceiverMode()) {
    status = hasRemoteAudioActive() ? 'recibiendo audio' : 'emisor conectado';
    progress = hasRemoteAudioActive()
      ? 'Audio entrando en este receptor.'
      : 'El emisor ya está conectado. Falta que active su micrófono.';
  } else if (state.roomSendActive) {
    status = state.talkMode === 'push-to-talk' && !state.pttPressed ? 'listo para hablar' : 'hablando';
    progress = state.talkMode === 'push-to-talk' && !state.pttPressed
      ? 'La sala está lista. Mantén pulsado “Hablar ahora” para transmitir.'
      : 'Micrófono activo. El receptor debería oírte casi en tiempo real.';
  } else {
    status = 'receptor conectado';
    progress = 'El receptor ya apareció en la lista. Ahora puedes hablar.';
  }

  setRoomStatus(status);
  els.roomProgressText.textContent = progress;
}

function renderWorkflowMode() {
  const sender = state.modeChosen && isSenderMode();
  const receiver = state.modeChosen && isReceiverMode();
  const wifiTarget = sender && isWifiTarget();
  const bluetoothTarget = sender && isBluetoothTarget();
  const targetMeta = getSenderTargetMeta();

  updateModeButtonsVisual();
  setVisible(els.senderTargetBlock, sender);
  setVisible(els.senderSettingsCard, sender);
  setVisible(els.roomSendControlsCard, state.modeChosen);
  setVisible(els.outputCard, receiver || bluetoothTarget);
  setVisible(els.receiverOutputActions, receiver);
  setVisible(els.localModeControls, bluetoothTarget);
  setVisible(els.roomJoinBlock, receiver || wifiTarget);
  setVisible(els.shareBlock, wifiTarget);
  setVisible(els.bluetoothOnlyNote, bluetoothTarget);

  if (!state.modeChosen) {
    els.connectionCardTitle.textContent = 'Conexión';
    els.connectionCardHint.textContent = 'Primero elige Emisor o Receptor arriba.';
    els.deviceModeHint.innerHTML = 'Primero toca una de las dos opciones de arriba.';
    updatePeerSummary();
    refreshPrimaryStatus();
    updateButtons();
    updatePttUi();
    return;
  }

  els.connectionCardTitle.textContent = receiver ? 'Conectarte como receptor' : 'Elegir receptor y conexión';
  els.connectionCardHint.textContent = receiver
    ? 'Aquí el receptor solo pone la clave, se conecta y elige por dónde escuchar.'
    : bluetoothTarget
      ? 'Vas a usar este mismo dispositivo con Bluetooth o con su salida local. No necesitas sala.'
      : `El emisor enviará audio a ${targetMeta.label}.`;

  if (sender) {
    els.deviceModeHint.innerHTML = bluetoothTarget
      ? 'Emisor seleccionado. El sonido saldrá por un <strong>parlante o audífono Bluetooth</strong> en este mismo dispositivo.'
      : `Emisor seleccionado. El audio saldrá en <strong>${targetMeta.shortLabel}</strong> por la misma red.`;
    els.senderTargetHint.innerHTML = targetMeta.id === 'pc-wifi'
      ? 'El <strong>PC receptor</strong> puede sonar por sus parlantes normales o por audífonos Bluetooth emparejados con ese PC.'
      : targetMeta.id === 'phone-wifi'
        ? 'El <strong>otro teléfono receptor</strong> entra por la misma red y también puede sacar el audio por Bluetooth en ese teléfono.'
        : 'No necesitas clave ni QR. Solo empareja Bluetooth, elige la salida y habla.';
  } else {
    els.deviceModeHint.innerHTML = 'Receptor seleccionado. Aquí no configuras micrófono: solo te conectas y eliges la salida de audio.';
  }

  if (receiver) {
    els.outputCardTitle.textContent = 'Salida del receptor';
    els.outputCardHint.textContent = 'Elige por dónde se oirá el audio. En PC o en otro teléfono puedes sacar el sonido por Bluetooth si ese receptor lo tiene emparejado.';
    els.roomModeHint.innerHTML = !state.joined
      ? 'Escribe la misma clave del emisor y pulsa <strong>Conectar como receptor</strong>.'
      : state.peers.size === 0
        ? 'Receptor listo. Esperando que el emisor entre con la misma clave.'
        : hasRemoteAudioActive()
          ? 'Audio recibiéndose. Si no oyes nada, pulsa <strong>Reactivar audio</strong>.'
          : 'El emisor ya está conectado. Espera a que pulse <strong>Mantener micrófono encendido</strong> o <strong>Hablar ahora</strong>.';
  } else if (bluetoothTarget) {
    els.outputCardTitle.textContent = 'Salida Bluetooth local';
    els.outputCardHint.textContent = 'Aquí eliges por dónde se va a escuchar este mismo dispositivo.';
    els.roomModeHint.innerHTML = 'Bluetooth local: no hay sala. Solo ajusta tu audio y pulsa <strong>Hablar por Bluetooth</strong>.';
  } else {
    els.roomModeHint.innerHTML = !state.joined
      ? `Escribe una clave, compártela con el receptor y pulsa <strong>${els.connectBtn.textContent}</strong>.`
      : state.peers.size === 0
        ? 'Sala lista. Falta que el receptor abra el enlace y pulse <strong>Conectar como receptor</strong>.'
        : state.roomSendActive
          ? 'La sala está activa. Habla y el receptor debería oírte rápido.'
          : 'El receptor ya apareció en la lista. Ahora pulsa <strong>Mantener micrófono encendido</strong> o usa <strong>Hablar ahora</strong>.';
  }

  updatePeerSummary();
  refreshPrimaryStatus();
  updateButtons();
  updatePttUi();
}

function setDeviceMode(mode, { persist = true, announce = true, togglePanel = true } = {}) {
  const safeMode = mode === 'receiver' ? 'receiver' : 'sender';
  const sameMode = state.deviceMode === safeMode;
  const samePanelOpen = state.rolePanelOpen === safeMode;
  state.modeChosen = true;
  state.deviceMode = safeMode;
  state.roomRole = safeMode;
  state.rolePanelOpen = togglePanel ? (sameMode && samePanelOpen ? '' : safeMode) : safeMode;
  els.roomRole.value = state.roomRole;
  if (persist) {
    localStorage.setItem('mic-room-device-mode', state.deviceMode);
    localStorage.setItem('mic-room-role', state.roomRole);
  }
  if (announce) {
    showToast(safeMode === 'sender' ? 'Emisor seleccionado' : 'Receptor seleccionado');
  }
  updateCurrentHashInHistory();
  renderWorkflowMode();
}

function setSenderTarget(target, { persist = true, refreshArtifacts = true, announce = false } = {}) {
  const safeTarget = ['pc-wifi', 'phone-wifi', 'bluetooth-local'].includes(target) ? target : 'pc-wifi';
  state.senderTarget = safeTarget;
  els.senderTarget.value = safeTarget;
  if (persist) {
    localStorage.setItem('mic-room-sender-target', safeTarget);
  }
  if (announce) {
    const labels = {
      'pc-wifi': 'Destino seleccionado: PC por red',
      'phone-wifi': 'Destino seleccionado: otro teléfono por red',
      'bluetooth-local': 'Destino seleccionado: Bluetooth local',
    };
    showToast(labels[safeTarget] || 'Destino seleccionado', 'info');
  }
  updateCurrentHashInHistory();
  renderWorkflowMode();
  if (refreshArtifacts) {
    refreshRoomArtifacts().catch((error) => log(`No pude refrescar la sala: ${error.message}`, 'warn'));
  }
}

async function refreshRoomArtifacts() {
  const token = ++state.previewToken;
  const key = els.roomKey.value.trim();
  updateCurrentHashInHistory();

  if (!key) {
    els.roomFingerprint.textContent = '—';
    els.qrLinkPreview.textContent = '—';
    els.qrBox.innerHTML = `
      <div class="text-center text-body-secondary px-3">
        <div class="fs-2 mb-2">📷</div>
        <div>Escribe una clave para generar el QR.</div>
      </div>
    `;
    state.qrDataUrl = '';
    state.shareableRoomLink = getCurrentRoomLink();
    return;
  }

  els.qrLinkPreview.textContent = 'Generando enlace…';
  const roomId = await sha256Hex(key);
  if (token !== state.previewToken) return;
  const shareLink = await getShareableRoomLink();
  if (token !== state.previewToken) return;

  els.roomFingerprint.textContent = shortId(roomId);
  els.qrLinkPreview.textContent = shareLink;
  renderQr(shareLink);
}

function renderQr(text) {
  if (typeof qrcode !== 'function') {
    els.qrBox.innerHTML = '<div class="text-body-secondary text-center px-3">No pude cargar el generador de QR.</div>';
    return;
  }

  try {
    const qr = qrcode(0, 'M');
    qr.addData(text);
    qr.make();
    state.qrDataUrl = qr.createDataURL(8, 2);
    els.qrBox.innerHTML = `<img src="${state.qrDataUrl}" alt="QR de la sala">`;
  } catch (error) {
    state.qrDataUrl = '';
    els.qrBox.innerHTML = '<div class="text-body-secondary text-center px-3">No pude generar el QR.</div>';
    log(`No pude generar el QR: ${error.message}`, 'warn');
  }
}

async function copyRoomLink() {
  const link = await getShareableRoomLink();
  try {
    await navigator.clipboard.writeText(link);
    els.qrLinkPreview.textContent = link;
    log(`Enlace copiado: ${link}`, 'success');
  } catch (error) {
    log(`No pude copiar el enlace: ${error.message}`, 'warn');
  }
}

async function shareRoom() {
  const link = await getShareableRoomLink();
  const text = `Únete a mi sala de Mic Room con esta clave: ${els.roomKey.value.trim() || '(sin clave)'}`;
  try {
    if (navigator.share) {
      await navigator.share({ title: 'Mic Room', text, url: link });
      log('Compartido con el selector nativo del dispositivo.', 'success');
      return;
    }
  } catch (error) {
    if (error?.name !== 'AbortError') {
      log(`No pude abrir compartir: ${error.message}`, 'warn');
    }
    return;
  }
  await copyRoomLink();
}

function getCaptureConstraints() {
  const bitrateKbps = getBitrateKbps();
  const deviceId = els.inputSelect.value;
  return {
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      channelCount: { ideal: 1 },
      sampleRate: { ideal: bitrateKbps >= 72 ? 48000 : 32000 },
      sampleSize: { ideal: 16 },
      latency: { ideal: bitrateKbps <= 24 ? 0.03 : 0.01 },
      ...(deviceId ? { deviceId: { exact: deviceId } } : {}),
    },
    video: false,
  };
}

function needsLocalMonitor() {
  return state.localPlaybackActive || (state.roomSendActive && els.localMonitorCheckbox.checked);
}

async function unlockAudio() {
  try {
    if (state.processingContext?.state === 'suspended') {
      await state.processingContext.resume();
    }
    for (const peer of state.peers.values()) {
      if (peer.audio) {
        try { await peer.audio.play(); } catch {}
      }
    }
    if (els.localMonitor.srcObject) {
      try { await els.localMonitor.play(); } catch {}
    }
    log('Audio reactivado.', 'success');
  } catch (error) {
    log(`No pude reactivar el audio: ${error.message}`, 'warn');
  }
}

function stopMeter() {
  if (state.meterTimer) {
    clearInterval(state.meterTimer);
    state.meterTimer = null;
  }
}

function startMeter() {
  stopMeter();
  if (!state.analyserNode) {
    setMeter(0, 'Micrófono apagado');
    return;
  }

  const data = new Uint8Array(state.analyserNode.frequencyBinCount);
  state.meterTimer = setInterval(() => {
    if (!state.rawTrack || state.rawTrack.readyState !== 'live') {
      setMeter(0, 'Micrófono apagado');
      return;
    }
    state.analyserNode.getByteFrequencyData(data);
    const avg = data.reduce((sum, value) => sum + value, 0) / Math.max(data.length, 1);
    const percent = Math.max(0, Math.min(100, Math.round(avg)));
    if (state.roomSendActive && state.talkMode === 'push-to-talk' && !state.pttPressed) {
      setMeter(0, 'Push-to-talk listo. Mantén pulsado para hablar.');
    } else if (state.localPlaybackActive || state.roomSendActive) {
      setMeter(percent, `Nivel del micrófono: ${percent}%`);
    } else {
      setMeter(0, 'Micrófono listo. Aún no está enviando ni reproduciendo.');
    }
  }, 120);
}

function addOutputOptionIfMissing(deviceId, label) {
  if (!deviceId || deviceId === 'default') return;
  const exists = [...els.outputSelect.options].some((opt) => opt.value === deviceId);
  if (!exists) {
    const option = document.createElement('option');
    option.value = deviceId;
    option.textContent = label || 'Salida seleccionada';
    els.outputSelect.appendChild(option);
  }
}

async function populateDevices() {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const inputs = devices.filter((d) => d.kind === 'audioinput');
    const outputs = devices.filter((d) => d.kind === 'audiooutput');
    const previousInput = els.inputSelect.value;
    const previousOutput = els.outputSelect.value || state.preferredSinkId;

    els.inputSelect.innerHTML = '';
    if (!inputs.length) {
      els.inputSelect.innerHTML = '<option value="">Micrófono por defecto</option>';
    } else {
      for (const input of inputs) {
        const option = document.createElement('option');
        option.value = input.deviceId;
        option.textContent = input.label || 'Micrófono';
        els.inputSelect.appendChild(option);
      }
      if ([...els.inputSelect.options].some((opt) => opt.value === previousInput)) {
        els.inputSelect.value = previousInput;
      }
    }

    els.outputSelect.innerHTML = '';
    const defaultOption = document.createElement('option');
    defaultOption.value = 'default';
    defaultOption.textContent = 'Salida por defecto del sistema';
    els.outputSelect.appendChild(defaultOption);

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    const canChooseSink = typeof HTMLMediaElement.prototype.setSinkId === 'function' || typeof AudioContextClass?.prototype?.setSinkId === 'function';
    if (!canChooseSink) {
      els.outputSelect.disabled = true;
      els.localOutputStatus.textContent = 'Tu navegador no permite elegir la salida desde la web. Usa la salida predeterminada del sistema o empareja Bluetooth antes.';
    } else {
      els.outputSelect.disabled = false;
      els.localOutputStatus.textContent = 'Puedes elegir manualmente la salida o usar el botón “Elegir salida Bluetooth”.';
    }

    for (const output of outputs) {
      const option = document.createElement('option');
      option.value = output.deviceId;
      option.textContent = output.label || 'Salida de audio';
      els.outputSelect.appendChild(option);
    }

    addOutputOptionIfMissing(state.preferredSinkId, state.selectedOutputLabel);
    if ([...els.outputSelect.options].some((opt) => opt.value === previousOutput)) {
      els.outputSelect.value = previousOutput;
    } else if ([...els.outputSelect.options].some((opt) => opt.value === state.preferredSinkId)) {
      els.outputSelect.value = state.preferredSinkId;
    }
    state.preferredSinkId = els.outputSelect.value || 'default';
  } catch (error) {
    log(`No pude enumerar dispositivos: ${error.message}`, 'warn');
  }
}

async function setAudioSink(audioEl) {
  if (!audioEl || typeof audioEl.setSinkId !== 'function') return;
  const sinkId = state.preferredSinkId || 'default';
  try {
    await audioEl.setSinkId(sinkId);
  } catch (error) {
    log(`No pude cambiar la salida de audio: ${error.message}`, 'warn');
  }
}

async function applyOutputSelection() {
  const sinkId = state.preferredSinkId || 'default';
  if (state.processingContext && typeof state.processingContext.setSinkId === 'function') {
    try {
      await state.processingContext.setSinkId(sinkId);
    } catch (error) {
      log(`No pude cambiar la salida del contexto de audio: ${error.message}`, 'warn');
    }
  }
  await setAudioSink(els.localMonitor);
  for (const peer of state.peers.values()) {
    await setAudioSink(peer.audio);
  }
}

async function selectBluetoothOutput() {
  if (!navigator.mediaDevices?.selectAudioOutput) {
    alert('Tu navegador no soporta la selección directa de salida. Empareja el dispositivo Bluetooth desde el sistema y usa la salida predeterminada.');
    return;
  }

  try {
    const device = await navigator.mediaDevices.selectAudioOutput();
    state.preferredSinkId = device.deviceId || 'default';
    state.selectedOutputLabel = device.label || 'Salida Bluetooth';
    addOutputOptionIfMissing(state.preferredSinkId, state.selectedOutputLabel);
    els.outputSelect.value = state.preferredSinkId;
    els.localOutputStatus.textContent = `Salida elegida: ${state.selectedOutputLabel}`;
    await applyOutputSelection();
    showToast('Salida Bluetooth seleccionada');
    log(`Salida seleccionada: ${state.selectedOutputLabel}`, 'success');
  } catch (error) {
    if (error?.name !== 'AbortError') {
      log(`No pude elegir la salida Bluetooth: ${error.message}`, 'warn');
    }
  }
}

async function ensureAudioPipeline() {
  if (state.processingContext && state.localTrack && state.rawTrack?.readyState === 'live') return;

  const stream = await navigator.mediaDevices.getUserMedia(getCaptureConstraints());
  const rawTrack = stream.getAudioTracks()[0];
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) throw new Error('Este navegador no soporta AudioContext');

  const ctx = new AudioContextClass();
  if (ctx.state === 'suspended') await ctx.resume();

  const source = ctx.createMediaStreamSource(stream);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 512;

  const inputGain = ctx.createGain();
  const bass = ctx.createBiquadFilter();
  bass.type = 'lowshelf';
  bass.frequency.value = 180;
  const presence = ctx.createBiquadFilter();
  presence.type = 'peaking';
  presence.frequency.value = 2600;
  presence.Q.value = 1;
  const treble = ctx.createBiquadFilter();
  treble.type = 'highshelf';
  treble.frequency.value = 5200;
  const outputGain = ctx.createGain();
  const monitorGain = ctx.createGain();
  const destination = ctx.createMediaStreamDestination();

  source.connect(analyser);
  source.connect(inputGain);
  inputGain.connect(bass);
  bass.connect(presence);
  presence.connect(treble);
  treble.connect(outputGain);
  outputGain.connect(destination);
  outputGain.connect(monitorGain);

  state.rawStream = stream;
  state.rawTrack = rawTrack;
  state.processedStream = destination.stream;
  state.localTrack = destination.stream.getAudioTracks()[0] || rawTrack;
  state.processingContext = ctx;
  state.sourceNode = source;
  state.analyserNode = analyser;
  state.filterNodes = { inputGain, bass, presence, treble, outputGain, monitorGain, destination };
  state.monitorConnected = false;

  try { state.localTrack.contentHint = 'speech'; } catch {}
  applyFiltersToNodes();
  syncTalkModeState(false);
  await applyOutputSelection();
  startMeter();

  rawTrack.onended = () => {
    if (state.rawTrack === rawTrack) {
      hardStopAllAudio('El micrófono se cerró o perdió el permiso.').catch(() => {});
    }
  };
}

async function syncLocalPlayback() {
  const shouldMonitor = needsLocalMonitor();
  if (!state.processingContext || !state.filterNodes) {
    if (!shouldMonitor) {
      try { els.localMonitor.pause(); } catch {}
      els.localMonitor.srcObject = null;
    }
    return;
  }

  if (typeof state.processingContext.setSinkId === 'function') {
    if (shouldMonitor && !state.monitorConnected) {
      state.filterNodes.monitorGain.connect(state.processingContext.destination);
      state.monitorConnected = true;
    } else if (!shouldMonitor && state.monitorConnected) {
      try { state.filterNodes.monitorGain.disconnect(state.processingContext.destination); } catch {}
      state.monitorConnected = false;
    }
    try { els.localMonitor.pause(); } catch {}
    els.localMonitor.srcObject = null;
    return;
  }

  if (shouldMonitor) {
    els.localMonitor.srcObject = state.processedStream;
    await setAudioSink(els.localMonitor);
    try { await els.localMonitor.play(); } catch {}
  } else {
    try { els.localMonitor.pause(); } catch {}
    els.localMonitor.srcObject = null;
  }
}

async function cleanupAudioIfIdle() {
  if (state.localPlaybackActive || state.roomSendActive) {
    await syncLocalPlayback();
    return;
  }

  stopMeter();
  try { els.localMonitor.pause(); } catch {}
  els.localMonitor.srcObject = null;
  if (state.filterNodes?.monitorGain && state.monitorConnected && state.processingContext) {
    try { state.filterNodes.monitorGain.disconnect(state.processingContext.destination); } catch {}
  }
  state.monitorConnected = false;

  if (state.rawStream) {
    for (const track of state.rawStream.getTracks()) {
      track.onended = null;
      track.stop();
    }
  }
  try { await state.processingContext?.close(); } catch {}

  state.rawStream = null;
  state.processedStream = null;
  state.rawTrack = null;
  state.localTrack = null;
  state.processingContext = null;
  state.sourceNode = null;
  state.analyserNode = null;
  state.filterNodes = null;
  setMeter(0, 'Micrófono apagado');
}

async function hardStopAllAudio(reason = 'Audio detenido.') {
  state.localPlaybackActive = false;
  state.roomSendActive = false;
  state.pttPressed = false;
  for (const peer of state.peers.values()) {
    await removeLocalTrackFromPeer(peer);
  }
  await cleanupAudioIfIdle();
  updateButtons();
  updatePttUi();
  renderWorkflowMode();
  setLocalStatus(reason, 'secondary');
  log(reason, 'warn');
}

async function restartAudioPipeline(reason = 'Se reinició el audio para aplicar cambios.') {
  const shouldReturn = state.localPlaybackActive || state.roomSendActive;
  if (!state.rawStream || !shouldReturn) return;

  const keepLocal = state.localPlaybackActive;
  const keepRoom = state.roomSendActive;
  const keepPtt = state.pttPressed;

  for (const peer of state.peers.values()) {
    await removeLocalTrackFromPeer(peer);
  }
  state.localPlaybackActive = false;
  state.roomSendActive = false;
  state.pttPressed = false;
  await cleanupAudioIfIdle();

  state.localPlaybackActive = keepLocal;
  state.roomSendActive = keepRoom;
  state.pttPressed = keepPtt;
  await ensureAudioPipeline();
  if (state.roomSendActive) {
    for (const peer of state.peers.values()) {
      await addLocalTrackToPeer(peer, state.processedStream);
    }
    await applyAudioQualityToAllPeers();
  }
  await syncLocalPlayback();
  updateButtons();
  updatePttUi();
  renderWorkflowMode();
  log(reason, 'success');
}

async function startLocalMode() {
  if (!state.modeChosen || !isSenderMode() || !isBluetoothTarget()) {
    alert('Primero selecciona Emisor y luego Bluetooth local.');
    return;
  }

  try {
    await unlockAudio();
    state.localPlaybackActive = true;
    await ensureAudioPipeline();
    await syncLocalPlayback();
    updateButtons();
    renderWorkflowMode();
    setLocalStatus(`Bluetooth local activo. Audio saliendo por ${state.selectedOutputLabel || 'la salida elegida'}.`, 'success');
    showToast('Bluetooth local iniciado con éxito');
    log('Bluetooth local activo.', 'success');
  } catch (error) {
    state.localPlaybackActive = false;
    renderWorkflowMode();
    setLocalStatus('No pude iniciar el Bluetooth local.', 'danger');
    log(`No pude iniciar el modo local: ${error.message}`, 'error');
    alert(`No pude iniciar el Bluetooth local. ${error.message}`);
  }
}

async function stopLocalMode() {
  state.localPlaybackActive = false;
  await cleanupAudioIfIdle();
  updateButtons();
  renderWorkflowMode();
  setLocalStatus('Bluetooth local detenido. Este modo no necesita sala ni clave.', 'secondary');
  log('Bluetooth local detenido.');
}

function getSendEnabled() {
  if (!state.localTrack) return false;
  if (state.roomRole === 'receiver') return false;
  if (!state.roomSendActive) return false;
  if (state.talkMode === 'push-to-talk') return state.pttPressed;
  return true;
}

function syncSendTrackState() {
  if (state.localTrack) {
    state.localTrack.enabled = getSendEnabled();
  }
  for (const peer of state.peers.values()) {
    if (peer.audioSender?.track) {
      peer.audioSender.track.enabled = getSendEnabled();
    }
  }
}

function updateButtons() {
  const lockedModeControls = state.joined || state.localPlaybackActive || state.roomSendActive;
  const canSendMic = state.modeChosen && state.joined && state.roomRole !== 'receiver' && state.peers.size > 0 && isWifiTarget();

  els.deviceModeSenderBtn.disabled = lockedModeControls;
  els.deviceModeReceiverBtn.disabled = lockedModeControls;
  els.senderTarget.disabled = !state.modeChosen || lockedModeControls || isReceiverMode();
  els.connectBtn.disabled = !state.modeChosen || state.joined || (isSenderMode() && isBluetoothTarget());
  els.disconnectBtn.disabled = !state.joined;
  els.roomRole.disabled = state.joined;
  els.startMicBtn.disabled = !canSendMic || state.roomSendActive;
  els.stopMicBtn.disabled = !state.roomSendActive || isBluetoothTarget() || isReceiverMode();
  els.unlockAudioBtn.disabled = !state.joined && !hasRemoteAudioActive();
  els.localStartBtn.disabled = !state.modeChosen || state.localPlaybackActive || !(isSenderMode() && isBluetoothTarget());
  els.localStopBtn.disabled = !state.localPlaybackActive;
  els.pttButton.disabled = !canSendMic || state.talkMode !== 'push-to-talk';

  els.connectBtn.textContent = isReceiverMode() ? 'Conectar como receptor' : 'Crear / conectar sala';
  els.disconnectBtn.textContent = 'Salir de la sala';
  els.startMicBtn.textContent = state.roomSendActive ? 'Micrófono encendido' : 'Mantener micrófono encendido';
  els.stopMicBtn.textContent = 'Apagar micrófono';
  els.localStartBtn.textContent = state.localPlaybackActive ? 'Bluetooth activo' : 'Hablar por Bluetooth';
  els.localStopBtn.textContent = 'Detener Bluetooth local';
}

function updateRoomHint() {
  state.roomRole = isReceiverMode() ? 'receiver' : 'sender';
  els.roomRole.value = state.roomRole;
  renderWorkflowMode();
  updateButtons();
  updatePttUi();
}

function updatePttUi() {
  const canSendMic = state.modeChosen && state.joined && state.roomRole !== 'receiver' && state.peers.size > 0 && isWifiTarget();
  els.pttButton.classList.toggle('active', state.talkMode === 'push-to-talk' && state.pttPressed);

  if (!state.modeChosen) {
    els.pttState.textContent = 'Elige rol';
    els.pttState.className = 'badge rounded-pill text-bg-secondary';
    els.pttHint.textContent = 'Primero selecciona Emisor o Receptor.';
    els.pttButton.textContent = 'Hablar ahora';
    return;
  }

  if (isReceiverMode()) {
    els.pttState.textContent = 'Receptor';
    els.pttState.className = 'badge rounded-pill text-bg-secondary';
    els.pttHint.textContent = 'Este dispositivo solo recibe audio. Aquí no necesitas botón para hablar.';
    els.pttButton.textContent = 'Solo disponible en el emisor';
    return;
  }

  if (isBluetoothTarget()) {
    els.pttState.textContent = 'Bluetooth local';
    els.pttState.className = 'badge rounded-pill text-bg-secondary';
    els.pttHint.textContent = 'Para Bluetooth local usa el botón “Hablar por Bluetooth”.';
    els.pttButton.textContent = 'Solo para envío por sala';
    return;
  }

  if (!canSendMic) {
    els.pttState.textContent = state.joined ? 'Esperando receptor' : 'Sala no lista';
    els.pttState.className = 'badge rounded-pill text-bg-secondary';
    els.pttHint.textContent = state.joined
      ? 'Espera a que el receptor aparezca en la lista de dispositivos conectados.'
      : 'Conecta la sala primero si quieres usar este botón.';
    els.pttButton.textContent = 'Hablar ahora';
    return;
  }

  if (state.talkMode !== 'push-to-talk') {
    els.pttState.textContent = 'Micrófono continuo';
    els.pttState.className = 'badge rounded-pill text-bg-secondary';
    els.pttHint.textContent = 'El micrófono enviará audio de forma continua mientras esté encendido.';
    els.pttButton.textContent = 'Activa el modo de hablar al pulsar';
    return;
  }

  if (!state.roomSendActive) {
    els.pttState.textContent = 'Listo para hablar';
    els.pttState.className = 'badge rounded-pill text-bg-warning text-dark';
    els.pttHint.textContent = 'La sala ya tiene receptor. Pulsa este botón para empezar a hablar.';
    els.pttButton.textContent = 'Mantén pulsado para hablar';
    return;
  }

  if (state.pttPressed) {
    els.pttState.textContent = 'Hablando';
    els.pttState.className = 'badge rounded-pill text-bg-success';
    els.pttHint.textContent = 'Suelta el botón para dejar de transmitir.';
    els.pttButton.textContent = 'Hablando… suelta para silenciar';
    return;
  }

  els.pttState.textContent = 'Silenciado hasta pulsar';
  els.pttState.className = 'badge rounded-pill text-bg-info';
  els.pttHint.textContent = 'La sala está lista. Mantén pulsado para hablar.';
  els.pttButton.textContent = 'Hablar ahora';
}

function syncTalkModeState(logChange = false) {
  state.talkMode = els.talkMode.value;
  localStorage.setItem('mic-room-talk-mode', state.talkMode);
  if (state.talkMode === 'always-on') state.pttPressed = false;
  syncSendTrackState();
  updatePttUi();
  updateButtons();
  if (logChange) {
    log(state.talkMode === 'push-to-talk' ? 'Push-to-talk activado.' : 'Modo siempre encendido activado.');
  }
}

function setPttPressed(active) {
  if (state.talkMode !== 'push-to-talk') return;
  state.pttPressed = Boolean(active);
  syncSendTrackState();
  updatePttUi();
}

async function handlePttStart(event) {
  if (event) event.preventDefault();
  if (!state.joined || state.roomRole === 'receiver' || state.talkMode !== 'push-to-talk') return;
  if (!state.roomSendActive) await startRoomMic();
  setPttPressed(true);
}

function handlePttEnd(event) {
  if (event) event.preventDefault();
  if (state.talkMode !== 'push-to-talk') return;
  setPttPressed(false);
}

function ensurePeerCard(peerId) {
  const peer = state.peers.get(peerId);
  if (!peer) return null;

  let card = document.getElementById(`peer-${peerId}`);
  if (card) return card;
  if (els.peersList.classList.contains('empty-state')) {
    els.peersList.textContent = '';
    els.peersList.classList.remove('empty-state', 'p-4', 'text-center');
  }

  card = document.createElement('div');
  card.className = 'peer-card card border-0 shadow-sm';
  card.id = `peer-${peerId}`;
  card.innerHTML = `
    <div class="card-body">
      <div class="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3 mb-3">
        <div>
          <div class="peer-name fw-semibold"></div>
          <div class="peer-meta"></div>
        </div>
        <span class="peer-status badge rounded-pill text-bg-secondary">esperando</span>
      </div>
      <div class="peer-controls">
        <label class="form-label small text-body-secondary mb-2">Volumen</label>
        <input class="form-range" type="range" min="0" max="1" step="0.01" value="1">
      </div>
    </div>
  `;

  const slider = card.querySelector('input[type="range"]');
  slider.addEventListener('input', () => {
    if (peer.audio) peer.audio.volume = Number(slider.value);
  });

  els.peersList.appendChild(card);
  refreshPeerCard(peerId);
  return card;
}

function refreshPeerCard(peerId) {
  const peer = state.peers.get(peerId);
  const card = document.getElementById(`peer-${peerId}`);
  if (!peer || !card) return;

  card.querySelector('.peer-name').textContent = peer.name || 'Dispositivo';
  card.querySelector('.peer-meta').textContent = `${shortId(peerId)} · ${peer.polite ? 'modo cortés' : 'modo directo'}`;
  card.querySelector('.peer-controls label').textContent = `Volumen de ${peer.name}`;

  const stateText = peer.pc?.connectionState || peer.pc?.iceConnectionState || 'nuevo';
  const badge = card.querySelector('.peer-status');
  badge.textContent = stateText;
  badge.className = 'peer-status badge rounded-pill';
  if (['connected', 'completed'].includes(stateText)) badge.classList.add('text-bg-success');
  else if (['connecting', 'checking', 'new'].includes(stateText)) badge.classList.add('text-bg-warning', 'text-dark');
  else if (['failed', 'closed', 'disconnected'].includes(stateText)) badge.classList.add('text-bg-danger');
  else badge.classList.add('text-bg-secondary');

  updatePeerSummary();
  refreshPrimaryStatus();
  updateButtons();
  updatePttUi();
}

function removePeerCard(peerId) {
  const card = document.getElementById(`peer-${peerId}`);
  if (card) card.remove();
  if (state.peers.size === 0) {
    updatePeersEmptyState();
  }
  updatePeerSummary();
  refreshPrimaryStatus();
  updateButtons();
  updatePttUi();
}

async function sendSignal(to, data) {
  await api('/api/send', {
    method: 'POST',
    body: JSON.stringify({ roomId: state.roomId, from: state.peerId, to, data }),
  });
}

function createRemoteAudio(peerId) {
  const audio = document.createElement('audio');
  audio.autoplay = true;
  audio.playsInline = true;
  audio.dataset.peerId = peerId;
  audio.volume = 1;
  return audio;
}

async function applyAudioQualityToSender(sender) {
  if (!sender) return;
  try {
    const params = sender.getParameters();
    params.encodings = params.encodings && params.encodings.length ? params.encodings : [{}];
    params.encodings[0].maxBitrate = getBitrateKbps() * 1000;
    await sender.setParameters(params);
  } catch (error) {
    log(`Tu navegador no dejó aplicar maxBitrate: ${error.message}`, 'warn');
  }
}

async function applyAudioQualityToAllPeers() {
  for (const peer of state.peers.values()) {
    if (peer.audioSender) await applyAudioQualityToSender(peer.audioSender);
  }
}

async function addLocalTrackToPeer(peer, stream = state.processedStream) {
  if (!stream || !state.localTrack || !state.roomSendActive || state.roomRole === 'receiver') return;
  if (peer.audioSender) {
    await peer.audioSender.replaceTrack(state.localTrack);
  } else {
    peer.audioSender = peer.pc.addTrack(state.localTrack, stream);
  }
  syncSendTrackState();
  await applyAudioQualityToSender(peer.audioSender);
}

async function removeLocalTrackFromPeer(peer) {
  if (!peer.audioSender) return;
  try {
    peer.pc.removeTrack(peer.audioSender);
  } catch (error) {
    log(`No pude quitar la pista local hacia ${peer.name}: ${error.message}`, 'warn');
  }
  peer.audioSender = null;
}

async function ensurePeer(peerId, name = 'Dispositivo') {
  if (peerId === state.peerId) return null;
  if (state.peers.has(peerId)) {
    const existing = state.peers.get(peerId);
    if (name && name !== existing.name) {
      existing.name = name;
      refreshPeerCard(peerId);
    }
    return existing;
  }

  const polite = state.peerId > peerId;
  const pc = new RTCPeerConnection({ iceServers: [] });
  const audio = createRemoteAudio(peerId);
  const peer = {
    peerId,
    name,
    polite,
    pc,
    audio,
    audioSender: null,
    makingOffer: false,
    ignoreOffer: false,
    isSettingRemoteAnswerPending: false,
  };

  state.peers.set(peerId, peer);
  ensurePeerCard(peerId);
  await setAudioSink(audio);

  pc.onicecandidate = async ({ candidate }) => {
    if (!candidate || !state.joined) return;
    try {
      await sendSignal(peerId, { candidate, name: state.displayName });
    } catch (error) {
      log(`No pude enviar ICE a ${peer.name}: ${error.message}`, 'warn');
    }
  };

  pc.ontrack = async (event) => {
    const stream = event.streams[0] || new MediaStream([event.track]);
    peer.audio.srcObject = stream;
    try {
      await setAudioSink(peer.audio);
      await peer.audio.play();
    } catch (error) {
      log(`El navegador bloqueó la reproducción automática de ${peer.name}. Pulsa “Reactivar audio”.`, 'warn');
    }
    refreshPeerCard(peerId);
    updatePeerSummary();
    refreshPrimaryStatus();
    log(`Audio remoto activo desde ${peer.name}.`, 'success');
  };

  const refreshState = () => refreshPeerCard(peerId);
  pc.onconnectionstatechange = refreshState;
  pc.oniceconnectionstatechange = refreshState;
  pc.onsignalingstatechange = refreshState;

  pc.onnegotiationneeded = async () => {
    try {
      if (!state.joined || pc.signalingState === 'closed') return;
      peer.makingOffer = true;
      await pc.setLocalDescription();
      if (!state.joined || pc.signalingState === 'closed') return;
      await sendSignal(peerId, { description: pc.localDescription, name: state.displayName });
      log(`Oferta enviada a ${peer.name}.`);
    } catch (error) {
      log(`Error negociando con ${peer.name}: ${error.message}`, 'warn');
    } finally {
      peer.makingOffer = false;
      refreshPeerCard(peerId);
    }
  };

  if (state.roomSendActive) await addLocalTrackToPeer(peer, state.processedStream);
  refreshPeerCard(peerId);
  log(`Dispositivo conectado a la sala: ${name}.`, 'success');
  return peer;
}

async function handleSignal(from, payload) {
  const peer = await ensurePeer(from, payload?.name || `Dispositivo ${from.slice(0, 4)}`);
  if (!peer) return;
  if (payload?.name && payload.name !== peer.name) {
    peer.name = payload.name;
    refreshPeerCard(from);
  }

  try {
    if (payload.description) {
      const description = payload.description;
      const readyForOffer = !peer.makingOffer && (peer.pc.signalingState === 'stable' || peer.isSettingRemoteAnswerPending);
      const offerCollision = description.type === 'offer' && !readyForOffer;
      peer.ignoreOffer = !peer.polite && offerCollision;
      if (peer.ignoreOffer) {
        log(`Choque de oferta con ${peer.name}; la ignoré por prioridad.`, 'warn');
        return;
      }

      peer.isSettingRemoteAnswerPending = description.type === 'answer';
      await peer.pc.setRemoteDescription(description);
      peer.isSettingRemoteAnswerPending = false;
      refreshPeerCard(from);

      if (description.type === 'offer') {
        await peer.pc.setLocalDescription();
        await sendSignal(from, { description: peer.pc.localDescription, name: state.displayName });
        log(`Respuesta enviada a ${peer.name}.`);
      }
    } else if (payload.candidate) {
      try {
        await peer.pc.addIceCandidate(payload.candidate);
      } catch (error) {
        if (!peer.ignoreOffer) throw error;
      }
    }
  } catch (error) {
    log(`Señal inválida con ${peer.name}: ${error.message}`, 'warn');
  }
}

async function closePeer(peerId, reason = 'cerrado') {
  const peer = state.peers.get(peerId);
  if (!peer) return;
  try { peer.audio.pause(); } catch {}
  peer.audio.srcObject = null;
  try {
    peer.pc.ontrack = null;
    peer.pc.onicecandidate = null;
    peer.pc.onnegotiationneeded = null;
  } catch {}
  try { peer.pc.close(); } catch {}
  state.peers.delete(peerId);
  removePeerCard(peerId);
  log(`Peer ${peer.name} ${reason}.`, 'warn');
}

async function startRoomMic() {
  if (!state.joined) {
    alert('Primero crea o conecta la sala.');
    return;
  }
  if (state.roomRole === 'receiver' || isReceiverMode()) {
    alert('Este dispositivo está como receptor. Aquí solo debe reproducir audio.');
    return;
  }
  if (isBluetoothTarget()) {
    alert('Para Bluetooth local usa el botón “Hablar por Bluetooth”.');
    return;
  }
  if (state.peers.size === 0) {
    alert('Primero espera a que el receptor aparezca en “Dispositivos conectados”.');
    return;
  }

  try {
    await unlockAudio();
    state.roomSendActive = true;
    await ensureAudioPipeline();
    for (const peer of state.peers.values()) {
      await addLocalTrackToPeer(peer, state.processedStream);
    }
    syncTalkModeState(false);
    await applyAudioQualityToAllPeers();
    await syncLocalPlayback();
    updateButtons();
    updatePttUi();
    renderWorkflowMode();
    log(`Micrófono de sala activo a ${getBitrateKbps()} kbps.`, 'success');
  } catch (error) {
    state.roomSendActive = false;
    updateButtons();
    updatePttUi();
    renderWorkflowMode();
    log(`No pude activar el micrófono de sala: ${error.message}`, 'error');
    alert(`No pude activar el micrófono para la sala. ${error.message}`);
  }
}

async function stopRoomMic() {
  state.roomSendActive = false;
  state.pttPressed = false;
  for (const peer of state.peers.values()) {
    await removeLocalTrackFromPeer(peer);
  }
  syncTalkModeState(false);
  await syncLocalPlayback();
  await cleanupAudioIfIdle();
  updateButtons();
  updatePttUi();
  renderWorkflowMode();
  log('Micrófono de sala silenciado.');
}

async function joinRoom() {
  if (state.joined) return;
  if (!state.modeChosen) {
    alert('Primero selecciona si este dispositivo será emisor o receptor.');
    return;
  }
  if (isSenderMode() && isBluetoothTarget()) {
    alert('Para Bluetooth local no uses sala. Usa el botón “Hablar por Bluetooth”.');
    return;
  }

  const roomKey = els.roomKey.value.trim();
  if (!roomKey) {
    alert('Escribe una clave primero.');
    return;
  }

  if (!window.isSecureContext) {
    log('Esta página no está en contexto seguro. En móviles, el micrófono puede fallar fuera de HTTPS o localhost.', 'warn');
  }

  state.roomKey = roomKey;
  state.roomRole = isReceiverMode() ? 'receiver' : 'sender';
  els.roomRole.value = state.roomRole;
  state.roomId = await sha256Hex(roomKey);
  state.displayName = sanitizeName(els.displayName.value);
  els.displayName.value = state.displayName;
  els.roomFingerprint.textContent = shortId(state.roomId);
  updateCurrentHashInHistory();
  setRoomStatus('conectando…');
  els.roomProgressText.textContent = isReceiverMode()
    ? 'Conectando este receptor a la sala…'
    : 'Creando o conectando la sala del emisor…';

  try {
    const join = await api('/api/join', {
      method: 'POST',
      body: JSON.stringify({ roomId: state.roomId, peerId: state.peerId, name: state.displayName }),
    });

    state.joined = true;
    updateButtons();
    updatePttUi();
    renderWorkflowMode();
    log(`${isReceiverMode() ? 'Receptor' : 'Emisor'} conectado como ${state.displayName}.`, 'success');

    const eventsUrl = `${state.serverOrigin}/api/events?roomId=${encodeURIComponent(state.roomId)}&peerId=${encodeURIComponent(state.peerId)}`;
    state.eventSource = new EventSource(eventsUrl);
    state.eventSource.onmessage = async (event) => {
      const payload = JSON.parse(event.data);
      if (payload.type === 'ready') {
        log('Señalización lista.', 'success');
        renderWorkflowMode();
        return;
      }
      if (payload.type === 'peer-joined') {
        if (payload.peerId === state.peerId) return;
        await ensurePeer(payload.peerId, payload.name || `Dispositivo ${payload.peerId.slice(0, 4)}`);
        renderWorkflowMode();
        return;
      }
      if (payload.type === 'peer-left') {
        await closePeer(payload.peerId, 'salió de la sala');
        renderWorkflowMode();
        return;
      }
      if (payload.type === 'signal') {
        await handleSignal(payload.from, payload.data);
        renderWorkflowMode();
      }
    };

    state.eventSource.onerror = () => {
      log('La conexión de señalización se interrumpió.', 'warn');
      setRoomStatus('señalización interrumpida');
    };

    for (const remote of join.peers || []) {
      await ensurePeer(remote.peerId, remote.name || `Dispositivo ${remote.peerId.slice(0, 4)}`);
    }

    await refreshRoomArtifacts();
    await unlockAudio();
    renderWorkflowMode();
  } catch (error) {
    state.joined = false;
    updateButtons();
    updatePttUi();
    setRoomStatus('error al conectar');
    log(`No pude conectar la sala: ${error.message}`, 'error');
    alert(`No pude conectar la sala. ${error.message}`);
  }
}

async function leaveRoom() {
  if (!state.joined) return;
  try {
    await api('/api/leave', {
      method: 'POST',
      body: JSON.stringify({ roomId: state.roomId, peerId: state.peerId }),
    });
  } catch (error) {
    log(`No pude notificar la salida: ${error.message}`, 'warn');
  }

  try { state.eventSource?.close(); } catch {}
  state.eventSource = null;
  state.joined = false;
  await stopRoomMic();
  for (const peerId of [...state.peers.keys()]) {
    await closePeer(peerId, 'cerrado al salir');
  }

  state.roomId = '';
  setRoomStatus('desconectado');
  updateButtons();
  updatePttUi();
  renderWorkflowMode();
  showToast('Saliste de la sala', 'info');
  log('Saliste de la sala.');
}

function restoreSettings() {
  applyHashKey();
  els.displayName.value = localStorage.getItem('mic-room-display-name') || '';
  if (!els.displayName.value) {
    const deviceType = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) ? 'Teléfono' : 'PC';
    els.displayName.value = `${deviceType} ${state.peerId.slice(0, 4)}`;
  }

  const savedSenderTarget = localStorage.getItem('mic-room-sender-target');
  const hash = parseHashState();
  const initialTarget = hash.rx || (['pc-wifi', 'phone-wifi', 'bluetooth-local'].includes(savedSenderTarget) ? savedSenderTarget : 'pc-wifi');

  const savedTalkMode = localStorage.getItem('mic-room-talk-mode');
  if (['push-to-talk', 'always-on'].includes(savedTalkMode)) {
    els.talkMode.value = savedTalkMode;
  }

  const savedPreset = localStorage.getItem('mic-room-quality-preset');
  if (savedPreset && (savedPreset in QUALITY_PRESETS || savedPreset === 'custom')) els.qualityPreset.value = savedPreset;

  const savedBitrate = Number(localStorage.getItem('mic-room-bitrate') || '0');
  if (savedBitrate >= 16 && savedBitrate <= 128) {
    els.bitrateRange.value = String(savedBitrate);
  } else {
    els.bitrateRange.value = String((QUALITY_PRESETS[els.qualityPreset.value] || QUALITY_PRESETS.balanced).bitrateKbps);
  }

  const savedGain = Number(localStorage.getItem('mic-room-filter-gain') || '100');
  const savedBass = Number(localStorage.getItem('mic-room-filter-bass') || '0');
  const savedPresence = Number(localStorage.getItem('mic-room-filter-presence') || '0');
  const savedTreble = Number(localStorage.getItem('mic-room-filter-treble') || '0');
  els.filterGain.value = String(Math.min(200, Math.max(40, savedGain)));
  els.filterBass.value = String(Math.min(12, Math.max(-12, savedBass)));
  els.filterPresence.value = String(Math.min(12, Math.max(-12, savedPresence)));
  els.filterTreble.value = String(Math.min(12, Math.max(-12, savedTreble)));

  state.talkMode = els.talkMode.value;
  setSenderTarget(initialTarget, { persist: false, refreshArtifacts: false, announce: false });
  if (state.modeChosen && state.deviceMode) {
    state.rolePanelOpen = state.deviceMode;
    els.roomRole.value = state.roomRole;
  }
  updateFilterLabels();
  syncBitrateUi();
}

async function registerPwa() {
  if ('serviceWorker' in navigator) {
    try {
      await navigator.serviceWorker.register('./sw.js');
      log('Service worker registrado.', 'success');
    } catch (error) {
      log(`No pude registrar el service worker: ${error.message}`, 'warn');
    }
  }

  if (isStandaloneApp()) {
    setInstallStatus('La app ya está abierta como aplicación instalada.', 'text-success');
  } else if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
    setInstallStatus('En Safari: Compartir → Añadir a pantalla de inicio.', 'text-info');
  } else {
    setInstallStatus('Si tu navegador lo permite, aparecerá el botón “Instalar app”.', 'text-body-secondary');
  }

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    state.deferredInstallPrompt = event;
    els.installBtn.classList.remove('d-none');
    setInstallStatus('Instalación disponible.', 'text-success');
    log('La instalación como app está disponible.', 'success');
  });

  window.addEventListener('appinstalled', () => {
    state.deferredInstallPrompt = null;
    els.installBtn.classList.add('d-none');
    setInstallStatus('App instalada correctamente.', 'text-success');
    log('La app fue instalada.', 'success');
  });
}

async function installApp() {
  if (state.deferredInstallPrompt) {
    try {
      await state.deferredInstallPrompt.prompt();
      await state.deferredInstallPrompt.userChoice;
      state.deferredInstallPrompt = null;
      els.installBtn.classList.add('d-none');
    } catch (error) {
      log(`No pude mostrar el instalador: ${error.message}`, 'warn');
    }
    return;
  }

  if (isStandaloneApp()) {
    setInstallStatus('Ya está abierta como app instalada.', 'text-success');
    return;
  }

  if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
    alert('En Safari: toca Compartir y luego “Añadir a pantalla de inicio”.');
    return;
  }

  alert('Tu navegador no expuso el instalador todavía.');
}

function getDebugSnapshot() {
  return {
    joined: state.joined,
    modeChosen: state.modeChosen,
    rolePanelOpen: state.rolePanelOpen,
    deviceMode: state.deviceMode,
    senderTarget: state.senderTarget,
    roomKey: els.roomKey.value,
    roomLink: getCurrentRoomLink(),
    shareableRoomLink: state.shareableRoomLink,
    shareOrigin: state.shareOrigin,
    roomFingerprint: els.roomFingerprint.textContent,
    roomRole: state.roomRole,
    talkMode: state.talkMode,
    statusText: els.statusText.textContent,
    roomProgressText: els.roomProgressText.textContent,
    roomModeHint: els.roomModeHint.textContent,
    peerSummaryText: els.peerSummaryText.textContent,
    connectButtonLabel: els.connectBtn.textContent,
    outputCardVisible: !els.outputCard.classList.contains('d-none'),
    roomSendControlsVisible: !els.roomSendControlsCard.classList.contains('d-none'),
    shareBlockVisible: !els.shareBlock.classList.contains('d-none'),
    lastToastMessage: state.lastToastMessage,
    localPlaybackActive: state.localPlaybackActive,
    roomSendActive: state.roomSendActive,
    pttPressed: state.pttPressed,
    localTrack: state.localTrack ? {
      enabled: state.localTrack.enabled,
      muted: state.localTrack.muted,
      readyState: state.localTrack.readyState,
      contentHint: state.localTrack.contentHint,
    } : null,
    bitrateKbps: getBitrateKbps(),
    qualityPreset: els.qualityPreset.value,
    qrVisible: Boolean(els.qrBox.querySelector('img')),
    qrLinkPreview: els.qrLinkPreview.textContent,
    serviceWorkerController: Boolean(navigator.serviceWorker?.controller),
    installButtonVisible: !els.installBtn.classList.contains('d-none'),
    localModeStatus: els.localModeStatus?.textContent || '',
    localMonitorActive: needsLocalMonitor(),
    filterSettings: getFilterSettings(),
    peers: [...state.peers.values()].map((peer) => {
      const senderParams = peer.audioSender?.getParameters?.() || {};
      const encoding = senderParams.encodings?.[0] || {};
      return {
        peerId: peer.peerId,
        name: peer.name,
        polite: peer.polite,
        connectionState: peer.pc?.connectionState || null,
        iceConnectionState: peer.pc?.iceConnectionState || null,
        signalingState: peer.pc?.signalingState || null,
        remoteAudioPaused: peer.audio?.paused ?? null,
        remoteAudioHasStream: Boolean(peer.audio?.srcObject),
        remoteAudioTrackCount: peer.audio?.srcObject?.getAudioTracks?.().length || 0,
        senderTrackEnabled: peer.audioSender?.track?.enabled ?? null,
        senderTrackReadyState: peer.audioSender?.track?.readyState ?? null,
        senderMaxBitrate: encoding.maxBitrate || null,
      };
    }),
  };
}

window.__micRoomDebug = {
  snapshot: getDebugSnapshot,
  version: '2.1.0',
};

function wirePttEvents() {
  els.pttButton.addEventListener('pointerdown', handlePttStart);
  els.pttButton.addEventListener('pointerup', handlePttEnd);
  els.pttButton.addEventListener('pointerleave', handlePttEnd);
  els.pttButton.addEventListener('pointercancel', handlePttEnd);

  window.addEventListener('keydown', async (event) => {
    if (event.code !== 'Space' || event.repeat || isTextInputTarget(event.target)) return;
    if (state.talkMode !== 'push-to-talk' || !state.joined || state.roomRole === 'receiver') return;
    event.preventDefault();
    await handlePttStart(event);
  });

  window.addEventListener('keyup', (event) => {
    if (event.code !== 'Space' || isTextInputTarget(event.target)) return;
    if (state.talkMode !== 'push-to-talk') return;
    event.preventDefault();
    handlePttEnd(event);
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) handlePttEnd();
  });
}

function wireUi() {
  restoreSettings();
  setRoomStatus('elige rol');
  setLocalStatus('Detenido. Este modo no necesita sala ni clave.', 'secondary');
  updateButtons();
  updatePttUi();
  renderWorkflowMode();
  setMeter(0, 'Micrófono apagado');

  els.deviceModeSenderBtn.addEventListener('click', () => {
    if (state.joined || state.localPlaybackActive || state.roomSendActive) return;
    setDeviceMode('sender', { announce: true, togglePanel: true });
  });

  els.deviceModeReceiverBtn.addEventListener('click', () => {
    if (state.joined || state.localPlaybackActive || state.roomSendActive) return;
    setDeviceMode('receiver', { announce: true, togglePanel: true });
  });

  els.senderTarget.addEventListener('change', () => {
    if (state.joined || state.localPlaybackActive || state.roomSendActive) {
      els.senderTarget.value = state.senderTarget;
      return;
    }
    setSenderTarget(els.senderTarget.value, { announce: true });
  });

  els.connectBtn.addEventListener('click', joinRoom);
  els.disconnectBtn.addEventListener('click', leaveRoom);
  els.startMicBtn.addEventListener('click', startRoomMic);
  els.stopMicBtn.addEventListener('click', stopRoomMic);
  els.unlockAudioBtn.addEventListener('click', unlockAudio);
  els.localStartBtn.addEventListener('click', startLocalMode);
  els.localStopBtn.addEventListener('click', stopLocalMode);
  els.selectBtOutputBtn.addEventListener('click', selectBluetoothOutput);
  els.randomKeyBtn.addEventListener('click', async () => {
    els.roomKey.value = generateRandomKey();
    await refreshRoomArtifacts();
    renderWorkflowMode();
    showToast('Clave creada con éxito');
    log('Clave aleatoria generada.', 'success');
  });
  els.copyLinkBtn.addEventListener('click', copyRoomLink);
  els.copyQrLinkBtn.addEventListener('click', copyRoomLink);
  els.shareQrBtn.addEventListener('click', shareRoom);
  els.shareQrSecondaryBtn.addEventListener('click', shareRoom);
  els.installBtn.addEventListener('click', installApp);
  els.clearLogBtn.addEventListener('click', () => { els.logBox.textContent = ''; });

  els.displayName.addEventListener('change', () => {
    const safe = sanitizeName(els.displayName.value);
    els.displayName.value = safe;
    localStorage.setItem('mic-room-display-name', safe);
  });

  els.roomRole.addEventListener('change', () => {
    localStorage.setItem('mic-room-role', els.roomRole.value);
    setDeviceMode(els.roomRole.value === 'receiver' ? 'receiver' : 'sender', { announce: false, togglePanel: false });
  });

  els.roomKey.addEventListener('input', async () => {
    await refreshRoomArtifacts();
    renderWorkflowMode();
  });

  els.outputSelect.addEventListener('change', async () => {
    state.preferredSinkId = els.outputSelect.value || 'default';
    state.selectedOutputLabel = els.outputSelect.selectedOptions[0]?.textContent || 'Salida del sistema';
    await applyOutputSelection();
  });

  els.qualityPreset.addEventListener('change', async () => {
    localStorage.setItem('mic-room-quality-preset', els.qualityPreset.value);
    if (els.qualityPreset.value !== 'custom') {
      applyPresetSelection(els.qualityPreset.value);
      localStorage.setItem('mic-room-bitrate', String(getBitrateKbps()));
    }
    syncBitrateUi();
    await applyAudioQualityToAllPeers();
  });

  els.bitrateRange.addEventListener('input', () => {
    const matchingPreset = Object.entries(QUALITY_PRESETS).find(([, preset]) => preset.bitrateKbps === getBitrateKbps());
    els.qualityPreset.value = matchingPreset ? matchingPreset[0] : 'custom';
    localStorage.setItem('mic-room-quality-preset', els.qualityPreset.value);
    localStorage.setItem('mic-room-bitrate', String(getBitrateKbps()));
    syncBitrateUi();
  });

  els.bitrateRange.addEventListener('change', async () => {
    await applyAudioQualityToAllPeers();
    if (state.localPlaybackActive || state.roomSendActive) {
      log('La calidad nueva afecta el envío al instante. Si quieres otro perfil de captura, reinicia el micrófono.', 'info');
    }
  });

  [
    ['mic-room-filter-gain', els.filterGain],
    ['mic-room-filter-bass', els.filterBass],
    ['mic-room-filter-presence', els.filterPresence],
    ['mic-room-filter-treble', els.filterTreble],
  ].forEach(([storageKey, el]) => {
    el.addEventListener('input', () => {
      localStorage.setItem(storageKey, el.value);
      applyFiltersToNodes();
    });
  });

  els.talkMode.addEventListener('change', () => syncTalkModeState(true));
  els.localMonitorCheckbox.addEventListener('change', async () => {
    await syncLocalPlayback();
    renderWorkflowMode();
  });

  els.inputSelect.addEventListener('change', async () => {
    if (state.localPlaybackActive || state.roomSendActive) {
      await restartAudioPipeline('Se cambió el micrófono seleccionado.');
    }
  });

  if (navigator.mediaDevices?.addEventListener) {
    navigator.mediaDevices.addEventListener('devicechange', populateDevices);
  }

  window.addEventListener('beforeunload', () => {
    if (state.joined) {
      navigator.sendBeacon?.(`${state.serverOrigin}/api/leave`, new Blob([JSON.stringify({ roomId: state.roomId, peerId: state.peerId })], { type: 'application/json' }));
    }
  });

  wirePttEvents();
}

async function init() {
  wireUi();
  if (!navigator.mediaDevices?.getUserMedia || !window.RTCPeerConnection) {
    log('Este navegador no soporta getUserMedia o WebRTC.', 'error');
    setRoomStatus('navegador no compatible');
    setLocalStatus('Este navegador no soporta el audio necesario.', 'danger');
    return;
  }

  await registerPwa();
  await populateDevices();
  await refreshRoomArtifacts();
  renderWorkflowMode();
  if (state.serverOrigin !== window.location.origin) {
    log(`Usando señalización remota en ${state.serverOrigin}.`, 'warn');
  }
  log('Mic Room listo. Elige si este dispositivo será emisor o receptor y sigue solo esos pasos.', 'success');
}

init();
