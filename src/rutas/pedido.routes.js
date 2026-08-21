const express = require('express');
const router  = express.Router();
const ctrl    = require('../controladores/pedido.controller');
const { verificarToken } = require('../middlewares/auth.middleware');

// Requieren estar logueado (el cliente solo ve/crea SUS propios pedidos)
router.post('/crear-con-mercadopago', verificarToken, ctrl.crearPedidoConMercadoPago);
router.get('/mispedidos',             verificarToken, ctrl.obtenerPedidos);
router.get('/mispedidos/:id',         verificarToken, ctrl.obtenerDetallePedido);
router.get('/mispedidos/:id/comprobante-pdf', verificarToken, ctrl.descargarComprobantePdf);

// Webhook: lo llama Mercado Pago directamente, NO lleva JWT nuestro.
router.post('/mercadopago/webhook', ctrl.webhookMercadoPago);

// Público, sin datos sensibles — ver pedido.controller.js
router.get('/entorno-facturacion', ctrl.entornoFacturacion);

module.exports = router;
