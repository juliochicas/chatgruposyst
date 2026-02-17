import ShopifyProduct from "../../models/ShopifyProduct";
import ShopifyCart from "../../models/ShopifyCart";
import * as ShopifyCartService from "./ShopifyCartService";
import * as ShopifyCheckoutService from "./ShopifyCheckoutService";
import { logger } from "../../utils/logger";

/**
 * Build the product catalog context for the AI prompt
 */
export const buildCatalogContext = async (
  companyId: number,
  maxProducts: number = 100
): Promise<string> => {
  const products = await ShopifyProduct.findAll({
    where: {
      companyId,
      status: "active"
    },
    attributes: [
      "title",
      "description",
      "priceMin",
      "currency",
      "totalInventory",
      "handle",
      "productType",
      "tags"
    ],
    limit: maxProducts,
    order: [["totalInventory", "DESC"]]
  });

  if (products.length === 0) {
    return "";
  }

  const productList = products
    .map(
      p =>
        `- ${p.title} | $${p.priceMin} ${p.currency} | Stock: ${p.totalInventory} | Tipo: ${p.productType || "N/A"} | Handle: ${p.handle}`
    )
    .join("\n");

  return (
    `\n\n## CATÁLOGO DE PRODUCTOS DISPONIBLES:\n${productList}\n\n` +
    `## INSTRUCCIONES PARA VENTAS:\n` +
    `- Cuando el cliente pregunte por un producto, busca en el catálogo y recomienda opciones.\n` +
    `- Si el cliente quiere comprar, responde con el formato exacto:\n` +
    `  ACCIÓN:AGREGAR_CARRITO|producto={handle}|cantidad={N}\n` +
    `- Si el cliente quiere ver su carrito, responde:\n` +
    `  ACCIÓN:VER_CARRITO\n` +
    `- Si el cliente quiere pagar, responde:\n` +
    `  ACCIÓN:GENERAR_CHECKOUT\n` +
    `- Si no encuentras el producto, sugiérele productos similares del catálogo.\n` +
    `- Siempre confirma la selección antes de agregar al carrito.\n`
  );
};

/**
 * Process AI response text to detect and execute Shopify actions
 */
export const processAIResponse = async (
  responseText: string,
  ticketId: number,
  contactId: number,
  companyId: number,
  shopifyConnectionId: number
): Promise<string> => {
  const actionMatch = responseText.match(/ACCIÓN:(\w+)\|?(.*)/);

  if (!actionMatch) {
    return responseText; // No action, return as-is
  }

  const [fullMatch, action, params] = actionMatch;
  const cleanResponse = responseText.replace(/ACCIÓN:.+/, "").trim();

  try {
    switch (action) {
      case "AGREGAR_CARRITO": {
        const handle = params.match(/producto=(\S+)/)?.[1];
        const qty = parseInt(params.match(/cantidad=(\d+)/)?.[1] || "1", 10);

        if (!handle) {
          return `${cleanResponse}\n\nNo se especificó el producto.`;
        }

        const product = await ShopifyProduct.findOne({
          where: { handle, companyId, status: "active" }
        });

        if (!product) {
          return `${cleanResponse}\n\nNo encontré ese producto. ¿Podrías ser más específico?`;
        }

        const variants = product.variants as any[];
        if (variants.length === 0) {
          return `${cleanResponse}\n\nEste producto no tiene variantes disponibles.`;
        }

        const variantId = variants[0].variantId;
        const cart = await ShopifyCartService.addItem(
          ticketId,
          contactId,
          companyId,
          shopifyConnectionId,
          variantId,
          qty
        );

        const cartMessage = ShopifyCartService.formatCartMessage(cart);
        return `${cleanResponse}\n\n🛒 Se agregó ${qty}x ${product.title} al carrito.\n\n${cartMessage}`;
      }

      case "VER_CARRITO": {
        const cart = await ShopifyCartService.getCartByTicket(
          ticketId,
          companyId
        );

        if (!cart || (cart.items as any[]).length === 0) {
          return `${cleanResponse}\n\nEl carrito está vacío.`;
        }

        const cartMessage = ShopifyCartService.formatCartMessage(cart);
        return `${cleanResponse}\n\n${cartMessage}`;
      }

      case "GENERAR_CHECKOUT": {
        const cart = await ShopifyCartService.getCartByTicket(
          ticketId,
          companyId
        );

        if (!cart || (cart.items as any[]).length === 0) {
          return `${cleanResponse}\n\nEl carrito está vacío. Agrega productos antes de generar el checkout.`;
        }

        const checkoutUrl = await ShopifyCheckoutService.createCheckout(
          cart.id,
          companyId
        );

        return (
          `${cleanResponse}\n\n` +
          `💳 *Link de Pago*\n` +
          `─────────────\n` +
          `${ShopifyCartService.formatCartMessage(cart)}\n\n` +
          `👉 Pagar aquí: ${checkoutUrl}\n\n` +
          `Este link es válido por 24 horas.`
        );
      }

      default:
        return cleanResponse;
    }
  } catch (err: any) {
    logger.error(`[Shopify] AI action error: ${err.message}`);
    return `${cleanResponse}\n\nHubo un error procesando la acción. Intenta nuevamente.`;
  }
};
