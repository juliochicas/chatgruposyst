import request from "request";

import Channel from "../../models/Channel";
import Ticket from "../../models/Ticket";
import Message from "../../models/Message";
import { ChannelAdapter, SendMessagePayload } from "./ChannelAdapter";
import AppError from "../../errors/AppError";
import metaConfig from "../../config/meta";
import { logger } from "../../utils/logger";

class MetaChannelAdapter implements ChannelAdapter {
  constructor(private readonly channel: Channel) {}

  private get accessToken(): string {
    if (!this.channel.accessToken) {
      throw new AppError("ERR_CHANNEL_MISSING_TOKEN");
    }
    return this.channel.accessToken;
  }

  private async callGraphApi(
    path: string,
    body: Record<string, unknown>
  ): Promise<void> {
    const url = `https://graph.facebook.com/${metaConfig.apiVersion}/${path}`;

    await new Promise<void>((resolve, reject) => {
      request(
        {
          method: "POST",
          url,
          qs: {
            access_token: this.accessToken
          },
          json: body
        },
        (error, response, responseBody) => {
          if (error || response.statusCode >= 400) {
            logger.error(
              {
                error,
                status: response?.statusCode,
                body: responseBody
              },
              "Meta API call failed"
            );
            reject(
              new AppError(
                "ERR_META_API_CALL_FAILED",
                response?.statusCode || 500
              )
            );
            return;
          }
          resolve();
        }
      );
    });
  }

  async sendMessage(ticket: Ticket, payload: SendMessagePayload): Promise<void> {
    if (!ticket.channelExternalId) {
      throw new AppError("ERR_CHANNEL_MISSING_RECIPIENT");
    }

    if (this.channel.type?.includes("comment")) {
      const commentId =
        payload.metadata?.commentId || ticket.channelExternalId;
      await this.callGraphApi(`${commentId}/comments`, {
        message: payload.body
      });
      return;
    }

    await this.callGraphApi(`${this.channel.externalId}/messages`, {
      messaging_type: "RESPONSE",
      recipient: {
        id: ticket.channelExternalId
      },
      message: {
        text: payload.body
      }
    });
  }

  async markAsRead(ticket: Ticket, messages: Message[]): Promise<void> {
    if (!ticket.channelExternalId) {
      return;
    }

    try {
      await this.callGraphApi(`${this.channel.externalId}/messages`, {
        recipient: { id: ticket.channelExternalId },
        sender_action: "mark_seen"
      });
    } catch (error) {
      logger.warn({ error }, "Failed to mark conversation as read on Meta");
    }
  }
}

export default MetaChannelAdapter;

