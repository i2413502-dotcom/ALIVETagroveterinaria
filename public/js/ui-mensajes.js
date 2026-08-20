// ═══════════════════════════════════════════════════
//  ui-mensajes.js — Sistema compartido de mensajes del panel admin
//  Reemplaza los confirm()/alert() nativos del navegador por un modal
//  de confirmación y toasts, ambos con estilos Bootstrap.
//
//  Usado por dashboard.html, ventas.html y reportes.html (las 3
//  páginas del panel). Cada una debe incluir en su HTML:
//    - El modal #modalConfirmacion (ver dashboard.html como referencia)
//    - El contenedor <div id="toasts-alertas"> (toast-container)
//  Y cargar este script ANTES de su propio archivo JS (dashboard.js /
//  ventas.js / reportes.js), que es quien llama a confirmarAccion()
//  y mostrarAlerta().
// ═══════════════════════════════════════════════════

let modalConfirmacion;
window.addEventListener('DOMContentLoaded', () => {
    const el = document.getElementById('modalConfirmacion');
    if (el) modalConfirmacion = new bootstrap.Modal(el);
});

// ── Modal de confirmación (reemplaza confirm() nativo) ──────────────
// Uso: if (!(await confirmarAccion({ mensaje: '¿Eliminar X?', tipo: 'peligro' }))) return;
const ESTILOS_CONFIRMACION = {
    peligro:      { icono: 'bi-trash3-fill',              colorIcono: '#dc3545', btn: 'btn-danger',  titulo: 'Eliminar de forma permanente' },
    advertencia:  { icono: 'bi-exclamation-triangle-fill', colorIcono: '#fd7e14', btn: 'btn-warning', titulo: 'Confirmar acción' },
    info:         { icono: 'bi-question-circle-fill',     colorIcono: '#0d6efd', btn: 'btn-primary', titulo: 'Confirmar' }
};

function confirmarAccion({ titulo, mensaje, tipo = 'advertencia', textoConfirmar = 'Confirmar', textoCancelar = 'Cancelar' }) {
    const estilo = ESTILOS_CONFIRMACION[tipo] || ESTILOS_CONFIRMACION.advertencia;

    document.getElementById('confirmacion-titulo-texto').innerText = titulo || estilo.titulo;
    document.getElementById('confirmacion-mensaje').innerText      = mensaje || '';
    const icono = document.getElementById('confirmacion-icono');
    icono.className = `bi ${estilo.icono} me-2`;
    icono.style.color = estilo.colorIcono;

    const btnConfirmar = document.getElementById('confirmacion-btn-confirmar');
    const btnCancelar  = document.getElementById('confirmacion-btn-cancelar');
    btnConfirmar.className = `btn ${estilo.btn}`;
    btnConfirmar.innerText = textoConfirmar;
    btnCancelar.innerText  = textoCancelar;

    return new Promise((resolve) => {
        let resuelto = false;
        const cerrar = (resultado) => {
            if (resuelto) return; // evita doble resolve (click + evento hidden)
            resuelto = true;
            resolve(resultado);
        };
        // onclick sobrescribe el handler anterior — seguro reutilizar el mismo modal en llamadas consecutivas
        btnConfirmar.onclick = () => { modalConfirmacion.hide(); cerrar(true); };
        btnCancelar.onclick  = () => { modalConfirmacion.hide(); cerrar(false); };
        // Si cierran con la X, con Escape o clic fuera: cuenta como cancelar
        document.getElementById('modalConfirmacion').addEventListener('hidden.bs.modal', () => cerrar(false), { once: true });
        modalConfirmacion.show();
    });
}

// ── Toasts (reemplaza alert() nativo del navegador) ──────────────────
// Uso: mostrarAlerta('Producto guardado correctamente') ó
//      mostrarAlerta('No se pudo eliminar', 'error')
const ESTILOS_TOAST = {
    exito:       { bg: 'text-bg-success',  icono: 'bi-check-circle-fill' },
    error:       { bg: 'text-bg-danger',   icono: 'bi-x-circle-fill' },
    advertencia: { bg: 'text-bg-warning',  icono: 'bi-exclamation-triangle-fill' },
    info:        { bg: 'text-bg-primary',  icono: 'bi-info-circle-fill' }
};

// Si no se indica el tipo, lo deduce del texto del mensaje — así no hace
// falta tocar cada llamada existente a alert() para clasificarla a mano.
function detectarTipoMensaje(mensaje) {
    const m = (mensaje || '').toLowerCase();
    if (m.includes('⚠️') || m.includes('advertencia')) return 'advertencia';
    if (m.includes('error') || m.includes('no se pud') || m.includes('no se puede') || m.includes('no válid')) return 'error';
    if (m.includes('correctamente') || m.includes('creado') || m.includes('actualizado') || m.includes('eliminado') || m.includes('guardado')) return 'exito';
    return 'info';
}

function mostrarAlerta(mensaje, tipo = null) {
    const estilo = ESTILOS_TOAST[tipo || detectarTipoMensaje(mensaje)] || ESTILOS_TOAST.info;
    const contenedor = document.getElementById('toasts-alertas');
    if (!contenedor) { console.warn(mensaje); return; } // fallback si el HTML aún no cargó

    const toastEl = document.createElement('div');
    toastEl.className = `toast align-items-center ${estilo.bg} border-0`;
    toastEl.setAttribute('role', 'alert');
    toastEl.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">
                <i class="bi ${estilo.icono} me-2"></i>${mensaje}
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
        </div>`;
    contenedor.appendChild(toastEl);
    const toast = new bootstrap.Toast(toastEl, { delay: 4000 });
    toast.show();
    toastEl.addEventListener('hidden.bs.toast', () => toastEl.remove());
}
