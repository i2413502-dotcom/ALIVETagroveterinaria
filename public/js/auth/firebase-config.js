// ============================================================
//  Config pública de Firebase (Web).
//  Es el MISMO proyecto que ya usa /firebase-messaging-sw.js para
//  las notificaciones push. Estos valores NO son secretos: la
//  apiKey de un proyecto Firebase Web está diseñada para viajar
//  en el navegador (la seguridad real la dan las reglas del
//  proyecto y los dominios autorizados en la consola de Firebase).
// ============================================================
const firebaseConfig = {
    apiKey: "AIzaSyAzWbtDZZn9oblF_X4D8JE2VwiUrwx-EuM",
    authDomain: "agroveterinaria-35fbd.firebaseapp.com",
    projectId: "agroveterinaria-35fbd",
    storageBucket: "agroveterinaria-35fbd.firebasestorage.app",
    messagingSenderId: "15751449528",
    appId: "1:15751449528:web:6e3d205d13af5c351d9d4d"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
