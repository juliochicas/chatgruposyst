// Archivo: backend/src/controllers/ChannelController.ts
// Controlador unificado para todos los canales (WhatsApp, Facebook, Instagram, etc.)

import { Request, Response } from "express";
import { getIO } from "../libs/socket";
import { Op } from "sequelize";

import Channel, { ChannelType } from "../models/Channel";
import Company from "../models/Company";
import Queue from "../models/Queue";
import QueueChannel from "../models/QueueChannel";
import AppError from "../errors/AppError";
import { logger } from "../utils/logger";

// Servicios
import CreateChannelService from "../services/ChannelServices/CreateChannelService";
import UpdateChannelService from "../services/ChannelServices/UpdateChannelService";
import DeleteChannelService from "../services/ChannelServices/DeleteChannelService";
import ListChannelsService from "../services/ChannelServices/ListChannelsService";
import ShowChannelService from "../services/ChannelServices/ShowChannelService";

// Servicios específicos por canal
import WhatsAppService from "../services/ChannelServices/WhatsAppService";
import FacebookService from "../services/ChannelServices/FacebookService";
import InstagramService from "../services/ChannelServices/InstagramService";

// Plan service para verificar límites
import PlanService from "../services/PlanService";

interface ChannelData {
  name: string;
  type: ChannelType;
  status?: string;
  isDefault?: boolean;
  greetingMessage?: string;
  farewellMessage?: string;
  color?: string;
  // WhatsApp
  qrcode?: string;
  // Facebook
  facebookPageId?: string;
  facebookPageToken?: string;
  // Instagram
  instagramBusinessId?: string;
  instagramToken?: string;
  // Webhook
  webhookVerifyToken?: string;
  // Configuraciones adicionales
  channelConfig?: any;
  queueIds?: number[];
}

interface IndexQuery {
  searchParam?: string;
  pageNumber?: string;
  session?: string;
  type?: ChannelType;
}

// Declaración global para TypeScript
declare global {
  var channelServices: Record<number, any>;
}

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { searchParam, pageNumber, session, type } = req.query as IndexQuery;

  const { channels, count, hasMore } = await ListChannelsService({
    searchParam,
    pageNumber,
    companyId,
    session,
    type
  });

  return res.json({ channels, count, hasMore });
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { channelId } = req.params;
  const { companyId } = req.user;

  const channel = await ShowChannelService(channelId, companyId);

  return res.json(channel);
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const channelData: ChannelData = req.body;

  try {
    // Verificar límite de canales del plan
    const limitCheck = await PlanService.checkLimit(companyId, "channels");
    if (!limitCheck.allowed) {
      throw new AppError(
        `Has alcanzado el límite de canales (${limitCheck.current}/${limitCheck.limit}). 
        Por favor, actualiza tu plan para agregar más canales.`,
        403
      );
    }

    // Verificar si el tipo de canal está permitido en el plan
    const canUseChannel = await PlanService.canUseFeature(companyId, channelData.type);
    if (!canUseChannel) {
      throw new AppError(
        `Tu plan actual no incluye ${channelData.type}. 
        Por favor, actualiza tu plan para usar este canal.`,
        403
      );
    }

    const channel = await CreateChannelService({
      ...channelData,
      companyId
    });

    // Incrementar contador de uso
    await PlanService.incrementUsage(companyId, "currentChannels");

    const io = getIO();
    io.of(companyId.toString())
      .emit(`company-${companyId}-channel`, {
        action: "create",
        channel
      });

    // Inicializar el canal según su tipo
    await initializeChannel(channel);

    return res.status(201).json(channel);
  } catch (error) {
    logger.error("Error creating channel:", error);
    throw error;
  }
};

export const update = async (req: Request, res: Response): Promise<Response> => {
  const { channelId } = req.params;
  const { companyId } = req.user;
  const channelData: ChannelData = req.body;

  try {
    const channel = await UpdateChannelService({
      channelId,
      channelData,
      companyId
    });

    const io = getIO();
    io.of(companyId.toString())
      .emit(`company-${companyId}-channel`, {
        action: "update",
        channel
      });

    return res.json(channel);
  } catch (error) {
    logger.error("Error updating channel:", error);
    throw error;
  }
};

export const remove = async (req: Request, res: Response): Promise<Response> => {
  const { channelId } = req.params;
  const { companyId } = req.user;

  try {
    // Desconectar el canal antes de eliminarlo
    const channel = await ShowChannelService(channelId, companyId);
    await disconnectChannel(channel);

    await DeleteChannelService(channelId, companyId);

    // Decrementar contador de uso
    await PlanService.incrementUsage(companyId, "currentChannels", -1);

    const io = getIO();
    io.of(companyId.toString())
      .emit(`company-${companyId}-channel`, {
        action: "delete",
        channelId
      });

    return res.json({ message: "Canal eliminado correctamente" });
  } catch (error) {
    logger.error("Error deleting channel:", error);
    throw error;
  }
};

// Conectar/Inicializar un canal
export const connect = async (req: Request, res: Response): Promise<Response> => {
  const { channelId } = req.params;
  const { companyId } = req.user;

  try {
    const channel = await ShowChannelService(channelId, companyId);
    await initializeChannel(channel);

    return res.json({ 
      message: `Canal ${channel.name} conectándose...`,
      channel 
    });
  } catch (error) {
    logger.error("Error connecting channel:", error);
    throw error;
  }
};

// Desconectar un canal
export const disconnect = async (req: Request, res: Response): Promise<Response> => {
  const { channelId } = req.params;
  const { companyId } = req.user;

  try {
    const channel = await ShowChannelService(channelId, companyId);
    await disconnectChannel(channel);

    return res.json({ 
      message: `Canal ${channel.name} desconectado`,
      channel 
    });
  } catch (error) {
    logger.error("Error disconnecting channel:", error);
    throw error;
  }
};

// Obtener QR Code (solo WhatsApp)
export const getQrCode = async (req: Request, res: Response): Promise<Response> => {
  const { channelId } = req.params;
  const { companyId } = req.user;

  try {
    const channel = await ShowChannelService(channelId, companyId);
    
    if (channel.type !== ChannelType.WHATSAPP) {
      throw new AppError("QR Code solo está disponible para WhatsApp", 400);
    }

    return res.json({ 
      qrcode: channel.qrcode,
      status: channel.status 
    });
  } catch (error) {
    logger.error("Error getting QR code:", error);
    throw error;
  }
};

// Configurar webhook (Facebook/Instagram)
export const configureWebhook = async (req: Request, res: Response): Promise<Response> => {
  const { channelId } = req.params;
  const { companyId } = req.user;
  const { verifyToken } = req.body;

  try {
    const channel = await ShowChannelService(channelId, companyId);
    
    if (![ChannelType.FACEBOOK, ChannelType.INSTAGRAM].includes(channel.type as ChannelType)) {
      throw new AppError("Webhook solo está disponible para Facebook e Instagram", 400);
    }

    await channel.update({ webhookVerifyToken: verifyToken });

    const webhookUrl = `${process.env.BACKEND_URL}/webhook/${channel.type}/${channel.id}`;

    return res.json({ 
      message: "Webhook configurado",
      webhookUrl,
      verifyToken 
    });
  } catch (error) {
    logger.error("Error configuring webhook:", error);
    throw error;
  }
};

// Obtener estadísticas del canal
export const getStats = async (req: Request, res: Response): Promise<Response> => {
  const { channelId } = req.params;
  const { companyId } = req.user;
  const { startDate, endDate } = req.query;

  try {
    const channel = await ShowChannelService(channelId, companyId);
    
    // Aquí iría la lógica para obtener estadísticas
    const stats = {
      totalMessages: 0,
      sentMessages: 0,
      receivedMessages: 0,
      totalTickets: 0,
      openTickets: 0,
      closedTickets: 0,
      avgResponseTime: 0
    };

    return res.json({ channel, stats });
  } catch (error) {
    logger.error("Error getting channel stats:", error);
    throw error;
  }
};

// Funciones auxiliares privadas
async function initializeChannel(channel: Channel): Promise<void> {
  try {
    let service;
    
    switch (channel.type) {
      case ChannelType.WHATSAPP:
        service = new WhatsAppService(channel);
        break;
      case ChannelType.FACEBOOK:
        service = new FacebookService(channel);
        break;
      case ChannelType.INSTAGRAM:
        service = new InstagramService(channel);
        break;
      default:
        throw new AppError(`Tipo de canal no soportado: ${channel.type}`, 400);
    }

    await service.initialize();
    
    // Guardar instancia del servicio en memoria (puedes usar Redis para esto)
    global.channelServices = global.channelServices || {};
    global.channelServices[channel.id] = service;
    
  } catch (error) {
    logger.error(`Error initializing channel ${channel.id}:`, error);
    await channel.update({ status: "DISCONNECTED" });
    throw error;
  }
}

async function disconnectChannel(channel: Channel): Promise<void> {
  try {
    const service = global.channelServices?.[channel.id];
    
    if (service) {
      await service.disconnect();
      delete global.channelServices[channel.id];
    }
    
    await channel.update({ status: "DISCONNECTED" });
  } catch (error) {
    logger.error(`Error disconnecting channel ${channel.id}:`, error);
    throw error;
  }
}

// Endpoint para pruebas en desarrollo
export const test = async (req: Request, res: Response): Promise<Response> => {
  if (process.env.NODE_ENV !== "development") {
    throw new AppError("Este endpoint solo está disponible en desarrollo", 403);
  }

  const { channelId, action } = req.body;
  const { companyId } = req.user;

  try {
    const channel = await ShowChannelService(channelId, companyId);
    const service = global.channelServices?.[channel.id];

    if (!service) {
      throw new AppError("Servicio no encontrado. Conecta el canal primero.", 404);
    }

    let result;
    switch (action) {
      case "sendTestMessage":
        result = await service.sendMessage({
          to: req.body.to,
          body: "Mensaje de prueba desde el CRM",
          type: "text"
        });
        break;
      case "getStatus":
        result = await service.getStatus();
        break;
      default:
        throw new AppError("Acción no válida", 400);
    }

    return res.json({ result });
  } catch (error) {
    logger.error("Error in test endpoint:", error);
    throw error;
  }
};
