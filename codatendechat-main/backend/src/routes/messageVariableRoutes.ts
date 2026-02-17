import express from "express";
import isAuth from "../middleware/isAuth";
import * as MessageVariableController from "../controllers/MessageVariableController";

const messageVariableRoutes = express.Router();

messageVariableRoutes.get("/message-variables", isAuth, MessageVariableController.index);
messageVariableRoutes.post("/message-variables", isAuth, MessageVariableController.store);
messageVariableRoutes.put("/message-variables/:id", isAuth, MessageVariableController.update);
messageVariableRoutes.delete("/message-variables/:id", isAuth, MessageVariableController.remove);

export default messageVariableRoutes;
