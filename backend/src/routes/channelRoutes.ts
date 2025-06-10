// Archivo: backend/src/routes/channelRoutes.ts
// Rutas para gestión de canales (reemplaza whatsappRoutes.ts)

import { Router } from "express";
import isAuth from "../middleware/isAuth";
import * as ChannelController from "../controllers/ChannelController";
import multer from "multer";

const channelRoutes = Router();

// Middleware para manejar archivos (para importar tokens/certificados)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
});

// Rutas protegidas con autenticación
channelRoutes.use(isAuth);

// Listar todos los canales
channelRoutes.get("/channels", ChannelController.index);

// Ver detalle de un canal
channelRoutes.get("/channels/:channelId", ChannelController.show);

// Crear nuevo canal
channelRoutes.post("/channels", ChannelController.store);

// Actualizar canal
channelRoutes.put("/channels/:channelId", ChannelController.update);

// Eliminar canal
channelRoutes.delete("/channels/:channelId", ChannelController.remove);

// Acciones específicas del canal
channelRoutes.post("/channels/:channelId/connect", ChannelController.connect);
channelRoutes.post("/channels/:channelId/disconnect", ChannelController.disconnect);

// Obtener QR Code (WhatsApp)
channelRoutes.get("/channels/:channelId/qrcode", ChannelController.getQrCode);

// Configurar webhook (Facebook/Instagram)
channelRoutes.post("/channels/:channelId/webhook", ChannelController.configureWebhook);

// Obtener estadísticas
channelRoutes.get("/channels/:channelId/stats", ChannelController.getStats);

// Endpoint de prueba (solo desarrollo)
if (process.env.NODE_ENV === "development") {
  channelRoutes.post("/channels/test", ChannelController.test);
}

// Rutas específicas por tipo de canal

// WhatsApp - Importar sesión existente
channelRoutes.post(
  "/channels/:channelId/import-session",
  upload.single("session"),
  async (req, res) => {
    // Lógica para importar sesión de WhatsApp
    res.json({ message: "Sesión importada" });
  }
);

// Facebook/Instagram - Validar token
channelRoutes.post("/channels/:channelId/validate-token", async (req, res) => {
  // Lógica para validar token de Facebook/Instagram
  res.json({ valid: true });
});

// TikTok - Autorizar cuenta (futuro)
channelRoutes.get("/channels/:channelId/tiktok-auth", async (req, res) => {
  // Lógica para autorización OAuth de TikTok
  res.json({ authUrl: "https://..." });
});

export default channelRoutes;
