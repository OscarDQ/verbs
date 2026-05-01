// ═══════════════════════════════════════════════════════════════════
// quiz.js — Lógica del quiz de verbos irregulares
// ═══════════════════════════════════════════════════════════════════
// Contiene los datos de verbos, la lógica de preguntas/respuestas,
// el sistema de puntuación por sesión, y la integración con Firebase
// para persistir el puntaje total del usuario.
// ═══════════════════════════════════════════════════════════════════

// ── Datos: lista de verbos irregulares [base, past, participle] ──
const VERBS = [
  ["be","was/were","been"],
  ["become","became","become"],
  ["begin","began","begun"],
  ["break","broke","broken"],
  ["bring","brought","brought"],
  ["build","built","built"],
  ["buy","bought","bought"],
  ["catch","caught","caught"],
  ["choose","chose","chosen"],
  ["come","came","come"],
  ["cost","cost","cost"],
  ["cut","cut","cut"],
  ["do","did","done"],
  ["draw","drew","drawn"],
  ["dream","dreamed/dreamt","dreamed/dreamt"],
  ["drink","drank","drunk"],
  ["drive","drove","driven"],
  ["eat","ate","eaten"],
  ["fall","fell","fallen"],
  ["feed","fed","fed"],
  ["feel","felt","felt"],
  ["fight","fought","fought"],
  ["find","found","found"],
  ["fit","fit","fit"],
  ["fly","flew","flown"],
  ["forget","forgot","forgotten"],
  ["get","got","gotten"],
  ["give","gave","given"],
  ["go","went","gone"],
  ["grow","grew","grown"],
  ["have","had","had"],
  ["hear","heard","heard"],
  ["hit","hit","hit"],
  ["hold","held","held"],
  ["hurt","hurt","hurt"],
  ["keep","kept","kept"],
  ["know","knew","known"],
  ["leave","left","left"],
  ["let","let","let"],
  ["lose","lost","lost"],
  ["make","made","made"],
  ["mean","meant","meant"],
  ["meet","met","met"],
  ["pay","paid","paid"],
  ["put","put","put"],
  ["quit","quit","quit"],
  ["read","read","read"],
  ["ride","rode","ridden"],
  ["ring","rang","rung"],
  ["rise","rose","risen"],
  ["run","ran","run"],
  ["say","said","said"],
  ["see","saw","seen"],
  ["sell","sold","sold"],
  ["send","sent","sent"],
  ["shake","shook","shaken"],
  ["sing","sang","sung"],
  ["sit","sat","sat"],
  ["sleep","slept","slept"],
  ["speak","spoke","spoken"],
  ["spend","spent","spent"],
  ["stand","stood","stood"],
  ["steal","stole","stolen"],
  ["swim","swam","swum"],
  ["take","took","taken"],
  ["teach","taught","taught"],
  ["tell","told","told"],
  ["think","thought","thought"],
  ["throw","threw","thrown"],
  ["understand","understood","understood"],
  ["wake up","woke up","woken up"],
  ["wear","wore","worn"],
  ["win","won","won"],
  ["write","wrote","written"],
];

// Nombres de los tiempos verbales
const TENSES = ["base form", "simple past", "past participle"];

// ── Estado del quiz (por sesión) ─────────────────────────────────
// score:    respuestas correctas en esta sesión
// total:    respuestas totales en esta sesión
// streak:   racha actual de respuestas correctas consecutivas
// current:  datos de la pregunta actual { verb, givenIdx, askIdx }
// answered: si ya se respondió la pregunta actual
// deck:     mazo de verbos mezclados (se repone al vaciarse)
// mode:     filtro de tiempos (all, past, pp, base)
let score = 0, total = 0, streak = 0;
let current = null;
let answered = false;
let deck = [];
let mode = "all";

// ── Referencias al DOM (quiz) ────────────────────────────────────
const card           = document.getElementById('card');
const givenLabel     = document.getElementById('givenLabel');
const givenWord      = document.getElementById('givenWord');
const askLabel       = document.getElementById('askLabel');
const answerInput    = document.getElementById('answerInput');
const feedbackAnswer = document.getElementById('feedbackAnswer');
const fullRow        = document.getElementById('fullRow');
const youWrote       = document.getElementById('youWrote');
const btnCheck       = document.getElementById('btnCheck');
const btnNext        = document.getElementById('btnNext');
const scoreDisplay   = document.getElementById('scoreDisplay');
const streakDisplay  = document.getElementById('streakDisplay');
const progressFill   = document.getElementById('progressFill');
const totalDisplay   = document.getElementById('totalDisplay');
const dot0           = document.getElementById('dot0');
const dot1           = document.getElementById('dot1');
const dot2           = document.getElementById('dot2');
const dotLabel       = document.getElementById('dotLabel');
const dots           = [dot0, dot1, dot2];

// ── Funciones auxiliares ─────────────────────────────────────────

/** Mezcla un array in-place usando Fisher-Yates */
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Rellena el mazo con todos los verbos mezclados */
function replenishDeck() {
  deck = shuffle([...VERBS]);
}

/**
 * Elige qué tiempo verbal dar y cuál pedir según el modo actual.
 * @returns {{givenIdx: number, askIdx: number}}
 */
function pickIndices() {
  let givenIdx, askIdx;
  if (mode === "past") {
    givenIdx = 0; askIdx = 1;         // Dar base → pedir past
  } else if (mode === "pp") {
    givenIdx = 1; askIdx = 2;         // Dar past → pedir participle
  } else if (mode === "base") {
    givenIdx = Math.random() < .5 ? 1 : 2;
    askIdx = 0;                       // Dar past/pp → pedir base
  } else {
    // Modo "all": par aleatorio
    givenIdx = Math.floor(Math.random() * 3);
    do { askIdx = Math.floor(Math.random() * 3); } while (askIdx === givenIdx);
  }
  return { givenIdx, askIdx };
}

// ── Siguiente pregunta ───────────────────────────────────────────

/** Prepara y muestra una nueva pregunta */
function nextQuestion() {
  if (deck.length === 0) replenishDeck();
  const verb = deck.pop();
  const { givenIdx, askIdx } = pickIndices();

  current = { verb, givenIdx, askIdx };
  answered = false;

  // Actualizar la UI con la nueva pregunta
  givenLabel.textContent = `GIVEN  ·  ${TENSES[givenIdx].toUpperCase()}`;
  givenWord.textContent  = verb[givenIdx];
  givenWord.style.color  = '';
  askLabel.textContent   = `TYPE THE ${TENSES[askIdx].toUpperCase()}`;

  // Resetear el input
  answerInput.value    = '';
  answerInput.disabled = false;
  answerInput.placeholder = 'your answer…';

  // Resetear el feedback
  feedbackAnswer.textContent = '';
  feedbackAnswer.className   = 'feedback-answer';
  fullRow.textContent        = '';
  fullRow.className          = 'full-row';
  youWrote.textContent       = '';
  youWrote.className         = 'you-wrote';

  // Resetear botones
  btnCheck.disabled = false;
  btnNext.disabled  = true;

  // Resetear efectos visuales de la card
  card.classList.remove('border-correct','border-wrong','flash-correct','flash-wrong','shake');

  // Actualizar los dots indicadores de tiempo
  dots.forEach((d, i) => d.classList.toggle('active', i === askIdx));
  dotLabel.textContent = TENSES[askIdx];

  // Enfocar el input para que el usuario pueda escribir directamente
  answerInput.focus();
}

// ── Verificar respuesta ──────────────────────────────────────────

/** Verifica la respuesta del usuario y muestra feedback */
function checkAnswer() {
  // Si ya se respondió, el botón actúa como "Next"
  if (answered) { nextQuestion(); return; }

  const { verb, givenIdx, askIdx } = current;
  const userRaw = answerInput.value.trim().toLowerCase();
  const correct = verb[askIdx].toLowerCase();
  // Algunos verbos tienen variantes (ej: "dreamed/dreamt")
  const accepted = correct.split('/').map(s => s.trim());

  answered  = true;
  total     += 1;
  answerInput.disabled = true;
  answerInput.blur();
  btnCheck.disabled    = true;
  btnNext.disabled     = false;

  // Mostrar la conjugación completa (base · past · participle)
  fullRow.textContent = `${verb[0]}  ·  ${verb[1]}  ·  ${verb[2]}`;
  setTimeout(() => fullRow.classList.add('visible'), 20);

  if (accepted.includes(userRaw) || userRaw === correct) {
    // ── Respuesta correcta ──
    score++;
    streak++;

    // Feedback visual: verde
    feedbackAnswer.textContent = `✓  ${verb[askIdx]}`;
    feedbackAnswer.className   = 'feedback-answer correct visible';
    givenWord.style.color      = 'var(--correct)';
    card.classList.add('flash-correct','border-correct');
    setTimeout(() => card.classList.remove('flash-correct'), 500);

    // Incrementar puntaje en Firebase (solo si no es guest)
    incrementScoreInFirebase();

  } else {
    // ── Respuesta incorrecta ──
    streak = 0;

    // Feedback visual: rojo + shake
    feedbackAnswer.textContent = `✗  ${verb[askIdx]}`;
    feedbackAnswer.className   = 'feedback-answer wrong visible';
    givenWord.style.color      = 'var(--wrong)';
    card.classList.add('flash-wrong','border-wrong','shake');
    setTimeout(() => card.classList.remove('flash-wrong','shake'), 500);

    // Mostrar lo que el usuario escribió (si escribió algo)
    if (userRaw) {
      youWrote.textContent = `you wrote: ${userRaw}`;
      setTimeout(() => youWrote.classList.add('visible'), 20);
    }
  }

  updateStats();
}

// ── Actualizar estadísticas de la sesión ─────────────────────────

/** Actualiza el display de puntuación, barra de progreso y racha */
function updateStats() {
  // Puntaje de la sesión (correctas / total)
  scoreDisplay.textContent = `${score} / ${total}`;

  // Barra de progreso (porcentaje de acierto)
  const pct = total ? score / total : 0;
  progressFill.style.width = (pct * 100) + '%';

  // Display de racha (se muestra a partir de 3)
  if (streak >= 5)      streakDisplay.textContent = `🔥 ${streak}`;
  else if (streak >= 3) streakDisplay.textContent = `· ${streak}`;
  else                  streakDisplay.textContent = '';

  // Puntaje total acumulado (local + Firebase)
  if (totalDisplay) {
    const totalPts = currentUser ? currentUser.totalScore : score;
    totalDisplay.textContent = `★ ${totalPts.toLocaleString()}`;
  }

  // Re-renderizar posición del usuario en el leaderboard
  updateUserPosition();
}

// ── Event listeners del quiz ─────────────────────────────────────

// Botón "Check": verificar respuesta
btnCheck.addEventListener('click', checkAnswer);

// Botón "Next": siguiente pregunta
btnNext.addEventListener('click', nextQuestion);

// Teclado: Enter para check/next, flecha derecha para next
document.addEventListener('keydown', e => {
  // Solo procesar si el quiz está visible (no en login)
  if (document.getElementById('loginScreen').style.display !== 'none') return;

  if (e.key === 'Enter') {
    e.preventDefault();
    if (!answered) {
      checkAnswer();
    } else {
      nextQuestion();
    }
  }
  if (e.key === 'ArrowRight' && answered) nextQuestion();
});

// Modo pills: cambiar el filtro de tiempos verbales
document.getElementById('modeRow').addEventListener('click', e => {
  const pill = e.target.closest('.pill');
  if (!pill) return;
  mode = pill.dataset.mode;
  document.querySelectorAll('.pill').forEach(p => p.classList.toggle('active', p === pill));
  nextQuestion();
});
