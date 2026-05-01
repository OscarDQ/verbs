// ═══════════════════════════════════════════════════════════════════
// app.js — Inicialización y control general de la aplicación
// ═══════════════════════════════════════════════════════════════════
// Orquesta el flujo principal: auto-login → mostrar quiz o login,
// maneja las pestañas de mobile, y conecta todos los módulos.
// Este archivo se carga al final, después de todos los demás.
// ═══════════════════════════════════════════════════════════════════

// ── Referencias al DOM (pantallas y controles) ───────────────────
const loginScreen   = document.getElementById('loginScreen');
const appLayout     = document.getElementById('appLayout');
const loginForm     = document.getElementById('loginForm');
const loginNameIn   = document.getElementById('loginName');
const loginPassIn   = document.getElementById('loginPassword');
const loginError    = document.getElementById('loginError');
const btnLogin      = document.getElementById('btnLogin');
const btnGuest      = document.getElementById('btnGuest');
const btnLogout     = document.getElementById('btnLogout');
const userNameDisp  = document.getElementById('userName');
const tabBar        = document.getElementById('tabBar');

// ── Mostrar / Ocultar pantallas ──────────────────────────────────

/**
 * Muestra la pantalla de login y oculta el quiz.
 */
function showLoginScreen() {
  loginScreen.style.display = 'flex';
  appLayout.style.display = 'none';
  // Limpiar campos
  if (loginNameIn) loginNameIn.value = '';
  if (loginPassIn) loginPassIn.value = '';
  if (loginError) loginError.textContent = '';
  // Enfocar el campo de nombre
  setTimeout(() => loginNameIn && loginNameIn.focus(), 100);
}

/**
 * Muestra el quiz y oculta la pantalla de login.
 * Actualiza el nombre del usuario en el header.
 */
function showApp() {
  loginScreen.style.display = 'none';
  appLayout.style.display = '';

  // Mostrar nombre del usuario en el header
  if (userNameDisp && currentUser) {
    userNameDisp.textContent = currentUser.name;
    if (isGuest) {
      userNameDisp.textContent = 'Guest';
    }
  }

  // Iniciar el leaderboard listener (tiempo real)
  listenToLeaderboard();

  // Actualizar stats iniciales
  updateStats();

  // Empezar el quiz
  nextQuestion();
}

// ── Handlers de login ────────────────────────────────────────────

/**
 * Handler del botón "Enter" del login.
 * Valida campos, intenta login/registro, muestra errores.
 */
async function handleLogin() {
  const name = loginNameIn.value.trim();
  const pass = loginPassIn.value;

  // Validación de campos vacíos
  if (!name) {
    loginError.textContent = 'Escribe tu nombre';
    loginNameIn.focus();
    return;
  }
  if (!pass) {
    loginError.textContent = 'Escribe una contraseña';
    loginPassIn.focus();
    return;
  }
  if (name.length > 15) {
    loginError.textContent = 'Nombre máximo 15 caracteres';
    loginNameIn.focus();
    return;
  }

  // Deshabilitar botón mientras se procesa
  btnLogin.disabled = true;
  btnLogin.textContent = 'Loading...';
  loginError.textContent = '';

  const result = await login(name, pass);

  if (result.success) {
    showApp();
  } else {
    loginError.textContent = result.error;
    btnLogin.disabled = false;
    btnLogin.textContent = 'Enter';
  }
}

// Botón "Enter" del login
btnLogin.addEventListener('click', handleLogin);

// Enter en los campos del login
loginPassIn.addEventListener('keydown', e => {
  if (e.key === 'Enter') { e.preventDefault(); handleLogin(); }
});
loginNameIn.addEventListener('keydown', e => {
  if (e.key === 'Enter') { e.preventDefault(); loginPassIn.focus(); }
});

// Botón "Play as Guest"
btnGuest.addEventListener('click', () => {
  enterAsGuest();
  showApp();
});

// Botón de logout (en el header del quiz)
btnLogout.addEventListener('click', () => {
  logout();
  // Resetear estado del quiz
  score = 0; total = 0; streak = 0;
  showLoginScreen();
});

// ── Sistema de pestañas (mobile) ─────────────────────────────────

const mainContent = document.getElementById('mainContent');
const leaderboardPanel = document.getElementById('leaderboardPanel');

/**
 * Cambia entre la pestaña de Quiz y la de Leaderboard.
 * Solo tiene efecto visual en mobile (< 769px).
 * @param {string} tab - 'quiz' o 'leaderboard'
 */
function switchTab(tab) {
  // Actualizar clases activas en los botones de tab
  document.querySelectorAll('.tab').forEach(t => {
    t.classList.toggle('active', t.dataset.tab === tab);
  });

  if (tab === 'quiz') {
    mainContent.classList.remove('tab-hidden');
    leaderboardPanel.classList.remove('tab-visible');
  } else {
    mainContent.classList.add('tab-hidden');
    leaderboardPanel.classList.add('tab-visible');
  }
}

// Event listeners para las pestañas
tabBar.addEventListener('click', e => {
  const tab = e.target.closest('.tab');
  if (!tab) return;
  switchTab(tab.dataset.tab);
});

// ── Inicialización ───────────────────────────────────────────────

/**
 * Punto de entrada principal de la aplicación.
 * Intenta auto-login con sesión guardada.
 * Si no hay sesión, muestra la pantalla de login.
 */
async function initApp() {
  // Mostrar pantalla de carga inicial
  loginScreen.style.display = 'flex';
  appLayout.style.display = 'none';

  // Intentar auto-login con sesión guardada en localStorage
  const autoLogged = await tryAutoLogin();

  if (autoLogged) {
    // Sesión válida → ir directo al quiz
    showApp();
  } else {
    // Sin sesión → mostrar login
    showLoginScreen();
  }
}

// ¡Arrancar la app!
initApp();
