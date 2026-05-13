const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');

router.post('/login',              authController.login);
router.post('/registro',           authController.register);
router.get('/consultar-documento', authController.consultarDocumento);
router.get('/perfil',              authController.getPerfil);
router.get('/datos-envio',         authController.getDatosEnvio);
router.put('/actualizar-perfil',   authController.actualizarPerfil);
router.put('/cambiar-password',    authController.cambiarPassword);
router.post('/fcm-token',          authController.guardarFcmToken);
router.put('/guardar-direccion', authController.guardarDireccionHabitual);

module.exports = router;