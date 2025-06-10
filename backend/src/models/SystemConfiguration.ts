// Archivo: backend/src/models/SystemConfiguration.ts
// Configuraciones globales del sistema manejadas desde la interfaz

import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  AutoIncrement,
  CreatedAt,
  UpdatedAt,
  ForeignKey,
  BelongsTo,
  Default
} from "sequelize-typescript";
import Company from "./Company";

@Table
class SystemConfiguration extends Model<SystemConfiguration> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => Company)
  @Column
  companyId: number;

  @Column(DataType.STRING)
  category: string; // "meta", "tiktok", "stripe", "ai", "smtp", etc.

  @Column(DataType.STRING)
  key: string; // "app_id", "app_secret", etc.

  @Column(DataType.TEXT)
  value: string; // Valor encriptado

  @Column(DataType.STRING)
  displayName: string; // "Facebook App ID"

  @Column(DataType.TEXT)
  description: string; // "Obtén este ID desde developers.facebook.com"

  @Column(DataType.STRING)
  type: string; // "text", "password", "select", "boolean"

  @Default(false)
  @Column(DataType.BOOLEAN)
  isRequired: boolean;

  @Default(true)
  @Column(DataType.BOOLEAN)
  isActive: boolean;

  @Column(DataType.JSON)
  validation: {
    pattern?: string;
    minLength?: number;
    maxLength?: number;
    options?: string[];
  };

  @Column(DataType.STRING)
  helpUrl: string; // Link a documentación

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;

  @BelongsTo(() => Company)
  company: Company;
}

// Configuraciones predefinidas del sistema
export const DEFAULT_CONFIGURATIONS = [
  // Meta (Facebook/Instagram)
  {
    category: "meta",
    key: "facebook_app_id",
    displayName: "Facebook App ID",
    description: "ID de tu aplicación de Facebook. Obténlo en developers.facebook.com",
    type: "text",
    isRequired: false,
    validation: { pattern: "^[0-9]+$" },
    helpUrl: "https://developers.facebook.com/docs/apps"
  },
  {
    category: "meta",
    key: "facebook_app_secret",
    displayName: "Facebook App Secret",
    description: "Clave secreta de tu aplicación de Facebook",
    type: "password",
    isRequired: false,
    validation: { minLength: 32 },
    helpUrl: "https://developers.facebook.com/docs/apps"
  },
  {
    category: "meta",
    key: "instagram_app_secret",
    displayName: "Instagram App Secret",
    description: "Clave secreta para Instagram Business",
    type: "password",
    isRequired: false,
    validation: { minLength: 32 },
    helpUrl: "https://developers.facebook.com/docs/instagram-api"
  },
  
  // TikTok
  {
    category: "tiktok",
    key: "tiktok_client_key",
    displayName: "TikTok Client Key",
    description: "Client Key de tu app de TikTok for Business",
    type: "text",
    isRequired: false,
    helpUrl: "https://developers.tiktok.com"
  },
  {
    category: "tiktok",
    key: "tiktok_client_secret",
    displayName: "TikTok Client Secret",
    description: "Client Secret de TikTok",
    type: "password",
    isRequired: false,
    helpUrl: "https://developers.tiktok.com"
  },
  
  // Stripe
  {
    category: "payment",
    key: "stripe_publishable_key",
    displayName: "Stripe Publishable Key",
    description: "Clave pública de Stripe (comienza con pk_)",
    type: "text",
    isRequired: false,
    validation: { pattern: "^pk_(test|live)_" },
    helpUrl: "https://dashboard.stripe.com/apikeys"
  },
  {
    category: "payment",
    key: "stripe_secret_key",
    displayName: "Stripe Secret Key",
    description: "Clave secreta de Stripe (comienza con sk_)",
    type: "password",
    isRequired: false,
    validation: { pattern: "^sk_(test|live)_" },
    helpUrl: "https://dashboard.stripe.com/apikeys"
  },
  
  // OpenAI
  {
    category: "ai",
    key: "openai_api_key",
    displayName: "OpenAI API Key",
    description: "Tu clave API de OpenAI para ChatGPT",
    type: "password",
    isRequired: false,
    validation: { pattern: "^sk-" },
    helpUrl: "https://platform.openai.com/api-keys"
  },
  {
    category: "ai",
    key: "openai_model",
    displayName: "Modelo de OpenAI",
    description: "Modelo de IA a utilizar",
    type: "select",
    isRequired: false,
    validation: { 
      options: ["gpt-3.5-turbo", "gpt-4", "gpt-4-turbo-preview"] 
    }
  },
  
  // Anthropic (Claude)
  {
    category: "ai",
    key: "anthropic_api_key",
    displayName: "Anthropic API Key",
    description: "Tu clave API de Anthropic para Claude",
    type: "password",
    isRequired: false,
    helpUrl: "https://console.anthropic.com/account/keys"
  },
  
  // Shopify
  {
    category: "ecommerce",
    key: "shopify_store_domain",
    displayName: "Dominio de Shopify",
    description: "Tu tienda .myshopify.com",
    type: "text",
    isRequired: false,
    validation: { pattern: ".*\\.myshopify\\.com$" }
  },
  {
    category: "ecommerce",
    key: "shopify_access_token",
    displayName: "Shopify Access Token",
    description: "Token de acceso privado de Shopify",
    type: "password",
    isRequired: false
  },
  
  // SMTP
  {
    category: "email",
    key: "smtp_host",
    displayName: "Servidor SMTP",
    description: "Servidor de correo saliente",
    type: "text",
    isRequired: true,
    validation: { pattern: "^[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$" }
  },
  {
    category: "email",
    key: "smtp_port",
    displayName: "Puerto SMTP",
    description: "Puerto del servidor SMTP",
    type: "select",
    isRequired: true,
    validation: { options: ["25", "465", "587", "2525"] }
  },
  {
    category: "email",
    key: "smtp_user",
    displayName: "Usuario SMTP",
    description: "Usuario para autenticación SMTP",
    type: "text",
    isRequired: true
  },
  {
    category: "email",
    key: "smtp_password",
    displayName: "Contraseña SMTP",
    description: "Contraseña SMTP",
    type: "password",
    isRequired: true
  },
  {
    category: "email",
    key: "smtp_from_email",
    displayName: "Email remitente",
    description: "Email que aparecerá como remitente",
    type: "email",
    isRequired: true
  }
];

export default SystemConfiguration;
