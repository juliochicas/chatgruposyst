import { v4 as uuidv4 } from "uuid";
import AppError from "../../errors/AppError";
import MetaConnection from "../../models/MetaConnection";
import Ticket from "../../models/Ticket";
import CreateMessageService from "../MessageServices/CreateMessageService";
import { sendMetaMessage, replyToComment } from "./MetaGraphAPI";
import { logger } from "../../utils/logger";

interface Request {
  body: string;
  ticket: Ticket;
  metaConnection: MetaConnection;
  mediaUrl?: string;
  mediaType?: string;
}

const SendMetaMessageService = async ({
  body,
  ticket,
  metaConnection,
  mediaUrl,
  mediaType
}: Request): Promise<void> => {
  if (!metaConnection.pageAccessToken) {
    throw new AppError("ERR_META_NOT_CONNECTED");
  }

  const contact = await ticket.$get("contact");
  if (!contact) {
    throw new AppError("ERR_NO_CONTACT_FOUND");
  }

  // Extract the platform user ID from the contact number
  // Contact number format: "facebook_123456" or "instagram_789012"
  const parts = contact.number.split("_");
  const recipientId = parts.length > 1 ? parts.slice(1).join("_") : contact.number;

  const channel = metaConnection.channel as "facebook" | "instagram";

  try {
    const messageId = await sendMetaMessage({
      recipientId,
      message: body,
      pageAccessToken: metaConnection.pageAccessToken,
      pageId: metaConnection.pageId,
      instagramAccountId: metaConnection.instagramAccountId,
      channel,
      mediaUrl,
      mediaType
    });

    // Save message in database
    await CreateMessageService({
      messageData: {
        id: messageId || `meta_sent_${uuidv4()}`,
        ticketId: ticket.id,
        body,
        contactId: contact.id,
        fromMe: true,
        read: true,
        mediaType: mediaType || null,
        mediaUrl: mediaUrl || null,
        channel
      },
      companyId: metaConnection.companyId
    });

    // Update ticket
    await ticket.update({ lastMessage: body });
  } catch (err: any) {
    logger.error(
      `Error sending message via ${channel}: ${err.response?.data?.error?.message || err.message}`
    );
    throw new AppError(
      `ERR_SENDING_META_MESSAGE: ${err.response?.data?.error?.message || err.message}`
    );
  }
};

export default SendMetaMessageService;
