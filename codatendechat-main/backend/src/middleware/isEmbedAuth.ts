import { Request, Response, NextFunction } from "express";
import AppError from "../errors/AppError";
import EmbedConfig from "../models/EmbedConfig";
import Company from "../models/Company";

/**
 * Middleware that validates embed tokens for iframe/widget authentication.
 * Sets req.embedConfig and req.embedCompanyId on success.
 */
const isEmbedAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  const embedToken =
    (req.headers["x-embed-token"] as string) ||
    (req.query.embedToken as string);

  if (!embedToken) {
    throw new AppError("Token de embed no proporcionado.", 401);
  }

  const config = await EmbedConfig.findOne({
    where: { embedToken, isActive: true },
    include: [{ model: Company, attributes: ["id", "name", "status", "dueDate"] }],
  });

  if (!config) {
    throw new AppError("Token de embed inválido o desactivado.", 403);
  }

  if (!config.company || config.company.status === false) {
    throw new AppError("La empresa asociada está desactivada.", 403);
  }

  // Check company expiration
  if (config.company.dueDate) {
    const dueDate = new Date(config.company.dueDate);
    if (dueDate < new Date()) {
      throw new AppError("La suscripción de la empresa ha expirado.", 403);
    }
  }

  // Validate origin domain if allowedDomains is configured
  const origin = req.headers.origin || req.headers.referer;
  if (config.allowedDomains && origin) {
    const domains = config.allowedDomains
      .split(",")
      .map((d: string) => d.trim().toLowerCase())
      .filter(Boolean);

    if (domains.length > 0) {
      const originHost = new URL(origin).hostname.toLowerCase();
      const isAllowed = domains.some(
        (domain) =>
          originHost === domain || originHost.endsWith(`.${domain}`)
      );

      if (!isAllowed) {
        throw new AppError("Dominio no autorizado para este embed.", 403);
      }
    }
  }

  // Attach embed info to request
  (req as any).embedConfig = config;
  (req as any).embedCompanyId = config.companyId;

  return next();
};

export default isEmbedAuth;
