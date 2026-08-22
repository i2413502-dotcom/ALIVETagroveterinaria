require('dotenv').config();
require('./servicios/cron.services');
const express = require('express');
const cors    = require('cors');

const { inyectarAgrobot, PUBLIC_DIR } = require('./middlewares/inyectar-agrobot.middleware');

const app = express();

// Se utiliza para el móvil
app.set('trust proxy', 1);

// ── Middlewares globales ────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Debe ir ANTES de express.static para poder interceptar los .html
app.use(inyectarAgrobot);
app.use(express.static(PUBLIC_DIR));

// ── Rutas de la app ──────────────────────────────────────────────
app.use('/api/productos',      require('./rutas/producto.routes.js'));
app.use('/api/auth',           require('./rutas/auth.routes.js'));
app.use('/api/categorias',     require('./rutas/categoria.routes.js'));
app.use('/api/animales',       require('./rutas/animal.routes.js'));
app.use('/api/carrito',        require('./rutas/carrito.routes.js'));
app.use('/api/pedidos',        require('./rutas/pedido.routes.js'));
app.use('/api/clientes',       require('./rutas/cliente.routes.js'));
app.use('/api/ubigeo',         require('./rutas/ubigeo.routes.js'));
app.use('/api/colaboradores',  require('./rutas/colaborador.routes.js'));
app.use('/api/reportes',       require('./rutas/reporte.routes.js'));
app.use('/api/ventas',         require('./rutas/venta.routes.js'));
app.use('/api/despachos',      require('./rutas/despacho.routes.js'));
app.use('/',                   require('./rutas/dashboard.routes.js'));
app.use('/api/inventario',     require('./rutas/inventario.routes.js'));
app.use('/api/ia',             require('./rutas/ia.routes.js'));
app.use('/api/upload',         require('./rutas/subida.routes.js'));
app.use('/api/notificaciones', require('./rutas/notificacion.routes.js'));
app.use('/api/imagenes',       require('./rutas/imagen.routes.js'));
app.use('/api/variantes',      require('./rutas/variante.routes.js'));

// ── Manejador de errores global ───────────────────────────────────
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
require('./modelos/ia.model').createTables()
    .catch(err => console.error('No se pudieron crear las tablas de IA:', err.message));

// ── Iniciar servidor ──────────────────────────────────────────────
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log('=================================');
    console.log('Servidor corriendo en puerto ' + PORT);
    console.log('Entorno:', process.env.NODE_ENV || 'desarrollo');
    console.log('=================================');
});
