const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/venta.controller');
const { verificarToken, verificarRol } = require('../middlewares/auth.middleware');

// Todo este módulo es exclusivo del panel de administrador
router.use(verificarToken, verificarRol('COLABORADOR'));

router.get('/',               ctrl.listar);
router.get('/exportar-excel', ctrl.exportarExcel);  // ← antes de /:idPedido
router.get('/:idPedido',      ctrl.detalle);

module.exports = router;
