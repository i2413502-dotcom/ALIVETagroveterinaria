const express = require('express');
const router  = express.Router();
const ctrl    = require('../controladores/imagen.controller');
const upload  = require('../config/upload');
const { verificarToken, verificarRol } = require('../middlewares/auth.middleware');

// Pública — la ficha de producto necesita mostrar la galería sin login
router.get('/:idProducto', ctrl.listar);

// Protegidas — solo colaboradores
router.post('/:idProducto',  verificarToken, verificarRol('COLABORADOR'), upload.single('imagen'), ctrl.subir);
router.put('/:id/principal', verificarToken, verificarRol('COLABORADOR'), ctrl.marcarPrincipal);
router.delete('/:id',        verificarToken, verificarRol('COLABORADOR'), ctrl.eliminar);

module.exports = router;
