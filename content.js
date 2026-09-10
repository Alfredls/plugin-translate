// content.js - Content Script for in-page translation and vocabulary learning
// Injected into web pages to capture selected text, words, and paragraphs

(() => {
  // Prevent duplicate injection
  if (window.__readLearnExtensionInjected) return;
  window.__readLearnExtensionInjected = true;

  let hostElement = null;
  let shadowRoot = null;
  let activeWordData = null;
  let currentSelectionText = '';
  let currentContextSentence = '';
  const clientCache = new Map();
  let cachedVoices = [];

  // Load and cache strictly English voices
  function initVoices() {
    if (!('speechSynthesis' in window)) return;
    const update = () => {
      const all = window.speechSynthesis.getVoices();
      cachedVoices = all.filter(v => v.lang && (v.lang.startsWith('en') || v.lang.startsWith('en-') || v.lang.startsWith('en_')));
    };
    update();
    window.speechSynthesis.onvoiceschanged = update;
  }
  initVoices();

  // Preload page words using the offline dictionary (optimized & non-blocking)
  function preloadPageWords() {
    try {
      const dict = window.OFFLINE_DICTIONARY || (typeof OFFLINE_DICTIONARY !== 'undefined' ? OFFLINE_DICTIONARY : null);
      if (!dict || !document.body) return;

      // Slice to avoid forced reflows and thread blocking on heavy pages
      const rawText = (document.body.innerText || document.body.textContent || '').slice(0, 15000);
      const matches = rawText.match(/\b[a-zA-Z]{2,15}\b/g);
      if (!matches) return;

      const unique = new Set(matches.map(w => w.toLowerCase()));
      let count = 0;
      for (const w of unique) {
        if (count > 250) break; // Cap at 250 words
        if (dict[w] && !clientCache.has(w)) {
          clientCache.set(w, {
            original: w,
            translation: dict[w].t,
            phonetic: dict[w].p || '',
            audioUrl: '',
            googleTtsUrl: `https://translate.googleapis.com/translate_tts?ie=UTF-8&tl=en&client=tw-ob&q=${encodeURIComponent(w)}`
          });
          count++;
        }
      }
    } catch (e) {}
  }

  function schedulePreload() {
    if (window.requestIdleCallback) {
      window.requestIdleCallback(preloadPageWords, { timeout: 2000 });
    } else {
      setTimeout(preloadPageWords, 300);
    }
  }

  if (document.readyState === 'complete') {
    schedulePreload();
  } else {
    window.addEventListener('load', schedulePreload);
  }

  // Initialize isolated host with Shadow DOM
  function initHost() {
    if (hostElement) return;
    hostElement = document.createElement('readlearn-bubble');
    hostElement.style.cssText = 'all: initial; position: absolute; z-index: 2147483647; top: 0; left: 0; pointer-events: none;';
    shadowRoot = hostElement.attachShadow({ mode: 'open' });
    document.documentElement.appendChild(hostElement);
  }

  // Stylesheet for Shadow DOM
  const styles = `
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }

    /* Word Card */
    .rl-popup-card {
      pointer-events: auto;
      position: absolute;
      width: 250px;
      background: #ffffff;
      border-radius: 18px;
      box-shadow: 0 12px 28px -5px rgba(0, 0, 0, 0.22), 0 8px 10px -6px rgba(0, 0, 0, 0.15);
      border: 1px solid rgba(0, 0, 0, 0.08);
      overflow: hidden;
      animation: rl-fade-in 0.15s ease-out;
      user-select: none;
      color: #1e293b;
      display: flex;
      flex-direction: column;
    }

    /* Paragraph / Line Translation Card */
    .rl-paragraph-card {
      pointer-events: auto;
      position: absolute;
      width: 330px;
      max-width: 92vw;
      background: #ffffff;
      border-radius: 16px;
      box-shadow: 0 14px 30px -5px rgba(0, 0, 0, 0.25), 0 8px 10px -6px rgba(0, 0, 0, 0.15);
      border: 1px solid rgba(0, 0, 0, 0.08);
      overflow: hidden;
      animation: rl-fade-in 0.15s ease-out;
      user-select: text;
      color: #0f172a;
      display: flex;
      flex-direction: column;
    }

    .rl-para-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 14px 8px;
      border-bottom: 1px solid rgba(0, 0, 0, 0.06);
      background: #f8fafc;
      user-select: none;
    }

    .rl-para-title {
      font-size: 12px;
      font-weight: 700;
      color: #059669;
      display: flex;
      align-items: center;
      gap: 5px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .rl-para-actions {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .rl-icon-btn {
      background: none;
      border: none;
      cursor: pointer;
      padding: 4px 6px;
      border-radius: 6px;
      color: #64748b;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 13px;
      transition: background 0.15s, color 0.15s, transform 0.1s;
    }
    .rl-icon-btn:hover {
      background: #e2e8f0;
      color: #0f172a;
    }
    .rl-icon-btn:active {
      transform: scale(0.92);
    }
    .rl-icon-btn svg {
      width: 16px;
      height: 16px;
      fill: currentColor;
    }

    .rl-para-body {
      padding: 14px 16px;
      font-size: 15px;
      line-height: 1.55;
      color: #0f172a;
      max-height: 280px;
      overflow-y: auto;
      user-select: text;
    }

    @keyframes rl-fade-in {
      from { opacity: 0; transform: translateY(6px) scale(0.96); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }

    .rl-content {
      padding: 16px 14px 14px;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      position: relative;
    }

    .rl-close-btn {
      position: absolute;
      top: 8px;
      right: 10px;
      background: none;
      border: none;
      color: #94a3b8;
      cursor: pointer;
      font-size: 16px;
      line-height: 1;
      padding: 4px;
      border-radius: 50%;
      transition: color 0.15s, background 0.15s;
    }
    .rl-close-btn:hover {
      color: #334155;
      background: #f1f5f9;
    }

    .rl-header-row {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      margin-bottom: 2px;
      max-width: 100%;
    }

    .rl-speaker-btn {
      background: none;
      border: none;
      cursor: pointer;
      padding: 3px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: #475569;
      border-radius: 6px;
      transition: transform 0.15s, color 0.15s;
    }
    .rl-speaker-btn:hover {
      color: #059669;
      transform: scale(1.18);
    }
    .rl-speaker-btn:active {
      transform: scale(0.95);
    }
    .rl-speaker-btn svg {
      width: 22px;
      height: 22px;
      fill: currentColor;
    }

    .rl-word {
      font-size: 22px;
      font-weight: 800;
      color: #0f172a;
      line-height: 1.2;
      letter-spacing: -0.3px;
      word-break: break-word;
    }

    .rl-phonetic {
      font-size: 13.5px;
      color: #059669;
      margin-bottom: 8px;
      font-weight: 600;
      letter-spacing: 0.3px;
    }

    .rl-translation {
      font-size: 18px;
      font-weight: 700;
      color: #0f172a;
      line-height: 1.25;
      margin-top: 2px;
      word-break: break-word;
    }

    .rl-loading {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      font-size: 14px;
      color: #64748b;
      padding: 14px 0;
    }

    .rl-spinner {
      width: 16px;
      height: 16px;
      border: 2px solid #cbd5e1;
      border-top-color: #10b981;
      border-radius: 50%;
      animation: rl-spin 0.7s linear infinite;
    }
    @keyframes rl-spin {
      to { transform: rotate(360deg); }
    }

    /* Single Action Button: Emerald Green */
    .rl-actions-row {
      display: flex;
      width: 100%;
      border-top: 1px solid rgba(0, 0, 0, 0.06);
      padding: 8px 12px 10px;
      background: #f8fafc;
    }

    .rl-btn-save {
      width: 100%;
      height: 38px;
      border: none;
      border-radius: 10px;
      background: #10b981;
      color: #ffffff;
      font-size: 13.5px;
      font-weight: 700;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      transition: all 0.15s ease;
      box-shadow: 0 2px 5px rgba(16, 185, 129, 0.25);
    }
    .rl-btn-save:hover {
      background: #059669;
      box-shadow: 0 3px 8px rgba(16, 185, 129, 0.35);
    }
    .rl-btn-save:active {
      transform: scale(0.98);
    }

    .rl-saved-badge {
      width: 100%;
      box-sizing: border-box;
      padding: 8px 12px;
      color: #059669;
      font-size: 13px;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      user-select: none;
      background: #f0fdf4;
      border: 1.5px dashed #86efac;
      border-radius: 10px;
      cursor: default;
    }
  `;

  // Speaker SVG Icon
  const speakerSvg = `
    <svg viewBox="0 0 24 24">
      <path d="M14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77zm-2.5-1.73L6.5 6H2v12h4.5l5 4.5v-21zm-1.5 4.27v12.46L6.85 15H4V9h2.85l3.65-3.23zM14 8.5v7c1.48-.73 2.5-2.25 2.5-3.5S15.48 9.23 14 8.5z"/>
    </svg>
  `;

  // Copy SVG Icon
  const copySvg = `
    <svg viewBox="0 0 24 24">
      <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
    </svg>
  `;

  // Helper to get strictly an English voice for pronunciation
  function getStrictEnglishVoice() {
    const allVoices = window.speechSynthesis.getVoices();
    const englishVoices = allVoices.filter(v => v.lang && (v.lang.startsWith('en') || v.lang.startsWith('en-') || v.lang.startsWith('en_')));
    if (englishVoices.length === 0) return null;

    const preferredNames = ['Samantha', 'Google US English', 'Daniel', 'Alex', 'Victoria', 'Karen', 'Fred'];
    for (const name of preferredNames) {
      const match = englishVoices.find(v => v.name.includes(name));
      if (match) return match;
    }

    return englishVoices[0];
  }

  // Play word/sentence pronunciation
  function playAudio(text, audioUrl, googleTtsUrl, buttonEl) {
    if (buttonEl) {
      buttonEl.style.transform = 'scale(1.25)';
      buttonEl.style.color = '#10b981';
      setTimeout(() => {
        buttonEl.style.transform = '';
        buttonEl.style.color = '';
      }, 400);
    }

    if (audioUrl) {
      const studioAudio = new Audio(audioUrl);
      studioAudio.play().catch(() => tryGoogleTts(text, googleTtsUrl));
      return;
    }

    tryGoogleTts(text, googleTtsUrl);
  }

  function tryGoogleTts(text, googleTtsUrl) {
    const ttsUrl = googleTtsUrl || `https://translate.googleapis.com/translate_tts?ie=UTF-8&tl=en&client=tw-ob&q=${encodeURIComponent(text.slice(0, 150))}`;
    const googleAudio = new Audio(ttsUrl);
    googleAudio.play().catch(() => {
      playSpeechSynthesis(text);
    });
  }

  function playSpeechSynthesis(text) {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const englishVoice = getStrictEnglishVoice();
    if (englishVoice) {
      utterance.voice = englishVoice;
    }
    utterance.lang = 'en-US';
    utterance.rate = 0.94;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  }

  // Remove popup from DOM
  function removePopup() {
    if (shadowRoot) {
      shadowRoot.innerHTML = '';
    }
    activeWordData = null;
  }

  // Render Word Card (single word mode)
  function renderWordCard(data, coords, initialIsSaved = false) {
    initHost();
    activeWordData = data;

    const { original, translation, phonetic, audioUrl, googleTtsUrl } = data;
    let isSaved = initialIsSaved || data.isSaved;

    // Only show phonetic if genuine (not identical to word in brackets)
    const cleanPhonetic = (phonetic || '').trim();
    const hasValidPhonetic = cleanPhonetic && cleanPhonetic.toLowerCase() !== `[${original.toLowerCase().trim()}]`;
    const phoneticHtml = hasValidPhonetic ? `<div class="rl-phonetic">${escapeHtml(cleanPhonetic)}</div>` : '';

    shadowRoot.innerHTML = `
      <style>${styles}</style>
      <div class="rl-popup-card" id="rl-card" style="top: ${coords.top}px; left: ${coords.left}px;">
        <div class="rl-content">
          <button class="rl-close-btn" id="rl-close" title="Cerrar">✕</button>

          <div class="rl-header-row">
            <button class="rl-speaker-btn" id="rl-speaker" title="Escuchar pronunciación nativa">
              ${speakerSvg}
            </button>
            <span class="rl-word">${escapeHtml(original)}</span>
          </div>

          ${phoneticHtml}
          <div class="rl-translation">${escapeHtml(translation)}</div>
        </div>

        <div class="rl-actions-row">
          ${isSaved ? `
            <div class="rl-saved-badge">
              <svg viewBox="0 0 24 24" width="16" height="16" style="fill: currentColor; flex-shrink: 0;">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
              </svg>
              <span>En tu vocabulario</span>
            </div>
          ` : `
            <button class="rl-btn-save" id="rl-btn-save">
              + Agregar a vocabulario
            </button>
          `}
        </div>
      </div>
    `;

    adjustCardPosition(coords);

    // Helper to display non-clickable saved text
    function showSavedBadge() {
      const actionsRow = shadowRoot?.querySelector('.rl-actions-row');
      if (actionsRow) {
        actionsRow.innerHTML = `
          <div class="rl-saved-badge">
            <svg viewBox="0 0 24 24" width="16" height="16" style="fill: currentColor; flex-shrink: 0;">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
            </svg>
            <span>En tu vocabulario</span>
          </div>
        `;
      }
    }

    // Event listeners
    const speakerBtn = shadowRoot.getElementById('rl-speaker');
    speakerBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      playAudio(original, audioUrl, googleTtsUrl, speakerBtn);
    });

    const closeBtn = shadowRoot.getElementById('rl-close');
    closeBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      removePopup();
    });

    const saveBtn = shadowRoot.getElementById('rl-btn-save');
    saveBtn?.addEventListener('click', async (e) => {
      e.stopPropagation();
      try {
        const res = await chrome.runtime.sendMessage({
          action: 'toggleWord',
          wordData: {
            word: original,
            translation: translation,
            phonetic: cleanPhonetic,
            audioUrl: audioUrl,
            contextSentence: currentContextSentence,
            sourceUrl: window.location.href
          }
        });

        if (res && res.success && res.isSaved) {
          showSavedBadge();
        }
      } catch (err) {
        console.warn('Error al guardar vocabulario:', err);
      }
    });
  }

  // Render Paragraph Translation Card (solo traducción)
  function renderParagraphCard(data, coords) {
    initHost();
    activeWordData = data;

    const { original, translation, googleTtsUrl } = data;

    shadowRoot.innerHTML = `
      <style>${styles}</style>
      <div class="rl-paragraph-card" id="rl-card" style="top: ${coords.top}px; left: ${coords.left}px;">
        <div class="rl-para-header">
          <span class="rl-para-title">📖 Traducción</span>
          <div class="rl-para-actions">
            <button class="rl-icon-btn" id="rl-para-audio" title="Escuchar texto en inglés">
              ${speakerSvg}
            </button>
            <button class="rl-icon-btn" id="rl-para-copy" title="Copiar traducción">
              ${copySvg}
            </button>
            <button class="rl-icon-btn" id="rl-close" title="Cerrar">✕</button>
          </div>
        </div>
        <div class="rl-para-body">
          ${escapeHtml(translation)}
        </div>
      </div>
    `;

    adjustCardPosition(coords);

    const audioBtn = shadowRoot.getElementById('rl-para-audio');
    audioBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      playAudio(original, '', googleTtsUrl, audioBtn);
    });

    const copyBtn = shadowRoot.getElementById('rl-para-copy');
    copyBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      navigator.clipboard.writeText(translation).then(() => {
        copyBtn.style.color = '#10b981';
        copyBtn.title = '¡Copiado!';
        setTimeout(() => {
          copyBtn.style.color = '';
          copyBtn.title = 'Copiar traducción';
        }, 1200);
      });
    });

    const closeBtn = shadowRoot.getElementById('rl-close');
    closeBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      removePopup();
    });
  }

  // Adjust card if overflowing viewport
  function adjustCardPosition(coords) {
    requestAnimationFrame(() => {
      const card = shadowRoot?.getElementById('rl-card');
      if (card) {
        const rect = card.getBoundingClientRect();
        if (rect.right > window.innerWidth - 10) {
          const diff = rect.right - (window.innerWidth - 10);
          card.style.left = `${Math.max(10, coords.left - diff)}px`;
        }
        if (rect.left < 10) {
          card.style.left = '10px';
        }
      }
    });
  }

  // Show loading card
  function renderLoading(coords, isParagraph = false) {
    initHost();
    const cardWidth = isParagraph ? 260 : 180;
    shadowRoot.innerHTML = `
      <style>${styles}</style>
      <div class="rl-popup-card" id="rl-card" style="top: ${coords.top}px; left: ${coords.left}px; width: ${cardWidth}px;">
        <div class="rl-content">
          <div class="rl-loading">
            <div class="rl-spinner"></div>
            <span>${isParagraph ? 'Traduciendo párrafo...' : 'Traduciendo...'}</span>
          </div>
        </div>
      </div>
    `;
  }

  // Calculate coords for popup relative to document
  function calculatePopupCoords(selection) {
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    const scrollX = window.scrollX || window.pageXOffset;
    const scrollY = window.scrollY || window.pageYOffset;

    const popupHeight = 155;
    let left = rect.left + scrollX + (rect.width / 2) - 130;
    let top = rect.top + scrollY - popupHeight - 10;

    if (rect.top - popupHeight < 20) {
      top = rect.bottom + scrollY + 10;
    }

    if (left < 10) left = 10;
    return { top: Math.max(10, top), left };
  }

  function getContextSentence(selection) {
    try {
      const anchorNode = selection.anchorNode;
      if (anchorNode && anchorNode.textContent) {
        const text = anchorNode.textContent;
        const selected = selection.toString();
        const index = text.indexOf(selected);
        if (index !== -1) {
          const start = Math.max(0, index - 60);
          const end = Math.min(text.length, index + selected.length + 60);
          return text.substring(start, end).trim();
        }
      }
    } catch (e) {}
    return '';
  }

  function escapeHtml(str) {
    return (str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Handle selection event (words vs sentences/paragraphs)
  async function handleSelection() {
    const selection = window.getSelection();
    const text = selection ? selection.toString().trim() : '';

    if (!text || text.length < 1 || text.length > 2500) {
      return;
    }

    if (text === currentSelectionText && activeWordData) {
      return;
    }

    currentSelectionText = text;
    currentContextSentence = getContextSentence(selection);
    const coords = calculatePopupCoords(selection);

    const wordCount = text.split(/\s+/).length;
    const isParagraph = wordCount > 3 || text.length > 35;

    if (isParagraph) {
      // 1. Paragraph Mode ("solo traducción")
      renderLoading(coords, true);
      try {
        const res = await chrome.runtime.sendMessage({
          action: 'translateParagraph',
          text: text,
          targetLang: 'es'
        });

        if (!res || !res.success) {
          removePopup();
          return;
        }

        renderParagraphCard(res.data, coords);
      } catch (err) {
        console.warn('Error al traducir párrafo:', err);
        removePopup();
      }
    } else {
      // 2. Single Word Mode
      const cacheKey = text.toLowerCase();

      // Check clientCache
      if (clientCache.has(cacheKey)) {
        const cached = clientCache.get(cacheKey);
        renderWordCard(cached, coords, false);

        chrome.runtime.sendMessage({ action: 'getWordStatus', word: text }).then(res => {
          if (res && res.isSaved) {
            const actionsRow = shadowRoot?.querySelector('.rl-actions-row');
            if (actionsRow) {
              actionsRow.innerHTML = `
                <div class="rl-saved-badge">
                  <svg viewBox="0 0 24 24" width="16" height="16" style="fill: currentColor; flex-shrink: 0;">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                  </svg>
                  <span>En tu vocabulario</span>
                </div>
              `;
            }
          }
        }).catch(() => {});
        return;
      }

      // Check offline dictionary directly
      const dict = window.OFFLINE_DICTIONARY || (typeof OFFLINE_DICTIONARY !== 'undefined' ? OFFLINE_DICTIONARY : null);
      if (dict && dict[cacheKey]) {
        const data = {
          original: text,
          translation: dict[cacheKey].t,
          phonetic: dict[cacheKey].p || '',
          audioUrl: '',
          googleTtsUrl: `https://translate.googleapis.com/translate_tts?ie=UTF-8&tl=en&client=tw-ob&q=${encodeURIComponent(text)}`
        };
        clientCache.set(cacheKey, data);
        renderWordCard(data, coords, false);

        chrome.runtime.sendMessage({ action: 'getWordStatus', word: text }).then(res => {
          if (res && res.isSaved) {
            const actionsRow = shadowRoot?.querySelector('.rl-actions-row');
            if (actionsRow) {
              actionsRow.innerHTML = `
                <div class="rl-saved-badge">
                  <svg viewBox="0 0 24 24" width="16" height="16" style="fill: currentColor; flex-shrink: 0;">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                  </svg>
                  <span>En tu vocabulario</span>
                </div>
              `;
            }
          }
        }).catch(() => {});
        return;
      }

      // Online fetch via background
      renderLoading(coords, false);
      try {
        const [res, statusRes] = await Promise.all([
          chrome.runtime.sendMessage({
            action: 'translate',
            text: text,
            targetLang: 'es'
          }),
          chrome.runtime.sendMessage({
            action: 'getWordStatus',
            word: text
          }).catch(() => null)
        ]);

        if (!res || !res.success) {
          removePopup();
          return;
        }

        clientCache.set(cacheKey, res.data);
        const isSaved = !!statusRes?.isSaved;
        renderWordCard(res.data, coords, isSaved);
      } catch (err) {
        console.warn('Error al procesar selección:', err);
        removePopup();
      }
    }
  }

  // Debounced mouseup handler
  let selectionTimeout = null;
  document.addEventListener('mouseup', (e) => {
    if (hostElement && e.composedPath().includes(hostElement)) {
      return;
    }

    clearTimeout(selectionTimeout);
    selectionTimeout = setTimeout(() => {
      const selection = window.getSelection();
      const text = selection ? selection.toString().trim() : '';

      if (text) {
        handleSelection();
      } else {
        removePopup();
        currentSelectionText = '';
      }
    }, 60);
  });

  // Close popup on Escape key or outside click
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      removePopup();
      currentSelectionText = '';
    }
  });

  document.addEventListener('mousedown', (e) => {
    if (hostElement && !e.composedPath().includes(hostElement)) {
      removePopup();
      currentSelectionText = '';
    }
  });
})();
