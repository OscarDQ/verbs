// ═══════════════════════════════════════════════════════════════════
// leaderboard.js — Panel de ranking (top 10 usuarios)
// ═══════════════════════════════════════════════════════════════════
// Escucha cambios en tiempo real de Firebase y renderiza el
// leaderboard con los 10 usuarios con más puntos.
// En desktop aparece como sidebar izquierdo.
// En mobile se accede mediante pestañas (tabs).
// ═══════════════════════════════════════════════════════════════════

// ── Referencia al contenedor del leaderboard ─────────────────────
const lbList = document.getElementById('lbList');
const lbUserPos = document.getElementById('lbUserPosition');

// Cache de datos del leaderboard para re-renders
let leaderboardData = [];

/**
 * Inicia el listener en tiempo real de Firebase.
 * Escucha los top 10 usuarios ordenados por "score" (descendente).
 * Cada vez que un puntaje cambia, se re-renderiza automáticamente.
 */
function listenToLeaderboard() {
  // orderByChild('score') ordena ascendente, limitToLast(10) toma los 10 más altos
  db.ref('users')
    .orderByChild('score')
    .limitToLast(10)
    .on('value', snapshot => {
      const data = [];
      snapshot.forEach(child => {
        const val = child.val();
        data.push({
          key: child.key,
          name: val.displayName || child.key,
          score: val.score || 0
        });
      });

      // Ordenar descendente (Firebase limitToLast da ascendente)
      data.sort((a, b) => b.score - a.score);
      leaderboardData = data;
      renderLeaderboard(data);
    }, err => {
      console.error('Leaderboard listener error:', err);
      renderLeaderboardError();
    });
}

/**
 * Renderiza la lista del leaderboard en el DOM.
 * Muestra medallas para top 3, resalta al usuario actual,
 * y muestra la posición del usuario si no está en top 10.
 *
 * @param {Array} data - Lista de usuarios ordenada por score desc.
 */
function renderLeaderboard(data) {
  if (!lbList) return;

  // ── Estado vacío ──
  if (data.length === 0) {
    lbList.innerHTML = `
      <div class="lb-empty">
        <span class="lb-empty-icon">🏆</span>
        <span class="lb-empty-text">No hay puntajes aún</span>
        <span class="lb-empty-sub">¡Sé el primero!</span>
      </div>`;
    if (lbUserPos) lbUserPos.innerHTML = '';
    return;
  }

  // ── Medallas para los primeros 3 ──
  const medals = ['🥇', '🥈', '🥉'];

  // ── Construir filas ──
  let html = '';
  data.forEach((entry, i) => {
    const rank = i + 1;
    const medal = medals[i] || '';
    const isMe = currentUser && !isGuest && entry.key === currentUser.key;
    const rankClass = rank <= 3 ? `rank-${rank}` : '';

    html += `
      <div class="lb-row ${isMe ? 'lb-current' : ''}" style="--i:${i}">
        <span class="lb-rank ${rankClass}">${medal || rank}</span>
        <span class="lb-name" title="${entry.name}">${entry.name}</span>
        <span class="lb-score">${entry.score.toLocaleString()}</span>
      </div>`;
  });

  lbList.innerHTML = html;

  // ── Posición del usuario actual (si no está en top 10) ──
  updateUserPosition();
}

/**
 * Muestra la posición del usuario actual debajo del leaderboard
 * si no aparece en el top 10.
 */
function updateUserPosition() {
  if (!lbUserPos) return;

  // Si es guest o no hay usuario, no mostrar
  if (isGuest || !currentUser || !currentUser.key) {
    lbUserPos.innerHTML = `
      <div class="lb-pos-guest">
        <span>👤 Modo invitado</span>
        <span class="lb-pos-hint">Inicia sesión para guardar tu progreso</span>
      </div>`;
    return;
  }

  // Verificar si el usuario ya está en el top 10
  const inTop10 = leaderboardData.some(e => e.key === currentUser.key);
  if (inTop10) {
    const pos = leaderboardData.findIndex(e => e.key === currentUser.key) + 1;
    lbUserPos.innerHTML = `
      <div class="lb-pos-info">
        <span>👤 ${currentUser.name}</span>
        <span class="lb-pos-rank">#${pos} · ${currentUser.totalScore.toLocaleString()} pts</span>
      </div>`;
  } else {
    // No está en top 10 → mostrar su posición estimada
    lbUserPos.innerHTML = `
      <div class="lb-pos-info">
        <span>👤 ${currentUser.name}</span>
        <span class="lb-pos-rank">${currentUser.totalScore.toLocaleString()} pts · ¡Sigue así!</span>
      </div>`;
  }
}

/**
 * Muestra un mensaje de error si no se puede cargar el leaderboard.
 */
function renderLeaderboardError() {
  if (!lbList) return;
  lbList.innerHTML = `
    <div class="lb-empty">
      <span class="lb-empty-icon">⚠️</span>
      <span class="lb-empty-text">Error al cargar</span>
      <span class="lb-empty-sub">Revisa tu conexión</span>
    </div>`;
}
