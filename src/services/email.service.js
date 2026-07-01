const { BrevoClient } = require('@getbrevo/brevo');

// URL pública del sitio (se usa para el logo y enlaces en los correos)
const SITE_URL = process.env.SITE_URL || 'https://alivetagroveterinaria-web.onrender.com';
const LOGO_URL = `${SITE_URL}/img/logo-alivet.jpg`;

// ── Paleta de marca (tomada del logo) ──────────────────────────
const COLOR_AZUL_OSCURO = '#1B3F8B';
const COLOR_AZUL        = '#1E66D6';
const COLOR_CELESTE     = '#29ABE2';
const COLOR_ROJO        = '#E2231A';
const COLOR_TEXT        = '#1E2D24';
const COLOR_TEXT_MUTED  = '#6B7280';
const COLOR_BG          = '#F2F6FB';
const COLOR_BORDER      = '#E3E9F2';

/**
 * Envuelve el contenido de un correo en una plantilla base con
 * header (logo), cuerpo en tarjeta blanca y footer corporativo.
 * @param {string} contenidoHtml - HTML interno de la tarjeta (sin header/footer)
 * @param {string} [preheader] - Texto corto oculto que muchos clientes de correo
 *                                muestran junto al asunto en la bandeja de entrada.
 */
function renderEmailBase(contenidoHtml, preheader = '') {
  return `
  <body style="margin:0;padding:0;background-color:${COLOR_BG};">
    ${preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${preheader}</div>` : ''}
    <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px 16px;">

      <!-- Header con logo -->
      <div style="background:linear-gradient(135deg, ${COLOR_AZUL_OSCURO} 0%, ${COLOR_AZUL} 100%);border-radius:16px 16px 0 0;padding:28px 24px;text-align:center;">
        <img src="${LOGO_URL}" alt="AgroVeterinaria ALIVET S.A.C." style="max-width:220px;width:60%;height:auto;display:block;margin:0 auto;">
      </div>

      <!-- Cuerpo -->
      <div style="background:#ffffff;padding:32px 28px;border-left:1px solid ${COLOR_BORDER};border-right:1px solid ${COLOR_BORDER};">
        ${contenidoHtml}
      </div>

      <!-- Footer -->
      <div style="background:${COLOR_BG};border-radius:0 0 16px 16px;padding:20px 24px;text-align:center;border:1px solid ${COLOR_BORDER};border-top:none;">
        <p style="margin:0 0 4px;color:${COLOR_TEXT_MUTED};font-size:13px;font-weight:600;">AgroVeterinaria ALIVET </p>
        <p style="margin:0;color:${COLOR_TEXT_MUTED};font-size:12px;">Cuidando la salud de tus animales con calidad y confianza.</p>
        <p style="margin:10px 0 0;color:#9CA3AF;font-size:11px;">Este es un correo automático, por favor no respondas a este mensaje.</p>
      </div>

    </div>
  </body>
  `;
}

class EmailService {
  constructor() {
    const apiKey = process.env.BREVO_API_KEY;
    if (!apiKey) {
      console.warn('[EMAIL] BREVO_API_KEY no configurada. Los correos no se enviarán.');
      this.client = null;
    } else {
      this.client = new BrevoClient({ apiKey });
    }
    
    const emailFrom = process.env.EMAIL_FROM || 'AgroVeterinaria <noreply@alivetagroveterinaria.pe>';
    const match = emailFrom.match(/^(.+?)\s*<(.+?)>$/);
    this.senderEmail = match ? match[2].trim() : emailFrom.trim();
    this.senderName  = match ? match[1].trim() : 'AgroVeterinaria';
  }

  async sendOtpEmail(to, otp) {
    if (!this.client) {
      console.log(`[EMAIL SKIP] OTP para ${to}: ${otp}`);
      return;
    }

    try {
      const contenido = `
        <h2 style="color:${COLOR_AZUL_OSCURO};margin:0 0 8px;font-size:22px;">Código de verificación</h2>
        <p style="color:${COLOR_TEXT};font-size:15px;line-height:1.5;margin:0 0 24px;">Usa el siguiente código para completar tu registro en <strong>AgroVeterinaria ALIVET</strong>:</p>
        <div style="background:${COLOR_BG};border:1px solid ${COLOR_BORDER};border-radius:12px;padding:24px;text-align:center;margin-bottom:24px;">
          <span style="font-size:42px;font-weight:700;letter-spacing:10px;color:${COLOR_AZUL};">${otp}</span>
        </div>
        <p style="color:${COLOR_TEXT_MUTED};font-size:13px;margin:0;">Este código expira en 10 minutos. Si no solicitaste este código, ignora este mensaje.</p>
      `;

      await this.client.transactionalEmails.sendTransacEmail({
        sender:      { email: this.senderEmail, name: this.senderName },
        to:          [{ email: to }],
        subject:     'Tu código de verificación - AgroVeterinaria ALIVET',
        htmlContent: renderEmailBase(contenido, `Tu código de verificación es ${otp}`),
      });
      console.log(`[EMAIL] OTP enviado a ${to}`);
    } catch (error) {
      console.error(`[EMAIL] Error al enviar OTP a ${to}:`, error.message);
      throw error;
    }
  }

  async sendWelcomeEmail(to, nombre) {
    if (!this.client) return;
    try {
      const contenido = `
        <h2 style="color:${COLOR_AZUL_OSCURO};margin:0 0 8px;font-size:22px;">¡Bienvenido(a), ${nombre}! 🐾</h2>
        <p style="color:${COLOR_TEXT};font-size:15px;line-height:1.6;margin:0 0 16px;">Tu cuenta ha sido verificada exitosamente. Ya formas parte de la comunidad ALIVET.</p>
        <p style="color:${COLOR_TEXT};font-size:15px;line-height:1.6;margin:0 0 28px;">Encuentra los mejores productos veterinarios y agropecuarios para el cuidado de tus animales, con la calidad y confianza que nos caracteriza.</p>
        <div style="text-align:center;">
          <a href="${SITE_URL}" style="background:${COLOR_AZUL};color:#fff;padding:14px 36px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block;font-size:15px;">
            Ir a la tienda
          </a>
        </div>
      `;

      await this.client.transactionalEmails.sendTransacEmail({
        sender: { email: this.senderEmail, name: this.senderName },
        to: [{ email: to }],
        subject: '¡Bienvenido a AgroVeterinaria ALIVET!',
        htmlContent: renderEmailBase(contenido, `¡Hola ${nombre}! Tu cuenta ya está lista.`),
      });
      console.log(`[EMAIL] Bienvenida enviada a ${to}`);
    } catch (error) {
      console.error(`[EMAIL] Error al enviar bienvenida:`, error.message);
    }
  }

  async sendPasswordReset(to, token, baseUrl) {
    if (!this.client) return;
    try {
      const link = `${baseUrl}/restablecer.html?token=${token}`;
      const contenido = `
        <h2 style="color:${COLOR_AZUL_OSCURO};margin:0 0 8px;font-size:22px;">Recupera tu contraseña</h2>
        <p style="color:${COLOR_TEXT};font-size:15px;line-height:1.6;margin:0 0 24px;">Haz clic en el siguiente botón para restablecer tu contraseña. El enlace expira en 1 hora.</p>
        <div style="text-align:center;margin-bottom:24px;">
          <a href="${link}" style="background:${COLOR_AZUL};color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block;font-size:15px;">
            Restablecer contraseña
          </a>
        </div>
        <p style="color:${COLOR_TEXT_MUTED};font-size:13px;margin:0;">Si no solicitaste este correo, ignóralo. Tu contraseña no cambiará.</p>
      `;

      await this.client.transactionalEmails.sendTransacEmail({
        sender: { email: this.senderEmail, name: this.senderName },
        to: [{ email: to }],
        subject: 'Recuperación de contraseña - AgroVeterinaria ALIVET',
        htmlContent: renderEmailBase(contenido, 'Restablece tu contraseña de ALIVET'),
      });
      console.log(`[EMAIL] Enlace de recuperación enviado a ${to}`);
    } catch (error) {
      console.error(`[EMAIL] Error al enviar recuperación:`, error.message);
    }
  }

  async sendPasswordResetOtp(to, otp) {
    if (!this.client) {
      console.log(`[EMAIL SKIP] OTP recuperación para ${to}: ${otp}`);
      return;
    }
    try {
      const contenido = `
        <h2 style="color:${COLOR_AZUL_OSCURO};margin:0 0 8px;font-size:22px;">Código de recuperación</h2>
        <p style="color:${COLOR_TEXT};font-size:15px;line-height:1.6;margin:0 0 24px;">Usa el siguiente código para restablecer tu contraseña. Expira en 15 minutos.</p>
        <div style="background:${COLOR_BG};border:1px solid ${COLOR_BORDER};border-radius:12px;padding:24px;text-align:center;margin-bottom:24px;">
          <span style="font-size:42px;font-weight:700;letter-spacing:10px;color:${COLOR_AZUL};">${otp}</span>
        </div>
        <p style="color:${COLOR_TEXT_MUTED};font-size:13px;margin:0;">Si no solicitaste este código, ignora este mensaje. Tu contraseña no cambiará.</p>
      `;

      await this.client.transactionalEmails.sendTransacEmail({
        sender: { email: this.senderEmail, name: this.senderName },
        to: [{ email: to }],
        subject: 'Código para restablecer contraseña - AgroVeterinaria ALIVET',
        htmlContent: renderEmailBase(contenido, `Tu código de recuperación es ${otp}`),
      });
      console.log(`[EMAIL] OTP de recuperación enviado a ${to}`);
    } catch (error) {
      console.error(`[EMAIL] Error al enviar OTP de recuperación a ${to}:`, error.message);
      throw error;
    }
  }

  /**
   * Envía un correo de promoción a un cliente.
   * @param {string} to - correo del cliente
   * @param {string} nombre - nombre del cliente
   * @param {string} asunto - asunto del correo
   * @param {string} mensaje - cuerpo del mensaje (texto)
   * @param {string|null} imagenUrl - URL pública de la imagen promocional (opcional)
   */
  async sendPromotion(to, nombre, asunto, mensaje, imagenUrl = null) {
    if (!this.client) return;
    try {
      const imagenHtml = imagenUrl
        ? `
          <div style="margin:0 0 24px;border-radius:12px;overflow:hidden;border:1px solid ${COLOR_BORDER};">
            <img src="${imagenUrl}" alt="Promoción" style="display:block;width:100%;height:auto;">
          </div>
        `
        : '';

      const contenido = `
        <div style="display:inline-block;background:${COLOR_ROJO};color:#fff;font-size:12px;font-weight:700;letter-spacing:0.5px;padding:6px 14px;border-radius:20px;margin-bottom:16px;">
          PROMOCIÓN ESPECIAL
        </div>
        <h2 style="color:${COLOR_AZUL_OSCURO};margin:0 0 16px;font-size:22px;">¡Hola, ${nombre}!</h2>
        ${imagenHtml}
        <p style="color:${COLOR_TEXT};font-size:15px;line-height:1.6;margin:0 0 28px;white-space:pre-line;">${mensaje}</p>
        <div style="text-align:center;">
          <a href="${SITE_URL}" style="background:${COLOR_AZUL};color:#fff;padding:14px 36px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block;font-size:15px;">
            Visitar la tienda
          </a>
        </div>
      `;

      await this.client.transactionalEmails.sendTransacEmail({
        sender: { email: this.senderEmail, name: this.senderName },
        to: [{ email: to }],
        subject: asunto,
        htmlContent: renderEmailBase(contenido, asunto),
      });
      console.log(`[EMAIL] Promoción enviada a ${to}`);
    } catch (error) {
      console.error(`[EMAIL] Error al enviar promoción:`, error.message);
    }
  }

  async sendReEngagement(to, nombre) {
    if (!this.client) return;
    try {
      const contenido = `
        <h2 style="color:${COLOR_AZUL_OSCURO};margin:0 0 8px;font-size:22px;">¡Te extrañamos, ${nombre}! 🐶🐱</h2>
        <p style="color:${COLOR_TEXT};font-size:15px;line-height:1.6;margin:0 0 16px;">Hace un tiempo que no te vemos por nuestra tienda.</p>
        <p style="color:${COLOR_TEXT};font-size:15px;line-height:1.6;margin:0 0 28px;">Tenemos nuevos productos y ofertas especiales esperándote. ¡Vuelve y descúbrelos!</p>
        <div style="text-align:center;">
          <a href="${SITE_URL}" style="background:${COLOR_AZUL};color:#fff;padding:14px 36px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block;font-size:15px;">
            Ver novedades
          </a>
        </div>
      `;

      await this.client.transactionalEmails.sendTransacEmail({
        sender: { email: this.senderEmail, name: this.senderName },
        to: [{ email: to }],
        subject: '¡Te extrañamos! - AgroVeterinaria ALIVET',
        htmlContent: renderEmailBase(contenido, `Te extrañamos, ${nombre}`),
      });
      console.log(`[EMAIL] Re-engagement enviado a ${to}`);
    } catch (error) {
      console.error(`[EMAIL] Error al enviar re-engagement:`, error.message);
    }
  }
}

module.exports = new EmailService();
