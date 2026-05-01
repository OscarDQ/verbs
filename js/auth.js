// ═══════════════════════════════════════════════════════════════════
// auth.js — Sistema de autenticación (login, registro, guest)
// ═══════════════════════════════════════════════════════════════════
// Maneja el flujo de login/registro usando Firebase Realtime DB.
// Las contraseñas se hashean con SHA-256 antes de guardarse.
// La sesión se persiste en localStorage para auto-login.
// Los guests pueden jugar sin cuenta pero no aparecen en el ranking.
// ═══════════════════════════════════════════════════════════════════

// ── Estado de autenticación ──────────────────────────────────────
// currentUser: objeto con datos del usuario logueado (null si no hay sesión)
// isGuest: true si el usuario entró sin cuenta
let currentUser = null;
let isGuest = false;

// ── Utilidades ───────────────────────────────────────────────────

/**
 * Hashea la contraseña con SHA-256 usando Web Crypto API.
 * Se usa el nombre como "salt" para que dos usuarios con la misma
 * contraseña no tengan el mismo hash.
 * @param {string} name - Nombre del usuario (usado como salt)
 * @param {string} password - Contraseña en texto plano
 * @returns {Promise<string>} Hash hexadecimal de 64 caracteres
 */
async function hashPassword(name, password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(name.toLowerCase() + ':' + password);
  const buffer = await crypto.subtle.digest('SHA-256', data);
  const array = Array.from(new Uint8Array(buffer));
  return array.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Sanitiza el nombre para usarlo como key en Firebase.
 * Firebase no permite: . # $ [ ] / en las keys.
 * @param {string} name - Nombre original
 * @returns {string} Nombre sanitizado en minúsculas
 */
function sanitizeKey(name) {
  return name.toLowerCase().replace(/[.#$[\]/\s]/g, '_');
}

// ── Login / Registro ─────────────────────────────────────────────

/**
 * Intenta hacer login o registrar un usuario nuevo.
 * Flujo:
 *   1. Sanitizar nombre y hashear contraseña
 *   2. Buscar usuario en Firebase
 *   3. Si existe → verificar contraseña
 *   4. Si no existe → crear usuario nuevo
 *   5. Guardar sesión en localStorage
 *
 * @param {string} name - Nombre del usuario
 * @param {string} password - Contraseña
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function login(name, password) {
  const key = sanitizeKey(name);
  const passHash = await hashPassword(name, password);

  try {
    // Buscar si el usuario ya existe en la base de datos
    const snapshot = await db.ref('users/' + key).once('value');
    const userData = snapshot.val();

    if (userData) {
      // ── Usuario existente: verificar contraseña ──
      if (userData.passwordHash !== passHash) {
        return { success: false, error: 'Contraseña incorrecta' };
      }
      // Contraseña correcta → cargar datos
      currentUser = {
        name: userData.displayName,
        key: key,
        totalScore: userData.score || 0
      };
    } else {
      // ── Usuario nuevo: registrar ──
      const newUser = {
        displayName: name.trim(),
        passwordHash: passHash,
        score: 0,
        createdAt: firebase.database.ServerValue.TIMESTAMP
      };
      await db.ref('users/' + key).set(newUser);
      currentUser = {
        name: name.trim(),
        key: key,
        totalScore: 0
      };
    }

    isGuest = false;

    // Guardar sesión en localStorage para auto-login futuro
    localStorage.setItem('verbQuizSession', JSON.stringify({
      name: currentUser.name,
      key: key,
      passHash: passHash
    }));

    return { success: true };

  } catch (err) {
    console.error('Login error:', err);
    return { success: false, error: 'Error de conexión. Intenta de nuevo.' };
  }
}

/**
 * Entrar como invitado (guest).
 * No se guarda nada en Firebase ni localStorage.
 * El puntaje solo existe durante la sesión actual.
 */
function enterAsGuest() {
  currentUser = { name: 'Guest', key: null, totalScore: 0 };
  isGuest = true;
  localStorage.removeItem('verbQuizSession');
}

/**
 * Intenta auto-login usando la sesión guardada en localStorage.
 * Verifica que la sesión siga siendo válida contra Firebase.
 *
 * @returns {Promise<boolean>} true si el auto-login fue exitoso
 */
async function tryAutoLogin() {
  const saved = localStorage.getItem('verbQuizSession');
  if (!saved) return false;

  try {
    const session = JSON.parse(saved);
    const snapshot = await db.ref('users/' + session.key).once('value');
    const userData = snapshot.val();

    // Verificar que el usuario existe y la contraseña coincide
    if (userData && userData.passwordHash === session.passHash) {
      currentUser = {
        name: userData.displayName,
        key: session.key,
        totalScore: userData.score || 0
      };
      isGuest = false;
      return true;
    }

    // Sesión inválida → limpiar
    localStorage.removeItem('verbQuizSession');
    return false;

  } catch (err) {
    console.error('Auto-login error:', err);
    // Si hay error de red, limpiar sesión para evitar loops
    localStorage.removeItem('verbQuizSession');
    return false;
  }
}

/**
 * Cerrar sesión: limpiar estado y volver a la pantalla de login.
 */
function logout() {
  currentUser = null;
  isGuest = false;
  localStorage.removeItem('verbQuizSession');
}

/**
 * Incrementar el puntaje total del usuario en Firebase.
 * Usa transaction() para manejar actualizaciones concurrentes
 * (ej: si el usuario juega en dos pestañas simultáneamente).
 * Solo funciona para usuarios registrados (no guests).
 */
function incrementScoreInFirebase() {
  if (isGuest || !currentUser || !currentUser.key) return;

  db.ref('users/' + currentUser.key + '/score').transaction(current => {
    return (current || 0) + 1;
  }).then(result => {
    // Actualizar el puntaje local con el valor confirmado por Firebase
    if (result.committed) {
      currentUser.totalScore = result.snapshot.val();
    }
  }).catch(err => {
    console.error('Error updating score:', err);
  });
}
