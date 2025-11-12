import jwt from "jsonwebtoken";
import request from "request";
import { URLSearchParams } from "url";

import metaConfig from "../../config/meta";
import AppError from "../../errors/AppError";
import { logger } from "../../utils/logger";
import Channel from "../../models/Channel";

const META_SCOPES = [
  "pages_show_list",
  "pages_manage_metadata",
  "pages_read_engagement",
  "pages_messaging",
  "read_page_mailboxes",
  "instagram_basic",
  "instagram_manage_messages",
  "instagram_manage_comments",
  "public_profile"
];

interface AuthUrlResult {
  url: string;
  state: string;
}

interface HandleCallbackParams {
  code: string;
  state: string;
}

interface StatePayload {
  companyId: number;
  userId: number;
}

const callGraphGet = async <T = any>(
  path: string,
  params: Record<string, unknown>
): Promise<T> =>
  new Promise((resolve, reject) => {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    });

    const url = `https://graph.facebook.com/${metaConfig.apiVersion}${path}?${searchParams.toString()}`;

    request(
      {
        method: "GET",
        url,
        json: true
      },
      (error, response, body) => {
        if (error || response.statusCode >= 400) {
          reject(
            new AppError(
              body?.error?.message || "ERR_META_API_CALL_FAILED",
              response?.statusCode || 500
            )
          );
          return;
        }
        resolve(body as T);
      }
    );
  });

const callGraphPost = async <T = any>(
  path: string,
  params: Record<string, unknown>
): Promise<T> =>
  new Promise((resolve, reject) => {
    const url = `https://graph.facebook.com/${metaConfig.apiVersion}${path}`;

    request(
      {
        method: "POST",
        url,
        json: true,
        form: params
      },
      (error, response, body) => {
        if (error || response.statusCode >= 400) {
          reject(
            new AppError(
              body?.error?.message || "ERR_META_API_CALL_FAILED",
              response?.statusCode || 500
            )
          );
          return;
        }
        resolve(body as T);
      }
    );
  });

const generateStateToken = (payload: StatePayload): string => {
  if (!metaConfig.stateSecret) {
    throw new AppError("ERR_CHANNEL_MISSING_TOKEN");
  }

  return jwt.sign(payload, metaConfig.stateSecret, { expiresIn: "10m" });
};

const decodeStateToken = (token: string): StatePayload => {
  try {
    return jwt.verify(token, metaConfig.stateSecret) as StatePayload;
  } catch (error) {
    throw new AppError("ERR_INVALID_SIGNATURE", 403);
  }
};

const upsertChannel = async ({
  companyId,
  name,
  type,
  externalId,
  accessToken,
  metadata
}: {
  companyId: number;
  name: string;
  type: string;
  externalId: string;
  accessToken: string;
  metadata: Record<string, unknown>;
}) => {
  const existing = await Channel.findOne({
    where: { companyId, externalId, type }
  });

  if (existing) {
    await existing.update({
      name,
      provider: "meta",
      status: "active",
      accessToken,
      metadata
    });
    return existing;
  }

  const channel = await Channel.create({
    companyId,
    name,
    provider: "meta",
    type,
    externalId,
    status: "active",
    accessToken,
    metadata
  });

  return channel;
};

export const GenerateMetaAuthUrl = ({
  companyId,
  userId
}: StatePayload): AuthUrlResult => {
  if (!metaConfig.appId || !metaConfig.redirectUri) {
    throw new AppError("ERR_CHANNEL_MISSING_TOKEN");
  }

  const state = generateStateToken({ companyId, userId });
  const params = new URLSearchParams({
    client_id: metaConfig.appId,
    redirect_uri: metaConfig.redirectUri,
    state,
    scope: META_SCOPES.join(","),
    response_type: "code"
  });

  return {
    state,
    url: `https://www.facebook.com/${metaConfig.apiVersion}/dialog/oauth?${params.toString()}`
  };
};

export const HandleMetaOAuthCallback = async ({
  code,
  state
}: HandleCallbackParams) => {
  if (!metaConfig.appId || !metaConfig.appSecret || !metaConfig.redirectUri) {
    throw new AppError("ERR_CHANNEL_MISSING_TOKEN");
  }

  const { companyId } = decodeStateToken(state);

  const tokenResponse = await callGraphGet<{
    access_token: string;
    token_type: string;
    expires_in: number;
  }>("/oauth/access_token", {
    client_id: metaConfig.appId,
    client_secret: metaConfig.appSecret,
    redirect_uri: metaConfig.redirectUri,
    code
  });

  let userAccessToken = tokenResponse.access_token;

  try {
    const longLived = await callGraphGet<{
      access_token: string;
      token_type: string;
      expires_in: number;
    }>("/oauth/access_token", {
      grant_type: "fb_exchange_token",
      client_id: metaConfig.appId,
      client_secret: metaConfig.appSecret,
      fb_exchange_token: userAccessToken
    });
    userAccessToken = longLived.access_token;
  } catch (error) {
    logger.warn({ error }, "MetaOAuth: using short-lived token");
  }

  const pagesResponse = await callGraphGet<{
    data: Array<{
      name: string;
      id: string;
    }>;
  }>("/me/accounts", {
    access_token: userAccessToken
  });

  const created: Channel[] = [];

  for (const page of pagesResponse.data || []) {
    try {
      const pageInfo = await callGraphGet<{
        id: string;
        name: string;
        access_token: string;
        instagram_business_account?: {
          id: string;
          name?: string;
        };
      }>(`/${page.id}`, {
        fields: "name,access_token,instagram_business_account",
        access_token: userAccessToken
      });

      const pageAccessToken = pageInfo.access_token;

      await callGraphPost(`/${page.id}/subscribed_apps`, {
        subscribed_fields: [
          "messages",
          "message_deliveries",
          "message_reads",
          "messaging_postbacks",
          "feed",
          "mention",
          "conversation"
        ].join(","),
        access_token: pageAccessToken
      }).catch((error) =>
        logger.warn({ error }, "MetaOAuth: failed to subscribe page webhook")
      );

      const channel = await upsertChannel({
        companyId,
        name: pageInfo.name,
        type: "facebook_messenger",
        externalId: pageInfo.id,
        accessToken: pageAccessToken,
        metadata: {
          subscribedFields: [
            "messages",
            "message_deliveries",
            "message_reads",
            "messaging_postbacks",
            "feed",
            "mention",
            "conversation"
          ],
          connectedAt: new Date().toISOString()
        }
      });
      created.push(channel);

      if (pageInfo.instagram_business_account?.id) {
        const igId = pageInfo.instagram_business_account.id;

        await callGraphPost(`/${igId}/subscribed_apps`, {
          subscribed_fields: ["comments", "messages"].join(","),
          access_token: pageAccessToken
        }).catch((error) =>
          logger.warn({ error }, "MetaOAuth: failed to subscribe IG webhook")
        );

        const igChannel = await upsertChannel({
          companyId,
          name:
            pageInfo.instagram_business_account.name ||
            `${pageInfo.name} (Instagram)`,
          type: "instagram_dm",
          externalId: igId,
          accessToken: pageAccessToken,
          metadata: {
            pageId: pageInfo.id,
            subscribedFields: ["comments", "messages"],
            connectedAt: new Date().toISOString()
          }
        });
        created.push(igChannel);
      }
    } catch (error) {
      logger.error(
        { error, page },
        "MetaOAuth: failed to process page connection"
      );
    }
  }

  return {
    companyId,
    channelsCreated: created.length
  };
};

