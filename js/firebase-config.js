// ═══════════════════════════════════════════════════════════════════
// firebase-config.js — Configuración e inicialización de Firebase
// ═══════════════════════════════════════════════════════════════════
// Este archivo contiene las credenciales del proyecto Firebase
// y exporta la referencia a la base de datos en tiempo real.
// Las credenciales son públicas por diseño (la seguridad se
// controla con las reglas de la base de datos, no con la API key).
// ═══════════════════════════════════════════════════════════════════

const firebaseConfig = {
  apiKey: "AIzaSyDPDsybXUoiesZoWgPOXqiGNHTSdA_n7p4",
  authDomain: "beltran-2b4fa.firebaseapp.com",
  databaseURL: "https://beltran-2b4fa-default-rtdb.firebaseio.com",
  projectId: "beltran-2b4fa",
  storageBucket: "beltran-2b4fa.firebasestorage.app",
  messagingSenderId: "702257026029",
  appId: "1:702257026029:web:db9ae8bd09d5a457a24de4",
  measurementId: "G-5CF26DMVL0"
};

// Inicializar Firebase con la configuración del proyecto "beltran"
firebase.initializeApp(firebaseConfig);

// Referencia global a la Realtime Database
// Se usa en auth.js y leaderboard.js para leer/escribir datos
const db = firebase.database();
