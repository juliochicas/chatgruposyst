import { v4 as uuidv4 } from "uuid";
import * as Sentry from "@sentry/node";
import { logger } from "../../utils/logger";
import { getIO } from "../../libs/socket";
import MetaConnection from "../../models/MetaConnection";
import CreateOrUpdateContactService from "../ContactServices/CreateOrUpdateContactService";
import FindOrCreateTicketService from "../TicketServices/FindOrCreateTicketService";
import CreateMessageService from "../MessageServices/CreateMessageService";
import FindOrCreateATicketTrakingService from "../TicketServices/FindOrCreateATicketTrakingService";
import { getMetaUserProfile } from "./MetaGraphAPI";
import Contact from "../../models/Contact";
import Ticket from "../../models/Ticket";
import Whatsapp from "../../models/Whatsapp";

interface MetaWebhookEntry {
  id: string;
  time: number;
  messaging?: MetaMessagingEvent[];
  changes?: MetaChangeEvent[];
}

interface MetaMessagingEvent {
  sender: { id: string };
  recipient: { id: string };
  timestamp: number;
  message?: {
    mid: string;
    text?: string;
    attachments?: Array<{
      type: string;
      payload: { url: string };
    }>;
    reply_to?: {
      mid?: string;
      story?: { url: string; id: string };
    };
    is_echo?: boolean;
  };
  postback?: {
    title: string;
    payload: string;
  };
  read?: {
    watermark: number;
  };
  delivery?: {
    mids: string[];
    watermark: number;
  };
}

interface MetaChangeEvent {
  field: string;
  value: {
    item: string;
    comment_id: string;
    parent_id?: string;
    post_id?: string;
    message: string;
    from: { id: string; name: string };
    created_time: number;
    verb: string;
  };
}

// Process incoming Facebook Messenger webhook events
export const handleFacebookWebhook = async (
  entry: MetaWebhookEntry
): Promise<void> => {
  if (!entry.messaging) return;

  for (const event of entry.messaging) {
    try {
      // Skip echo messages (sent by us)
      if (event.message?.is_echo) continue;

      // Skip delivery/read receipts
      if (event.delivery || event.read) continue;

      const pageId = event.recipient.id;
      const senderId = event.sender.id;

      // Find the MetaConnection for this page
      const metaConnection = await MetaConnection.findOne({
        where: { pageId, channel: "facebook" }
      });

      if (!metaConnection) {
        logger.warn(`No MetaConnection found for Facebook page ${pageId}`);
        continue;
      }

      if (event.message) {
        await handleIncomingMessage(
          metaConnection,
          senderId,
          event.message,
          "facebook"
        );
      } else if (event.postback) {
        await handleIncomingMessage(
          metaConnection,
          senderId,
          {
            mid: `postback_${Date.now()}`,
            text: event.postback.payload || event.postback.title
          },
          "facebook"
        );
      }
    } catch (err) {
      Sentry.captureException(err);
      logger.error(`Error handling Facebook webhook event: ${err}`);
    }
  }
};

// Process incoming Instagram webhook events
export const handleInstagramWebhook = async (
  entry: MetaWebhookEntry
): Promise<void> => {
  if (!entry.messaging) return;

  for (const event of entry.messaging) {
    try {
      // Skip echo messages
      if (event.message?.is_echo) continue;

      // Skip delivery/read receipts
      if (event.delivery || event.read) continue;

      const igAccountId = event.recipient.id;
      const senderId = event.sender.id;

      // Find the MetaConnection for this Instagram account
      const metaConnection = await MetaConnection.findOne({
        where: { instagramAccountId: igAccountId, channel: "instagram" }
      });

      // Also try matching by pageId (IG uses page-linked token)
      let connection = metaConnection;
      if (!connection) {
        connection = await MetaConnection.findOne({
          where: { instagramAccountId: igAccountId }
        });
      }

      if (!connection) {
        logger.warn(`No MetaConnection found for Instagram account ${igAccountId}`);
        continue;
      }

      if (event.message) {
        const messageData: any = {
          mid: event.message.mid,
          text: event.message.text,
          attachments: event.message.attachments
        };

        // Check if it's a story reply
        if (event.message.reply_to?.story) {
          messageData.text = `[Respuesta a historia] ${event.message.text || ""}`;
          messageData.storyUrl = event.message.reply_to.story.url;
        }

        await handleIncomingMessage(
          connection,
          senderId,
          messageData,
          "instagram"
        );
      }
    } catch (err) {
      Sentry.captureException(err);
      logger.error(`Error handling Instagram webhook event: ${err}`);
    }
  }
};

// Process feed changes (comments on posts/reels)
export const handleFeedWebhook = async (
  entry: MetaWebhookEntry
): Promise<void> => {
  if (!entry.changes) return;

  for (const change of entry.changes) {
    try {
      if (change.field !== "feed") continue;
      if (change.value.item !== "comment") continue;
      if (change.value.verb !== "add") continue;

      const pageId = entry.id;

      const metaConnection = await MetaConnection.findOne({
        where: { pageId }
      });

      if (!metaConnection) {
        logger.warn(`No MetaConnection found for page ${pageId} (feed)`);
        continue;
      }

      const commentData = change.value;

      // Create a message from the comment
      await handleIncomingMessage(
        metaConnection,
        commentData.from.id,
        {
          mid: commentData.comment_id,
          text: `[Comentario en publicación] ${commentData.message}`,
          commenterName: commentData.from.name
        },
        "facebook",
        true // isComment flag
      );
    } catch (err) {
      Sentry.captureException(err);
      logger.error(`Error handling feed webhook event: ${err}`);
    }
  }
};

// Core handler - process any incoming message regardless of channel
const handleIncomingMessage = async (
  metaConnection: MetaConnection,
  senderId: string,
  messageData: any,
  channel: "facebook" | "instagram",
  isComment: boolean = false
): Promise<void> => {
  const companyId = metaConnection.companyId;

  // Get sender profile
  let senderProfile;
  if (messageData.commenterName) {
    senderProfile = {
      id: senderId,
      name: messageData.commenterName,
      profilePic: undefined
    };
  } else {
    senderProfile = await getMetaUserProfile(
      senderId,
      metaConnection.pageAccessToken,
      channel
    );
  }

  // Create or update contact
  // For Meta contacts, we use the platform user ID as "number"
  const contact = await CreateOrUpdateContactService({
    name: senderProfile.name,
    number: `${channel}_${senderId}`,
    profilePicUrl: senderProfile.profilePic || "",
    isGroup: false,
    companyId,
    channel
  });

  // We need a whatsappId for FindOrCreateTicketService compatibility
  // First try to find an existing default whatsapp, or use 0
  let defaultWhatsapp = await Whatsapp.findOne({
    where: { companyId, isDefault: true }
  });
  const whatsappId = defaultWhatsapp?.id || 0;

  // Find or create ticket
  let ticket = await Ticket.findOne({
    where: {
      contactId: contact.id,
      companyId,
      metaConnectionId: metaConnection.id,
      channel
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
      channel,
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

  // Build message body
  let body = messageData.text || "";

  // Handle attachments
  let mediaUrl: string | null = null;
  let mediaType: string | null = null;

  if (messageData.attachments && messageData.attachments.length > 0) {
    const attachment = messageData.attachments[0];
    mediaUrl = attachment.payload?.url;
    mediaType = attachment.type; // image, video, audio, file
    if (!body) {
      body = `[${mediaType}]`;
    }
  }

  // Create message
  const messageId = messageData.mid || `meta_${uuidv4()}`;

  await CreateMessageService({
    messageData: {
      id: messageId,
      ticketId: ticket.id,
      body,
      contactId: contact.id,
      fromMe: false,
      read: false,
      mediaType,
      mediaUrl,
      channel
    },
    companyId
  });

  // Update ticket lastMessage
  await ticket.update({ lastMessage: body });

  // Emit socket events for real-time updates
  const io = getIO();
  io.to(`company-${companyId}-mainchannel`)
    .to(`company-${companyId}-${ticket.status}`)
    .to(`company-${companyId}-notification`)
    .emit(`company-${companyId}-ticket`, {
      action: "update",
      ticket
    });

  // Auto-reply with greeting message if ticket is new
  if (ticket.status === "pending" && metaConnection.greetingMessage) {
    const hasExistingMessages = await Ticket.findOne({
      where: { contactId: contact.id, companyId, channel },
      include: ["messages"]
    });

    // Only greet on first contact
    if (!hasExistingMessages || !hasExistingMessages.messages || hasExistingMessages.messages.length <= 1) {
      const { sendMetaMessage } = require("./MetaGraphAPI");

      try {
        await sendMetaMessage({
          recipientId: senderId,
          message: metaConnection.greetingMessage,
          pageAccessToken: metaConnection.pageAccessToken,
          pageId: metaConnection.pageId,
          instagramAccountId: metaConnection.instagramAccountId,
          channel
        });

        // Save the greeting as a message
        await CreateMessageService({
          messageData: {
            id: `greeting_${uuidv4()}`,
            ticketId: ticket.id,
            body: metaConnection.greetingMessage,
            contactId: contact.id,
            fromMe: true,
            read: true,
            channel
          },
          companyId
        });
      } catch (err) {
        logger.error(`Error sending greeting via ${channel}: ${err}`);
      }
    }
  }
};
