import Ticket from "../models/Ticket";
import ChannelManager from "../libs/channels/ChannelManager";
import { SendMessage as SendWhatsappMessage } from "./SendMessage";
import Whatsapp from "../models/Whatsapp";
import AppError from "../errors/AppError";

export type ChannelMessageData = {
  number: number | string;
  body: string;
  mediaPath?: string;
  fileName?: string;
  metadata?: Record<string, unknown>;
};

const SendChannelMessage = async (
  ticket: Ticket,
  messageData: ChannelMessageData
): Promise<void | unknown> => {
  if (ticket.channelId) {
    const adapter = await ChannelManager.getAdapter(
      ticket.channelId,
      ticket.companyId
    );

    return adapter.sendMessage(ticket, messageData);
  }

  if (!ticket.whatsappId) {
    throw new AppError("ERR_NO_WAPP_FOUND", 404);
  }

  const whatsapp = await Whatsapp.findByPk(ticket.whatsappId);
  if (!whatsapp) {
    throw new AppError("ERR_NO_WAPP_FOUND", 404);
  }

  return SendWhatsappMessage(whatsapp, messageData);
};

export default SendChannelMessage;

