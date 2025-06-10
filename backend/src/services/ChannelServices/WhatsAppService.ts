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
