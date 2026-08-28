(function () {
  'use strict';

  const DATA = window.VOCABULARY_DATA;
  const STATE_KEY = 'vocab-v2:state';
  const LEGACY_KEY = 'vocab-v1:data';
  const SOURCE_LABELS = { ngsl: 'NGSL', nawl: 'NAWL', tsl: 'TSL', custom: '自訂' };
  const BAND_LABELS = {
    high: '高學習權重',
    medium: '中學習權重',
    low: '基礎學習權重',
  };
  const KOKORO_VOICES = {
    'en-US': [
      { id: 'af_heart', label: 'Heart（女聲・推薦）' },
      { id: 'af_bella', label: 'Bella（女聲）' },
      { id: 'am_michael', label: 'Michael（男聲）' },
    ],
    'en-GB': [
      { id: 'bf_emma', label: 'Emma（女聲・推薦）' },
      { id: 'bm_george', label: 'George（男聲）' },
    ],
  };
  const FUNCTION_WORDS = new Set([
    'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'as', 'at',
    'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by', 'can', 'could',
    'did', 'do', 'does', 'doing', 'down', 'during', 'each', 'few', 'for', 'from', 'further', 'had', 'has',
    'have', 'having', 'he', 'her', 'here', 'hers', 'herself', 'him', 'himself', 'his', 'how', 'i', 'if',
    'in', 'into', 'is', 'it', 'its', 'itself', 'just', 'me', 'more', 'most', 'my', 'myself', 'no', 'nor',
    'not', 'now', 'of', 'off', 'on', 'once', 'only', 'or', 'other', 'our', 'ours', 'ourselves', 'out',
    'over', 'own', 'same', 'she', 'should', 'so', 'some', 'such', 'than', 'that', 'the', 'their', 'theirs',
    'them', 'themselves', 'then', 'there', 'these', 'they', 'this', 'those', 'through', 'to', 'too', 'under',
    'until', 'up', 'very', 'was', 'we', 'were', 'what', 'when', 'where', 'which', 'while', 'who', 'whom',
    'why', 'will', 'with', 'would', 'you', 'your', 'yours', 'yourself', 'yourselves',
  ]);

  const elements = {};
  let state = loadState();
  let learned = new Set(state.learned);
  let session = [];
  let index = 0;
  let voices = [];
  let kokoroWorker = null;
  let kokoroReady = false;
  let kokoroBusy = false;
  let kokoroRequestId = 0;
  let pendingKokoroWord = '';
  let audioContext = null;
  let activeAudioSource = null;
  let fallbackAudio = null;
  let answerLocked = false;
  let questionChoices = [];

  function byId(id) {
    return document.getElementById(id);
  }

  function cacheElements() {
    [
      'unique-count', 'source-count', 'exam-filter', 'search-input', 'frequency-filter', 'unlearned-only',
      'pool-count', 'weight-badge', 'frequency-label', 'source-label', 'card-wrap', 'card', 'card-term',
      'card-phonetic', 'card-meaning', 'card-definition', 'card-note-preview', 'btn-speak', 'speech-engine',
      'accent-select', 'kokoro-voice-option', 'kokoro-voice-select', 'device-voice-option', 'voice-select',
      'voice-info', 'auto-speak', 'speech-status', 'model-panel', 'model-status', 'model-detail',
      'model-progress', 'model-progress-fill', 'btn-release-model', 'btn-prev', 'btn-shuffle', 'btn-next',
      'card-count', 'session-progress', 'app-status', 'btn-install',
      'card-position', 'learned-percent', 'mastery-progress', 'learned-summary', 'btn-learned', 'note-input',
      'btn-save-note', 'note-status', 'term-input', 'meaning-input', 'btn-add', 'btn-reset', 'data-status',
      'streak-count', 'xp-count', 'answer-grid', 'answer-feedback', 'btn-continue', 'run-correct',
      'run-progress', 'run-message', 'btn-settings', 'settings-panel', 'btn-close-settings',
      'round-step', 'feedback-title', 'feedback-streak', 'current-weight', 'current-source',
    ].forEach((id) => { elements[id] = byId(id); });
  }

  function defaultState() {
    return {
      learned: [],
      custom: [],
      notes: {},
      filters: { exam: 'all', frequency: 'all', unlearnedOnly: false },
      game: { xp: 0, streak: 0, bestStreak: 0, runCorrect: 0 },
      audio: {
        engine: 'kokoro',
        accent: 'en-US',
        kokoroVoice: 'af_heart',
        voiceURI: '',
        autoSpeak: false,
      },
    };
  }

  function loadState() {
    const fallback = defaultState();
    try {
      const stored = JSON.parse(localStorage.getItem(STATE_KEY));
      if (stored && typeof stored === 'object') {
        return {
          learned: Array.isArray(stored.learned) ? stored.learned : [],
          custom: Array.isArray(stored.custom) ? stored.custom : [],
          notes: stored.notes && typeof stored.notes === 'object' ? stored.notes : {},
          filters: { ...fallback.filters, ...(stored.filters || {}) },
          game: { ...fallback.game, ...(stored.game || {}) },
          audio: { ...fallback.audio, ...(stored.audio || {}) },
        };
      }
    } catch (error) {
      // Ignore malformed local data and continue with a clean state.
    }
    return migrateLegacyState(fallback);
  }

  function migrateLegacyState(fallback) {
    try {
      const legacy = JSON.parse(localStorage.getItem(LEGACY_KEY));
      if (!Array.isArray(legacy) || !DATA || !Array.isArray(DATA.entries)) return fallback;
      const baseLookup = new Map(DATA.entries.map((entry) => [entry.word.toLocaleLowerCase('en'), entry]));
      legacy.forEach((card, legacyIndex) => {
        const word = String(card.term || '').trim();
        if (!word) return;
        const base = baseLookup.get(word.toLocaleLowerCase('en'));
        if (base && card.learned) fallback.learned.push(base.id);
        if (!base) {
          fallback.custom.push(makeCustomWord(word, String(card.meaning || ''), `legacy-${legacyIndex}`));
        }
      });
    } catch (error) {
      return fallback;
    }
    return fallback;
  }

  function persist() {
    state.learned = Array.from(learned);
    try {
      localStorage.setItem(STATE_KEY, JSON.stringify(state));
    } catch (error) {
      elements['data-status'].textContent = '瀏覽器儲存空間不足，這次變更可能無法保留。';
    }
  }

  function makeCustomWord(word, meaning, suffix) {
    return {
      id: `custom:${word.toLocaleLowerCase('en')}:${suffix || Date.now()}`,
      word,
      phonetic: '',
      zhTW: meaning,
      definition: '個人新增單字',
      pos: '',
      exams: ['ielts', 'toefl', 'toeic'],
      sources: { custom: {} },
    };
  }

  function allEntries() {
    return [...DATA.entries, ...state.custom];
  }

  function relevantSourceNames(exam) {
    if (exam === 'ielts' || exam === 'toefl') return ['ngsl', 'nawl'];
    if (exam === 'toeic') return ['ngsl', 'tsl'];
    if (exam === 'general') return ['ngsl'];
    return ['ngsl', 'nawl', 'tsl'];
  }

  function sourceScore(sourceName, source) {
    if (!source || !source.rank) return 50;
    const size = DATA.metadata.lists[sourceName].size;
    const percentile = 1 - ((source.rank - 1) / Math.max(1, size - 1));
    return 35 + (65 * percentile);
  }

  function priorityFor(entry) {
    if (entry.sources.custom) return 50;
    const relevant = relevantSourceNames(state.filters.exam)
      .filter((name) => entry.sources[name]);
    const sources = relevant.length ? relevant : Object.keys(entry.sources).filter((name) => name !== 'custom');
    let score = Math.max(...sources.map((name) => sourceScore(name, entry.sources[name])), 35);
    if (sources.length > 1) score += 4;
    if (FUNCTION_WORDS.has(entry.word.toLocaleLowerCase('en'))) score *= 0.62;
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  function bandFor(score) {
    if (score >= 80) return 'high';
    if (score >= 55) return 'medium';
    return 'low';
  }

  function matchesExam(entry) {
    const exam = state.filters.exam;
    if (exam === 'all') return true;
    if (exam === 'general') return Boolean(entry.sources.ngsl || entry.sources.custom);
    return Boolean(entry.exams.includes(exam) || entry.sources.custom);
  }

  function matchesSearch(entry, query) {
    if (!query) return true;
    const haystack = `${entry.word} ${entry.zhTW} ${entry.definition}`.toLocaleLowerCase();
    return haystack.includes(query);
  }

  function rebuildSession(options = {}) {
    const currentId = options.keepCurrent && session[index] ? session[index].id : null;
    const query = elements['search-input'].value.trim().toLocaleLowerCase();
    session = allEntries()
      .filter(matchesExam)
      .filter((entry) => matchesSearch(entry, query))
      .filter((entry) => state.filters.frequency === 'all' || bandFor(priorityFor(entry)) === state.filters.frequency)
      .filter((entry) => !state.filters.unlearnedOnly || !learned.has(entry.id))
      .sort((a, b) => priorityFor(b) - priorityFor(a) || a.word.localeCompare(b.word, 'en'));

    if (!currentId && !query && state.filters.exam === 'all' && state.filters.frequency === 'all') {
      const showcaseIndex = session.findIndex((entry) => entry.word.toLocaleLowerCase('en') === 'client');
      if (showcaseIndex > 0) session.unshift(...session.splice(showcaseIndex, 1));
    }

    const keptIndex = currentId ? session.findIndex((entry) => entry.id === currentId) : -1;
    index = keptIndex >= 0 ? keptIndex : 0;
    render();
  }

  function currentEntry() {
    return session[index] || null;
  }

  function sourceSummary(entry) {
    const relevant = relevantSourceNames(state.filters.exam);
    const names = Object.keys(entry.sources)
      .filter((name) => name === 'custom' || relevant.includes(name) || state.filters.exam === 'all')
      .sort((a, b) => (entry.sources[a].rank || 99999) - (entry.sources[b].rank || 99999));
    return names.map((name) => {
      const rank = entry.sources[name].rank;
      return `${SOURCE_LABELS[name]}${rank ? ` #${rank.toLocaleString('en-US')}` : ''}`;
    }).join(' · ');
  }

  function render() {
    const entry = currentEntry();
    const totalEntries = allEntries().length;
    const learnedCount = learned.size;
    const learnedPercent = totalEntries ? Math.round((learnedCount / totalEntries) * 100) : 0;

    elements['pool-count'].textContent = session.length.toLocaleString('en-US');
    elements['card-count'].textContent = `卡片 ${session.length.toLocaleString('en-US')} 張`;
    elements['learned-percent'].textContent = `${learnedPercent}%`;
    elements['mastery-progress'].style.width = `${learnedPercent}%`;
    elements['learned-summary'].textContent = `已學會 ${learnedCount.toLocaleString('en-US')} / ${totalEntries.toLocaleString('en-US')} 個單字`;
    renderGameStats();

    if (!entry) {
      renderEmpty();
      return;
    }

    const score = priorityFor(entry);
    const band = bandFor(score);
    elements['card-wrap'].classList.remove('empty-state');
    elements.card.classList.remove('flipped');
    elements.card.setAttribute('aria-pressed', 'false');
    elements.card.setAttribute('aria-label', `翻面查看 ${entry.word} 的解釋`);
    elements['card-term'].textContent = entry.word;
    elements['card-term'].classList.toggle('long-word', entry.word.length >= 8 && entry.word.length < 12);
    elements['card-term'].classList.toggle('very-long-word', entry.word.length >= 12);
    elements['card-phonetic'].textContent = [entry.phonetic ? `/${entry.phonetic}/` : '', entry.pos].filter(Boolean).join(' · ');
    elements['card-meaning'].textContent = entry.zhTW || '尚無繁中釋義';
    elements['card-definition'].textContent = entry.definition || 'No English definition available.';
    const note = state.notes[entry.id] || '';
    elements['card-note-preview'].textContent = note ? `我的筆記：${note}` : '';
    elements['note-input'].value = note;
    elements['note-status'].textContent = '';
    elements['weight-badge'].textContent = `學習權重 ${score}`;
    elements['frequency-label'].textContent = BAND_LABELS[band];
    elements['source-label'].textContent = sourceSummary(entry);
    elements['current-weight'].textContent = `學習權重 ${score} · ${BAND_LABELS[band]}`;
    elements['current-source'].textContent = sourceSummary(entry);
    elements['btn-learned'].textContent = learned.has(entry.id) ? '取消已學會' : '標示為已學會';
    elements['btn-learned'].classList.toggle('rec', learned.has(entry.id));
    elements['card-position'].textContent = `${index + 1} / ${session.length}`;
    setStudyButtonsDisabled(false);
    renderQuiz(entry);

    if (state.audio.autoSpeak) speakCurrent();
  }

  function renderEmpty() {
    elements['card-wrap'].classList.add('empty-state');
    elements.card.classList.remove('flipped');
    elements.card.setAttribute('aria-pressed', 'false');
    elements['card-term'].textContent = '沒有符合條件的單字';
    elements['card-term'].classList.remove('long-word', 'very-long-word');
    elements['card-phonetic'].textContent = '請調整考試、權重或搜尋條件';
    elements['card-meaning'].textContent = '';
    elements['card-definition'].textContent = '';
    elements['card-note-preview'].textContent = '';
    elements['note-input'].value = '';
    elements['weight-badge'].textContent = '權重 —';
    elements['frequency-label'].textContent = '無結果';
    elements['source-label'].textContent = '—';
    elements['card-position'].textContent = '0 / 0';
    elements['answer-grid'].replaceChildren();
    elements['answer-feedback'].hidden = true;
    elements['btn-continue'].hidden = true;
    elements['btn-learned'].classList.remove('rec');
    elements['btn-learned'].textContent = '標示為已學會';
    setStudyButtonsDisabled(true);
  }

  function setStudyButtonsDisabled(disabled) {
    ['btn-prev', 'btn-shuffle', 'btn-next', 'btn-learned', 'btn-save-note']
      .forEach((id) => { elements[id].disabled = disabled; });
    elements['btn-speak'].disabled = disabled || kokoroBusy;
  }

  function renderGameStats() {
    const game = state.game || defaultState().game;
    elements['streak-count'].textContent = Number(game.streak || 0).toLocaleString('en-US');
    elements['xp-count'].textContent = Number(game.xp || 0).toLocaleString('en-US');
    elements['run-correct'].textContent = Number(game.runCorrect || 0).toLocaleString('en-US');
    const answered = Number(game.runCorrect) || 0;
    const roundStep = answered === 0 ? 0 : ((answered - 1) % 10) + 1;
    const goalProgress = roundStep * 10;
    elements['round-step'].textContent = `${roundStep} / 10`;
    elements['session-progress'].style.width = `${goalProgress}%`;
    elements['run-progress'].style.width = `${goalProgress}%`;
    const remaining = 10 - roundStep;
    elements['run-message'].textContent = remaining === 0
      ? '完成一輪。繼續下一題，再展開新的連勝。'
      : `再答對 ${remaining} 題，完成這一輪。`;
  }

  function shuffled(items) {
    const copy = items.slice();
    for (let cursor = copy.length - 1; cursor > 0; cursor -= 1) {
      const swapIndex = Math.floor(Math.random() * (cursor + 1));
      [copy[cursor], copy[swapIndex]] = [copy[swapIndex], copy[cursor]];
    }
    return copy;
  }

  function quizMeaning(value) {
    const cleaned = String(value || '尚無繁中釋義')
      .replace(/\[[^\]]+\]/g, ',')
      .replace(/(^|\s)(?:n|v|vt|vi|adj|a|adv|prep|pron|conj|interj|num)\.\s*/gi, '$1')
      .replace(/[。.]$/g, '');
    const senses = cleaned
      .split(/[,，;；]/)
      .map((sense) => sense.trim())
      .filter((sense, senseIndex, items) => sense && items.indexOf(sense) === senseIndex)
      .filter((sense) => sense.length <= 14);
    return senses[0] || cleaned.trim();
  }

  function makeChoices(entry) {
    const correctMeaning = quizMeaning(entry.zhTW);
    const candidates = shuffled(allEntries().filter((candidate) => (
      candidate.id !== entry.id
      && candidate.zhTW
      && candidate.zhTW.length <= 42
    )));
    const seenMeanings = new Set([correctMeaning]);
    const distractors = [];
    for (const candidate of candidates) {
      const meaning = quizMeaning(candidate.zhTW);
      if (!meaning || seenMeanings.has(meaning)) continue;
      seenMeanings.add(meaning);
      distractors.push({ id: candidate.id, meaning });
      if (distractors.length === 3) break;
    }
    const choices = distractors.map((candidate) => ({ ...candidate, correct: false }));
    const correctIndex = index % Math.max(1, choices.length + 1);
    choices.splice(correctIndex, 0, { id: entry.id, meaning: correctMeaning, correct: true });
    return choices;
  }

  function renderQuiz(entry) {
    answerLocked = false;
    questionChoices = makeChoices(entry);
    elements['answer-feedback'].hidden = true;
    elements['answer-feedback'].classList.remove('miss');
    elements['feedback-title'].textContent = '';
    elements['feedback-streak'].textContent = '';
    elements['btn-continue'].hidden = true;
    const buttons = questionChoices.map((choice, choiceIndex) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'answer-option';
      button.dataset.choiceIndex = String(choiceIndex);
      button.setAttribute('aria-label', `選項 ${choiceIndex + 1}：${choice.meaning}`);
      const icon = document.createElement('i');
      icon.className = 'answer-icon fa-solid';
      icon.setAttribute('aria-hidden', 'true');
      const number = document.createElement('span');
      number.className = 'answer-number';
      number.setAttribute('aria-hidden', 'true');
      number.textContent = String(choiceIndex + 1);
      const text = document.createElement('span');
      text.textContent = choice.meaning;
      const sparks = Array.from({ length: 3 }, () => {
        const spark = document.createElement('i');
        spark.className = 'answer-spark fa-solid fa-star';
        spark.setAttribute('aria-hidden', 'true');
        return spark;
      });
      button.append(icon, number, text, ...sparks);
      return button;
    });
    elements['answer-grid'].replaceChildren(...buttons);
  }

  function renderAnswerFeedback(correct, entry, points) {
    elements['answer-feedback'].classList.toggle('miss', !correct);
    if (correct) {
      elements['feedback-title'].textContent = '答對了！';
      elements['feedback-streak'].textContent = `連勝 x${state.game.streak}`;
    } else {
      elements['feedback-title'].textContent = '差一點！';
      elements['feedback-streak'].textContent = `正解：${quizMeaning(entry.zhTW)}`;
    }
    elements['answer-feedback'].hidden = false;
    elements['btn-continue'].hidden = false;
    if (correct) elements['btn-continue'].setAttribute('aria-label', `獲得 ${points} XP，前往下一題`);
    else elements['btn-continue'].setAttribute('aria-label', '查看正解後前往下一題');
  }

  function chooseAnswer(choiceIndex) {
    if (answerLocked || !currentEntry()) return;
    const selected = questionChoices[choiceIndex];
    if (!selected) return;
    answerLocked = true;
    const entry = currentEntry();
    const points = Math.max(10, Math.round(priorityFor(entry) / 10));
    const buttons = Array.from(elements['answer-grid'].querySelectorAll('.answer-option'));
    buttons.forEach((button, buttonIndex) => {
      button.disabled = true;
      const icon = button.querySelector('.answer-icon');
      if (questionChoices[buttonIndex].correct) {
        button.classList.add('correct');
        if (icon) icon.classList.add('fa-circle-check');
      }
      if (buttonIndex === choiceIndex && !selected.correct) {
        button.classList.add('wrong');
        if (icon) icon.classList.add('fa-circle-xmark');
      }
    });

    if (selected.correct) {
      state.game.streak = Number(state.game.streak || 0) + 1;
      state.game.bestStreak = Math.max(Number(state.game.bestStreak || 0), state.game.streak);
      state.game.xp = Number(state.game.xp || 0) + points;
      state.game.runCorrect = Number(state.game.runCorrect || 0) + 1;
      learned.add(entry.id);
      elements['btn-learned'].textContent = '取消已學會';
      elements['btn-learned'].classList.add('rec');
    } else {
      state.game.streak = 0;
    }
    renderAnswerFeedback(selected.correct, entry, points);
    renderGameStats();
    const totalEntries = allEntries().length;
    const learnedPercent = totalEntries ? Math.round((learned.size / totalEntries) * 100) : 0;
    elements['learned-percent'].textContent = `${learnedPercent}%`;
    elements['mastery-progress'].style.width = `${learnedPercent}%`;
    elements['learned-summary'].textContent = `已學會 ${learned.size.toLocaleString('en-US')} / ${totalEntries.toLocaleString('en-US')} 個單字`;
    persist();
  }

  function flipCard() {
    if (!currentEntry()) return;
    elements.card.classList.toggle('flipped');
    elements.card.setAttribute('aria-pressed', String(elements.card.classList.contains('flipped')));
  }

  function move(direction) {
    if (!session.length) return;
    index = (index + direction + session.length) % session.length;
    render();
  }

  function weightedShuffle() {
    if (!session.length) return;
    session = session
      .map((entry) => ({
        entry,
        key: -Math.log(Math.max(Number.MIN_VALUE, Math.random())) / Math.max(1, priorityFor(entry)),
      }))
      .sort((a, b) => a.key - b.key)
      .map((item) => item.entry);
    index = 0;
    render();
    elements['data-status'].textContent = '已依學習權重重新抽題；高權重單字會優先出現。';
  }

  function toggleLearned() {
    const entry = currentEntry();
    if (!entry) return;
    if (learned.has(entry.id)) learned.delete(entry.id);
    else learned.add(entry.id);
    persist();
    if (state.filters.unlearnedOnly && learned.has(entry.id)) rebuildSession();
    else render();
  }

  function saveNote() {
    const entry = currentEntry();
    if (!entry) return;
    const note = elements['note-input'].value.trim();
    if (note) state.notes[entry.id] = note;
    else delete state.notes[entry.id];
    persist();
    elements['card-note-preview'].textContent = note ? `我的筆記：${note}` : '';
    elements['note-status'].textContent = note ? '已儲存' : '已清除筆記';
  }

  function voiceKey(voice) {
    return voice.voiceURI || `${voice.name}|${voice.lang}`;
  }

  function kokoroVoiceList() {
    return KOKORO_VOICES[state.audio.accent] || KOKORO_VOICES['en-US'];
  }

  function currentKokoroVoice() {
    const list = kokoroVoiceList();
    return list.find((voice) => voice.id === state.audio.kokoroVoice) || list[0];
  }

  function populateKokoroVoiceSelect() {
    const list = kokoroVoiceList();
    const selected = currentKokoroVoice();
    state.audio.kokoroVoice = selected.id;
    elements['kokoro-voice-select'].replaceChildren(
      ...list.map((voice) => new Option(voice.label, voice.id)),
    );
    elements['kokoro-voice-select'].value = selected.id;
  }

  function chooseVoice(lang) {
    const selected = voices.find((voice) => voiceKey(voice) === state.audio.voiceURI);
    if (selected) return selected;
    const normalizedLang = lang.toLocaleLowerCase();
    return voices.find((voice) => voice.lang.toLocaleLowerCase() === normalizedLang)
      || voices.find((voice) => voice.lang.toLocaleLowerCase().startsWith(normalizedLang.slice(0, 2)))
      || null;
  }

  function updateSystemVoiceInfo() {
    if (!('speechSynthesis' in window)) {
      elements['voice-info'].textContent = '這個瀏覽器不支援語音合成';
      return;
    }
    const voice = chooseVoice(state.audio.accent);
    if (!voices.length) {
      elements['voice-info'].textContent = '尚未讀到裝置語音；播放時由瀏覽器自動選擇';
      return;
    }
    if (!voice) {
      elements['voice-info'].textContent = `找不到 ${state.audio.accent} 英文聲音，將由瀏覽器自動選擇`;
      return;
    }
    const provider = voice.localService ? '裝置內建' : '瀏覽器語音服務';
    elements['voice-info'].textContent = `目前聲音：${voice.name} · ${voice.lang} · ${provider}`;
  }

  function updateVoiceInfo() {
    if (state.audio.engine === 'system') {
      updateSystemVoiceInfo();
      return;
    }
    const voice = currentKokoroVoice();
    const readiness = kokoroReady ? '模型已載入，本機合成' : '首次播放後，本機合成';
    elements['voice-info'].textContent = `AI 聲音：${voice.label} · ${state.audio.accent} · ${readiness}`;
  }

  function applyAudioEngineUI() {
    const useKokoro = state.audio.engine === 'kokoro';
    elements['kokoro-voice-option'].hidden = !useKokoro;
    elements['device-voice-option'].hidden = useKokoro;
    elements['model-panel'].hidden = !useKokoro;
    populateKokoroVoiceSelect();
    updateVoiceInfo();
  }

  function populateVoiceSelect() {
    const preferredLang = state.audio.accent.toLocaleLowerCase();
    const englishVoices = voices
      .filter((voice) => voice.lang.toLocaleLowerCase().startsWith('en'))
      .sort((a, b) => {
        const aPreferred = a.lang.toLocaleLowerCase() === preferredLang ? 0 : 1;
        const bPreferred = b.lang.toLocaleLowerCase() === preferredLang ? 0 : 1;
        return aPreferred - bPreferred || a.name.localeCompare(b.name);
      });
    const options = [new Option('自動選擇（依口音）', '')];
    englishVoices.forEach((voice) => {
      const suffix = voice.localService ? '裝置' : '服務';
      options.push(new Option(`${voice.name} · ${voice.lang} · ${suffix}`, voiceKey(voice)));
    });
    elements['voice-select'].replaceChildren(...options);
    const selectedExists = englishVoices.some((voice) => voiceKey(voice) === state.audio.voiceURI);
    elements['voice-select'].value = selectedExists ? state.audio.voiceURI : '';
    updateVoiceInfo();
  }

  function loadVoices() {
    if ('speechSynthesis' in window) voices = window.speechSynthesis.getVoices();
    populateVoiceSelect();
  }

  function setModelProgress(progress, status, detail) {
    const value = Math.max(0, Math.min(100, Number(progress) || 0));
    elements['model-progress-fill'].style.width = `${value}%`;
    elements['model-progress'].setAttribute('aria-valuenow', String(Math.round(value)));
    if (status) elements['model-status'].textContent = status;
    if (detail) elements['model-detail'].textContent = detail;
  }

  function formatMegabytes(bytes) {
    return `${(bytes / 1000000).toFixed(bytes >= 10000000 ? 0 : 1)} MB`;
  }

  function setKokoroBusy(busy) {
    kokoroBusy = busy;
    elements['btn-speak'].disabled = busy || !currentEntry();
    elements['btn-speak'].setAttribute('aria-busy', String(busy));
    elements['btn-release-model'].disabled = busy;
  }

  function stopCurrentAudio() {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    if (activeAudioSource) {
      try { activeAudioSource.stop(); } catch (error) { /* Already stopped. */ }
      activeAudioSource = null;
    }
    if (fallbackAudio) {
      fallbackAudio.pause();
      if (fallbackAudio.src) URL.revokeObjectURL(fallbackAudio.src);
      fallbackAudio = null;
    }
  }

  function unlockAudio() {
    const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextConstructor) return Promise.resolve(null);
    if (!audioContext) audioContext = new AudioContextConstructor();
    if (audioContext.state === 'suspended') return audioContext.resume().then(() => audioContext);
    return Promise.resolve(audioContext);
  }

  async function playKokoroAudio(buffer, word) {
    stopCurrentAudio();
    const context = await unlockAudio();
    if (context) {
      const decoded = await context.decodeAudioData(buffer.slice(0));
      const source = context.createBufferSource();
      source.buffer = decoded;
      source.connect(context.destination);
      source.onended = () => {
        if (activeAudioSource === source) activeAudioSource = null;
        elements['speech-status'].textContent = '';
      };
      activeAudioSource = source;
      elements['speech-status'].textContent = `正在播放 ${word} · Kokoro 本機 AI`;
      source.start();
      return;
    }

    const audioUrl = URL.createObjectURL(new Blob([buffer], { type: 'audio/wav' }));
    fallbackAudio = new Audio(audioUrl);
    fallbackAudio.onended = () => {
      URL.revokeObjectURL(audioUrl);
      fallbackAudio = null;
      elements['speech-status'].textContent = '';
    };
    elements['speech-status'].textContent = `正在播放 ${word} · Kokoro 本機 AI`;
    await fallbackAudio.play();
  }

  function speakWithSystem(text, notice = '') {
    if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) {
      elements['speech-status'].textContent = notice
        ? `${notice}，而且這個瀏覽器不支援裝置語音`
        : '這個瀏覽器不支援語音播放';
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = state.audio.accent;
    utterance.rate = 0.82;
    const voice = chooseVoice(state.audio.accent);
    if (voice) utterance.voice = voice;
    updateSystemVoiceInfo();
    utterance.onstart = () => {
      const voiceName = voice ? ` · ${voice.name}` : '';
      const prefix = notice ? `${notice}；` : '';
      elements['speech-status'].textContent = `${prefix}正在播放 ${text}${voiceName}`;
    };
    utterance.onend = () => { elements['speech-status'].textContent = ''; };
    utterance.onerror = () => { elements['speech-status'].textContent = '語音播放失敗，請確認裝置語音設定'; };
    window.speechSynthesis.speak(utterance);
  }

  function destroyKokoroWorker() {
    if (kokoroWorker) kokoroWorker.terminate();
    kokoroWorker = null;
    kokoroReady = false;
    setKokoroBusy(false);
  }

  function handleKokoroFailure(message, stage = 'load') {
    const word = pendingKokoroWord || (currentEntry() && currentEntry().word) || '';
    const diagnostic = String(message || '未知錯誤').replace(/\s+/g, ' ').slice(0, 180);
    destroyKokoroWorker();
    elements['btn-release-model'].hidden = true;
    setModelProgress(0, '高品質模型暫時無法使用', `錯誤：${diagnostic}`);
    const reason = stage === 'generate' ? 'AI 發音產生失敗' : 'AI 模型載入失敗';
    if (word) speakWithSystem(word, `${reason}，已改用裝置語音`);
    else elements['speech-status'].textContent = `${reason}：${message}`;
  }

  async function handleKokoroMessage(event) {
    const message = event.data || {};
    if (message.type === 'loading') {
      const engine = message.device === 'webgpu' ? 'WebGPU' : 'WASM';
      setModelProgress(0, '正在準備高品質模型', `${engine} · 第一次約需下載 90 MB`);
      return;
    }
    if (message.type === 'progress') {
      const isModel = /\.onnx$/i.test(message.file || '');
      if (!isModel || message.status !== 'progress') return;
      const loaded = message.loaded ? formatMegabytes(message.loaded) : '';
      const total = message.total ? formatMegabytes(message.total) : '約 90 MB';
      const detail = loaded ? `${loaded} / ${total}` : total;
      setModelProgress(message.progress, '正在下載高品質語音模型', detail);
      return;
    }
    if (message.type === 'fallback') {
      setModelProgress(0, 'WebGPU 不相容，正在切換', '自動改用相容性較高的 WASM；不需手動設定');
      return;
    }
    if (message.type === 'ready') {
      kokoroReady = true;
      elements['btn-release-model'].hidden = false;
      const engine = message.device === 'webgpu' ? 'WebGPU' : 'WASM';
      setModelProgress(100, '高品質模型已就緒', `${engine} · 已快取，可離線重複使用`);
      updateVoiceInfo();
      return;
    }
    if (message.type === 'generating') {
      elements['speech-status'].textContent = `正在產生 ${message.word} 的 AI 發音…`;
      return;
    }
    if (message.type === 'audio') {
      if (message.requestId !== kokoroRequestId) return;
      setKokoroBusy(false);
      try {
        await playKokoroAudio(message.buffer, message.word);
      } catch (error) {
        handleKokoroFailure(error instanceof Error ? error.message : String(error), 'generate');
      }
      return;
    }
    if (message.type === 'disposed') {
      destroyKokoroWorker();
      if (audioContext && typeof audioContext.close === 'function') {
        Promise.resolve(audioContext.close()).catch(() => undefined);
        audioContext = null;
      }
      elements['btn-release-model'].hidden = true;
      setModelProgress(0, '已釋放模型記憶體', '模型快取仍保留；下次播放不必重新下載');
      updateVoiceInfo();
      return;
    }
    if (message.type === 'error') handleKokoroFailure(message.message, message.stage);
  }

  function ensureKokoroWorker() {
    if (kokoroWorker) return kokoroWorker;
    kokoroWorker = new Worker('./kokoro-worker.js', { type: 'module', name: 'kokoro-tts' });
    kokoroWorker.onmessage = handleKokoroMessage;
    kokoroWorker.onerror = (event) => {
      if (event && typeof event.preventDefault === 'function') event.preventDefault();
      handleKokoroFailure('背景語音元件無法啟動', 'load');
    };
    return kokoroWorker;
  }

  function speakWithKokoro(entry) {
    if (kokoroBusy) {
      elements['speech-status'].textContent = 'AI 發音正在處理，請稍候';
      return;
    }
    pendingKokoroWord = entry.word;
    kokoroRequestId += 1;
    setKokoroBusy(true);
    elements['speech-status'].textContent = kokoroReady
      ? `正在產生 ${entry.word} 的 AI 發音…`
      : '正在載入高品質語音元件…';
    unlockAudio().catch(() => undefined);
    try {
      ensureKokoroWorker().postMessage({
        type: 'synthesize',
        requestId: kokoroRequestId,
        text: entry.word,
        voice: currentKokoroVoice().id,
        speed: 0.9,
      });
    } catch (error) {
      handleKokoroFailure(error instanceof Error ? error.message : String(error), 'load');
    }
  }

  function releaseKokoroModel() {
    if (!kokoroWorker) {
      setModelProgress(0, '高品質模型尚未載入', '第一次播放會下載約 90 MB');
      return;
    }
    if (kokoroBusy) {
      elements['speech-status'].textContent = '目前仍在產生發音，完成後再釋放記憶體';
      return;
    }
    stopCurrentAudio();
    elements['model-status'].textContent = '正在釋放模型記憶體…';
    kokoroWorker.postMessage({ type: 'dispose' });
  }

  function speakCurrent() {
    const entry = currentEntry();
    if (!entry) return;
    if (state.audio.engine === 'system') {
      stopCurrentAudio();
      speakWithSystem(entry.word);
      return;
    }
    speakWithKokoro(entry);
  }

  function addCustomWord() {
    const word = elements['term-input'].value.trim();
    const meaning = elements['meaning-input'].value.trim();
    if (!word || !meaning) {
      elements['data-status'].textContent = '請同時填寫英文單字與中文意思。';
      return;
    }
    const duplicate = allEntries().find((entry) => entry.word.toLocaleLowerCase('en') === word.toLocaleLowerCase('en'));
    if (duplicate) {
      state.notes[duplicate.id] = meaning;
      persist();
      elements['search-input'].value = word;
      rebuildSession();
      elements['data-status'].textContent = '字庫已有這個字，中文內容已存成個人筆記。';
    } else {
      const custom = makeCustomWord(word, meaning);
      state.custom.push(custom);
      persist();
      elements['search-input'].value = word;
      rebuildSession();
      elements['data-status'].textContent = '已新增到個人字庫。';
    }
    elements['term-input'].value = '';
    elements['meaning-input'].value = '';
    elements['unique-count'].textContent = allEntries().length.toLocaleString('en-US');
  }

  function resetPersonalData() {
    state = defaultState();
    learned = new Set();
    localStorage.removeItem(STATE_KEY);
    localStorage.removeItem(LEGACY_KEY);
    elements['search-input'].value = '';
    applyStateToControls();
    rebuildSession();
    elements['unique-count'].textContent = DATA.metadata.recordCount.toLocaleString('en-US');
    elements['data-status'].textContent = '已清除學習進度、個人筆記與自訂單字。';
  }

  function applyStateToControls() {
    state.audio.engine = state.audio.engine === 'system' ? 'system' : 'kokoro';
    state.audio.accent = state.audio.accent === 'en-GB' ? 'en-GB' : 'en-US';
    elements['frequency-filter'].value = state.filters.frequency;
    elements['unlearned-only'].checked = state.filters.unlearnedOnly;
    elements['speech-engine'].value = state.audio.engine;
    elements['accent-select'].value = state.audio.accent;
    elements['voice-select'].value = state.audio.voiceURI;
    elements['auto-speak'].checked = state.audio.autoSpeak;
    applyAudioEngineUI();
    document.querySelectorAll('[data-exam]').forEach((button) => {
      const active = button.dataset.exam === state.filters.exam;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
  }

  function bindEvents() {
    elements['btn-settings'].addEventListener('click', () => {
      if (typeof elements['settings-panel'].showModal === 'function') elements['settings-panel'].showModal();
      else elements['settings-panel'].setAttribute('open', '');
    });
    elements['btn-close-settings'].addEventListener('click', () => elements['settings-panel'].close());
    elements['settings-panel'].addEventListener('click', (event) => {
      if (event.target === elements['settings-panel']) elements['settings-panel'].close();
    });
    elements['exam-filter'].addEventListener('click', (event) => {
      const button = event.target.closest('[data-exam]');
      if (!button) return;
      state.filters.exam = button.dataset.exam;
      applyStateToControls();
      persist();
      rebuildSession();
    });
    elements['search-input'].addEventListener('input', () => rebuildSession());
    elements['frequency-filter'].addEventListener('change', () => {
      state.filters.frequency = elements['frequency-filter'].value;
      persist();
      rebuildSession();
    });
    elements['unlearned-only'].addEventListener('change', () => {
      state.filters.unlearnedOnly = elements['unlearned-only'].checked;
      persist();
      rebuildSession();
    });
    elements.card.addEventListener('click', flipCard);
    elements.card.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        flipCard();
      }
    });
    elements['btn-prev'].addEventListener('click', () => move(-1));
    elements['btn-next'].addEventListener('click', () => move(1));
    elements['btn-shuffle'].addEventListener('click', weightedShuffle);
    elements['btn-continue'].addEventListener('click', () => move(1));
    elements['answer-grid'].addEventListener('click', (event) => {
      const button = event.target.closest('[data-choice-index]');
      if (button) chooseAnswer(Number(button.dataset.choiceIndex));
    });
    elements['btn-learned'].addEventListener('click', toggleLearned);
    elements['btn-save-note'].addEventListener('click', saveNote);
    elements['btn-speak'].addEventListener('click', speakCurrent);
    elements['speech-engine'].addEventListener('change', () => {
      stopCurrentAudio();
      state.audio.engine = elements['speech-engine'].value;
      elements['speech-status'].textContent = '';
      applyAudioEngineUI();
      persist();
    });
    elements['accent-select'].addEventListener('change', () => {
      state.audio.accent = elements['accent-select'].value;
      state.audio.voiceURI = '';
      populateKokoroVoiceSelect();
      populateVoiceSelect();
      persist();
    });
    elements['kokoro-voice-select'].addEventListener('change', () => {
      state.audio.kokoroVoice = elements['kokoro-voice-select'].value;
      updateVoiceInfo();
      persist();
    });
    elements['voice-select'].addEventListener('change', () => {
      state.audio.voiceURI = elements['voice-select'].value;
      const selectedVoice = voices.find((voice) => voiceKey(voice) === state.audio.voiceURI);
      if (selectedVoice && /^(en-US|en-GB)$/i.test(selectedVoice.lang)) {
        state.audio.accent = selectedVoice.lang;
        elements['accent-select'].value = selectedVoice.lang;
        populateKokoroVoiceSelect();
      }
      updateVoiceInfo();
      persist();
    });
    elements['btn-release-model'].addEventListener('click', releaseKokoroModel);
    elements['auto-speak'].addEventListener('change', () => {
      state.audio.autoSpeak = elements['auto-speak'].checked;
      persist();
    });
    elements['btn-add'].addEventListener('click', addCustomWord);
    elements['meaning-input'].addEventListener('keydown', (event) => {
      if (event.key === 'Enter') addCustomWord();
    });
    elements['btn-reset'].addEventListener('click', resetPersonalData);
    elements['btn-install'].addEventListener('click', installApp);
    document.addEventListener('keydown', (event) => {
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName)) return;
      if (/^[1-4]$/.test(event.key)) chooseAnswer(Number(event.key) - 1);
      if (event.key === 'Enter' && answerLocked) move(1);
      if (event.key === 'ArrowLeft') move(-1);
      if (event.key === 'ArrowRight') move(1);
      if (event.key.toLocaleLowerCase() === 'p') speakCurrent();
    });
  }

  let installPrompt = null;

  function isStandalone() {
    return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  }

  function updateAppStatus(message) {
    if (message) {
      elements['app-status'].textContent = message;
      return;
    }
    if (isStandalone()) elements['app-status'].textContent = 'App 模式';
    else if (window.location.protocol === 'file:') elements['app-status'].textContent = '本機網頁模式';
    else if (!navigator.onLine) elements['app-status'].textContent = '離線模式';
    else elements['app-status'].textContent = '網頁模式';
  }

  async function installApp() {
    if (installPrompt) {
      installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      installPrompt = null;
      elements['btn-install'].hidden = choice.outcome === 'accepted';
      updateAppStatus(choice.outcome === 'accepted' ? 'App 安裝中' : '已取消安裝');
      return;
    }
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    updateAppStatus(isIOS
      ? '請點 Safari 分享，再選「加入主畫面」'
      : '請使用瀏覽器選單的「安裝應用程式」');
  }

  function initializeAppMode() {
    updateAppStatus();
    const canInstallFromWeb = /^https?:$/.test(window.location.protocol) && !isStandalone();
    if (canInstallFromWeb) {
      elements['btn-install'].hidden = false;
      if (/iphone|ipad|ipod/i.test(navigator.userAgent)) elements['btn-install'].textContent = '加入主畫面';
    }
    window.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault();
      installPrompt = event;
      elements['btn-install'].hidden = false;
      elements['btn-install'].textContent = '安裝 App';
    });
    window.addEventListener('appinstalled', () => {
      installPrompt = null;
      elements['btn-install'].hidden = true;
      updateAppStatus('已安裝 App');
    });
    window.addEventListener('online', () => updateAppStatus());
    window.addEventListener('offline', () => updateAppStatus());

    if ('serviceWorker' in navigator && /^https?:$/.test(window.location.protocol)) {
      navigator.serviceWorker.register('./service-worker.js')
        .then(() => navigator.serviceWorker.ready)
        .then(() => updateAppStatus('已可離線使用'))
        .catch(() => updateAppStatus('離線功能暫時不可用'));
    }
  }

  function initialize() {
    cacheElements();
    if (!DATA || !Array.isArray(DATA.entries) || !DATA.entries.length) {
      elements['card-term'].textContent = '字庫載入失敗';
      elements['card-phonetic'].textContent = '請確認 data/vocabulary-data.js 是否存在';
      return;
    }
    elements['unique-count'].textContent = allEntries().length.toLocaleString('en-US');
    elements['source-count'].textContent = DATA.metadata.sourceRecordCount.toLocaleString('en-US');
    applyStateToControls();
    bindEvents();
    initializeAppMode();
    loadVoices();
    if ('speechSynthesis' in window) window.speechSynthesis.onvoiceschanged = loadVoices;
    rebuildSession();
  }

  initialize();
}());
