import { Request, Response } from "express";
import crypto from "crypto";

import metaConfig from "../config/meta";
import MetaWebhookService from "../services/ChannelService/MetaWebhookService";
import AppError from "../errors/AppError";
import { logger } from "../utils/logger";

const verifySignature = (req: Request): void => {
  const signature = req.headers["x-hub-signature-256"] as string;
  if (!metaConfig.appSecret || !signature) {
    return;
  }

  const rawBody =
    (req as any).rawBody instanceof Buffer
      ? (req as any).rawBody
      : Buffer.from(JSON.stringify(req.body || {}));

  const expectedHash = `sha256=${crypto
    .createHmac("sha256", metaConfig.appSecret)
    .update(rawBody)
    .digest("hex")}`;

  if (signature !== expectedHash) {
    throw new AppError("ERR_INVALID_SIGNATURE", 403);
  }
};

export const verify = (req: Request, res: Response): Response => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === metaConfig.verifyToken) {
    return res.status(200).send(challenge);
  }

  return res.status(403).send("Forbidden");
};

export const receive = async (req: Request, res: Response): Promise<Response> => {
  try {
    verifySignature(req);
    await MetaWebhookService.process(req.body);
  } catch (error) {
    logger.error({ error }, "MetaWebhook processing error");
  }

  return res.status(200).json({ received: true });
};

