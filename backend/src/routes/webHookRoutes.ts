// Archivo: backend/src/routes/webhookRoutes.ts
// Webhooks para recibir mensajes de Facebook, Instagram y TikTok

import { Router, Request, Response } from "express";
import { logger } from "../utils/logger";
import Channel from "../models/Channel";
import FacebookService from "../services/ChannelServices/FacebookService";
import InstagramService from "../services/ChannelServices/InstagramService";
import crypto from "crypto";

const webhookRoutes = Router();

// Declaración global para TypeScript
declare global {
  var channelServices: Record<number, any>;
}

// Middleware para verificar firma de Facebook/Instagram
const verifyFacebookSignature = (req: Request, res: Response, next: any) => {
  const signature = req.headers["x-hub-signature-256"] as string;
  
  if (!signature) {
    logger.warn("Webhook sin firma recibido");
    return res.sendStatus(403);
  }

  const elements = signature.split("=");
  const signatureHash = elements[1];
  const expectedHash = crypto
    .createHmac("sha256", process.env.FACEBOOK_APP_SECRET!)
    .update(JSON.stringify(req.body))
    .digest("hex");

  if (signatureHash !== expectedHash) {
    logger.warn("Firma de webhook inválida");
    return res.sendStatus(403);
  }

  next();
};

// Verificación de webhook de Facebook/Instagram (GET)
webhookRoutes.get("/webhook/meta/:channelId", async (req: Request, res: Response) => {
  try {
    const { channelId } = req.params;
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    logger.info("Verificación de webhook Meta recibida:", { channelId, mode });

    if (mode && token) {
      // Buscar el canal
      const channel = await Channel.findByPk(channelId);
      
      if (!channel) {
        logger.error("Canal no encontrado:", channelId);
        return res.sendStatus(404);
      }

      // Verificar token
      if (mode === "subscribe" && token === channel.webhookVerifyToken) {
        logger.info("Webhook verificado correctamente");
        return res.status(200).send(challenge);
      } else {
        logger.warn("Token de verificación inválido");
        return res.sendStatus(403);
      }
    }

    res.sendStatus(400);
  } catch (error) {
    logger.error("Error en verificación de webhook:", error);
    res.sendStatus(500);
  }
});

// Recibir mensajes de Facebook/Instagram (POST)
webhookRoutes.post(
  "/webhook/meta/:channelId",
  verifyFacebookSignature,
  async (req: Request, res: Response) => {
    try {
      const { channelId } = req.params;
      const data = req.body;

      logger.info("Webhook Meta recibido:", { 
        channelId, 
        object: data.object 
      });

      // Buscar el canal
      const channel = await Channel.findByPk(channelId);
      
      if (!channel) {
        logger.error("Canal no encontrado:", channelId);
        return res.sendStatus(404);
      }

      // Procesar según el tipo de canal
      const service = global.channelServices?.[channel.id];
      
      if (!service) {
        logger.error("Servicio no inicializado para canal:", channelId);
        return res.sendStatus(503);
      }

      // Procesar webhook según el objeto
      if (data.object === "page") {
        // Mensajes de Facebook Messenger
        if (channel.type === "facebook") {
          await (service as FacebookService).processWebhook(data);
        }
      } else if (data.object === "instagram") {
        // Mensajes de Instagram
        if (channel.type === "instagram") {
          await (service as InstagramService).processWebhook(data);
        }
      }

      // Facebook requiere respuesta 200 inmediata
      res.sendStatus(200);
    } catch (error) {
      logger.error("Error procesando webhook Meta:", error);
      res.sendStatus(500);
    }
  }
);

// Webhook para comentarios de Instagram
webhookRoutes.post(
  "/webhook/instagram-comments/:channelId",
  verifyFacebookSignature,
  async (req: Request, res: Response) => {
    try {
      const { channelId } = req.params;
      const data = req.body;

      logger.info("Webhook de comentarios Instagram recibido:", { channelId });

      // Aquí procesaríamos los comentarios
      // Por ahora solo logueamos
      logger.info("Comentario recibido:", data);

      res.sendStatus(200);
    } catch (error) {
      logger.error("Error procesando webhook de comentarios:", error);
      res.sendStatus(500);
    }
  }
);

// Webhook para TikTok (futuro)
webhookRoutes.get("/webhook/tiktok/:channelId", async (req: Request, res: Response) => {
  try {
    const { channelId } = req.params;
    const { code, state } = req.query;

    logger.info("Webhook TikTok recibido:", { channelId, code });

    // Verificar el estado para seguridad
    if (state !== process.env.TIKTOK_STATE_SECRET) {
      return res.status(403).send("Estado inválido");
    }

    // Aquí intercambiaríamos el código por un token
    res.send("TikTok conectado correctamente");
  } catch (error) {
    logger.error("Error en webhook TikTok:", error);
    res.sendStatus(500);
  }
});

// Webhook para recibir eventos de TikTok
webhookRoutes.post("/webhook/tiktok/:channelId", async (req: Request, res: Response) => {
  try {
    const { channelId } = req.params;
    const signature = req.headers["x-tiktok-signature"] as string;
    
    // Verificar firma de TikTok
    if (!verifyTikTokSignature(req.body, signature)) {
      return res.sendStatus(403);
    }

    const data = req.body;
    logger.info("Evento TikTok recibido:", { channelId, event: data.event });

    // Procesar según el tipo de evento
    switch (data.event) {
      case "comment":
        // Procesar comentario
        logger.info("Comentario TikTok:", data.comment);
        break;
      case "mention":
        // Procesar mención
        logger.info("Mención TikTok:", data.mention);
        break;
    }

    res.sendStatus(200);
  } catch (error) {
    logger.error("Error procesando webhook TikTok:", error);
    res.sendStatus(500);
  }
});

// Webhook genérico para pruebas en desarrollo
if (process.env.NODE_ENV === "development") {
  webhookRoutes.post("/webhook/test/:channelId", async (req: Request, res: Response) => {
    logger.info("Webhook de prueba recibido:", {
      channelId: req.params.channelId,
      body: req.body
    });
    res.json({ received: true });
  });
}

// Función auxiliar para verificar firma de TikTok
function verifyTikTokSignature(payload: any, signature: string): boolean {
  const secret = process.env.TIKTOK_WEBHOOK_SECRET || "";
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(JSON.stringify(payload))
    .digest("hex");
  
  return signature === `sha256=${expectedSignature}`;
}

// Endpoint de salud para los webhooks
webhookRoutes.get("/webhook/health", (req: Request, res: Response) => {
  res.json({ 
    status: "ok", 
    timestamp: new Date().toISOString(),
    webhooks: {
      meta: "active",
      tiktok: "ready"
    }
  });
});

export default webhookRoutes;
