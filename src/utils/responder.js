// Helper para no repetir en cada controlador el mismo patrón de
// "console.error(...) + res.status(x).json({ mensaje })".
//
// Importante: esto NO cambia ningún mensaje, código de estado ni forma de
// las respuestas JSON que ya existían. Cada controlador sigue eligiendo
// exactamente el texto y el status que quiere devolver; esta función solo
// evita repetir las 2-3 líneas siempre iguales. Como el contrato de la API
// (rutas, status codes, forma del JSON) no cambia, la app móvil y la web
// no se ven afectadas.
//
// Uso típico:
//   } catch (err) {
//       return error(res, 500, 'Error al obtener productos', err, 'Error en listar productos:');
//   }
//
// Equivale exactamente a lo que había antes:
//   } catch (err) {
//       console.error('Error en listar productos:', err);
//       res.status(500).json({ mensaje: 'Error al obtener productos' });
//   }
function error(res, codigo, mensaje, err, contexto) {
    if (err) console.error(contexto || mensaje, err);
    return res.status(codigo).json({ mensaje });
}

module.exports = { error };
