import Ticket from "../../models/Ticket";
import Message from "../../models/Message";

export interface SendMessagePayload {
  number: string | number;
  body: string;
  mediaPath?: string;
  fileName?: string;
  metadata?: Record<string, unknown>;
}

export interface ChannelAdapter {
  sendMessage(
    ticket: Ticket,
    payload: SendMessagePayload
  ): Promise<void | unknown>;

  markAsRead?(ticket: Ticket, messages: Message[]): Promise<void>;
}

