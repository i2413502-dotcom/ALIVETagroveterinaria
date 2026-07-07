// Orquestador de AgroBot: decide qué capa atiende según el rol.
//   INVITADO    → FAQ local (cero API)
//   CLIENTE     → IA con memoria + productos reales de BD
//   COLABORADOR → IA asistente de stats (solo lectura)
const faqService = require('./faq.service');
const productService = require('./product.service');
const memoryService = require('./memory.service');
const adminService = require('./admin.service');
const openrouter = require('./openrouter.service');
const iaModel = require('../models/ia.model');

// ── Constantes de respuesta ──────────────────────────────────────
const CONTACTO_ALIVET = process.env.ALIVET_CONTACTO ||
    '📱 WhatsApp: +51 925 920 419 | 📞 Teléfono: +51 925 920 419 | ✉️ atencion@alivet.pe';

const R_OFFTOPIC  = 'Solo puedo ayudarte con productos y servicios de ALIVET. 🐾';
const R_MEDICA    = `No puedo hacer diagnósticos ni recetar tratamientos. Comunícate con nuestro equipo veterinario:\n📱 WhatsApp: +51 925 920 419\n📞 Teléfono: +51 925 920 419\n✉️ atencion@alivet.pe`;
const R_SIN_INFO  = 'No encontré información disponible en este momento.';
const R_ERROR     = 'Ups, tuve un problema para responder. Por favor intenta de nuevo en unos segundos. 🙏';

// ── Detección de respuestas cacheadas (sin llamar a la IA) ───────
// Detecta solicitudes de diagnóstico/tratamiento o síntomas de enfermedad.
// NO cachea si la intención es de compra (ej. "tienen pastillas para perros").
const KW_OFFTOPIC = [
    'politica', 'política', 'gobierno', 'presidente', 'congreso',
    'programar', 'programacion', 'javascript', 'python', 'php', 'java',
    'matematica', 'matematicas', 'algebra', 'calculo',
    'historia', 'geografia', 'filosofia',
    'futbol', 'fútbol', 'basquet', 'beisbol',
    'pelicula', 'película', 'netflix', 'spotify', 'musica', 'música',
    'chiste', 'poema', 'broma', 'cancion', 'canción'
];

// Palabras de síntomas / diagnóstico / enfermedad
const KW_MEDICA = [
    // Solicitudes de diagnóstico
    'sintoma', 'sintomas', 'diagnostico', 'diagnosticar', 'diagnostica',
    'diagnostiqueme', 'diagnosticame', 'que enfermedad', 'que le pasa',
    'recetame', 'recétame', 'prescribeme', 'prescribir',
    // Estados graves
    'moribundo', 'agoniza', 'convulsiona', 'convulsion', 'se murio', 'se murió',
    // Síntomas físicos descriptivos (lo que cuenta el dueño)
    'dolor de cabeza', 'dolor de panza', 'dolor de estomago', 'dolor abdominal',
    'le duele', 'le duelen', 'le duele la cabeza', 'le duele el estomago',
    'cae su pelo', 'cae el pelo', 'pierde pelo', 'pierde su pelo', 'se le cae el pelo',
    'se le cayó el pelo', 'le cae el pelo', 'perdida de pelo', 'pérdida de pelo',
    'no come', 'no quiere comer', 'dejó de comer', 'dejo de comer',
    'vomita', 'vomitando', 'tiene vomito', 'tiene vómito',
    'tiene diarrea', 'hace diarrea', 'heces con sangre',
    'esta triste', 'está triste', 'muy decaido', 'muy decaído',
    'tiene fiebre', 'con fiebre', 'temperatura alta',
    'no puede caminar', 'cojea', 'cojeando', 'pata rota',
    'esta enfermo', 'está enfermo', 'esta enferma', 'está enferma',
    'le pasa algo', 'algo le pasa', 'se ve mal', 'se ve enfermo',
    'tiene tos', 'tosiendo', 'tiene mocos', 'ojos llorosos', 'ojos irritados',
    'rasca mucho', 'se rasca', 'tiene picazon', 'tiene picazón',
    'tiene herida', 'tiene una herida', 'esta sangrando', 'está sangrando',
    'infeccion', 'infección', 'parasito', 'parásito', 'pulgas'
];

// Normaliza sin tildes para comparación
const norm = (t) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

const detectarCache = (mensaje) => {
    const txt = norm(mensaje);
    if (KW_OFFTOPIC.some(k => txt.includes(norm(k)))) return 'OFFTOPIC';

    // Cachea médica SOLO si NO hay intención de compra
    const intentoCompra = /comprar|precio|cuanto|cuesta|tienen|venden|busco|hay\b|stock|producto/.test(txt);
    if (!intentoCompra && KW_MEDICA.some(k => txt.includes(norm(k)))) return 'MEDICA';
    return null;
};

// ── Mapa de páginas para contexto situacional ────────────────────
const CONTEXTOS_PAGINA = {
    '/':                    'Catálogo principal de productos',
    '/index.html':          'Catálogo principal de productos',
    '/carrito.html':        'Carrito de compras — el usuario revisa cantidades antes de continuar',
    '/envio.html':          'Dirección de envío — ingresando datos de entrega',
    '/comprobante.html':    'Comprobante — elige boleta (B001) o factura (F001, requiere RUC). IGV 18% incluido',
    '/pago.html':           'Pago con Yape — debe ingresar el código de operación Yape (6+ dígitos)',
    '/confirmacion.html':   'Pedido confirmado — pendiente de validación',
    '/detalleproducto.html':'Ficha de producto — puede ver detalles y agregar al carrito',
    '/perfil.html':         'Perfil del cliente — historial de pedidos y datos personales',
    '/login.html':          'Inicio de sesión',
    '/registro.html':       'Registro de cuenta nueva',
    '/recuperar.html':      'Recuperación de contraseña',
};

const contextoDeUrl = (pathname) => {
    if (!pathname) return null;
    return CONTEXTOS_PAGINA[pathname.split('?')[0].split('#')[0]] || null;
};

// ── Prompt del sistema ───────────────────────────────────────────
const systemPrompt = (contacto) =>
`Eres AgroBot, asistente de ventas de Agroveterinaria ALIVET (Perú).

REGLAS ESTRICTAS:
1. Solo hablas de ALIVET (productos, precios, proceso de compra). Otro tema → solo di: "Solo puedo ayudarte con productos y servicios de ALIVET. 🐾"
2. Usa ÚNICAMENTE los productos de [RESULTADOS_BD]. No inventes nombres, precios ni stock.
   - Si dice "(ninguno)" → "No tenemos ese producto disponible actualmente."
   - Si hay resultados → muestra máximo 3. Formato: nombre, precio S/ y stock.
3. SÍNTOMAS Y ENFERMEDADES: Si el cliente describe síntomas de su animal (dolor, vómito, diarrea, pelo que cae, fiebre, no come, etc.) → NO intentes ayudar médicamente. Responde EXACTAMENTE: "No puedo hacer diagnósticos. Comunícate con nuestro equipo:\n📱 WhatsApp: +51 925 920 419\n✉️ atencion@alivet.pe"
4. MEDICAMENTOS DEL CATÁLOGO: Si piden "medicamentos para gatos", "pastillas para perros", "desparasitante", etc. (intención de compra, NO síntoma) → busca en [RESULTADOS_BD] y muéstralos normalmente.
5. Proceso de compra: carrito → dirección → comprobante (boleta/factura) → pago Yape.
6. RESPUESTAS CORTAS: máximo 60 palabras. Sin introducciones. Directo al punto. Usa viñetas solo si listas productos.`.trim();

// ── Formateadores ─────────────────────────────────────────────────
const formatearResultados = (productos) => {
    if (!productos.length) return '[RESULTADOS_BD]\n(ninguno)';
    const lineas = productos.slice(0, 3).map(p =>
        `- ${p.nombre} | S/ ${Number(p.precio).toFixed(2)} | Stock: ${p.stock_actual}` +
        (p.categoria ? ` | ${p.categoria}` : '')
    );
    return '[RESULTADOS_BD]\n' + lineas.join('\n');
};

const formatearMemoria = (ctx) => {
    if (!ctx) return '';
    const partes = [];
    if (ctx.mascotas?.length) {
        partes.push('Mascotas: ' + ctx.mascotas.map(m => m.raza ? `${m.tipo}(${m.raza})` : m.tipo).join(', '));
    }
    if (ctx.categorias_favoritas?.length) {
        partes.push('Le interesan: ' + ctx.categorias_favoritas.join(', '));
    }
    return partes.length ? '[CLIENTE]\n' + partes.join(' | ') : '';
};

// ── Capa 1: Invitado (FAQ local, cero API) ───────────────────────
const responderInvitado = (mensaje, faqId) => {
    if (faqId) return faqService.respuestaPorId(faqId);
    return faqService.buscarRespuesta(mensaje);
};

// ── Capa 2: Cliente (IA + historial + productos reales) ──────────
const responderCliente = async (userId, mensaje, paginaActual) => {
    // Datos en paralelo: memoria, productos e historial reciente
    const [contexto, productos, historial] = await Promise.all([
        memoryService.obtenerContexto(userId),
        productService.buscarProductos(mensaje),
        iaModel.getHistory(userId, 4) // últimos 4 intercambios para contexto
    ]);

    // Construir system prompt compacto
    const secciones = [
        systemPrompt(CONTACTO_ALIVET),
        formatearMemoria(contexto),
        formatearResultados(productos)
    ];
    const ctxPagina = contextoDeUrl(paginaActual);
    if (ctxPagina) secciones.push(`[PÁGINA]\n${ctxPagina}`);

    // Armar mensajes: system + historial (máx 4 intercambios) + mensaje actual
    const mensajes = [
        { role: 'system', content: secciones.filter(Boolean).join('\n\n') },
        ...historial.flatMap(h => [
            { role: 'user',      content: h.mensaje_usuario },
            { role: 'assistant', content: h.respuesta_ia    }
        ]),
        { role: 'user', content: mensaje }
    ];

    const respuesta = await openrouter.chat(mensajes);

    memoryService.actualizarMemoria(userId, mensaje, productos)
        .catch(err => console.error('Memoria no actualizada:', err.message));

    return { respuesta, productos };
};

// ── Capa 3: Admin (stats de solo lectura) ────────────────────────
const responderAdmin = async (mensaje, paginaActual) => {
    const stats = await adminService.obtenerStats();
    const ctxPagina = contextoDeUrl(paginaActual);

    const secciones = [
        systemPrompt(CONTACTO_ALIVET),
        `[MODO ADMIN — SOLO LECTURA]\nPuedes responder sobre las estadísticas de abajo. NUNCA ejecutas acciones (no eliminas, no editas). Si piden modificar algo: "Las acciones se realizan desde el panel de administración."`,
        `[ESTADÍSTICAS]\n${adminService.statsComoTexto(stats)}`
    ];
    if (ctxPagina) secciones.push(`[PÁGINA]\n${ctxPagina}`);

    return openrouter.chat([
        { role: 'system', content: secciones.filter(Boolean).join('\n\n') },
        { role: 'user',   content: mensaje }
    ]);
};

// ── Punto de entrada único ───────────────────────────────────────
exports.procesarMensaje = async ({ userId, rol, mensaje, faqId, paginaActual }) => {
    // Invitados: FAQ local, sin API ni BD de productos
    if (!userId) {
        return { respuesta: responderInvitado(mensaje, faqId), capa: 'FAQ', productos: [] };
    }

    // Respuestas cacheadas: detectar antes de llamar a la IA (ahorra tokens + latencia)
    if (mensaje) {
        const cache = detectarCache(mensaje);
        if (cache === 'OFFTOPIC') return { respuesta: R_OFFTOPIC,  capa: 'CACHE', productos: [] };
        if (cache === 'MEDICA')   return { respuesta: R_MEDICA,    capa: 'CACHE', productos: [] };
    }

    try {
        let respuesta, productos = [];

        if (rol === 'COLABORADOR') {
            respuesta = await responderAdmin(mensaje, paginaActual);
        } else {
            const resultado = await responderCliente(userId, mensaje, paginaActual);
            respuesta = resultado.respuesta;
            productos = resultado.productos;
        }

        iaModel.saveMessage(userId, rol, mensaje, respuesta)
            .catch(err => console.error('Historial no guardado:', err.message));

        return { respuesta, productos, capa: rol === 'COLABORADOR' ? 'ADMIN' : 'CLIENTE' };

    } catch (err) {
        console.error('[AgroBot] Error procesando mensaje:', err.message);
        return { respuesta: R_ERROR, capa: 'ERROR', productos: [] };
     }
};

exports.obtenerHistorial = (userId) => iaModel.getHistory(userId);
exports.listarFaqs       = () => faqService.listarPreguntas();
