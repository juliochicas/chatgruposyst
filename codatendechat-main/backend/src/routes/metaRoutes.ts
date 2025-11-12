import { Router } from "express";

import { receive, verify } from "../controllers/MetaWebhookController";
import isAuth from "../middleware/isAuth";
import {
  getAuthUrl,
  oauthCallback
} from "../controllers/MetaAuthController";

const metaRoutes = Router();

metaRoutes.get("/webhooks/meta", verify);
metaRoutes.post("/webhooks/meta", receive);

metaRoutes.get("/channels/meta/oauth-url", isAuth, getAuthUrl);
metaRoutes.get("/channels/meta/oauth/callback", oauthCallback);

export default metaRoutes;

