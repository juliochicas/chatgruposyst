import express from "express";
import isAuth from "../middleware/isAuth";
import isSuper from "../middleware/isSuper";
import * as AddonController from "../controllers/AddonController";

const addonRoutes = express.Router();

// Public: list active addons
addonRoutes.get("/addons", isAuth, AddonController.index);

// Super admin: full CRUD
addonRoutes.get("/addons/all", isAuth, isSuper, AddonController.indexAll);
addonRoutes.post("/addons", isAuth, isSuper, AddonController.store);
addonRoutes.put("/addons/:id", isAuth, isSuper, AddonController.update);
addonRoutes.delete("/addons/:id", isAuth, isSuper, AddonController.remove);

// Super admin: manage company addons
addonRoutes.get("/addons/company/:companyId", isAuth, isSuper, AddonController.listCompanyAddonsAdmin);
addonRoutes.post("/addons/company/:companyId/grant", isAuth, isSuper, AddonController.grantAddon);

// Company: manage own addons
addonRoutes.get("/company-addons", isAuth, AddonController.listCompanyAddons);
addonRoutes.post("/company-addons/subscribe", isAuth, AddonController.subscribeAddon);
addonRoutes.post("/company-addons/activate", isAuth, AddonController.activateAddon);
addonRoutes.post("/company-addons/:id/cancel", isAuth, AddonController.cancelAddon);
addonRoutes.get("/company-addons/check/:featureKey", isAuth, AddonController.checkAddon);

export default addonRoutes;
