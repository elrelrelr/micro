# Guía rápida de Mic Room

## Uso actual

Esta versión está enfocada solo en:

**teléfono como micrófono** → **parlante Bluetooth del mismo teléfono**

Las otras funciones quedaron ocultas para que el manejo sea más simple.

---

## Pasos

1. Conecta tu parlante o audífonos Bluetooth desde el sistema del teléfono.
2. Abre la web en el teléfono.
3. Revisa la sección **Salida del teléfono**.
4. Si el navegador lo permite, elige ahí el parlante Bluetooth.
5. Si aparece el aviso de que el navegador no soporta la selección directa, no es un fallo de la app:
   - deja el parlante Bluetooth conectado en el sistema,
   - úsalo como salida multimedia del teléfono,
   - la app intentará sacar tu voz como audio multimedia normal,
   - y luego habla desde la web.
6. Mira el bloque **Diagnóstico en vivo**:
   - si falla en **Permiso de micrófono**, revisa permisos del sitio y del navegador,
   - si falla en **Micrófono capturando**, el navegador no abrió el micro,
   - si falla en **Voz saliendo del emisor**, el micro está abierto pero aún no está hablando,
   - si falla en **Destino listo** o **Salida de audio**, el problema está en reproducción o en la ruta Bluetooth.
7. Usa una de estas dos opciones:
   - **Micrófono Bluetooth continuo**
   - **Pulsa para hablar por Bluetooth**
8. Ajusta **Audio, calidad y filtros** si quieres.

---

## Qué hace cada botón

### Micrófono Bluetooth continuo
Mantiene el micrófono abierto hasta que pulses **Detener Bluetooth local**.

### Pulsa para hablar por Bluetooth
Solo transmite mientras mantienes el dedo pulsando el botón.

### Detener Bluetooth local
Apaga el envío local al parlante Bluetooth.

---

## Si tu navegador dice que no soporta cambiar la salida

Eso significa que la web **no puede forzar** el cambio de parlante desde dentro del navegador.

Haz esto:

1. sal de la web si hace falta,
2. conecta el parlante Bluetooth en ajustes del teléfono,
3. confirma que música o audio normal del teléfono salga por ese parlante,
4. vuelve a la web,
5. usa **Pulsa para hablar por Bluetooth**.

---

## Ajustes disponibles

Puedes seguir usando:

- selección de micrófono
- preset de calidad
- bitrate manual
- Volumen
- Graves
- Presencia
- Agudos

---

## GitHub Pages

Puedes publicar así:

- la **raíz** del repo, usando `index.html` que redirige a `docs/`
- o directamente `docs/`

Para este flujo Bluetooth local, GitHub Pages sí basta.

---

## Qué fue probado

Última validación automática:

- **31 checks OK**
- **0 fallos**
- **2 advertencias esperadas**

Se probó:
- modo Bluetooth local por defecto,
- ocultamiento de funciones no usadas,
- diagnóstico en vivo,
- detección de permiso denegado,
- selector directo de salida cuando existe,
- fallback a Bluetooth del sistema cuando no existe,
- compatibilidad reproduciendo la voz como audio multimedia local,
- micrófono continuo,
- pulsa para hablar,
- calidad,
- bitrate,
- filtros.

Reporte:

- `test-results/report.md`
