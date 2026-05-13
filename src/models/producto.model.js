const db = require('../config/db');

exports.obtenerProductos = async (filtros = {}) => {
    const pagina   = parseInt(filtros.pagina)  || 1;
    const limite   = parseInt(filtros.limite)  || 20;
    const offset   = (pagina - 1) * limite;

    let sql = `
        SELECT p.*, c.nombre AS categoria, ta.nombre AS tipo_animal
        FROM producto p
        LEFT JOIN categoria_producto c ON p.id_categoria = c.id_categoria
        LEFT JOIN tipo_animal ta ON p.id_tipo_animal = ta.id_tipo_animal
        WHERE p.estado = 'ACTIVO'
    `;
    let sqlCount = `
        SELECT COUNT(*) AS total
        FROM producto p
        LEFT JOIN categoria_producto c ON p.id_categoria = c.id_categoria
        LEFT JOIN tipo_animal ta ON p.id_tipo_animal = ta.id_tipo_animal
        WHERE p.estado = 'ACTIVO'
    `;
    const params = [];
    const paramsCount = [];

    if (filtros.nombre) {
        sql      += ' AND p.nombre LIKE ?';
        sqlCount += ' AND p.nombre LIKE ?';
        params.push(`%${filtros.nombre}%`);
        paramsCount.push(`%${filtros.nombre}%`);
    }
    if (filtros.categoria) {
        sql      += ' AND p.id_categoria = ?';
        sqlCount += ' AND p.id_categoria = ?';
        params.push(filtros.categoria);
        paramsCount.push(filtros.categoria);
    }
    if (filtros.precio_min) {
        sql      += ' AND p.precio_venta >= ?';
        sqlCount += ' AND p.precio_venta >= ?';
        params.push(filtros.precio_min);
        paramsCount.push(filtros.precio_min);
    }
    if (filtros.precio_max) {
        sql      += ' AND p.precio_venta <= ?';
        sqlCount += ' AND p.precio_venta <= ?';
        params.push(filtros.precio_max);
        paramsCount.push(filtros.precio_max);
    }
    if (filtros.id_tipo_animal) {
        sql      += ' AND p.id_tipo_animal = ?';
        sqlCount += ' AND p.id_tipo_animal = ?';
        params.push(filtros.id_tipo_animal);
        paramsCount.push(filtros.id_tipo_animal);
    }

    sql += ' ORDER BY p.fecha_creacion DESC LIMIT ? OFFSET ?';
    params.push(limite, offset);

    const [rows]  = await db.query(sql, params);
    const [count] = await db.query(sqlCount, paramsCount);

    return {
        productos:    rows,
        total:        count[0].total,
        pagina,
        limite,
        totalPaginas: Math.ceil(count[0].total / limite)
    };
};

exports.obtenerProductoPorId = async (id) => {
    const [rows] = await db.query(
        `SELECT p.*, c.nombre AS categoria, ta.nombre AS tipo_animal
         FROM producto p
         LEFT JOIN categoria_producto c ON p.id_categoria = c.id_categoria
         LEFT JOIN tipo_animal ta ON p.id_tipo_animal = ta.id_tipo_animal
         WHERE p.id_producto = ?`,
        [id]
    );
    return rows[0];
};

exports.crearProducto = async (data) => {
    const {
        nombre, descripcion, imagen, precio_venta,
        id_categoria, id_tipo_animal, stock_actual,
        stock_minimo, codigo_barra, fecha_vencimiento,
        // ✅ FIX: nombre correcto del campo
        marca, peso_presentacion, colores, tallas,
        ficha_tecnica, composicion, modo_uso
    } = data;

    const [result] = await db.query(
        `INSERT INTO producto
         (nombre, descripcion, imagen, precio_venta, id_categoria,
          id_tipo_animal, stock_actual, stock_minimo, codigo_barra,
          fecha_vencimiento, marca, peso_presentacion, colores, tallas,
          ficha_tecnica, composicion, modo_uso, estado, fecha_creacion)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVO', NOW())`,
        [
            nombre,
            descripcion       || null,
            imagen            || null,
            precio_venta,
            id_categoria,
            id_tipo_animal,
            stock_actual,
            stock_minimo      || 5,
            codigo_barra      || null,
            fecha_vencimiento || null,
            marca             || null,
            peso_presentacion || null,
            colores           || null,
            tallas            || null,
            ficha_tecnica     || null,
            composicion       || null,
            modo_uso          || null
        ]
    );
    return result;
};

exports.actualizarProducto = async (id, data) => {
    const {
        nombre, descripcion, precio_venta, stock_actual,
        id_categoria, id_tipo_animal, imagen,
        // ✅ FIX: se agregan codigo_barra y stock_minimo que faltaban
        codigo_barra, stock_minimo,
        marca, peso_presentacion, colores, tallas,
        ficha_tecnica, composicion, modo_uso, fecha_vencimiento
    } = data;

    const [result] = await db.query(
        `UPDATE producto SET
            nombre            = ?,
            descripcion       = ?,
            precio_venta      = ?,
            stock_actual      = ?,
            stock_minimo      = ?,
            id_categoria      = ?,
            id_tipo_animal    = ?,
            imagen            = COALESCE(NULLIF(?, ''), imagen),
            codigo_barra      = ?,
            marca             = ?,
            peso_presentacion = ?,
            colores           = ?,
            tallas            = ?,
            ficha_tecnica     = ?,
            composicion       = ?,
            modo_uso          = ?,
            fecha_vencimiento = ?
         WHERE id_producto = ?`,
        [
            nombre,
            descripcion       || null,
            precio_venta,
            stock_actual,
            // ✅ FIX: nombre correcto del campo presentacion
            stock_minimo      || 5,
            id_categoria,
            id_tipo_animal,
            imagen            || '',
            codigo_barra      || null,
            marca             || null,
            peso_presentacion || null,
            colores           || null,
            tallas            || null,
            ficha_tecnica     || null,
            composicion       || null,
            modo_uso          || null,
            fecha_vencimiento || null,
            id
        ]
    );
    return result;
};

exports.eliminarProducto = async (id) => {
    await db.query(
        "UPDATE producto SET estado='INACTIVO' WHERE id_producto = ?",
        [id]
    );
};