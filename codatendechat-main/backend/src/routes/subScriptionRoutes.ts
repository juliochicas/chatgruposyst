import express from "express";
import isAuth from "../middleware/isAuth";

import * as SubscriptionController from "../controllers/SubscriptionController";

const subscriptionRoutes = express.Router();

// Create a new subscription checkout session
subscriptionRoutes.post(
  "/subscription",
  isAuth,
  SubscriptionController.createSubscription
);

// Open Stripe Customer Portal for billing management
subscriptionRoutes.post(
  "/subscription/portal",
  isAuth,
  SubscriptionController.createPortalSession
);

// Legacy endpoint
subscriptionRoutes.post(
  "/subscription/create/webhook",
  SubscriptionController.createWebhook
);

// Stripe webhook – raw body required for signature verification
subscriptionRoutes.post(
  "/subscription/webhook",
  express.raw({ type: "application/json" }),
  SubscriptionController.webhook
);

export default subscriptionRoutes;
