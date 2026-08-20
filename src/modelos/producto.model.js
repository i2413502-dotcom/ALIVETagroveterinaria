const db = require('../config/db');

// ── Catálogo paginado (listado) ─────────────────────────────────────
// Incluye la imagen principal y cuántas variantes tiene cada producto,
// sin traer TODAS las imágenes/variantes (eso es carga pesada, solo
// se trae completo en obtenerProductoPorId para la ficha de detalle).
// IDs de tipo_animal que tienen al menos un producto ACTIVO. Se usa en el
// catálogo público para no mostrar (ni en el filtro de grupo, ni de
// especie) animales sin productos disponibles.
exports.obtenerTiposAnimalConProductos = async () => {
    const [rows] = await db.query(
        `SELECT DISTINCT id_tipo_animal FROM producto WHERE estado = 'ACTIVO' AND id_tipo_animal IS NOT NULL`
    );
    return rows.map(r => r.id_tipo_animal);
};

exports.obtenerProductos = async (filtros = {}) => {
    const pagina = parseInt(filtros.pagina) || 1;
    const limite = parseInt(filtros.limite) || 20;
    const offset = (pagina - 1) * limite;

    // El catálogo público solo ve ACTIVO; el panel admin puede incluir inactivos
    const filtroEstado = filtros.incluirInactivos ? 'WHERE 1=1' : "WHERE p.estado = 'ACTIVO'";

    let sql = `
        SELECT p.id_producto, p.nombre, p.descripcion, p.precio_venta,
               p.stock_actual, p.stock_minimo, p.estado, p.codigo_barra,
               p.fecha_vencimiento, p.marca, p.peso_presentacion,
               p.ficha_tecnica, p.composicion, p.modo_uso, p.etapa_alimentacion, p.fecha_creacion,
               p.id_categoria, c.nombre AS categoria,
               p.id_subcategoria, sc.nombre AS subcategoria,
               p.id_tipo_animal, ta.nombre AS tipo_animal,
               COALESCE(img.url_imagen, p.imagen) AS imagen,
               (SELECT COUNT(*) FROM variante_producto v WHERE v.id_producto = p.id_producto) AS total_variantes
        FROM producto p
        LEFT JOIN categoria_producto c     ON p.id_categoria = c.id_categoria
        LEFT JOIN subcategoria_producto sc ON p.id_subcategoria = sc.id_subcategoria
        LEFT JOIN tipo_animal ta           ON p.id_tipo_animal = ta.id_tipo_animal
        LEFT JOIN imagen_producto img       ON img.id_producto = p.id_producto AND img.es_principal = 1
        ${filtroEstado}
    `;
    // El conteo no necesita los JOIN (los filtros son todos columnas directas de producto)
    let sqlCount = `SELECT COUNT(*) AS total FROM producto p ${filtroEstado}`;

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
    if (filtros.subcategoria) {
        sql      += ' AND p.id_subcategoria = ?';
        sqlCount += ' AND p.id_subcategoria = ?';
        params.push(filtros.subcategoria);
        paramsCount.push(filtros.subcategoria);
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
    // Filtro por grupo de animal (Mayor/Menor): trae productos de CUALQUIER
    // especie perteneciente a ese grupo. Se usa en el catálogo público, que
    // filtra primero por grupo antes de categoría/subcategoría.
    if (filtros.grupo_animal) {
        sql      += ' AND p.id_tipo_animal IN (SELECT id_tipo_animal FROM tipo_animal WHERE grupo = ?)';
        sqlCount += ' AND p.id_tipo_animal IN (SELECT id_tipo_animal FROM tipo_animal WHERE grupo = ?)';
        params.push(filtros.grupo_animal);
        paramsCount.push(filtros.grupo_animal);
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

// ── Ficha de detalle: producto + TODAS sus imágenes + TODAS sus variantes ──
exports.obtenerProductoPorId = async (id) => {
    const [rows] = await db.query(
        `SELECT p.*, c.nombre AS categoria, sc.nombre AS subcategoria, ta.nombre AS tipo_animal
         FROM producto p
         LEFT JOIN categoria_producto c     ON p.id_categoria = c.id_categoria
         LEFT JOIN subcategoria_producto sc ON p.id_subcategoria = sc.id_subcategoria
         LEFT JOIN tipo_animal ta           ON p.id_tipo_animal = ta.id_tipo_animal
         WHERE p.id_producto = ?`,
        [id]
    );
    const producto = rows[0];
    if (!producto) return null;

    const [imagenes] = await db.query(
        `SELECT id_imagen, url_imagen, es_principal, orden
         FROM imagen_producto WHERE id_producto = ?
         ORDER BY es_principal DESC, orden ASC`,
        [id]
    );

    const [variantes] = await db.query(
        `SELECT v.id_variante, v.sku, v.precio_venta, v.stock_actual, v.stock_minimo, v.estado,
                v.id_color, co.nombre AS color, co.codigo_hex,
                v.id_talla, tal.nombre AS talla,
                v.id_etapa_edad, ee.nombre AS etapa_edad,
                v.id_presentacion, pr.nombre AS presentacion
         FROM variante_producto v
         LEFT JOIN color co                    ON co.id_color = v.id_color
         LEFT JOIN talla tal                   ON tal.id_talla = v.id_talla
         LEFT JOIN etapa_edad_animal ee         ON ee.id_etapa_edad = v.id_etapa_edad
         LEFT JOIN presentacion_medicamento pr  ON pr.id_presentacion = v.id_presentacion
         WHERE v.id_producto = ?
         ORDER BY v.id_variante`,
        [id]
    );

    producto.imagenes  = imagenes;
    producto.variantes = variantes;
    // La columna vieja "imagen" casi siempre está NULL en productos
    // nuevos (ahora viven en imagen_producto). Si no hay valor legacy,
    // usamos la imagen marcada como principal (o la primera disponible).
    if (!producto.imagen) {
        const principal = imagenes.find(img => img.es_principal) || imagenes[0];
        producto.imagen = principal ? principal.url_imagen : null;
    }
    return producto;
};

// ── Crear producto ──────────────────────────────────────────────────
// NOTA: ya no recibe "imagen" (ahora vive en imagen_producto, ver
// imagen.model.js) ni "colores"/"tallas" (ahora viven en variante_producto,
// ver variante.model.js). Si el controlador recibe esos campos desde un
// formulario viejo, simplemente se ignoran aquí.
exports.crearProducto = async (data) => {
    const {
        nombre, descripcion, precio_venta,
        id_categoria, id_subcategoria, id_tipo_animal,
        stock_actual, stock_minimo, codigo_barra, fecha_vencimiento,
        marca, peso_presentacion,
        ficha_tecnica, composicion, modo_uso, etapa_alimentacion
    } = data;

    const [result] = await db.query(
        `INSERT INTO producto
         (nombre, descripcion, precio_venta, id_categoria, id_subcategoria,
          id_tipo_animal, stock_actual, stock_minimo, codigo_barra,
          fecha_vencimiento, marca, peso_presentacion,
          ficha_tecnica, composicion, modo_uso, etapa_alimentacion, estado, fecha_creacion)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVO', NOW())`,
        [
            nombre,
            descripcion       || null,
            precio_venta,
            id_categoria,
            id_subcategoria   || null,
            id_tipo_animal,
            stock_actual      || 0,
            stock_minimo      || 5,
            codigo_barra      || null,
            fecha_vencimiento || null,
            marca             || null,
            peso_presentacion || null,
            ficha_tecnica     || null,
            composicion       || null,
            modo_uso          || null,
            etapa_alimentacion || null
        ]
    );
    return result.insertId;
};

// ── Actualizar producto ─────────────────────────────────────────────
exports.actualizarProducto = async (id, data) => {
    const {
        nombre, descripcion, precio_venta, stock_actual,
        id_categoria, id_subcategoria, id_tipo_animal,
        codigo_barra, stock_minimo,
        marca, peso_presentacion,
        ficha_tecnica, composicion, modo_uso, fecha_vencimiento, etapa_alimentacion
    } = data;

    const [result] = await db.query(
        `UPDATE producto SET
            nombre            = ?,
            descripcion       = ?,
            precio_venta      = ?,
            stock_actual      = ?,
            stock_minimo      = ?,
            id_categoria      = ?,
            id_subcategoria   = ?,
            id_tipo_animal    = ?,
            codigo_barra      = ?,
            marca             = ?,
            peso_presentacion = ?,
            ficha_tecnica     = ?,
            composicion       = ?,
            modo_uso          = ?,
            fecha_vencimiento = ?,
            etapa_alimentacion = ?
         WHERE id_producto = ?`,
        [
            nombre,
            descripcion       || null,
            precio_venta,
            stock_actual,
            stock_minimo      || 5,
            id_categoria,
            id_subcategoria   || null,
            id_tipo_animal,
            codigo_barra      || null,
            marca             || null,
            peso_presentacion || null,
            ficha_tecnica     || null,
            composicion       || null,
            modo_uso          || null,
            fecha_vencimiento || null,
            etapa_alimentacion || null,
            id
        ]
    );
    return result;
};

// Estados (sin repetir) de todos los pedidos que contienen este producto.
// Se usa para decidir si el hard-delete puede proceder: solo se permite
// si TODOS los pedidos asociados ya están en estado ENTREGADO (o si no
// tiene ningún pedido asociado). Ver producto.controller.js → eliminar().
exports.obtenerEstadosPedidosAsociados = async (id) => {
    const [rows] = await db.query(
        `SELECT DISTINCT pe.estado
         FROM detalle_pedido dp
         JOIN pedido pe ON pe.id_pedido = dp.id_pedido
         WHERE dp.id_producto = ?`,
        [id]
    );
    return rows.map(r => r.estado);
};

// Borrado físico permanente en cascada, dentro de una transacción:
// 1) detalle_pedido del producto (solo se llega aquí si esos pedidos ya
//    fueron ENTREGADOS; el total/subtotal del pedido ya quedó registrado
//    en el pedido/comprobante, así que no se pierde el histórico de venta,
//    solo el detalle línea por línea de ESE producto puntual),
// 2) variante_producto del producto,
// 3) imagen_producto del producto (los archivos en R2 se borran aparte,
//    desde el controlador, antes de llamar a esta función),
// 4) el producto.
// El controlador es responsable de validar los estados de pedido ANTES
// de llamar a esta función (obtenerEstadosPedidosAsociados).
exports.eliminarProductoFisico = async (id) => {
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();
        await conn.query('DELETE FROM detalle_pedido WHERE id_producto = ?', [id]);
        await conn.query('DELETE FROM variante_producto WHERE id_producto = ?', [id]);
        await conn.query('DELETE FROM imagen_producto WHERE id_producto = ?', [id]);
        const [result] = await conn.query('DELETE FROM producto WHERE id_producto = ?', [id]);
        await conn.commit();
        return result;
    } catch (err) {
        await conn.rollback();
        throw err;
    } finally {
        conn.release();
    }
};

// Cambio de estado lógico ACTIVO/INACTIVO (activar/desactivar)
exports.cambiarEstadoProducto = async (id, estado) => {
    const [result] = await db.query('UPDATE producto SET estado = ? WHERE id_producto = ?', [estado, id]);
    return result;
};
