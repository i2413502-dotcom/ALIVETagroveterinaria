const db = require('../config/db');

// ── Creación de tablas (se ejecuta al arrancar la app) ────────────
exports.createTables = async () => {
    // Historial de chat: user_id NULLABLE (invitados no se guardan, pero la
    // columna lo permite por si se quiere auditar). Se limpia a los 2 días vía cron.
    await db.query(`
        CREATE TABLE IF NOT EXISTS chat_ia (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NULL,
            rol VARCHAR(20) NOT NULL DEFAULT 'INVITADO',
            mensaje_usuario TEXT NOT NULL,
            respuesta_ia TEXT NOT NULL,
            creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_chat_user (user_id),
            INDEX idx_chat_fecha (creado_en)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    // Memoria contextual estructurada: NO guarda conversaciones, solo datos
    // útiles (mascotas del usuario, categorías que le interesan).
    await db.query(`
        CREATE TABLE IF NOT EXISTS user_ai_context (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL UNIQUE,
            mascotas JSON NULL,
            categorias_favoritas JSON NULL,
            ultima_interaccion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    console.log('✅ Tablas de IA verificadas (chat_ia, user_ai_context)');
};

// ── Chat ──────────────────────────────────────────────────────────
exports.saveMessage = async (userId, rol, mensajeUsuario, respuestaIa) => {
    await db.query(
        `INSERT INTO chat_ia (user_id, rol, mensaje_usuario, respuesta_ia)
         VALUES (?, ?, ?, ?)`,
        [userId || null, rol, mensajeUsuario, respuestaIa]
    );
};

exports.getHistory = async (userId, limite = 20) => {
    const [rows] = await db.query(
        `SELECT mensaje_usuario, respuesta_ia, creado_en
         FROM chat_ia
         WHERE user_id = ?
         ORDER BY creado_en DESC
         LIMIT ?`,
        [userId, limite]
    );
    return rows.reverse(); // orden cronológico para mostrar en el chat
};

// Borra conversaciones con más de 2 días (lo llama el cron diario)
exports.cleanOldMessages = async () => {
    const [result] = await db.query(
        `DELETE FROM chat_ia WHERE creado_en < DATE_SUB(NOW(), INTERVAL 2 DAY)`
    );
    return result.affectedRows;
};

// ── Memoria contextual ────────────────────────────────────────────
exports.getContext = async (userId) => {
    const [rows] = await db.query(
        `SELECT mascotas, categorias_favoritas, ultima_interaccion
         FROM user_ai_context WHERE user_id = ?`,
        [userId]
    );
    if (!rows.length) return null;

    const ctx = rows[0];
    // mysql2 puede devolver JSON ya parseado o como string según versión
    const parse = (v) => (typeof v === 'string' ? JSON.parse(v) : v);
    return {
        mascotas: parse(ctx.mascotas) || [],
        categorias_favoritas: parse(ctx.categorias_favoritas) || [],
        ultima_interaccion: ctx.ultima_interaccion
    };
};

exports.saveContext = async (userId, data) => {
    await db.query(
        `INSERT INTO user_ai_context (user_id, mascotas, categorias_favoritas)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE
            mascotas = VALUES(mascotas),
            categorias_favoritas = VALUES(categorias_favoritas),
            ultima_interaccion = NOW()`,
        [
            userId,
            JSON.stringify(data.mascotas || []),
            JSON.stringify(data.categorias_favoritas || [])
        ]
    );
};

// ── Productos (fuente de verdad anti-alucinación) ─────────────────
// La IA SOLO puede hablar de productos que salgan de esta consulta.
exports.searchProducts = async (query) => {
    const term = `%${query}%`;
    const [rows] = await db.query(
        `SELECT p.id_producto AS id, p.nombre, p.precio_venta AS precio,
                p.descripcion, p.stock_actual,
                IFNULL(p.imagen, '') AS imagen,
                c.nombre AS categoria
         FROM producto p
         LEFT JOIN categoria_producto c ON p.id_categoria = c.id_categoria
         WHERE (p.nombre LIKE ? OR p.descripcion LIKE ? OR c.nombre LIKE ?)
           AND p.estado = 'ACTIVO'
         LIMIT 5`,
        [term, term, term]
    );
    return rows;
};

// ── Stats para Admin (SOLO LECTURA — ninguna query de escritura) ──
exports.getAdminStats = async () => {
    const [[clientes]]    = await db.query(`SELECT COUNT(*) total FROM cliente`);
    const [[pendientes]]  = await db.query(`SELECT COUNT(*) total FROM pedido WHERE estado='PENDIENTE'`);
    const [[entregados]]  = await db.query(`SELECT COUNT(*) total FROM pedido WHERE estado='ENTREGADO'`);
    const [[productos]]   = await db.query(`SELECT COUNT(*) total FROM producto WHERE estado='ACTIVO'`);
    const [[stockBajo]]   = await db.query(`SELECT COUNT(*) total FROM producto WHERE stock_actual <= stock_minimo AND estado='ACTIVO'`);
    const [[ventasTotal]] = await db.query(`SELECT COALESCE(SUM(total),0) total FROM pedido WHERE estado IN ('PAGADO','ENVIADO','ENTREGADO')`);

    const [topVendidos] = await db.query(`
        SELECT p.nombre, SUM(dp.cantidad) AS total_vendido
        FROM detalle_pedido dp
        JOIN producto p  ON dp.id_producto = p.id_producto
        JOIN pedido   pe ON dp.id_pedido   = pe.id_pedido
        WHERE pe.estado IN ('PAGADO','ENVIADO','ENTREGADO')
        GROUP BY p.id_producto, p.nombre
        ORDER BY total_vendido DESC
        LIMIT 5
    `);

    const [productosStockBajo] = await db.query(`
        SELECT nombre, stock_actual, stock_minimo
        FROM producto
        WHERE stock_actual <= stock_minimo AND estado = 'ACTIVO'
        ORDER BY stock_actual ASC
        LIMIT 10
    `);

    const [porVencer] = await db.query(`
        SELECT nombre, DATE_FORMAT(fecha_vencimiento, '%d/%m/%Y') AS vence
        FROM producto
        WHERE fecha_vencimiento IS NOT NULL
          AND fecha_vencimiento BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 30 DAY)
          AND estado = 'ACTIVO'
        ORDER BY fecha_vencimiento ASC
        LIMIT 10
    `);

    return {
        totalClientes:       clientes.total,
        pedidosPendientes:   pendientes.total,
        pedidosEntregados:   entregados.total,
        productosActivos:    productos.total,
        productosStockBajo:  stockBajo.total,
        ventasTotales:       ventasTotal.total,
        topVendidos,
        detalleStockBajo:    productosStockBajo,
        proximosAVencer:     porVencer
    };
};
