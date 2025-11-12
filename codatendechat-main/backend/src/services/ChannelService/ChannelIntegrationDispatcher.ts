import request from "request";

import Ticket from "../../models/Ticket";
import Message from "../../models/Message";
import Channel from "../../models/Channel";
import Queue from "../../models/Queue";
import Contact from "../../models/Contact";
import QueueIntegrations from "../../models/QueueIntegrations";
import ShowQueueIntegrationService from "../QueueIntegrationServices/ShowQueueIntegrationService";
import { logger } from "../../utils/logger";

interface DispatchParams {
  ticket: Ticket;
  message: Message;
  channel: Channel;
  contact: Contact;
  rawPayload: any;
}

const fetchIntegrations = async (
  ticket: Ticket
): Promise<QueueIntegrations[]> => {
  const integrationIds = new Set<number>();

  if (ticket.integrationId) {
    integrationIds.add(Number(ticket.integrationId));
  }

  if (ticket.queueId) {
    const queue =
      ticket.queue ||
      (await Queue.findByPk(ticket.queueId, { attributes: ["integrationId"] }));
    if (queue?.integrationId) {
      integrationIds.add(Number(queue.integrationId));
    }
  }

  const integrations: QueueIntegrations[] = [];

  await Promise.all(
    Array.from(integrationIds).map(async (id) => {
      try {
        const integration = await ShowQueueIntegrationService(
          id,
          ticket.companyId
        );
        integrations.push(integration);
      } catch (error) {
        logger.warn({ error, id }, "ChannelIntegration: integration not found");
      }
    })
  );

  return integrations;
};

const sendToN8n = async (
  integration: QueueIntegrations,
  payload: any
): Promise<void> =>
  new Promise((resolve, reject) => {
    if (!integration.urlN8N) {
      resolve();
      return;
    }

    request(
      {
        method: "POST",
        url: integration.urlN8N,
        headers: {
          "Content-Type": "application/json"
        },
        json: payload,
        timeout: 10000
      },
      (error, response) => {
        if (error || response.statusCode >= 400) {
          reject(
            error ||
              new Error(
                `Integration responded with status ${response.statusCode}`
              )
          );
          return;
        }
        resolve();
      }
    );
  });

const buildPayload = ({
  ticket,
  message,
  channel,
  contact,
  rawPayload
}: DispatchParams) => {
  const plainTicket = ticket.get({ plain: true });
  const plainMessage = message.get({ plain: true });
  const plainContact = contact.get({ plain: true });

  return {
    ticket: {
      id: ticket.id,
      uuid: ticket.uuid,
      status: ticket.status,
      channelId: ticket.channelId,
      channelType: ticket.channelType,
      channelExternalId: ticket.channelExternalId,
      queueId: ticket.queueId,
      companyId: ticket.companyId,
      useIntegration: ticket.useIntegration,
      promptId: ticket.promptId,
      ...plainTicket
    },
    contact: {
      id: contact.id,
      name: contact.name,
      number: contact.number,
      email: contact.email,
      disableBot: contact.disableBot,
      ...plainContact
    },
    message: {
      id: message.id,
      body: message.body,
      fromMe: message.fromMe,
      mediaType: message.mediaType,
      metadata: message.metadata,
      channelId: message.channelId,
      channelType: message.channelType,
      channelExternalId: message.channelExternalId,
      createdAt: message.createdAt,
      ...plainMessage
    },
    channel: {
      id: channel.id,
      type: channel.type,
      provider: channel.provider,
      name: channel.name,
      externalId: channel.externalId,
      metadata: channel.metadata
    },
    rawPayload
  };
};

const ChannelIntegrationDispatcher = async (
  params: DispatchParams
): Promise<void> => {
  try {
    const integrations = await fetchIntegrations(params.ticket);

    if (!integrations.length) {
      return;
    }

    const payload = buildPayload(params);

    await Promise.all(
      integrations.map(async (integration) => {
        if (integration.type === "n8n" || integration.type === "webhook") {
          try {
            await sendToN8n(integration, payload);
          } catch (error) {
            logger.error(
              { error, integrationId: integration.id },
              "ChannelIntegration: dispatch failed"
            );
          }
        }
      })
    );
  } catch (error) {
    logger.error({ error }, "ChannelIntegrationDispatcher: unexpected error");
  }
};

export default ChannelIntegrationDispatcher;

