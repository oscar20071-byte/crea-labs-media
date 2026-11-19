// Configuración pública de Firebase para la aplicación web.
// Sustituye estos valores por los de Firebase Console > Project settings > Your apps.
// Esta configuración identifica tu proyecto; nunca pegues aquí contraseñas ni claves privadas.
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "REEMPLAZAR_API_KEY",
  authDomain: "REEMPLAZAR_PROJECT_ID.firebaseapp.com",
  projectId: "REEMPLAZAR_PROJECT_ID",
  appId: "REEMPLAZAR_APP_ID"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
