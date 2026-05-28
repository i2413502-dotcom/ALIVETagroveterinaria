// ════════════════════════════════════════════════════════════
//  Firebase Admin — credenciales SOLO desde variables de entorno.
//  Nunca hardcodeadas ni leídas desde un .json versionado.
//
//  Configura en .env UNA de estas opciones:
//    A) FIREBASE_SERVICE_ACCOUNT = '{...json del service account en una sola línea...}'
//    B) FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
//       (en FIREBASE_PRIVATE_KEY los saltos de línea van escapados como \n)
//
//  Si no hay credenciales, Firebase queda DESACTIVADO con un stub seguro:
//  la app sigue funcionando y las notificaciones se guardan solo en BD.
// ════════════════════════════════════════════════════════════

let admin = null;
try {
    admin = require('firebase-admin');
} catch (e) {
    console.error('firebase-admin no disponible:', e.message);
}

function construirCredencial() {
    // Opción A: JSON completo en una sola variable
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        try {
            return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        } catch (e) {
            console.error('FIREBASE_SERVICE_ACCOUNT no es JSON válido:', e.message);
            return null;
        }
    }
    // Opción B: campos por separado
    const { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY } = process.env;
    if (FIREBASE_PROJECT_ID && FIREBASE_CLIENT_EMAIL && FIREBASE_PRIVATE_KEY) {
        return {
            projectId:   FIREBASE_PROJECT_ID,
            clientEmail: FIREBASE_CLIENT_EMAIL,
            privateKey:  FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
        };
    }
    return null;
}

let exportado = null;

if (admin) {
    if (admin.apps && admin.apps.length) {
        exportado = admin; // ya inicializado en otro require
    } else {
        const cred = construirCredencial();
        if (cred) {
            try {
                admin.initializeApp({ credential: admin.credential.cert(cred) });
                console.log('✅ Firebase Admin inicializado desde variables de entorno');
                exportado = admin;
            } catch (err) {
                console.error('Error inicializando Firebase Admin:', err.message);
            }
        }
    }
}

if (!exportado) {
    // Stub seguro: Firebase desactivado (faltan credenciales en .env)
    console.log('ℹ️  Firebase desactivado: define FIREBASE_SERVICE_ACCOUNT o FIREBASE_* en .env. Las notificaciones se guardarán solo en BD.');
    exportado = {
        messaging: () => ({
            sendEachForMulticast: async () => {
                throw new Error('Firebase no configurado: define las credenciales en .env');
            }
        })
    };
}

module.exports = exportado;
