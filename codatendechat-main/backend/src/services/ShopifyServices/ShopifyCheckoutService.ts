import axios from "axios";
import ShopifyCart from "../../models/ShopifyCart";
import ShopifyConnection from "../../models/ShopifyConnection";
import AppError from "../../errors/AppError";
import { logger } from "../../utils/logger";

interface CartItem {
  shopifyProductId: string;
  variantId: string;
  title: string;
  quantity: number;
  price: string;
  imageUrl: string;
}

/**
 * Create a Shopify checkout from a cart using the Storefront API
 */
export const createCheckout = async (
  cartId: number,
  companyId: number
): Promise<string> => {
  const cart = await ShopifyCart.findOne({
    where: { id: cartId, companyId, status: "active" }
  });

  if (!cart) {
    throw new AppError("ERR_SHOPIFY_CART_NOT_FOUND");
  }

  const items = cart.items as CartItem[];
  if (items.length === 0) {
    throw new AppError("ERR_SHOPIFY_CART_EMPTY");
  }

  const connection = await ShopifyConnection.findByPk(
    cart.shopifyConnectionId
  );

  if (!connection || !connection.storefrontAccessToken) {
    // Fallback: create a direct cart URL
    return createDirectCartUrl(connection, items);
  }

  try {
    // Use Shopify Storefront API to create a checkout
    const lineItems = items
      .map(
        item =>
          `{ variantId: "gid://shopify/ProductVariant/${item.variantId}", quantity: ${item.quantity} }`
      )
      .join(", ");

    const mutation = `
      mutation {
        checkoutCreate(input: {
          lineItems: [${lineItems}]
        }) {
          checkout {
            webUrl
            id
            totalPriceV2 { amount currencyCode }
          }
          checkoutUserErrors {
            message
            field
          }
        }
      }
    `;

    const response = await axios.post(
      `https://${connection.shopDomain}/api/2024-01/graphql.json`,
      { query: mutation },
      {
        headers: {
          "X-Shopify-Storefront-Access-Token":
            connection.storefrontAccessToken,
          "Content-Type": "application/json"
        }
      }
    );

    const checkoutData = response.data?.data?.checkoutCreate;

    if (checkoutData?.checkoutUserErrors?.length > 0) {
      logger.error(
        `[Shopify] Checkout errors: ${JSON.stringify(checkoutData.checkoutUserErrors)}`
      );
      // Fallback to direct cart URL
      return createDirectCartUrl(connection, items);
    }

    const checkoutUrl = checkoutData?.checkout?.webUrl;

    if (checkoutUrl) {
      await cart.update({
        checkoutUrl,
        status: "checkout"
      });
      return checkoutUrl;
    }

    // Fallback
    return createDirectCartUrl(connection, items);
  } catch (err: any) {
    logger.error(`[Shopify] Checkout creation error: ${err.message}`);
    // Fallback to direct cart URL
    return createDirectCartUrl(connection, items);
  }
};

/**
 * Create a direct cart URL (fallback when Storefront API is not available)
 * Format: https://store.myshopify.com/cart/VARIANT_ID:QTY,VARIANT_ID:QTY
 */
const createDirectCartUrl = (
  connection: ShopifyConnection | null,
  items: CartItem[]
): string => {
  if (!connection) {
    throw new AppError("ERR_SHOPIFY_CONNECTION_NOT_FOUND");
  }

  const cartItems = items
    .map(item => `${item.variantId}:${item.quantity}`)
    .join(",");

  return `https://${connection.shopDomain}/cart/${cartItems}`;
};

/**
 * Create a Shopify Draft Order via Admin API
 */
export const createDraftOrder = async (
  cartId: number,
  companyId: number,
  customerEmail?: string,
  customerName?: string
): Promise<{ draftOrderId: string; invoiceUrl: string }> => {
  const cart = await ShopifyCart.findOne({
    where: { id: cartId, companyId, status: "active" }
  });

  if (!cart) {
    throw new AppError("ERR_SHOPIFY_CART_NOT_FOUND");
  }

  const items = cart.items as CartItem[];
  if (items.length === 0) {
    throw new AppError("ERR_SHOPIFY_CART_EMPTY");
  }

  const connection = await ShopifyConnection.findByPk(
    cart.shopifyConnectionId
  );

  if (!connection || !connection.accessToken) {
    throw new AppError("ERR_SHOPIFY_NOT_CONNECTED");
  }

  const lineItems = items.map(item => ({
    variant_id: parseInt(item.variantId, 10),
    quantity: item.quantity
  }));

  const draftOrderData: any = {
    draft_order: {
      line_items: lineItems
    }
  };

  if (customerEmail) {
    draftOrderData.draft_order.customer = {
      email: customerEmail,
      first_name: customerName || ""
    };
  }

  const response = await axios.post(
    `https://${connection.shopDomain}/admin/api/2024-01/draft_orders.json`,
    draftOrderData,
    {
      headers: { "X-Shopify-Access-Token": connection.accessToken }
    }
  );

  const draftOrder = response.data.draft_order;

  await cart.update({
    shopifyOrderId: String(draftOrder.id),
    status: "checkout"
  });

  return {
    draftOrderId: String(draftOrder.id),
    invoiceUrl: draftOrder.invoice_url
  };
};
