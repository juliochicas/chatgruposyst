import { Router, Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import isAuth from "../middleware/isAuth";
import uploadConfig from "../config/upload";
import tokenAuth from "../middleware/tokenAuth";

import * as MessageController from "../controllers/MessageController";

const messageRoutes = Router();

const upload = multer(uploadConfig);

// Dedicated media endpoint - serves media files through the authenticated API pipeline.
// This is more reliable than relying solely on static file serving through multiple nginx proxies.
messageRoutes.get("/messages/media/:filename", isAuth, (req: Request, res: Response) => {
  const { filename } = req.params;

  // Sanitize filename to prevent path traversal
  const sanitized = path.basename(filename);
  const filePath = path.join(uploadConfig.directory, sanitized);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "File not found" });
  }

  return res.sendFile(filePath);
});

messageRoutes.get("/messages/:ticketId/export", isAuth, MessageController.exportMessages);
messageRoutes.get("/messages/:ticketId", isAuth, MessageController.index);
messageRoutes.post("/messages/:ticketId", isAuth, upload.array("medias"), MessageController.store);
messageRoutes.delete("/messages/:messageId", isAuth, MessageController.remove);
messageRoutes.post("/api/messages/send", tokenAuth, upload.array("medias"), MessageController.send);

export default messageRoutes;
