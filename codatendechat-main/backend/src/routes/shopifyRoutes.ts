import express from "express";
import isAuth from "../middleware/isAuth";
import * as ShopifyController from "../controllers/ShopifyController";

const shopifyRoutes = express.Router();

// CRUD routes (authenticated)
shopifyRoutes.get(
  "/shopify-connections/",
  isAuth,
  ShopifyController.index
);
shopifyRoutes.post(
  "/shopify-connections/",
  isAuth,
  ShopifyController.store
);
shopifyRoutes.get(
  "/shopify-connections/:connectionId",
  isAuth,
  ShopifyController.show
);
shopifyRoutes.put(
  "/shopify-connections/:connectionId",
  isAuth,
  ShopifyController.update
);
shopifyRoutes.delete(
  "/shopify-connections/:connectionId",
  isAuth,
  ShopifyController.remove
);

// OAuth flow (authenticated)
shopifyRoutes.get(
  "/shopify-connections/:connectionId/oauth-url",
  isAuth,
  ShopifyController.getOAuthUrl
);

// OAuth callback (no auth - Shopify redirects here)
shopifyRoutes.get("/shopify/callback", ShopifyController.oauthCallback);

// Webhook endpoint (no auth - Shopify calls this)
shopifyRoutes.post("/shopify/webhook", ShopifyController.webhookReceive);

// Product sync (authenticated)
shopifyRoutes.post(
  "/shopify-connections/:connectionId/sync",
  isAuth,
  ShopifyController.syncProducts
);

// Products (authenticated)
shopifyRoutes.get(
  "/shopify/products",
  isAuth,
  ShopifyController.listProducts
);
shopifyRoutes.get(
  "/shopify/categories",
  isAuth,
  ShopifyController.getCategories
);

// Cart (authenticated)
shopifyRoutes.get(
  "/shopify/cart/:ticketId",
  isAuth,
  ShopifyController.getCart
);
shopifyRoutes.post("/shopify/cart/add", isAuth, ShopifyController.addToCart);
shopifyRoutes.put(
  "/shopify/cart/:cartId/update",
  isAuth,
  ShopifyController.updateCartItem
);
shopifyRoutes.delete(
  "/shopify/cart/:cartId/remove",
  isAuth,
  ShopifyController.removeCartItem
);
shopifyRoutes.post(
  "/shopify/cart/:cartId/clear",
  isAuth,
  ShopifyController.clearCart
);

// Checkout (authenticated)
shopifyRoutes.post(
  "/shopify/cart/:cartId/checkout",
  isAuth,
  ShopifyController.createCheckout
);
shopifyRoutes.post(
  "/shopify/cart/:cartId/draft-order",
  isAuth,
  ShopifyController.createDraftOrder
);

export default shopifyRoutes;
