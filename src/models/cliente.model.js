const db = require('../config/db');

exports.obtenerClientes = async () => {
    const [rows] = await db.query(`
        SELECT 
            p.id_persona,
            p.nombres,
            p.correo,
            p.telefono,
            c.numero_documento,
            c.fecha_registro
        FROM cliente c
        JOIN persona p ON c.id_persona = p.id_persona
        ORDER BY c.fecha_registro DESC
    `);
    return rows;
};