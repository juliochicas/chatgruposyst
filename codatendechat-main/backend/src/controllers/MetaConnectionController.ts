import { Request, Response } from "express";
import { getIO } from "../libs/socket";
import { logger } from "../utils/logger";

import CreateMetaConnectionService from "../services/MetaServices/CreateMetaConnectionService";
import ListMetaConnectionsService from "../services/MetaServices/ListMetaConnectionsService";
import ShowMetaConnectionService from "../services/MetaServices/ShowMetaConnectionService";
import UpdateMetaConnectionService from "../services/MetaServices/UpdateMetaConnectionService";
import DeleteMetaConnectionService from "../services/MetaServices/DeleteMetaConnectionService";
import SendMetaMessageService from "../services/MetaServices/SendMetaMessageService";
import MetaConnection from "../models/MetaConnection";
import Ticket from "../models/Ticket";

import {
  exchangeForLongLivedToken,
  getUserPages,
  getInstagramAccount,
  subscribePageToWebhook
} from "../services/MetaServices/MetaGraphAPI";

import {
  handleFacebookWebhook,
  handleInstagramWebhook,
  handleFeedWebhook
} from "../services/MetaServices/MetaMessageListener";

// ==========================================
// CRUD endpoints for Meta Connections
// ==========================================

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const metaConnections = await ListMetaConnectionsService({ companyId });
  return res.status(200).json(metaConnections);
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const {
    name,
    channel,
    greetingMessage,
    complationMessage,
    outOfHoursMessage,
    ratingMessage,
    queueIds,
    isDefault,
    transferQueueId,
    timeToTransfer,
    promptId,
    maxUseBotQueues,
    expiresTicket,
    expiresInactiveMessage,
    integrationId
  } = req.body;
  const { companyId } = req.user;

  const metaConnection = await CreateMetaConnectionService({
    name,
    channel: channel || "facebook",
    companyId,
    queueIds,
    greetingMessage,
    complationMessage,
    outOfHoursMessage,
    ratingMessage,
    isDefault,
    transferQueueId,
    timeToTransfer,
    promptId,
    maxUseBotQueues,
    expiresTicket,
    expiresInactiveMessage,
    integrationId
  });

  const io = getIO();
  io.to(`company-${companyId}-mainchannel`).emit(
    `company-${companyId}-metaConnection`,
    {
      action: "update",
      metaConnection
    }
  );

  return res.status(200).json(metaConnection);
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { metaConnectionId } = req.params;
  const { companyId } = req.user;

  const metaConnection = await ShowMetaConnectionService(
    metaConnectionId,
    companyId
  );

  return res.status(200).json(metaConnection);
};

export const update = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { metaConnectionId } = req.params;
  const metaConnectionData = req.body;
  const { companyId } = req.user;

  const metaConnection = await UpdateMetaConnectionService({
    metaConnectionData,
    metaConnectionId,
    companyId
  });

  const io = getIO();
  io.to(`company-${companyId}-mainchannel`).emit(
    `company-${companyId}-metaConnection`,
    {
      action: "update",
      metaConnection
    }
  );

  return res.status(200).json(metaConnection);
};

export const remove = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { metaConnectionId } = req.params;
  const { companyId } = req.user;

  await ShowMetaConnectionService(metaConnectionId, companyId);
  await DeleteMetaConnectionService(metaConnectionId);

  const io = getIO();
  io.to(`company-${companyId}-mainchannel`).emit(
    `company-${companyId}-metaConnection`,
    {
      action: "delete",
      metaConnectionId: +metaConnectionId
    }
  );

  return res.status(200).json({ message: "Meta connection deleted." });
};

// ==========================================
// OAuth Flow: Meta Login
// ==========================================

// Step 1: Generate OAuth URL for the user to authorize
export const getOAuthUrl = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { metaConnectionId } = req.params;
  const { companyId } = req.user;

  const metaConnection = await ShowMetaConnectionService(
    metaConnectionId,
    companyId
  );

  const appId = process.env.META_APP_ID;
  const redirectUri = `${process.env.BACKEND_URL}/meta/callback`;
  const state = `${metaConnectionId}_${companyId}`;

  const scopes = [
    "pages_show_list",
    "pages_messaging",
    "pages_manage_metadata",
    "pages_read_engagement",
    "instagram_basic",
    "instagram_manage_messages",
    "instagram_manage_comments"
  ].join(",");

  const oauthUrl =
    `https://www.facebook.com/v21.0/dialog/oauth?` +
    `client_id=${appId}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&scope=${scopes}` +
    `&state=${state}` +
    `&response_type=code`;

  return res.status(200).json({ url: oauthUrl });
};

// Step 2: OAuth Callback - exchange code for tokens
export const oauthCallback = async (
  req: Request,
  res: Response
): Promise<Response | void> => {
  const { code, state } = req.query as { code: string; state: string };

  if (!code || !state) {
    return res.status(400).json({ error: "Missing code or state" });
  }

  const [metaConnectionId, companyIdStr] = state.split("_");
  const companyId = parseInt(companyIdStr, 10);

  try {
    const appId = process.env.META_APP_ID;
    const appSecret = process.env.META_APP_SECRET;
    const redirectUri = `${process.env.BACKEND_URL}/meta/callback`;

    // Exchange code for short-lived access token
    const axios = require("axios");
    const tokenResponse = await axios.get(
      `https://graph.facebook.com/v21.0/oauth/access_token`,
      {
        params: {
          client_id: appId,
          client_secret: appSecret,
          redirect_uri: redirectUri,
          code
        }
      }
    );

    const shortLivedToken = tokenResponse.data.access_token;

    // Exchange for long-lived token
    const { accessToken, expiresIn } = await exchangeForLongLivedToken(
      shortLivedToken,
      appId,
      appSecret
    );

    const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000);

    // Get user's pages
    const pages = await getUserPages(accessToken);

    if (pages.length === 0) {
      return res.redirect(
        `${process.env.FRONTEND_URL}/connections?error=no_pages`
      );
    }

    // Use first page (or allow selection in frontend)
    const page = pages[0];

    // Check for Instagram business account
    const igAccount = await getInstagramAccount(page.id, page.access_token);

    // Subscribe page to webhooks
    await subscribePageToWebhook(page.id, page.access_token);

    // Update the MetaConnection with all the data
    await UpdateMetaConnectionService({
      metaConnectionId,
      companyId,
      metaConnectionData: {
        status: "CONNECTED",
        accessToken,
        tokenExpiresAt,
        pageId: page.id,
        pageName: page.name,
        pageAccessToken: page.access_token,
        instagramAccountId: igAccount?.id || null,
        instagramUsername: igAccount?.username || null
      }
    });

    // If there's an Instagram account, create a separate connection for it
    if (igAccount) {
      const existingIg = await MetaConnection.findOne({
        where: {
          instagramAccountId: igAccount.id,
          companyId
        }
      });

      if (!existingIg) {
        // Get the original connection to copy settings
        const originalConnection = await MetaConnection.findByPk(
          +metaConnectionId
        );

        if (originalConnection) {
          await MetaConnection.create({
            name: `Instagram - ${igAccount.username}`,
            channel: "instagram",
            status: "CONNECTED",
            companyId,
            accessToken,
            tokenExpiresAt,
            pageId: page.id,
            pageName: page.name,
            pageAccessToken: page.access_token,
            instagramAccountId: igAccount.id,
            instagramUsername: igAccount.username,
            greetingMessage: originalConnection.greetingMessage,
            farewellMessage: originalConnection.farewellMessage,
            outOfHoursMessage: originalConnection.outOfHoursMessage,
            webhookVerifyToken: originalConnection.webhookVerifyToken
          });
        }
      }
    }

    const io = getIO();
    io.to(`company-${companyId}-mainchannel`).emit(
      `company-${companyId}-metaConnection`,
      { action: "update" }
    );

    // Redirect back to frontend
    return res.redirect(
      `${process.env.FRONTEND_URL}/connections?meta=success&page=${encodeURIComponent(page.name)}${igAccount ? `&instagram=${encodeURIComponent(igAccount.username)}` : ""}`
    );
  } catch (err: any) {
    logger.error(`Meta OAuth error: ${err.message}`);
    return res.redirect(
      `${process.env.FRONTEND_URL}/connections?error=oauth_failed`
    );
  }
};

// Step 3: Get available pages for selection (after OAuth)
export const getPages = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { metaConnectionId } = req.params;
  const { companyId } = req.user;

  const metaConnection = await ShowMetaConnectionService(
    metaConnectionId,
    companyId
  );

  if (!metaConnection.accessToken) {
    return res.status(400).json({ error: "Not authenticated with Meta" });
  }

  const pages = await getUserPages(metaConnection.accessToken);

  // For each page, check if it has an Instagram business account
  const pagesWithIg = await Promise.all(
    pages.map(async page => {
      const igAccount = await getInstagramAccount(page.id, page.access_token);
      return {
        ...page,
        instagram: igAccount
      };
    })
  );

  return res.status(200).json(pagesWithIg);
};

// ==========================================
// Webhook endpoint for Meta
// ==========================================

// GET - Webhook verification (Meta sends a challenge)
export const webhookVerify = async (
  req: Request,
  res: Response
): Promise<Response | void> => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  const verifyToken = process.env.META_WEBHOOK_VERIFY_TOKEN;

  if (mode === "subscribe" && token === verifyToken) {
    logger.info("Meta webhook verified successfully");
    return res.status(200).send(challenge);
  }

  logger.warn(`Meta webhook verification failed. Token: ${token}`);
  return res.status(403).json({ error: "Verification failed" });
};

// POST - Receive webhook events from Meta
export const webhookReceive = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const body = req.body;

  // Always respond 200 quickly to Meta (they retry on failure)
  res.status(200).send("EVENT_RECEIVED");

  try {
    if (body.object === "page") {
      // Facebook Page events
      for (const entry of body.entry || []) {
        // Handle messaging events (DMs)
        if (entry.messaging) {
          await handleFacebookWebhook(entry);
        }
        // Handle feed events (comments)
        if (entry.changes) {
          await handleFeedWebhook(entry);
        }
      }
    } else if (body.object === "instagram") {
      // Instagram events
      for (const entry of body.entry || []) {
        if (entry.messaging) {
          await handleInstagramWebhook(entry);
        }
      }
    }
  } catch (err) {
    logger.error(`Error processing Meta webhook: ${err}`);
  }

  return;
};

// ==========================================
// Send message via Meta
// ==========================================

export const sendMessage = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { ticketId } = req.params;
  const { body: messageBody, mediaUrl, mediaType } = req.body;
  const { companyId } = req.user;

  const ticket = await Ticket.findOne({
    where: { id: ticketId, companyId },
    include: ["contact"]
  });

  if (!ticket) {
    return res.status(404).json({ error: "Ticket not found" });
  }

  if (!ticket.metaConnectionId) {
    return res.status(400).json({ error: "Ticket is not a Meta ticket" });
  }

  const metaConnection = await MetaConnection.findByPk(
    ticket.metaConnectionId
  );

  if (!metaConnection) {
    return res.status(404).json({ error: "Meta connection not found" });
  }

  await SendMetaMessageService({
    body: messageBody,
    ticket,
    metaConnection,
    mediaUrl,
    mediaType
  });

  return res.status(200).json({ message: "Message sent" });
};
