import { Request, Response } from "express";
import { getIO } from "../libs/socket";
import { logger } from "../utils/logger";

import CreateShopifyConnectionService from "../services/ShopifyServices/CreateShopifyConnectionService";
import ListShopifyConnectionsService from "../services/ShopifyServices/ListShopifyConnectionsService";
import ShowShopifyConnectionService from "../services/ShopifyServices/ShowShopifyConnectionService";
import UpdateShopifyConnectionService from "../services/ShopifyServices/UpdateShopifyConnectionService";
import DeleteShopifyConnectionService from "../services/ShopifyServices/DeleteShopifyConnectionService";

import * as ShopifyAuthService from "../services/ShopifyServices/ShopifyAuthService";
import * as ShopifySyncService from "../services/ShopifyServices/ShopifySyncService";
import * as ShopifyProductService from "../services/ShopifyServices/ShopifyProductService";
import * as ShopifyCartService from "../services/ShopifyServices/ShopifyCartService";
import * as ShopifyCheckoutService from "../services/ShopifyServices/ShopifyCheckoutService";
import * as ShopifyWebhookService from "../services/ShopifyServices/ShopifyWebhookService";

// ==========================================
// CRUD endpoints for Shopify Connections
// ==========================================

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const connections = await ListShopifyConnectionsService({ companyId });
  return res.status(200).json(connections);
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const {
    shopDomain,
    apiKey,
    apiSecret,
    greetingMessage,
    complationMessage,
    outOfHoursMessage,
    ratingMessage,
    transferQueueId,
    timeToTransfer,
    promptId,
    maxUseBotQueues,
    expiresTicket,
    expiresInactiveMessage
  } = req.body;
  const { companyId } = req.user;

  const connection = await CreateShopifyConnectionService({
    shopDomain,
    apiKey,
    apiSecret,
    companyId,
    greetingMessage,
    complationMessage,
    outOfHoursMessage,
    ratingMessage,
    transferQueueId,
    timeToTransfer,
    promptId,
    maxUseBotQueues,
    expiresTicket,
    expiresInactiveMessage
  });

  const io = getIO();
  io.to(`company-${companyId}-mainchannel`).emit(
    `company-${companyId}-shopifyConnection`,
    { action: "update", connection }
  );

  return res.status(200).json(connection);
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { connectionId } = req.params;
  const { companyId } = req.user;

  const connection = await ShowShopifyConnectionService(connectionId, companyId);

  return res.status(200).json(connection);
};

export const update = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { connectionId } = req.params;
  const connectionData = req.body;
  const { companyId } = req.user;

  const connection = await UpdateShopifyConnectionService({
    connectionData,
    connectionId,
    companyId
  });

  const io = getIO();
  io.to(`company-${companyId}-mainchannel`).emit(
    `company-${companyId}-shopifyConnection`,
    { action: "update", connection }
  );

  return res.status(200).json(connection);
};

export const remove = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { connectionId } = req.params;
  const { companyId } = req.user;

  const connection = await ShowShopifyConnectionService(connectionId, companyId);

  // Revoke Shopify access if connected
  if (connection.accessToken) {
    await ShopifyAuthService.revokeAccess(
      connection.shopDomain,
      connection.accessToken
    );
  }

  await DeleteShopifyConnectionService(connectionId);

  const io = getIO();
  io.to(`company-${companyId}-mainchannel`).emit(
    `company-${companyId}-shopifyConnection`,
    { action: "delete", connectionId: +connectionId }
  );

  return res.status(200).json({ message: "Shopify connection deleted." });
};

// ==========================================
// OAuth Flow: Shopify
// ==========================================

export const getOAuthUrl = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { connectionId } = req.params;
  const { companyId } = req.user;

  const connection = await ShowShopifyConnectionService(connectionId, companyId);
  const state = `${connectionId}_${companyId}`;
  const credentials = connection.apiKey && connection.apiSecret
    ? { apiKey: connection.apiKey, apiSecret: connection.apiSecret }
    : undefined;
  const url = ShopifyAuthService.getOAuthUrl(connection.shopDomain, state, credentials);

  return res.status(200).json({ url });
};

export const oauthCallback = async (
  req: Request,
  res: Response
): Promise<Response | void> => {
  const { code, state, shop, hmac } = req.query as Record<string, string>;

  if (!code || !state) {
    return res.status(400).json({ error: "Missing code or state" });
  }

  const [connectionId, companyIdStr] = state.split("_");
  const companyId = parseInt(companyIdStr, 10);

  try {
    // Load connection to get per-connection credentials
    const connection = await ShowShopifyConnectionService(connectionId, companyId);
    const credentials = connection.apiKey && connection.apiSecret
      ? { apiKey: connection.apiKey, apiSecret: connection.apiSecret }
      : undefined;

    // Exchange code for token
    const shopDomain = shop || "";
    const { access_token } = await ShopifyAuthService.exchangeCodeForToken(
      shopDomain,
      code,
      credentials
    );

    // Get shop info
    const shopInfo = await ShopifyAuthService.getShopInfo(
      shopDomain,
      access_token
    );

    // Register webhooks
    await ShopifyAuthService.registerWebhooks(shopDomain, access_token);

    // Update connection
    await UpdateShopifyConnectionService({
      connectionId,
      companyId,
      connectionData: {
        status: "connected",
        accessToken: access_token,
        shopName: shopInfo.name,
        shopEmail: shopInfo.email,
        currency: shopInfo.currency,
        shopDomain
      }
    });

    const io = getIO();
    io.to(`company-${companyId}-mainchannel`).emit(
      `company-${companyId}-shopifyConnection`,
      { action: "update" }
    );

    return res.redirect(
      `${process.env.FRONTEND_URL}/shopify-config?status=success&shop=${encodeURIComponent(shopInfo.name)}`
    );
  } catch (err: any) {
    logger.error(`Shopify OAuth error: ${err.message}`);
    return res.redirect(
      `${process.env.FRONTEND_URL}/shopify-config?error=oauth_failed`
    );
  }
};

// ==========================================
// Webhooks
// ==========================================

export const webhookReceive = async (
  req: Request,
  res: Response
): Promise<Response> => {
  // Always respond 200 quickly
  res.status(200).send("OK");

  try {
    const topic = req.headers["x-shopify-topic"] as string;
    const shopDomain = req.headers["x-shopify-shop-domain"] as string;

    if (topic && shopDomain) {
      await ShopifyWebhookService.processWebhook(topic, shopDomain, req.body);
    }
  } catch (err: any) {
    logger.error(`[Shopify] Webhook error: ${err.message}`);
  }

  return;
};

// ==========================================
// Product Sync
// ==========================================

export const syncProducts = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { connectionId } = req.params;
  const { companyId } = req.user;

  await ShowShopifyConnectionService(connectionId, companyId);

  // Run sync in background
  ShopifySyncService.fullSync(parseInt(connectionId as string, 10))
    .then(count => {
      const io = getIO();
      io.to(`company-${companyId}-mainchannel`).emit(
        `company-${companyId}-shopify-sync`,
        { action: "completed", count }
      );
    })
    .catch(err => {
      logger.error(`[Shopify] Sync error: ${err.message}`);
      const io = getIO();
      io.to(`company-${companyId}-mainchannel`).emit(
        `company-${companyId}-shopify-sync`,
        { action: "error", error: err.message }
      );
    });

  return res.status(200).json({ message: "Sync started" });
};

// ==========================================
// Products
// ==========================================

export const listProducts = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId } = req.user;
  const { search, category, available, page, limit } = req.query;

  const result = await ShopifyProductService.listProducts({
    companyId,
    search: search as string,
    category: category as string,
    available: available === "true",
    page: page ? parseInt(page as string, 10) : 1,
    limit: limit ? parseInt(limit as string, 10) : 20
  });

  return res.status(200).json(result);
};

export const getCategories = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId } = req.user;
  const categories = await ShopifyProductService.getCategories(companyId);
  return res.status(200).json(categories);
};

// ==========================================
// Cart
// ==========================================

export const getCart = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { ticketId } = req.params;
  const { companyId } = req.user;

  const cart = await ShopifyCartService.getCartByTicket(
    parseInt(ticketId, 10),
    companyId
  );

  return res.status(200).json(cart);
};

export const addToCart = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { ticketId, contactId, shopifyConnectionId, variantId, quantity } =
    req.body;
  const { companyId } = req.user;

  const cart = await ShopifyCartService.addItem(
    ticketId,
    contactId,
    companyId,
    shopifyConnectionId,
    variantId,
    quantity || 1
  );

  return res.status(200).json(cart);
};

export const updateCartItem = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { cartId } = req.params;
  const { variantId, quantity } = req.body;
  const { companyId } = req.user;

  const cart = await ShopifyCartService.updateItem(
    parseInt(cartId, 10),
    variantId,
    quantity,
    companyId
  );

  return res.status(200).json(cart);
};

export const removeCartItem = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { cartId } = req.params;
  const { variantId } = req.body;
  const { companyId } = req.user;

  const cart = await ShopifyCartService.removeItem(
    parseInt(cartId, 10),
    variantId,
    companyId
  );

  return res.status(200).json(cart);
};

export const clearCart = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { cartId } = req.params;
  const { companyId } = req.user;

  const cart = await ShopifyCartService.clearCart(
    parseInt(cartId, 10),
    companyId
  );

  return res.status(200).json(cart);
};

// ==========================================
// Checkout
// ==========================================

export const createCheckout = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { cartId } = req.params;
  const { companyId } = req.user;

  const checkoutUrl = await ShopifyCheckoutService.createCheckout(
    parseInt(cartId, 10),
    companyId
  );

  return res.status(200).json({ checkoutUrl });
};

export const createDraftOrder = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { cartId } = req.params;
  const { customerEmail, customerName } = req.body;
  const { companyId } = req.user;

  const result = await ShopifyCheckoutService.createDraftOrder(
    parseInt(cartId, 10),
    companyId,
    customerEmail,
    customerName
  );

  return res.status(200).json(result);
};
