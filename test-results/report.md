# Reporte de pruebas de Mic Room

- URL base: http://127.0.0.1:3000
- Inicio: 2026-09-09T21:21:47.718Z
- Fin: 2026-09-09T21:21:48.564Z
- Checks OK: 36
- Checks fallidos: 0
- Advertencias: 3

## Resultados
- ✅ **Servidor JS existe** — server.js cargado
- ✅ **HTML carga Bootstrap local**
- ✅ **HTML incluye manifest PWA**
- ✅ **HTML incluye layout responsive Bootstrap**
- ✅ **API health responde** — {"ok":true,"rooms":0,"time":"2026-09-09T21:21:47.733Z"}
- ✅ **Manifest PWA responde**
- ✅ **Service worker responde**
- ✅ **App inicializa en ambos entornos**
- ✅ **El emisor se puede seleccionar**
- ✅ **Service worker se registra en entorno simulado**
- ✅ **QR se genera al escribir clave**
- ✅ **Huella de sala se calcula** — 83bf59…d0ab
- ✅ **El enlace compartido deja listo al receptor**
- ✅ **Copiar enlace funciona** — http://169.254.0.21:3000/#k=arena-demo-2026&mode=receiver&rx=pc
- ✅ **Selector de salida Bluetooth actualiza la salida**
- ✅ **Modo local simple inicia sin sala**
- ✅ **Modo local continuo deja el track habilitado**
- ✅ **Modo local simple se detiene**
- ✅ **Pulsa para hablar Bluetooth activa el micrófono mientras se mantiene pulsado**
- ✅ **Pulsa para hablar Bluetooth se detiene al soltar**
- ✅ **El receptor se puede seleccionar**
- ✅ **El emisor queda esperando al receptor** — esperando receptor
- ✅ **Ambos dispositivos entran a la sala**
- ✅ **El receptor usa flujo separado**
- ✅ **El emisor ve al receptor conectado**
- ✅ **Micrófono local arranca**
- ✅ **WebRTC conecta ambos peers**
- ✅ **El receptor recibe stream remoto** — [{"peerId":"e8fbd417-9236-4e96-974b-034a22e2e952","name":"PC emisor","polite":false,"connectionState":"connected","iceConnectionState":"connected","signalingState":"stable","remoteAudioPaused":false,"remoteAudioHasStream":true,"remoteAudioTrackCount":1,"senderTrackEnabled":null,"senderTrackReadyState":null,"senderMaxBitrate":null}]
- ✅ **Calidad alta aplica bitrate 72 kbps**
- ✅ **Calidad personalizada aplica bitrate 80 kbps**
- ✅ **Push-to-talk silencia al soltar**
- ✅ **Push-to-talk activa el track al pulsar**
- ✅ **Push-to-talk vuelve a silenciar al soltar**
- ✅ **Push-to-talk funciona con barra espaciadora**
- ✅ **Monitoreo local se activa**
- ✅ **Salida limpia de la sala**

## Advertencias
- ⚠️ No había IP local detectable para validar el reemplazo automático de localhost por IP.
- ⚠️ Bluetooth real no se puede probar dentro de este sandbox porque no hay acceso a hardware Bluetooth.
- ⚠️ La instalación completa en Android/iPhone depende del navegador y del sistema operativo reales; aquí validé manifest, service worker, assets PWA y lógica de UI.

## Errores
- Ninguno