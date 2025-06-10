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
