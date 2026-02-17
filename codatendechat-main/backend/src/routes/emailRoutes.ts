import express from "express";
import isAuth from "../middleware/isAuth";
import * as EmailConfigController from "../controllers/EmailConfigController";
import * as EmailCampaignController from "../controllers/EmailCampaignController";

const routes = express.Router();

// Email Config (Resend)
routes.get("/email-config", isAuth, EmailConfigController.index);
routes.get("/email-config/status", isAuth, EmailConfigController.getStatus);
routes.post("/email-config", isAuth, EmailConfigController.store);
routes.post("/email-config/test", isAuth, EmailConfigController.testConnection);
routes.post("/email-config/send-test", isAuth, EmailConfigController.sendTestEmail);
routes.put("/email-config/:id", isAuth, EmailConfigController.update);
routes.delete("/email-config/:id", isAuth, EmailConfigController.remove);

// Email Campaigns
routes.get("/email-campaigns", isAuth, EmailCampaignController.index);
routes.get("/email-campaigns/:id", isAuth, EmailCampaignController.show);
routes.get("/email-campaigns/:id/report", isAuth, EmailCampaignController.getReport);
routes.post("/email-campaigns", isAuth, EmailCampaignController.store);
routes.put("/email-campaigns/:id", isAuth, EmailCampaignController.update);
routes.delete("/email-campaigns/:id", isAuth, EmailCampaignController.remove);
routes.post("/email-campaigns/:id/start", isAuth, EmailCampaignController.startCampaign);
routes.post("/email-campaigns/:id/cancel", isAuth, EmailCampaignController.cancelCampaign);

export default routes;
