// popup.js - Controller for extension toolbar popup
// Manages Vocabulary list, Page Filters, Interactive Quiz, Settings and Exports

document.addEventListener('DOMContentLoaded', async () => {
  let allWords = [];
  let currentFilter = 'all'; // 'all' or 'page'
  let searchQuery = '';
  let currentTabUrl = '';
  let currentHostname = '';

  // Quiz State
  let quizQuestions = [];
  let currentQuizIndex = 0;
  let quizScore = 0;
  let quizAnswered = false;
  let selectedOptionIndex = null;

  // DOM Elements - Header
  const countSavedEl = document.getElementById('count-saved');
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabPanes = document.querySelectorAll('.tab-pane');
  const extensionToggle = document.getElementById('extension-toggle');
  const toggleStatusLabel = document.getElementById('toggle-status-label');

  // DOM Elements - Vocab Tab
  const searchInput = document.getElementById('search-input');
  const filterAllBtn = document.getElementById('filter-all');
  const filterPageBtn = document.getElementById('filter-page');
  const countFilterAll = document.getElementById('count-filter-all');
  const countFilterPage = document.getElementById('count-filter-page');
  const btnClearPage = document.getElementById('btn-clear-page');
  const wordListEl = document.getElementById('word-list');
  const emptyVocabEl = document.getElementById('empty-vocabulary');
  const emptyVocabMsg = document.getElementById('empty-vocab-msg');

  // DOM Elements - Quiz Tab
  const quizActiveEl = document.getElementById('quiz-active');
  const quizFinishedEl = document.getElementById('quiz-finished');
  const quizEmptyEl = document.getElementById('quiz-empty');
  const quizQuestionNumber = document.getElementById('quiz-question-number');
  const quizScoreBadge = document.getElementById('quiz-score-badge');
  const quizProgressBar = document.getElementById('quiz-progress-bar');
  const quizAudioBtn = document.getElementById('quiz-audio-btn');
  const quizWordEl = document.getElementById('quiz-word');
  const quizPhoneticEl = document.getElementById('quiz-phonetic');
  const quizHintEl = document.getElementById('quiz-hint');
  const quizOptionsEl = document.getElementById('quiz-options');
  const quizActionBtn = document.getElementById('quiz-action-btn');
  const quizFinishPercent = document.getElementById('quiz-finish-percent');
  const quizFinishScore = document.getElementById('quiz-finish-score');
  const statCorrectCount = document.getElementById('stat-correct-count');
  const statWrongCount = document.getElementById('stat-wrong-count');
  const quizFinishIcon = document.getElementById('quiz-finish-icon');
  const btnRestartQuiz = document.getElementById('btn-restart-quiz');
  const btnExportQuizHtml = document.getElementById('btn-export-quiz-html');
  const btnQuizToVocab = document.getElementById('btn-quiz-to-vocab');

  // DOM Elements - Settings Tab
  const settingsCurrentDomain = document.getElementById('settings-current-domain');
  const settingsCurrentPageCount = document.getElementById('settings-current-page-count');
  const btnCleanCurrentDomain = document.getElementById('btn-clean-current-domain');
  const selectAutoCleanup = document.getElementById('select-auto-cleanup');
  const btnRunCleanupNow = document.getElementById('btn-run-cleanup-now');
  const btnExportCsv = document.getElementById('btn-export-csv');
  const btnExportJson = document.getElementById('btn-export-json');
  const btnExportQuizStandalone = document.getElementById('btn-export-quiz-standalone');
  const btnClearAll = document.getElementById('btn-clear-all');

  // SVG Icons
  const speakerSvg = `
    <svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77zm-2.5-1.73L6.5 6H2v12h4.5l5 4.5v-21zm-1.5 4.27v12.46L6.85 15H4V9h2.85l3.65-3.23zM14 8.5v7c1.48-.73 2.5-2.25 2.5-3.5S15.48 9.23 14 8.5z"/></svg>
  `;

  const deleteSvg = `
    <svg viewBox="0 0 24 24" width="15" height="15"><path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
  `;

  // Detect active tab and domain
  async function detectActiveTab() {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs && tabs.length > 0 && tabs[0].url) {
        currentTabUrl = tabs[0].url;
        try {
          currentHostname = new URL(currentTabUrl).hostname;
        } catch (e) {
          currentHostname = '';
        }
      }
    } catch (e) {
      console.warn('No se pudo acceder a la URL de la pestaña activa:', e);
    }
  }

  // Check if word belongs to current tab
  function wordMatchesCurrentPage(word) {
    if (!currentTabUrl && !currentHostname) return false;
    if (word.sourceUrl === currentTabUrl) return true;
    if (word.sourceUrl && currentHostname) {
      try {
        return new URL(word.sourceUrl).hostname === currentHostname;
      } catch (e) {}
    }
    return false;
  }

  // Load Vocabulary and Settings
  async function loadData() {
    try {
      await detectActiveTab();

      const res = await chrome.runtime.sendMessage({ action: 'getVocabulary' });
      allWords = (res && res.success && res.words) ? res.words : [];

      // Auto-cleanup setting
      const cleanupRes = await chrome.runtime.sendMessage({ action: 'getAutoCleanupSetting' });
      if (cleanupRes && cleanupRes.success && selectAutoCleanup) {
        selectAutoCleanup.value = String(cleanupRes.days || 0);
      }

      // Extension enabled toggle state
      const { isExtensionEnabled = true } = await chrome.storage.local.get('isExtensionEnabled');
      if (extensionToggle) {
        extensionToggle.checked = isExtensionEnabled;
      }
      updateToggleUI(isExtensionEnabled);

      updateUI();
    } catch (err) {
      console.error('Error al cargar datos:', err);
    }
  }

  function updateToggleUI(isEnabled) {
    if (!toggleStatusLabel) return;
    toggleStatusLabel.textContent = isEnabled ? 'ON' : 'OFF';
    if (isEnabled) {
      toggleStatusLabel.classList.add('active');
    } else {
      toggleStatusLabel.classList.remove('active');
    }
  }

  if (extensionToggle) {
    extensionToggle.addEventListener('change', async () => {
      const isEnabled = extensionToggle.checked;
      updateToggleUI(isEnabled);
      await chrome.storage.local.set({ isExtensionEnabled: isEnabled });
      chrome.runtime.sendMessage({ action: 'setExtensionEnabled', isEnabled }).catch(() => {});
    });
  }

  // Update UI components
  function updateUI() {
    const totalCount = allWords.length;
    const pageWords = allWords.filter(wordMatchesCurrentPage);
    const pageCount = pageWords.length;

    // Header pill
    countSavedEl.textContent = `${totalCount} palabra${totalCount === 1 ? '' : 's'}`;

    // Filter counts
    countFilterAll.textContent = totalCount;
    countFilterPage.textContent = pageCount;

    // Page clear button visibility
    if (pageCount > 0 && (currentFilter === 'page' || currentHostname)) {
      btnClearPage.classList.remove('hidden');
    } else {
      btnClearPage.classList.add('hidden');
    }

    // Settings page info
    if (settingsCurrentDomain) {
      settingsCurrentDomain.textContent = currentHostname || 'Página local / Desconocida';
    }
    if (settingsCurrentPageCount) {
      settingsCurrentPageCount.textContent = `${pageCount} palabra${pageCount === 1 ? '' : 's'}`;
    }

    renderWordList();
  }

  // Render Vocabulary List
  function renderWordList() {
    wordListEl.replaceChildren();

    // Filter by tab
    let words = currentFilter === 'page' ? allWords.filter(wordMatchesCurrentPage) : allWords;

    // Filter by search query
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      words = words.filter(w =>
        (w.word && w.word.toLowerCase().includes(q)) ||
        (w.translation && w.translation.toLowerCase().includes(q))
      );
    }

    if (words.length === 0) {
      emptyVocabEl.classList.remove('hidden');
      if (currentFilter === 'page') {
        emptyVocabMsg.textContent = 'No hay palabras guardadas de esta página web.';
      } else if (searchQuery) {
        emptyVocabMsg.textContent = `No se encontraron resultados para "${searchQuery}".`;
      } else {
        emptyVocabMsg.textContent = 'Tu lista de vocabulario está vacía.';
      }
      return;
    }

    emptyVocabEl.classList.add('hidden');

    words.forEach(w => {
      const card = document.createElement('div');
      card.className = 'word-card';
      const dateStr = w.dateAdded ? new Date(w.dateAdded).toLocaleDateString() : '';

      // Clean phonetics display
      const cleanPhonetic = (w.phonetic || '').trim();
      const hasRealPhonetic = cleanPhonetic && cleanPhonetic.toLowerCase() !== `[${w.word.toLowerCase().trim()}]`;
      const phoneticHtml = hasRealPhonetic ? `<span class="wc-phonetic">${escapeHtml(cleanPhonetic)}</span>` : '';

      // Domain badge
      let domainStr = '';
      if (w.sourceUrl) {
        try {
          domainStr = new URL(w.sourceUrl).hostname.replace(/^www\./, '');
        } catch (e) {}
      }

      const cardNodes = new DOMParser().parseFromString(`
        <div class="wc-top-row">
          <div class="wc-word-info">
            <span class="wc-word">${escapeHtml(w.word)}</span>
            ${phoneticHtml}
          </div>
          <div class="wc-actions">
            <button class="btn-icon btn-icon-audio" title="Escuchar">${speakerSvg}</button>
            <button class="btn-icon btn-icon-delete" title="Eliminar de vocabulario">${deleteSvg}</button>
          </div>
        </div>

        <div class="wc-translation">${escapeHtml(w.translation)}</div>

        ${w.contextSentence ? `<div class="wc-context">"${escapeHtml(w.contextSentence)}"</div>` : ''}

        <div class="wc-footer">
          <span class="wc-date">${dateStr}</span>
          ${domainStr ? `<span class="wc-source-badge" title="${escapeHtml(w.sourceUrl)}">🌐 ${escapeHtml(domainStr)}</span>` : ''}
        </div>
      `, 'text/html').body.childNodes;

      card.replaceChildren(...cardNodes);

      // Audio button
      const audioBtn = card.querySelector('.btn-icon-audio');
      audioBtn.addEventListener('click', () => {
        playAudio(w.word, w.audioUrl);
      });

      // Delete button
      const deleteBtn = card.querySelector('.btn-icon-delete');
      deleteBtn.addEventListener('click', async () => {
        if (confirm(`¿Eliminar "${w.word}" del vocabulario?`)) {
          await chrome.runtime.sendMessage({ action: 'deleteWord', id: w.id });
          await loadData();
        }
      });

      wordListEl.appendChild(card);
    });
  }

  // Filter Buttons
  filterAllBtn.addEventListener('click', () => {
    currentFilter = 'all';
    filterAllBtn.classList.add('active');
    filterPageBtn.classList.remove('active');
    updateUI();
  });

  filterPageBtn.addEventListener('click', () => {
    currentFilter = 'page';
    filterPageBtn.classList.add('active');
    filterAllBtn.classList.remove('active');
    updateUI();
  });

  // Clear Page Words button
  async function handleClearCurrentPage() {
    const pageWords = allWords.filter(wordMatchesCurrentPage);
    if (pageWords.length === 0) {
      alert('No hay palabras de esta página para borrar.');
      return;
    }

    const domainLabel = currentHostname || 'esta página';
    if (confirm(`¿Eliminar las ${pageWords.length} palabras guardadas de ${domainLabel}?`)) {
      await chrome.runtime.sendMessage({
        action: 'deleteWordsBySource',
        sourceUrl: currentTabUrl
      });
      await loadData();
    }
  }

  btnClearPage.addEventListener('click', handleClearCurrentPage);
  btnCleanCurrentDomain.addEventListener('click', handleClearCurrentPage);

  // Search input filter
  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value.trim();
    renderWordList();
  });

  // ================= QUIZ MODE LOGIC =================
  function initQuiz() {
    if (allWords.length < 2) {
      quizActiveEl.classList.add('hidden');
      quizFinishedEl.classList.add('hidden');
      quizEmptyEl.classList.remove('hidden');
      return;
    }

    quizEmptyEl.classList.add('hidden');
    quizFinishedEl.classList.add('hidden');
    quizActiveEl.classList.remove('hidden');

    // Shuffle vocabulary words to build quiz questions (up to 10 questions)
    const shuffledPool = [...allWords].sort(() => 0.5 - Math.random());
    const maxQuestions = Math.min(10, shuffledPool.length);

    quizQuestions = shuffledPool.slice(0, maxQuestions).map((item) => {
      // Pick 3 distractors
      const distractors = allWords
        .filter(w => w.id !== item.id && w.translation !== item.translation)
        .map(w => w.translation)
        .sort(() => 0.5 - Math.random())
        .slice(0, 3);

      // Fallback distractors if pool is small
      const fallbackList = ['pantalla', 'oficina', 'semanas', 'tiempo', 'desarrollo', 'personas', 'empresa', 'ayuda'];
      while (distractors.length < 3) {
        const pick = fallbackList[Math.floor(Math.random() * fallbackList.length)];
        if (pick !== item.translation && !distractors.includes(pick)) {
          distractors.push(pick);
        }
      }

      // Combine and shuffle options
      const options = [item.translation, ...distractors].sort(() => 0.5 - Math.random());

      return {
        word: item.word,
        phonetic: item.phonetic || '',
        audioUrl: item.audioUrl || '',
        correctAnswer: item.translation,
        contextSentence: item.contextSentence || '',
        options: options
      };
    });

    currentQuizIndex = 0;
    quizScore = 0;
    renderQuizQuestion();
  }

  function renderQuizQuestion() {
    quizAnswered = false;
    selectedOptionIndex = null;
    quizActionBtn.disabled = true;
    quizActionBtn.className = 'quiz-action-btn disabled';
    quizActionBtn.textContent = 'Selecciona una respuesta';

    const total = quizQuestions.length;
    const q = quizQuestions[currentQuizIndex];
    if (!q) return;

    // Progress and stats
    quizQuestionNumber.textContent = `Pregunta ${currentQuizIndex + 1} de ${total}`;
    quizScoreBadge.textContent = `${quizScore} acierto${quizScore === 1 ? '' : 's'}`;
    const progressPercent = Math.round(((currentQuizIndex) / total) * 100);
    quizProgressBar.style.width = `${progressPercent}%`;

    // Question content
    quizWordEl.textContent = q.word;

    const cleanPhonetic = (q.phonetic || '').trim();
    if (cleanPhonetic && cleanPhonetic.toLowerCase() !== `[${q.word.toLowerCase()}]`) {
      quizPhoneticEl.textContent = cleanPhonetic;
      quizPhoneticEl.classList.remove('hidden');
    } else {
      quizPhoneticEl.classList.add('hidden');
    }

    if (q.contextSentence) {
      quizHintEl.textContent = `Pista: "${q.contextSentence.slice(0, 70)}..."`;
      quizHintEl.classList.remove('hidden');
    } else {
      quizHintEl.classList.add('hidden');
    }

    // Generate option buttons (A, B, C, D)
    quizOptionsEl.replaceChildren();
    const letters = ['A', 'B', 'C', 'D'];

    q.options.forEach((opt, idx) => {
      const btn = document.createElement('button');
      btn.className = 'quiz-opt-btn';

      const letterSpan = document.createElement('span');
      letterSpan.className = 'quiz-opt-letter';
      letterSpan.textContent = letters[idx] || '';

      const textSpan = document.createElement('span');
      textSpan.className = 'quiz-opt-text';
      textSpan.textContent = opt;

      btn.replaceChildren(letterSpan, textSpan);

      btn.addEventListener('click', () => {
        // If already evaluated, don't allow changing
        if (quizAnswered) return;

        // User can change selection freely before confirming!
        selectedOptionIndex = idx;
        const allBtns = quizOptionsEl.querySelectorAll('.quiz-opt-btn');
        allBtns.forEach((b, i) => {
          if (i === idx) {
            b.classList.add('selected');
          } else {
            b.classList.remove('selected');
          }
        });

        // Enable confirm action button
        quizActionBtn.disabled = false;
        quizActionBtn.className = 'quiz-action-btn btn-ready';
        quizActionBtn.textContent = 'Comprobar respuesta';
      });

      quizOptionsEl.appendChild(btn);
    });
  }

  // Quiz Audio button
  quizAudioBtn.addEventListener('click', () => {
    const q = quizQuestions[currentQuizIndex];
    if (q) playAudio(q.word, q.audioUrl);
  });

  // Action Button (Confirm selection -> Next Question / Show Results)
  quizActionBtn.addEventListener('click', () => {
    const total = quizQuestions.length;
    const q = quizQuestions[currentQuizIndex];
    if (!q) return;

    if (!quizAnswered) {
      if (selectedOptionIndex === null) return;
      quizAnswered = true;

      const chosenOpt = q.options[selectedOptionIndex];
      const isCorrect = chosenOpt === q.correctAnswer;
      const allBtns = quizOptionsEl.querySelectorAll('.quiz-opt-btn');

      if (isCorrect) {
        allBtns[selectedOptionIndex]?.classList.add('correct');
        quizScore++;
        quizScoreBadge.textContent = `${quizScore} acierto${quizScore === 1 ? '' : 's'}`;
        playAudio(q.word, q.audioUrl);
      } else {
        allBtns[selectedOptionIndex]?.classList.add('wrong');
        // Highlight correct answer
        allBtns.forEach((b, idx) => {
          if (q.options[idx] === q.correctAnswer) {
            b.classList.add('correct');
          }
        });
      }

      // Update button state for next action
      quizActionBtn.className = 'quiz-action-btn btn-next';
      if (currentQuizIndex + 1 < total) {
        quizActionBtn.textContent = 'Siguiente pregunta ➔';
      } else {
        quizActionBtn.textContent = 'Ver resultados 🏆';
      }
    } else {
      // Advance to next question or show finished screen
      if (currentQuizIndex + 1 < total) {
        currentQuizIndex++;
        renderQuizQuestion();
      } else {
        showQuizFinished();
      }
    }
  });

  // Show finished screen
  function showQuizFinished() {
    quizActiveEl.classList.add('hidden');
    quizFinishedEl.classList.remove('hidden');

    const total = quizQuestions.length;
    const percent = Math.round((quizScore / total) * 100);
    const wrongCount = total - quizScore;

    quizProgressBar.style.width = '100%';
    quizFinishPercent.textContent = `${percent}%`;
    quizFinishScore.textContent = `Acertaste ${quizScore} de ${total} preguntas`;
    statCorrectCount.textContent = `${quizScore}`;
    statWrongCount.textContent = `${wrongCount}`;

    if (percent === 100) {
      quizFinishIcon.textContent = '🏆';
    } else if (percent >= 70) {
      quizFinishIcon.textContent = '🌟';
    } else if (percent >= 50) {
      quizFinishIcon.textContent = '👍';
    } else {
      quizFinishIcon.textContent = '📚';
    }
  }

  btnRestartQuiz.addEventListener('click', initQuiz);
  btnQuizToVocab.addEventListener('click', () => {
    switchTab('vocabulary');
  });

  // ================= EXPORT FUNCTIONS =================
  // Export CSV
  btnExportCsv.addEventListener('click', () => {
    if (allWords.length === 0) {
      alert('No hay palabras para exportar.');
      return;
    }

    const headers = ['Palabra en Inglés', 'Traducción', 'Fonética', 'Frase de Contexto', 'Sitio Web', 'Fecha'];
    const rows = allWords.map(w => [
      `"${(w.word || '').replace(/"/g, '""')}"`,
      `"${(w.translation || '').replace(/"/g, '""')}"`,
      `"${(w.phonetic || '').replace(/"/g, '""')}"`,
      `"${(w.contextSentence || '').replace(/"/g, '""')}"`,
      `"${(w.sourceUrl || '').replace(/"/g, '""')}"`,
      `"${w.dateAdded ? new Date(w.dateAdded).toISOString() : ''}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    downloadFile(csvContent, 'mi_vocabulario_ingles.csv', 'text/csv;charset=utf-8;');
  });

  // Export JSON
  btnExportJson.addEventListener('click', () => {
    if (allWords.length === 0) {
      alert('No hay palabras para exportar.');
      return;
    }
    const jsonContent = JSON.stringify(allWords, null, 2);
    downloadFile(jsonContent, 'mi_vocabulario_ingles.json', 'application/json');
  });

  // Export Standalone Interactive HTML Quiz (playable offline on any device/mobile!)
  function generateInteractiveQuizHtml() {
    if (allWords.length === 0) {
      alert('Agrega al menos una palabra antes de exportar el Quiz.');
      return;
    }

    const quizDataJson = JSON.stringify(allWords.map(w => ({
      word: w.word,
      translation: w.translation,
      phonetic: w.phonetic || '',
      context: w.contextSentence || ''
    })));

    const htmlContent = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Quiz de Vocabulario Inglés</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; background: #0f172a; color: #f8fafc; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; padding: 20px; }
    .quiz-box { background: #1e293b; border-radius: 20px; padding: 30px; width: 100%; max-width: 440px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); border: 1px solid #334155; text-align: center; }
    h1 { font-size: 22px; color: #10b981; margin-bottom: 6px; }
    .sub { font-size: 13px; color: #94a3b8; margin-bottom: 20px; }
    .q-card { background: #0f172a; border-radius: 14px; padding: 20px; margin-bottom: 20px; border: 1px solid #334155; }
    .word { font-size: 32px; font-weight: 800; color: #ffffff; }
    .phonetic { color: #10b981; font-size: 14px; margin-top: 4px; font-weight: 600; }
    .hint { font-size: 12px; color: #94a3b8; margin-top: 10px; font-style: italic; }
    .opts { display: flex; flex-direction: column; gap: 8px; }
    .btn-opt { background: #334155; color: white; border: 2px solid transparent; padding: 12px 14px; border-radius: 12px; font-size: 15px; font-weight: 600; cursor: pointer; transition: all 0.15s; text-align: left; }
    .btn-opt:hover { background: #475569; }
    .btn-opt.selected { border-color: #10b981; background: #064e3b; color: #a7f3d0; }
    .btn-opt.correct { background: #10b981 !important; color: white !important; border-color: #059669 !important; }
    .btn-opt.wrong { background: #ef4444 !important; color: white !important; border-color: #dc2626 !important; }
    .btn-next { width: 100%; background: #10b981; color: white; border: none; padding: 13px; border-radius: 12px; font-size: 15px; font-weight: 700; margin-top: 14px; cursor: pointer; transition: background 0.15s; }
    .btn-next:disabled { background: #475569; color: #94a3b8; cursor: not-allowed; }
    .btn-next.next-ready { background: #6366f1; }
    .btn-audio { background: none; border: none; font-size: 20px; cursor: pointer; color: #94a3b8; margin-left: 8px; }
    .progress { font-size: 12px; color: #94a3b8; margin-bottom: 12px; display: flex; justify-content: space-between; }
    .hidden { display: none; }
    .score-circle { width: 90px; height: 90px; border-radius: 50%; background: #064e3b; border: 3px solid #10b981; display: flex; align-items: center; justify-content: center; font-size: 26px; font-weight: 800; color: #a7f3d0; margin: 15px auto; }
  </style>
</head>
<body>
  <div class="quiz-box">
    <h1>Lector Inglés - Quiz</h1>
    <p class="sub">Practica tu vocabulario guardado</p>
    <div class="progress"><span id="q-count">Pregunta 1</span><span id="score">0 aciertos</span></div>
    <div class="q-card">
      <div><span class="word" id="word">Word</span><button class="btn-audio" id="btn-audio" title="Escuchar">🔊</button></div>
      <div class="phonetic" id="phonetic"></div>
      <div class="hint" id="hint"></div>
    </div>
    <div class="opts" id="opts"></div>
    <button class="btn-next" id="btn-next" disabled>Selecciona una opción</button>
  </div>
  <script>
    const data = ${quizDataJson};
    let current = 0, score = 0, answered = false, selectedIdx = null, currentOpts = [], correctOpt = '';
    function playWord(w) {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(w);
        u.lang = 'en-US';
        window.speechSynthesis.speak(u);
      }
    }
    function renderQ() {
      answered = false;
      selectedIdx = null;
      const btn = document.getElementById('btn-next');
      btn.disabled = true;
      btn.className = 'btn-next';
      btn.textContent = 'Selecciona una opción';

      if (current >= data.length) {
        const percent = Math.round((score / data.length) * 100);
        document.querySelector('.quiz-box').innerHTML = '<h1>🏆 ¡Quiz Terminado!</h1><div class="score-circle">' + percent + '%</div><p class="word" style="font-size:20px; color:#10b981;">Acertaste ' + score + ' de ' + data.length + ' preguntas</p><button class="btn-next" style="margin-top:20px;" onclick="location.reload()">🔄 Reiniciar Quiz</button>';
        return;
      }
      const item = data[current];
      correctOpt = item.translation;
      document.getElementById('q-count').textContent = 'Pregunta ' + (current + 1) + ' de ' + data.length;
      document.getElementById('score').textContent = score + ' aciertos';
      document.getElementById('word').textContent = item.word;
      document.getElementById('phonetic').textContent = item.phonetic;
      document.getElementById('hint').textContent = item.context ? 'Pista: "' + item.context.slice(0, 70) + '..."' : '';
      const distractors = data.filter(w => w.word !== item.word).map(w => w.translation).sort(() => 0.5 - Math.random()).slice(0, 3);
      while (distractors.length < 3) distractors.push('pantalla', 'oficina', 'semanas');
      currentOpts = [item.translation, ...distractors.slice(0, 3)].sort(() => 0.5 - Math.random());
      const optsEl = document.getElementById('opts');
      optsEl.innerHTML = '';
      currentOpts.forEach((opt, idx) => {
        const b = document.createElement('button');
        b.className = 'btn-opt';
        b.textContent = opt;
        b.onclick = () => {
          if (answered) return;
          selectedIdx = idx;
          document.querySelectorAll('.btn-opt').forEach((el, i) => {
            if (i === idx) el.classList.add('selected');
            else el.classList.remove('selected');
          });
          btn.disabled = false;
          btn.textContent = 'Comprobar respuesta';
        };
        optsEl.appendChild(b);
      });
    }
    document.getElementById('btn-audio').onclick = () => playWord(data[current].word);
    document.getElementById('btn-next').onclick = () => {
      const btn = document.getElementById('btn-next');
      if (!answered) {
        if (selectedIdx === null) return;
        answered = true;
        const all = document.querySelectorAll('.btn-opt');
        if (currentOpts[selectedIdx] === correctOpt) {
          all[selectedIdx].classList.add('correct');
          score++;
          document.getElementById('score').textContent = score + ' aciertos';
          playWord(data[current].word);
        } else {
          all[selectedIdx].classList.add('wrong');
          all.forEach((el, i) => { if (currentOpts[i] === correctOpt) el.classList.add('correct'); });
        }
        btn.className = 'btn-next next-ready';
        btn.textContent = (current + 1 < data.length) ? 'Siguiente pregunta ➔' : 'Ver resultados 🏆';
      } else {
        current++;
        renderQ();
      }
    };
    renderQ();
  </script>
</body>
</html>`;

    downloadFile(htmlContent, 'quiz_vocabulario_ingles.html', 'text/html;charset=utf-8;');
  }

  btnExportQuizHtml?.addEventListener('click', generateInteractiveQuizHtml);
  btnExportQuizStandalone?.addEventListener('click', generateInteractiveQuizHtml);

  // Auto-cleanup setting change
  selectAutoCleanup.addEventListener('change', async (e) => {
    const days = parseInt(e.target.value, 10) || 0;
    const res = await chrome.runtime.sendMessage({
      action: 'setAutoCleanupSetting',
      days: days
    });
    if (res && res.cleaned > 0) {
      alert(`Se limpiaron ${res.cleaned} palabras que tenían más de ${days} días.`);
    }
    await loadData();
  });

  // Run cleanup now button
  btnRunCleanupNow.addEventListener('click', async () => {
    const days = parseInt(selectAutoCleanup.value, 10) || 0;
    if (days <= 0) {
      alert('Selecciona un período de días (por ejemplo: más de 7 o 30 días) para ejecutar la limpieza.');
      return;
    }
    const res = await chrome.runtime.sendMessage({ action: 'cleanupOldWords', days: days });
    alert(`Limpieza ejecutada: se eliminaron ${res.count || 0} palabras antiguas.`);
    await loadData();
  });

  // Clear all words button
  btnClearAll.addEventListener('click', async () => {
    if (confirm('¿Estás seguro de que deseas borrar TODO el vocabulario? Esta acción no se puede deshacer.')) {
      await chrome.runtime.sendMessage({ action: 'clearAllWords' });
      await loadData();
    }
  });

  // Natural Speech Pronunciation
  function getEnglishVoice() {
    const all = window.speechSynthesis ? window.speechSynthesis.getVoices() : [];
    const englishVoices = all.filter(v => v.lang && (v.lang.startsWith('en') || v.lang.startsWith('en-') || v.lang.startsWith('en_')));
    if (englishVoices.length === 0) return null;

    const preferred = ['Samantha', 'Google US English', 'Daniel', 'Alex', 'Victoria', 'Karen', 'Fred'];
    for (const name of preferred) {
      const match = englishVoices.find(v => v.name.includes(name));
      if (match) return match;
    }
    return englishVoices[0];
  }

  function playAudio(word, audioUrl) {
    if (audioUrl) {
      const audio = new Audio(audioUrl);
      audio.play().catch(() => tryGoogleTts(word));
      return;
    }
    tryGoogleTts(word);
  }

  function tryGoogleTts(word) {
    const ttsUrl = `https://translate.googleapis.com/translate_tts?ie=UTF-8&tl=en&client=tw-ob&q=${encodeURIComponent(word)}`;
    const googleAudio = new Audio(ttsUrl);
    googleAudio.play().catch(() => playSpeech(word));
  }

  function playSpeech(word) {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(word);
    const englishVoice = getEnglishVoice();
    if (englishVoice) {
      utterance.voice = englishVoice;
    }
    utterance.lang = 'en-US';
    utterance.rate = 0.94;
    window.speechSynthesis.speak(utterance);
  }

  // Tab Switcher
  function switchTab(tabName) {
    tabBtns.forEach(b => b.classList.remove('active'));
    tabPanes.forEach(p => p.classList.remove('active'));

    const activeBtn = document.querySelector(`.tab-btn[data-tab="${tabName}"]`);
    const activePane = document.getElementById(`tab-${tabName}`);

    if (activeBtn) activeBtn.classList.add('active');
    if (activePane) activePane.classList.add('active');

    if (tabName === 'quiz') {
      initQuiz();
    }
  }

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabName = btn.getAttribute('data-tab');
      switchTab(tabName);
    });
  });

  function downloadFile(content, fileName, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function escapeHtml(str) {
    return (str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Initial Load
  await loadData();
});
