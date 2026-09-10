# Chrome Web Store & Firefox Add-ons Metadata

## 1. Extension Information
- **Name:** Lector Inglés - Traducción y Aprendizaje de Vocabulario
- **Summary / Short Description:** Selecciona cualquier palabra o frase en inglés al navegar para traducirla al instante, escuchar su pronunciación y guardarla en tu vocabulario para practicar.
- **Category:** Education / Productividad
- **Default Language:** Spanish (es)
- **Version:** 1.0.0

## 2. Permissions Justification (para revisión en Chrome Web Store y Mozilla Add-ons)
- **`storage`**: Requerido para almacenar de forma local en el dispositivo del usuario el vocabulario guardado (palabras en estado 'Aprender' y 'Aprendido'), así como su progreso de estudio y repasos.
- **`host_permissions`**:
  - `https://translate.googleapis.com/*` y `https://api.mymemory.translated.net/*`: Requerido exclusivamente para obtener las traducciones de las palabras o frases en inglés seleccionadas por el usuario al español.
  - `https://api.dictionaryapi.dev/*`: Requerido para obtener la transcripción fonética y archivos de audio de pronunciación nativa en inglés para las palabras consultadas.

## 3. Privacy Policy & Data Use Disclosure
- **Datos recopilados:** Ningún dato de identificación personal (PII) es recolectado ni vendido a terceros.
- **Vocabulario y notas:** Se almacenan de forma local en el navegador mediante `chrome.storage.local`.
- **Traducciones:** El texto seleccionado por el usuario se envía directamente a la API de traducción correspondiente únicamente cuando el usuario realiza una selección activa.
