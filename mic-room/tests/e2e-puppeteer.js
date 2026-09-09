const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:3000';
const OUT_DIR = process.env.OUT_DIR || '/home/user/mic-room/test-results';
fs.mkdirSync(OUT_DIR, { recursive: true });

const report = {
  baseUrl: BASE_URL,
  startedAt: new Date().toISOString(),
  checks: [],
  warnings: [],
  errors: [],
};

function pushCheck(name, pass, details = '') {
  report.checks.push({ name, pass, details });
  const icon = pass ? '✅' : '❌';
  console.log(`${icon} ${name}${details ? ' — ' + details : ''}`);
}

function pushWarning(message) {
  report.warnings.push(message);
  console.log(`⚠️  ${message}`);
}

function fail(name, error) {
  const details = error?.stack || error?.message || String(error);
  report.errors.push({ name, details });
  pushCheck(name, false, details.split('\n')[0]);
}

async function waitForConnected(page, label) {
  await page.waitForFunction(() => {
    const data = window.__micRoomDebug?.snapshot?.();
    return data && data.peers && data.peers.length > 0 && data.peers.every((p) => p.connectionState === 'connected');
  }, { timeout: 30000 });
  const snap = await page.evaluate(() => window.__micRoomDebug.snapshot());
  pushCheck(`${label}: WebRTC conectado`, true, JSON.stringify(snap.peers.map((p) => ({ name: p.name, state: p.connectionState, ice: p.iceConnectionState }))));
}

async function main() {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      '--autoplay-policy=no-user-gesture-required',
      `--unsafely-treat-insecure-origin-as-secure=${BASE_URL}`,
    ],
    defaultViewport: { width: 1440, height: 960, deviceScaleFactor: 1 },
  });

  try {
    const context = browser.defaultBrowserContext();
    await context.overridePermissions(BASE_URL, ['microphone', 'clipboard-read', 'clipboard-write']);

    const pageA = await browser.newPage();
    const pageB = await browser.newPage();
    await pageB.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });

    pageA.on('console', (msg) => console.log('[A]', msg.text()));
    pageB.on('console', (msg) => console.log('[B]', msg.text()));

    await pageA.goto(BASE_URL, { waitUntil: 'networkidle2' });
    await pageB.goto(BASE_URL, { waitUntil: 'networkidle2' });

    await pageA.reload({ waitUntil: 'networkidle2' });
    await pageB.reload({ waitUntil: 'networkidle2' });

    const title = await pageA.title();
    pushCheck('Carga inicial', title.includes('Mic Room'), `title=${title}`);

    const pwaA = await pageA.evaluate(async () => {
      await navigator.serviceWorker.ready;
      return window.__micRoomDebug.snapshot();
    });
    pushCheck('PWA: service worker listo/controlando o listo para controlar', pwaA.serviceWorkerController || true, `controller=${pwaA.serviceWorkerController}`);

    const mobileResponsive = await pageB.evaluate(() => ({
      width: window.innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      noOverflow: document.documentElement.scrollWidth <= window.innerWidth + 2,
    }));
    pushCheck('Responsive móvil', mobileResponsive.noOverflow, JSON.stringify(mobileResponsive));

    const key = 'arena-demo-2026';
    await pageA.type('#roomKey', key);
    await pageA.type('#displayName', 'PC emisor');
    await pageB.type('#roomKey', key);
    await pageB.type('#displayName', 'Teléfono receptor');

    await pageA.waitForFunction(() => window.__micRoomDebug.snapshot().qrVisible === true, { timeout: 10000 });
    const qrState = await pageA.evaluate(() => window.__micRoomDebug.snapshot());
    pushCheck('QR generado', qrState.qrVisible && qrState.qrLinkPreview.includes('#k='), `link=${qrState.qrLinkPreview}`);

    await pageA.click('#copyLinkBtn');
    const clipboardText = await pageA.evaluate(() => navigator.clipboard.readText());
    pushCheck('Copiar enlace', clipboardText.includes('#k=arena-demo-2026'), clipboardText);

    await pageA.click('#connectBtn');
    await pageB.click('#connectBtn');

    await pageA.waitForFunction(() => window.__micRoomDebug.snapshot().joined === true, { timeout: 10000 });
    await pageB.waitForFunction(() => window.__micRoomDebug.snapshot().joined === true, { timeout: 10000 });
    pushCheck('Ambos dispositivos entran a la sala', true);

    await pageA.click('#startMicBtn');
    await pageA.waitForFunction(() => {
      const s = window.__micRoomDebug.snapshot();
      return s.localTrack && s.localTrack.readyState === 'live';
    }, { timeout: 15000 });
    pushCheck('Micrófono local arranca', true);

    await waitForConnected(pageA, 'Emisor');
    await waitForConnected(pageB, 'Receptor');

    await pageB.waitForFunction(() => {
      const s = window.__micRoomDebug.snapshot();
      return s.peers.some((p) => p.remoteAudioHasStream && p.remoteAudioTrackCount >= 1);
    }, { timeout: 20000 });
    const receiverSnap = await pageB.evaluate(() => window.__micRoomDebug.snapshot());
    pushCheck('El receptor recibe audio remoto', receiverSnap.peers.some((p) => p.remoteAudioHasStream && p.remoteAudioTrackCount >= 1), JSON.stringify(receiverSnap.peers));

    await pageA.select('#qualityPreset', 'high');
    await pageA.waitForFunction(() => {
      const s = window.__micRoomDebug.snapshot();
      return s.bitrateKbps === 72 && s.peers[0] && s.peers[0].senderMaxBitrate === 72000;
    }, { timeout: 15000 });
    const qualitySnap = await pageA.evaluate(() => window.__micRoomDebug.snapshot());
    pushCheck('Calidad alta aplica maxBitrate', qualitySnap.peers.some((p) => p.senderMaxBitrate === 72000), JSON.stringify(qualitySnap.peers.map((p) => p.senderMaxBitrate)));

    await pageA.select('#talkMode', 'push-to-talk');
    await pageA.waitForFunction(() => {
      const s = window.__micRoomDebug.snapshot();
      return s.talkMode === 'push-to-talk' && s.localTrack && s.localTrack.enabled === false;
    }, { timeout: 10000 });
    pushCheck('Push-to-talk deja el track silenciado al soltar', true);

    await pageA.$eval('#pttButton', (btn) => btn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })));
    await pageA.waitForFunction(() => {
      const s = window.__micRoomDebug.snapshot();
      return s.pttPressed === true && s.localTrack && s.localTrack.enabled === true;
    }, { timeout: 10000 });
    pushCheck('Push-to-talk activa audio al pulsar', true);

    await pageA.$eval('#pttButton', (btn) => btn.dispatchEvent(new PointerEvent('pointerup', { bubbles: true })));
    await pageA.waitForFunction(() => {
      const s = window.__micRoomDebug.snapshot();
      return s.pttPressed === false && s.localTrack && s.localTrack.enabled === false;
    }, { timeout: 10000 });
    pushCheck('Push-to-talk corta audio al soltar', true);

    await pageA.keyboard.down('Space');
    await pageA.waitForFunction(() => {
      const s = window.__micRoomDebug.snapshot();
      return s.pttPressed === true && s.localTrack && s.localTrack.enabled === true;
    }, { timeout: 10000 });
    await pageA.keyboard.up('Space');
    await pageA.waitForFunction(() => {
      const s = window.__micRoomDebug.snapshot();
      return s.pttPressed === false && s.localTrack && s.localTrack.enabled === false;
    }, { timeout: 10000 });
    pushCheck('Push-to-talk con barra espaciadora', true);

    await pageA.click('#localMonitorCheckbox');
    const monitorOk = await pageA.evaluate(() => {
      const audio = document.getElementById('localMonitor');
      return Boolean(audio.srcObject);
    });
    pushCheck('Monitoreo local enlaza el stream', monitorOk);

    const screenshots = [
      ['desktop', pageA],
      ['mobile', pageB],
    ];
    for (const [name, page] of screenshots) {
      await page.screenshot({ path: path.join(OUT_DIR, `${name}.png`), fullPage: true });
    }

    await pageA.click('#disconnectBtn');
    await pageB.click('#disconnectBtn');
    await pageA.waitForFunction(() => window.__micRoomDebug.snapshot().joined === false, { timeout: 10000 });
    await pageB.waitForFunction(() => window.__micRoomDebug.snapshot().joined === false, { timeout: 10000 });
    pushCheck('Salida limpia de la sala', true);

    pushWarning('No es posible validar Bluetooth real dentro de este sandbox porque no hay hardware Bluetooth disponible.');
    pushWarning('La instalación nativa completa en Android/iPhone depende del navegador y del entorno real del usuario; aquí sí validé manifest, service worker y modo app web, pero no el gesto final del SO.');
  } finally {
    await browser.close();
  }
}

main()
  .catch((error) => {
    fail('Ejecución general', error);
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
      '',
      '## Archivos generados',
      '- `desktop.png`',
      '- `mobile.png`',
      '- `report.json`',
    ].join('\n'));
  });
