const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/venta.controller');

router.get('/',               ctrl.listar);
router.get('/exportar-excel', ctrl.exportarExcel);  // ← antes de /:idPedido
router.get('/:idPedido',      ctrl.detalle);

module.exports = router;
