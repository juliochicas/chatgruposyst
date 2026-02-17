import { Request, Response } from "express";
import EmailConfig from "../models/EmailConfig";
import AppError from "../errors/AppError";
import { listDomains, sendEmail } from "../services/EmailServices/ResendAPI";

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const configs = await EmailConfig.findAll({ where: { companyId } });
  return res.status(200).json(configs);
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { apiKey, fromEmail, fromName, replyTo } = req.body;

  if (!apiKey || !fromEmail || !fromName) {
    throw new AppError("API Key, email remitente y nombre son requeridos");
  }

  const existing = await EmailConfig.findOne({ where: { companyId } });

  let config;
  if (existing) {
    await existing.update({ apiKey, fromEmail, fromName, replyTo });
    config = existing;
  } else {
    config = await EmailConfig.create({
      apiKey,
      fromEmail,
      fromName,
      replyTo,
      companyId,
      isActive: false
    });
  }

  return res.status(200).json(config);
};

export const update = async (req: Request, res: Response): Promise<Response> => {
  const { id } = req.params;
  const { companyId } = req.user;
  const data = req.body;

  const config = await EmailConfig.findOne({ where: { id, companyId } });
  if (!config) throw new AppError("ERR_EMAIL_CONFIG_NOT_FOUND", 404);

  await config.update(data);
  return res.status(200).json(config);
};

export const remove = async (req: Request, res: Response): Promise<Response> => {
  const { id } = req.params;
  const { companyId } = req.user;

  const config = await EmailConfig.findOne({ where: { id, companyId } });
  if (!config) throw new AppError("ERR_EMAIL_CONFIG_NOT_FOUND", 404);

  await config.destroy();
  return res.status(200).json({ message: "Configuracion eliminada" });
};

export const testConnection = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const config = await EmailConfig.findOne({ where: { companyId } });

  if (!config) throw new AppError("ERR_EMAIL_CONFIG_NOT_FOUND", 404);

  try {
    const domains = await listDomains({ apiKey: config.apiKey });

    await config.update({ isActive: true });

    return res.status(200).json({
      success: true,
      domains: domains.data || [],
      message: "Conexion exitosa con Resend"
    });
  } catch (error: any) {
    await config.update({ isActive: false });
    return res.status(200).json({
      success: false,
      message: error.message
    });
  }
};

export const sendTestEmail = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { testEmail } = req.body;

  if (!testEmail) throw new AppError("Email de prueba requerido");

  const config = await EmailConfig.findOne({ where: { companyId } });
  if (!config) throw new AppError("ERR_EMAIL_CONFIG_NOT_FOUND", 404);

  try {
    const result = await sendEmail(
      { apiKey: config.apiKey },
      {
        from: `${config.fromName} <${config.fromEmail}>`,
        to: testEmail,
        subject: "Email de prueba - ChateaYA",
        html: `<h2>Email de prueba</h2><p>Este es un email de prueba enviado desde ChateaYA usando Resend.</p><p>Si recibes este email, la configuracion funciona correctamente.</p>`,
        replyTo: config.replyTo || undefined
      }
    );

    return res.status(200).json({
      success: true,
      emailId: result.id,
      message: `Email de prueba enviado a ${testEmail}`
    });
  } catch (error: any) {
    return res.status(200).json({
      success: false,
      message: error.message
    });
  }
};

export const getStatus = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const config = await EmailConfig.findOne({ where: { companyId } });

  if (!config) {
    return res.status(200).json({ configured: false });
  }

  return res.status(200).json({
    configured: true,
    isActive: config.isActive,
    fromEmail: config.fromEmail,
    fromName: config.fromName
  });
};
