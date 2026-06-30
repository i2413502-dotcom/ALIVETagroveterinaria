const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/inventario.controller');
const { verificarToken, verificarRol } = require('../middlewares/auth.middleware');

// Todo este módulo es exclusivo del panel de administrador
router.use(verificarToken, verificarRol('COLABORADOR'));

router.get('/bajo-stock',  ctrl.bajoPorStock);
router.get('/por-vencer',  ctrl.porVencer);
router.get('/buscar-codigo/:codigo', ctrl.buscarPorCodigo);
router.put('/actualizar-stock/:id', ctrl.actualizarStock);

module.exports = router;
