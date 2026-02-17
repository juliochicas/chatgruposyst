import ShopifyConnection from "../../models/ShopifyConnection";
import ShopifyCart from "../../models/ShopifyCart";
import * as ShopifySyncService from "./ShopifySyncService";
import { logger } from "../../utils/logger";
import { getIO } from "../../libs/socket";

/**
 * Process incoming Shopify webhook events
 */
export const processWebhook = async (
  topic: string,
  shopDomain: string,
  body: any
): Promise<void> => {
  const connection = await ShopifyConnection.findOne({
    where: { shopDomain }
  });

  if (!connection) {
    logger.warn(`[Shopify] Webhook received for unknown shop: ${shopDomain}`);
    return;
  }

  logger.info(`[Shopify] Processing webhook: ${topic} for ${shopDomain}`);

  switch (topic) {
    case "products/create":
    case "products/update":
      await handleProductUpdate(connection, body);
      break;

    case "products/delete":
      await handleProductDelete(connection, body);
      break;

    case "inventory_levels/update":
      await handleInventoryUpdate(connection, body);
      break;

    case "orders/create":
      await handleOrderCreate(connection, body);
      break;

    case "orders/fulfilled":
      await handleOrderFulfilled(connection, body);
      break;

    default:
      logger.info(`[Shopify] Unhandled webhook topic: ${topic}`);
  }
};

async function handleProductUpdate(
  connection: ShopifyConnection,
  productData: any
): Promise<void> {
  try {
    await ShopifySyncService.upsertProduct(connection, productData);

    const io = getIO();
    io.to(`company-${connection.companyId}-mainchannel`).emit(
      `company-${connection.companyId}-shopify-product`,
      { action: "update", productId: productData.id }
    );

    logger.info(`[Shopify] Product updated: ${productData.title}`);
  } catch (err: any) {
    logger.error(`[Shopify] Product update error: ${err.message}`);
  }
}

async function handleProductDelete(
  connection: ShopifyConnection,
  body: any
): Promise<void> {
  try {
    await ShopifySyncService.deleteProduct(String(body.id), connection.id);

    const io = getIO();
    io.to(`company-${connection.companyId}-mainchannel`).emit(
      `company-${connection.companyId}-shopify-product`,
      { action: "delete", productId: body.id }
    );

    logger.info(`[Shopify] Product deleted: ${body.id}`);
  } catch (err: any) {
    logger.error(`[Shopify] Product delete error: ${err.message}`);
  }
}

async function handleInventoryUpdate(
  connection: ShopifyConnection,
  body: any
): Promise<void> {
  try {
    // Inventory level updates contain inventory_item_id and available quantity
    logger.info(
      `[Shopify] Inventory updated for item ${body.inventory_item_id}: ${body.available}`
    );
  } catch (err: any) {
    logger.error(`[Shopify] Inventory update error: ${err.message}`);
  }
}

async function handleOrderCreate(
  connection: ShopifyConnection,
  orderData: any
): Promise<void> {
  try {
    // Check if this order matches any active cart
    const orderNumber = orderData.order_number
      ? `#${orderData.order_number}`
      : String(orderData.id);

    // Try to match by line items' variant IDs
    const activeCarts = await ShopifyCart.findAll({
      where: {
        shopifyConnectionId: connection.id,
        status: "checkout"
      }
    });

    for (const cart of activeCarts) {
      if (cart.checkoutUrl || cart.shopifyOrderId) {
        await cart.update({
          status: "completed",
          shopifyOrderId: String(orderData.id),
          shopifyOrderNumber: orderNumber
        });
        break;
      }
    }

    const io = getIO();
    io.to(`company-${connection.companyId}-mainchannel`).emit(
      `company-${connection.companyId}-shopify-order`,
      {
        action: "create",
        order: {
          id: orderData.id,
          orderNumber,
          totalPrice: orderData.total_price,
          currency: orderData.currency,
          customerEmail: orderData.email
        }
      }
    );

    logger.info(`[Shopify] Order created: ${orderNumber}`);
  } catch (err: any) {
    logger.error(`[Shopify] Order create error: ${err.message}`);
  }
}

async function handleOrderFulfilled(
  connection: ShopifyConnection,
  orderData: any
): Promise<void> {
  try {
    const orderNumber = orderData.order_number
      ? `#${orderData.order_number}`
      : String(orderData.id);

    const io = getIO();
    io.to(`company-${connection.companyId}-mainchannel`).emit(
      `company-${connection.companyId}-shopify-order`,
      {
        action: "fulfilled",
        order: {
          id: orderData.id,
          orderNumber,
          fulfillmentStatus: "fulfilled"
        }
      }
    );

    logger.info(`[Shopify] Order fulfilled: ${orderNumber}`);
  } catch (err: any) {
    logger.error(`[Shopify] Order fulfilled error: ${err.message}`);
  }
}
