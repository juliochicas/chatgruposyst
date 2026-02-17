import { sendEmail } from "./ResendAPI";
import { logger } from "../../utils/logger";

// ---------------------------------------------------------------------------
// Configuration – uses env vars for the platform-level Resend account
// ---------------------------------------------------------------------------

const getConfig = () => ({
  apiKey: process.env.RESEND_API_KEY || "",
  from: process.env.RESEND_FROM_EMAIL || "ChateaYA <no-reply@chateaya.app>",
  appUrl: process.env.FRONTEND_URL || "https://app.chateaya.app"
});

const isConfigured = (): boolean => {
  return !!process.env.RESEND_API_KEY;
};

// ---------------------------------------------------------------------------
// Base layout – shared wrapper for all system emails
// ---------------------------------------------------------------------------

const baseLayout = (body: string): string => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; padding: 0; background: #f4f6f8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    .container { max-width: 600px; margin: 0 auto; padding: 24px; }
    .card { background: #ffffff; border-radius: 12px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
    .logo { text-align: center; margin-bottom: 24px; }
    .logo h1 { color: #6C63FF; font-size: 28px; margin: 0; }
    .logo span { color: #333; }
    h2 { color: #333; font-size: 22px; margin-top: 0; }
    p { color: #555; font-size: 15px; line-height: 1.6; }
    .btn { display: inline-block; padding: 12px 28px; background: #6C63FF; color: #ffffff !important; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; margin: 16px 0; }
    .highlight { background: #f0efff; border-radius: 8px; padding: 16px; margin: 16px 0; }
    .highlight p { margin: 4px 0; color: #333; }
    .footer { text-align: center; padding: 24px 0 0; color: #999; font-size: 12px; }
    .footer a { color: #6C63FF; text-decoration: none; }
    .amount { font-size: 28px; font-weight: 700; color: #6C63FF; }
    .warning { background: #fff3e0; border-left: 4px solid #ff9800; padding: 12px 16px; border-radius: 0 8px 8px 0; margin: 16px 0; }
    .error { background: #fce4ec; border-left: 4px solid #e53935; padding: 12px 16px; border-radius: 0 8px 8px 0; margin: 16px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="logo"><h1>Chatea<span>YA</span></h1></div>
      ${body}
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} ChateaYA. Todos los derechos reservados.</p>
      <p><a href="https://chateaya.app">chateaya.app</a></p>
    </div>
  </div>
</body>
</html>`;

// ---------------------------------------------------------------------------
// Email templates
// ---------------------------------------------------------------------------

interface CompanyInfo {
  name: string;
  email: string;
  planName?: string;
  dueDate?: string;
}

/**
 * Welcome email – sent when a new company signs up
 */
export const sendWelcomeEmail = async (company: CompanyInfo): Promise<void> => {
  if (!isConfigured() || !company.email) return;

  const { apiKey, from, appUrl } = getConfig();

  const html = baseLayout(`
    <h2>¡Bienvenido a ChateaYA!</h2>
    <p>Hola <strong>${company.name}</strong>,</p>
    <p>Tu cuenta ha sido creada exitosamente. Ya puedes empezar a gestionar tus conversaciones de WhatsApp, Instagram y Facebook desde un solo lugar.</p>
    <div class="highlight">
      <p><strong>Plan:</strong> ${company.planName || "Básico"}</p>
      <p><strong>Empresa:</strong> ${company.name}</p>
    </div>
    <p style="text-align:center;">
      <a href="${appUrl}" class="btn">Ingresar a ChateaYA</a>
    </p>
    <p>Si tienes alguna pregunta, no dudes en contactarnos.</p>
  `);

  try {
    await sendEmail({ apiKey }, {
      from,
      to: company.email,
      subject: `¡Bienvenido a ChateaYA, ${company.name}!`,
      html
    });
    logger.info(`SystemEmail -> Welcome sent to ${company.email}`);
  } catch (err) {
    logger.error(`SystemEmail -> Welcome email failed for ${company.email}: ${err.message}`);
  }
};

/**
 * Subscription confirmed – sent after successful Stripe checkout
 */
export const sendSubscriptionConfirmEmail = async (
  company: CompanyInfo,
  details: { planName: string; amount: number; recurrence: string; dueDate: string }
): Promise<void> => {
  if (!isConfigured() || !company.email) return;

  const { apiKey, from, appUrl } = getConfig();
  const period = details.recurrence === "annual" ? "anual" : "mensual";
  const amountStr = `US$ ${details.amount.toFixed(2)}`;

  const html = baseLayout(`
    <h2>Suscripción Confirmada</h2>
    <p>Hola <strong>${company.name}</strong>,</p>
    <p>Tu suscripción ha sido activada exitosamente.</p>
    <div class="highlight">
      <p><strong>Plan:</strong> ${details.planName}</p>
      <p><strong>Monto:</strong> <span class="amount">${amountStr}</span> / ${period}</p>
      <p><strong>Próximo cobro:</strong> ${details.dueDate}</p>
    </div>
    <p style="text-align:center;">
      <a href="${appUrl}/#/financeiro" class="btn">Ver mi Facturación</a>
    </p>
    <p>Puedes gestionar tu suscripción en cualquier momento desde el panel de facturación.</p>
  `);

  try {
    await sendEmail({ apiKey }, {
      from,
      to: company.email,
      subject: `Suscripción activada – ${details.planName}`,
      html
    });
    logger.info(`SystemEmail -> Subscription confirm sent to ${company.email}`);
  } catch (err) {
    logger.error(`SystemEmail -> Subscription confirm failed for ${company.email}: ${err.message}`);
  }
};

/**
 * Payment receipt – sent on each successful recurring payment
 */
export const sendPaymentReceiptEmail = async (
  company: CompanyInfo,
  details: { amount: number; invoiceId: string; date: string }
): Promise<void> => {
  if (!isConfigured() || !company.email) return;

  const { apiKey, from, appUrl } = getConfig();
  const amountStr = `US$ ${details.amount.toFixed(2)}`;

  const html = baseLayout(`
    <h2>Recibo de Pago</h2>
    <p>Hola <strong>${company.name}</strong>,</p>
    <p>Hemos recibido tu pago correctamente.</p>
    <div class="highlight">
      <p><strong>Monto:</strong> <span class="amount">${amountStr}</span></p>
      <p><strong>Fecha:</strong> ${details.date}</p>
      <p><strong>Referencia:</strong> ${details.invoiceId}</p>
    </div>
    <p style="text-align:center;">
      <a href="${appUrl}/#/financeiro" class="btn">Ver Facturas</a>
    </p>
  `);

  try {
    await sendEmail({ apiKey }, {
      from,
      to: company.email,
      subject: `Recibo de pago – ${amountStr}`,
      html
    });
    logger.info(`SystemEmail -> Payment receipt sent to ${company.email}`);
  } catch (err) {
    logger.error(`SystemEmail -> Payment receipt failed for ${company.email}: ${err.message}`);
  }
};

/**
 * Payment failed – sent when a recurring payment fails
 */
export const sendPaymentFailedEmail = async (
  company: CompanyInfo,
  details: { amount: number; invoiceId: string }
): Promise<void> => {
  if (!isConfigured() || !company.email) return;

  const { apiKey, from, appUrl } = getConfig();
  const amountStr = `US$ ${details.amount.toFixed(2)}`;

  const html = baseLayout(`
    <h2>Pago Fallido</h2>
    <p>Hola <strong>${company.name}</strong>,</p>
    <div class="error">
      <p><strong>No pudimos procesar tu pago de ${amountStr}.</strong></p>
      <p>Referencia: ${details.invoiceId}</p>
    </div>
    <p>Por favor, actualiza tu método de pago para evitar la interrupción del servicio.</p>
    <p style="text-align:center;">
      <a href="${appUrl}/#/financeiro" class="btn">Actualizar Método de Pago</a>
    </p>
    <p>Si crees que esto es un error, contacta a nuestro equipo de soporte.</p>
  `);

  try {
    await sendEmail({ apiKey }, {
      from,
      to: company.email,
      subject: "Pago fallido – Acción requerida",
      html
    });
    logger.info(`SystemEmail -> Payment failed sent to ${company.email}`);
  } catch (err) {
    logger.error(`SystemEmail -> Payment failed email error for ${company.email}: ${err.message}`);
  }
};

/**
 * Subscription cancelled
 */
export const sendSubscriptionCancelledEmail = async (
  company: CompanyInfo
): Promise<void> => {
  if (!isConfigured() || !company.email) return;

  const { apiKey, from, appUrl } = getConfig();

  const html = baseLayout(`
    <h2>Suscripción Cancelada</h2>
    <p>Hola <strong>${company.name}</strong>,</p>
    <p>Tu suscripción a ChateaYA ha sido cancelada.</p>
    ${company.dueDate ? `
    <div class="warning">
      <p>Tu acceso estará disponible hasta el <strong>${company.dueDate}</strong>.</p>
    </div>` : ""}
    <p>Si deseas reactivar tu suscripción, puedes hacerlo desde el panel de facturación.</p>
    <p style="text-align:center;">
      <a href="${appUrl}/#/financeiro" class="btn">Reactivar Suscripción</a>
    </p>
    <p>Lamentamos verte partir. Si tienes comentarios sobre cómo podemos mejorar, nos encantaría escucharte.</p>
  `);

  try {
    await sendEmail({ apiKey }, {
      from,
      to: company.email,
      subject: "Tu suscripción ha sido cancelada",
      html
    });
    logger.info(`SystemEmail -> Cancellation sent to ${company.email}`);
  } catch (err) {
    logger.error(`SystemEmail -> Cancellation email failed for ${company.email}: ${err.message}`);
  }
};

/**
 * Expiration warning – sent X days before dueDate
 */
export const sendExpirationWarningEmail = async (
  company: CompanyInfo,
  daysRemaining: number
): Promise<void> => {
  if (!isConfigured() || !company.email) return;

  const { apiKey, from, appUrl } = getConfig();

  const urgency = daysRemaining <= 1 ? "error" : "warning";
  const urgencyText = daysRemaining <= 1
    ? "Tu suscripción vence <strong>mañana</strong>."
    : `Tu suscripción vence en <strong>${daysRemaining} días</strong>.`;

  const html = baseLayout(`
    <h2>Aviso de Vencimiento</h2>
    <p>Hola <strong>${company.name}</strong>,</p>
    <div class="${urgency}">
      <p>${urgencyText}</p>
      ${company.dueDate ? `<p>Fecha de vencimiento: <strong>${company.dueDate}</strong></p>` : ""}
    </div>
    <p>Para mantener el acceso a tu cuenta y todas tus conversaciones, asegúrate de que tu método de pago esté actualizado.</p>
    <p style="text-align:center;">
      <a href="${appUrl}/#/financeiro" class="btn">Revisar mi Suscripción</a>
    </p>
  `);

  try {
    await sendEmail({ apiKey }, {
      from,
      to: company.email,
      subject: `Tu suscripción vence en ${daysRemaining} día${daysRemaining > 1 ? "s" : ""}`,
      html
    });
    logger.info(`SystemEmail -> Expiration warning (${daysRemaining}d) sent to ${company.email}`);
  } catch (err) {
    logger.error(`SystemEmail -> Expiration warning failed for ${company.email}: ${err.message}`);
  }
};

/**
 * Account expired – sent when dueDate has passed
 */
export const sendAccountExpiredEmail = async (
  company: CompanyInfo
): Promise<void> => {
  if (!isConfigured() || !company.email) return;

  const { apiKey, from, appUrl } = getConfig();

  const html = baseLayout(`
    <h2>Cuenta Vencida</h2>
    <p>Hola <strong>${company.name}</strong>,</p>
    <div class="error">
      <p><strong>Tu suscripción ha expirado.</strong></p>
      <p>El acceso a tu cuenta ha sido restringido.</p>
    </div>
    <p>Tus datos están seguros. Renueva tu suscripción para restaurar el acceso completo a tu cuenta y todas tus conversaciones.</p>
    <p style="text-align:center;">
      <a href="${appUrl}/#/financeiro" class="btn">Renovar Suscripción</a>
    </p>
  `);

  try {
    await sendEmail({ apiKey }, {
      from,
      to: company.email,
      subject: "Tu cuenta ChateaYA ha expirado",
      html
    });
    logger.info(`SystemEmail -> Account expired sent to ${company.email}`);
  } catch (err) {
    logger.error(`SystemEmail -> Account expired email failed for ${company.email}: ${err.message}`);
  }
};
