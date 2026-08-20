const db = require('../config/db');

exports.obtenerClientes = async () => {
    const [rows] = await db.query(`
        SELECT 
            p.id_persona,
            p.nombres,
            p.correo,
            p.telefono,
            p.estado,
            c.numero_documento,
            c.fecha_registro
        FROM cliente c
        JOIN persona p ON c.id_persona = p.id_persona
        ORDER BY c.fecha_registro DESC
    `);
    return rows;
};

// Activar/desactivar cliente. Se guarda en persona.estado (compartida con
// login) y NO se permite el borrado físico: el cliente puede tener
// pedidos y comprobantes emitidos a SUNAT que deben conservar su
// referencia — desactivar simplemente le impide iniciar sesión y hacer
// nuevos pedidos, sin perder su historial.
exports.cambiarEstado = async (idPersona, estado) => {
    const [result] = await db.query(
        'UPDATE persona SET estado = ? WHERE id_persona = ?',
        [estado, idPersona]
    );
    return result;
};