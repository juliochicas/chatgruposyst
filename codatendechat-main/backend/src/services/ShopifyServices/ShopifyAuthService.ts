import axios from "axios";
import crypto from "crypto";
import { logger } from "../../utils/logger";

interface ShopifyTokenResponse {
  access_token: string;
  scope: string;
}

interface ShopifyShopInfo {
  shop: {
    name: string;
    email: string;
    currency: string;
    domain: string;
    myshopify_domain: string;
  };
}

interface ShopifyCredentials {
  apiKey: string;
  apiSecret: string;
}

/**
 * Resolve credentials: use provided values, fall back to env vars
 */
const resolveCredentials = (credentials?: ShopifyCredentials): ShopifyCredentials => {
  return {
    apiKey: credentials?.apiKey || process.env.SHOPIFY_API_KEY || "",
    apiSecret: credentials?.apiSecret || process.env.SHOPIFY_API_SECRET || ""
  };
};

/**
 * Generate the Shopify OAuth authorization URL
 */
export const getOAuthUrl = (
  shopDomain: string,
  state: string,
  credentials?: ShopifyCredentials
): string => {
  const { apiKey } = resolveCredentials(credentials);
  const scopes = process.env.SHOPIFY_SCOPES ||
    "read_products,write_draft_orders,write_orders,read_orders,read_inventory";
  const redirectUri = `${process.env.BACKEND_URL}/shopify/callback`;

  return (
    `https://${shopDomain}/admin/oauth/authorize?` +
    `client_id=${apiKey}` +
    `&scope=${scopes}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&state=${state}`
  );
};

/**
 * Exchange authorization code for a permanent access token
 */
export const exchangeCodeForToken = async (
  shopDomain: string,
  code: string,
  credentials?: ShopifyCredentials
): Promise<ShopifyTokenResponse> => {
  const { apiKey, apiSecret } = resolveCredentials(credentials);

  const response = await axios.post(
    `https://${shopDomain}/admin/oauth/access_token`,
    {
      client_id: apiKey,
      client_secret: apiSecret,
      code
    }
  );

  return response.data;
};

/**
 * Get shop information using the access token
 */
export const getShopInfo = async (
  shopDomain: string,
  accessToken: string
): Promise<ShopifyShopInfo["shop"]> => {
  const response = await axios.get<ShopifyShopInfo>(
    `https://${shopDomain}/admin/api/2024-01/shop.json`,
    {
      headers: { "X-Shopify-Access-Token": accessToken }
    }
  );

  return response.data.shop;
};

/**
 * Verify Shopify webhook HMAC signature
 */
export const verifyWebhookHmac = (
  body: string,
  hmacHeader: string,
  secret?: string
): boolean => {
  const resolvedSecret = secret || process.env.SHOPIFY_API_SECRET;
  if (!resolvedSecret) return false;

  const hash = crypto
    .createHmac("sha256", resolvedSecret)
    .update(body, "utf8")
    .digest("base64");

  return crypto.timingSafeEqual(
    Buffer.from(hash),
    Buffer.from(hmacHeader)
  );
};

/**
 * Register webhooks with Shopify store
 */
export const registerWebhooks = async (
  shopDomain: string,
  accessToken: string
): Promise<void> => {
  const webhookTopics = [
    "products/create",
    "products/update",
    "products/delete",
    "inventory_levels/update",
    "orders/create",
    "orders/fulfilled"
  ];

  const callbackUrl = `${process.env.BACKEND_URL}/shopify/webhook`;

  for (const topic of webhookTopics) {
    try {
      await axios.post(
        `https://${shopDomain}/admin/api/2024-01/webhooks.json`,
        {
          webhook: {
            topic,
            address: callbackUrl,
            format: "json"
          }
        },
        {
          headers: { "X-Shopify-Access-Token": accessToken }
        }
      );
      logger.info(`[Shopify] Webhook registered: ${topic} for ${shopDomain}`);
    } catch (err: any) {
      // 422 means webhook already exists, that's fine
      if (err.response?.status !== 422) {
        logger.error(
          `[Shopify] Failed to register webhook ${topic}: ${err.message}`
        );
      }
    }
  }
};

/**
 * Revoke access token (uninstall)
 */
export const revokeAccess = async (
  shopDomain: string,
  accessToken: string
): Promise<void> => {
  try {
    await axios.delete(
      `https://${shopDomain}/admin/api/2024-01/api_permissions/current.json`,
      {
        headers: { "X-Shopify-Access-Token": accessToken }
      }
    );
    logger.info(`[Shopify] Access revoked for ${shopDomain}`);
  } catch (err: any) {
    logger.error(`[Shopify] Failed to revoke access: ${err.message}`);
  }
};
