const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/producto.controller');

router.get('/buscar-ficha', ctrl.buscarFichaTecnica); // ← ANTES de /:id
router.get('/',             ctrl.listar);
router.get('/:id',          ctrl.obtenerPorId);
router.post('/',            ctrl.crear);
router.put('/:id',          ctrl.actualizar);
router.delete('/:id',       ctrl.eliminar);

module.exports = router;