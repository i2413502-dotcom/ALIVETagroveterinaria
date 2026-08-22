// ============================================================
//  Toggle mostrar/ocultar contraseña (el "ojito")
//  Se activa automáticamente en cualquier <input> con la clase
//  ".js-password" que esté dentro de un .input-group con un botón
//  que tenga la clase ".toggle-password".
//
//  Uso en el HTML:
//  <div class="input-group">
//      <input type="password" class="form-control js-password" ...>
//      <button type="button" class="btn btn-outline-secondary toggle-password">
//          <i class="bi bi-eye"></i>
//      </button>
//  </div>
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.toggle-password').forEach((btn) => {
        btn.addEventListener('click', () => {
            const input = btn.closest('.input-group').querySelector('.js-password');
            const icono = btn.querySelector('i');
            if (!input) return;

            const oculto = input.type === 'password';
            input.type = oculto ? 'text' : 'password';

            if (icono) {
                icono.classList.toggle('bi-eye', !oculto);
                icono.classList.toggle('bi-eye-slash', oculto);
            }
        });
    });
});
