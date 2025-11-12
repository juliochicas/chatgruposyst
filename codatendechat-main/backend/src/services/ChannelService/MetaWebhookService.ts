import { getIO } from "../../libs/socket";
import Channel from "../../models/Channel";
import CreateOrUpdateContactService from "../ContactServices/CreateOrUpdateContactService";
import FindOrCreateChannelTicketService from "../TicketServices/FindOrCreateChannelTicketService";
import CreateMessageService from "../MessageServices/CreateMessageService";
import { logger } from "../../utils/logger";
import ChannelIntegrationDispatcher from "./ChannelIntegrationDispatcher";
import ChannelOpenAiService from "../IntegrationsServices/ChannelOpenAiService";
import ApplyTicketTagsService from "../TicketServices/ApplyTicketTagsService";
import ChannelAutomationService from "./ChannelAutomationService";

interface MetaWebhookEntry {
  id: string;
  time: number;
  messaging?: any[];
  changes?: any[];
}

interface MetaWebhookBody {
  object: string;
  entry: MetaWebhookEntry[];
}

const handleMessagingEvent = async (
  channel: Channel,
  messaging
): Promise<void> => {
  if (!messaging.message || messaging.message.is_echo) {
    return;
  }

  const senderId = messaging.sender?.id;
  const recipientId =
    messaging.recipient?.id || messaging.recipient?.user_ref || channel.externalId;

  if (!senderId || !recipientId) {
    logger.warn("MetaMessaging: sender or recipient missing", messaging);
    return;
  }

  const contact = await CreateOrUpdateContactService({
    name: messaging.sender?.name || `Meta User ${senderId}`,
    number: senderId,
    isGroup: false,
    companyId: channel.companyId,
    preserveRawNumber: true
  });

  const ticket = await FindOrCreateChannelTicketService({
    contact,
    channel,
    companyId: channel.companyId,
    channelExternalId: senderId
  });

  const body =
    messaging.message.text ||
    messaging.message?.sticker_id ||
    "[mensagem recebida]";

  const messageId =
    messaging.message.mid ||
    `${channel.id}-${senderId}-${messaging.timestamp || Date.now()}`;

  const message = await CreateMessageService({
    companyId: channel.companyId,
    messageData: {
      id: messageId,
      ticketId: ticket.id,
      contactId: contact.id,
      body,
      fromMe: false,
      channelId: channel.id,
      channelType: channel.type,
      channelExternalId: senderId,
      metadata: {
        provider: "meta",
        kind: "messaging",
        recipientId,
        raw: messaging
      }
    }
  });

  await ChannelIntegrationDispatcher({
    ticket,
    message,
    channel,
    contact,
    rawPayload: messaging
  });

  await ApplyTicketTagsService({
    ticket,
    channel,
    metadata: {
      originType: "direct_message",
      kind: "messaging"
    }
  });

  await ChannelOpenAiService({
    ticket,
    message,
    channel,
    contact
  });

  await ChannelAutomationService({
    ticket,
    message,
    channel,
    contact,
    rawPayload: messaging
  });

  const io = getIO();
  io.to(`company-${channel.companyId}-notification`).emit(
    `company-${channel.companyId}-meta`,
    {
      action: "message",
      ticket,
      contact,
      channelId: channel.id
    }
  );
};

const handleChangeEvent = async (
  channel: Channel,
  change
): Promise<void> => {
  const value = change.value || {};
  const item = value.item;

  if (!item) {
    return;
  }

  if (value.verb && value.verb !== "add") {
    return;
  }

  const authorId = value.from?.id || value.from?.username;
  if (!authorId) {
    return;
  }

  const contact = await CreateOrUpdateContactService({
    name: value.from?.name || `Meta User ${authorId}`,
    number: authorId,
    isGroup: false,
    companyId: channel.companyId,
    preserveRawNumber: true
  });

  const ticket = await FindOrCreateChannelTicketService({
    contact,
    channel,
    companyId: channel.companyId,
    channelExternalId: authorId
  });

  const body = value.message || value.comment || value.text || "[comentário]";
  const messageId =
    value.comment_id ||
    value.media_id ||
    `${channel.id}-${authorId}-${value.post_id || Date.now()}`;

  const message = await CreateMessageService({
    companyId: channel.companyId,
    messageData: {
      id: messageId,
      ticketId: ticket.id,
      contactId: contact.id,
      body,
      fromMe: false,
      channelId: channel.id,
      channelType: channel.type,
      channelExternalId: authorId,
      metadata: {
        provider: "meta",
        kind: item,
        raw: value,
        originType: item,
        storyId: value.story_id,
        commentId: value.comment_id,
        postId: value.post_id,
        parentId: value.parent_id
      }
    }
  });

  await ChannelIntegrationDispatcher({
    ticket,
    message,
    channel,
    contact,
    rawPayload: change
  });

  await ApplyTicketTagsService({
    ticket,
    channel,
    metadata: value
  });

  await ChannelOpenAiService({
    ticket,
    message,
    channel,
    contact
  });

  await ChannelAutomationService({
    ticket,
    message,
    channel,
    contact,
    rawPayload: change
  });
};

const MetaWebhookService = {
  async process(body: MetaWebhookBody): Promise<void> {
    if (!body?.entry || !Array.isArray(body.entry)) {
      return;
    }

    for (const entry of body.entry) {
      let channel = await Channel.findOne({
        where: { externalId: entry.id }
      });

      if (!channel) {
        const recipientId = entry.messaging?.[0]?.recipient?.id;
        if (recipientId) {
          channel = await Channel.findOne({
            where: { externalId: recipientId }
          });
        }
      }

      if (!channel) {
        const changeValue = entry.changes?.[0]?.value || {};
        const pageId =
          changeValue.page_id ||
          changeValue.ig_id ||
          changeValue.instagram_ig_id ||
          changeValue.recipient_id;

        if (pageId) {
          channel = await Channel.findOne({
            where: { externalId: pageId }
          });
        }
      }

      if (!channel) {
        logger.warn(
          `MetaWebhook: no channel mapped for entry ${entry.id}`,
          entry
        );
        continue;
      }

      if (entry.messaging) {
        for (const messaging of entry.messaging) {
          await handleMessagingEvent(channel, messaging);
        }
      }

      if (entry.changes) {
        for (const change of entry.changes) {
          await handleChangeEvent(channel, change);
        }
      }
    }
  }
};

export default MetaWebhookService;

