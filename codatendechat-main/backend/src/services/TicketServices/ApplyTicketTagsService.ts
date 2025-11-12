import { Op } from "sequelize";

import Ticket from "../../models/Ticket";
import Tag from "../../models/Tag";
import TicketTag from "../../models/TicketTag";
import Channel from "../../models/Channel";
import Company from "../../models/Company";

const normalizeLabel = (value: string): string => {
  return value
    .replace(/[_-]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

const ensureTag = async (
  companyId: number,
  name: string,
  color = "#A4CCCC"
): Promise<Tag> => {
  const [tag] = await Tag.findOrCreate({
    where: {
      [Op.and]: [{ name }, { companyId }]
    },
    defaults: {
      name,
      color,
      companyId,
      kanban: 0
    }
  });

  return tag;
};

const ensureTicketTag = async (ticketId: number, tagId: number) => {
  await TicketTag.findOrCreate({
    where: {
      ticketId,
      tagId
    },
    defaults: {
      ticketId,
      tagId
    }
  });
};

interface MetaData {
  originType?: string;
  kind?: string;
  storyId?: string;
  commentId?: string;
  postId?: string;
  [key: string]: any;
}

export interface ApplyTicketTagsParams {
  ticket: Ticket;
  channel?: Channel | null;
  channelTypeFallback?: string | null;
  metadata?: MetaData | null;
}

const ApplyTicketTagsService = async ({
  ticket,
  channel,
  channelTypeFallback,
  metadata
}: ApplyTicketTagsParams): Promise<void> => {
  try {
    const companyId = ticket.companyId;

    const company =
      ticket.company ||
      (await Company.findByPk(companyId, { attributes: ["name"] }));

    const rawChannelType =
      channel?.type || ticket.channelType || channelTypeFallback || "whatsapp";

    const channelLabel = normalizeLabel(rawChannelType);

    const channelTag = await ensureTag(companyId, `Canal: ${channelLabel}`);
    await ensureTicketTag(ticket.id, channelTag.id);

    if (company?.name) {
      const companyTag = await ensureTag(companyId, `Empresa: ${company.name}`);
      await ensureTicketTag(ticket.id, companyTag.id);
    }

    if (metadata?.originType || metadata?.kind) {
      const rawOrigin = metadata.originType || metadata.kind;
      const originLabel = normalizeLabel(rawOrigin);
      const originTag = await ensureTag(
        companyId,
        `Origen: ${originLabel || "Desconocido"}`
      );
      await ensureTicketTag(ticket.id, originTag.id);
    }
  } catch (error) {
    // No interrumpir el flujo de creación del ticket si fallan los tags.
  }
};

export default ApplyTicketTagsService;

