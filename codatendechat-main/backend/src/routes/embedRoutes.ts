import express from "express";
import isAuth from "../middleware/isAuth";
import isEmbedAuth from "../middleware/isEmbedAuth";
import * as EmbedController from "../controllers/EmbedController";

const embedRoutes = express.Router();

// ----- Admin routes (require user authentication) -----
embedRoutes.get("/embed-config", isAuth, EmbedController.show);
embedRoutes.post("/embed-config", isAuth, EmbedController.store);
embedRoutes.put("/embed-config", isAuth, EmbedController.update);

// ----- Public embed routes (require embed token) -----
embedRoutes.get("/embed/config", isEmbedAuth, EmbedController.publicConfig);
embedRoutes.post("/embed/login", isEmbedAuth, EmbedController.embedLogin);

export default embedRoutes;
