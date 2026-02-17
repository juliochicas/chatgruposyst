import * as Yup from "yup";
import { Request, Response } from "express";
import { getIO } from "../libs/socket";
import { Op } from "sequelize";
import moment from "moment";

import EmailCampaign from "../models/EmailCampaign";
import EmailCampaignShipping from "../models/EmailCampaignShipping";
import EmailConfig from "../models/EmailConfig";
import ContactList from "../models/ContactList";
import ContactListItem from "../models/ContactListItem";
import Prompt from "../models/Prompt";
import AppError from "../errors/AppError";

import GetActiveContactsService from "../services/CampaignService/GetActiveContactsService";
import { emailCampaignQueue } from "../queues";

type IndexQuery = {
  searchParam: string;
  pageNumber: string;
};

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { searchParam, pageNumber } = req.query as IndexQuery;
  const { companyId } = req.user;

  const limit = 20;
  const offset = limit * (+pageNumber - 1);

  const { count, rows: records } = await EmailCampaign.findAndCountAll({
    where: {
      companyId,
      ...(searchParam && {
        name: { [Op.like]: `%${searchParam}%` }
      })
    },
    include: [
      { model: ContactList, attributes: ["id", "name"] },
      { model: Prompt, as: "aiPrompt", attributes: ["id", "name"] }
    ],
    limit,
    offset,
    order: [["createdAt", "DESC"]]
  });

  const hasMore = count > offset + records.length;

  return res.json({ records, count, hasMore });
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const data = req.body;

  const schema = Yup.object().shape({
    name: Yup.string().required(),
    subject: Yup.string().required()
  });

  try {
    await schema.validate(data);
  } catch (err: any) {
    throw new AppError(err.message);
  }

  // If contact source is "active", create a contact list from active contacts
  if (data.contactSource === "active") {
    const activeContacts = await GetActiveContactsService({
      companyId,
      daysFilter: data.activeDaysFilter || 30
    });

    // Filter only those with email
    const contactsWithEmail = activeContacts.filter(c => c.email && c.email.trim() !== "");

    if (contactsWithEmail.length === 0) {
      throw new AppError("No se encontraron contactos activos con email");
    }

    const contactList = await ContactList.create({
      name: `${data.name} | EMAIL ACTIVOS - ${new Date().toISOString()}`,
      companyId
    });

    await ContactListItem.bulkCreate(
      contactsWithEmail.map(c => ({
        name: c.name,
        number: c.number || "",
        email: c.email,
        contactListId: contactList.id,
        companyId,
        isWhatsappValid: true
      }))
    );

    data.contactListId = contactList.id;
  }

  if (data.scheduledAt) {
    data.status = "SCHEDULED";
  }

  const record = await EmailCampaign.create({ ...data, companyId });

  await record.reload({
    include: [
      { model: ContactList, attributes: ["id", "name"] },
      { model: Prompt, as: "aiPrompt", attributes: ["id", "name"] }
    ]
  });

  const io = getIO();
  io.to(`company-${companyId}-mainchannel`).emit(`company-${companyId}-email-campaign`, {
    action: "create",
    record
  });

  return res.status(200).json(record);
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { id } = req.params;
  const { companyId } = req.user;

  const record = await EmailCampaign.findOne({
    where: { id, companyId },
    include: [
      { model: ContactList, attributes: ["id", "name"] },
      { model: Prompt, as: "aiPrompt", attributes: ["id", "name"] },
      {
        model: EmailCampaignShipping,
        as: "shippings",
        attributes: ["id", "contactEmail", "contactName", "status", "sentAt", "openedAt", "repliedAt", "errorMessage"]
      }
    ]
  });

  if (!record) throw new AppError("ERR_EMAIL_CAMPAIGN_NOT_FOUND", 404);

  return res.status(200).json(record);
};

export const update = async (req: Request, res: Response): Promise<Response> => {
  const { id } = req.params;
  const { companyId } = req.user;
  const data = req.body;

  const record = await EmailCampaign.findOne({ where: { id, companyId } });
  if (!record) throw new AppError("ERR_EMAIL_CAMPAIGN_NOT_FOUND", 404);

  if (!["DRAFT", "SCHEDULED", "CANCELLED"].includes(record.status)) {
    throw new AppError("Solo se puede editar campanas en estado borrador, programada o cancelada");
  }

  if (data.scheduledAt && data.status === "DRAFT") {
    data.status = "SCHEDULED";
  }

  await record.update(data);

  await record.reload({
    include: [
      { model: ContactList, attributes: ["id", "name"] },
      { model: Prompt, as: "aiPrompt", attributes: ["id", "name"] }
    ]
  });

  const io = getIO();
  io.to(`company-${companyId}-mainchannel`).emit(`company-${companyId}-email-campaign`, {
    action: "update",
    record
  });

  return res.status(200).json(record);
};

export const remove = async (req: Request, res: Response): Promise<Response> => {
  const { id } = req.params;
  const { companyId } = req.user;

  const record = await EmailCampaign.findOne({ where: { id, companyId } });
  if (!record) throw new AppError("ERR_EMAIL_CAMPAIGN_NOT_FOUND", 404);

  if (record.status === "SENDING") {
    throw new AppError("No se puede eliminar una campana en envio");
  }

  await record.destroy();

  const io = getIO();
  io.to(`company-${companyId}-mainchannel`).emit(`company-${companyId}-email-campaign`, {
    action: "delete",
    id
  });

  return res.status(200).json({ message: "Campana eliminada" });
};

export const startCampaign = async (req: Request, res: Response): Promise<Response> => {
  const { id } = req.params;
  const { companyId } = req.user;

  const campaign = await EmailCampaign.findOne({
    where: { id, companyId },
    include: [{ model: ContactList, include: [{ model: ContactListItem, as: "contacts" }] }]
  });

  if (!campaign) throw new AppError("ERR_EMAIL_CAMPAIGN_NOT_FOUND", 404);

  const emailConfig = await EmailConfig.findOne({
    where: { companyId, isActive: true }
  });

  if (!emailConfig) {
    throw new AppError("No hay configuracion de email activa. Configure Resend primero.");
  }

  if (!campaign.contactList || !campaign.contactList.contacts || campaign.contactList.contacts.length === 0) {
    throw new AppError("La lista de contactos esta vacia");
  }

  // Filter contacts with email
  const contactsWithEmail = campaign.contactList.contacts.filter(
    c => c.email && c.email.trim() !== ""
  );

  if (contactsWithEmail.length === 0) {
    throw new AppError("No hay contactos con email en la lista seleccionada");
  }

  await campaign.update({ status: "SENDING" });

  // Queue the campaign processing
  emailCampaignQueue.add(
    "ProcessEmailCampaign",
    { campaignId: campaign.id, companyId },
    { removeOnComplete: true, delay: 3000 }
  );

  const io = getIO();
  io.to(`company-${companyId}-mainchannel`).emit(`company-${companyId}-email-campaign`, {
    action: "update",
    record: campaign
  });

  return res.status(200).json({ message: "Campana de email iniciada", contactCount: contactsWithEmail.length });
};

export const cancelCampaign = async (req: Request, res: Response): Promise<Response> => {
  const { id } = req.params;
  const { companyId } = req.user;

  const campaign = await EmailCampaign.findOne({ where: { id, companyId } });
  if (!campaign) throw new AppError("ERR_EMAIL_CAMPAIGN_NOT_FOUND", 404);

  // Cancel pending shippings
  await EmailCampaignShipping.update(
    { status: "CANCELLED" },
    { where: { emailCampaignId: campaign.id, status: "PENDING" } }
  );

  await campaign.update({ status: "CANCELLED" });

  const io = getIO();
  io.to(`company-${companyId}-mainchannel`).emit(`company-${companyId}-email-campaign`, {
    action: "update",
    record: campaign
  });

  return res.status(200).json({ message: "Campana cancelada" });
};

export const getReport = async (req: Request, res: Response): Promise<Response> => {
  const { id } = req.params;
  const { companyId } = req.user;

  const campaign = await EmailCampaign.findOne({
    where: { id, companyId }
  });

  if (!campaign) throw new AppError("ERR_EMAIL_CAMPAIGN_NOT_FOUND", 404);

  const totalContacts = await EmailCampaignShipping.count({
    where: { emailCampaignId: campaign.id }
  });

  const sent = await EmailCampaignShipping.count({
    where: { emailCampaignId: campaign.id, status: { [Op.ne]: "PENDING" } }
  });

  const failed = await EmailCampaignShipping.count({
    where: { emailCampaignId: campaign.id, status: "FAILED" }
  });

  const shippings = await EmailCampaignShipping.findAll({
    where: { emailCampaignId: campaign.id },
    attributes: ["id", "contactEmail", "contactName", "status", "sentAt", "errorMessage"],
    order: [["createdAt", "ASC"]]
  });

  return res.status(200).json({
    campaign,
    stats: {
      totalContacts,
      sent,
      failed,
      pending: totalContacts - sent,
      successRate: totalContacts > 0 ? Math.round((sent - failed) / totalContacts * 100) : 0
    },
    shippings
  });
};
