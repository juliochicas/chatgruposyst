import * as Sentry from "@sentry/node";
import BullQueue from "bull";
import { MessageData, SendMessage } from "./helpers/SendMessage";
import Whatsapp from "./models/Whatsapp";
import { logger } from "./utils/logger";
import moment from "moment";
import Schedule from "./models/Schedule";
import Contact from "./models/Contact";
import { Op, QueryTypes, Sequelize } from "sequelize";
import GetDefaultWhatsApp from "./helpers/GetDefaultWhatsApp";
import Campaign from "./models/Campaign";
import ContactList from "./models/ContactList";
import ContactListItem from "./models/ContactListItem";
import { isEmpty, isNil, isArray } from "lodash";
import CampaignSetting from "./models/CampaignSetting";
import CampaignShipping from "./models/CampaignShipping";
import GetWhatsappWbot from "./helpers/GetWhatsappWbot";
import sequelize from "./database";
import { getMessageOptions } from "./services/WbotServices/SendWhatsAppMedia";
import { getIO } from "./libs/socket";
import path from "path";
import User from "./models/User";
import Company from "./models/Company";
import Plan from "./models/Plan";
import Ticket from "./models/Ticket";
import ShowFileService from "./services/FileServices/ShowService";
import FilesOptions from './models/FilesOptions';
import { addSeconds, differenceInSeconds } from "date-fns";
import formatBody from "./helpers/Mustache";
import { ClosedAllOpenTickets } from "./services/WbotServices/wbotClosedTickets";
import UltraMsgConfig from "./models/UltraMsgConfig";
import { sendTextMessage, sendImage, sendDocument, sendVideo, sendAudio } from "./services/UltraMsgServices/UltraMsgAPI";
import { generateMessageVariation } from "./services/CampaignService/AIMessageVariation";
import Prompt from "./models/Prompt";
import EmailCampaign from "./models/EmailCampaign";
import EmailCampaignShipping from "./models/EmailCampaignShipping";
import EmailConfig from "./models/EmailConfig";
import { sendEmail } from "./services/EmailServices/ResendAPI";
import { generateEmailVariation } from "./services/EmailServices/AIEmailVariation";
import {
  sendExpirationWarningEmail,
  sendAccountExpiredEmail
} from "./services/EmailServices/SystemEmailService";


const nodemailer = require('nodemailer');
const CronJob = require('cron').CronJob;

const connection = process.env.REDIS_URI || "";
const limiterMax = process.env.REDIS_OPT_LIMITER_MAX || 1;
const limiterDuration = process.env.REDIS_OPT_LIMITER_DURATION || 3000;

interface ProcessCampaignData {
  id: number;
  delay: number;
}

interface PrepareContactData {
  contactId: number;
  campaignId: number;
  delay: number;
  variables: any[];
}

interface DispatchCampaignData {
  campaignId: number;
  campaignShippingId: number;
  contactListItemId: number;
}

export const userMonitor = new BullQueue("UserMonitor", connection);

export const queueMonitor = new BullQueue("QueueMonitor", connection);

export const messageQueue = new BullQueue("MessageQueue", connection, {
  limiter: {
    max: limiterMax as number,
    duration: limiterDuration as number
  }
});

export const scheduleMonitor = new BullQueue("ScheduleMonitor", connection);
export const sendScheduledMessages = new BullQueue(
  "SendScheduledMessages",
  connection
);

export const campaignQueue = new BullQueue("CampaignQueue", connection);

export const emailCampaignQueue = new BullQueue("EmailCampaignQueue", connection);

export const expirationMonitor = new BullQueue("ExpirationMonitor", connection);

async function handleSendMessage(job) {
  try {
    const { data } = job;

    const whatsapp = await Whatsapp.findByPk(data.whatsappId);

    if (whatsapp == null) {
      throw Error("WhatsApp no identificado");
    }

    const messageData: MessageData = data.data;

    await SendMessage(whatsapp, messageData);
  } catch (e: any) {
    Sentry.captureException(e);
    logger.error("MessageQueue -> SendMessage: error", e.message);
    throw e;
  }
}

{/*async function handleVerifyQueue(job) {
  logger.info("Buscando atenciones perdidas en las colas");
  try {
    const companies = await Company.findAll({
      attributes: ['id', 'name'],
      where: {
        status: true,
        dueDate: {
          [Op.gt]: Sequelize.literal('CURRENT_DATE')
        }
      },
      include: [
        {
          model: Whatsapp, attributes: ["id", "name", "status", "timeSendQueue", "sendIdQueue"], where: {
            timeSendQueue: {
              [Op.gt]: 0
            }
          }
        },
      ]
    }); */}

{/*    companies.map(async c => {
      c.whatsapps.map(async w => {

        if (w.status === "CONNECTED") {

          var companyId = c.id;

          const moveQueue = w.timeSendQueue ? w.timeSendQueue : 0;
          const moveQueueId = w.sendIdQueue;
          const moveQueueTime = moveQueue;
          const idQueue = moveQueueId;
          const timeQueue = moveQueueTime;

          if (moveQueue > 0) {

            if (!isNaN(idQueue) && Number.isInteger(idQueue) && !isNaN(timeQueue) && Number.isInteger(timeQueue)) {

              const tempoPassado = moment().subtract(timeQueue, "minutes").utc().format();
              // const tempoAgora = moment().utc().format();

              const { count, rows: tickets } = await Ticket.findAndCountAll({
                where: {
                  status: "pending",
                  queueId: null,
                  companyId: companyId,
                  whatsappId: w.id,
                  updatedAt: {
                    [Op.lt]: tempoPassado
                  }
                },
                include: [
                  {
                    model: Contact,
                    as: "contact",
                    attributes: ["id", "name", "number", "email", "profilePicUrl"],
                    include: ["extraInfo"]
                  }
                ]
              });

              if (count > 0) {
                tickets.map(async ticket => {
                  await ticket.update({
                    queueId: idQueue
                  });

                  await ticket.reload();

                  const io = getIO();
                  io.to(ticket.status)
                    .to("notification")
                    .to(ticket.id.toString())
                    .emit(`company-${companyId}-ticket`, {
                      action: "update",
                      ticket,
                      ticketId: ticket.id
                    });

                  // io.to("pending").emit(`company-${companyId}-ticket`, {
                  //   action: "update",
                  //   ticket,
                  // });

                  logger.info(`Atención perdida: ${ticket.id} - Empresa: ${companyId}`);
                });
              } else {
                logger.info(`Ninguna atención perdida encontrada - Empresa: ${companyId}`);
              }
            } else {
              logger.info(`Condición no respetada - Empresa: ${companyId}`);
            }
          }
        }
      });
    });
  } catch (e: any) {
    Sentry.captureException(e);
    logger.error("SearchForQueue -> VerifyQueue: error", e.message);
    throw e;
  }
}; */}

async function handleCloseTicketsAutomatic() {
  const job = new CronJob('*/1 * * * *', async () => {
    const companies = await Company.findAll();
    companies.map(async c => {

      try {
        const companyId = c.id;
        await ClosedAllOpenTickets(companyId);
      } catch (e: any) {
        Sentry.captureException(e);
        logger.error("ClosedAllOpenTickets -> Verify: error", e.message);
        throw e;
      }

    });
  });
  job.start()
}

async function handleVerifySchedules(job) {
  try {
    const { count, rows: schedules } = await Schedule.findAndCountAll({
      where: {
        status: "PENDENTE",
        sentAt: null,
        sendAt: {
          [Op.gte]: moment().format("YYYY-MM-DD HH:mm:ss"),
          [Op.lte]: moment().add("300", "seconds").format("YYYY-MM-DD HH:mm:ss")
        }
      },
      include: [{ model: Contact, as: "contact" }]
    });
    if (count > 0) {
      schedules.map(async schedule => {
        await schedule.update({
          status: "AGENDADA"
        });
        sendScheduledMessages.add(
          "SendMessage",
          { schedule },
          { delay: 40000 }
        );
        logger.info(`[🧵] Envío programado para: ${schedule.contact.name}`);
      });
    }
  } catch (e: any) {
    Sentry.captureException(e);
    logger.error("SendScheduledMessage -> Verify: error", e.message);
    throw e;
  }
}

async function handleSendScheduledMessage(job) {
  const {
    data: { schedule }
  } = job;
  let scheduleRecord: Schedule | null = null;

  try {
    scheduleRecord = await Schedule.findByPk(schedule.id);
  } catch (e) {
    Sentry.captureException(e);
    logger.info(`Error al intentar consultar programación: ${schedule.id}`);
  }

  try {
    const whatsapp = await GetDefaultWhatsApp(schedule.companyId);

    let filePath = null;
    if (schedule.mediaPath) {
      filePath = path.resolve("public", schedule.mediaPath);
    }

    await SendMessage(whatsapp, {
      number: schedule.contact.number,
      body: formatBody(schedule.body, schedule.contact),
      mediaPath: filePath
    });

    await scheduleRecord?.update({
      sentAt: moment().format("YYYY-MM-DD HH:mm"),
      status: "ENVIADA"
    });

    logger.info(`[🧵] Mensaje programado enviado a: ${schedule.contact.name}`);
    sendScheduledMessages.clean(15000, "completed");
  } catch (e: any) {
    Sentry.captureException(e);
    await scheduleRecord?.update({
      status: "ERRO"
    });
    logger.error("SendScheduledMessage -> SendMessage: error", e.message);
    throw e;
  }
}

async function handleVerifyCampaigns(job) {
  /**
   * @todo
   * Implementar filtro de campañas
   */

  logger.info("[🏁] - Verificando campañas...");

  const campaigns: { id: number; scheduledAt: string }[] =
    await sequelize.query(
      `select id, "scheduledAt" from "Campaigns" c
    where "scheduledAt" between now() and now() + '1 hour'::interval and status = 'PROGRAMADA'`,
      { type: QueryTypes.SELECT }
    );

  if (campaigns.length > 0)
    logger.info(`[🚩] - Campañas encontradas: ${campaigns.length}`);

  for (let campaign of campaigns) {
    try {
      const now = moment();
      const scheduledAt = moment(campaign.scheduledAt);
      const delay = scheduledAt.diff(now, "milliseconds");
      logger.info(
        `[📌] - Campaña enviada a la cola de procesamiento: Campaña=${campaign.id}, Delay Inicial=${delay}`
      );
      campaignQueue.add(
        "ProcessCampaign",
        {
          id: campaign.id,
          delay
        },
        {
          removeOnComplete: true
        }
      );
    } catch (err: any) {
      Sentry.captureException(err);
    }
  }

  logger.info("[🏁] - Finalizando verificación de campañas programadas...");
}

async function getCampaign(id) {
  return await Campaign.findByPk(id, {
    include: [
      {
        model: ContactList,
        as: "contactList",
        attributes: ["id", "name"],
        include: [
          {
            model: ContactListItem,
            as: "contacts",
            attributes: ["id", "name", "number", "email", "isWhatsappValid"],
            where: { isWhatsappValid: true }
          }
        ]
      },
      {
        model: Whatsapp,
        as: "whatsapp",
        attributes: ["id", "name"]
      },
      {
        model: CampaignShipping,
        as: "shipping",
        include: [{ model: ContactListItem, as: "contact" }]
      }
    ]
  });
}

async function getContact(id) {
  return await ContactListItem.findByPk(id, {
    attributes: ["id", "name", "number", "email"]
  });
}

async function getSettings(campaign) {
  const settings = await CampaignSetting.findAll({
    where: { companyId: campaign.companyId },
    attributes: ["key", "value"]
  });

  let messageInterval: number = 20;
  let longerIntervalAfter: number = 20;
  let greaterInterval: number = 60;
  let variables: any[] = [];

  settings.forEach(setting => {
    if (setting.key === "messageInterval") {
      messageInterval = JSON.parse(setting.value);
    }
    if (setting.key === "longerIntervalAfter") {
      longerIntervalAfter = JSON.parse(setting.value);
    }
    if (setting.key === "greaterInterval") {
      greaterInterval = JSON.parse(setting.value);
    }
    if (setting.key === "variables") {
      variables = JSON.parse(setting.value);
    }
  });

  return {
    messageInterval,
    longerIntervalAfter,
    greaterInterval,
    variables
  };
}

export function parseToMilliseconds(seconds) {
  return seconds * 1000;
}

async function sleep(seconds) {
  logger.info(
    `Sleep de ${seconds} segundos iniciado: ${moment().format("HH:mm:ss")}`
  );
  return new Promise(resolve => {
    setTimeout(() => {
      logger.info(
        `Sleep de ${seconds} segundos finalizado: ${moment().format(
          "HH:mm:ss"
        )}`
      );
      resolve(true);
    }, parseToMilliseconds(seconds));
  });
}

function getCampaignValidMessages(campaign) {
  const messages = [];

  if (!isEmpty(campaign.message1) && !isNil(campaign.message1)) {
    messages.push(campaign.message1);
  }

  if (!isEmpty(campaign.message2) && !isNil(campaign.message2)) {
    messages.push(campaign.message2);
  }

  if (!isEmpty(campaign.message3) && !isNil(campaign.message3)) {
    messages.push(campaign.message3);
  }

  if (!isEmpty(campaign.message4) && !isNil(campaign.message4)) {
    messages.push(campaign.message4);
  }

  if (!isEmpty(campaign.message5) && !isNil(campaign.message5)) {
    messages.push(campaign.message5);
  }

  return messages;
}

function getProcessedMessage(msg: string, variables: any[], contact: any) {
  let finalMessage = msg;

  if (finalMessage.includes("{nome}")) {
    finalMessage = finalMessage.replace(/{nome}/g, contact.name);
  }

  if (finalMessage.includes("{email}")) {
    finalMessage = finalMessage.replace(/{email}/g, contact.email);
  }

  if (finalMessage.includes("{numero}")) {
    finalMessage = finalMessage.replace(/{numero}/g, contact.number);
  }

  variables.forEach(variable => {
    if (finalMessage.includes(`{${variable.key}}`)) {
      const regex = new RegExp(`{${variable.key}}`, "g");
      finalMessage = finalMessage.replace(regex, variable.value);
    }
  });

  return finalMessage;
}

export function randomValue(min, max) {
  return Math.floor(Math.random() * max) + min;
}

async function verifyAndFinalizeCampaign(campaign) {

  logger.info("[🚨] - Verificando si el envío de campañas finalizó");
  const { contacts } = campaign.contactList;

  const count1 = contacts.length;
  const count2 = await CampaignShipping.count({
    where: {
      campaignId: campaign.id,
      deliveredAt: {
        [Op.not]: null
      }
    }
  });

  if (count1 === count2) {
    await campaign.update({ status: "FINALIZADA", completedAt: moment() });
  }

  const io = getIO();
  io.to(`company-${campaign.companyId}-mainchannel`).emit(`company-${campaign.companyId}-campaign`, {
    action: "update",
    record: campaign
  });

  logger.info("[🚨] - Fin de la verificación de finalización de campañas");
}

function calculateDelay(index, baseDelay, longerIntervalAfter, greaterInterval, messageInterval) {
  const diffSeconds = differenceInSeconds(baseDelay, new Date());
  if (index > longerIntervalAfter) {
    return diffSeconds * 1000 + greaterInterval
  } else {
    return diffSeconds * 1000 + messageInterval
  }
}

async function handleProcessCampaign(job) {
  logger.info("[🏁] - Inició el procesamiento de la campaña de ID: " + job.data.id);
  try {
    const { id }: ProcessCampaignData = job.data;
    const campaign = await getCampaign(id);
    const settings = await getSettings(campaign);
    if (campaign) {

      logger.info("[🚩] - Localizando y configurando la campaña");

      const { contacts } = campaign.contactList;
      if (isArray(contacts)) {

        logger.info("[📌] - Cantidad de contactos a enviar: " + contacts.length);

        const contactData = contacts.map(contact => ({
          contactId: contact.id,
          campaignId: campaign.id,
          variables: settings.variables,
        }));

        // const baseDelay = job.data.delay || 0;
        const longerIntervalAfter = parseToMilliseconds(settings.longerIntervalAfter);
        const greaterInterval = parseToMilliseconds(settings.greaterInterval);
        const messageInterval = settings.messageInterval;

        let baseDelay = campaign.scheduledAt;

        // Anti-ban: pause configuration
        const pauseAfterMessages = campaign.pauseAfterMessages || 0;
        const pauseDuration = campaign.pauseDuration || 0;

        const queuePromises = [];
        for (let i = 0; i < contactData.length; i++) {

          // Add random variation to delay (±30%) for anti-ban
          const baseInterval = i > longerIntervalAfter ? greaterInterval : messageInterval;
          const randomVariation = baseInterval * 0.3;
          const randomizedInterval = baseInterval + (Math.random() * randomVariation * 2 - randomVariation);

          // Add pause after X messages (anti-ban)
          let pauseExtra = 0;
          if (pauseAfterMessages > 0 && pauseDuration > 0 && i > 0 && i % pauseAfterMessages === 0) {
            pauseExtra = pauseDuration;
            logger.info(`[⏸️] - Pausa anti-ban de ${pauseDuration}s después de ${i} mensajes`);
          }

          baseDelay = addSeconds(baseDelay, Math.round(randomizedInterval) + pauseExtra);

          const { contactId, campaignId, variables } = contactData[i];
          const delay = calculateDelay(i, baseDelay, longerIntervalAfter, greaterInterval, messageInterval);
          const queuePromise = campaignQueue.add(
            "PrepareContact",
            { contactId, campaignId, variables, delay },
            { removeOnComplete: true }
          );
          queuePromises.push(queuePromise);
          logger.info("[🚀] - Cliente de ID: " + contactData[i].contactId + " de la campaña de ID: " + contactData[i].campaignId + " con delay: " + delay);
        }
        await Promise.all(queuePromises);
        await campaign.update({ status: "EM_ANDAMENTO" });
      }
    }
  } catch (err: any) {
    Sentry.captureException(err);
  }
}

async function handlePrepareContact(job) {

  logger.info("Preparando contactos");
  try {
    const { contactId, campaignId, delay, variables }: PrepareContactData =
      job.data;
    const campaign = await getCampaign(campaignId);
    const contact = await getContact(contactId);

    const campaignShipping: any = {};
    campaignShipping.number = contact.number;
    campaignShipping.contactId = contactId;
    campaignShipping.campaignId = campaignId;

    logger.info("[🏁] - Inició la preparación del contacto | contactoId: " + contactId + " CampañaID: " + campaignId);

    const messages = getCampaignValidMessages(campaign);
    if (messages.length) {
      const radomIndex = randomValue(0, messages.length);
      let message = getProcessedMessage(
        messages[radomIndex],
        variables,
        contact
      );

      // AI Message Variation (anti-ban)
      if (campaign.useAIVariation && campaign.aiPromptId) {
        try {
          logger.info("[🤖] - Generando variación IA para contacto: " + contact.name);
          message = await generateMessageVariation({
            baseMessage: message,
            contactName: contact.name,
            promptId: campaign.aiPromptId
          });
        } catch (aiError: any) {
          logger.error("[🤖] - Error en variación IA, usando mensaje original: " + aiError.message);
        }
      }

      campaignShipping.message = `\u200c ${message}`;
    }

    const [record, created] = await CampaignShipping.findOrCreate({
      where: {
        campaignId: campaignShipping.campaignId,
        contactId: campaignShipping.contactId
      },
      defaults: campaignShipping
    });

    logger.info("[🚩] - Registro de envío de campaña para contacto creado | contactoId: " + contactId + " CampañaID: " + campaignId);

    if (
      !created &&
      record.deliveredAt === null
    ) {
      record.set(campaignShipping);
      await record.save();
    }

    if (
      record.deliveredAt === null
    ) {
      const nextJob = await campaignQueue.add(
        "DispatchCampaign",
        {
          campaignId: campaign.id,
          campaignShippingId: record.id,
          contactListItemId: contactId
        },
        {
          delay
        }
      );

      await record.update({ jobId: nextJob.id });
    }

    await verifyAndFinalizeCampaign(campaign);
    logger.info("[🏁] - Finalizada la preparación del contacto | contactoId: " + contactId + " CampañaID: " + campaignId);
  } catch (err: any) {
    Sentry.captureException(err);
    logger.error(`campaignQueue -> PrepareContact -> error: ${err.message}`);
  }
}

async function handleDispatchCampaign(job) {
  try {
    const { data } = job;
    const { campaignShippingId, campaignId }: DispatchCampaignData = data;
    const campaign = await getCampaign(campaignId);

    logger.info("[🏁] - Disparando campaña | CampaignShippingId: " + campaignShippingId + " CampañaID: " + campaignId);

    // Check business hours restriction
    if (campaign.sendOnlyBusinessHours) {
      const currentHour = moment().hour();
      if (currentHour < 8 || currentHour >= 20) {
        // Re-queue for next business hour
        const nextBusinessHour = currentHour >= 20
          ? moment().add(1, 'day').hour(8).minute(0).second(0)
          : moment().hour(8).minute(0).second(0);
        const rescheduleDelay = nextBusinessHour.diff(moment(), 'milliseconds');

        logger.info(`[⏰] - Fuera de horario laboral, reprogramando para ${nextBusinessHour.format("HH:mm")}`);

        await campaignQueue.add(
          "DispatchCampaign",
          { campaignId, campaignShippingId, contactListItemId: data.contactListItemId },
          { delay: rescheduleDelay }
        );
        return;
      }
    }

    const campaignShipping = await CampaignShipping.findByPk(
      campaignShippingId,
      {
        include: [{ model: ContactListItem, as: "contact" }]
      }
    );

    let body = campaignShipping.message;

    // ========== ULTRAMSG DISPATCH ==========
    if (campaign.sendVia === "ultramsg") {
      logger.info("[📡] - Enviando vía UltraMsg | CampaignShippingId: " + campaignShippingId);

      const ultraMsgConfig = await UltraMsgConfig.findOne({
        where: { companyId: campaign.companyId, isActive: true }
      });

      if (!ultraMsgConfig) {
        logger.error(`campaignQueue -> DispatchCampaign -> error: UltraMsg config not found or inactive`);
        return;
      }

      const credentials = {
        instanceId: ultraMsgConfig.instanceId,
        token: ultraMsgConfig.token
      };

      try {
        // Send files if fileListId exists
        if (!isNil(campaign.fileListId)) {
          try {
            const files = await ShowFileService(campaign.fileListId, campaign.companyId);
            const publicFolder = path.resolve(__dirname, "..", "public");
            const folder = path.resolve(publicFolder, "fileList", String(files.id));

            for (const file of files.options) {
              const filePath = path.resolve(folder, file.path);
              const ext = path.extname(file.path).toLowerCase();

              if ([".jpg", ".jpeg", ".png", ".gif", ".webp"].includes(ext)) {
                await sendImage(credentials, {
                  to: campaignShipping.number,
                  caption: file.name,
                  mediaUrl: `${process.env.BACKEND_URL}/public/fileList/${files.id}/${file.path}`
                });
              } else if ([".mp4", ".avi", ".mov"].includes(ext)) {
                await sendVideo(credentials, {
                  to: campaignShipping.number,
                  caption: file.name,
                  mediaUrl: `${process.env.BACKEND_URL}/public/fileList/${files.id}/${file.path}`
                });
              } else {
                await sendDocument(credentials, {
                  to: campaignShipping.number,
                  filename: file.name,
                  mediaUrl: `${process.env.BACKEND_URL}/public/fileList/${files.id}/${file.path}`
                });
              }

              logger.info("[📡] - UltraMsg envió archivo: " + file.name);
            }
          } catch (error) {
            logger.error("[📡] - Error enviando archivos via UltraMsg: " + error);
          }
        }

        // Send media if exists
        if (campaign.mediaPath) {
          const ext = path.extname(campaign.mediaPath).toLowerCase();
          const mediaUrl = `${process.env.BACKEND_URL}/public/${campaign.mediaPath}`;

          if ([".jpg", ".jpeg", ".png", ".gif", ".webp"].includes(ext)) {
            await sendImage(credentials, {
              to: campaignShipping.number,
              caption: body,
              mediaUrl
            });
          } else if ([".mp4", ".avi", ".mov"].includes(ext)) {
            await sendVideo(credentials, {
              to: campaignShipping.number,
              caption: body,
              mediaUrl
            });
          } else {
            await sendDocument(credentials, {
              to: campaignShipping.number,
              filename: campaign.mediaName,
              caption: body,
              mediaUrl
            });
          }
        } else {
          // Send text message
          await sendTextMessage(credentials, {
            to: campaignShipping.number,
            body
          });
        }

        logger.info("[📡] - UltraMsg mensaje enviado a: " + campaignShipping.number);
      } catch (ultraError: any) {
        logger.error(`[📡] - UltraMsg error: ${ultraError.message}`);
        throw ultraError;
      }

    // ========== BAILEYS DISPATCH (original) ==========
    } else {
      const wbot = await GetWhatsappWbot(campaign.whatsapp);

      if (!wbot) {
        logger.error(`campaignQueue -> DispatchCampaign -> error: wbot not found`);
        return;
      }

      if (!campaign.whatsapp) {
        logger.error(`campaignQueue -> DispatchCampaign -> error: whatsapp not found`);
        return;
      }

      if (!wbot?.user?.id) {
        logger.error(`campaignQueue -> DispatchCampaign -> error: wbot user not found`);
        return;
      }

      logger.info("[🚩] - Disparando campaña vía Baileys | CampaignShippingId: " + campaignShippingId + " CampañaID: " + campaignId);

      const chatId = `${campaignShipping.number}@s.whatsapp.net`;

      if (!isNil(campaign.fileListId)) {
        logger.info("[🚩] - Recuperando la lista de archivos | CampaignShippingId: " + campaignShippingId + " CampañaID: " + campaignId);

        try {
          const publicFolder = path.resolve(__dirname, "..", "public");
          const files = await ShowFileService(campaign.fileListId, campaign.companyId)
          const folder = path.resolve(publicFolder, "fileList", String(files.id))
          for (const [index, file] of files.options.entries()) {
            const options = await getMessageOptions(file.path, path.resolve(folder, file.path), file.name);
            await wbot.sendMessage(chatId, { ...options });

            logger.info("[🚩] - Envió archivo: "+ file.name +" | CampaignShippingId: " + campaignShippingId + " CampañaID: " + campaignId);
          };
        } catch (error) {
          logger.info(error);
        }
      }

      if (campaign.mediaPath) {
        logger.info("[🚩] - Preparando media de la campaña: "+ campaign.mediaPath +" | CampaignShippingId: " + campaignShippingId + " CampañaID: " + campaignId);

        const publicFolder = path.resolve(__dirname, "..", "public");
        const filePath = path.join(publicFolder, campaign.mediaPath);

        const options = await getMessageOptions(campaign.mediaName, filePath, body);
        if (Object.keys(options).length) {
          await wbot.sendMessage(chatId, { ...options });
        }
      } else {
        logger.info("[🚩] - Enviando mensaje de texto de la campaña | CampaignShippingId: " + campaignShippingId + " CampañaID: " + campaignId);

        await wbot.sendMessage(chatId, {
          text: body
        });
      }
    }

    logger.info("[🚩] - Actualizando campaña a enviada... | CampaignShippingId: " + campaignShippingId + " CampañaID: " + campaignId);

    await campaignShipping.update({ deliveredAt: moment() });

    await verifyAndFinalizeCampaign(campaign);

    const io = getIO();
    io.to(`company-${campaign.companyId}-mainchannel`).emit(`company-${campaign.companyId}-campaign`, {
      action: "update",
      record: campaign
    });

    logger.info(
      `[🏁] - Campaña enviada a: Campaña=${campaignId};Contacto=${campaignShipping.contact.name}`
    );

  } catch (err: any) {
    Sentry.captureException(err);
    logger.error(err.message);
    console.log(err.stack);
  }
}

// ========== EMAIL CAMPAIGN HANDLERS ==========

async function handleProcessEmailCampaign(job) {
  try {
    const { campaignId, companyId } = job.data;

    logger.info(`[📧] - Procesando campana de email ID: ${campaignId}`);

    const campaign = await EmailCampaign.findByPk(campaignId, {
      include: [
        {
          model: ContactList,
          include: [{ model: ContactListItem, as: "contacts" }]
        }
      ]
    });

    if (!campaign || campaign.status === "CANCELLED") {
      logger.info(`[📧] - Campana ${campaignId} no encontrada o cancelada`);
      return;
    }

    const emailConfig = await EmailConfig.findOne({
      where: { companyId, isActive: true }
    });

    if (!emailConfig) {
      logger.error(`[📧] - No hay configuracion de email activa para empresa ${companyId}`);
      await campaign.update({ status: "CANCELLED" });
      return;
    }

    const contacts = campaign.contactList?.contacts?.filter(
      c => c.email && c.email.trim() !== ""
    ) || [];

    if (contacts.length === 0) {
      logger.warn(`[📧] - No hay contactos con email en campana ${campaignId}`);
      await campaign.update({ status: "COMPLETED", completedAt: moment().toDate() });
      return;
    }

    logger.info(`[📧] - ${contacts.length} contactos con email encontrados`);

    // Create shipping records for each contact
    for (const contact of contacts) {
      await EmailCampaignShipping.findOrCreate({
        where: {
          emailCampaignId: campaign.id,
          contactEmail: contact.email
        },
        defaults: {
          emailCampaignId: campaign.id,
          contactEmail: contact.email,
          contactName: contact.name || "",
          subject: campaign.subject,
          body: campaign.htmlBody || campaign.textBody || "",
          status: "PENDING"
        }
      });
    }

    // Process in batches
    const batchSize = campaign.batchSize || 50;
    const delayBetweenBatches = (campaign.delayBetweenBatches || 60) * 1000;

    const pendingShippings = await EmailCampaignShipping.findAll({
      where: { emailCampaignId: campaign.id, status: "PENDING" }
    });

    const batches = [];
    for (let i = 0; i < pendingShippings.length; i += batchSize) {
      batches.push(pendingShippings.slice(i, i + batchSize));
    }

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      const delay = batchIndex * delayBetweenBatches;

      emailCampaignQueue.add(
        "DispatchEmailBatch",
        {
          campaignId: campaign.id,
          companyId,
          shippingIds: batch.map(s => s.id),
          batchNumber: batchIndex + 1,
          totalBatches: batches.length
        },
        { removeOnComplete: true, delay }
      );

      logger.info(`[📧] - Lote ${batchIndex + 1}/${batches.length} programado con delay ${delay}ms`);
    }
  } catch (err: any) {
    Sentry.captureException(err);
    logger.error(`[📧] - Error procesando campana de email: ${err.message}`);
  }
}

async function handleDispatchEmailBatch(job) {
  try {
    const { campaignId, companyId, shippingIds, batchNumber, totalBatches } = job.data;

    logger.info(`[📧] - Enviando lote ${batchNumber}/${totalBatches} de campana ${campaignId}`);

    const campaign = await EmailCampaign.findByPk(campaignId);
    if (!campaign || campaign.status === "CANCELLED") {
      logger.info(`[📧] - Campana ${campaignId} cancelada, omitiendo lote`);
      return;
    }

    const emailConfig = await EmailConfig.findOne({
      where: { companyId, isActive: true }
    });

    if (!emailConfig) {
      logger.error(`[📧] - Config de email no encontrada para empresa ${companyId}`);
      return;
    }

    const shippings = await EmailCampaignShipping.findAll({
      where: { id: { [Op.in]: shippingIds }, status: "PENDING" }
    });

    let sentCount = 0;
    let failedCount = 0;

    for (const shipping of shippings) {
      // Check if campaign was cancelled mid-batch
      const freshCampaign = await EmailCampaign.findByPk(campaignId);
      if (freshCampaign?.status === "CANCELLED") {
        logger.info(`[📧] - Campana cancelada durante envio, deteniendo lote`);
        break;
      }

      try {
        let emailSubject = shipping.subject;
        let emailBody = shipping.body;

        // AI variation per contact
        if (campaign.useAIVariation && campaign.aiPromptId) {
          try {
            logger.info(`[🤖📧] - Generando variacion IA para: ${shipping.contactName}`);
            const variation = await generateEmailVariation({
              baseSubject: emailSubject,
              baseBody: emailBody,
              contactName: shipping.contactName || "Estimado/a",
              contactEmail: shipping.contactEmail,
              promptId: campaign.aiPromptId
            });
            emailSubject = variation.subject;
            emailBody = variation.body;
          } catch (aiError: any) {
            logger.error(`[🤖📧] - Error IA, usando original: ${aiError.message}`);
          }
        }

        // Send via Resend API
        const result = await sendEmail(
          { apiKey: emailConfig.apiKey },
          {
            from: `${emailConfig.fromName} <${emailConfig.fromEmail}>`,
            to: shipping.contactEmail,
            subject: emailSubject,
            html: emailBody,
            replyTo: emailConfig.replyTo || undefined,
            tags: [
              { name: "campaign_id", value: String(campaignId) },
              { name: "shipping_id", value: String(shipping.id) }
            ]
          }
        );

        await shipping.update({
          status: "SENT",
          sentAt: new Date(),
          resendEmailId: result.id,
          subject: emailSubject,
          body: emailBody
        });

        sentCount++;
        logger.info(`[📧] - Email enviado a: ${shipping.contactEmail} (ID: ${result.id})`);

        // Rate limit: Resend allows 2 req/sec, wait 600ms between sends
        await new Promise(resolve => setTimeout(resolve, 600));

      } catch (sendError: any) {
        failedCount++;
        await shipping.update({
          status: "FAILED",
          errorMessage: sendError.message
        });
        logger.error(`[📧] - Error enviando a ${shipping.contactEmail}: ${sendError.message}`);
      }
    }

    // Update campaign counters
    await campaign.reload();
    await campaign.update({
      totalSent: (campaign.totalSent || 0) + sentCount,
      totalFailed: (campaign.totalFailed || 0) + failedCount
    });

    logger.info(`[📧] - Lote ${batchNumber} completado: ${sentCount} enviados, ${failedCount} fallidos`);

    // Check if all batches done
    if (batchNumber === totalBatches) {
      const pendingCount = await EmailCampaignShipping.count({
        where: { emailCampaignId: campaignId, status: "PENDING" }
      });

      if (pendingCount === 0) {
        await campaign.update({
          status: "COMPLETED",
          completedAt: new Date()
        });
        logger.info(`[📧] - Campana ${campaignId} completada`);
      }
    }

    // Emit socket update
    const io = getIO();
    io.to(`company-${companyId}-mainchannel`).emit(`company-${companyId}-email-campaign`, {
      action: "update",
      record: campaign
    });

  } catch (err: any) {
    Sentry.captureException(err);
    logger.error(`[📧] - Error en dispatch de lote: ${err.message}`);
  }
}

async function handleVerifyEmailCampaigns(job) {
  try {
    const campaigns: { id: number; scheduledAt: string; companyId: number }[] =
      await sequelize.query(
        `SELECT id, "scheduledAt", "companyId" FROM "EmailCampaigns"
         WHERE "scheduledAt" BETWEEN now() AND now() + '1 hour'::interval
         AND status = 'SCHEDULED'`,
        { type: QueryTypes.SELECT }
      );

    if (campaigns.length > 0) {
      logger.info(`[📧] - Campanas de email programadas encontradas: ${campaigns.length}`);
    }

    for (const campaign of campaigns) {
      const delay = Math.max(0, moment(campaign.scheduledAt).diff(moment(), "milliseconds"));

      emailCampaignQueue.add(
        "ProcessEmailCampaign",
        { campaignId: campaign.id, companyId: campaign.companyId },
        { removeOnComplete: true, delay }
      );

      logger.info(`[📧] - Campana de email ${campaign.id} programada con delay ${delay}ms`);
    }
  } catch (err: any) {
    Sentry.captureException(err);
    logger.error(`[📧] - Error verificando campanas de email: ${err.message}`);
  }
}

async function handleLoginStatus(job) {
  const users: { id: number }[] = await sequelize.query(
    `select id from "Users" where "updatedAt" < now() - '5 minutes'::interval and online = true`,
    { type: QueryTypes.SELECT }
  );
  for (let item of users) {
    try {
      const user = await User.findByPk(item.id);
      await user.update({ online: false });
      logger.info(`Usuario pasado a offline: ${item.id}`);
    } catch (e: any) {
      Sentry.captureException(e);
    }
  }
}


async function handleInvoiceCreate() {
  logger.info("Iniciando generación de facturas");
  const job = new CronJob('*/5 * * * * *', async () => {


    const companies = await Company.findAll();
    companies.map(async c => {
      var dueDate = c.dueDate;
      const date = moment(dueDate).format();
      const timestamp = moment().format();
      const hoje = moment(moment()).format("DD/MM/yyyy");
      var vencimento = moment(dueDate).format("DD/MM/yyyy");

      var diff = moment(vencimento, "DD/MM/yyyy").diff(moment(hoje, "DD/MM/yyyy"));
      var dias = moment.duration(diff).asDays();

      if (dias < 20) {
        const plan = await Plan.findByPk(c.planId);

        const sql = `SELECT COUNT(*) mycount FROM "Invoices" WHERE "companyId" = ${c.id} AND "dueDate"::text LIKE '${moment(dueDate).format("yyyy-MM-DD")}%';`
        const invoice = await sequelize.query(sql,
          { type: QueryTypes.SELECT }
        );
        if (invoice[0]['mycount'] > 0) {

        } else {
          const sql = `INSERT INTO "Invoices" (detail, status, value, "updatedAt", "createdAt", "dueDate", "companyId")
          VALUES ('${plan.name}', 'open', '${plan.value}', '${timestamp}', '${timestamp}', '${date}', ${c.id});`

          const invoiceInsert = await sequelize.query(sql,
            { type: QueryTypes.INSERT }
          );

          /*           let transporter = nodemailer.createTransport({
                      service: 'gmail',
                      auth: {
                        user: 'email@gmail.com',
                        pass: 'senha'
                      }
                    });

                    const mailOptions = {
                      from: 'heenriquega@gmail.com', // sender address
                      to: `${c.email}`, // receiver (use array of string for a list)
                      subject: 'Factura generada - Sistema', // Subject line
                      html: `Hola ${c.name}, este es un email sobre su factura!<br>
          <br>
          Vencimiento: ${vencimento}<br>
          Valor: ${plan.value}<br>
          Link: ${process.env.FRONTEND_URL}/financeiro<br>
          <br>
          ¡Cualquier duda estamos a su disposición!
                      `// plain text body
                    };

                    transporter.sendMail(mailOptions, (err, info) => {
                      if (err)
                        console.log(err)
                      else
                        console.log(info);
                    }); */

        }





      }

    });
  });
  job.start()
}

handleCloseTicketsAutomatic()

handleInvoiceCreate()

async function handleCheckExpirations(job) {
  try {
    if (!process.env.RESEND_API_KEY) return;

    const companies = await Company.findAll({
      where: {
        dueDate: { [Op.ne]: null },
        email: { [Op.ne]: null }
      }
    });

    const today = moment().startOf("day");

    for (const company of companies) {
      const due = moment(company.dueDate).startOf("day");
      const daysRemaining = due.diff(today, "days");

      // Send warning at 7, 3, and 1 days before expiration
      if ([7, 3, 1].includes(daysRemaining)) {
        sendExpirationWarningEmail(
          {
            name: company.name,
            email: company.email,
            dueDate: due.format("DD/MM/YYYY")
          },
          daysRemaining
        ).catch(() => {});
      }

      // Send expired email on the day of expiration
      if (daysRemaining === 0) {
        sendAccountExpiredEmail({
          name: company.name,
          email: company.email
        }).catch(() => {});
      }
    }
  } catch (err: any) {
    logger.error("handleCheckExpirations error:", err.message);
  }
}

export async function startQueueProcess() {

  logger.info("[🏁] - Iniciando procesamiento de colas");

  messageQueue.process("SendMessage", handleSendMessage);

  scheduleMonitor.process("Verify", handleVerifySchedules);

  sendScheduledMessages.process("SendMessage", handleSendScheduledMessage);

  userMonitor.process("VerifyLoginStatus", handleLoginStatus);


  campaignQueue.process("VerifyCampaigns", 1, handleVerifyCampaigns);

  campaignQueue.process("ProcessCampaign", 1, handleProcessCampaign);

  campaignQueue.process("PrepareContact", 1, handlePrepareContact);

  campaignQueue.process("DispatchCampaign", 1, handleDispatchCampaign);

  // Email campaign queue processors
  emailCampaignQueue.process("ProcessEmailCampaign", 1, handleProcessEmailCampaign);
  emailCampaignQueue.process("DispatchEmailBatch", 1, handleDispatchEmailBatch);
  emailCampaignQueue.process("VerifyEmailCampaigns", 1, handleVerifyEmailCampaigns);

  // Expiration warning email processor
  expirationMonitor.process("CheckExpirations", handleCheckExpirations);

  //queueMonitor.process("VerifyQueueStatus", handleVerifyQueue);

  async function cleanupCampaignQueue() {
    try {
      await campaignQueue.clean(12 * 3600 * 1000, 'completed');
      await campaignQueue.clean(24 * 3600 * 1000, 'failed');

      const jobs = await campaignQueue.getJobs(['waiting', 'active']);
      for (const job of jobs) {
        if (Date.now() - job.timestamp > 24 * 3600 * 1000) {
          await job.remove();
        }
      }
    } catch (error) {
      logger.error('[🚨] - Error en la limpieza de la cola de campañas:', error);
    }
  }
  setInterval(cleanupCampaignQueue, 6 * 3600 * 1000);

  setInterval(async () => {
    const jobCounts = await campaignQueue.getJobCounts();
    const memoryUsage = process.memoryUsage();

    logger.info('[📌] - Estado de la cola de campañas:', {
      jobs: jobCounts,
      memory: {
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + 'MB',
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + 'MB'
      }
    });
  }, 5 * 60 * 1000);

  campaignQueue.on('completed', (job) => {
    logger.info(`[📌] -   Campaña ${job.id} completada en ${Date.now() - job.timestamp}ms`);
  });

  scheduleMonitor.add(
    "Verify",
    {},
    {
      repeat: { cron: "*/5 * * * * *", key: "verify" },
      removeOnComplete: true
    }
  );

  campaignQueue.add(
    "VerifyCampaigns",
    {},
    {
      repeat: { cron: "*/20 * * * * *", key: "verify-campaing" },
      removeOnComplete: true
    }
  );

  emailCampaignQueue.add(
    "VerifyEmailCampaigns",
    {},
    {
      repeat: { cron: "*/30 * * * * *", key: "verify-email-campaigns" },
      removeOnComplete: true
    }
  );

  userMonitor.add(
    "VerifyLoginStatus",
    {},
    {
      repeat: { cron: "* * * * *", key: "verify-login" },
      removeOnComplete: true
    }
  );

  queueMonitor.add(
    "VerifyQueueStatus",
    {},
    {
      repeat: { cron: "*/20 * * * * *" },
      removeOnComplete: true
    }
  );

  // Check expirations daily at 9:00 AM
  expirationMonitor.add(
    "CheckExpirations",
    {},
    {
      repeat: { cron: "0 9 * * *", key: "check-expirations" },
      removeOnComplete: true
    }
  );
}
