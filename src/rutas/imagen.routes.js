const express = require('express');
const router  = express.Router();
const ctrl    = require('../controladores/imagen.controller');
const upload  = require('../config/upload');
const { verificarToken, verificarRol } = require('../middlewares/auth.middleware');

// Pública — la ficha de producto necesita mostrar la galería sin login
router.get('/:idProducto', ctrl.listar);

// Proxy de imágenes — el bucket de R2 (pub-....r2.dev) no manda cabeceras
// CORS, así que Flutter WEB (que decodifica la imagen por fetch/canvas, a
// diferencia de un <img> normal de HTML) la rechaza en silencio aunque la
// URL sea válida. Esta ruta vive en ESTE backend, que ya tiene CORS
// abierto (app.use(cors()) en app.js), así que sirve de puente: el
// navegador la pide aquí (mismo dominio de la API, sin problema de CORS)
// y el servidor hace el fetch real a R2 por su cuenta.
// Whitelist por prefijo (MINIO_PUBLIC_URL) para no volverse un proxy
// abierto a cualquier URL de internet.
router.get('/proxy/imagen', ctrl.proxyImagen);

// Protegidas — solo colaboradores
router.post('/:idProducto',  verificarToken, verificarRol('COLABORADOR'), upload.single('imagen'), ctrl.subir);
router.put('/:id/principal', verificarToken, verificarRol('COLABORADOR'), ctrl.marcarPrincipal);
router.delete('/:id',        verificarToken, verificarRol('COLABORADOR'), ctrl.eliminar);

module.exports = router;
