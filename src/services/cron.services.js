const cron = require('node-cron');
const db = require('../config/db');
const emailService = require('./email.service');

// Función segura para enviar notificaciones (no falla si Firebase está desactivado)
const enviarNotificacionSegura = async (titulo, cuerpo, data) => {
    try {
        const { enviarNotificacion } = require('./notificacion.service');
        await enviarNotificacion(titulo, cuerpo, data);
    } catch (err) {
        console.log('Notificación no enviada (Firebase desactivado):', titulo);
    }
};

// Cada día a las 8:00 AM (hora del servidor)
cron.schedule('0 8 * * *', async () => {
    console.log('[' + new Date().toISOString() + '] Verificando stock y vencimiento...');

    try {
        // Verificar bajo stock
        const [bajoStockResult] = await db.query(
            `SELECT COUNT(*) AS total FROM producto 
             WHERE stock_actual <= stock_minimo AND estado = 'ACTIVO'`
        );
        
        if (bajoStockResult[0] && bajoStockResult[0].total > 0) {
            await enviarNotificacionSegura(
                '⚠️ Productos con bajo stock',
                `Hay ${bajoStockResult[0].total} producto(s) con stock bajo.`,
                { tipo: 'bajo_stock' }
            );
            console.log('Notificación de bajo stock enviada');
        }

        // Verificar próximos a vencer
        const [porVencerResult] = await db.query(
            `SELECT COUNT(*) AS total FROM producto 
             WHERE fecha_vencimiento IS NOT NULL
               AND fecha_vencimiento >= NOW()
               AND fecha_vencimiento <= DATE_ADD(NOW(), INTERVAL 30 DAY)
               AND estado = 'ACTIVO'`
        );
        
        if (porVencerResult[0] && porVencerResult[0].total > 0) {
            await enviarNotificacionSegura(
                '📅 Productos próximos a vencer',
                `Hay ${porVencerResult[0].total} producto(s) que vencen en 30 días.`,
                { tipo: 'por_vencer' }
            );
            console.log('Notificación de vencimiento enviada');
        }
    } catch (err) {
        console.error('Error en cron job:', err);
    }
});
// Cada lunes a las 10:00 AM
cron.schedule('0 10 * * 1', async () => {
  const tresMesesAtras = new Date();
  tresMesesAtras.setMonth(tresMesesAtras.getMonth() - 3);
  
  const [clientes] = await db.query(
    `SELECT p.correo, p.nombres 
     FROM persona p 
     JOIN cliente c ON c.id_persona = p.id_persona 
     WHERE p.id_persona NOT IN (
       SELECT DISTINCT pe.id_persona 
       FROM pedido pe 
       WHERE pe.fecha_pedido > ?
     )`,
    [tresMesesAtras]
  );
  
  for (const cliente of clientes) {
    await emailService.sendReEngagement(cliente.correo, cliente.nombres);
  }
});

// Cada día a las 3:00 AM — limpieza de chats de AgroBot con más de 2 días
cron.schedule('0 3 * * *', async () => {
    try {
        const iaModel = require('../models/ia.model');
        const borrados = await iaModel.cleanOldMessages();
        console.log(`[AgroBot] Limpieza de chats: ${borrados} mensaje(s) antiguos eliminados`);
    } catch (err) {
        console.error('[AgroBot] Error en limpieza de chats:', err.message);
    }
});

console.log('✅ Cron de notificaciones activo (8:00 AM diario)');
console.log('✅ Cron de limpieza de chats IA activo (3:00 AM diario)');