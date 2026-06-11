require('dotenv').config();
require('./services/cron.services');
const express = require('express');
const cors    = require('cors');
const path    = require('path');
const multer  = require('multer');
const fs      = require('fs');

const app = express();

// ── Cloudinary — almacenamiento permanente de imágenes ────────
const cloudinary = require('./config/cloudinary');
const storage = multer.memoryStorage(); // guarda en memoria, no en disco

// Solo se aceptan estos MIME types (rechazo ANTES de escribir en disco)
const MIMES_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp'];

const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        const mimeOk = MIMES_PERMITIDOS.includes(file.mimetype);
        const extOk  = /\.(jpe?g|png|webp)$/i.test(file.originalname);
        if (mimeOk && extOk) {
            cb(null, true);
        } else {
            const err = new Error('Formato no permitido. Solo se aceptan imágenes JPEG, PNG o WEBP.');
            err.code = 'INVALID_FILE_TYPE';
            cb(err, false);
        }
    },
    limits: { fileSize: 5 * 1024 * 1024 } // 5 MB
});

// ── Middlewares ───────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── AgroBot: inyecta el widget en todos los HTML servidos ─────
// Intercepta las páginas de public/ y añade el script del chat antes
// de </body>, así el botón flotante aparece en todo el sitio sin
// tocar cada HTML. Debe ir ANTES de express.static.
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
app.use((req, res, next) => {
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
});

app.use(express.static(PUBLIC_DIR));

// ── Ruta para subir imagen de producto ──────────────────────
app.post('/api/upload/imagen-producto', upload.single('imagen'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ mensaje: 'No se recibió imagen' });
    }
    try {
        const resultado = await new Promise((resolve, reject) => {
            cloudinary.uploader.upload_stream(
                { folder: 'productos' },
                (error, result) => {
                    if (error) reject(error);
                    else resolve(result);
                }
            ).end(req.file.buffer);
        });
        res.json({ 
            nombre: resultado.public_id,
            url: resultado.secure_url  // URL permanente de Cloudinary
        });
    } catch (error) {
        console.error('Error subiendo a Cloudinary:', error);
        res.status(500).json({ mensaje: 'Error al subir imagen' });
    }
});

// ── Rutas de la app ──────────────────────────────────────────
app.use('/api/productos',     require('./routes/producto.routes.js'));
app.use('/api/auth',          require('./routes/auth.routes.js'));
app.use('/api/categorias',    require('./routes/categoria.routes.js'));
app.use('/api/animales',      require('./routes/animal.routes.js'));
app.use('/api/carrito',       require('./routes/carrito.routes.js'));
app.use('/api/pedidos',       require('./routes/pedido.routes.js'));
app.use('/api/clientes',      require('./routes/cliente.routes.js'));
app.use('/api/ubigeo',        require('./routes/ubigeo.routes.js'));
app.use('/api/colaboradores', require('./routes/colaborador.routes.js'));
app.use('/api/reportes',      require('./routes/reporte.routes.js'));
app.use('/api/ventas',        require('./routes/venta.routes.js'));
app.use('/',                  require('./routes/dashboard.routes.js'));
app.use('/api/inventario',    require('./routes/inventario.routes.js'));
app.use('/api/ia',            require('./routes/ia.routes.js'));

// ── Registro de token FCM ─────────────────────────────────────
app.post('/api/notificaciones/registrar-token', async (req, res) => {
    try {
        const { token } = req.body;
        if (!token) return res.status(400).json({ mensaje: 'Token requerido' });
        
        const db = require('./config/db');
        await db.query(
            `INSERT INTO fcm_tokens (token, activo) VALUES (?, 1)
             ON DUPLICATE KEY UPDATE activo = 1, actualizado_at = NOW()`,
            [token]
        );
        res.json({ mensaje: 'Token registrado correctamente' });
    } catch (err) {
        console.error('Error registrando token:', err);
        res.status(500).json({ mensaje: 'Error al registrar token' });
    }
});

// ── Historial de notificaciones ────────────────────────────────
app.get('/api/notificaciones', async (req, res) => {
    try {
        const db = require('./config/db');
        const [rows] = await db.query(
            'SELECT * FROM notificaciones ORDER BY creado_at DESC LIMIT 50'
        );
        res.json(rows);
    } catch (err) {
        console.error('Error obteniendo notificaciones:', err);
        res.status(500).json({ mensaje: 'Error al obtener notificaciones' });
    }
});

// ── Marcar notificación como leída ─────────────────────────────
app.put('/api/notificaciones/:id/leer', async (req, res) => {
    try {
        const db = require('./config/db');
        await db.query(
            'UPDATE notificaciones SET leida = 1 WHERE id = ?',
            [req.params.id]
        );
        res.json({ mensaje: 'Marcada como leída' });
    } catch (err) {
        console.error('Error marcando notificación:', err);
        res.status(500).json({ mensaje: 'Error' });
    }
});

// ── Manejador de errores global ───────────────────────────────
app.use((err, req, res, next) => {
    console.error('Error no manejado:', err);
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ mensaje: 'La imagen no debe superar los 5MB' });
    }
    if (err.code === 'INVALID_FILE_TYPE') {
        return res.status(400).json({ mensaje: err.message });
    }
    res.status(500).json({ mensaje: 'Error interno del servidor' });
});

// ── Crear tablas de IA al arrancar (no tumba el server si falla) ──
require('./models/ia.model').createTables()
    .catch(err => console.error('No se pudieron crear las tablas de IA:', err.message));

// ── Iniciar servidor ──────────────────────────────────────────
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log('=================================');
    console.log('Servidor corriendo en puerto ' + PORT);
    console.log('Entorno:', process.env.NODE_ENV || 'desarrollo');
    console.log('=================================');
});