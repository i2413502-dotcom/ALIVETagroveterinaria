// notificacion.service.js - Versión segura cuando Firebase está desactivado
exports.enviarNotificacion = async (titulo, cuerpo, data = {}) => {
    console.log('[Notificación simulada]', titulo, '-', cuerpo);
    return { success: true, simulada: true };
};