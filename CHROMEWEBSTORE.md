# Guía Completa para Distribuir y Publicar la Extensión

Este documento contiene toda la información, textos y requisitos listos para copiar y pegar en los paneles de desarrollador de **Chrome Web Store** y **Mozilla Firefox Add-ons**, así como métodos de distribución directa.

---

## 📦 Archivos Listos para Subir (en la carpeta `/dist`)

Ya hemos configurado un comando automatizado para generar los paquetes limpios listos para subir:
- `npm run build` genera:
  - **`dist/lector-ingles-chrome-v1.3.0.zip`** (Para Chrome Web Store, Brave, Edge, Opera)
  - **`dist/lector-ingles-firefox-v1.3.0.zip`** (Para Mozilla Add-ons)

---

## 1. Opciones de Distribución

### Opción A: Distribución en Tiendas Oficiales (Recomendada para el público general)
Permite que cualquier usuario instale la extensión con 1 solo clic desde la tienda oficial y reciba actualizaciones automáticas.

| Tienda | Costo de cuenta | Tiempo de revisión | URL del panel |
|---|---|---|---|
| **Chrome Web Store** | **$5 USD** (pago único de por vida) | 1 a 3 días hábiles | [chrome.google.com/webstore/devpanel](https://chrome.google.com/webstore/devpanel) |
| **Firefox Add-ons (AMO)** | **Gratis** (0 USD) | 1 a 2 días hábiles (o minutos si es autogestionada) | [addons.mozilla.org/developers](https://addons.mozilla.org/developers/) |
| **Microsoft Edge Add-ons** | **Gratis** (0 USD) | 1 a 3 días hábiles | [partner.microsoft.com](https://partner.microsoft.com/dashboard/microsoftedge) |

---

### Opción B: Distribución Directa / Gratuita (Sin Tienda)
Ideal para compartir con amigos, alumnos o compañeros de equipo sin pagar ni esperar aprobaciones:

1. **Para Chrome / Edge / Brave:**
   - Envías la carpeta descomprimida o el archivo `.zip`.
   - El usuario abre `chrome://extensions/`.
   - Activa el interruptor **"Modo de desarrollador"** (arriba a la derecha).
   - Hace clic en **"Cargar descomprimida"** y selecciona la carpeta del proyecto.
2. **Para Firefox (Extensión Firmada Autogestionada / "Unlisted"):**
   - En el panel de Mozilla (`addons.mozilla.org`), eliges la opción *"Distribución por mi cuenta (Unlisted)"*.
   - Subes `dist/lector-ingles-firefox-v1.3.0.zip`.
   - El sistema automático de Mozilla revisa y firma digitalmente tu extensión en pocos minutos y te entrega un archivo `.xpi`.
   - Cualquiera puede descargar ese archivo `.xpi` y hacer doble clic para instalarlo en Firefox normalmente.

---

## 2. Textos Listos para la Tienda (Copiar y Pegar)

### Nombre de la Extensión:
`Lector Inglés - Traducción y Práctica con Quiz`

### Resumen corto (máx. 132 caracteres):
`Traduce palabras y párrafos en inglés al navegar, escucha su pronunciación nativa y practica tu vocabulario con Quiz interactivos.`

### Descripción detallada:
```text
¡Aprende inglés de forma natural mientras lees artículos, noticias y páginas web!

Lector Inglés es una extensión ligera y moderna diseñada para ayudarte a expandir tu vocabulario en inglés sin interrumpir tu flujo de lectura.

✨ CARACTERÍSTICAS PRINCIPALES:

1. TRADUCCIÓN INSTANTÁNEA:
- Selecciona cualquier palabra para ver su traducción al español y su pronunciación fonética real.
- Selecciona oraciones o párrafos completos para obtener una traducción contextual rápida con opción de copiar.

2. AUDIO Y PRONUNCIACIÓN NATIVA:
- Escucha la pronunciación correcta en inglés británico o americano utilizando síntesis de voz nativa optimizada.

3. VOCABULARIO PERSONALIZADO:
- Guarda palabras con un solo clic para estudiarlas más tarde.
- Filtra tu vocabulario por página web para repasar lo aprendido en sitios específicos (Wikipedia, Medium, etc.).
- Limpieza automática programable (7, 30 o 90 días) para mantener tu lista fresca y relevante.

4. MODO QUIZ INTERACTIVO:
- Practica tus palabras guardadas con exámenes de opción múltiple generados automáticamente.
- Cambia de opción libremente antes de confirmar tu respuesta.
- Recibe retroalimentación inmediata, puntuación y porcentaje de aciertos.

5. EXPORTACIÓN Y ESTUDIO SIN CONEXIÓN:
- Exporta tu lista a CSV para importarla a Anki o Excel.
- Genera un Quiz interactivo en HTML autónomo para practicar en tu móvil o tablet sin conexión.

🔒 PRIVACIDAD Y RENDIMIENTO:
- No requiere registro ni recopila datos personales.
- Todo tu vocabulario se guarda 100% de manera local en tu navegador.
- Arquitectura ultrarrápida con caché sin impacto en el rendimiento de tu navegación.
```

---

## 3. Justificación de Permisos (Obligatorio para la revisión)

Al subir el `.zip`, Google y Mozilla te pedirán justificar cada permiso del manifiesto:

- **`storage`**:
  *Justificación en inglés:* "Used strictly to store the user's saved vocabulary words, quiz practice scores, and retention settings locally on their own device."
  *Justificación en español:* "Se utiliza estrictamente para guardar el vocabulario del usuario, sus resultados del quiz y ajustes de retención de manera local en su dispositivo."

- **`activeTab`**:
  *Justificación en inglés:* "Used to obtain the domain name of the current active webpage, allowing users to filter their saved vocabulary by website."
  *Justificación en español:* "Se utiliza para identificar el dominio del sitio web activo y permitir filtrar las palabras según la página donde fueron agregadas."

- **`host_permissions` (`translate.googleapis.com`, `clients5.google.com`, `api.mymemory.translated.net` y `api.dictionaryapi.dev`)**:
  *Justificación en inglés:* "Required solely to fetch translations, phonetic guide (IPA), and pronunciation audio for the specific words or sentences the user actively selects on web pages."
  *Justificación en español:* "Requerido exclusivamente para obtener las traducciones, fonética IPA y audio de pronunciación de las palabras u oraciones que el usuario selecciona activamente."

---

## 4. Requisitos Gráficos para la Tienda

Para publicar en Chrome Web Store necesitarás preparar:

1. **Icono de la extensión**:
   - Ya está listo en el proyecto: `icons/icon-128.png` (128x128 píxeles).
2. **Capturas de Pantalla (Screenshots)**:
   - Al menos 1 captura de pantalla (recomendado de 3 a 5).
   - Tamaño exacto requerido: **1280 × 800 píxeles** (o 640 × 400).
   - Contenido sugerido:
     - Captura 1: Tarjeta flotante traduciendo una palabra con el botón verde.
     - Captura 2: Traducción panorámica de un párrafo largo.
     - Captura 3: El popup con la pestaña de Vocabulario y filtro de página.
     - Captura 4: La pestaña del Quiz interactivo con las 4 opciones.
3. **Imagen promocional (Pequeña)**:
   - Tamaño: **440 × 280 píxeles** (JPG o PNG).
   - Imagen atractiva con el logo y el texto "Lector Inglés".

---

## 5. Política de Privacidad (Privacy Policy)

Google exige un enlace público a una Política de Privacidad. Puedes crear una página gratuita en **GitHub Pages**, **Notion**, o un **Gist de GitHub**:

```markdown
# Política de Privacidad - Lector Inglés

Última actualización: Septiembre 2026

1. Información recopilada:
Lector Inglés no recopila, no rastrea ni vende información personal, historial de navegación ni datos sensibles del usuario.

2. Almacenamiento local:
Las palabras añadidas al vocabulario se guardan exclusivamente en el almacenamiento local del navegador del usuario (chrome.storage.local). El usuario puede exportar o borrar sus datos en cualquier momento.

3. Comunicaciones de red:
La extensión se comunica con servicios de traducción (Google Translate, MyMemory y Dictionary API) únicamente cuando el usuario selecciona texto de manera activa, con el único fin de proveer la traducción y pronunciación solicitada.
```

