// ═══════════════════════════════════════════════════════════════
// AgroBot — Widget de chat flotante de Agroveterinaria ALIVET
// Se inyecta automáticamente en todas las páginas desde app.js.
// Vanilla JS, sin dependencias. Detecta el rol desde el JWT.
// ═══════════════════════════════════════════════════════════════
(function () {
    'use strict';

    if (document.getElementById('agrobot-burbuja')) return;

    // ── Detección de rol desde el JWT en localStorage ────────────
    const obtenerSesion = () => {
        const token = localStorage.getItem('token');
        if (!token) return { token: null, rol: 'INVITADO' };
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            if (payload.exp && payload.exp * 1000 < Date.now()) {
                return { token: null, rol: 'INVITADO' };
            }
            return { token, rol: payload.rol || 'CLIENTE' };
        } catch (e) {
            return { token: null, rol: 'INVITADO' };
        }
    };

    // ── Estilos ──────────────────────────────────────────────────
    const estilos = document.createElement('style');
    estilos.textContent = `
        #agrobot-burbuja {
            position: fixed; bottom: 20px; right: 20px; z-index: 9999;
            width: 60px; height: 60px; border-radius: 50%;
            background: #2e7d32; color: #fff; border: none; cursor: pointer;
            font-size: 28px; box-shadow: 0 4px 14px rgba(0,0,0,.3);
            display: flex; align-items: center; justify-content: center;
            transition: transform .2s ease;
        }
        #agrobot-burbuja:hover { transform: scale(1.1); }
        #agrobot-panel {
            position: fixed; bottom: 92px; right: 20px; z-index: 9999;
            width: 340px; max-width: calc(100vw - 40px); height: 500px;
            background: #fff; border-radius: 16px; display: none;
            flex-direction: column; overflow: hidden;
            box-shadow: 0 8px 30px rgba(0,0,0,.25);
            font-family: system-ui, -apple-system, sans-serif;
        }
        #agrobot-panel.abierto { display: flex; }
        .agrobot-header {
            background: linear-gradient(135deg,#2e7d32,#388e3c);
            color: #fff; padding: 12px 16px;
            font-weight: 600; display: flex; justify-content: space-between;
            align-items: center;
        }
        .agrobot-header-left { display:flex; align-items:center; gap:8px; }
        .agrobot-avatar {
            width:32px; height:32px; border-radius:50%;
            background:rgba(255,255,255,.2);
            display:flex; align-items:center; justify-content:center; font-size:18px;
        }
        .agrobot-titulo { font-size:14px; font-weight:700; }
        .agrobot-subtitulo { font-size:11px; font-weight:400; opacity:.85; }
        .agrobot-cerrar { background:none; border:none; color:#fff; font-size:20px; cursor:pointer; padding:4px 8px; border-radius:6px; }
        .agrobot-cerrar:hover { background:rgba(255,255,255,.15); }
        .agrobot-mensajes {
            flex: 1; overflow-y: auto; padding: 12px;
            background: #f4f7f4; display: flex; flex-direction: column; gap: 8px;
        }
        .agrobot-msg {
            max-width: 88%; padding: 9px 13px; border-radius: 14px;
            font-size: 13.5px; line-height: 1.5; white-space: pre-wrap;
            word-wrap: break-word;
        }
        .agrobot-msg.usuario {
            align-self: flex-end; background: #2e7d32; color: #fff;
            border-bottom-right-radius: 4px;
        }
        .agrobot-msg.bot {
            align-self: flex-start; background: #fff; color: #222;
            border: 1px solid #e0e6e0; border-bottom-left-radius: 4px;
        }
        .agrobot-msg.escribiendo { font-style: italic; color: #777; background:#fff; border:1px solid #e0e6e0; }
        .agrobot-chips { display: flex; flex-wrap: wrap; gap: 6px; padding: 2px 0; }
        .agrobot-chip {
            background: #e8f3e8; color: #2e7d32; border: 1px solid #bcd9bc;
            border-radius: 14px; padding: 5px 11px; font-size: 12px;
            cursor: pointer; transition: background .15s;
        }
        .agrobot-chip:hover { background: #c8e6c9; }
        .agrobot-input-zona {
            display: flex; gap: 8px; padding: 10px 12px;
            border-top: 1px solid #e5e5e5; background: #fff;
        }
        .agrobot-input-zona input {
            flex: 1; border: 1px solid #ccc; border-radius: 20px;
            padding: 8px 14px; font-size: 13.5px; outline: none;
        }
        .agrobot-input-zona input:focus { border-color: #2e7d32; }
        .agrobot-input-zona button {
            background: #2e7d32; color: #fff; border: none; border-radius: 50%;
            width: 38px; height: 38px; cursor: pointer; font-size: 16px;
            flex-shrink: 0;
        }
        .agrobot-input-zona button:disabled { opacity: .45; cursor: default; }

        /* ── Tarjetas de producto ─────────────────────────────── */
        .agrobot-productos {
            align-self: flex-start;
            display: flex; flex-direction: column; gap: 7px;
            width: 100%; max-width: 300px;
        }
        .agrobot-prod-card {
            display: flex; align-items: center; gap: 10px;
            background: #fff; border: 1px solid #dde8dd;
            border-radius: 12px; padding: 8px 10px;
            text-decoration: none; color: inherit;
            transition: border-color .2s, box-shadow .2s;
            cursor: pointer;
        }
        .agrobot-prod-card:hover {
            border-color: #2e7d32;
            box-shadow: 0 3px 10px rgba(46,125,50,.15);
        }
        .agrobot-prod-img {
            width: 52px; height: 52px; object-fit: cover;
            border-radius: 8px; flex-shrink: 0; background: #f0f4f0;
        }
        .agrobot-prod-info { flex: 1; min-width: 0; }
        .agrobot-prod-nombre {
            font-size: 12.5px; font-weight: 600; color: #1b5e20;
            margin-bottom: 2px; white-space: nowrap;
            overflow: hidden; text-overflow: ellipsis;
        }
        .agrobot-prod-precio {
            font-size: 13.5px; font-weight: 700; color: #2e7d32; margin-bottom: 2px;
        }
        .agrobot-prod-stock { font-size: 11px; }
    `;
    document.head.appendChild(estilos);

    // ── Estructura HTML ──────────────────────────────────────────
    const burbuja = document.createElement('button');
    burbuja.id = 'agrobot-burbuja';
    burbuja.title = 'Chatea con AgroBot';
    burbuja.textContent = '🐾';

    const panel = document.createElement('div');
    panel.id = 'agrobot-panel';
    panel.innerHTML = `
        <div class="agrobot-header">
            <div class="agrobot-header-left">
                <div class="agrobot-avatar">🐾</div>
                <div>
                    <div class="agrobot-titulo">AgroBot ALIVET</div>
                    <div class="agrobot-subtitulo" id="agrobot-subtitulo">Asistente virtual</div>
                </div>
            </div>
            <button class="agrobot-cerrar" title="Cerrar">✕</button>
        </div>
        <div class="agrobot-mensajes" id="agrobot-mensajes"></div>
        <div class="agrobot-input-zona">
            <input type="text" id="agrobot-input" maxlength="500" placeholder="Escribe tu pregunta...">
            <button id="agrobot-enviar" title="Enviar">➤</button>
        </div>
    `;

    document.body.appendChild(burbuja);
    document.body.appendChild(panel);

    const zonaMensajes = panel.querySelector('#agrobot-mensajes');
    const input        = panel.querySelector('#agrobot-input');
    const btnEnviar    = panel.querySelector('#agrobot-enviar');
    const subtitulo    = panel.querySelector('#agrobot-subtitulo');

    let sesion = obtenerSesion();
    let historialCargado = false;
    let enviando = false;

    // ── Helpers de UI ─────────────────────────────────────────────
    const agregarMensaje = (texto, clase) => {
        const div = document.createElement('div');
        div.className = 'agrobot-msg ' + clase;
        div.textContent = texto;
        zonaMensajes.appendChild(div);
        zonaMensajes.scrollTop = zonaMensajes.scrollHeight;
        return div;
    };

    // Renderiza tarjetas de producto debajo del mensaje del bot
    const renderizarProductos = (productos) => {
        if (!productos || !productos.length) return;

        const contenedor = document.createElement('div');
        contenedor.className = 'agrobot-productos';

        productos.forEach(p => {
            const imgSrc = p.imagen && p.imagen.startsWith('http')
                ? p.imagen
                : `/img/productos/${p.imagen || 'default.jpg'}`;

            const stock = Number(p.stock_actual) || 0;
            const stockColor  = stock > 5 ? '#2e7d32' : stock > 0 ? '#e65100' : '#c62828';
            const stockTexto  = stock > 5 ? `✓ ${stock} disponibles`
                              : stock > 0 ? `⚠ Solo ${stock} restantes`
                              : '✗ Sin stock';

            const card = document.createElement('a');
            card.className = 'agrobot-prod-card';
            card.href = `/detalleproducto.html?id=${encodeURIComponent(p.id)}`;
            card.target = '_blank';
            card.rel = 'noopener';

            const img = document.createElement('img');
            img.className = 'agrobot-prod-img';
            img.src = imgSrc;
            img.alt = '';
            img.onerror = () => { img.src = '/img/productos/default.jpg'; };

            const info = document.createElement('div');
            info.className = 'agrobot-prod-info';

            const nombre = document.createElement('div');
            nombre.className = 'agrobot-prod-nombre';
            nombre.textContent = p.nombre;

            const precio = document.createElement('div');
            precio.className = 'agrobot-prod-precio';
            precio.textContent = `S/ ${Number(p.precio).toFixed(2)}`;

            const stockEl = document.createElement('div');
            stockEl.className = 'agrobot-prod-stock';
            stockEl.style.color = stockColor;
            stockEl.textContent = stockTexto;

            info.appendChild(nombre);
            info.appendChild(precio);
            info.appendChild(stockEl);
            card.appendChild(img);
            card.appendChild(info);
            contenedor.appendChild(card);
        });

        zonaMensajes.appendChild(contenedor);
        zonaMensajes.scrollTop = zonaMensajes.scrollHeight;
    };

    const mostrarChipsFaq = async () => {
        try {
            const resp = await fetch('/api/ia/faqs');
            const faqs = await resp.json();

            const contenedor = document.createElement('div');
            contenedor.className = 'agrobot-chips';
            faqs.forEach(faq => {
                const chip = document.createElement('button');
                chip.className = 'agrobot-chip';
                chip.textContent = faq.pregunta;
                chip.addEventListener('click', () => {
                    agregarMensaje(faq.pregunta, 'usuario');
                    enviarAlServidor({ faqId: faq.id, mensaje: faq.pregunta });
                });
                contenedor.appendChild(chip);
            });
            zonaMensajes.appendChild(contenedor);
            zonaMensajes.scrollTop = zonaMensajes.scrollHeight;
        } catch (e) { /* sin chips si falla */ }
    };

    // ── Comunicación con el backend ──────────────────────────────
    const enviarAlServidor = async (cuerpo) => {
        if (enviando) return;
        enviando = true;
        btnEnviar.disabled = true;

        const escribiendo = agregarMensaje('AgroBot está escribiendo...', 'bot escribiendo');

        try {
            const headers = { 'Content-Type': 'application/json' };
            if (sesion.token) headers['Authorization'] = 'Bearer ' + sesion.token;

            // Incluir la página actual para que la IA adapte su respuesta
            const payload = Object.assign(
                { paginaActual: window.location.pathname },
                cuerpo
            );

            const resp = await fetch('/api/ia/chat', {
                method: 'POST',
                headers,
                body: JSON.stringify(payload)
            });
            const data = await resp.json();

            escribiendo.remove();
            agregarMensaje(
                data.respuesta || data.mensaje || 'No pude procesar tu mensaje.',
                'bot'
            );

            // Mostrar tarjetas de productos si la IA encontró alguno
            if (Array.isArray(data.productos) && data.productos.length) {
                renderizarProductos(data.productos);
            }

        } catch (e) {
            escribiendo.remove();
            agregarMensaje('Error de conexión. Intenta de nuevo. 🙏', 'bot');
        } finally {
            enviando = false;
            btnEnviar.disabled = false;
            input.focus();
        }
    };

    const cargarHistorial = async () => {
        if (!sesion.token) return;
        try {
            const resp = await fetch('/api/ia/history', {
                headers: { 'Authorization': 'Bearer ' + sesion.token }
            });
            const historial = await resp.json();
            if (Array.isArray(historial)) {
                historial.forEach(h => {
                    agregarMensaje(h.mensaje_usuario, 'usuario');
                    agregarMensaje(h.respuesta_ia, 'bot');
                });
            }
        } catch (e) { /* historial opcional */ }
    };

    // ── Bienvenida según rol ─────────────────────────────────────
    const iniciarConversacion = async () => {
        sesion = obtenerSesion();

        if (sesion.rol === 'INVITADO') {
            subtitulo.textContent = 'Preguntas frecuentes';
            agregarMensaje('¡Hola! 👋 Soy AgroBot, asistente de ALIVET. Elige una pregunta o escribe tu consulta:', 'bot');
            await mostrarChipsFaq();
        } else if (sesion.rol === 'COLABORADOR') {
            subtitulo.textContent = 'Panel administrativo';
            agregarMensaje('¡Hola! 👋 Soy AgroBot. Puedo mostrarte estadísticas del negocio: ventas, stock, pedidos y más. ¿En qué te ayudo?', 'bot');
            await cargarHistorial();
        } else {
            subtitulo.textContent = 'Tu asistente personal 🐾';
            agregarMensaje('¡Hola! 👋 Soy AgroBot. Puedo ayudarte a encontrar productos, resolver dudas sobre tu pedido o responder preguntas sobre tus mascotas. ¿En qué te ayudo?', 'bot');
            await cargarHistorial();
        }
        historialCargado = true;
    };

    // ── Eventos ──────────────────────────────────────────────────
    burbuja.addEventListener('click', () => {
        const abierto = panel.classList.toggle('abierto');
        if (abierto && !historialCargado) iniciarConversacion();
        if (abierto) input.focus();
    });

    panel.querySelector('.agrobot-cerrar').addEventListener('click', () => {
        panel.classList.remove('abierto');
    });

    const enviarTexto = () => {
        const texto = input.value.trim();
        if (!texto || enviando) return;
        input.value = '';
        agregarMensaje(texto, 'usuario');
        enviarAlServidor({ mensaje: texto });
    };

    btnEnviar.addEventListener('click', enviarTexto);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') enviarTexto();
    });
})();
