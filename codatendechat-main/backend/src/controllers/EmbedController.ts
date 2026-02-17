import { Request, Response } from "express";
import crypto from "crypto";
import { sign } from "jsonwebtoken";
import AppError from "../errors/AppError";
import EmbedConfig from "../models/EmbedConfig";
import Company from "../models/Company";
import User from "../models/User";
import authConfig from "../config/auth";
import { logger } from "../utils/logger";

// ---------------------------------------------------------------------------
// Get embed config for a company (admin)
// ---------------------------------------------------------------------------

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;

  const config = await EmbedConfig.findOne({
    where: { companyId },
    include: [{ model: Company, attributes: ["id", "name"] }],
  });

  if (!config) {
    return res.json({ configured: false });
  }

  return res.json({
    configured: true,
    config: {
      id: config.id,
      embedToken: config.embedToken,
      allowedDomains: config.allowedDomains,
      isActive: config.isActive,
      primaryColor: config.primaryColor,
      title: config.title,
      welcomeMessage: config.welcomeMessage,
      createdAt: config.createdAt,
    },
  });
};

// ---------------------------------------------------------------------------
// Create or regenerate embed config
// ---------------------------------------------------------------------------

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { allowedDomains, primaryColor, title, welcomeMessage } = req.body;

  let config = await EmbedConfig.findOne({ where: { companyId } });

  const embedToken = crypto.randomBytes(48).toString("hex");

  if (config) {
    await config.update({
      embedToken,
      allowedDomains: allowedDomains || config.allowedDomains,
      primaryColor: primaryColor || config.primaryColor,
      title: title !== undefined ? title : config.title,
      welcomeMessage:
        welcomeMessage !== undefined ? welcomeMessage : config.welcomeMessage,
      isActive: true,
    });
  } else {
    config = await EmbedConfig.create({
      companyId,
      embedToken,
      allowedDomains: allowedDomains || "",
      isActive: true,
      primaryColor: primaryColor || "#2196f3",
      title: title || "",
      welcomeMessage: welcomeMessage || "",
    });
  }

  logger.info(
    `Embed config created/regenerated for company ${companyId}`
  );

  return res.status(201).json({
    config: {
      id: config.id,
      embedToken: config.embedToken,
      allowedDomains: config.allowedDomains,
      isActive: config.isActive,
      primaryColor: config.primaryColor,
      title: config.title,
      welcomeMessage: config.welcomeMessage,
    },
  });
};

// ---------------------------------------------------------------------------
// Update embed config settings (domains, colors, messages)
// ---------------------------------------------------------------------------

export const update = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { allowedDomains, isActive, primaryColor, title, welcomeMessage } =
    req.body;

  const config = await EmbedConfig.findOne({ where: { companyId } });
  if (!config) {
    throw new AppError(
      "No se ha configurado el embed. Genera un token primero.",
      404
    );
  }

  const updates: any = {};
  if (allowedDomains !== undefined) updates.allowedDomains = allowedDomains;
  if (isActive !== undefined) updates.isActive = isActive;
  if (primaryColor !== undefined) updates.primaryColor = primaryColor;
  if (title !== undefined) updates.title = title;
  if (welcomeMessage !== undefined) updates.welcomeMessage = welcomeMessage;

  await config.update(updates);

  return res.json({
    config: {
      id: config.id,
      embedToken: config.embedToken,
      allowedDomains: config.allowedDomains,
      isActive: config.isActive,
      primaryColor: config.primaryColor,
      title: config.title,
      welcomeMessage: config.welcomeMessage,
    },
  });
};

// ---------------------------------------------------------------------------
// Public: Authenticate user within embed context
// Returns a temporary JWT token for the user to use within the embed
// ---------------------------------------------------------------------------

export const embedLogin = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { email, password } = req.body;
  const embedCompanyId = (req as any).embedCompanyId;

  if (!email || !password) {
    throw new AppError("Email y contraseña son requeridos.", 400);
  }

  // Find user in the embed's company
  const user = await User.findOne({
    where: { email, companyId: embedCompanyId },
  });

  if (!user) {
    throw new AppError("Credenciales inválidas.", 401);
  }

  // Verify password
  const passwordMatch = await user.checkPassword(password);
  if (!passwordMatch) {
    throw new AppError("Credenciales inválidas.", 401);
  }

  // Generate a shorter-lived token for embed context
  const token = sign(
    {
      username: user.name,
      profile: user.profile,
      id: user.id,
      companyId: user.companyId,
    },
    authConfig.secret,
    { expiresIn: "8h" }
  );

  return res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      profile: user.profile,
      companyId: user.companyId,
    },
  });
};

// ---------------------------------------------------------------------------
// Public: Get embed public config (styling, title, etc.)
// ---------------------------------------------------------------------------

export const publicConfig = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const config = (req as any).embedConfig;

  return res.json({
    companyId: config.companyId,
    companyName: config.company?.name || "",
    primaryColor: config.primaryColor,
    title: config.title,
    welcomeMessage: config.welcomeMessage,
  });
};
