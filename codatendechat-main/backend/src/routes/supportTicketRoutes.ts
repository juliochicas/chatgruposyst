import express from "express";
import isAuth from "../middleware/isAuth";
import isSuper from "../middleware/isSuper";
import * as SupportTicketController from "../controllers/SupportTicketController";

const supportTicketRoutes = express.Router();

// Any authenticated user
supportTicketRoutes.get("/support-tickets", isAuth, SupportTicketController.index);
supportTicketRoutes.get("/support-tickets/:id", isAuth, SupportTicketController.show);
supportTicketRoutes.post("/support-tickets", isAuth, SupportTicketController.store);
supportTicketRoutes.post("/support-tickets/:id/messages", isAuth, SupportTicketController.sendMessage);
supportTicketRoutes.post("/support-tickets/:id/rate", isAuth, SupportTicketController.rate);

// Admin only
supportTicketRoutes.put("/support-tickets/:id", isAuth, SupportTicketController.update);
supportTicketRoutes.get("/support-tickets-stats", isAuth, isSuper, SupportTicketController.stats);

export default supportTicketRoutes;
