const { BrevoClient } = require('@getbrevo/brevo');

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
      await this.client.transactionalEmails.sendTransacEmail({
        sender:      { email: this.senderEmail, name: this.senderName },
        to:          [{ email: to }],
        subject:     'Tu código de verificación - AgroVeterinaria ALIVET',
        htmlContent: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#fff;border-radius:12px">
            <h2 style="color:#1a5c2a;margin-bottom:8px">Código de verificación</h2>
            <p style="color:#555;margin-bottom:24px">Usa el siguiente código para completar tu registro en AgroVeterinaria ALIVET:</p>
            <div style="background:#f0fdf4;border-radius:8px;padding:24px;text-align:center;margin-bottom:24px">
              <span style="font-size:48px;font-weight:700;letter-spacing:12px;color:#16a34a">${otp}</span>
            </div>
            <p style="color:#888;font-size:13px">Este código expira en 10 minutos. Si no solicitaste este código, ignora este mensaje.</p>
          </div>
        `,
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
      await this.client.transactionalEmails.sendTransacEmail({
        sender: { email: this.senderEmail, name: this.senderName },
        to: [{ email: to }],
        subject: '¡Bienvenido a AgroVeterinaria ALIVET!',
        htmlContent: `
          <h2>¡Hola ${nombre}!</h2>
          <p>Tu cuenta ha sido verificada exitosamente.</p>
          <p>Empieza a comprar los mejores productos para tus animales.</p>
        `,
      });
      console.log(`[EMAIL] Bienvenida enviada a ${to}`);
    } catch (error) {
      console.error(`[EMAIL] Error al enviar bienvenida:`, error.message);
    }
  }

  async sendPasswordReset(to, token) {
    if (!this.client) return;
    try {
      const base = process.env.FRONTEND_URL || 'http://localhost:10000';
      const link = `${base}/restablecer.html?token=${token}`;
      await this.client.transactionalEmails.sendTransacEmail({
        sender: { email: this.senderEmail, name: this.senderName },
        to: [{ email: to }],
        subject: 'Recuperación de contraseña - AgroVeterinaria ALIVET',
        htmlContent: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#fff;border-radius:12px">
            <h2 style="color:#1a5c2a;margin-bottom:8px">Recupera tu contraseña</h2>
            <p style="color:#555;margin-bottom:24px">Haz clic en el botón para restablecer tu contraseña. El enlace expira en 1 hora.</p>
            <div style="text-align:center;margin-bottom:24px">
              <a href="${link}" style="background:#16a34a;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block">
                Restablecer contraseña
              </a>
            </div>
            <p style="color:#888;font-size:13px">Si no solicitaste este correo, ignóralo. Tu contraseña no cambiará.</p>
            <hr style="border:none;border-top:1px solid #eee;margin:20px 0">
            <p style="color:#aaa;font-size:12px">AgroVeterinaria ALIVET</p>
          </div>
        `,
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
      await this.client.transactionalEmails.sendTransacEmail({
        sender: { email: this.senderEmail, name: this.senderName },
        to: [{ email: to }],
        subject: 'Código para restablecer contraseña - AgroVeterinaria ALIVET',
        htmlContent: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#fff;border-radius:12px">
            <h2 style="color:#1a5c2a;margin-bottom:8px">Código de recuperación</h2>
            <p style="color:#555;margin-bottom:24px">Usa el siguiente código para restablecer tu contraseña. Expira en 15 minutos.</p>
            <div style="background:#f0fdf4;border-radius:8px;padding:24px;text-align:center;margin-bottom:24px">
              <span style="font-size:48px;font-weight:700;letter-spacing:12px;color:#16a34a">${otp}</span>
            </div>
            <p style="color:#888;font-size:13px">Si no solicitaste este código, ignora este mensaje. Tu contraseña no cambiará.</p>
            <hr style="border:none;border-top:1px solid #eee;margin:20px 0">
            <p style="color:#aaa;font-size:12px">AgroVeterinaria ALIVET</p>
          </div>
        `,
      });
      console.log(`[EMAIL] OTP de recuperación enviado a ${to}`);
    } catch (error) {
      console.error(`[EMAIL] Error al enviar OTP de recuperación a ${to}:`, error.message);
      throw error;
    }
  }

  async sendPromotion(to, nombre, asunto, mensaje) {
    if (!this.client) return;
    try {
      await this.client.transactionalEmails.sendTransacEmail({
        sender: { email: this.senderEmail, name: this.senderName },
        to: [{ email: to }],
        subject: asunto,
        htmlContent: `
          <h2>¡Hola ${nombre}!</h2>
          <p>${mensaje}</p>
          <p>Visítanos en nuestra tienda online.</p>
        `,
      });
      console.log(`[EMAIL] Promoción enviada a ${to}`);
    } catch (error) {
      console.error(`[EMAIL] Error al enviar promoción:`, error.message);
    }
  }

  async sendReEngagement(to, nombre) {
    if (!this.client) return;
    try {
      await this.client.transactionalEmails.sendTransacEmail({
        sender: { email: this.senderEmail, name: this.senderName },
        to: [{ email: to }],
        subject: '¡Te extrañamos! - AgroVeterinaria ALIVET',
        htmlContent: `
          <h2>¡Hola ${nombre}!</h2>
          <p>Hace un tiempo que no te vemos por nuestra tienda.</p>
          <p>Tenemos nuevos productos y ofertas especiales para ti.</p>
          <p>¡Te esperamos de vuelta!</p>
        `,
      });
      console.log(`[EMAIL] Re-engagement enviado a ${to}`);
    } catch (error) {
      console.error(`[EMAIL] Error al enviar re-engagement:`, error.message);
    }
  }
}

module.exports = new EmailService();