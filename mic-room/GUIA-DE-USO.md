# Guía rápida de Mic Room

## Orden correcto

1. toca **Emisor** o **Receptor**,
2. elige el destino,
3. si es por red, escribe la clave,
4. pulsa **Crear / conectar sala**,
5. espera a que el otro dispositivo aparezca en **Dispositivos conectados**,
6. habla,
7. ajusta filtros en tiempo real si quieres.

---

## Emisor

### Enviar a un PC por red
1. Toca **Emisor**.
2. Elige **Un PC por la misma red Wi‑Fi / Internet**.
3. Escribe una clave.
4. Comparte el enlace o el QR.
5. Espera a que el PC aparezca en **Dispositivos conectados**.
6. Pulsa **Mantener micrófono encendido** o **Hablar ahora**.

### Enviar a otro teléfono por red
1. Toca **Emisor**.
2. Elige **Otro teléfono por la misma red Wi‑Fi / Internet**.
3. Escribe una clave.
4. Comparte el enlace o el QR.
5. En el otro teléfono, ábrelo como **Receptor**.
6. Espera a que ese teléfono aparezca en **Dispositivos conectados**.
7. Habla.

> Importante: entre dos teléfonos, la web se conecta por **red**, no por Bluetooth directo entre navegadores.
>
> Si quieres Bluetooth, el teléfono receptor puede sacar el audio por sus propios audífonos o parlante Bluetooth emparejados en ese mismo teléfono.

### Bluetooth local
1. Toca **Emisor**.
2. Elige **Parlante / audífonos Bluetooth de este mismo dispositivo**.
3. Empareja el Bluetooth en el sistema.
4. Elige la salida de audio.
5. Pulsa **Hablar por Bluetooth**.

> Aquí no se usa clave ni sala.

---

## Receptor

1. Toca **Receptor**.
2. Abre el enlace compartido o escribe la misma clave del emisor.
3. Pulsa **Conectar como receptor**.
4. Elige la salida de audio.
5. Si no suena, pulsa **Reactivar audio**.
6. Espera a que el emisor active el micrófono.

---

## Alertas pequeñas

Si algo salió bien verás avisos pequeños, por ejemplo:

- **Emisor seleccionado**
- **Receptor seleccionado**
- **Sala creada con éxito**
- **Receptor conectado con éxito**
- **Micrófono activado con éxito**

---

## Filtros y calidad

Desde el emisor puedes mover en tiempo real:

- **Volumen**
- **Graves**
- **Presencia**
- **Agudos**

También puedes cambiar:

- preset de calidad,
- bitrate manual,
- push-to-talk.

---

## GitHub Pages

Si quieres publicar la interfaz en GitHub Pages, ahora tienes 2 opciones:

- publicar la **raíz** del repo, usando `index.html` que redirige a `docs/`
- o publicar directamente la carpeta `docs/`

### Ojo
- el modo **Bluetooth local** puede funcionar como sitio estático,
- el modo **sala por clave** necesita además un servidor de señalización.

Ejemplo:

```text
https://TU-USUARIO.github.io/TU-REPO/?signal=https://tu-servidor-node.example.com
```

---

## Qué fue probado

Última validación automática:

- **33 checks OK**
- **0 fallos**
- **3 advertencias esperadas**

Se probó:
- selección de emisor y receptor,
- Bluetooth local simulado,
- flujo por sala,
- QR,
- enlace para receptor,
- aparición del receptor,
- WebRTC,
- audio remoto,
- calidad,
- push-to-talk,
- monitoreo local,
- salida limpia.

Reporte:

- `test-results/report.md`
