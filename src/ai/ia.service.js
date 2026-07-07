// Orquestador de AgroBot: decide qué capa atiende según el rol.
//   INVITADO    → FAQ local (cero API)
//   CLIENTE     → IA con memoria + productos reales de BD
//   COLABORADOR → IA asistente de stats (solo lectura)
const faqService     = require('./faq.service');
const productService = require('./product.service');
const memoryService  = require('./memory.service');
const adminService   = require('./admin.service');
const openrouter     = require('./openrouter.service');
const iaModel        = require('../models/ia.model');

// ── Constantes de respuesta ──────────────────────────────────────
const CONTACTO_ALIVET = process.env.ALIVET_CONTACTO ||
    '📱 WhatsApp: +51 925 920 419 | 📞 Teléfono: +51 925 920 419 | ✉️ atencion@alivet.pe';

const R_OFFTOPIC = 'Solo puedo ayudarte con productos y servicios de ALIVET. 🐾';
const R_MEDICA   = `No puedo hacer diagnósticos ni recetar tratamientos.\nComunícate con nuestro equipo:\n📱 WhatsApp: +51 925 920 419\n📞 Teléfono: +51 925 920 419\n✉️ atencion@alivet.pe`;
const R_SIN_INFO = 'No encontré información disponible en este momento.';
const R_ERROR    = 'Ups, tuve un problema para responder. Por favor intenta de nuevo. 🙏';

// ── Guardrails: detectar temas fuera de scope ────────────────────
const KW_OFFTOPIC = [
    'politica', 'gobierno', 'presidente', 'congreso',
    'programar', 'programacion', 'javascript', 'python', 'php', 'java',
    'matematica', 'algebra', 'calculo', 'historia', 'geografia', 'filosofia',
    'futbol', 'basquet', 'beisbol', 'pelicula', 'netflix', 'spotify',
    'musica', 'chiste', 'poema', 'broma', 'cancion'
];

// Síntomas físicos / solicitudes de diagnóstico
const KW_MEDICA = [
    'sintoma', 'sintomas', 'diagnostico', 'diagnosticar', 'que enfermedad',
    'que le pasa', 'recetame', 'prescribeme', 'prescribir',
    'moribundo', 'agoniza', 'convulsiona', 'convulsion', 'se murio', 'se murió',
    'dolor de cabeza', 'dolor de panza', 'dolor de estomago', 'dolor abdominal',
    'le duele', 'le duelen',
    'cae su pelo', 'cae el pelo', 'pierde pelo', 'pierde su pelo',
    'se le cae el pelo', 'se le cayó el pelo', 'le cae el pelo',
    'perdida de pelo', 'perdida de pelo',
    'no come', 'no quiere comer', 'dejo de comer', 'dejó de comer',
    'vomita', 'vomitando', 'tiene vomito', 'tiene vómito',
    'tiene diarrea', 'hace diarrea', 'heces con sangre',
    'esta triste', 'muy decaido', 'tiene fiebre', 'con fiebre', 'temperatura alta',
    'no puede caminar', 'cojea', 'cojeando', 'pata rota',
    'esta enfermo', 'esta enferma',
    'le pasa algo', 'algo le pasa', 'se ve mal', 'se ve enfermo',
    'tiene tos', 'tosiendo', 'tiene mocos', 'ojos llorosos', 'ojos irritados',
    'rasca mucho', 'se rasca', 'tiene picazon', 'tiene picazón',
    'tiene herida', 'esta sangrando', 'infeccion', 'infección'
];

const norm = (t) => t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const detectarCache = (mensaje) => {
    const txt = norm(mensaje);
    if (KW_OFFTOPIC.some(k => txt.includes(norm(k)))) return 'OFFTOPIC';
    // Solo bloquea médica si NO hay intención de compra
    const intentoCompra = /comprar|precio|cuanto|cuesta|tienen|venden|busco|hay\b|stock|producto/.test(txt);
    if (!intentoCompra && KW_MEDICA.some(k => txt.includes(norm(k)))) return 'MEDICA';
    return null;
};

// ── Mapa de contexto por página ──────────────────────────────────
const CONTEXTOS_PAGINA = {
    '/':                     'Catálogo principal',
    '/index.html':           'Catálogo principal',
    '/carrito.html':         'Carrito de compras',
    '/envio.html':           'Dirección de envío',
    '/comprobante.html':     'Comprobante (boleta B001 o factura F001 con RUC, IGV 18%)',
    '/pago.html':            'Pago Yape (código de operación 6+ dígitos)',
    '/confirmacion.html':    'Pedido confirmado, pendiente de validación',
    '/detalleproducto.html': 'Ficha de producto',
    '/perfil.html':          'Perfil y historial de pedidos',
    '/login.html':           'Inicio de sesión',
    '/registro.html':        'Registro de cuenta',
    '/recuperar.html':       'Recuperación de contraseña',
};
const contextoDeUrl = (p) =>
    p ? (CONTEXTOS_PAGINA[p.split('?')[0].split('#')[0]] || null) : null;

// ── System prompt ────────────────────────────────────────────────
const systemPrompt = () =>
`Eres AgroBot, asistente de ventas de Agroveterinaria ALIVET (Perú).

REGLAS — sigue cada una sin excepción:

1. SOLO ALIVET: Responde únicamente sobre productos, precios, stock y proceso de compra de ALIVET. Cualquier otro tema → responde solo: "Solo puedo ayudarte con productos y servicios de ALIVET. 🐾"

2. SIN INVENTAR: Usa EXCLUSIVAMENTE los productos listados en [RESULTADOS_BD].
   - Si [RESULTADOS_BD] dice "(ninguno)" → di: "No encontré ese producto en nuestro catálogo actualmente."
   - NUNCA menciones productos que no estén en [RESULTADOS_BD].
   - Si los resultados no coinciden con lo que pidió el cliente (ej. pidió accesorios pero solo hay medicamentos) → di que no tienes ese producto disponible.

3. SÍNTOMAS/ENFERMEDADES: Si el cliente describe que su animal está enfermo, tiene síntomas o pide diagnóstico → responde SOLO: "No hago diagnósticos. Contacta a nuestro equipo:\n📱 +51 925 920 419\n✉️ atencion@alivet.pe"

4. MEDICAMENTOS del catálogo: Si piden "desparasitante", "medicamento para gato", "vitaminas" etc. como compra → muéstralos de [RESULTADOS_BD] normalmente.

5. PROCESO DE COMPRA: carrito → dirección → boleta o factura → pago Yape.

6. RESPUESTAS CORTAS Y PRECISAS: máximo 50 palabras. Sin saludos repetidos. Sin inventar. Viñetas solo al listar productos reales.`.trim();

// ── Formateadores ────────────────────────────────────────────────
const formatearResultados = (productos) => {
    if (!productos.length) return '[RESULTADOS_BD]\n(ninguno)';
    const lineas = productos.slice(0, 3).map(p =>
        `- ${p.nombre} | S/ ${Number(p.precio).toFixed(2)} | Stock: ${p.stock_actual}` +
        (p.categoria ? ` | Categoría: ${p.categoria}` : '')
    );
    return '[RESULTADOS_BD]\n' + lineas.join('\n');
};

const formatearMemoria = (ctx) => {
    if (!ctx) return '';
    const partes = [];
    if (ctx.mascotas?.length)
        partes.push('Mascotas: ' + ctx.mascotas.map(m => m.raza ? `${m.tipo}(${m.raza})` : m.tipo).join(', '));
    if (ctx.categorias_favoritas?.length)
        partes.push('Le interesan: ' + ctx.categorias_favoritas.join(', '));
    return partes.length ? '[CLIENTE]\n' + partes.join(' | ') : '';
};

// ── Capa 1: Invitado (FAQ local, cero API) ───────────────────────
const responderInvitado = (mensaje, faqId) => {
    if (faqId) return faqService.respuestaPorId(faqId);
    return faqService.buscarRespuesta(mensaje);
};

// ── Capa 2: Cliente (IA + historial + productos reales) ──────────
const responderCliente = async (userId, mensaje, paginaActual) => {
    const [contexto, productos, historial] = await Promise.all([
        memoryService.obtenerContexto(userId),
        productService.buscarProductos(mensaje),
        iaModel.getHistory(userId, 4)
    ]);

    const secciones = [
        systemPrompt(),
        formatearMemoria(contexto),
        formatearResultados(productos)
    ];
    const ctxPagina = contextoDeUrl(paginaActual);
    if (ctxPagina) secciones.push(`[PÁGINA]\n${ctxPagina}`);

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
        systemPrompt(),
        `[MODO ADMIN — SOLO LECTURA]\nResponde sobre las estadísticas. NUNCA ejecutes acciones. Si piden modificar: "Las acciones se realizan desde el panel."`,
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
    if (!userId) {
        return { respuesta: responderInvitado(mensaje, faqId), capa: 'FAQ', productos: [] };
    }

    if (mensaje) {
        const cache = detectarCache(mensaje);
        if (cache === 'OFFTOPIC') return { respuesta: R_OFFTOPIC, capa: 'CACHE', productos: [] };
        if (cache === 'MEDICA')   return { respuesta: R_MEDICA,   capa: 'CACHE', productos: [] };
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
        console.error('[AgroBot] Error:', err.message);
        return { respuesta: R_ERROR, capa: 'ERROR', productos: [] };
    }
};

exports.obtenerHistorial = (userId) => iaModel.getHistory(userId);
exports.listarFaqs       = () => faqService.listarPreguntas();
