const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const upload = require('../config/upload');
const { verificarToken } = require('../middlewares/auth.middleware');

// Públicas — no requieren sesión iniciada
router.post('/login',              authController.login);
router.post('/registro',           authController.register);
router.get('/consultar-documento', authController.consultarDocumento);
router.post('/verify-otp',          authController.verifyOtp);
router.post('/forgot-password',     authController.forgotPassword);
router.post('/reset-password',      authController.resetPassword);
router.post('/forgot-password-otp', authController.forgotPasswordOtp);
router.post('/reset-password-otp',  authController.resetPasswordOtp);

// Requieren estar logueado (cualquier rol: CLIENTE o COLABORADOR)
router.get('/perfil',             verificarToken, authController.getPerfil);
router.get('/datos-envio',        verificarToken, authController.getDatosEnvio);
router.put('/actualizar-perfil',  verificarToken, authController.actualizarPerfil);
router.put('/cambiar-password',   verificarToken, authController.cambiarPassword);
router.post('/fcm-token',         verificarToken, authController.guardarFcmToken);
router.put('/guardar-direccion',  verificarToken, authController.guardarDireccionHabitual);
router.post('/enviar-promocion', upload.single('imagen'), authController.enviarPromocion);

module.exports = router;
