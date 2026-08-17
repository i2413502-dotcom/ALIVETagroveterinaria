const express = require('express');
const router  = express.Router();
const ctrl    = require('../controladores/venta.controller');
const { verificarToken, verificarRol } = require('../middlewares/auth.middleware');

// Todo este módulo es exclusivo del panel de administrador
router.use(verificarToken, verificarRol('COLABORADOR'));

// Se utiliza para el móvil
router.get('/',               ctrl.listar);
// Se utiliza para el móvil
router.get('/exportar-excel', ctrl.exportarExcel);  // ← antes de /:idPedido
router.get('/:idPedido',      ctrl.detalle);

module.exports = router;
