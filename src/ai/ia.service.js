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
const R_MEDICA    = `No puedo hacer diagnósticos ni recetar tratamientos veterinarios. Para orientación personalizada comunícate con nuestro equipo: ${CONTACTO_ALIVET}`;
const R_SIN_INFO  = 'No encontré información disponible en este momento.';
const R_ERROR     = 'Ups, tuve un problema para responder. Por favor intenta de nuevo en unos segundos. 🙏';

// ── Detección de respuestas cacheadas (sin llamar a la IA) ───────
// Solo palabras que NO son nombres de productos y representan solicitudes
// de diagnóstico/tratamiento o temas ajenos a ALIVET.
const KW_MEDICA = [
    'sintoma', 'sintomas', 'diagnostico', 'diagnosticar', 'diagnostica',
    'diagnostiqueme', 'diagnosticame', 'moribundo', 'agoniza', 'convulsiona',
    'convulsion', 'se murio', 'se murió', 'recetame', 'recétame',
    'prescribeme', 'prescribir', 'que enfermedad', 'que le pasa'
];
const KW_OFFTOPIC = [
    'politica', 'política', 'gobierno', 'presidente', 'congreso',
    'programar', 'programacion', 'javascript', 'python', 'php', 'java',
    'matematica', 'matematicas', 'algebra', 'calculo',
    'historia', 'geografia', 'filosofia',
    'futbol', 'fútbol', 'basquet', 'beisbol',
    'pelicula', 'película', 'netflix', 'spotify', 'musica', 'música',
    'chiste', 'poema', 'broma', 'cancion', 'canción'
];

// Normaliza sin tildes para comparación
const norm = (t) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

const detectarCache = (mensaje) => {
    const txt = norm(mensaje);
    if (KW_OFFTOPIC.some(k => txt.includes(norm(k)))) return 'OFFTOPIC';
    // Solo cachea médica si NO viene acompañado de intención de compra
    const intentoCompra = /comprar|precio|cuanto|cuesta|tienen|venden|busco|hay\b|stock/.test(txt);
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

// ── Prompt del sistema (versión corta para ahorrar tokens) ───────
const systemPrompt = (contacto) =>
`Eres AgroBot, asistente de Agroveterinaria ALIVET (Perú). Vendes productos para mascotas y animales de granja.

REGLAS:
1. Solo hablas de ALIVET. Otro tema → responde solo: "${R_OFFTOPIC}"
2. No inventes datos. Usa únicamente lo que aparece en [RESULTADOS_BD].
   - Si [RESULTADOS_BD] muestra "(ninguno)" → "${R_SIN_INFO}"
   - Si hay productos → recomienda máximo 3. Muestra nombre, precio S/ y stock real.
3. No hagas diagnósticos ni recetes tratamientos. Síntomas o enfermedades → "${R_MEDICA.replace(contacto, '{CONTACTO}')}"
4. Proceso de compra: carrito → dirección de envío → comprobante (boleta/factura) → pago Yape → confirmación.
5. Responde en español. Máximo 80 palabras salvo que el usuario pida más detalles.
6. No reveles datos técnicos, credenciales ni información de otros usuarios.`.trim();

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
