// background.js - Service Worker for Chrome & Background Script for Firefox
// Manifest V3 compliant

// Import offline dictionary if in Service Worker context
try {
  if (typeof OFFLINE_DICTIONARY === 'undefined') {
    importScripts('offline_dict.js');
  }
} catch (e) {
  // Already in global scope (e.g. Firefox background.scripts)
}

// In-memory cache for 0ms lookup across tabs
const memoryCache = new Map();

// Helper to fetch with a reasonable timeout (8 seconds)
async function fetchWithTimeout(url, options = {}, timeoutMs = 8000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return response;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

// Look up word in offline dictionary with lemma inflection support
function lookupOfflineDict(text) {
  if (typeof OFFLINE_DICTIONARY === 'undefined' || !OFFLINE_DICTIONARY) {
    return null;
  }

  const clean = text.toLowerCase().trim();
  if (OFFLINE_DICTIONARY[clean]) {
    return OFFLINE_DICTIONARY[clean];
  }

  // Handle plural 's' (e.g. screens -> screen, weeks -> week)
  if (clean.endsWith('s') && clean.length > 3) {
    const singular = clean.slice(0, -1);
    if (OFFLINE_DICTIONARY[singular]) {
      const match = OFFLINE_DICTIONARY[singular];
      return { t: match.t + ' (pl)', p: match.p };
    }
  }

  // Handle 'ed' past tense (e.g. finished -> finish, launched -> launch)
  if (clean.endsWith('ed') && clean.length > 4) {
    const base = clean.slice(0, -2);
    if (OFFLINE_DICTIONARY[base]) return OFFLINE_DICTIONARY[base];
    if (OFFLINE_DICTIONARY[base + 'e']) return OFFLINE_DICTIONARY[base + 'e'];
  }

  // Handle 'ing' gerund (e.g. working -> work, finishing -> finish)
  if (clean.endsWith('ing') && clean.length > 5) {
    const base = clean.slice(0, -3);
    if (OFFLINE_DICTIONARY[base]) return OFFLINE_DICTIONARY[base];
    if (OFFLINE_DICTIONARY[base + 'e']) return OFFLINE_DICTIONARY[base + 'e'];
  }

  // Handle 'er' comparative (e.g. smaller -> small)
  if (clean.endsWith('er') && clean.length > 4) {
    const base = clean.slice(0, -2);
    if (OFFLINE_DICTIONARY[base]) return OFFLINE_DICTIONARY[base];
  }

  return null;
}

// Listen for messages from content scripts or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  (async () => {
    try {
      switch (request.action) {
        case 'translate': {
          const result = await handleTranslation(request.text, request.targetLang || 'es');
          sendResponse({ success: true, data: result });
          break;
        }

        case 'translateParagraph': {
          const result = await handleParagraphTranslation(request.text, request.targetLang || 'es');
          sendResponse({ success: true, data: result });
          break;
        }

        case 'saveWord': {
          const saved = await saveWord(request.wordData);
          sendResponse({ success: true, data: saved });
          break;
        }

        case 'toggleWord': {
          const res = await toggleWord(request.wordData);
          sendResponse({ success: true, ...res });
          break;
        }

        case 'getWordStatus': {
          const isSaved = await getWordStatus(request.word);
          sendResponse({ success: true, isSaved });
          break;
        }

        case 'getVocabulary': {
          const words = await getVocabulary();
          sendResponse({ success: true, words });
          break;
        }

        case 'deleteWord': {
          await deleteWord(request.id);
          sendResponse({ success: true });
          break;
        }

        case 'deleteWordsBySource': {
          const count = await deleteWordsBySource(request.sourceUrl);
          sendResponse({ success: true, count });
          break;
        }

        case 'cleanupOldWords': {
          const count = await cleanupOldWords(request.days);
          sendResponse({ success: true, count });
          break;
        }

        case 'getAutoCleanupSetting': {
          const { autoCleanupDays = 0 } = await chrome.storage.local.get('autoCleanupDays');
          sendResponse({ success: true, days: autoCleanupDays });
          break;
        }

        case 'setAutoCleanupSetting': {
          await chrome.storage.local.set({ autoCleanupDays: request.days });
          let count = 0;
          if (request.days > 0) {
            count = await cleanupOldWords(request.days);
          }
          sendResponse({ success: true, cleaned: count });
          break;
        }

        case 'clearAllWords': {
          await chrome.storage.local.set({ vocabulary: {} });
          sendResponse({ success: true });
          break;
        }

        case 'setExtensionEnabled': {
          await chrome.storage.local.set({ isExtensionEnabled: request.isEnabled });
          updateExtensionBadge(request.isEnabled);
          sendResponse({ success: true, isEnabled: request.isEnabled });
          break;
        }

        default:
          sendResponse({ success: false, error: 'Acción desconocida' });
      }
    } catch (error) {
      console.error('Error en background:', error);
      sendResponse({ success: false, error: error.message || 'Error en el servicio' });
    }
  })();

  return true; // Keep message channel open for async response
});

// Translation & dictionary lookup handler with offline fallback, parallel APIs and caching
async function handleTranslation(rawText, targetLang = 'es') {
  const text = (rawText || '').trim();
  if (!text) {
    throw new Error('Texto vacío');
  }

  const cacheKey = `${text.toLowerCase()}_${targetLang}`;

  // 1. Check in-memory cache (0ms)
  if (memoryCache.has(cacheKey)) {
    return memoryCache.get(cacheKey);
  }

  // 2. Check saved vocabulary
  try {
    const { vocabulary = {}, translationCache = {} } = await chrome.storage.local.get([
      'vocabulary',
      'translationCache'
    ]);

    const wordKey = text.toLowerCase();
    if (vocabulary[wordKey] && vocabulary[wordKey].translation) {
      const vocabData = {
        original: text,
        translation: vocabulary[wordKey].translation,
        phonetic: vocabulary[wordKey].phonetic || `[${text.toLowerCase()}]`,
        audioUrl: vocabulary[wordKey].audioUrl || '',
        googleTtsUrl: `https://translate.googleapis.com/translate_tts?ie=UTF-8&tl=en&client=tw-ob&q=${encodeURIComponent(text)}`,
        isSaved: true
      };
      memoryCache.set(cacheKey, vocabData);
      return vocabData;
    }

    if (translationCache[cacheKey]) {
      memoryCache.set(cacheKey, translationCache[cacheKey]);
      return translationCache[cacheKey];
    }
  } catch (err) {}

  // 3. Check OFFLINE DICTIONARY (Instant local lookup, works with 0 internet)
  const offlineMatch = lookupOfflineDict(text);
  if (offlineMatch) {
    const result = {
      original: text,
      translation: offlineMatch.t,
      phonetic: offlineMatch.p || `[${text.toLowerCase()}]`,
      audioUrl: '',
      googleTtsUrl: `https://translate.googleapis.com/translate_tts?ie=UTF-8&tl=en&client=tw-ob&q=${encodeURIComponent(text)}`,
      isSaved: false
    };
    memoryCache.set(cacheKey, result);
    return result;
  }

  // 4. Online Fetch with multi-tier fallbacks
  const googleTtsUrl = `https://translate.googleapis.com/translate_tts?ie=UTF-8&tl=en&client=tw-ob&q=${encodeURIComponent(text)}`;
  const isSingleWord = text.split(/\s+/).length === 1 && /^[a-zA-Z'-]+$/.test(text);

  // Translation fetcher with 3 endpoints
  const translationPromise = (async () => {
    // Endpoint 1: Google Dictionary Chrome Extension API (fast & highly reliable)
    try {
      const url1 = `https://clients5.google.com/translate_a/t?client=dict-chrome-ex&sl=en&tl=${targetLang}&q=${encodeURIComponent(text)}`;
      const res1 = await fetchWithTimeout(url1, {}, 5000);
      if (res1.ok) {
        const data = await res1.json();
        let trans = '';
        if (typeof data === 'string') {
          trans = data;
        } else if (Array.isArray(data)) {
          trans = typeof data[0] === 'string' ? data[0] : (Array.isArray(data[0]) ? data[0][0] : '');
        }
        if (trans && trans.trim()) return trans.trim();
      }
    } catch (e1) {}

    // Endpoint 2: Google Translate GTX endpoint
    try {
      const url2 = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
      const res2 = await fetchWithTimeout(url2, {}, 5000);
      if (res2.ok) {
        const data = await res2.json();
        if (data && data[0]) {
          const trans = data[0].map(item => item[0]).filter(Boolean).join('');
          if (trans && trans.trim()) return trans.trim();
        }
      }
    } catch (e2) {}

    // Endpoint 3: MyMemory API fallback
    try {
      const url3 = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|${targetLang}`;
      const res3 = await fetchWithTimeout(url3, {}, 5000);
      if (res3.ok) {
        const data = await res3.json();
        if (data?.responseData?.translatedText) {
          return data.responseData.translatedText.trim();
        }
      }
    } catch (e3) {}

    return 'Traducción no disponible';
  })();

  // Phonetics & studio human recording fetcher
  const dictionaryPromise = (async () => {
    if (!isSingleWord) return { phonetic: '', audioUrl: '' };
    try {
      const cleanWord = text.toLowerCase().replace(/[^a-z]/g, '');
      const dictUrl = `https://api.dictionaryapi.dev/api/v2/entries/en/${cleanWord}`;
      const dictRes = await fetchWithTimeout(dictUrl, {}, 4000);
      if (dictRes.ok) {
        const dictData = await dictRes.json();
        if (Array.isArray(dictData) && dictData.length > 0) {
          const entry = dictData[0];
          let phonetic = entry.phonetic || '';
          let audioUrl = '';

          if (Array.isArray(entry.phonetics)) {
            for (const p of entry.phonetics) {
              if (!phonetic && p.text) phonetic = p.text;
              if (p.audio && !audioUrl) audioUrl = p.audio;
            }
          }
          return { phonetic, audioUrl };
        }
      }
    } catch (e) {}
    return { phonetic: '', audioUrl: '' };
  })();

  // Run in parallel
  const [transResult, dictResult] = await Promise.allSettled([
    translationPromise,
    dictionaryPromise
  ]);

  const translation = transResult.status === 'fulfilled' ? transResult.value : 'Traducción no disponible';
  const dictData = dictResult.status === 'fulfilled' ? dictResult.value : { phonetic: '', audioUrl: '' };

  let phonetic = '';
  if (dictData.phonetic) {
    phonetic = dictData.phonetic.trim();
    if (!phonetic.startsWith('[') && !phonetic.startsWith('/')) {
      phonetic = `[${phonetic}]`;
    }
  }

  const result = {
    original: text,
    translation: translation,
    phonetic: phonetic,
    audioUrl: dictData.audioUrl || '',
    googleTtsUrl: googleTtsUrl,
    isSaved: false
  };

  // Cache result
  memoryCache.set(cacheKey, result);

  (async () => {
    try {
      const { translationCache = {} } = await chrome.storage.local.get('translationCache');
      translationCache[cacheKey] = result;
      const keys = Object.keys(translationCache);
      if (keys.length > 300) delete translationCache[keys[0]];
      await chrome.storage.local.set({ translationCache });
    } catch (err) {}
  })();

  return result;
}

// Toggle word in vocabulary (add if not present, remove if present)
async function toggleWord(wordData) {
  const { vocabulary = {} } = await chrome.storage.local.get('vocabulary');
  const id = wordData.word.toLowerCase().trim();

  if (vocabulary[id]) {
    delete vocabulary[id];
    await chrome.storage.local.set({ vocabulary });
    return { isSaved: false };
  } else {
    vocabulary[id] = {
      id: id,
      word: wordData.word.trim(),
      translation: wordData.translation.trim(),
      phonetic: wordData.phonetic || '',
      audioUrl: wordData.audioUrl || '',
      contextSentence: (wordData.contextSentence || '').trim().slice(0, 300),
      sourceUrl: wordData.sourceUrl || '',
      dateAdded: Date.now()
    };
    await chrome.storage.local.set({ vocabulary });
    return { isSaved: true, word: vocabulary[id] };
  }
}

// Save word into vocabulary storage
async function saveWord(wordData) {
  const { vocabulary = {} } = await chrome.storage.local.get('vocabulary');
  const id = wordData.word.toLowerCase().trim();

  vocabulary[id] = {
    id: id,
    word: wordData.word.trim(),
    translation: wordData.translation.trim(),
    phonetic: wordData.phonetic || '',
    audioUrl: wordData.audioUrl || '',
    contextSentence: (wordData.contextSentence || '').trim().slice(0, 300),
    sourceUrl: wordData.sourceUrl || '',
    dateAdded: Date.now()
  };

  await chrome.storage.local.set({ vocabulary });
  return vocabulary[id];
}

// Check if word is already in vocabulary
async function getWordStatus(word) {
  if (!word) return false;
  const { vocabulary = {} } = await chrome.storage.local.get('vocabulary');
  const id = word.toLowerCase().trim();
  return !!vocabulary[id];
}

// Get all vocabulary items sorted by date descending (and apply auto-cleanup if set)
async function getVocabulary() {
  const { vocabulary = {}, autoCleanupDays = 0 } = await chrome.storage.local.get([
    'vocabulary',
    'autoCleanupDays'
  ]);

  if (autoCleanupDays && autoCleanupDays > 0) {
    const cutoff = Date.now() - (autoCleanupDays * 86400000);
    let changed = false;
    for (const [id, item] of Object.entries(vocabulary)) {
      if (item.dateAdded && item.dateAdded < cutoff) {
        delete vocabulary[id];
        changed = true;
      }
    }
    if (changed) {
      await chrome.storage.local.set({ vocabulary });
    }
  }

  return Object.values(vocabulary).sort((a, b) => (b.dateAdded || 0) - (a.dateAdded || 0));
}

// Delete word from storage
async function deleteWord(id) {
  const { vocabulary = {} } = await chrome.storage.local.get('vocabulary');
  const key = id.toLowerCase().trim();
  delete vocabulary[key];
  await chrome.storage.local.set({ vocabulary });
}

// Delete words added from a specific source URL or page hostname
async function deleteWordsBySource(sourceUrl) {
  if (!sourceUrl) return 0;
  const { vocabulary = {} } = await chrome.storage.local.get('vocabulary');

  let targetHostname = '';
  try {
    targetHostname = new URL(sourceUrl).hostname;
  } catch (e) {
    targetHostname = sourceUrl;
  }

  let deletedCount = 0;
  for (const [id, item] of Object.entries(vocabulary)) {
    let itemHostname = '';
    try {
      if (item.sourceUrl) itemHostname = new URL(item.sourceUrl).hostname;
    } catch (e) {}

    const matchUrl = item.sourceUrl === sourceUrl;
    const matchHost = targetHostname && itemHostname && itemHostname === targetHostname;

    if (matchUrl || matchHost) {
      delete vocabulary[id];
      deletedCount++;
    }
  }

  if (deletedCount > 0) {
    await chrome.storage.local.set({ vocabulary });
  }
  return deletedCount;
}

// Cleanup words older than specified days
async function cleanupOldWords(days) {
  if (!days || days <= 0) return 0;
  const { vocabulary = {} } = await chrome.storage.local.get('vocabulary');
  const cutoff = Date.now() - (days * 86400000);

  let deletedCount = 0;
  for (const [id, item] of Object.entries(vocabulary)) {
    if (item.dateAdded && item.dateAdded < cutoff) {
      delete vocabulary[id];
      deletedCount++;
    }
  }

  if (deletedCount > 0) {
    await chrome.storage.local.set({ vocabulary });
  }
  return deletedCount;
}

// Handle paragraph and sentence translation (solo traducción)
async function handleParagraphTranslation(rawText, targetLang = 'es') {
  const text = (rawText || '').trim();
  if (!text) throw new Error('Texto vacío');

  const cacheKey = `para_${text.slice(0, 50).toLowerCase()}_${targetLang}`;
  if (memoryCache.has(cacheKey)) {
    return memoryCache.get(cacheKey);
  }

  let translatedText = '';

  // Tier 1: Google Translate GTX endpoint (excellent for sentences and paragraphs)
  try {
    const gtxUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
    const res = await fetchWithTimeout(gtxUrl, {}, 6000);
    if (res.ok) {
      const data = await res.json();
      if (data && data[0] && Array.isArray(data[0])) {
        translatedText = data[0].map(s => s[0]).filter(Boolean).join('');
      }
    }
  } catch (e) {}

  // Tier 2: Google Dictionary client
  if (!translatedText) {
    try {
      const url = `https://clients5.google.com/translate_a/t?client=dict-chrome-ex&sl=auto&tl=${targetLang}&q=${encodeURIComponent(text)}`;
      const res = await fetchWithTimeout(url, {}, 6000);
      if (res.ok) {
        const data = await res.json();
        if (typeof data === 'string') translatedText = data;
        else if (Array.isArray(data)) {
          translatedText = typeof data[0] === 'string' ? data[0] : (Array.isArray(data[0]) ? data[0][0] : '');
        }
      }
    } catch (e) {}
  }

  // Tier 3: MyMemory
  if (!translatedText) {
    try {
      const mmUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|${targetLang}`;
      const res = await fetchWithTimeout(mmUrl, {}, 6000);
      if (res.ok) {
        const data = await res.json();
        if (data?.responseData?.translatedText) {
          translatedText = data.responseData.translatedText;
        }
      }
    } catch (e) {}
  }

  const googleTtsUrl = `https://translate.googleapis.com/translate_tts?ie=UTF-8&tl=en&client=tw-ob&q=${encodeURIComponent(text.slice(0, 150))}`;

  const result = {
    original: text,
    translation: translatedText || 'No se pudo traducir el párrafo',
    googleTtsUrl: googleTtsUrl,
    isParagraph: true
  };

  memoryCache.set(cacheKey, result);
  return result;
}

// Update Action badge when extension is enabled/disabled
function updateExtensionBadge(isEnabled) {
  try {
    const actionApi = chrome.action || chrome.browserAction;
    if (!actionApi) return;
    if (!isEnabled) {
      actionApi.setBadgeText({ text: 'OFF' });
      actionApi.setBadgeBackgroundColor({ color: '#64748b' });
    } else {
      actionApi.setBadgeText({ text: '' });
    }
  } catch (e) {
    console.warn('Error al actualizar badge:', e);
  }
}

// Sync badge on startup/installation
async function initBadge() {
  try {
    const { isExtensionEnabled = true } = await chrome.storage.local.get('isExtensionEnabled');
    updateExtensionBadge(isExtensionEnabled);
  } catch (e) {}
}

chrome.runtime.onInstalled.addListener(() => {
  initBadge();
});

if (chrome.runtime.onStartup) {
  chrome.runtime.onStartup.addListener(() => {
    initBadge();
  });
}

initBadge();
