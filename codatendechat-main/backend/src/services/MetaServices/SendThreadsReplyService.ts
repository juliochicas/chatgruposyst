import { v4 as uuidv4 } from "uuid";
import AppError from "../../errors/AppError";
import MetaConnection from "../../models/MetaConnection";
import Ticket from "../../models/Ticket";
import CreateMessageService from "../MessageServices/CreateMessageService";
import { publishThreadsPost } from "./ThreadsGraphAPI";
import { logger } from "../../utils/logger";

interface Request {
  body: string;
  ticket: Ticket;
  metaConnection: MetaConnection;
  replyToId?: string;
}

const SendThreadsReplyService = async ({
  body,
  ticket,
  metaConnection,
  replyToId
}: Request): Promise<void> => {
  if (!metaConnection.threadsAccessToken) {
    throw new AppError("ERR_THREADS_NOT_CONNECTED");
  }

  const contact = await ticket.$get("contact");
  if (!contact) {
    throw new AppError("ERR_NO_CONTACT_FOUND");
  }

  try {
    // If we have a specific thread/reply to respond to, use it
    // Otherwise publish as a new post mentioning the user
    let text = body;

    // Extract username from contact number (format: threads_userId)
    const username = contact.name.startsWith("@")
      ? contact.name
      : `@${contact.name}`;

    // If no specific thread to reply to, mention the user
    if (!replyToId) {
      text = `${username} ${body}`;
    }

    const postId = await publishThreadsPost({
      userId: metaConnection.threadsUserId,
      accessToken: metaConnection.threadsAccessToken,
      text,
      replyToId
    });

    // Save message in database
    await CreateMessageService({
      messageData: {
        id: postId || `threads_sent_${uuidv4()}`,
        ticketId: ticket.id,
        body,
        contactId: contact.id,
        fromMe: true,
        read: true,
        channel: "threads"
      },
      companyId: metaConnection.companyId
    });

    // Update ticket
    await ticket.update({ lastMessage: body });
  } catch (err: any) {
    logger.error(
      `Error sending Threads reply: ${err.response?.data?.error?.message || err.message}`
    );
    throw new AppError(
      `ERR_SENDING_THREADS_REPLY: ${err.response?.data?.error?.message || err.message}`
    );
  }
};

export default SendThreadsReplyService;
