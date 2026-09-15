# 📖 Lector Inglés - Extensión para Chrome y Firefox (v1.3.0)

Una extensión de navegador moderna y de alto rendimiento diseñada para aprender inglés de manera natural mientras navegas y lees artículos, noticias o documentación en cualquier sitio web.

Compatible al 100% con **Manifest V3** en **Google Chrome, Mozilla Firefox (incluyendo Firefox para Android), Brave, Microsoft Edge y Opera**.

---

## ✨ Características Principales

### 0. ⚡ Switch Rápido ON / OFF y Optimización Móvil
- **Interruptor rápido en popup:** Pausa o reactiva instantáneamente la traducción en todas las pestañas con un solo clic. Muestra una etiqueta visual `"OFF"` en el icono de la barra cuando está desactivada.
- **Soporte Táctil Completo para Móviles (Firefox Android / Chrome):**
  - Detección de selección táctil (long-press y ajuste de pines).
  - Tarjetas flotantes responsivas que respetan el ancho de pantalla móvil.
  - Botones y controles con área de toque ergonómica (mínimo 44–50px).

### 1. 🔤 Lectura Inteligente en Cualquier Página Web
- **Modo Palabra (1 a 3 palabras):**
  - **Traducción precisa:** Muestra el significado contextual en español al instante.
  - **Fonética IPA Real:** Transcripción fonética verificada (ej: `us` -> `[ʌs]`). Si una palabra no dispone de fonética genuina, no muestra corchetes de relleno.
  - **Pronunciación Nativa (🔊):** Reproducción con voces nativas en inglés (`en-US`, `en-GB`), evitando que navegadores en español distorsionen la voz.
  - **Botón Esmeralda "+ Agregar a vocabulario":** Guarda la palabra en tu lista con un solo toque. Si la palabra ya existe en tu vocabulario, se muestra como un texto informativo no interactivo (`✓ En tu vocabulario`), impidiendo acciones duplicadas o desmarques accidentales.
  - **Aislamiento Shadow DOM:** La interfaz flotante no interfiere ni se ve afectada por el CSS o scripts del sitio web que estás visitando.

- **Modo Líneas y Párrafos Completos (*Solo traducción*):**
  - Al seleccionar una frase completa, línea o párrafo extenso (> 3 palabras), se despliega una tarjeta panorámica optimizada para lectura.
  - Muestra la **traducción fluida y completa**.
  - Botón de audio (🔊) para escuchar la pronunciación del fragmento completo.
  - Botón de copiar (📋) con confirmación visual instantánea (`✓`).

---

### 2. 🎛️ Panel de Control Emergente (Popup con Tabs SVG)

La ventana emergente de la extensión cuenta con un diseño ergonómico de 425×595 px e iconos vectoriales SVG limpios organizados en 3 pestañas:

#### 📑 Tab 1: Vocabulario
- **Búsqueda en tiempo real:** Filtra palabras o significados al escribir.
- **Filtro por página web:**
  - **Todas (`N`):** Muestra el catálogo completo de palabras.
  - **Esta página (`N`):** Detecta automáticamente el dominio web activo (ej: `wikipedia.org`, `medium.com`, etc.) y filtra solo las palabras guardadas en ese sitio.
- **Limpiar página:** Borra con un solo clic únicamente las palabras capturadas en el sitio web actual.
- **Pronunciación y contexto:** Escucha cada palabra guardada y revisa la oración exacta de la página donde la encontraste.

#### 🏆 Tab 2: Quiz Interactivo
- **Exámenes de Opción Múltiple:** Genera rondas de práctica de 4 opciones (*A, B, C, D*) con palabras de tu vocabulario y distractores inteligentes.
- **Cambio de Opción:** Puedes seleccionar una opción y cambiar de opinión libremente tocando otra antes de confirmar.
- **Botón Comprobar:** Evalúa tu selección:
  - Si aciertas: se ilumina en verde esmeralda y reproduce la pronunciación nativa.
  - Si fallas: marca tu opción en rojo y resalta en verde la respuesta correcta para facilitar el aprendizaje.
- **Sin Scroll:** La ventana está optimizada para que las 4 opciones y el botón de acción quepan completamente a la vista.
- **Pantalla de Resultados con Puntuación:**
  - Círculo de puntuación con **porcentaje de aciertos** (ej. `80%`).
  - Tarjetas de estadísticas: `Correctas` y `Por mejorar`.
  - Botones directos: **"Ver mi Vocabulario"** y **"Reiniciar Quiz"**.

#### ⚙️ Tab 3: Configuración
- **Gestión por sitio web:** Muestra el dominio actual y la cantidad de palabras registradas en él.
- **Borrado Automático Programado:** Define una política de retención para mantener tu vocabulario limpio y relevante (*Nunca*, *7 días*, *30 días*, *90 días*). Incluye botón para purgar palabras vencidas al instante.
- **Exportación en múltiples formatos:**
  - 📥 **CSV (Anki / Excel):** Listo para importar como barajas de estudio en Anki o abrir en hojas de cálculo.
  - 💾 **JSON:** Copia de seguridad completa estructurada.
  - 🎮 **Quiz Autónomo en HTML:** Descarga un archivo interactivo independiente que funciona sin conexión en cualquier navegador, ordenador o teléfono móvil.
- **Zona de peligro:** Opción para vaciar todo el vocabulario con confirmación de seguridad.

---

## ⚡ Rendimiento y Seguridad

- **Caché Multinivel de Ultra-Baja Latencia:**
  1. *Nivel 1:* Diccionario local sin conexión (`offline_dict.js`) con respuesta inmediata en 0 ms.
  2. *Nivel 2:* Memoria en sesión (`clientCache`) en la pestaña activa.
  3. *Nivel 3:* Fallback con APIs de traducción optimizadas en segundo plano (`background.js`).
- **Pre-carga No Bloqueante:** Utiliza `requestIdleCallback` para escanear palabras clave sin provocar tirones o bloqueos de hilo (*reflows*) en páginas web gigantescas.
- **Seguridad contra XSS:** Todas las cadenas dinámicas se escapan de forma estricta (`escapeHtml`).
- **Cumplimiento estricto de Manifest V3:** Sin uso de `eval()`, scripts en línea ni dependencias externas pesadas.

---

## 🚀 Instalación para Desarrollo y Pruebas Locales

### En Google Chrome / Brave / Edge / Opera:
1. Asegúrate de tener el manifiesto para Chrome ejecutando:
   ```bash
   npm run chrome
   ```
2. Abre tu navegador y dirígete a `chrome://extensions/`.
3. En la esquina superior derecha, activa el **"Modo de desarrollador"**.
4. Haz clic en el botón **"Cargar descomprimida"**.
5. Selecciona la carpeta de este proyecto (`Plugin-navegador`).
6. *Fija (Pin) el icono en la barra del navegador para acceder cómodamente al popup.*

### En Mozilla Firefox:
1. Cambia el manifiesto para Firefox ejecutando:
   ```bash
   npm run firefox
   ```
2. Abre Firefox y escribe `about:debugging#/runtime/this-firefox` en la barra de direcciones.
3. Haz clic en **"Cargar complemento temporal..."**.
4. Selecciona el archivo `manifest.json` dentro de esta carpeta.

---

## 🧪 Cómo Probar la Extensión

Hemos preparado un entorno de prueba en modo oscuro listo para usar:
1. Abre el archivo [test_demo.html](file:///Users/alfredo/Desktop/My-working-place/Plugin-navegador/test_demo.html) en tu navegador.
2. **Prueba 1 (Palabras):** Selecciona palabras como `us`, `weeks` o `software`. Observa la tarjeta, la fonética real y guárdala con el botón verde. Verás que se transforma en el distintivo `✓ En tu vocabulario`.
3. **Prueba 2 (Párrafos):** Selecciona una línea completa o un párrafo entero para ver la tarjeta panorámica de *solo traducción* con botón de audio y botón de copia.
4. **Prueba 3 (Quiz):** Abre el popup en la barra de herramientas, ve al tab **Quiz**, selecciona opciones, cámbialas libremente y pulsa *Comprobar respuesta*.

---

## 📦 Generación de Paquetes Finales para Distribución

Para generar los archivos `.zip` limpios y listos para subir a las tiendas oficiales o compartir:

```bash
# Compilar paquetes para ambos navegadores
npm run build

# O individualmente:
npm run build:chrome    # Genera dist/lector-ingles-chrome-v1.3.0.zip
npm run build:firefox   # Genera dist/lector-ingles-firefox-v1.3.0.zip
```

Los archivos generados se guardan en la carpeta `/dist` e incluyen exclusivamente el código necesario para producción (sin `.git`, sin `node_modules`, sin archivos de prueba ni documentación).

---

## 🌐 Publicación y Distribución

Para consultar los requisitos de las tiendas, los textos listos para copiar y pegar, las justificaciones de permisos y la plantilla de política de privacidad, consulta el documento:
👉 **[CHROMEWEBSTORE.md](file:///Users/alfredo/Desktop/My-working-place/Plugin-navegador/CHROMEWEBSTORE.md)**

### Resumen de Opciones de Distribución:
1. **Chrome Web Store:**
   - Requiere cuenta de desarrollador en Google ($5 USD pago único de por vida).
   - Se sube `dist/lector-ingles-chrome-v1.3.0.zip`.
   - Revisión en 1-3 días hábiles.
2. **Mozilla Firefox Add-ons (AMO):**
   - Cuenta de desarrollador **100% gratuita**.
   - Se sube `dist/lector-ingles-firefox-v1.3.0.zip`.
   - Permite publicación en catálogo público o distribución autogestionada (Mozilla firma tu extensión en minutos y te entrega un instalable `.xpi`).
3. **Distribución Directa (Amigos / Alumnos / Uso Interno):**
   - Comparte la carpeta del proyecto para instalar en Modo Desarrollador con 1 clic sin coste ni esperas.

---

## 📁 Estructura del Proyecto

```
Plugin-navegador/
├── manifest.json              # Manifiesto activo sincronizado
├── manifest.chrome.json       # Manifiesto específico para Chrome (Service Worker)
├── manifest.firefox.json      # Manifiesto específico para Firefox (Background scripts)
├── background.js              # Script en segundo plano (traducción, caché y borrado)
├── content.js                 # Script inyectado con Shadow DOM (tarjetas flotantes y audio)
├── offline_dict.js            # Diccionario integrado inglés-español con fonética IPA
├── build-dist.js              # Script automatizado para empaquetar los ZIPs de distribución
├── switch-browser.js          # Utilidad para alternar manifiestos entre Chrome y Firefox
├── package.json               # Configuración del proyecto y scripts de build
├── test_demo.html             # Página de demostración para pruebas
├── README.md                  # Documentación general del proyecto (este archivo)
├── CHROMEWEBSTORE.md          # Metadatos, justificaciones de permisos y privacidad para tiendas
├── icons/                     # Iconos en resolución estándar
│   ├── icon-16.png            # 16×16 px
│   ├── icon-48.png            # 48×48 px
│   └── icon-128.png           # 128×128 px
├── popup/                     # Interfaz emergente de la extensión
│   ├── popup.html             # Estructura con pestañas Vocabulario, Quiz y Configuración
│   ├── popup.css              # Estilos compactos y responsivos sin scroll
│   └── popup.js               # Lógica del Quiz, filtros por página, exportaciones y audio
└── dist/                      # Paquetes ZIP de producción generados con npm run build
    ├── lector-ingles-chrome-v1.3.0.zip
    └── lector-ingles-firefox-v1.3.0.zip
```
