const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/carrito.controller');

router.post('/productos', ctrl.obtenerProductosCarrito);

module.exports = router;