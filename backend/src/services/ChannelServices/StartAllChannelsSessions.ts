import Channel from "../../models/Channel";
import { logger } from "../../utils/logger";
import WhatsAppService from "./WhatsAppService";
import FacebookService from "./FacebookService";
import InstagramService from "./InstagramService";

export const StartAllChannelsSessions = async (companyId: number): Promise<void> => {
  const channels = await Channel.findAll({
    where: { companyId }
  });

  channels.forEach(channel => {
    try {
      let service;
      
      switch (channel.type) {
        case "whatsapp":
          service = new WhatsAppService(channel);
          break;
        case "facebook":
          service = new FacebookService(channel);
          break;
        case "instagram":
          service = new InstagramService(channel);
          break;
      }

      if (service) {
        service.initialize();
      }
    } catch (err) {
      logger.error(`Error starting ${channel.type} session for channel ${channel.id}:`, err);
    }
  });
};