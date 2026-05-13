const FIREBASE_CONFIG = {
    apiKey: "AIzaSyAzWbtDZZn9oblF_X4D8JE2VwiUrwx-EuM",
    authDomain: "agroveterinaria-35fbd.firebaseapp.com",
    projectId: "agroveterinaria-35fbd",
    storageBucket: "agroveterinaria-35fbd.firebasestorage.app",
    messagingSenderId: "15751449528",
    appId: "1:15751449528:web:6e3d205d13af5c351d9d4d"
};

const VAPID_KEY = "BLe58No8VH60BRZb9_wqomHbSMh2HiXRbrLDNBAfmuOMLYPjGf2gh95f2os_QHVjgKFRN6bsMSlk602BPr2Wbqs";

async function iniciarNotificaciones() {
    if (!('Notification' in window)) {
        console.warn('Navegador sin soporte de notificaciones');
        return;
    }
    if (!('serviceWorker' in navigator)) {
        console.warn('Service Worker no soportado — solo alertas visuales');
        return;
    }

    try {
        const swReg = await navigator.serviceWorker.register('/firebase-messaging-sw.js');

        const { initializeApp } = await import(
            'https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js'
        );
        const { getMessaging, getToken, onMessage } = await import(
            'https://www.gstatic.com/firebasejs/12.11.0/firebase-messaging.js'
        );

        const app       = initializeApp(FIREBASE_CONFIG);
        const messaging = getMessaging(app);

        const permiso = await Notification.requestPermission();
        if (permiso !== 'granted') {
            mostrarBannerPermisos();
            return;
        }

        const token = await getToken(messaging, {
            vapidKey: VAPID_KEY,
            serviceWorkerRegistration: swReg
        });

        if (token) {
            await fetch('/api/notificaciones/registrar-token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token })
            });
            console.log('Notificaciones push activadas correctamente');
        }

        // Notificaciones con la app ABIERTA en pantalla
        onMessage(messaging, (payload) => {
            const { title, body } = payload.notification;
            mostrarAlertaVisual(title, body, payload.data?.tipo);
            reproducirSonido();
            actualizarBadge();
        });

    } catch (err) {
        console.error('Error Firebase:', err.message);
    }
}

function mostrarAlertaVisual(titulo, cuerpo, tipo) {
    const colores = {
        nuevo_pedido: '#1D9E75',
        bajo_stock:   '#BA7517',
        por_vencer:   '#D85A30',
        general:      '#378ADD'
    };
    const color = colores[tipo] || colores.general;

    const alerta = document.createElement('div');
    alerta.style.cssText = `
        position: fixed; top: 20px; right: 20px; z-index: 99999;
        background: white; border-left: 5px solid ${color};
        padding: 16px 20px; border-radius: 8px;
        max-width: 320px; min-width: 260px;
        box-shadow: 0 4px 16px rgba(0,0,0,0.18);
        cursor: pointer; font-family: sans-serif;
    `;
    alerta.innerHTML = `
        <div style="font-weight:600;font-size:14px;color:#2C2C2A;margin-bottom:6px">${titulo}</div>
        <div style="font-size:13px;color:#5F5E5A;line-height:1.5">${cuerpo}</div>
        <div style="font-size:11px;color:#aaa;margin-top:8px">Toca para cerrar</div>
    `;
    alerta.onclick = () => alerta.remove();
    document.body.appendChild(alerta);
    setTimeout(() => { if (alerta.parentNode) alerta.remove(); }, 7000);
}

function reproducirSonido() {
    try {
        const ctx  = new (window.AudioContext || window.webkitAudioContext)();
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 880;
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.4);
    } catch (e) { /* navegador sin AudioContext, se ignora */ }
}

function mostrarBannerPermisos() {
    if (document.getElementById('banner-notif')) return;
    const banner = document.createElement('div');
    banner.id = 'banner-notif';
    banner.style.cssText = `
        position:fixed; bottom:0; left:0; right:0;
        background:#1D9E75; color:white; padding:14px 20px;
        text-align:center; font-family:sans-serif; font-size:14px;
        z-index:99999; display:flex; align-items:center;
        justify-content:center; gap:12px;
    `;
    banner.innerHTML = `
        <span>Activa las notificaciones para recibir alertas de pedidos y stock</span>
        <button onclick="Notification.requestPermission().then(p=>{ if(p==='granted') location.reload(); })"
            style="background:white;color:#1D9E75;border:none;padding:6px 14px;
                   border-radius:6px;font-weight:600;cursor:pointer;font-size:13px">
            Activar
        </button>
        <button onclick="this.parentNode.remove()"
            style="background:transparent;color:white;border:1px solid rgba(255,255,255,0.5);
                   padding:6px 10px;border-radius:6px;cursor:pointer;font-size:13px">
            Ahora no
        </button>
    `;
    document.body.appendChild(banner);
}

function actualizarBadge() {
    const badge = document.getElementById('notif-badge');
    if (badge) {
        const actual = parseInt(badge.textContent || '0');
        badge.textContent = actual + 1;
        badge.style.display = 'inline-block';
    }
}

iniciarNotificaciones();