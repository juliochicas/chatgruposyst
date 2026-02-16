import express from "express";
import isAuth from "../middleware/isAuth";
import * as MetaConnectionController from "../controllers/MetaConnectionController";

const metaRoutes = express.Router();

// CRUD routes (authenticated)
metaRoutes.get("/meta-connections/", isAuth, MetaConnectionController.index);
metaRoutes.post("/meta-connections/", isAuth, MetaConnectionController.store);
metaRoutes.get(
  "/meta-connections/:metaConnectionId",
  isAuth,
  MetaConnectionController.show
);
metaRoutes.put(
  "/meta-connections/:metaConnectionId",
  isAuth,
  MetaConnectionController.update
);
metaRoutes.delete(
  "/meta-connections/:metaConnectionId",
  isAuth,
  MetaConnectionController.remove
);

// OAuth flow (authenticated)
metaRoutes.get(
  "/meta-connections/:metaConnectionId/oauth-url",
  isAuth,
  MetaConnectionController.getOAuthUrl
);
metaRoutes.get(
  "/meta-connections/:metaConnectionId/pages",
  isAuth,
  MetaConnectionController.getPages
);

// OAuth callbacks (no auth - Meta/Threads redirect here)
metaRoutes.get("/meta/callback", MetaConnectionController.oauthCallback);
metaRoutes.get("/meta/threads-callback", MetaConnectionController.threadsOAuthCallback);

// Webhook endpoints (no auth - Meta calls these)
// Same endpoint handles FB, IG, and Threads webhooks
metaRoutes.get("/meta/webhook", MetaConnectionController.webhookVerify);
metaRoutes.post("/meta/webhook", MetaConnectionController.webhookReceive);

// Send message (authenticated)
metaRoutes.post(
  "/meta-messages/:ticketId",
  isAuth,
  MetaConnectionController.sendMessage
);

export default metaRoutes;
