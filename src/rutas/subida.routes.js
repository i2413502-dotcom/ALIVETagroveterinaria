const express = require('express');
const router  = express.Router();
const ctrl    = require('../controladores/subida.controller');
const upload  = require('../config/upload');
const { verificarToken, verificarRol } = require('../middlewares/auth.middleware');

// NOTA: en app.js esta ruta no tenía NINGÚN middleware de autenticación
// (cualquiera podía subir archivos al bucket de R2 sin iniciar sesión).
// Se protege igual que la creación/edición de productos.
router.post('/imagen-producto', verificarToken, verificarRol('COLABORADOR'), upload.single('imagen'), ctrl.subirImagenProducto);

module.exports = router;
