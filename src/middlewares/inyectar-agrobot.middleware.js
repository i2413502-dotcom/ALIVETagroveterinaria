const path = require('path');
const fs   = require('fs');

const PUBLIC_DIR = path.join(__dirname, '..', '..', 'public');

// AgroBot: inyecta el widget en todos los HTML servidos.
// Intercepta las páginas de public/ y añade el script del chat antes
// de </body>, así el botón flotante aparece en todo el sitio sin
// tocar cada HTML. Debe montarse ANTES de express.static.
function inyectarAgrobot(req, res, next) {
    const ruta = req.path === '/' ? '/index.html' : req.path;
    if (req.method !== 'GET' || !ruta.endsWith('.html')) return next();

    // Resolver y validar que el archivo esté dentro de public/ (anti path-traversal)
    const archivo = path.resolve(PUBLIC_DIR, '.' + path.posix.normalize(ruta));
    if (!archivo.startsWith(PUBLIC_DIR)) return next();

    fs.readFile(archivo, 'utf8', (err, html) => {
        if (err) return next(); // no existe: que lo resuelva static o 404

        const script = '<script src="/js/agrobot.js"></script>';
        const conBot = html.includes('</body>')
            ? html.replace('</body>', script + '\n</body>')
            : html + script;
        res.type('html').send(conBot);
    });
}

module.exports = { inyectarAgrobot, PUBLIC_DIR };
