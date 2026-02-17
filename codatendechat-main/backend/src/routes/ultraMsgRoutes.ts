import express from "express";
import isAuth from "../middleware/isAuth";
import * as UltraMsgConfigController from "../controllers/UltraMsgConfigController";

const routes = express.Router();

routes.get("/ultramsg-config", isAuth, UltraMsgConfigController.index);

routes.get("/ultramsg-config/status", isAuth, UltraMsgConfigController.getStatus);

routes.get("/ultramsg-config/stats", isAuth, UltraMsgConfigController.getStats);

routes.get("/ultramsg-config/:id", isAuth, UltraMsgConfigController.show);

routes.post("/ultramsg-config", isAuth, UltraMsgConfigController.store);

routes.post("/ultramsg-config/test", isAuth, UltraMsgConfigController.testConnection);

routes.put("/ultramsg-config/:id", isAuth, UltraMsgConfigController.update);

routes.delete("/ultramsg-config/:id", isAuth, UltraMsgConfigController.remove);

export default routes;
