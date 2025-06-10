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
