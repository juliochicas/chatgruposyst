import ShopifyCart from "../../models/ShopifyCart";
import ShopifyProduct from "../../models/ShopifyProduct";
import ShopifyConnection from "../../models/ShopifyConnection";
import AppError from "../../errors/AppError";

interface CartItem {
  shopifyProductId: string;
  variantId: string;
  title: string;
  quantity: number;
  price: string;
  imageUrl: string;
}

/**
 * Get or create an active cart for a ticket
 */
export const getOrCreateCart = async (
  ticketId: number,
  contactId: number,
  companyId: number,
  shopifyConnectionId: number
): Promise<ShopifyCart> => {
  let cart = await ShopifyCart.findOne({
    where: {
      ticketId,
      status: "active",
      companyId
    }
  });

  if (!cart) {
    const connection = await ShopifyConnection.findByPk(shopifyConnectionId);
    cart = await ShopifyCart.create({
      ticketId,
      contactId,
      companyId,
      shopifyConnectionId,
      currency: connection?.currency || "USD",
      items: [],
      subtotal: 0,
      status: "active"
    });
  }

  return cart;
};

/**
 * Add an item to the cart
 */
export const addItem = async (
  ticketId: number,
  contactId: number,
  companyId: number,
  shopifyConnectionId: number,
  variantId: string,
  quantity: number = 1
): Promise<ShopifyCart> => {
  const cart = await getOrCreateCart(
    ticketId,
    contactId,
    companyId,
    shopifyConnectionId
  );

  // Find the product containing this variant
  const product = await ShopifyProduct.findOne({
    where: { companyId, status: "active" }
  });

  // Search across all products for the variant
  const allProducts = await ShopifyProduct.findAll({
    where: { companyId, status: "active" }
  });

  let foundProduct: ShopifyProduct | null = null;
  let foundVariant: any = null;

  for (const p of allProducts) {
    const variant = (p.variants as any[]).find(
      v => v.variantId === variantId
    );
    if (variant) {
      foundProduct = p;
      foundVariant = variant;
      break;
    }
  }

  if (!foundProduct || !foundVariant) {
    throw new AppError("ERR_SHOPIFY_VARIANT_NOT_FOUND");
  }

  const items = cart.items as CartItem[];
  const existingIndex = items.findIndex(i => i.variantId === variantId);

  if (existingIndex >= 0) {
    items[existingIndex].quantity += quantity;
  } else {
    items.push({
      shopifyProductId: foundProduct.shopifyProductId,
      variantId,
      title: `${foundProduct.title} - ${foundVariant.title}`,
      quantity,
      price: foundVariant.price,
      imageUrl: foundProduct.imageUrl || ""
    });
  }

  const subtotal = items.reduce(
    (sum, item) => sum + parseFloat(item.price) * item.quantity,
    0
  );

  await cart.update({ items, subtotal });

  return cart;
};

/**
 * Update item quantity in the cart
 */
export const updateItem = async (
  cartId: number,
  variantId: string,
  quantity: number,
  companyId: number
): Promise<ShopifyCart> => {
  const cart = await ShopifyCart.findOne({
    where: { id: cartId, companyId }
  });

  if (!cart) {
    throw new AppError("ERR_SHOPIFY_CART_NOT_FOUND");
  }

  const items = (cart.items as CartItem[]).map(item => {
    if (item.variantId === variantId) {
      return { ...item, quantity };
    }
    return item;
  }).filter(item => item.quantity > 0);

  const subtotal = items.reduce(
    (sum, item) => sum + parseFloat(item.price) * item.quantity,
    0
  );

  await cart.update({ items, subtotal });

  return cart;
};

/**
 * Remove an item from the cart
 */
export const removeItem = async (
  cartId: number,
  variantId: string,
  companyId: number
): Promise<ShopifyCart> => {
  const cart = await ShopifyCart.findOne({
    where: { id: cartId, companyId }
  });

  if (!cart) {
    throw new AppError("ERR_SHOPIFY_CART_NOT_FOUND");
  }

  const items = (cart.items as CartItem[]).filter(
    item => item.variantId !== variantId
  );

  const subtotal = items.reduce(
    (sum, item) => sum + parseFloat(item.price) * item.quantity,
    0
  );

  await cart.update({ items, subtotal });

  return cart;
};

/**
 * Clear the cart
 */
export const clearCart = async (
  cartId: number,
  companyId: number
): Promise<ShopifyCart> => {
  const cart = await ShopifyCart.findOne({
    where: { id: cartId, companyId }
  });

  if (!cart) {
    throw new AppError("ERR_SHOPIFY_CART_NOT_FOUND");
  }

  await cart.update({ items: [], subtotal: 0 });

  return cart;
};

/**
 * Get cart by ticket ID
 */
export const getCartByTicket = async (
  ticketId: number,
  companyId: number
): Promise<ShopifyCart | null> => {
  return ShopifyCart.findOne({
    where: {
      ticketId,
      status: "active",
      companyId
    }
  });
};

/**
 * Format cart as text for WhatsApp/chat message
 */
export const formatCartMessage = (cart: ShopifyCart): string => {
  const items = cart.items as CartItem[];
  if (items.length === 0) {
    return "El carrito está vacío.";
  }

  const itemLines = items
    .map(i => `${i.quantity}x ${i.title} — $${i.price}`)
    .join("\n");

  return (
    `🛒 *Tu Carrito*\n` +
    `─────────────\n` +
    `${itemLines}\n` +
    `─────────────\n` +
    `Subtotal: $${Number(cart.subtotal).toFixed(2)} ${cart.currency}`
  );
};
