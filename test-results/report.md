# Reporte de pruebas de Mic Room

- URL base: http://127.0.0.1:3000
- Inicio: 2026-09-10T15:46:47.271Z
- Fin: 2026-09-10T15:46:47.989Z
- Checks OK: 31
- Checks fallidos: 0
- Advertencias: 2

## Resultados
- ✅ **Servidor JS existe** — server.js cargado
- ✅ **HTML carga Bootstrap local**
- ✅ **HTML incluye manifest PWA**
- ✅ **HTML incluye layout responsive Bootstrap**
- ✅ **API health responde** — {"ok":true,"rooms":0,"time":"2026-09-10T15:46:47.284Z"}
- ✅ **Manifest PWA responde**
- ✅ **Service worker responde**
- ✅ **App arranca fija en modo Bluetooth local** — {"modeChosen":true,"deviceMode":"sender","senderTarget":"bluetooth-local"}
- ✅ **Se ocultan funciones de sala y receptor**
- ✅ **Siguen visibles los controles útiles para Bluetooth**
- ✅ **Diagnóstico en vivo aparece desde el inicio** — Resumen: el siguiente paso es pulsar hablar para que el navegador pida el micrófono.
- ✅ **Service worker se registra en entorno simulado**
- ✅ **Selector directo de Bluetooth actualiza la salida**
- ✅ **Selector directo deja el nombre del parlante**
- ✅ **Micrófono Bluetooth continuo inicia**
- ✅ **Micrófono continuo deja el track habilitado**
- ✅ **Modo compatibilidad Bluetooth usa audio multimedia local**
- ✅ **Diagnóstico marca permiso y captura cuando el micrófono arranca**
- ✅ **Diagnóstico resume que el emisor debería oírse al hablar** — Resumen: el emisor está hablando y debería oírse por Parlante Bluetooth del teléfono. La app lo está reproduciendo como audio multimedia normal para ayudar al Bluetooth.
- ✅ **Micrófono Bluetooth continuo se detiene**
- ✅ **Pulsa para hablar Bluetooth activa el micrófono al mantener pulsado**
- ✅ **Pulsa para hablar Bluetooth se detiene al soltar**
- ✅ **Calidad alta actualiza el bitrate local a 72 kbps**
- ✅ **Calidad personalizada actualiza el bitrate local a 80 kbps**
- ✅ **Los filtros de audio siguen disponibles en modo Bluetooth**
- ✅ **Sin selector directo, el botón queda desactivado y no obliga a WebRTC**
- ✅ **Sin soporte de cambio de salida, muestra instrucción de usar Bluetooth del sistema** — Se detectó “Parlante Bluetooth del sistema”, pero este navegador no puede cambiar la salida desde la web. Déjalo como salida multimedia del sistema del teléfono.
- ✅ **El Bluetooth local funciona aunque el navegador no deje elegir la salida**
- ✅ **Incluso sin selector, la voz se enruta como audio multimedia local**
- ✅ **El Bluetooth local también se detiene correctamente en navegadores limitados**
- ✅ **Diagnóstico identifica permiso denegado del micrófono**

## Advertencias
- ⚠️ Bluetooth real no se puede probar dentro de este sandbox porque no hay acceso a hardware Bluetooth.
- ⚠️ La salida Bluetooth final en el teléfono depende del navegador móvil y del sistema operativo reales; aquí validé la lógica, la UI y el fallback de salida por sistema.

## Errores
- Ninguno