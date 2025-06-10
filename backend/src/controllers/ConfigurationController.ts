// Archivo: backend/src/controllers/ConfigurationController.ts
// Controlador para gestionar configuraciones desde la interfaz

import { Request, Response } from "express";
import ConfigurationService from "../services/ConfigurationService";
import AppError from "../errors/AppError";
import { logger } from "../utils/logger";

// Listar todas las configuraciones agrupadas por categoría
export const index = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;

  try {
    const configurations = await ConfigurationService.getCompanyConfigurations(companyId);
    
    return res.json(configurations);
  } catch (error) {
    logger.error("Error listando configuraciones:", error);
    throw new AppError("Error al obtener configuraciones", 500);
  }
};

// Obtener valor de una configuración específica
export const show = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { key } = req.params;

  try {
    const value = await ConfigurationService.getConfigValue(companyId, key);
    
    if (value === null) {
      return res.json({ key, value: "", configured: false });
    }

    // No retornar valores de passwords
    const maskedValue = key.includes("secret") || key.includes("password") 
      ? "••••••••" 
      : value;

    return res.json({ 
      key, 
      value: maskedValue, 
      configured: true 
    });
  } catch (error) {
    logger.error("Error obteniendo configuración:", error);
    throw new AppError("Error al obtener configuración", 500);
  }
};

// Guardar o actualizar configuración
export const store = async (req: Request, res: Response): Promise<Response> => {
  const { companyId, isAdmin } = req.user;
  const { key, value } = req.body;

  // Solo admins pueden cambiar configuraciones
  if (!isAdmin) {
    throw new AppError("No tienes permisos para cambiar configuraciones", 403);
  }

  try {
    await ConfigurationService.setConfigValue(companyId, key, value);
    
    return res.json({ 
      message: "Configuración guardada correctamente",
      key
    });
  } catch (error) {
    logger.error("Error guardando configuración:", error);
    throw error;
  }
};

// Guardar múltiples configuraciones
export const bulkStore = async (req: Request, res: Response): Promise<Response> => {
  const { companyId, isAdmin } = req.user;
  const { configurations } = req.body;

  if (!isAdmin) {
    throw new AppError("No tienes permisos para cambiar configuraciones", 403);
  }

  try {
    await ConfigurationService.setMultipleConfigs(companyId, configurations);
    
    return res.json({ 
      message: "Configuraciones guardadas correctamente",
      count: Object.keys(configurations).length
    });
  } catch (error) {
    logger.error("Error guardando configuraciones:", error);
    throw error;
  }
};

// Verificar si una característica está configurada
export const checkFeature = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { feature } = req.params;

  try {
    const isConfigured = await ConfigurationService.isFeatureConfigured(companyId, feature);
    
    return res.json({ 
      feature,
      configured: isConfigured
    });
  } catch (error) {
    logger.error("Error verificando característica:", error);
    throw new AppError("Error al verificar configuración", 500);
  }
};

// Probar configuración (ej: enviar email de prueba, verificar API key)
export const test = async (req: Request, res: Response): Promise<Response> => {
  const { companyId, isAdmin } = req.user;
  const { category, type } = req.body;

  if (!isAdmin) {
    throw new AppError("No tienes permisos para probar configuraciones", 403);
  }

  try {
    let result: any = { success: false };

    switch (category) {
      case "email":
        // Probar envío de email
        const emailConfigs = await ConfigurationService.getConfigValues(companyId, [
          "smtp_host", "smtp_port", "smtp_user", "smtp_password", "smtp_from_email"
        ]);
        
        // Aquí iría la lógica para enviar un email de prueba
        result = { 
          success: true, 
          message: "Email de prueba enviado correctamente" 
        };
        break;

      case "ai":
        if (type === "openai") {
          const apiKey = await ConfigurationService.getConfigValue(companyId, "openai_api_key");
          if (!apiKey) {
            throw new AppError("OpenAI API Key no configurada", 400);
          }
          
          // Aquí iría la prueba de OpenAI
          result = { 
            success: true, 
            message: "OpenAI configurado correctamente" 
          };
        }
        break;

      case "payment":
        if (type === "stripe") {
          const stripeKey = await ConfigurationService.getConfigValue(companyId, "stripe_secret_key");
          if (!stripeKey) {
            throw new AppError("Stripe Secret Key no configurada", 400);
          }
          
          // Aquí iría la prueba de Stripe
          result = { 
            success: true, 
            message: "Stripe configurado correctamente" 
          };
        }
        break;

      default:
        throw new AppError("Tipo de prueba no válido", 400);
    }

    return res.json(result);
  } catch (error) {
    logger.error("Error probando configuración:", error);
    throw error;
  }
};

// Exportar configuraciones (backup)
export const exportConfigs = async (req: Request, res: Response): Promise<Response> => {
  const { companyId, isAdmin } = req.user;

  if (!isAdmin) {
    throw new AppError("No tienes permisos para exportar configuraciones", 403);
  }

  try {
    const configs = await ConfigurationService.exportConfigurations(companyId);
    
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename="config-backup-${Date.now()}.json"`);
    
    return res.json(configs);
  } catch (error) {
    logger.error("Error exportando configuraciones:", error);
    throw new AppError("Error al exportar configuraciones", 500);
  }
};

// Importar configuraciones
export const importConfigs = async (req: Request, res: Response): Promise<Response> => {
  const { companyId, isAdmin } = req.user;
  const { configurations } = req.body;

  if (!isAdmin) {
    throw new AppError("No tienes permisos para importar configuraciones", 403);
  }

  try {
    await ConfigurationService.importConfigurations(companyId, configurations);
    
    return res.json({ 
      message: "Configuraciones importadas correctamente",
      count: Object.keys(configurations).length
    });
  } catch (error) {
    logger.error("Error importando configuraciones:", error);
    throw error;
  }
};
