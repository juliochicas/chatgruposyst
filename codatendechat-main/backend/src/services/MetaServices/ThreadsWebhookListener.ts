import { v4 as uuidv4 } from "uuid";
import * as Sentry from "@sentry/node";
import { logger } from "../../utils/logger";
import { getIO } from "../../libs/socket";
import MetaConnection from "../../models/MetaConnection";
import CreateOrUpdateContactService from "../ContactServices/CreateOrUpdateContactService";
import CreateMessageService from "../MessageServices/CreateMessageService";
import FindOrCreateATicketTrakingService from "../TicketServices/FindOrCreateATicketTrakingService";
import { getThreadsUserProfile, publishThreadsPost } from "./ThreadsGraphAPI";
import Ticket from "../../models/Ticket";
import Whatsapp from "../../models/Whatsapp";

interface ThreadsWebhookEntry {
  id: string;
  time: number;
  changes?: ThreadsChangeEvent[];
}

interface ThreadsChangeEvent {
  field: string;
  value: {
    item: string;
    verb: string;
    thread_id?: string;
    reply_id?: string;
    text?: string;
    from?: {
      id: string;
      username: string;
    };
    timestamp?: number;
    media_url?: string;
    media_type?: string;
  };
}

// Process Threads webhook events (replies and mentions)
export const handleThreadsWebhook = async (
  entry: ThreadsWebhookEntry
): Promise<void> => {
  if (!entry.changes) return;

  for (const change of entry.changes) {
    try {
      // Process replies to our threads
      if (change.field === "replies") {
        await handleThreadsReply(entry.id, change);
      }

      // Process mentions of our account
      if (change.field === "mentions") {
        await handleThreadsMention(entry.id, change);
      }
    } catch (err) {
      Sentry.captureException(err);
      logger.error(`Error handling Threads webhook event: ${err}`);
    }
  }
};

// Handle reply on one of our threads
const handleThreadsReply = async (
  accountId: string,
  change: ThreadsChangeEvent
): Promise<void> => {
  // Find the MetaConnection for this Threads account
  const metaConnection = await MetaConnection.findOne({
    where: { threadsUserId: accountId, channel: "threads" }
  });

  if (!metaConnection) {
    logger.warn(`No MetaConnection found for Threads account ${accountId}`);
    return;
  }

  const value = change.value;
  if (!value.from || value.verb !== "add") return;

  // Skip our own replies
  if (value.from.id === accountId) return;

  await handleIncomingThreadsMessage(
    metaConnection,
    value.from.id,
    value.from.username,
    value.text || "[Respuesta en Threads]",
    value.reply_id || `threads_reply_${Date.now()}`,
    value.thread_id,
    value.media_url,
    value.media_type
  );
};

// Handle mention of our account in a thread
const handleThreadsMention = async (
  accountId: string,
  change: ThreadsChangeEvent
): Promise<void> => {
  const metaConnection = await MetaConnection.findOne({
    where: { threadsUserId: accountId, channel: "threads" }
  });

  if (!metaConnection) {
    logger.warn(`No MetaConnection found for Threads account ${accountId}`);
    return;
  }

  const value = change.value;
  if (!value.from || value.verb !== "add") return;

  // Skip our own mentions
  if (value.from.id === accountId) return;

  await handleIncomingThreadsMessage(
    metaConnection,
    value.from.id,
    value.from.username,
    `[Mencion en Threads] ${value.text || ""}`,
    value.thread_id || `threads_mention_${Date.now()}`,
    value.thread_id,
    value.media_url,
    value.media_type
  );
};

// Core handler - process any incoming Threads message/reply/mention
const handleIncomingThreadsMessage = async (
  metaConnection: MetaConnection,
  senderId: string,
  senderUsername: string,
  body: string,
  messageId: string,
  threadId: string | undefined,
  mediaUrl?: string,
  mediaType?: string
): Promise<void> => {
  const companyId = metaConnection.companyId;

  // Get sender profile
  let profilePicUrl = "";
  try {
    const profile = await getThreadsUserProfile(
      senderId,
      metaConnection.threadsAccessToken
    );
    profilePicUrl = profile.threads_profile_picture_url || "";
  } catch (err) {
    // Profile pic is optional
  }

  // Create or update contact
  const contact = await CreateOrUpdateContactService({
    name: `@${senderUsername}`,
    number: `threads_${senderId}`,
    profilePicUrl,
    isGroup: false,
    companyId,
    channel: "threads"
  });

  // Find or create ticket for this Threads conversation
  let defaultWhatsapp = await Whatsapp.findOne({
    where: { companyId, isDefault: true }
  });
  const whatsappId = defaultWhatsapp?.id || 0;

  let ticket = await Ticket.findOne({
    where: {
      contactId: contact.id,
      companyId,
      metaConnectionId: metaConnection.id,
      channel: "threads"
    },
    order: [["id", "DESC"]]
  });

  if (ticket && ticket.status === "closed") {
    await ticket.update({ queueId: null, userId: null, status: "pending" });
  }

  if (!ticket) {
    ticket = await Ticket.create({
      contactId: contact.id,
      status: "pending",
      isGroup: false,
      unreadMessages: 1,
      whatsappId: whatsappId || null,
      companyId,
      channel: "threads",
      metaConnectionId: metaConnection.id
    });

    await FindOrCreateATicketTrakingService({
      ticketId: ticket.id,
      companyId,
      whatsappId: whatsappId || null,
      userId: ticket.userId
    });
  } else {
    await ticket.update({
      unreadMessages: (ticket.unreadMessages || 0) + 1,
      status: ticket.status === "closed" ? "pending" : ticket.status
    });
  }

  // Create message
  await CreateMessageService({
    messageData: {
      id: messageId,
      ticketId: ticket.id,
      body,
      contactId: contact.id,
      fromMe: false,
      read: false,
      mediaType: mediaType || null,
      mediaUrl: mediaUrl || null,
      channel: "threads"
    },
    companyId
  });

  // Update ticket lastMessage
  await ticket.update({ lastMessage: body });

  // Emit socket events
  const io = getIO();
  io.to(`company-${companyId}-mainchannel`)
    .to(`company-${companyId}-${ticket.status}`)
    .to(`company-${companyId}-notification`)
    .emit(`company-${companyId}-ticket`, {
      action: "update",
      ticket
    });
};
