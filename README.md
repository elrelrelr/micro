# Mic Room

Mic Room quedó enfocado ahora en un uso muy simple:

**tu teléfono como micrófono** → **audio por tu parlante o audífonos Bluetooth ya emparejados en ese mismo teléfono**.

## Qué hace esta versión

La interfaz publicada oculta las funciones de sala, receptor, QR y conexión por red para concentrarse en el flujo Bluetooth local.

El proyecto todavía conserva el código de sala en el repositorio, pero en esta versión visible de la web quedó escondido para no confundir.

## Flujo actual

1. conecta el parlante Bluetooth desde el sistema del teléfono,
2. abre la web,
3. si el navegador lo permite, elige la salida Bluetooth desde la app,
4. si no lo permite, deja el parlante Bluetooth como salida multimedia del sistema,
5. usa **Micrófono Bluetooth continuo** o **Pulsa para hablar por Bluetooth**,
6. ajusta calidad y filtros si quieres.

## Controles principales

### Micrófono Bluetooth continuo
Deja el micrófono abierto hasta que pulses **Detener Bluetooth local**.

### Pulsa para hablar por Bluetooth
Abre el micrófono solo mientras mantienes el botón pulsado.

### Salida Bluetooth
- Si el navegador soporta selector directo, puedes cambiar la salida desde la web.
- Si no lo soporta, la app te dirá que uses el Bluetooth del sistema del teléfono.
- Ver tu parlante en la lista **no siempre significa** que el navegador pueda cambiarlo por sí mismo.

## Ajustes disponibles

- selección de micrófono
- preset de calidad
- bitrate manual
- filtros con sliders:
  - Volumen
  - Graves
  - Presencia
  - Agudos
- medidor de nivel del micrófono

## GitHub Pages

Para este modo Bluetooth local, GitHub Pages sí sirve bien como sitio estático.

El proyecto ya incluye:

- `index.html` en la **raíz** del proyecto, que redirige a `docs/`
- `docs/` con la interfaz lista para publicar

### Publicación
- si publicas la **raíz** del repositorio, GitHub Pages abrirá `index.html` y te mandará a `docs/`
- si publicas directamente **/docs**, también funciona

## Arranque local

### Windows
Haz doble clic en:

- `INICIAR-MIC-ROOM.bat`

### Manual
```bash
cd mic-room
node server.js
```

Abre:

- en el PC servidor: `http://localhost:3000`
- en otros dispositivos: `http://IP-DE-TU-PC:3000`

> Para el flujo Bluetooth local no hace falta sala ni clave.

## Validación actual

Prueba automatizada más reciente:

```bash
NODE_PATH=/tmp/microom-test-tools/node_modules node /home/user/mic-room/tests/simulated-browser-tests.js
```

Resultado:

- **25 checks OK**
- **0 fallos**
- **2 advertencias esperadas**

Se validó:
- arranque directo en modo Bluetooth local,
- ocultamiento de funciones de sala y receptor,
- selector directo de salida cuando el navegador lo soporta,
- mensaje de fallback cuando el navegador no soporta cambiar la salida,
- micrófono Bluetooth continuo,
- botón **Pulsa para hablar por Bluetooth**,
- calidad / bitrate,
- filtros de audio,
- compatibilidad del flujo local incluso sin WebRTC.

## Limitaciones reales

- La web no empareja Bluetooth por sí sola; el emparejamiento se hace en el sistema.
- Muchos navegadores móviles **no** permiten cambiar la salida Bluetooth desde la web.
- En esos casos, debes dejar el parlante Bluetooth como salida multimedia del sistema del teléfono.
- Bluetooth real no se puede probar físicamente dentro de este sandbox.

## Archivos importantes

- `public/index.html` — interfaz Bluetooth simplificada
- `public/app.js` — lógica del modo Bluetooth local
- `public/styles.css` — estilos
- `docs/` — copia lista para GitHub Pages
- `mic-room.zip` — paquete descargable actualizado
- `test-results/report.md` — último reporte de pruebas
