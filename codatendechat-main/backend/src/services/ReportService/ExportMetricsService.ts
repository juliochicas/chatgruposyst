import ExcelJS from "exceljs";
import { Op } from "sequelize";

import Ticket from "../../models/Ticket";
import Message from "../../models/Message";
import TicketTraking from "../../models/TicketTraking";
import Tag from "../../models/Tag";
import Company from "../../models/Company";
import Channel from "../../models/Channel";
import Contact from "../../models/Contact";

const ORIGIN_PREFIX = "Origen:";
const CHANNEL_PREFIX = "Canal:";

const normalizeLabel = (value: string): string =>
  value
    .replace(/[_-]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");

interface Request {
  companyId: number;
  dateFrom?: string;
  dateTo?: string;
  agentId?: number;
  channelType?: string;
  origin?: string;
}

const buildTicketWhere = ({
  companyId,
  dateFrom,
  dateTo,
  channelType
}: Request) => {
  const where: any = {
    companyId
  };

  if (channelType) {
    where.channelType = channelType;
  }

  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) {
      where.createdAt[Op.gte] = new Date(`${dateFrom} 00:00:00`);
    }
    if (dateTo) {
      where.createdAt[Op.lte] = new Date(`${dateTo} 23:59:59`);
    }
  }

  return where;
};

const fetchTickets = async (filters: Request) => {
  const whereTicket = buildTicketWhere(filters);

  const tickets = await Ticket.findAll({
    where: whereTicket,
    include: [
      {
        model: Tag,
        as: "tags",
        attributes: ["id", "name", "color"],
        through: { attributes: [] }
      },
      {
        model: Channel,
        as: "channel"
      },
      {
        model: Contact,
        as: "contact",
        attributes: ["name", "number"]
      }
    ],
    order: [["createdAt", "ASC"]]
  });

  return tickets;
};

const computeMetrics = (
  ticket: Ticket,
  tracking: TicketTraking | null
) => {
  const firstResponse = ticket.messages
    ?.filter((msg) => msg.fromMe)
    ?.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())?.[0];

  const firstResponseTime = firstResponse
    ? Math.round(
        (firstResponse.createdAt.getTime() - ticket.createdAt.getTime()) / 1000
      )
    : null;

  const aiResponses = ticket.messages?.filter(
    (msg) => msg.metadata?.generatedBy === "openai"
  );

  const humanResponses = ticket.messages?.filter(
    (msg) => msg.fromMe && msg.metadata?.generatedBy !== "openai"
  );

  return {
    status: ticket.status,
    agentId: tracking?.userId || null,
    closedAt: tracking?.finishedAt || null,
    supportTime:
      tracking?.startedAt && tracking.finishedAt
        ? Math.round(
            (tracking.finishedAt.getTime() - tracking.startedAt.getTime()) / 1000
          )
        : null,
    waitTime:
      tracking?.queuedAt && tracking.startedAt
        ? Math.round(
            (tracking.startedAt.getTime() - tracking.queuedAt.getTime()) / 1000
          )
        : null,
    firstResponseTime,
    aiResponses: aiResponses?.length || 0,
    humanResponses: humanResponses?.length || 0
  };
};

const buildWorkbook = async (
  tickets: Ticket[],
  company: Company,
  filters: Request
) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "ChatGrupoSyst";
  workbook.created = new Date();

  const summarySheet = workbook.addWorksheet("Resumen");
  const detailsSheet = workbook.addWorksheet("Detalles");

  summarySheet.columns = [
    { header: "Empresa", key: "company", width: 30 },
    { header: "Rango Fecha (desde)", key: "from", width: 20 },
    { header: "Rango Fecha (hasta)", key: "to", width: 20 },
    { header: "Canal", key: "channel", width: 20 },
    { header: "Origen", key: "origin", width: 20 },
    { header: "Agente", key: "agent", width: 25 },
    { header: "Tickets", key: "tickets", width: 15 }
  ];

  summarySheet.addRow({
    company: company.name || "-",
    from: filters.dateFrom || "-",
    to: filters.dateTo || "-",
    channel: filters.channelType || "Todos",
    origin: filters.origin ? normalizeLabel(filters.origin) : "Todos",
    agent: filters.agentId ? filters.agentId.toString() : "Todos",
    tickets: tickets.length
  });

  detailsSheet.columns = [
    { header: "Ticket ID", key: "ticketId", width: 12 },
    { header: "Contacto", key: "contact", width: 25 },
    { header: "Canal", key: "channel", width: 20 },
    { header: "Origen", key: "origin", width: 20 },
    { header: "Estado", key: "status", width: 15 },
    { header: "Asignado a (ID)", key: "agent", width: 25 },
    { header: "Creado en", key: "createdAt", width: 20 },
    { header: "Cerrado en", key: "closedAt", width: 20 },
    { header: "Tiempo espera (s)", key: "waitSeconds", width: 20 },
    { header: "Tiempo soporte (s)", key: "supportSeconds", width: 20 },
    { header: "1ª respuesta (s)", key: "firstResponse", width: 20 },
    { header: "Respuestas IA", key: "aiResponses", width: 15 },
    { header: "Respuestas humano", key: "humanResponses", width: 18 },
    { header: "Tags", key: "tags", width: 40 }
  ];

  tickets.forEach((ticket) => {
    const tracking = (ticket as any).tracking as TicketTraking | null;
    const metrics = computeMetrics(ticket, tracking);
    const tags = ticket.tags?.map((tag) => tag.name).join(", ") || "";
    const originTag = ticket.tags
      ?.find((tag) => tag.name.startsWith(ORIGIN_PREFIX))
      ?.name.replace(`${ORIGIN_PREFIX} `, "");
    const channelLabel =
      ticket.channel?.type ||
      ticket.channelType ||
      tags
        .split(",")
        .find((t) => t.trim().startsWith(CHANNEL_PREFIX))
        ?.replace(`${CHANNEL_PREFIX} `, "") ||
      "";

    detailsSheet.addRow({
      ticketId: ticket.id,
      contact: ticket.contact?.name || ticket.contact?.number || "",
      channel: channelLabel,
      origin: originTag || "",
      status: metrics.status,
      agent: metrics.agentId || "",
      createdAt: ticket.createdAt,
      closedAt: metrics.closedAt,
      waitSeconds: metrics.waitTime,
      supportSeconds: metrics.supportTime,
      firstResponse: metrics.firstResponseTime,
      aiResponses: metrics.aiResponses,
      humanResponses: metrics.humanResponses,
      tags
    });
  });

  detailsSheet.getColumn("createdAt").numFmt = "dd/mm/yyyy hh:mm";
  detailsSheet.getColumn("closedAt").numFmt = "dd/mm/yyyy hh:mm";

  return workbook;
};

const ExportMetricsService = async (filters: Request) => {
  const tickets = await fetchTickets(filters);

  const company =
    (await Company.findByPk(filters.companyId, {
      attributes: ["name"]
    })) || ({ name: "Sin nombre" } as Company);

  const ticketIds = tickets.map((ticket) => ticket.id);

  if (!ticketIds.length) {
    const workbook = await buildWorkbook([], company, filters);
    return workbook.xlsx.writeBuffer();
  }

  const messages = await Message.findAll({
    where: { ticketId: ticketIds },
    order: [["createdAt", "ASC"]]
  });

  const messagesByTicket = messages.reduce<Record<number, Message[]>>(
    (acc, message) => {
      acc[message.ticketId] = acc[message.ticketId] || [];
      acc[message.ticketId].push(message);
      return acc;
    },
    {}
  );

  tickets.forEach((ticket) => {
    ticket.messages = messagesByTicket[ticket.id] || [];
  });

  const trackingWhere: any = {
    ticketId: ticketIds
  };

  if (filters.agentId) {
    trackingWhere.userId = filters.agentId;
  }

  const trackings = await TicketTraking.findAll({
    where: trackingWhere
  });

  const trackingByTicket = trackings.reduce<Record<number, TicketTraking>>(
    (acc, item) => {
      const current = acc[item.ticketId];
      if (
        !current ||
        (item.updatedAt &&
          current.updatedAt &&
          item.updatedAt.getTime() > current.updatedAt.getTime())
      ) {
        acc[item.ticketId] = item;
      }
      return acc;
    },
    {}
  );

  const originFilter = filters.origin
    ? `${ORIGIN_PREFIX} ${normalizeLabel(filters.origin)}`
    : null;

  const filteredTickets = tickets.filter((ticket) => {
    if (originFilter) {
      const hasOriginTag = ticket.tags?.some(
        (tag) => tag.name === originFilter
      );
      if (!hasOriginTag) {
        return false;
      }
    }

    if (filters.agentId) {
      return trackingByTicket[ticket.id]?.userId === filters.agentId;
    }

    return true;
  });

  filteredTickets.forEach((ticket) => {
    (ticket as any).tracking = trackingByTicket[ticket.id] || null;
  });

  const workbook = await buildWorkbook(filteredTickets, company, filters);

  return workbook.xlsx.writeBuffer();
};

export default ExportMetricsService;

