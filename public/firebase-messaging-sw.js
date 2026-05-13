importScripts('https://www.gstatic.com/firebasejs/12.11.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.11.0/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: "AIzaSyAzWbtDZZn9oblF_X4D8JE2VwiUrwx-EuM",
    authDomain: "agroveterinaria-35fbd.firebaseapp.com",
    projectId: "agroveterinaria-35fbd",
    storageBucket: "agroveterinaria-35fbd.firebasestorage.app",
    messagingSenderId: "15751449528",
    appId: "1:15751449528:web:6e3d205d13af5c351d9d4d"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
    const titulo = payload.notification?.title || 'Nueva notificación';
    const cuerpo  = payload.notification?.body  || '';

    self.registration.showNotification(titulo, {
        body: cuerpo,
        icon: '/img/logo.jpeg',
        badge: '/img/logo.jpeg',
        vibrate: [200, 100, 200],
        requireInteraction: true,
        data: payload.data || {}
    });
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            for (const client of clientList) {
                if (client.url.includes('dashboard') && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow('/dashboard.html');
            }
        })
    );
});

//gvbbbu//