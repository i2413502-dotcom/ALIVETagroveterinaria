// ═══════════════════════════════════════════════════════════════
// AgroBot — Widget de chat flotante de Agroveterinaria ALIVET
// Se inyecta automáticamente en todas las páginas desde app.js.
// Vanilla JS, sin dependencias. Detecta el rol desde el JWT.
// ═══════════════════════════════════════════════════════════════
(function () {
    'use strict';

    // Evitar doble inyección si la página ya incluye el script
    if (document.getElementById('agrobot-burbuja')) return;

    // ── Detección de rol desde el JWT en localStorage ────────────
    const obtenerSesion = () => {
        const token = localStorage.getItem('token');
        if (!token) return { token: null, rol: 'INVITADO' };
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            if (payload.exp && payload.exp * 1000 < Date.now()) {
                return { token: null, rol: 'INVITADO' }; // token expirado
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
            width: 340px; max-width: calc(100vw - 40px); height: 460px;
            background: #fff; border-radius: 16px; display: none;
            flex-direction: column; overflow: hidden;
            box-shadow: 0 8px 30px rgba(0,0,0,.25);
            font-family: system-ui, -apple-system, sans-serif;
        }
        #agrobot-panel.abierto { display: flex; }
        .agrobot-header {
            background: #2e7d32; color: #fff; padding: 12px 16px;
            font-weight: 600; display: flex; justify-content: space-between;
            align-items: center;
        }
        .agrobot-header small { display: block; font-weight: 400; opacity: .85; font-size: 11px; }
        .agrobot-cerrar { background: none; border: none; color: #fff; font-size: 20px; cursor: pointer; }
        .agrobot-mensajes {
            flex: 1; overflow-y: auto; padding: 12px;
            background: #f4f7f4; display: flex; flex-direction: column; gap: 8px;
        }
        .agrobot-msg {
            max-width: 85%; padding: 8px 12px; border-radius: 12px;
            font-size: 13.5px; line-height: 1.45; white-space: pre-wrap;
            word-wrap: break-word;
        }
        .agrobot-msg.usuario { align-self: flex-end; background: #2e7d32; color: #fff; border-bottom-right-radius: 4px; }
        .agrobot-msg.bot { align-self: flex-start; background: #fff; color: #222; border: 1px solid #e0e6e0; border-bottom-left-radius: 4px; }
        .agrobot-msg.escribiendo { font-style: italic; color: #777; }
        .agrobot-chips { display: flex; flex-wrap: wrap; gap: 6px; padding: 4px 0; }
        .agrobot-chip {
            background: #e8f3e8; color: #2e7d32; border: 1px solid #bcd9bc;
            border-radius: 14px; padding: 5px 10px; font-size: 12px;
            cursor: pointer; transition: background .15s;
        }
        .agrobot-chip:hover { background: #d2e8d2; }
        .agrobot-input-zona {
            display: flex; gap: 8px; padding: 10px; border-top: 1px solid #e5e5e5; background: #fff;
        }
        .agrobot-input-zona input {
            flex: 1; border: 1px solid #ccc; border-radius: 20px;
            padding: 8px 14px; font-size: 13.5px; outline: none;
        }
        .agrobot-input-zona input:focus { border-color: #2e7d32; }
        .agrobot-input-zona button {
            background: #2e7d32; color: #fff; border: none; border-radius: 50%;
            width: 38px; height: 38px; cursor: pointer; font-size: 16px;
        }
        .agrobot-input-zona button:disabled { opacity: .5; cursor: default; }
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
            <div>AgroBot 🐾<small id="agrobot-subtitulo">Asistente de ALIVET</small></div>
            <button class="agrobot-cerrar" title="Cerrar">×</button>
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
    const input = panel.querySelector('#agrobot-input');
    const btnEnviar = panel.querySelector('#agrobot-enviar');
    const subtitulo = panel.querySelector('#agrobot-subtitulo');

    let sesion = obtenerSesion();
    let historialCargado = false;
    let enviando = false;

    // ── Helpers de UI (siempre con textContent: a prueba de XSS) ──
    const agregarMensaje = (texto, clase) => {
        const div = document.createElement('div');
        div.className = 'agrobot-msg ' + clase;
        div.textContent = texto;
        zonaMensajes.appendChild(div);
        zonaMensajes.scrollTop = zonaMensajes.scrollHeight;
        return div;
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
        } catch (e) { /* sin chips si falla, el input sigue funcionando */ }
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

            const resp = await fetch('/api/ia/chat', {
                method: 'POST',
                headers,
                body: JSON.stringify(cuerpo)
            });
            const data = await resp.json();

            escribiendo.remove();
            agregarMensaje(
                data.respuesta || data.mensaje || 'No pude procesar tu mensaje.',
                'bot'
            );
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
        sesion = obtenerSesion(); // re-leer por si inició sesión en otra pestaña

        if (sesion.rol === 'INVITADO') {
            subtitulo.textContent = 'Preguntas frecuentes';
            agregarMensaje('¡Hola! 👋 Soy AgroBot. Elige una pregunta frecuente o escribe tu duda sobre ALIVET:', 'bot');
            await mostrarChipsFaq();
        } else if (sesion.rol === 'COLABORADOR') {
            subtitulo.textContent = 'Asistente del panel (solo lectura)';
            agregarMensaje('¡Hola! 👋 Soy AgroBot. Puedo darte estadísticas del negocio: ventas, stock bajo, pedidos pendientes, productos por vencer...', 'bot');
            await cargarHistorial();
        } else {
            subtitulo.textContent = 'Tu asistente personal';
            agregarMensaje('¡Hola! 👋 Soy AgroBot. Pregúntame por productos, precios o consejos para tus mascotas. 🐶🐱', 'bot');
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
