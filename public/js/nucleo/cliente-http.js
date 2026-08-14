// ════════════════════════════════════════════════════════════
// Cliente HTTP compartido para páginas autenticadas del panel admin.
//
// Reemplaza el patrón repetido en varias páginas de:
//   fetch(url, { headers: { Authorization: 'Bearer ' + token } })
// por:
//   fetchConAuth(url, opciones)
//
// Ventaja: si el token expiró (401), cierra la sesión y redirige
// a /login.html automáticamente, en un solo lugar. Antes cada
// página debía manejar esto por su cuenta (o, como pasaba en la
// mayoría, no lo manejaba en absoluto).
//
// Uso: incluir este script ANTES del script de cada página que lo
// use, ej. en dashboard.html:
//   <script src="/js/nucleo/cliente-http.js"></script>
//   <script src="/js/dashboard.js"></script>
// ════════════════════════════════════════════════════════════

async function fetchConAuth(url, opciones = {}) {
    const token = localStorage.getItem('token');
    opciones.headers = opciones.headers || {};
    if (token) opciones.headers['Authorization'] = 'Bearer ' + token;

    const res = await fetch(url, opciones);

    if (res.status === 401) {
        ['token', 'rol', 'nombre'].forEach(k => localStorage.removeItem(k));
        alert('Tu sesión ha expirado. Vuelve a iniciar sesión.');
        window.location.href = '/login.html';
        return null;
    }
    return res;
}
