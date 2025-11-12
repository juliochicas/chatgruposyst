import { ChannelAdapter, SendMessagePayload } from "./ChannelAdapter";
import Channel from "../../models/Channel";
import Ticket from "../../models/Ticket";
import Message from "../../models/Message";
import Whatsapp from "../../models/Whatsapp";
import AppError from "../../errors/AppError";
import { SendMessage } from "../../helpers/SendMessage";
import SetTicketMessagesAsRead from "../../helpers/SetTicketMessagesAsRead";

class WhatsappChannelAdapter implements ChannelAdapter {
  constructor(private readonly channel: Channel) {}

  private async getWhatsapp(ticket: Ticket): Promise<Whatsapp> {
    if (!ticket.whatsappId) {
      throw new AppError("ERR_NO_WAPP_FOUND", 404);
    }

    const whatsapp = await Whatsapp.findByPk(ticket.whatsappId);

    if (!whatsapp) {
      throw new AppError("ERR_NO_WAPP_FOUND", 404);
    }

    return whatsapp;
  }

  async sendMessage(
    ticket: Ticket,
    payload: SendMessagePayload
  ): Promise<void> {
    const whatsapp = await this.getWhatsapp(ticket);
    await SendMessage(whatsapp, payload);
  }

  async markAsRead(ticket: Ticket, messages: Message[]): Promise<void> {
    await SetTicketMessagesAsRead(ticket, messages);
  }
}

export default WhatsappChannelAdapter;

