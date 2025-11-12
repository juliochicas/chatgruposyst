import { Op } from "sequelize";

import Contact from "../../models/Contact";
import Ticket from "../../models/Ticket";
import Channel from "../../models/Channel";
import FindOrCreateATicketTrakingService from "./FindOrCreateATicketTrakingService";
import ShowTicketService from "./ShowTicketService";
import ApplyTicketTagsService from "./ApplyTicketTagsService";

interface Request {
  contact: Contact;
  channel: Channel;
  companyId: number;
  unreadMessages?: number;
  status?: string;
  channelExternalId?: string;
}

const FindOrCreateChannelTicketService = async ({
  contact,
  channel,
  companyId,
  unreadMessages = 1,
  status = "pending",
  channelExternalId
}: Request): Promise<Ticket> => {
  let ticket = await Ticket.findOne({
    where: {
      status: {
        [Op.or]: ["open", "pending", "closed"]
      },
      contactId: contact.id,
      companyId,
      channelId: channel.id
    },
    order: [["updatedAt", "DESC"]]
  });

  if (ticket) {
    const updateData: Partial<Ticket> = {
      unreadMessages,
      channelType: channel.type,
      channelExternalId: channelExternalId || ticket.channelExternalId,
      whatsappId: null
    };

    if (ticket.status === "closed") {
      updateData.status = status;
      updateData.userId = null;
      updateData.queueId = null;
    }

    await ticket.update(updateData);
  }

  if (!ticket) {
    ticket = await Ticket.create({
      contactId: contact.id,
      companyId,
      status,
      unreadMessages,
      channelId: channel.id,
      channelType: channel.type,
      channelExternalId,
      whatsappId: null,
      isGroup: false
    });
  }

  await FindOrCreateATicketTrakingService({
    ticketId: ticket.id,
    companyId,
    userId: ticket.userId,
    whatsappId: ticket.whatsappId
  });

  ticket = await ShowTicketService(ticket.id, companyId);

  await ApplyTicketTagsService({ ticket, channel });

  return ticket;
};

export default FindOrCreateChannelTicketService;

