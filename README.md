# 📖 Lector Inglés - Extensión para Chrome y Firefox

Una extensión de navegador moderna diseñada para ayudarte a aprender inglés mientras lees cualquier página web o artículo.

Inspirada en el flujo de estudio de vocabulario: selecciona cualquier palabra o frase en inglés que no entiendas para ver al instante su pronunciación nativa, transcripción fonética, traducción al español y guardarla con un clic en tu lista de estudio (**Aprender**) o marcarla como dominada (**Aprendido**).

---

## ✨ Características Principales

1. **Popup flotante instantáneo:**
   - 🔊 **Pronunciación de audio:** Escucha la pronunciación con voz nativa en inglés.
   - 🔤 **Fonética:** Guía de pronunciación (ej: `[wiːks]`).
   - 🌐 **Traducción al español:** Traducción precisa y contextual.
   - 🟢 **Aprendido:** Marca la palabra como sabida/dominada.
   - 🟡 **Aprender:** Guarda la palabra en tu lista de vocabulario para repasar.
   - 🛡️ **Aislamiento Shadow DOM:** Ningún estilo de la página web romperá el diseño del popup.

2. **Panel de control de la extensión (Popup en la barra del navegador):**
   - **Por aprender:** Lista de todas tus palabras pendientes de estudio con su frase de contexto original.
   - **Aprendidas:** Registro de palabras que ya dominas.
   - **Modo Práctica / Flashcards:** Repasa tu vocabulario con tarjetas interactivas de memoria.
   - **Buscador en tiempo real:** Encuentra cualquier palabra en tu vocabulario.
   - **Exportación:** Descarga tu vocabulario en formato **CSV** (compatible con Anki y Excel) o en **JSON**.

---

## 🚀 Cómo instalar en Google Chrome (y navegadores Chromium: Edge, Brave, Opera)

1. Abre Google Chrome y ve a `chrome://extensions/` en la barra de direcciones.
2. En la esquina superior derecha, activa el interruptor **"Modo de desarrollador"** (Developer mode).
3. Haz clic en el botón **"Cargar descomprimida"** (Load unpacked).
4. Selecciona la carpeta de este proyecto:
   `/Users/alfredo/Desktop/My-working-place/Plugin-navegador`
5. ¡Listo! Verás el icono de **Lector Inglés** en la lista de extensiones. Asegúrate de fijar el icono (pin) en la barra de herramientas para acceder cómodamente a tu panel de vocabulario.

---

## 🦊 Cómo instalar en Mozilla Firefox

1. Abre una terminal en esta carpeta y ejecuta:
   ```bash
   npm run firefox
   # O si no tienes npm: node switch-browser.js firefox
   ```
2. Abre Firefox y escribe `about:debugging#/runtime/this-firefox` en la barra de direcciones.
3. Haz clic en el botón **"Cargar complemento temporal..."** (Load Temporary Add-on...).
4. Navega a esta carpeta y selecciona el archivo `manifest.json`.
5. ¡Listo! La extensión quedará activa en Firefox.

*(Si deseas volver a usar Chrome, solo ejecuta `npm run chrome`).*

---

## 🧪 Cómo probar la extensión rápidamente

Hemos incluido una página de prueba con texto en inglés y modo oscuro:

1. Con la extensión ya instalada en tu navegador, abre el archivo `test_demo.html` en Chrome o Firefox (puedes arrastrarlo a una pestaña del navegador o hacer doble clic sobre él).
2. Selecciona palabras como **weeks**, **launching**, **software** o **office**.
3. Verás aparecer el popup exactamente como en la imagen de referencia.
4. Pulsa el botón de altavoz 🔊 para escucharla.
5. Pulsa **"Aprender"** o **"Aprendido"**.
6. Haz clic en el icono de la extensión en la barra superior para ver tus palabras guardadas y probar el modo **Flashcards**.

---

## 📁 Estructura del Proyecto

```
Plugin-navegador/
├── manifest.json            # Manifiesto activo (Manifest V3)
├── manifest.chrome.json     # Manifiesto específico para Chrome
├── manifest.firefox.json    # Manifiesto específico para Firefox
├── background.js            # Service worker / script en segundo plano (traducción y almacenamiento)
├── content.js               # Script inyectado en las páginas para captura y render del popup
├── popup/
│   ├── popup.html           # Interfaz del panel de vocabulario
│   ├── popup.css            # Estilos del panel
│   └── popup.js             # Lógica de flashcards, listas y exportación
├── icons/
│   ├── icon-16.png          # Icono 16x16 px
│   ├── icon-48.png          # Icono 48x48 px
│   └── icon-128.png         # Icono 128x128 px
├── test_demo.html           # Página de demostración lista para probar
├── switch-browser.js        # Script utilitario para alternar entre Chrome y Firefox
├── package.json             # Scripts de npm
└── README.md                # Esta guía
```
