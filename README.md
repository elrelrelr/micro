# Mic Room

Mic Room convierte tu teléfono en micrófono y deja escuchar la voz en:

- un **PC** por Wi‑Fi / Internet,
- **otro teléfono** por Wi‑Fi / Internet,
- o un **parlante / audífono Bluetooth** del mismo dispositivo.

## Flujo actual

La interfaz quedó más simple y compacta:

1. elegir **Emisor** o **Receptor**,
2. elegir el destino,
3. escribir la clave si es por red,
4. pulsar **Crear / conectar sala**,
5. esperar a que el otro dispositivo aparezca en **Dispositivos conectados**,
6. hablar,
7. mover filtros en tiempo real.

Las secciones de **Emisor** y **Receptor** son desplegables y arrancan contraídas.

## Roles

### Emisor
- usa el micrófono,
- ajusta calidad y filtros,
- y envía la voz.

### Receptor
- solo recibe el audio,
- elige la salida,
- y no necesita configurar micrófono.

## Destinos del emisor

### PC por red
Usa clave + sala + QR/enlace.

### Otro teléfono por red
Usa clave + sala + QR/enlace.

> Ese otro teléfono receptor también puede reproducir por Bluetooth si tiene audífonos o parlante Bluetooth emparejado en ese mismo teléfono.

### Bluetooth local
No usa clave ni sala.

## Alertas de éxito
La app muestra avisos pequeños cuando una acción sale bien, por ejemplo:

- **Emisor seleccionado**
- **Receptor seleccionado**
- **Clave creada con éxito**
- **Sala creada con éxito**
- **Receptor conectado con éxito**
- **Micrófono activado con éxito**
- **Salida Bluetooth seleccionada**

## Ajustes disponibles

### Emisor
- selección de micrófono
- preset de calidad
- bitrate manual
- filtros con sliders:
  - Volumen
  - Graves
  - Presencia
  - Agudos
- push-to-talk
- monitoreo local opcional

### Receptor
- selección de salida de audio
- botón para elegir salida Bluetooth si el navegador lo soporta
- botón **Reactivar audio** si el navegador bloquea la reproducción automática

## GitHub Pages

Mic Room ya incluye dos formas para GitHub Pages:

- `index.html` en la **raíz** del proyecto, que redirige a `docs/`
- `docs/` con la interfaz lista para publicar

### Importante
- si publicas la **raíz** del repositorio, GitHub Pages abrirá `index.html` y te mandará a `docs/`
- si publicas la carpeta **/docs**, también funciona
- el modo **Bluetooth local** sí puede vivir como sitio estático
- el modo **sala por clave** necesita además un servidor de señalización.

La interfaz soporta un servidor externo con `?signal=`. Ejemplo:

```text
https://TU-USUARIO.github.io/TU-REPO/?signal=https://tu-servidor-node.example.com
```

Ese parámetro también se conserva en el enlace compartido al receptor.

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

## Validación actual

Prueba automatizada más reciente:

```bash
NODE_PATH=/tmp/microom-test-tools/node_modules node /home/user/mic-room/tests/simulated-browser-tests.js
```

Resultado:

- **33 checks OK**
- **0 fallos**
- **3 advertencias esperadas**

Se validó:
- selección de emisor y receptor,
- QR y enlace preparado para receptor,
- Bluetooth local simulado,
- sala por clave,
- aparición del receptor en la lista,
- WebRTC y audio remoto,
- calidad / bitrate,
- push-to-talk,
- monitoreo local,
- salida limpia.

## Limitaciones reales

- La web no empareja Bluetooth por sí sola; el emparejamiento se hace en el sistema.
- GitHub Pages por sí solo no reemplaza el servidor de señalización.
- La configuración actual usa `iceServers: []`, así que está pensada sobre todo para redes con ruta directa.
- Bluetooth real e instalación final en móviles reales no se pueden probar físicamente dentro de este sandbox.
