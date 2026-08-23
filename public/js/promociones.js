// Verificar si es admin
const token = localStorage.getItem('token');
if (!token) {
    window.location.href = '/login.html';
}

// ── Selección de clientes por checkbox (Top clientes / Todos los clientes) ──
// Un mismo Set para ambas listas: un correo puede estar marcado en
// cualquiera de las dos secciones, el envío no distingue de cuál vino.
const seleccionados = new Set();

function actualizarBotonEnviar() {
    const btn = document.getElementById('btnEnviarPromo');
    const n = seleccionados.size;
    btn.innerHTML = n === 0
        ? '<i class="bi bi-send"></i> Enviar promoción'
        : `<i class="bi bi-send"></i> Enviar a ${n} cliente${n === 1 ? '' : 's'}`;
    // Si hay seleccionados, el campo de correo manual queda de solo
    // lectura — mismo criterio que el móvil (prioridad clara, sin
    // que compitan dos formas de elegir destinatario a la vez).
    document.getElementById('correo').readOnly = n > 0;
}

function filaCliente(nombre, correo, subtitulo) {
    const div = document.createElement('div');
    div.className = 'form-check py-2 px-2 border-bottom';
    const sinCorreo = !correo;
    div.innerHTML = `
        <input class="form-check-input" type="checkbox" ${sinCorreo ? 'disabled' : ''}
               id="chk-${btoa(correo || nombre).replace(/=/g, '')}" data-correo="${correo || ''}">
        <label class="form-check-label w-100" for="chk-${btoa(correo || nombre).replace(/=/g, '')}">
            <div class="fw-semibold small">${nombre}</div>
            <div class="text-muted" style="font-size:12px">${subtitulo}</div>
        </label>`;
    const chk = div.querySelector('input[type=checkbox]');
    if (!sinCorreo) {
        chk.addEventListener('change', () => {
            if (chk.checked) seleccionados.add(correo);
            else seleccionados.delete(correo);
            actualizarBotonEnviar();
        });
    }
    return div;
}

// ── Cargar Top clientes (los que más compran) ──
async function cargarTopClientes() {
    try {
        const res = await fetch('/api/dashboard/top-clientes?limite=10', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) return;
        const lista = await res.json();
        if (!lista.length) return;

        const cont = document.getElementById('lista-top-clientes');
        lista.forEach((c, i) => {
            const gastado = Number(c.total_gastado || 0).toFixed(2);
            cont.appendChild(filaCliente(
                `#${i + 1} ${c.nombres || c.correo}`,
                c.correo,
                `${c.correo || 'Sin correo'} · ${c.total_pedidos} pedido(s) · S/. ${gastado}`
            ));
        });
        document.getElementById('bloque-top-clientes').classList.remove('d-none');
    } catch (err) {
        // Si falla, simplemente no se muestra la sección — el envío
        // manual (correo / todos) sigue funcionando igual.
        console.error('Error cargando top clientes:', err);
    }
}

// ── Cargar Todos los clientes registrados ──
async function cargarTodosClientes() {
    try {
        const res = await fetch('/api/clientes', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) return;
        const lista = await res.json();
        if (!lista.length) return;

        const cont = document.getElementById('lista-todos-clientes');
        lista.forEach(c => {
            cont.appendChild(filaCliente(
                c.nombres || c.correo || 'Cliente',
                c.correo,
                c.correo || 'Sin correo registrado'
            ));
        });
        document.getElementById('texto-total-clientes').textContent =
            `Lista completa de clientes registrados (${lista.length}). Marcar aquí también tiene prioridad sobre "Correo destinatario".`;
        document.getElementById('bloque-todos-clientes').classList.remove('d-none');
    } catch (err) {
        console.error('Error cargando clientes:', err);
    }
}

cargarTopClientes();
cargarTodosClientes();

document.getElementById('imagenPromo').addEventListener('change', (e) => {
    const file = e.target.files[0];
    const preview = document.getElementById('previewImagen');
    if (file) {
        const reader = new FileReader();
        reader.onload = (ev) => {
            preview.src = ev.target.result;
            preview.classList.remove('d-none');
        };
        reader.readAsDataURL(file);
    } else {
        preview.classList.add('d-none');
        preview.src = '';
    }
});

// Arma el FormData común a un solo envío (correo puede venir vacío = todos)
function armarFormData(correo, asunto, mensajeTexto, imagenInput) {
    const formData = new FormData();
    if (correo) formData.append('correo', correo);
    formData.append('asunto', asunto);
    formData.append('mensaje', mensajeTexto);
    if (imagenInput) formData.append('imagen', imagenInput);
    return formData;
}

async function enviarUno(correo, asunto, mensajeTexto, imagenInput) {
    const res = await fetch('/api/auth/enviar-promocion', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: armarFormData(correo, asunto, mensajeTexto, imagenInput)
    });
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.mensaje || 'Error al enviar');
    }
}

document.getElementById('formPromocion').addEventListener('submit', async (e) => {
    e.preventDefault();

    const correo = document.getElementById('correo').value;
    const asunto = document.getElementById('asunto').value;
    const mensajeTexto = document.getElementById('mensajePromo').value;
    const imagenInput = document.getElementById('imagenPromo').files[0];

    const mensaje = document.getElementById('mensaje');
    const btn = document.getElementById('btnEnviarPromo');

    // ── Si hay clientes marcados por checkbox, tienen prioridad sobre
    // el campo de correo manual — se manda uno por uno, igual que el
    // móvil, y se reporta el progreso en el propio botón. ──
    if (seleccionados.size > 0) {
        const correos = Array.from(seleccionados);
        btn.disabled = true;
        let enviados = 0;
        const fallidos = [];

        for (const dest of correos) {
            try {
                await enviarUno(dest, asunto, mensajeTexto, imagenInput);
            } catch (_) {
                fallidos.push(dest);
            }
            enviados++;
            btn.innerHTML = `<span class="spinner-border spinner-border-sm"></span> Enviando ${enviados} de ${correos.length}...`;
        }

        if (fallidos.length === 0) {
            mensaje.className = 'alert alert-success';
            mensaje.textContent = `¡Promoción enviada a ${correos.length} cliente${correos.length === 1 ? '' : 's'}!`;
        } else {
            mensaje.className = 'alert alert-warning';
            mensaje.textContent = `Se enviaron ${correos.length - fallidos.length} de ${correos.length}. Fallaron: ${fallidos.join(', ')}`;
        }
        mensaje.classList.remove('d-none');

        seleccionados.clear();
        document.querySelectorAll('#lista-top-clientes input[type=checkbox], #lista-todos-clientes input[type=checkbox]')
            .forEach(chk => { chk.checked = false; });
        document.getElementById('formPromocion').reset();
        document.getElementById('previewImagen').classList.add('d-none');
        document.getElementById('previewImagen').src = '';
        actualizarBotonEnviar();
        btn.disabled = false;
        return;
    }

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Enviando...';

    // Sin checkbox marcado y sin correo escrito = se va a enviar a
    // TODOS los clientes registrados. Se confirma antes, igual que
    // hace el móvil, para no disparar un envío masivo por error.
    if (!correo && !confirm('Dejaste el correo vacío: esta promoción se va a enviar a TODOS los clientes registrados. ¿Confirmas?')) {
        btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-send"></i> Enviar promoción';
        return;
    }

    try {
        await enviarUno(correo || null, asunto, mensajeTexto, imagenInput);
        mensaje.className = 'alert alert-success';
        mensaje.textContent = '¡Promoción enviada correctamente!';
        mensaje.classList.remove('d-none');
        document.getElementById('formPromocion').reset();
        document.getElementById('previewImagen').classList.add('d-none');
        document.getElementById('previewImagen').src = '';
    } catch (error) {
        mensaje.className = 'alert alert-danger';
        mensaje.textContent = error.message || 'Error al enviar promoción';
        mensaje.classList.remove('d-none');
    } finally {
        btn.disabled = false;
        actualizarBotonEnviar();
    }
});