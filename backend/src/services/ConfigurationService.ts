// Archivo: backend/src/services/ConfigurationService.ts
// Servicio para gestionar configuraciones de forma segura

import SystemConfiguration, { DEFAULT_CONFIGURATIONS } from "../models/SystemConfiguration";
import AppError from "../errors/AppError";
import { logger } from "../utils/logger";
import crypto from "crypto";

// Clave de encriptación (en producción usar variable de entorno)
const ENCRYPTION_KEY = process.env.CONFIG_ENCRYPTION_KEY || crypto.randomBytes(32);
const IV_LENGTH = 16;

export class ConfigurationService {
  // Encriptar valor sensible
  private static encrypt(text: string): string {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(
      "aes-256-cbc",
      Buffer.from(ENCRYPTION_KEY),
      iv
    );
    
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    
    return iv.toString("hex") + ":" + encrypted.toString("hex");
  }

  // Desencriptar valor
  private static decrypt(text: string): string {
    const textParts = text.split(":");
    const iv = Buffer.from(textParts.shift()!, "hex");
    const encryptedText = Buffer.from(textParts.join(":"), "hex");
    
    const decipher = crypto.createDecipheriv(
      "aes-256-cbc",
      Buffer.from(ENCRYPTION_KEY),
      iv
    );
    
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    
    return decrypted.toString();
  }

  // Obtener todas las configuraciones de una empresa
  static async getCompanyConfigurations(companyId: number): Promise<any> {
    try {
      const configs = await SystemConfiguration.findAll({
        where: { companyId, isActive: true },
        attributes: ["id", "category", "key", "displayName", "description", "type", "validation", "helpUrl", "isRequired"]
      });

      // Agrupar por categoría
      const grouped = configs.reduce((acc: any, config) => {
        if (!acc[config.category]) {
          acc[config.category] = {
            name: this.getCategoryName(config.category),
            icon: this.getCategoryIcon(config.category),
            configs: []
          };
        }
        
        acc[config.category].configs.push({
          ...config.toJSON(),
          value: "" // No enviar valores en listado
        });
        
        return acc;
      }, {});

      return grouped;
    } catch (error) {
      logger.error("Error obteniendo configuraciones:", error);
      throw new AppError("Error al obtener configuraciones", 500);
    }
  }

  // Obtener valor de una configuración específica
  static async getConfigValue(companyId: number, key: string): Promise<string | null> {
    try {
      const config = await SystemConfiguration.findOne({
        where: { companyId, key, isActive: true }
      });

      if (!config) {
        return null;
      }

      // Desencriptar si es tipo password
      if (config.type === "password" && config.value) {
        return this.decrypt(config.value);
      }

      return config.value;
    } catch (error) {
      logger.error("Error obteniendo valor de configuración:", error);
      return null;
    }
  }

  // Obtener múltiples valores
  static async getConfigValues(companyId: number, keys: string[]): Promise<Record<string, string>> {
    const values: Record<string, string> = {};
    
    for (const key of keys) {
      const value = await this.getConfigValue(companyId, key);
      if (value) {
        values[key] = value;
      }
    }
    
    return values;
  }

  // Guardar o actualizar configuración
  static async setConfigValue(
    companyId: number,
    key: string,
    value: string
  ): Promise<SystemConfiguration> {
    try {
      // Buscar configuración predefinida
      const defaultConfig = DEFAULT_CONFIGURATIONS.find(c => c.key === key);
      
      if (!defaultConfig) {
        throw new AppError("Configuración no válida", 400);
      }

      // Validar valor según el tipo
      if (!this.validateConfigValue(value, defaultConfig)) {
        throw new AppError("Valor de configuración inválido", 400);
      }

      // Encriptar si es tipo password
      const finalValue = defaultConfig.type === "password" ? this.encrypt(value) : value;

      // Buscar configuración existente
      let config = await SystemConfiguration.findOne({
        where: { companyId, key }
      });

      if (config) {
        // Actualizar
        await config.update({ value: finalValue });
      } else {
        // Crear nueva
        config = await SystemConfiguration.create({
          companyId,
          category: defaultConfig.category,
          key: defaultConfig.key,
          value: finalValue,
          displayName: defaultConfig.displayName,
          description: defaultConfig.description,
          type: defaultConfig.type,
          isRequired: defaultConfig.isRequired,
          validation: defaultConfig.validation,
          helpUrl: defaultConfig.helpUrl
        });
      }

      // Limpiar caché si existe
      this.clearConfigCache(companyId, key);

      return config;
    } catch (error) {
      logger.error("Error guardando configuración:", error);
      throw error;
    }
  }

  // Guardar múltiples configuraciones
  static async setMultipleConfigs(
    companyId: number,
    configs: Record<string, string>
  ): Promise<void> {
    for (const [key, value] of Object.entries(configs)) {
      await this.setConfigValue(companyId, key, value);
    }
  }

  // Validar valor según tipo y reglas
  private static validateConfigValue(value: string, config: any): boolean {
    if (!value && config.isRequired) {
      return false;
    }

    if (!value) {
      return true;
    }

    // Validar según tipo
    switch (config.type) {
      case "email":
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      
      case "select":
        return config.validation?.options?.includes(value) || false;
      
      case "text":
      case "password":
        if (config.validation?.pattern) {
          return new RegExp(config.validation.pattern).test(value);
        }
        if (config.validation?.minLength && value.length < config.validation.minLength) {
          return false;
        }
        if (config.validation?.maxLength && value.length > config.validation.maxLength) {
          return false;
        }
        return true;
      
      case "boolean":
        return ["true", "false", "1", "0"].includes(value);
      
      default:
        return true;
    }
  }

  // Inicializar configuraciones por defecto para nueva empresa
  static async initializeCompanyConfigs(companyId: number): Promise<void> {
    try {
      // Solo crear las configuraciones requeridas
      const requiredConfigs = DEFAULT_CONFIGURATIONS.filter(c => c.isRequired);
      
      for (const config of requiredConfigs) {
        await SystemConfiguration.create({
          companyId,
          ...config,
          value: "" // Valor vacío inicial
        });
      }
    } catch (error) {
      logger.error("Error inicializando configuraciones:", error);
      throw error;
    }
  }

  // Verificar si una característica está configurada
  static async isFeatureConfigured(companyId: number, feature: string): Promise<boolean> {
    const requiredKeys = this.getRequiredKeysForFeature(feature);
    
    for (const key of requiredKeys) {
      const value = await this.getConfigValue(companyId, key);
      if (!value) {
        return false;
      }
    }
    
    return true;
  }

  // Obtener claves requeridas para una característica
  private static getRequiredKeysForFeature(feature: string): string[] {
    const featureKeys: Record<string, string[]> = {
      facebook: ["facebook_app_id", "facebook_app_secret"],
      instagram: ["facebook_app_id", "instagram_app_secret"],
      tiktok: ["tiktok_client_key", "tiktok_client_secret"],
      stripe: ["stripe_publishable_key", "stripe_secret_key"],
      openai: ["openai_api_key"],
      anthropic: ["anthropic_api_key"],
      shopify: ["shopify_store_domain", "shopify_access_token"],
      email: ["smtp_host", "smtp_port", "smtp_user", "smtp_password", "smtp_from_email"]
    };
    
    return featureKeys[feature] || [];
  }

  // Helpers para UI
  private static getCategoryName(category: string): string {
    const names: Record<string, string> = {
      meta: "Meta (Facebook/Instagram)",
      tiktok: "TikTok",
      payment: "Pagos",
      ai: "Inteligencia Artificial",
      ecommerce: "E-commerce",
      email: "Correo Electrónico"
    };
    
    return names[category] || category;
  }

  private static getCategoryIcon(category: string): string {
    const icons: Record<string, string> = {
      meta: "👥",
      tiktok: "🎵",
      payment: "💳",
      ai: "🤖",
      ecommerce: "🛍️",
      email: "📧"
    };
    
    return icons[category] || "⚙️";
  }

  // Limpiar caché (si implementas caché)
  private static clearConfigCache(companyId: number, key: string): void {
    // Implementar si usas Redis o caché en memoria
  }

  // Exportar configuraciones (para backup)
  static async exportConfigurations(companyId: number): Promise<any> {
    const configs = await SystemConfiguration.findAll({
      where: { companyId },
      attributes: ["key", "value", "type"]
    });

    const exported: Record<string, string> = {};
    
    for (const config of configs) {
      // No exportar valores encriptados
      if (config.type !== "password") {
        exported[config.key] = config.value;
      }
    }
    
    return exported;
  }

  // Importar configuraciones
  static async importConfigurations(
    companyId: number,
    configs: Record<string, string>
  ): Promise<void> {
    for (const [key, value] of Object.entries(configs)) {
      try {
        await this.setConfigValue(companyId, key, value);
      } catch (error) {
        logger.warn(`Error importando config ${key}:`, error);
      }
    }
  }
}

// Función helper para uso en otros servicios
export async function getConfig(companyId: number, key: string): Promise<string | null> {
  return ConfigurationService.getConfigValue(companyId, key);
}

export default ConfigurationService;
