const express = require('express');
const router = express.Router();
const ctrl = require('../controladores/carrito.controller');

router.post('/productos', ctrl.obtenerProductosCarrito);

module.exports = router;