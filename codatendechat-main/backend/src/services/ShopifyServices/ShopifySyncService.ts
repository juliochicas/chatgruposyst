import axios from "axios";
import ShopifyConnection from "../../models/ShopifyConnection";
import ShopifyProduct from "../../models/ShopifyProduct";
import { logger } from "../../utils/logger";

interface ShopifyApiProduct {
  id: number;
  title: string;
  body_html: string;
  handle: string;
  vendor: string;
  product_type: string;
  tags: string;
  images: Array<{ src: string; id: number }>;
  variants: Array<{
    id: number;
    title: string;
    price: string;
    sku: string;
    inventory_quantity: number;
    available: boolean;
  }>;
  status: string;
}

/**
 * Full sync of all products from a Shopify store
 */
export const fullSync = async (
  shopifyConnectionId: number
): Promise<number> => {
  const connection = await ShopifyConnection.findByPk(shopifyConnectionId);
  if (!connection || !connection.accessToken) {
    throw new Error("ShopifyConnection not found or not authenticated");
  }

  await connection.update({ status: "syncing" });

  let totalSynced = 0;
  let nextPageUrl: string | null =
    `https://${connection.shopDomain}/admin/api/2024-01/products.json?limit=250`;

  try {
    while (nextPageUrl) {
      const response = await axios.get(nextPageUrl, {
        headers: { "X-Shopify-Access-Token": connection.accessToken }
      });

      const products: ShopifyApiProduct[] = response.data.products;

      for (const product of products) {
        await upsertProduct(connection, product);
        totalSynced++;
      }

      // Handle Shopify's cursor-based pagination
      const linkHeader = response.headers.link || "";
      const nextMatch = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
      nextPageUrl = nextMatch ? nextMatch[1] : null;

      // Respect Shopify rate limits (2 req/s)
      await new Promise(resolve => setTimeout(resolve, 600));
    }

    await connection.update({
      status: "connected",
      lastSyncAt: new Date()
    });

    logger.info(
      `[Shopify] Full sync completed for ${connection.shopDomain}: ${totalSynced} products`
    );

    return totalSynced;
  } catch (err: any) {
    await connection.update({ status: "connected" });
    logger.error(`[Shopify] Full sync error: ${err.message}`);
    throw err;
  }
};

/**
 * Upsert a single product from Shopify API data
 */
export const upsertProduct = async (
  connection: ShopifyConnection,
  productData: ShopifyApiProduct
): Promise<ShopifyProduct> => {
  const prices = productData.variants.map(v => parseFloat(v.price));
  const totalInventory = productData.variants.reduce(
    (sum, v) => sum + (v.inventory_quantity || 0),
    0
  );

  const productFields = {
    shopifyProductId: String(productData.id),
    title: productData.title,
    description: productData.body_html || "",
    handle: productData.handle,
    vendor: productData.vendor,
    productType: productData.product_type,
    tags: productData.tags ? productData.tags.split(", ") : [],
    imageUrl: productData.images?.[0]?.src || null,
    images: productData.images || [],
    priceMin: prices.length > 0 ? Math.min(...prices) : 0,
    priceMax: prices.length > 0 ? Math.max(...prices) : 0,
    currency: connection.currency,
    variants: productData.variants.map(v => ({
      variantId: String(v.id),
      title: v.title,
      price: v.price,
      sku: v.sku,
      inventoryQuantity: v.inventory_quantity,
      available: v.inventory_quantity > 0
    })),
    status: productData.status,
    totalInventory,
    productUrl: `https://${connection.shopDomain}/products/${productData.handle}`,
    shopifyConnectionId: connection.id,
    companyId: connection.companyId
  };

  const [product] = await ShopifyProduct.findOrCreate({
    where: {
      shopifyProductId: String(productData.id),
      shopifyConnectionId: connection.id
    },
    defaults: productFields
  });

  // Always update with latest data
  await product.update(productFields);

  return product;
};

/**
 * Handle product deletion from webhook
 */
export const deleteProduct = async (
  shopifyProductId: string,
  shopifyConnectionId: number
): Promise<void> => {
  await ShopifyProduct.update(
    { status: "archived" },
    {
      where: {
        shopifyProductId,
        shopifyConnectionId
      }
    }
  );
};

/**
 * Handle inventory level update from webhook
 */
export const updateInventory = async (
  shopifyProductId: string,
  shopifyConnectionId: number,
  variantId: string,
  newQuantity: number
): Promise<void> => {
  const product = await ShopifyProduct.findOne({
    where: {
      shopifyProductId,
      shopifyConnectionId
    }
  });

  if (!product) return;

  const variants = (product.variants as any[]).map(v => {
    if (v.variantId === variantId) {
      return { ...v, inventoryQuantity: newQuantity, available: newQuantity > 0 };
    }
    return v;
  });

  const totalInventory = variants.reduce(
    (sum, v) => sum + (v.inventoryQuantity || 0),
    0
  );

  await product.update({ variants, totalInventory });
};
