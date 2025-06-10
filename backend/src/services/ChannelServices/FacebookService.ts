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
