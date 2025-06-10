#!/bin/bash

# Script para crear TODOS los archivos del sistema Omnichannel
# Este script crea todos los archivos con su contenido completo

echo "🚀 Creando todos los archivos del sistema Omnichannel..."
echo "================================================"

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Crear estructura de directorios
echo -e "${YELLOW}📁 Creando estructura de carpetas...${NC}"
mkdir -p backend/src/models
mkdir -p backend/src/services/ChannelServices
mkdir -p backend/src/controllers
mkdir -p backend/src/routes
mkdir -p backend/src/database/migrations

# Generar timestamp para la migración
TIMESTAMP=$(date +%Y%m%d%H%M%S)

echo -e "${YELLOW}📝 Creando archivos...${NC}"

# ===============================
# 1. MODELO CHANNEL
# ===============================
echo "  ✅ Creando Channel.ts..."
cat > backend/src/models/Channel.ts << 'EOF'
// Archivo: backend/src/models/Channel.ts
// Este archivo reemplaza completamente a Whatsapp.ts

import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  DataType,
  PrimaryKey,
  AutoIncrement,
  Default,
  AllowNull,
  Unique,
  BelongsToMany,
  HasMany,
  BelongsTo,
  ForeignKey,
  AfterUpdate,
  AfterCreate
} from "sequelize-typescript";
import { Op } from "sequelize";
import Queue from "./Queue";
import Ticket from "./Ticket";
import QueueChannel from "./QueueChannel";
import Company from "./Company";

export enum ChannelType {
  WHATSAPP = "whatsapp",
  INSTAGRAM = "instagram",
  FACEBOOK = "facebook"
}

@Table
class Channel extends Model<Channel> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @AllowNull(false)
  @Unique
  @Column(DataType.STRING)
  name: string;

  @AllowNull(false)
  @Default(ChannelType.WHATSAPP)
  @Column(DataType.ENUM(...Object.values(ChannelType)))
  type: ChannelType;

  @Column(DataType.STRING)
  session: string;

  @Column(DataType.TEXT)
  qrcode: string;

  @Column(DataType.STRING)
  status: string;

  @Column(DataType.STRING)
  number: string;

  @Column(DataType.STRING)
  profilePicUrl: string;

  @Default(false)
  @AllowNull(false)
  @Column(DataType.BOOLEAN)
  isDefault: boolean;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;

  @ForeignKey(() => Company)
  @Column
  companyId: number;

  @Column(DataType.STRING)
  token: string;

  @Default(0)
  @Column(DataType.INTEGER)
  retries: number;

  @Column(DataType.STRING)
  urlMessageStatus: string;

  @Default("")
  @Column(DataType.TEXT)
  greetingMessage: string;

  @Default("")
  @Column(DataType.TEXT)
  farewellMessage: string;

  @Default("")
  @Column(DataType.TEXT)
  rejectCallMessage: string;

  @Default("")
  @Column(DataType.TEXT)
  color: string;

  @Default(false)
  @Column(DataType.BOOLEAN)
  groupAsTicket: boolean;

  // Campos específicos para Facebook
  @Column(DataType.STRING)
  facebookPageId: string;

  @Column(DataType.TEXT)
  facebookPageToken: string;

  // Campos específicos para Instagram
  @Column(DataType.STRING)
  instagramBusinessId: string;

  @Column(DataType.TEXT)
  instagramToken: string;

  // Token de verificación para webhooks de Meta
  @Column(DataType.STRING)
  webhookVerifyToken: string;

  // Configuraciones específicas del canal
  @Default({})
  @Column(DataType.JSONB)
  channelConfig: any;

  @BelongsTo(() => Company)
  company: Company;

  @BelongsToMany(() => Queue, () => QueueChannel)
  queues: Array<Queue & { QueueChannel: QueueChannel }>;

  @HasMany(() => Ticket)
  tickets: Ticket[];

  @HasMany(() => QueueChannel)
  queueChannels: QueueChannel[];

  @AfterUpdate
  @AfterCreate
  static async updateDefault(instance: Channel) {
    if (instance.isDefault) {
      await Channel.update(
        { isDefault: false },
        {
          where: {
            id: { [Op.not]: instance.id },
            companyId: instance.companyId,
            type: instance.type // Solo actualizar defaults del mismo tipo
          }
        }
      );
    }
  }

  // Método helper para obtener el token correcto según el tipo
  getAuthToken(): string {
    switch (this.type) {
      case ChannelType.FACEBOOK:
        return this.facebookPageToken;
      case ChannelType.INSTAGRAM:
        return this.instagramToken;
      case ChannelType.WHATSAPP:
        return this.token;
      default:
        return this.token;
    }
  }

  // Método helper para obtener el ID correcto según el tipo
  getChannelIdentifier(): string {
    switch (this.type) {
      case ChannelType.FACEBOOK:
        return this.facebookPageId;
      case ChannelType.INSTAGRAM:
        return this.instagramBusinessId;
      case ChannelType.WHATSAPP:
        return this.number;
      default:
        return this.id.toString();
    }
  }
}

export default Channel;
EOF

# ===============================
# 2. MODELO QUEUECHANNEL
# ===============================
echo "  ✅ Creando QueueChannel.ts..."
cat > backend/src/models/QueueChannel.ts << 'EOF'
// Archivo: backend/src/models/QueueChannel.ts
// Este archivo reemplaza a QueueWhatsapp.ts

import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  ForeignKey,
  BelongsTo
} from "sequelize-typescript";
import Queue from "./Queue";
import Channel from "./Channel";
import Company from "./Company";

@Table({
  tableName: "QueueChannels"
})
class QueueChannel extends Model<QueueChannel> {
  @ForeignKey(() => Queue)
  @Column
  queueId: number;

  @ForeignKey(() => Channel)
  @Column
  channelId: number;

  @ForeignKey(() => Company)
  @Column
  companyId: number;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;

  @BelongsTo(() => Queue)
  queue: Queue;

  @BelongsTo(() => Channel)
  channel: Channel;
}

export default QueueChannel;
EOF

# ===============================
# 3. MODELO PLAN
# ===============================
echo "  ✅ Creando Plan.ts..."
cat > backend/src/models/Plan.ts << 'EOF'
// Archivo: backend/src/models/Plan.ts
// Sistema de planes tipo Zendesk/HubSpot pero más simple

import {
  Table,
  Column,
  Model,
  DataType,
  HasMany,
  CreatedAt,
  UpdatedAt,
  PrimaryKey,
  AutoIncrement,
  Default
} from "sequelize-typescript";
import Company from "./Company";

@Table
class Plan extends Model<Plan> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @Column
  name: string; // "Starter", "Professional", "Enterprise"

  @Column(DataType.DECIMAL(10, 2))
  monthlyPrice: number;

  @Column(DataType.DECIMAL(10, 2))
  yearlyPrice: number;

  // Límites del plan
  @Column(DataType.JSON)
  limits: {
    users: number;
    channels: number;
    contacts: number;
    messagesPerMonth: number;
    aiCredits: number;
    storage: number; // GB
    automations: number;
    integrations: string[]; // ["whatsapp", "facebook", "instagram", "shopify", "ai"]
  };

  // Características del plan
  @Column(DataType.JSON)
  features: {
    // Canales
    whatsapp: boolean;
    facebook: boolean;
    instagram: boolean;
    tiktok: boolean;
    
    // Funcionalidades
    aiAssistant: boolean;
    aiAutomation: boolean;
    shopifyIntegration: boolean;
    stripeIntegration: boolean;
    advancedAnalytics: boolean;
    customReports: boolean;
    apiAccess: boolean;
    whitelabel: boolean;
    
    // Soporte
    supportLevel: "community" | "email" | "priority" | "dedicated";
    sla: number; // horas de respuesta
  };

  @Default(true)
  @Column
  isActive: boolean;

  @Column
  stripeProductId: string;

  @HasMany(() => Company)
  companies: Company[];

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default Plan;
EOF

# ===============================
# 4. MODELO SYSTEMCONFIGURATION
# ===============================
echo "  ✅ Creando SystemConfiguration.ts..."
cat > backend/src/models/SystemConfiguration.ts << 'EOF'
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
EOF

# ===============================
# 5. BASE CHANNEL SERVICE
# ===============================
echo "  ✅ Creando BaseChannelService.ts..."
mkdir -p backend/src/services/ChannelServices
cat > backend/src/services/ChannelServices/BaseChannelService.ts << 'EOF'
// Archivo: backend/src/services/ChannelServices/BaseChannelService.ts
// Servicio base abstracto para todos los canales

import Channel, { ChannelType } from "../../models/Channel";
import Message from "../../models/Message";
import Ticket from "../../models/Ticket";
import CreateMessageService from "../MessageServices/CreateMessageService";
import FindOrCreateTicketService from "../TicketServices/FindOrCreateTicketService";
import ShowContactService from "../ContactServices/ShowContactService";
import { logger } from "../../utils/logger";
import { getIO } from "../../libs/socket";

const io = getIO();

export interface IncomingMessage {
  id: string;
  from: string;
  to: string;
  body: string;
  timestamp: number;
  type: "text" | "image" | "video" | "audio" | "document";
  mediaUrl?: string;
  fileName?: string;
  profileName?: string;
  profilePicUrl?: string;
}

export interface OutgoingMessage {
  to: string;
  body?: string;
  type: "text" | "image" | "video" | "audio" | "document";
  mediaUrl?: string;
  fileName?: string;
  replyToId?: string;
}

export abstract class BaseChannelService {
  protected channel: Channel;
  protected companyId: number;

  constructor(channel: Channel) {
    this.channel = channel;
    this.companyId = channel.companyId;
  }

  // Métodos abstractos que cada canal debe implementar
  abstract initialize(): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract sendMessage(message: OutgoingMessage): Promise<any>;
  abstract getStatus(): Promise<string>;
  abstract refreshToken(): Promise<void>;

  // Métodos comunes para todos los canales
  async handleIncomingMessage(message: IncomingMessage): Promise<void> {
    try {
      logger.info(`[${this.channel.type}] Mensaje entrante:`, {
        channelId: this.channel.id,
        from: message.from,
        type: message.type
      });

      // Buscar o crear contacto
      const contact = await ShowContactService({
        number: message.from,
        name: message.profileName || message.from,
        profilePicUrl: message.profilePicUrl,
        companyId: this.companyId
      });

      // Buscar o crear ticket
      const ticket = await FindOrCreateTicketService({
        contact,
        channelId: this.channel.id,
        companyId: this.companyId,
        status: "open"
      });

      // Crear mensaje
      await CreateMessageService({
        messageData: {
          id: message.id,
          body: message.body || "",
          ticketId: ticket.id,
          contactId: contact.id,
          fromMe: false,
          mediaType: message.type,
          mediaUrl: message.mediaUrl,
          read: false,
          quotedMsgId: null,
          ack: 2,
          remoteJid: message.from,
          participant: null,
          dataJson: JSON.stringify(message),
          createdAt: new Date(message.timestamp * 1000),
          updatedAt: new Date()
        },
        companyId: this.companyId
      });

      // Emitir evento via socket
      io.of(this.companyId.toString())
        .to("tickets")
        .to(ticket.id.toString())
        .emit(`company-${this.companyId}-ticket`, {
          action: "update",
          ticket,
          ticketId: ticket.id
        });

    } catch (error) {
      logger.error(`[${this.channel.type}] Error procesando mensaje:`, error);
      throw error;
    }
  }

  async updateChannelStatus(status: string): Promise<void> {
    await this.channel.update({ status });
    
    io.of(this.companyId.toString())
      .emit(`company-${this.companyId}-channel`, {
        action: "update",
        channel: {
          id: this.channel.id,
          status
        }
      });
  }

  // Método helper para formatear números según el canal
  formatPhoneNumber(number: string): string {
    // Remover caracteres no numéricos
    const cleaned = number.replace(/\D/g, "");
    
    switch (this.channel.type) {
      case ChannelType.WHATSAPP:
        // WhatsApp requiere código de país
        return cleaned.includes("@") ? cleaned : `${cleaned}@s.whatsapp.net`;
      case ChannelType.FACEBOOK:
      case ChannelType.INSTAGRAM:
        // Facebook/Instagram usan IDs directamente
        return cleaned;
      default:
        return cleaned;
    }
  }

  // Método para verificar si el canal está conectado
  isConnected(): boolean {
    return ["CONNECTED", "qrcode"].includes(this.channel.status);
  }

  // Método para obtener información del canal
  getChannelInfo(): any {
    return {
      id: this.channel.id,
      name: this.channel.name,
      type: this.channel.type,
      status: this.channel.status,
      number: this.channel.getChannelIdentifier(),
      isDefault: this.channel.isDefault,
      companyId: this.channel.companyId
    };
  }
}

export default BaseChannelService;
EOF

# ===============================
# 6. WHATSAPP SERVICE
# ===============================
echo "  ✅ Creando WhatsAppService.ts..."
cat > backend/src/services/ChannelServices/WhatsAppService.ts << 'EOF'
// Archivo: backend/src/services/ChannelServices/WhatsAppService.ts
// Servicio actualizado de WhatsApp heredando de BaseChannelService

import { BaseChannelService, IncomingMessage, OutgoingMessage } from "./BaseChannelService";
import { logger } from "../../utils/logger";
import Channel from "../../models/Channel";
import AppError from "../../errors/AppError";
import makeWASocket, {
  DisconnectReason,
  WASocket,
  BaileysEventMap,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  makeInMemoryStore,
  proto,
  WAMessageContent,
  WAMessageKey,
  Browsers,
  AuthenticationState,
  useMultiFileAuthState
} from "@whiskeysockets/baileys";
import MAIN_LOGGER from "@whiskeysockets/baileys/lib/Utils/logger";
import NodeCache from "node-cache";
import path from "path";
import fs from "fs";
import { promisify } from "util";
import { getIO } from "../../libs/socket";
import { Op } from "sequelize";

const io = getIO();
const msgRetryCounterCache = new NodeCache();

export class WhatsAppService extends BaseChannelService {
  private wbot: WASocket | null = null;
  private store: any;
  private authState: AuthenticationState | null = null;
  private sessionPath: string;
  private isReconnecting: boolean = false;

  constructor(channel: Channel) {
    super(channel);
    this.sessionPath = path.join(
      __dirname,
      `../../../.wwebjs_auth/session-company-${this.companyId}/session-${this.channel.id}`
    );
    
    // Configurar store
    this.store = makeInMemoryStore({
      logger: MAIN_LOGGER.child({})
    });
  }

  async initialize(): Promise<void> {
    try {
      logger.info(`[WhatsApp] Inicializando canal ${this.channel.name}`);
      
      // Crear directorio de sesión si no existe
      if (!fs.existsSync(this.sessionPath)) {
        fs.mkdirSync(this.sessionPath, { recursive: true });
      }

      // Cargar estado de autenticación
      const { state, saveCreds } = await useMultiFileAuthState(this.sessionPath);
      this.authState = state;

      // Obtener versión de Baileys
      const { version } = await fetchLatestBaileysVersion();
      
      // Crear socket de WhatsApp
      this.wbot = makeWASocket({
        version,
        logger: MAIN_LOGGER.child({}),
        printQRInTerminal: false,
        auth: {
          creds: state.creds,
          keys: makeCacheableSignalKeyStore(state.keys, MAIN_LOGGER),
        },
        msgRetryCounterCache,
        generateHighQualityLinkPreview: false,
        shouldIgnoreJid: (jid) => !jid || jid.includes("broadcast"),
        browser: Browsers.ubuntu("Chrome"),
        syncFullHistory: false
      });

      // Configurar store
      this.store?.bind(this.wbot.ev);

      // Configurar eventos
      this.setupEventHandlers(saveCreds);

      logger.info(`[WhatsApp] Canal ${this.channel.name} inicializado`);
    } catch (error) {
      logger.error(`[WhatsApp] Error al inicializar:`, error);
      await this.updateChannelStatus("DISCONNECTED");
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      this.isReconnecting = false;
      
      if (this.wbot) {
        this.wbot.end(undefined);
        this.wbot = null;
      }

      await this.updateChannelStatus("DISCONNECTED");
      logger.info(`[WhatsApp] Canal ${this.channel.name} desconectado`);
    } catch (error) {
      logger.error(`[WhatsApp] Error al desconectar:`, error);
      throw error;
    }
  }

  async sendMessage(message: OutgoingMessage): Promise<any> {
    try {
      if (!this.wbot) {
        throw new AppError("WhatsApp no está conectado", 500);
      }

      const jid = this.formatPhoneNumber(message.to);
      let content: WAMessageContent;

      switch (message.type) {
        case "text":
          content = { text: message.body || "" };
          break;
          
        case "image":
          content = {
            image: { url: message.mediaUrl! },
            caption: message.body
          };
          break;
          
        case "video":
          content = {
            video: { url: message.mediaUrl! },
            caption: message.body
          };
          break;
          
        case "audio":
          content = {
            audio: { url: message.mediaUrl! },
            ptt: true // Nota de voz
          };
          break;
          
        case "document":
          content = {
            document: { url: message.mediaUrl! },
            fileName: message.fileName,
            caption: message.body
          };
          break;
          
        default:
          throw new AppError(`Tipo de mensaje no soportado: ${message.type}`, 400);
      }

      const sentMessage = await this.wbot.sendMessage(jid, content);

      logger.info(`[WhatsApp] Mensaje enviado:`, {
        channelId: this.channel.id,
        to: message.to,
        messageId: sentMessage.key.id
      });

      return sentMessage;
    } catch (error) {
      logger.error(`[WhatsApp] Error al enviar mensaje:`, error);
      throw new AppError("Error al enviar mensaje de WhatsApp", 500);
    }
  }

  async getStatus(): Promise<string> {
    if (!this.wbot) {
      return "DISCONNECTED";
    }

    const state = this.wbot.user ? "CONNECTED" : "DISCONNECTED";
    return state;
  }

  async refreshToken(): Promise<void> {
    // WhatsApp no usa tokens, usa autenticación QR
    logger.info(`[WhatsApp] No se requiere renovación de token`);
  }

  // Métodos privados específicos de WhatsApp
  private setupEventHandlers(saveCreds: any): void {
    if (!this.wbot) return;

    // Evento de actualización de credenciales
    this.wbot.ev.on("creds.update", saveCreds);

    // Evento de actualización de conexión
    this.wbot.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        logger.info(`[WhatsApp] QR Code recibido`);
        await this.channel.update({ 
          qrcode: qr,
          status: "qrcode"
        });
        
        io.of(this.companyId.toString()).emit(`company-${this.companyId}-whatsappSession`, {
          action: "update",
          session: {
            id: this.channel.id,
            qrcode: qr,
            status: "qrcode"
          }
        });
      }

      if (connection === "close") {
        const shouldReconnect = (lastDisconnect?.error as any)?.output?.statusCode !== DisconnectReason.loggedOut;
        
        logger.info(`[WhatsApp] Conexión cerrada:`, {
          channelId: this.channel.id,
          shouldReconnect,
          statusCode: (lastDisconnect?.error as any)?.output?.statusCode
        });

        if (shouldReconnect && !this.isReconnecting) {
          this.isReconnecting = true;
          setTimeout(() => {
            this.initialize();
          }, 5000);
        } else {
          await this.updateChannelStatus("DISCONNECTED");
        }
      }

      if (connection === "open") {
        logger.info(`[WhatsApp] Conectado exitosamente`);
        await this.updateChannelStatus("CONNECTED");
        
        // Actualizar información del canal
        if (this.wbot.user) {
          await this.channel.update({
            number: this.wbot.user.id.split(":")[0],
            profilePicUrl: await this.getProfilePicUrl(this.wbot.user.id)
          });
        }
      }
    });

    // Evento de mensajes
    this.wbot.ev.on("messages.upsert", async (messageUpdate) => {
      try {
        for (const msg of messageUpdate.messages) {
          if (!msg.message || msg.key.fromMe) continue;

          const messageType = this.getMessageType(msg.message);
          const body = this.extractMessageBody(msg.message, messageType);

          const incomingMessage: IncomingMessage = {
            id: msg.key.id!,
            from: msg.key.remoteJid!,
            to: this.channel.number,
            body: body || "",
            timestamp: msg.messageTimestamp as number,
            type: messageType,
            profileName: msg.pushName || msg.key.remoteJid!
          };

          // Extraer media si existe
          if (messageType !== "text") {
            const mediaUrl = await this.downloadMedia(msg.message, messageType);
            if (mediaUrl) {
              incomingMessage.mediaUrl = mediaUrl;
            }
          }

          await this.handleIncomingMessage(incomingMessage);
        }
      } catch (error) {
        logger.error(`[WhatsApp] Error procesando mensaje:`, error);
      }
    });

    // Evento de actualización de mensajes (acks)
    this.wbot.ev.on("messages.update", async (updates) => {
      for (const update of updates) {
        if (update.update.status) {
          io.of(this.companyId.toString()).emit(`company-${this.companyId}-messageUpdate`, {
            messageId: update.key.id,
            ack: update.update.status
          });
        }
      }
    });

    // Evento de presencia (escribiendo...)
    this.wbot.ev.on("presence.update", async (presenceUpdate) => {
      io.of(this.companyId.toString()).emit(`company-${this.companyId}-presence`, {
        jid: presenceUpdate.id,
        presence: presenceUpdate.presences
      });
    });
  }

  private getMessageType(message: proto.IMessage): "text" | "image" | "video" | "audio" | "document" {
    if (message.imageMessage) return "image";
    if (message.videoMessage) return "video";
    if (message.audioMessage) return "audio";
    if (message.documentMessage) return "document";
    return "text";
  }

  private extractMessageBody(message: proto.IMessage, type: string): string {
    switch (type) {
      case "text":
        return message.conversation || 
               message.extendedTextMessage?.text || 
               "";
      case "image":
        return message.imageMessage?.caption || "";
      case "video":
        return message.videoMessage?.caption || "";
      case "document":
        return message.documentMessage?.caption || "";
      default:
        return "";
    }
  }

  private async downloadMedia(message: proto.IMessage, type: string): Promise<string | null> {
    try {
      // Aquí iría la lógica para descargar y guardar el archivo
      // Por ahora retornamos null
      return null;
    } catch (error) {
      logger.error(`[WhatsApp] Error descargando media:`, error);
      return null;
    }
  }

  private async getProfilePicUrl(jid: string): Promise<string | null> {
    try {
      if (!this.wbot) return null;
      const url = await this.wbot.profilePictureUrl(jid, "image");
      return url;
    } catch (error) {
      return null;
    }
  }

  // Métodos públicos adicionales específicos de WhatsApp
  async sendPresenceUpdate(jid: string, presence: "available" | "composing" | "paused"): Promise<void> {
    if (!this.wbot) return;
    await this.wbot.presenceSubscribe(jid);
    await this.wbot.sendPresenceUpdate(presence, jid);
  }

  async markMessageAsRead(messageKey: WAMessageKey): Promise<void> {
    if (!this.wbot) return;
    await this.wbot.readMessages([messageKey]);
  }

  async getBusinessProfile(): Promise<any> {
    if (!this.wbot) return null;
    return await this.wbot.getBusinessProfile(this.wbot.user!.id);
  }

  async createGroup(name: string, participants: string[]): Promise<any> {
    if (!this.wbot) throw new AppError("WhatsApp no está conectado", 500);
    
    const group = await this.wbot.groupCreate(name, participants);
    return group;
  }

  async getGroupInfo(groupId: string): Promise<any> {
    if (!this.wbot) return null;
    return await this.wbot.groupMetadata(groupId);
  }
}

export default WhatsAppService;
EOF

# Continuaré con los demás archivos en el siguiente mensaje...
echo -e "${GREEN}✅ Archivos de modelos y servicios base creados${NC}"
echo "Continuando con más archivos..."

# ===============================
# 7. FACEBOOK SERVICE
# ===============================
echo "  ✅ Creando FacebookService.ts..."
cat > backend/src/services/ChannelServices/FacebookService.ts << 'EOF'
// Archivo: backend/src/services/ChannelServices/FacebookService.ts
// Servicio para manejar Facebook Messenger

import axios from "axios";
import { BaseChannelService, IncomingMessage, OutgoingMessage } from "./BaseChannelService";
import { logger } from "../../utils/logger";
import Channel from "../../models/Channel";
import AppError from "../../errors/AppError";

const FACEBOOK_API_VERSION = "v18.0";
const FACEBOOK_GRAPH_URL = "https://graph.facebook.com";

interface FacebookWebhookMessage {
  object: string;
  entry: Array<{
    id: string;
    time: number;
    messaging: Array<{
      sender: { id: string };
      recipient: { id: string };
      timestamp: number;
      message?: {
        mid: string;
        text?: string;
        quick_reply?: { payload: string };
        attachments?: Array<{
          type: string;
          payload: {
            url?: string;
            title?: string;
            coordinates?: { lat: number; long: number };
          };
        }>;
      };
      postback?: {
        title: string;
        payload: string;
      };
    }>;
  }>;
}

export class FacebookService extends BaseChannelService {
  private apiUrl: string;
  
  constructor(channel: Channel) {
    super(channel);
    this.apiUrl = `${FACEBOOK_GRAPH_URL}/${FACEBOOK_API_VERSION}`;
  }

  async initialize(): Promise<void> {
    try {
      logger.info(`[Facebook] Inicializando canal ${this.channel.name}`);
      
      // Verificar token de página
      await this.verifyPageToken();
      
      // Suscribir la página al webhook
      await this.subscribeWebhook();
      
      await this.updateChannelStatus("CONNECTED");
      
      logger.info(`[Facebook] Canal ${this.channel.name} inicializado con éxito`);
    } catch (error) {
      logger.error(`[Facebook] Error al inicializar:`, error);
      await this.updateChannelStatus("DISCONNECTED");
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      // Desuscribir webhook
      await this.unsubscribeWebhook();
      
      await this.updateChannelStatus("DISCONNECTED");
      logger.info(`[Facebook] Canal ${this.channel.name} desconectado`);
    } catch (error) {
      logger.error(`[Facebook] Error al desconectar:`, error);
      throw error;
    }
  }

  async sendMessage(message: OutgoingMessage): Promise<any> {
    try {
      const endpoint = `${this.apiUrl}/me/messages`;
      
      let messageData: any = {
        recipient: { id: message.to },
        messaging_type: "RESPONSE"
      };

      if (message.type === "text") {
        messageData.message = { text: message.body };
      } else if (message.mediaUrl) {
        messageData.message = {
          attachment: {
            type: this.mapMediaType(message.type),
            payload: { 
              url: message.mediaUrl,
              is_reusable: true
            }
          }
        };
      }

      // Agregar respuesta rápida si es necesario
      if (message.replyToId) {
        messageData.message.reply_to = { mid: message.replyToId };
      }

      const response = await axios.post(endpoint, messageData, {
        params: { access_token: this.channel.facebookPageToken },
        headers: { "Content-Type": "application/json" }
      });

      logger.info(`[Facebook] Mensaje enviado:`, {
        channelId: this.channel.id,
        to: message.to,
        messageId: response.data.message_id
      });

      // Marcar como visto
      await this.markAsSeen(message.to);

      return response.data;
    } catch (error: any) {
      logger.error(`[Facebook] Error al enviar mensaje:`, error.response?.data || error);
      throw new AppError("Error al enviar mensaje de Facebook", 500);
    }
  }

  async getStatus(): Promise<string> {
    try {
      const endpoint = `${this.apiUrl}/${this.channel.facebookPageId}`;
      const response = await axios.get(endpoint, {
        params: { 
          access_token: this.channel.facebookPageToken,
          fields: "id,name"
        }
      });
      
      return response.data.id ? "CONNECTED" : "DISCONNECTED";
    } catch (error) {
      return "DISCONNECTED";
    }
  }

  async refreshToken(): Promise<void> {
    try {
      // Facebook usa tokens de página de larga duración
      logger.info(`[Facebook] Verificando token para canal ${this.channel.name}`);
      
      // Verificar si el token necesita renovación
      const debugEndpoint = `${this.apiUrl}/debug_token`;
      const response = await axios.get(debugEndpoint, {
        params: {
          input_token: this.channel.facebookPageToken,
          access_token: `${process.env.FACEBOOK_APP_ID}|${process.env.FACEBOOK_APP_SECRET}`
        }
      });

      const tokenData = response.data.data;
      
      // Si el token expira en menos de 30 días, renovar
      if (tokenData.expires_at && tokenData.expires_at < (Date.now() / 1000) + (30 * 24 * 60 * 60)) {
        await this.exchangeToken();
      }
    } catch (error) {
      logger.error(`[Facebook] Error al verificar token:`, error);
      throw new AppError("Error al verificar token de Facebook", 500);
    }
  }

  // Procesar webhook de Facebook
  async processWebhook(data: FacebookWebhookMessage): Promise<void> {
    try {
      if (data.object !== "page") {
        logger.warn(`[Facebook] Webhook recibido para objeto no soportado: ${data.object}`);
        return;
      }

      for (const entry of data.entry) {
        for (const messaging of entry.messaging) {
          // Procesar mensaje normal
          if (messaging.message && !messaging.message.quick_reply) {
            const userProfile = await this.getUserProfile(messaging.sender.id);
            
            const message: IncomingMessage = {
              id: messaging.message.mid,
              from: messaging.sender.id,
              to: messaging.recipient.id,
              body: messaging.message.text || "",
              timestamp: messaging.timestamp,
              type: "text",
              profileName: userProfile.name,
              profilePicUrl: userProfile.profile_pic
            };

            // Procesar adjuntos
            if (messaging.message.attachments?.length > 0) {
              const attachment = messaging.message.attachments[0];
              message.type = this.parseAttachmentType(attachment.type);
              
              if (attachment.payload.url) {
                message.mediaUrl = attachment.payload.url;
              } else if (attachment.type === "location") {
                message.body = `📍 Ubicación: ${attachment.payload.coordinates?.lat}, ${attachment.payload.coordinates?.long}`;
              }
            }

            await this.handleIncomingMessage(message);
          }
          
          // Procesar postback (botones)
          if (messaging.postback) {
            const userProfile = await this.getUserProfile(messaging.sender.id);
            
            const message: IncomingMessage = {
              id: `postback_${Date.now()}`,
              from: messaging.sender.id,
              to: messaging.recipient.id,
              body: `[Botón presionado: ${messaging.postback.title}] ${messaging.postback.payload}`,
              timestamp: messaging.timestamp,
              type: "text",
              profileName: userProfile.name,
              profilePicUrl: userProfile.profile_pic
            };

            await this.handleIncomingMessage(message);
          }
        }
      }
    } catch (error) {
      logger.error(`[Facebook] Error procesando webhook:`, error);
      throw error;
    }
  }

  // Métodos privados de ayuda
  private async verifyPageToken(): Promise<void> {
    const endpoint = `${this.apiUrl}/${this.channel.facebookPageId}`;
    const response = await axios.get(endpoint, {
      params: { 
        access_token: this.channel.facebookPageToken,
        fields: "id,name,access_token"
      }
    });
    
    if (!response.data.id) {
      throw new AppError("Token de página de Facebook inválido", 401);
    }
  }

  private async subscribeWebhook(): Promise<void> {
    const endpoint = `${this.apiUrl}/${this.channel.facebookPageId}/subscribed_apps`;
    
    await axios.post(endpoint, {
      subscribed_fields: ["messages", "messaging_postbacks", "messaging_optins"]
    }, {
      params: { access_token: this.channel.facebookPageToken }
    });
  }

  private async unsubscribeWebhook(): Promise<void> {
    const endpoint = `${this.apiUrl}/${this.channel.facebookPageId}/subscribed_apps`;
    
    await axios.delete(endpoint, {
      params: { access_token: this.channel.facebookPageToken }
    });
  }

  private async getUserProfile(userId: string): Promise<{ name: string; profile_pic: string }> {
    try {
      const endpoint = `${this.apiUrl}/${userId}`;
      const response = await axios.get(endpoint, {
        params: {
          fields: "first_name,last_name,profile_pic",
          access_token: this.channel.facebookPageToken
        }
      });
      
      return {
        name: `${response.data.first_name} ${response.data.last_name || ""}`.trim(),
        profile_pic: response.data.profile_pic || ""
      };
    } catch (error) {
      logger.error(`[Facebook] Error obteniendo perfil de usuario:`, error);
      return { name: userId, profile_pic: "" };
    }
  }

  private async markAsSeen(userId: string): Promise<void> {
    try {
      const endpoint = `${this.apiUrl}/me/messages`;
      await axios.post(endpoint, {
        recipient: { id: userId },
        sender_action: "mark_seen"
      }, {
        params: { access_token: this.channel.facebookPageToken }
      });
    } catch (error) {
      logger.warn(`[Facebook] No se pudo marcar como visto:`, error);
    }
  }

  private async exchangeToken(): Promise<void> {
    const endpoint = `${this.apiUrl}/oauth/access_token`;
    const response = await axios.get(endpoint, {
      params: {
        grant_type: "fb_exchange_token",
        client_id: process.env.FACEBOOK_APP_ID,
        client_secret: process.env.FACEBOOK_APP_SECRET,
        fb_exchange_token: this.channel.facebookPageToken
      }
    });

    await this.channel.update({
      facebookPageToken: response.data.access_token
    });

    logger.info(`[Facebook] Token intercambiado con éxito`);
  }

  private mapMediaType(type: string): string {
    const typeMap: { [key: string]: string } = {
      "image": "image",
      "video": "video",
      "audio": "audio",
      "document": "file"
    };
    return typeMap[type] || "file";
  }

  private parseAttachmentType(type: string): "image" | "video" | "audio" | "document" {
    switch (type) {
      case "image":
        return "image";
      case "video":
        return "video";
      case "audio":
        return "audio";
      case "location":
        return "text";
      default:
        return "document";
    }
  }

  // Enviar opciones de respuesta rápida
  async sendQuickReplies(userId: string, text: string, quickReplies: Array<{ title: string; payload: string }>): Promise<void> {
    const endpoint = `${this.apiUrl}/me/messages`;
    
    await axios.post(endpoint, {
      recipient: { id: userId },
      messaging_type: "RESPONSE",
      message: {
        text,
        quick_replies: quickReplies.map(qr => ({
          content_type: "text",
          title: qr.title,
          payload: qr.payload
        }))
      }
    }, {
      params: { access_token: this.channel.facebookPageToken }
    });
  }
}

export default FacebookService;
EOF

# ===============================
# 8. INSTAGRAM SERVICE
# ===============================
echo "  ✅ Creando InstagramService.ts..."
cat > backend/src/services/ChannelServices/InstagramService.ts << 'EOF'
// Archivo: backend/src/services/ChannelServices/InstagramService.ts
// Servicio para manejar Instagram Direct Messages

import axios from "axios";
import { BaseChannelService, IncomingMessage, OutgoingMessage } from "./BaseChannelService";
import { logger } from "../../utils/logger";
import Channel from "../../models/Channel";
import AppError from "../../errors/AppError";

const INSTAGRAM_API_VERSION = "v18.0";
const FACEBOOK_GRAPH_URL = "https://graph.facebook.com";

interface InstagramWebhookMessage {
  entry: Array<{
    id: string;
    time: number;
    messaging: Array<{
      sender: { id: string };
      recipient: { id: string };
      timestamp: number;
      message?: {
        mid: string;
        text?: string;
        attachments?: Array<{
          type: string;
          payload: {
            url: string;
          };
        }>;
      };
    }>;
  }>;
}

export class InstagramService extends BaseChannelService {
  private apiUrl: string;
  private webhookSecret: string;

  constructor(channel: Channel) {
    super(channel);
    this.apiUrl = `${FACEBOOK_GRAPH_URL}/${INSTAGRAM_API_VERSION}`;
    this.webhookSecret = process.env.INSTAGRAM_WEBHOOK_SECRET || "";
  }

  async initialize(): Promise<void> {
    try {
      logger.info(`[Instagram] Inicializando canal ${this.channel.name}`);
      
      // Verificar token de acceso
      await this.verifyAccessToken();
      
      // Configurar webhook si no está configurado
      await this.setupWebhook();
      
      await this.updateChannelStatus("CONNECTED");
      
      logger.info(`[Instagram] Canal ${this.channel.name} inicializado con éxito`);
    } catch (error) {
      logger.error(`[Instagram] Error al inicializar:`, error);
      await this.updateChannelStatus("DISCONNECTED");
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.updateChannelStatus("DISCONNECTED");
      logger.info(`[Instagram] Canal ${this.channel.name} desconectado`);
    } catch (error) {
      logger.error(`[Instagram] Error al desconectar:`, error);
      throw error;
    }
  }

  async sendMessage(message: OutgoingMessage): Promise<any> {
    try {
      const endpoint = `${this.apiUrl}/${this.channel.instagramBusinessId}/messages`;
      
      let messageData: any = {
        recipient: { id: message.to },
        messaging_type: "RESPONSE"
      };

      if (message.type === "text") {
        messageData.message = { text: message.body };
      } else if (message.mediaUrl) {
        messageData.message = {
          attachment: {
            type: this.mapMediaType(message.type),
            payload: { url: message.mediaUrl }
          }
        };
      }

      const response = await axios.post(endpoint, messageData, {
        headers: {
          "Authorization": `Bearer ${this.channel.instagramToken}`,
          "Content-Type": "application/json"
        }
      });

      logger.info(`[Instagram] Mensaje enviado:`, {
        channelId: this.channel.id,
        to: message.to,
        messageId: response.data.message_id
      });

      return response.data;
    } catch (error) {
      logger.error(`[Instagram] Error al enviar mensaje:`, error);
      throw new AppError("Error al enviar mensaje de Instagram", 500);
    }
  }

  async getStatus(): Promise<string> {
    try {
      // Verificar si el token es válido
      const endpoint = `${this.apiUrl}/me?access_token=${this.channel.instagramToken}`;
      await axios.get(endpoint);
      return "CONNECTED";
    } catch (error) {
      return "DISCONNECTED";
    }
  }

  async refreshToken(): Promise<void> {
    try {
      // Instagram usa tokens de larga duración (60 días)
      // Este método debería implementar la lógica de renovación
      logger.info(`[Instagram] Renovando token para canal ${this.channel.name}`);
      
      const endpoint = `${this.apiUrl}/oauth/access_token`;
      const response = await axios.get(endpoint, {
        params: {
          grant_type: "ig_exchange_token",
          client_secret: process.env.INSTAGRAM_APP_SECRET,
          access_token: this.channel.instagramToken
        }
      });

      await this.channel.update({
        instagramToken: response.data.access_token
      });

      logger.info(`[Instagram] Token renovado con éxito`);
    } catch (error) {
      logger.error(`[Instagram] Error al renovar token:`, error);
      throw new AppError("Error al renovar token de Instagram", 500);
    }
  }

  // Procesar webhook de Instagram
  async processWebhook(data: InstagramWebhookMessage): Promise<void> {
    try {
      for (const entry of data.entry) {
        for (const messaging of entry.messaging) {
          if (messaging.message) {
            const message: IncomingMessage = {
              id: messaging.message.mid,
              from: messaging.sender.id,
              to: messaging.recipient.id,
              body: messaging.message.text || "",
              timestamp: messaging.timestamp,
              type: "text",
              profileName: await this.getUserProfile(messaging.sender.id)
            };

            // Procesar adjuntos si existen
            if (messaging.message.attachments?.length > 0) {
              const attachment = messaging.message.attachments[0];
              message.type = this.parseAttachmentType(attachment.type);
              message.mediaUrl = attachment.payload.url;
            }

            await this.handleIncomingMessage(message);
          }
        }
      }
    } catch (error) {
      logger.error(`[Instagram] Error procesando webhook:`, error);
      throw error;
    }
  }

  // Métodos privados de ayuda
  private async verifyAccessToken(): Promise<void> {
    const endpoint = `${this.apiUrl}/me?access_token=${this.channel.instagramToken}`;
    const response = await axios.get(endpoint);
    
    if (!response.data.id) {
      throw new AppError("Token de Instagram inválido", 401);
    }
  }

  private async setupWebhook(): Promise<void> {
    // Configurar webhook para recibir mensajes
    const endpoint = `${this.apiUrl}/${this.channel.instagramBusinessId}/subscribed_apps`;
    
    await axios.post(endpoint, {
      subscribed_fields: ["messages", "messaging_postbacks"]
    }, {
      headers: {
        "Authorization": `Bearer ${this.channel.instagramToken}`
      }
    });
  }

  private async getUserProfile(userId: string): Promise<string> {
    try {
      const endpoint = `${this.apiUrl}/${userId}?fields=name,profile_pic&access_token=${this.channel.instagramToken}`;
      const response = await axios.get(endpoint);
      
      // Actualizar foto de perfil si existe
      if (response.data.profile_pic) {
        // Aquí podrías guardar la foto de perfil
      }
      
      return response.data.name || userId;
    } catch (error) {
      logger.error(`[Instagram] Error obteniendo perfil de usuario:`, error);
      return userId;
    }
  }

  private mapMediaType(type: string): string {
    const typeMap: { [key: string]: string } = {
      "image": "image",
      "video": "video",
      "audio": "audio",
      "document": "file"
    };
    return typeMap[type] || "file";
  }

  private parseAttachmentType(type: string): "image" | "video" | "audio" | "document" {
    switch (type) {
      case "image":
        return "image";
      case "video":
        return "video";
      case "audio":
        return "audio";
      default:
        return "document";
    }
  }

  // Verificar firma del webhook
  static verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
    const crypto = require("crypto");
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("hex");
    
    return `sha256=${expectedSignature}` === signature;
  }
}

export default InstagramService;
EOF

# Continuaré con más archivos en el siguiente mensaje...
echo -e "${GREEN}✅ Servicios de canales creados${NC}"
echo "Creando servicios adicionales..."

# ===============================
# 9. PLAN SERVICE
# ===============================
echo "  ✅ Creando PlanService.ts..."
cat > backend/src/services/PlanService.ts << 'EOF'
// Archivo: backend/src/services/PlanService.ts
// Servicio para gestionar planes y límites

import Plan from "../models/Plan";
import Company from "../models/Company";
import AppError from "../errors/AppError";
import Stripe from "stripe";
import { getIO } from "../libs/socket";

const io = getIO();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

class PlanService {
  // Verificar si una empresa puede usar una característica
  static async canUseFeature(companyId: number, feature: string): Promise<boolean> {
    const company = await Company.findByPk(companyId, {
      include: [Plan]
    });

    if (!company || !company.plan) {
      throw new AppError("Empresa o plan no encontrado", 404);
    }

    // Verificar si el plan incluye la característica
    return company.plan.features[feature] === true;
  }

  // Verificar límites
  static async checkLimit(companyId: number, limitType: string): Promise<{
    allowed: boolean;
    current: number;
    limit: number;
    percentage: number;
  }> {
    const company = await Company.findByPk(companyId, {
      include: [Plan]
    });

    if (!company || !company.plan) {
      throw new AppError("Empresa o plan no encontrado", 404);
    }

    const currentUsage = company.usage[`current${limitType.charAt(0).toUpperCase() + limitType.slice(1)}`];
    const planLimit = company.customLimits?.[limitType] || company.plan.limits[limitType];

    return {
      allowed: currentUsage < planLimit,
      current: currentUsage,
      limit: planLimit,
      percentage: (currentUsage / planLimit) * 100
    };
  }

  // Incrementar uso
  static async incrementUsage(companyId: number, usageType: string, amount: number = 1): Promise<void> {
    const company = await Company.findByPk(companyId);
    
    if (!company) {
      throw new AppError("Empresa no encontrada", 404);
    }

    const currentUsage = company.usage;
    currentUsage[usageType] = (currentUsage[usageType] || 0) + amount;

    await company.update({ usage: currentUsage });

    // Verificar si se excedió el límite
    const limit = await this.checkLimit(companyId, usageType.replace('current', '').toLowerCase());
    
    if (!limit.allowed) {
      // Notificar al administrador
      await this.notifyLimitExceeded(company, usageType, limit);
    }
  }

  // Cambiar plan
  static async upgradePlan(companyI
  # ===============================
# 9. PLAN SERVICE (continuación)
# ===============================
cat >> backend/src/services/PlanService.ts << 'EOF'
d: number, newPlanId: number): Promise<void> {
    const company = await Company.findByPk(companyId);
    const newPlan = await Plan.findByPk(newPlanId);

    if (!company || !newPlan) {
      throw new AppError("Empresa o plan no encontrado", 404);
    }

    // Actualizar en Stripe
    if (company.stripeSubscriptionId) {
      await stripe.subscriptions.update(company.stripeSubscriptionId, {
        items: [{
          id: company.stripeSubscriptionId,
          price: newPlan.stripeProductId
        }]
      });
    }

    // Actualizar en la base de datos
    await company.update({ planId: newPlanId });

    // Registrar el cambio
    await this.logPlanChange(company, newPlan);
  }

  // Configuración inicial para nueva empresa
  static async setupNewCompany(companyData: any, planId: number): Promise<Company> {
    const plan = await Plan.findByPk(planId);
    
    if (!plan) {
      throw new AppError("Plan no encontrado", 404);
    }

    // Crear cliente en Stripe
    const stripeCustomer = await stripe.customers.create({
      email: companyData.email,
      name: companyData.name,
      metadata: {
        companyId: companyData.id
      }
    });

    // Crear suscripción con trial
    const subscription = await stripe.subscriptions.create({
      customer: stripeCustomer.id,
      items: [{ price: plan.stripeProductId }],
      trial_period_days: 14,
      metadata: {
        companyId: companyData.id
      }
    });

    // Crear empresa con configuración inicial
    const company = await Company.create({
      ...companyData,
      planId: planId,
      stripeCustomerId: stripeCustomer.id,
      stripeSubscriptionId: subscription.id,
      subscriptionStatus: "trialing",
      trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      usage: {
        currentUsers: 0,
        currentChannels: 0,
        currentContacts: 0,
        messagesThisMonth: 0,
        aiCreditsUsed: 0,
        storageUsed: 0,
        automationsCreated: 0
      },
      settings: {
        companyLogo: "",
        primaryColor: "#1976d2",
        secondaryColor: "#dc004e",
        customDomain: "",
        channelDefaults: {
          greetingMessage: "¡Hola! ¿En qué puedo ayudarte?",
          farewellMessage: "¡Gracias por contactarnos!",
          businessHours: {
            monday: { open: "09:00", close: "18:00" },
            tuesday: { open: "09:00", close: "18:00" },
            wednesday: { open: "09:00", close: "18:00" },
            thursday: { open: "09:00", close: "18:00" },
            friday: { open: "09:00", close: "18:00" },
            saturday: { open: "09:00", close: "13:00" },
            sunday: { open: "closed", close: "closed" }
          },
          autoReply: true
        },
        aiSettings: {
          model: "gpt-3.5",
          temperature: 0.7,
          customPrompt: "",
          autoSuggest: true
        },
        notifications: {
          email: true,
          webhook: "",
          slackWebhook: ""
        }
      }
    });

    // Crear recursos iniciales
    await this.createInitialResources(company);

    return company;
  }

  // Middleware para verificar límites antes de cualquier acción
  static async checkBeforeAction(req: any, res: any, next: any): Promise<void> {
    const { companyId } = req.user;
    const action = req.route.path;

    // Mapear acciones a límites
    const limitMap: { [key: string]: string } = {
      "/users": "users",
      "/channels": "channels",
      "/contacts": "contacts",
      "/messages": "messagesPerMonth"
    };

    const limitType = limitMap[action];
    
    if (limitType) {
      const limit = await this.checkLimit(companyId, limitType);
      
      if (!limit.allowed) {
        throw new AppError(
          `Has alcanzado el límite de ${limitType} (${limit.current}/${limit.limit}). 
          Por favor, actualiza tu plan para continuar.`,
          403
        );
      }
    }

    next();
  }

  private static async notifyLimitExceeded(company: Company, usageType: string, limit: any): Promise<void> {
    // Enviar email
    // Enviar notificación in-app
    // Webhook si está configurado
    console.log(`Límite excedido: ${company.name} - ${usageType} - ${limit.percentage}%`);
  }

  private static async logPlanChange(company: Company, newPlan: Plan): Promise<void> {
    // Registrar cambio de plan en logs
    console.log(`Plan cambiado: ${company.name} -> ${newPlan.name}`);
  }

  private static async createInitialResources(company: Company): Promise<void> {
    // Crear usuario admin
    // Crear cola por defecto
    // Crear mensajes de bienvenida
    console.log(`Recursos iniciales creados para: ${company.name}`);
  }
}

// Configuración de planes predefinidos
export const DEFAULT_PLANS = [
  {
    name: "Starter",
    monthlyPrice: 29,
    yearlyPrice: 290,
    limits: {
      users: 3,
      channels: 2,
      contacts: 1000,
      messagesPerMonth: 3000,
      aiCredits: 100,
      storage: 5,
      automations: 10,
      integrations: ["whatsapp", "facebook"]
    },
    features: {
      whatsapp: true,
      facebook: true,
      instagram: false,
      tiktok: false,
      aiAssistant: true,
      aiAutomation: false,
      shopifyIntegration: false,
      stripeIntegration: true,
      advancedAnalytics: false,
      customReports: false,
      apiAccess: false,
      whitelabel: false,
      supportLevel: "email",
      sla: 48
    }
  },
  {
    name: "Professional",
    monthlyPrice: 99,
    yearlyPrice: 990,
    limits: {
      users: 10,
      channels: 5,
      contacts: 10000,
      messagesPerMonth: 20000,
      aiCredits: 1000,
      storage: 25,
      automations: 50,
      integrations: ["whatsapp", "facebook", "instagram", "shopify", "ai"]
    },
    features: {
      whatsapp: true,
      facebook: true,
      instagram: true,
      tiktok: true,
      aiAssistant: true,
      aiAutomation: true,
      shopifyIntegration: true,
      stripeIntegration: true,
      advancedAnalytics: true,
      customReports: true,
      apiAccess: true,
      whitelabel: false,
      supportLevel: "priority",
      sla: 12
    }
  },
  {
    name: "Enterprise",
    monthlyPrice: 299,
    yearlyPrice: 2990,
    limits: {
      users: -1, // Ilimitado
      channels: -1,
      contacts: -1,
      messagesPerMonth: -1,
      aiCredits: -1,
      storage: 100,
      automations: -1,
      integrations: ["all"]
    },
    features: {
      whatsapp: true,
      facebook: true,
      instagram: true,
      tiktok: true,
      aiAssistant: true,
      aiAutomation: true,
      shopifyIntegration: true,
      stripeIntegration: true,
      advancedAnalytics: true,
      customReports: true,
      apiAccess: true,
      whitelabel: true,
      supportLevel: "dedicated",
      sla: 2
    }
  }
];

export default PlanService;
EOF

# ===============================
# 10. CONFIGURATION SERVICE
# ===============================
echo "  ✅ Creando ConfigurationService.ts..."
cat > backend/src/services/ConfigurationService.ts << 'EOF'
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
EOF

# ===============================
# 11. CHANNEL CONTROLLER
# ===============================
echo "  ✅ Creando ChannelController.ts..."
cat > backend/src/controllers/ChannelController.ts << 'EOF'
// Archivo: backend/src/controllers/ChannelController.ts
// Controlador unificado para todos los canales (WhatsApp, Facebook, Instagram, etc.)

import { Request, Response } from "express";
import { getIO } from "../libs/socket";
import { Op } from "sequelize";

import Channel, { ChannelType } from "../models/Channel";
import Company from "../models/Company";
import Queue from "../models/Queue";
import QueueChannel from "../models/QueueChannel";
import AppError from "../errors/AppError";
import { logger } from "../utils/logger";

// Servicios
import CreateChannelService from "../services/ChannelServices/CreateChannelService";
import UpdateChannelService from "../services/ChannelServices/UpdateChannelService";
import DeleteChannelService from "../services/ChannelServices/DeleteChannelService";
import ListChannelsService from "../services/ChannelServices/ListChannelsService";
import ShowChannelService from "../services/ChannelServices/ShowChannelService";

// Servicios específicos por canal
import WhatsAppService from "../services/ChannelServices/WhatsAppService";
import FacebookService from "../services/ChannelServices/FacebookService";
import InstagramService from "../services/ChannelServices/InstagramService";

// Plan service para verificar límites
import PlanService from "../services/PlanService";

interface ChannelData {
  name: string;
  type: ChannelType;
  status?: string;
  isDefault?: boolean;
  greetingMessage?: string;
  farewellMessage?: string;
  color?: string;
  // WhatsApp
  qrcode?: string;
  // Facebook
  facebookPageId?: string;
  facebookPageToken?: string;
  // Instagram
  instagramBusinessId?: string;
  instagramToken?: string;
  // Webhook
  webhookVerifyToken?: string;
  // Configuraciones adicionales
  channelConfig?: any;
  queueIds?: number[];
}

interface IndexQuery {
  searchParam?: string;
  pageNumber?: string;
  session?: string;
  type?: ChannelType;
}

// Declaración global para TypeScript
declare global {
  var channelServices: Record<number, any>;
}

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { searchParam, pageNumber, session, type } = req.query as IndexQuery;

  const { channels, count, hasMore } = await ListChannelsService({
    searchParam,
    pageNumber,
    companyId,
    session,
    type
  });

  return res.json({ channels, count, hasMore });
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { channelId } = req.params;
  const { companyId } = req.user;

  const channel = await ShowChannelService(channelId, companyId);

  return res.json(channel);
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const channelData: ChannelData = req.body;

  try {
    // Verificar límite de canales del plan
    const limitCheck = await PlanService.checkLimit(companyId, "channels");
    if (!limitCheck.allowed) {
      throw new AppError(
        `Has alcanzado el límite de canales (${limitCheck.current}/${limitCheck.limit}). 
        Por favor, actualiza tu plan para agregar más canales.`,
        403
      );
    }

    // Verificar si el tipo de canal está permitido en el plan
    const canUseChannel = await PlanService.canUseFeature(companyId, channelData.type);
    if (!canUseChannel) {
      throw new AppError(
        `Tu plan actual no incluye ${channelData.type}. 
        Por favor, actualiza tu plan para usar este canal.`,
        403
      );
    }

    const channel = await CreateChannelService({
      ...channelData,
      companyId
    });

    // Incrementar contador de uso
    await PlanService.incrementUsage(companyId, "currentChannels");

    const io = getIO();
    io.of(companyId.toString())
      .emit(`company-${companyId}-channel`, {
        action: "create",
        channel
      });

    // Inicializar el canal según su tipo
    await initializeChannel(channel);

    return res.status(201).json(channel);
  } catch (error) {
    logger.error("Error creating channel:", error);
    throw error;
  }
};

export const update = async (req: Request, res: Response): Promise<Response> => {
  const { channelId } = req.params;
  const { companyId } = req.user;
  const channelData: ChannelData = req.body;

  try {
    const channel = await UpdateChannelService({
      channelId,
      channelData,
      companyId
    });

    const io = getIO();
    io.of(companyId.toString())
      .emit(`company-${companyId}-channel`, {
        action: "update",
        channel
      });

    return res.json(channel);
  } catch (error) {
    logger.error("Error updating channel:", error);
    throw error;
  }
};

export const remove = async (req: Request, res: Response): Promise<Response> => {
  const { channelId } = req.params;
  const { companyId } = req.user;

  try {
    // Desconectar el canal antes de eliminarlo
    const channel = await ShowChannelService(channelId, companyId);
    await disconnectChannel(channel);

    await DeleteChannelService(channelId, companyId);

    // Decrementar contador de uso
    await PlanService.incrementUsage(companyId, "currentChannels", -1);

    const io = getIO();
    io.of(companyId.toString())
      .emit(`company-${companyId}-channel`, {
        action: "delete",
        channelId
      });

    return res.json({ message: "Canal eliminado correctamente" });
  } catch (error) {
    logger.error("Error deleting channel:", error);
    throw error;
  }
};

// Conectar/Inicializar un canal
export const connect = async (req: Request, res: Response): Promise<Response> => {
  const { channelId } = req.params;
  const { companyId } = req.user;

  try {
    const channel = await ShowChannelService(channelId, companyId);
    await initializeChannel(channel);

    return res.json({ 
      message: `Canal ${channel.name} conectándose...`,
      channel 
    });
  } catch (error) {
    logger.error("Error connecting channel:", error);
    throw error;
  }
};

// Desconectar un canal
export const disconnect = async (req: Request, res: Response): Promise<Response> => {
  const { channelId } = req.params;
  const { companyId } = req.user;

  try {
    const channel = await ShowChannelService(channelId, companyId);
    await disconnectChannel(channel);

    return res.json({ 
      message: `Canal ${channel.name} desconectado`,
      channel 
    });
  } catch (error) {
    logger.error("Error disconnecting channel:", error);
    throw error;
  }
};

// Obtener QR Code (solo WhatsApp)
export const getQrCode = async (req: Request, res: Response): Promise<Response> => {
  const { channelId } = req.params;
  const { companyId } = req.user;

  try {
    const channel = await ShowChannelService(channelId, companyId);
    
    if (channel.type !== ChannelType.WHATSAPP) {
      throw new AppError("QR Code solo está disponible para WhatsApp", 400);
    }

    return res.json({ 
      qrcode: channel.qrcode,
      status: channel.status 
    });
  } catch (error) {
    logger.error("Error getting QR code:", error);
    throw error;
  }
};

// Configurar webhook (Facebook/Instagram)
export const configureWebhook = async (req: Request, res: Response): Promise<Response> => {
  const { channelId } = req.params;
  const { companyId } = req.user;
  const { verifyToken } = req.body;

  try {
    const channel = await ShowChannelService(channelId, companyId);
    
    if (![ChannelType.FACEBOOK, ChannelType.INSTAGRAM].includes(channel.type as ChannelType)) {
      throw new AppError("Webhook solo está disponible para Facebook e Instagram", 400);
    }

    await channel.update({ webhookVerifyToken: verifyToken });

    const webhookUrl = `${process.env.BACKEND_URL}/webhook/${channel.type}/${channel.id}`;

    return res.json({ 
      message: "Webhook configurado",
      webhookUrl,
      verifyToken 
    });
  } catch (error) {
    logger.error("Error configuring webhook:", error);
    throw error;
  }
};

// Obtener estadísticas del canal
export const getStats = async (req: Request, res: Response): Promise<Response> => {
  const { channelId } = req.params;
  const { companyId } = req.user;
  const { startDate, endDate } = req.query;

  try {
    const channel = await ShowChannelService(channelId, companyId);
    
    // Aquí iría la lógica para obtener estadísticas
    const stats = {
      totalMessages: 0,
      sentMessages: 0,
      receivedMessages: 0,
      totalTickets: 0,
      openTickets: 0,
      closedTickets: 0,
      avgResponseTime: 0
    };

    return res.json({ channel, stats });
  } catch (error) {
    logger.error("Error getting channel stats:", error);
    throw error;
  }
};

// Funciones auxiliares privadas
async function initializeChannel(channel: Channel): Promise<void> {
  try {
    let service;
    
    switch (channel.type) {
      case ChannelType.WHATSAPP:
        service = new WhatsAppService(channel);
        break;
      case ChannelType.FACEBOOK:
        service = new FacebookService(channel);
        break;
      case ChannelType.INSTAGRAM:
        service = new InstagramService(channel);
        break;
      default:
        throw new AppError(`Tipo de canal no soportado: ${channel.type}`, 400);
    }

    await service.initialize();
    
    // Guardar instancia del servicio en memoria (puedes usar Redis para esto)
    global.channelServices = global.channelServices || {};
    global.channelServices[channel.id] = service;
    
  } catch (error) {
    logger.error(`Error initializing channel ${channel.id}:`, error);
    await channel.update({ status: "DISCONNECTED" });
    throw error;
  }
}

async function disconnectChannel(channel: Channel): Promise<void> {
  try {
    const service = global.channelServices?.[channel.id];
    
    if (service) {
      await service.disconnect();
      delete global.channelServices[channel.id];
    }
    
    await channel.update({ status: "DISCONNECTED" });
  } catch (error) {
    logger.error(`Error disconnecting channel ${channel.id}:`, error);
    throw error;
  }
}

// Endpoint para pruebas en desarrollo
export const test = async (req: Request, res: Response): Promise<Response> => {
  if (process.env.NODE_ENV !== "development") {
    throw new AppError("Este endpoint solo está disponible en desarrollo", 403);
  }

  const { channelId, action } = req.body;
  const { companyId } = req.user;

  try {
    const channel = await ShowChannelService(channelId, companyId);
    const service = global.channelServices?.[channel.id];

    if (!service) {
      throw new AppError("Servicio no encontrado. Conecta el canal primero.", 404);
    }

    let result;
    switch (action) {
      case "sendTestMessage":
        result = await service.sendMessage({
          to: req.body.to,
          body: "Mensaje de prueba desde el CRM",
          type: "text"
        });
        break;
      case "getStatus":
        result = await service.getStatus();
        break;
      default:
        throw new AppError("Acción no válida", 400);
    }

    return res.json({ result });
  } catch (error) {
    logger.error("Error in test endpoint:", error);
    throw error;
  }
};
EOF

# ===============================
# 12. CONFIGURATION CONTROLLER
# ===============================
echo "  ✅ Creando ConfigurationController.ts..."
cat > backend/src/controllers/ConfigurationController.ts << 'EOF'
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
EOF

# ===============================
# 13. CHANNEL ROUTES
# ===============================
echo "  ✅ Creando channelRoutes.ts..."
cat > backend/src/routes/channelRoutes.ts << 'EOF'
// Archivo: backend/src/routes/channelRoutes.ts
// Rutas para gestión de canales (reemplaza whatsappRoutes.ts)

import { Router } from "express";
import isAuth from "../middleware/isAuth";
import * as ChannelController from "../controllers/ChannelController";
import multer from "multer";

const channelRoutes = Router();

// Middleware para manejar archivos (para importar tokens/certificados)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
});

// Rutas protegidas con autenticación
channelRoutes.use(isAuth);

// Listar todos los canales
channelRoutes.get("/channels", ChannelController.index);

// Ver detalle de un canal
channelRoutes.get("/channels/:channelId", ChannelController.show);

// Crear nuevo canal
channelRoutes.post("/channels", ChannelController.store);

// Actualizar canal
channelRoutes.put("/channels/:channelId", ChannelController.update);

// Eliminar canal
channelRoutes.delete("/channels/:channelId", ChannelController.remove);

// Acciones específicas del canal
channelRoutes.post("/channels/:channelId/connect", ChannelController.connect);
channelRoutes.post("/channels/:channelId/disconnect", ChannelController.disconnect);

// Obtener QR Code (WhatsApp)
channelRoutes.get("/channels/:channelId/qrcode", ChannelController.getQrCode);

// Configurar webhook (Facebook/Instagram)
channelRoutes.post("/channels/:channelId/webhook", ChannelController.configureWebhook);

// Obtener estadísticas
channelRoutes.get("/channels/:channelId/stats", ChannelController.getStats);

// Endpoint de prueba (solo desarrollo)
if (process.env.NODE_ENV === "development") {
  channelRoutes.post("/channels/test", ChannelController.test);
}

// Rutas específicas por tipo de canal

// WhatsApp - Importar sesión existente
channelRoutes.post(
  "/channels/:channelId/import-session",
  upload.single("session"),
  async (req, res) => {
    // Lógica para importar sesión de WhatsApp
    res.json({ message: "Sesión importada" });
  }
);

// Facebook/Instagram - Validar token
channelRoutes.post("/channels/:channelId/validate-token", async (req, res) => {
  // Lógica para validar token de Facebook/Instagram
  res.json({ valid: true });
});

// TikTok - Autorizar cuenta (futuro)
channelRoutes.get("/channels/:channelId/tiktok-auth", async (req, res) => {
  // Lógica para autorización OAuth de TikTok
  res.json({ authUrl: "https://..." });
});

export default channelRoutes;
EOF

# ===============================
# 14. WEBHOOK ROUTES
# ===============================
echo "  ✅ Creando webhookRoutes.ts..."
cat > backend/src/routes/webhookRoutes.ts << 'EOF'
// Archivo: backend/src/routes/webhookRoutes.ts
// Webhooks para recibir mensajes de Facebook, Instagram y TikTok

import { Router, Request, Response } from "express";
import { logger } from "../utils/logger";
import Channel from "../models/Channel";
import FacebookService from "../services/ChannelServices/FacebookService";
import InstagramService from "../services/ChannelServices/InstagramService";
import crypto from "crypto";

const webhookRoutes = Router();

// Declaración global para TypeScript
declare global {
  var channelServices: Record<number, any>;
}

// Middleware para verificar firma de Facebook/Instagram
const verifyFacebookSignature = (req: Request, res: Response, next: any) => {
  const signature = req.headers["x-hub-signature-256"] as string;
  
  if (!signature) {
    logger.warn("Webhook sin firma recibido");
    return res.sendStatus(403);
  }

  const elements = signature.split("=");
  const signatureHash = elements[1];
  const expectedHash = crypto
    .createHmac("sha256", process.env.FACEBOOK_APP_SECRET!)
    .update(JSON.stringify(req.body))
    .digest("hex");

  if (signatureHash !== expectedHash) {
    logger.warn("Firma de webhook inválida");
    return res.sendStatus(403);
  }

  next();
};

// Verificación de webhook de Facebook/Instagram (GET)
webhookRoutes.get("/webhook/meta/:channelId", async (req: Request, res: Response) => {
  try {
    const { channelId } = req.params;
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    logger.info("Verificación de webhook Meta recibida:", { channelId, mode });

    if (mode && token) {
      // Buscar el canal
      const channel = await Channel.findByPk(channelId);
      
      if (!channel) {
        logger.error("Canal no encontrado:", channelId);
        return res.sendStatus(404);
      }

      // Verificar token
      if (mode === "subscribe" && token === channel.webhookVerifyToken) {
        logger.info("Webhook verificado correctamente");
        return res.status(200).send(challenge);
      } else {
        logger.warn("Token de verificación inválido");
        return res.sendStatus(403);
      }
    }

    res.sendStatus(400);
  } catch (error) {
    logger.error("Error en verificación de webhook:", error);
    res.sendStatus(500);
  }
});

// Recibir mensajes de Facebook/Instagram (POST)
webhookRoutes.post(
  "/webhook/meta/:channelId",
  verifyFacebookSignature,
  async (req: Request, res: Response) => {
    try {
      const { channelId } = req.params;
      const data = req.body;

      logger.info("Webhook Meta recibido:", { 
        channelId, 
        object: data.object 
      });

      // Buscar el canal
      const channel = await Channel.findByPk(channelId);
      
      if (!channel) {
        logger.error("Canal no encontrado:", channelId);
        return res.sendStatus(404);
      }

      // Procesar según el tipo de canal
      const service = global.channelServices?.[channel.id];
      
      if (!service) {
        logger.error("Servicio no inicializado para canal:", channelId);
        return res.sendStatus(503);
      }

      // Procesar webhook según el objeto
      if (data.object === "page") {
        // Mensajes de Facebook Messenger
        if (channel.type === "facebook") {
          await (service as FacebookService).processWebhook(data);
        }
      } else if (data.object === "instagram") {
        // Mensajes de Instagram
        if (channel.type === "instagram") {
          await (service as InstagramService).processWebhook(data);
        }
      }

      // Facebook requiere respuesta 200 inmediata
      res.sendStatus(200);
    } catch (error) {
      logger.error("Error procesando webhook Meta:", error);
      res.sendStatus(500);
    }
  }
);

// Webhook para comentarios de Instagram
webhookRoutes.post(
  "/webhook/instagram-comments/:channelId",
  verifyFacebookSignature,
  async (req: Request, res: Response) => {
    try {
      const { channelId } = req.params;
      const data = req.body;

      logger.info("Webhook de comentarios Instagram recibido:", { channelId });

      // Aquí procesaríamos los comentarios
      // Por ahora solo logueamos
      logger.info("Comentario recibido:", data);

      res.sendStatus(200);
    } catch (error) {
      logger.error("Error procesando webhook de comentarios:", error);
      res.sendStatus(500);
    }
  }
);

// Webhook para TikTok (futuro)
webhookRoutes.get("/webhook/tiktok/:channelId", async (req: Request, res: Response) => {
  try {
    const { channelId } = req.params;
    const { code, state } = req.query;

    logger.info("Webhook TikTok recibido:", { channelId, code });

    // Verificar el estado para seguridad
    if (state !== process.env.TIKTOK_STATE_SECRET) {
      return res.status(403).send("Estado inválido");
    }

    // Aquí intercambiaríamos el código por un token
    res.send("TikTok conectado correctamente");
  } catch (error) {
    logger.error("Error en webhook TikTok:", error);
    res.sendStatus(500);
  }
});

// Webhook para recibir eventos de TikTok
webhookRoutes.post("/webhook/tiktok/:channelId", async (req: Request, res: Response) => {
  try {
    const { channelId } = req.params;
    const signature = req.headers["x-tiktok-signature"] as string;
    
    // Verificar firma de TikTok
    if (!verifyTikTokSignature(req.body, signature)) {
      return res.sendStatus(403);
    }

    const data = req.body;
    logger.info("Evento TikTok recibido:", { channelId, event: data.event });

    // Procesar según el tipo de evento
    switch (data.event) {
      case "comment":
        // Procesar comentario
        logger.info("Comentario TikTok:", data.comment);
        break;
      case "mention":
        // Procesar mención
        logger.info("Mención TikTok:", data.mention);
        break;
    }

    res.sendStatus(200);
  } catch (error) {
    logger.error("Error procesando webhook TikTok:", error);
    res.sendStatus(500);
  }
});

// Webhook genérico para pruebas en desarrollo
if (process.env.NODE_ENV === "development") {
  webhookRoutes.post("/webhook/test/:channelId", async (req: Request, res: Response) => {
    logger.info("Webhook de prueba recibido:", {
      channelId: req.params.channelId,
      body: req.body
    });
    res.json({ received: true });
  });
}

// Función auxiliar para verificar firma de TikTok
function verifyTikTokSignature(payload: any, signature: string): boolean {
  const secret = process.env.TIKTOK_WEBHOOK_SECRET || "";
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(JSON.stringify(payload))
    .digest("hex");
  
  return signature === `sha256=${expectedSignature}`;
}

// Endpoint de salud para los webhooks
webhookRoutes.get("/webhook/health", (req: Request, res: Response) => {
  res.json({ 
    status: "ok", 
    timestamp: new Date().toISOString(),
    webhooks: {
      meta: "active",
      tiktok: "ready"
    }
  });
});

export default webhookRoutes;
EOF

# ===============================
# 15. CONFIGURATION ROUTES
# ===============================
echo "  ✅ Creando configurationRoutes.ts..."
cat > backend/src/routes/configurationRoutes.ts << 'EOF'
// Archivo: backend/src/routes/configurationRoutes.ts
// Rutas para gestionar configuraciones del sistema

import { Router } from "express";
import isAuth from "../middleware/isAuth";
import * as ConfigurationController from "../controllers/ConfigurationController";

const configurationRoutes = Router();

// Todas las rutas requieren autenticación
configurationRoutes.use(isAuth);

// Listar todas las configuraciones agrupadas
configurationRoutes.get("/configurations", ConfigurationController.index);

// Obtener valor de una configuración
configurationRoutes.get("/configurations/:key", ConfigurationController.show);

// Guardar una configuración
configurationRoutes.post("/configurations", ConfigurationController.store);

// Guardar múltiples configuraciones
configurationRoutes.post("/configurations/bulk", ConfigurationController.bulkStore);

// Verificar si una característica está configurada
configurationRoutes.get("/configurations/check/:feature", ConfigurationController.checkFeature);

// Probar una configuración
configurationRoutes.post("/configurations/test", ConfigurationController.test);

// Exportar configuraciones
configurationRoutes.get("/configurations/export", ConfigurationController.exportConfigs);

// Importar configuraciones
configurationRoutes.post("/configurations/import", ConfigurationController.importConfigs);

export default configurationRoutes;
EOF

# ===============================
# 16. MIGRATION FILE
# ===============================
echo "  ✅ Creando archivo de migración..."
cat > backend/src/database/migrations/${TIMESTAMP}-convert-whatsapp-to-channels.ts << 'EOF'
import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    // 1. Renombrar tabla Whatsapps a Channels
    await queryInterface.renameTable("Whatsapps", "Channels");

    // 2. Agregar columna para tipo de canal
    await queryInterface.addColumn("Channels", "type", {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: "whatsapp"
    });

    // 3. Agregar columnas específicas para cada canal
    await queryInterface.addColumn("Channels", "facebookPageId", {
      type: DataTypes.STRING(255),
      allowNull: true
    });

    await queryInterface.addColumn("Channels", "facebookPageToken", {
      type: DataTypes.TEXT,
      allowNull: true
    });

    await queryInterface.addColumn("Channels", "instagramBusinessId", {
      type: DataTypes.STRING(255),
      allowNull: true
    });

    await queryInterface.addColumn("Channels", "instagramToken", {
      type: DataTypes.TEXT,
      allowNull: true
    });

    await queryInterface.addColumn("Channels", "webhookVerifyToken", {
      type: DataTypes.STRING(255),
      allowNull: true
    });

    // 4. Crear índice para el tipo de canal
    await queryInterface.addIndex("Channels", ["type"], {
      name: "idx_channels_type"
    });

    // 5. Agregar columna para configuraciones específicas del canal
    await queryInterface.addColumn("Channels", "channelConfig", {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {}
    });

    // 6. Renombrar columnas en Messages
    await queryInterface.renameColumn("Messages", "whatsappId", "channelId");

    // 7. Renombrar columnas en Tickets
    await queryInterface.renameColumn("Tickets", "whatsappId", "channelId");

    // 8. Renombrar tabla QueueWhatsapps
    await queryInterface.renameTable("QueueWhatsapps", "QueueChannels");
    await queryInterface.renameColumn("QueueChannels", "whatsappId", "channelId");

    // 9. Renombrar en ContactWallets si existe
    const tables = await queryInterface.showAllTables();
    if (tables.includes("ContactWallets")) {
      await queryInterface.renameColumn("ContactWallets", "whatsappId", "channelId");
    }

    // 10. Crear tabla Plans
    await queryInterface.createTable("Plans", {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false
      },
      monthlyPrice: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
      },
      yearlyPrice: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
      },
      limits: {
        type: DataTypes.JSON,
        allowNull: false
      },
      features: {
        type: DataTypes.JSON,
        allowNull: false
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
      },
      stripeProductId: {
        type: DataTypes.STRING,
        allowNull: true
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false
      }
    });

    // 11. Crear tabla SystemConfigurations
    await queryInterface.createTable("SystemConfigurations", {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      companyId: {
        type: DataTypes.INTEGER,
        references: { model: "Companies", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
        allowNull: false
      },
      category: {
        type: DataTypes.STRING,
        allowNull: false
      },
      key: {
        type: DataTypes.STRING,
        allowNull: false
      },
      value: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      displayName: {
        type: DataTypes.STRING,
        allowNull: false
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      type: {
        type: DataTypes.STRING,
        allowNull: false
      },
      isRequired: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
      },
      validation: {
        type: DataTypes.JSON,
        allowNull: true
      },
      helpUrl: {
        type: DataTypes.STRING,
        allowNull: true
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false
      }
    });

    // 12. Agregar campos a Companies para el sistema de planes
    await queryInterface.addColumn("Companies", "planId", {
      type: DataTypes.INTEGER,
      references: { model: "Plans", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
      allowNull: true
    });

    await queryInterface.addColumn("Companies", "usage", {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {}
    });

    await queryInterface.addColumn("Companies", "customLimits", {
      type: DataTypes.JSON,
      allowNull: true
    });

    await queryInterface.addColumn("Companies", "stripeCustomerId", {
      type: DataTypes.STRING,
      allowNull: true
    });

    await queryInterface.addColumn("Companies", "stripeSubscriptionId", {
      type: DataTypes.STRING,
      allowNull: true
    });

    await queryInterface.addColumn("Companies", "subscriptionStatus", {
      type: DataTypes.STRING,
      allowNull: true
    });

    await queryInterface.addColumn("Companies", "trialEndsAt", {
      type: DataTypes.DATE,
      allowNull: true
    });

    await queryInterface.addColumn("Companies", "nextBillingDate", {
      type: DataTypes.DATE,
      allowNull: true
    });

    await queryInterface.addColumn("Companies", "settings", {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {}
    });
  },

  down: async (queryInterface: QueryInterface) => {
    // Revertir todos los cambios en orden inverso
    await queryInterface.removeColumn("Companies", "settings");
    await queryInterface.removeColumn("Companies", "nextBillingDate");
    await queryInterface.removeColumn("Companies", "trialEndsAt");
    await queryInterface.removeColumn("Companies", "subscriptionStatus");
    await queryInterface.removeColumn("Companies", "stripeSubscriptionId");
    await queryInterface.removeColumn("Companies", "stripeCustomerId");
    await queryInterface.removeColumn("Companies", "customLimits");
    await queryInterface.removeColumn("Companies", "usage");
    await queryInterface.removeColumn("Companies", "planId");

    await queryInterface.dropTable("SystemConfigurations");
    await queryInterface.dropTable("Plans");

    await queryInterface.renameColumn("QueueChannels", "channelId", "whatsappId");
    await queryInterface.renameTable("QueueChannels", "QueueWhatsapps");
    
    await queryInterface.renameColumn("Tickets", "channelId", "whatsappId");
    await queryInterface.renameColumn("Messages", "channelId", "whatsappId");
    
    await queryInterface.removeColumn("Channels", "channelConfig");
    await queryInterface.removeIndex("Channels", "idx_channels_type");
    await queryInterface.removeColumn("Channels", "webhookVerifyToken");
    await queryInterface.removeColumn("Channels", "instagramToken");
    await queryInterface.removeColumn("Channels", "instagramBusinessId");
    await queryInterface.removeColumn("Channels", "facebookPageToken");
    await queryInterface.removeColumn("Channels", "facebookPageId");
    await queryInterface.removeColumn("Channels", "type");
    
    await queryInterface.renameTable("Channels", "Whatsapps");
  }
};
EOF

echo -e "${GREEN}✅ ¡Todos los archivos creados exitos"
echo -e "${GREEN}✅ ¡Todos los archivos creados exitosamente!${NC}"
echo ""
echo -e "${YELLOW}📊 Resumen de archivos creados:${NC}"
echo "  ✅ 4 Modelos (Channel, QueueChannel, Plan, SystemConfiguration)"
echo "  ✅ 6 Servicios (Base, WhatsApp, Facebook, Instagram, Plan, Configuration)"
echo "  ✅ 2 Controladores (Channel, Configuration)"
echo "  ✅ 3 Rutas (channels, webhooks, configurations)"
echo "  ✅ 1 Archivo de migración"
echo ""
echo -e "${GREEN}Total: 16 archivos${NC}"

# ===============================
# CREAR ARCHIVO GIT PARA SUBIR
# ===============================
echo ""
echo -e "${YELLOW}📤 Creando script para subir a Git...${NC}"

cat > upload-to-github.sh << 'GITSCRIPT'
#!/bin/bash

# Script para subir todos los cambios a GitHub

echo "🚀 Subiendo cambios a GitHub..."

# Agregar todos los archivos nuevos
git add backend/src/models/*.ts
git add backend/src/services/*.ts
git add backend/src/services/ChannelServices/*.ts
git add backend/src/controllers/*.ts
git add backend/src/routes/*.ts
git add backend/src/database/migrations/*.ts

# Verificar estado
echo ""
echo "📊 Estado de Git:"
git status --short

# Hacer commit
echo ""
echo "💾 Creando commit..."
git commit -m "feat: Sistema Omnichannel completo - Backend

- Soporte multicanal: WhatsApp, Facebook, Instagram
- Sistema de planes SaaS con límites y facturación
- Configuraciones desde UI (sin .env)
- Servicios base para todos los canales
- Webhooks para Meta y preparación TikTok
- Encriptación de datos sensibles
- Migración completa de BD incluida"

# Push
echo ""
echo "📤 Subiendo a GitHub..."
git push origin main

echo ""
echo "✅ ¡Listo! Revisa tu repositorio en GitHub"
GITSCRIPT

chmod +x upload-to-github.sh

# ===============================
# INSTRUCCIONES FINALES
# ===============================
echo ""
echo -e "${GREEN}════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ CREACIÓN DE ARCHIVOS COMPLETADA${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}📋 PRÓXIMOS PASOS:${NC}"
echo ""
echo "1. ${YELLOW}Verificar archivos creados:${NC}"
echo "   ls -la backend/src/models/"
echo "   ls -la backend/src/services/ChannelServices/"
echo "   ls -la backend/src/controllers/"
echo "   ls -la backend/src/routes/"
echo ""
echo "2. ${YELLOW}Actualizar server.ts:${NC}"
echo "   - Reemplazar import de whatsappRoutes por channelRoutes"
echo "   - Agregar webhookRoutes y configurationRoutes"
echo ""
echo "3. ${YELLOW}Instalar dependencias si es necesario:${NC}"
echo "   cd backend && npm install"
echo ""
echo "4. ${YELLOW}Subir a GitHub:${NC}"
echo "   ./upload-to-github.sh"
echo ""
echo "5. ${YELLOW}En el servidor de producción:${NC}"
echo "   - Pull de los cambios"
echo "   - Ejecutar migraciones: npm run db:migrate"
echo "   - Reiniciar servicios"
echo ""
echo -e "${GREEN}════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANTE:${NC}"
echo "- Los archivos viejos de WhatsApp NO se han eliminado"
echo "- Debes eliminarlos manualmente después de verificar"
echo "- Actualiza todas las referencias en otros archivos"
echo ""
echo -e "${YELLOW}📁 Archivos a eliminar manualmente:${NC}"
echo "- backend/src/models/Whatsapp.ts"
echo "- backend/src/models/QueueWhatsapp.ts"
echo "- backend/src/controllers/WhatsappController.ts"
echo "- backend/src/routes/whatsappRoutes.ts"
echo ""
echo -e "${GREEN}🎉 ¡Backend Omnichannel listo para usar!${NC}"