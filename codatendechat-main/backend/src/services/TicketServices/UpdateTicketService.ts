import moment from "moment";
import * as Sentry from "@sentry/node";
import CheckContactOpenTickets from "../../helpers/CheckContactOpenTickets";
import SetTicketMessagesAsRead from "../../helpers/SetTicketMessagesAsRead";
import { getIO } from "../../libs/socket";
import Ticket from "../../models/Ticket";
import Setting from "../../models/Setting";
import Queue from "../../models/Queue";
import ShowTicketService from "./ShowTicketService";
import ShowWhatsAppService from "../WhatsappService/ShowWhatsAppService";
import SendWhatsAppMessage from "../WbotServices/SendWhatsAppMessage";
import FindOrCreateATicketTrakingService from "./FindOrCreateATicketTrakingService";
import GetTicketWbot from "../../helpers/GetTicketWbot";
import { verifyMessage } from "../WbotServices/wbotMessageListener";
import ListSettingsServiceOne from "../SettingServices/ListSettingsServiceOne"; //NOVO PLW DESIGN//
import ShowUserService from "../UserServices/ShowUserService"; //NOVO PLW DESIGN//
import { isNil } from "lodash";
import Whatsapp from "../../models/Whatsapp";
import { Op } from "sequelize";
import AppError from "../../errors/AppError";
import Company from "../../models/Company";

interface TicketData {
  status?: string;
  userId?: number | null;
  queueId?: number | null;
  chatbot?: boolean;
  queueOptionId?: number;
  whatsappId?: string;
  useIntegration?: boolean;
  integrationId?: number | null;
  promptId?: number | null;
}

interface Request {
  ticketData: TicketData;
  ticketId: string | number;
  companyId: number;
  actionUserId?: string | null;
}

interface Response {
  ticket: Ticket;
  oldStatus: string;
  oldUserId: number | undefined;
}

const UpdateTicketService = async ({
  ticketData,
  ticketId,
  companyId,
  actionUserId = null
}: Request): Promise<Response> => {

  try {
    const { status } = ticketData;
    let { queueId, userId, whatsappId } = ticketData;
    let chatbot: boolean | null = ticketData.chatbot || false;
    let queueOptionId: number | null = ticketData.queueOptionId || null;
    let promptId: number | null = ticketData.promptId || null;
    let useIntegration: boolean | null = ticketData.useIntegration || false;
    let integrationId: number | null = ticketData.integrationId || null;

    const io = getIO();

    const key = "userRating";
    const setting = await Setting.findOne({
      where: {
        companyId,
        key
      }
    });

    const ticket = await ShowTicketService(ticketId, companyId);
    const ticketTraking = await FindOrCreateATicketTrakingService({
      ticketId,
      companyId,
      whatsappId: ticket.whatsappId
    });

    if (isNil(whatsappId)) {
      whatsappId = ticket.whatsappId.toString();
    }

    await SetTicketMessagesAsRead(ticket);

    const oldStatus = ticket.status;
    const oldUserId = ticket.user?.id;
    const oldQueueId = ticket.queueId;

    if (oldStatus === "closed" || Number(whatsappId) !== ticket.whatsappId) {
      // let otherTicket = await Ticket.findOne({
      //   where: {
      //     contactId: ticket.contactId,
      //     status: { [Op.or]: ["open", "pending", "group"] },
      //     whatsappId
      //   }
      // });
      // if (otherTicket) {
      //     otherTicket = await ShowTicketService(otherTicket.id, companyId)

      //     await ticket.update({status: "closed"})

      //     io.to(oldStatus).emit(`company-${companyId}-ticket`, {
      //       action: "delete",
      //       ticketId: ticket.id
      //     });

      //     return { ticket: otherTicket, oldStatus, oldUserId }
      // }
      await CheckContactOpenTickets(ticket.contact.id, whatsappId);
      chatbot = null;
      queueOptionId = null;
    }

    if (status !== undefined && ["closed"].indexOf(status) > -1) {
      const { complationMessage, ratingMessage } = await ShowWhatsAppService(
        ticket.whatsappId,
        companyId
      );

      if (setting?.value === "enabled") {
        if (ticketTraking.ratingAt == null) {
          const ratingTxt = ratingMessage || "";
          let bodyRatingMessage = `\u200e${ratingTxt}\n\n`;
          bodyRatingMessage +=
            "Escriba del 1 al 3 para calificar nuestra atención:\n*1* - _Insatisfecho_\n*2* - _Satisfecho_\n*3* - _Muy Satisfecho_\n\n";
          await SendWhatsAppMessage({ body: bodyRatingMessage, ticket });

          await ticketTraking.update({
            ratingAt: moment().toDate(),
            userId: actionUserId
          });

          io.to(`company-${ticket.companyId}-open`)
            .to(`queue-${ticket.queueId}-open`)
            .to(ticketId.toString())
            .emit(`company-${ticket.companyId}-ticket`, {
              action: "delete",
              ticketId: ticket.id
            });

          return { ticket, oldStatus, oldUserId };
        }
        ticketTraking.ratingAt = moment().toDate();
        ticketTraking.rated = false;
      }

      if (!isNil(complationMessage) && complationMessage !== "") {
        const body = `\u200e${complationMessage}`;
        await SendWhatsAppMessage({ body, ticket });
      }
      await ticket.update({
        promptId: null,
        integrationId: null,
        useIntegration: false,
        typebotStatus: false,
        typebotSessionId: null
      })

      ticketTraking.finishedAt = moment().toDate();
      ticketTraking.whatsappId = ticket.whatsappId;
      ticketTraking.userId = ticket.userId;

      /*    queueId = null;
            userId = null; */
    }

    if (queueId !== undefined && queueId !== null) {
      ticketTraking.queuedAt = moment().toDate();
    }

    const settingsTransfTicket = await ListSettingsServiceOne({ companyId: companyId, key: "sendMsgTransfTicket" });

    if (settingsTransfTicket?.value === "enabled") {
      // Mensaje de transferencia de la COLA
      if (oldQueueId !== queueId && oldUserId === userId && !isNil(oldQueueId) && !isNil(queueId)) {

        const {language} = await Company.findByPk(companyId);
        const queue = await Queue.findByPk(queueId);
        const wbot = await GetTicketWbot(ticket);

        const translatedMessage = {
          'pt': "*Mensaje automático*:\nFue transferido al departamento *" + queue?.name + "*\naguarde, ¡ya lo vamos a atender!",
          'en': "*Automatic message*:\nYou have been transferred to the *" + queue?.name + "* department\nplease wait, we'll assist you soon!",
          'es': "*Mensaje automático*:\nFue transferido al departamento *" + queue?.name + "*\naguarde, ¡ya lo vamos a atender!"
        }

        const queueChangedMessage = await wbot.sendMessage(
          `${ticket.contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`,
          {
            text: translatedMessage[language]
          }
        );
        await verifyMessage(queueChangedMessage, ticket, ticket.contact);
      }
      else
        // Mensaje de transferencia del AGENTE
        if (oldUserId !== userId && oldQueueId === queueId && !isNil(oldUserId) && !isNil(userId)) {

          const {language} = await Company.findByPk(companyId);
          const wbot = await GetTicketWbot(ticket);
          const nome = await ShowUserService(ticketData.userId);

          const translatedMessage = {
              'pt': "*Mensaje automático*:\nFue transferido al agente *" + nome.name + "*\naguarde, ¡ya lo vamos a atender!",
              'en': "*Automatic message*:\nYou have been transferred to agent *" + nome.name + "*\nplease wait, we'll assist you soon!",
              'es': "*Mensaje automático*:\nFue transferido al agente *" + nome.name + "*\naguarde, ¡ya lo vamos a atender!"
          }

          const queueChangedMessage = await wbot.sendMessage(
            `${ticket.contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`,
            {
              text: translatedMessage[language]
            }
          );
          await verifyMessage(queueChangedMessage, ticket, ticket.contact);
        }
        else
          // Mensaje de transferencia del AGENTE y de la COLA
          if (oldUserId !== userId && !isNil(oldUserId) && !isNil(userId) && oldQueueId !== queueId && !isNil(oldQueueId) && !isNil(queueId)) {

            const {language} = await Company.findByPk(companyId);
            const wbot = await GetTicketWbot(ticket);
            const queue = await Queue.findByPk(queueId);
            const nome = await ShowUserService(ticketData.userId);

            const translatedMessage = {
              'pt': "*Mensaje automático*:\nFue transferido al departamento *" + queue?.name + "* y contará con la asistencia de *" + nome.name + "*\naguarde, ¡ya lo vamos a atender!",
              'en': "*Automatic message*:\nYou have been transferred to the *" + queue?.name + "* department and will be assisted by *" + nome.name + "*\nplease wait, we'll assist you soon!",
              'es': "*Mensaje automático*:\nFue transferido al departamento *" + queue?.name + "* y contará con la asistencia de *" + nome.name + "*\naguarde, ¡ya lo vamos a atender!"
            }

            const queueChangedMessage = await wbot.sendMessage(
              `${ticket.contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`,
              {
                text: translatedMessage[language]
              }
            );
            await verifyMessage(queueChangedMessage, ticket, ticket.contact);
          } else
            if (oldUserId !== undefined && isNil(userId) && oldQueueId !== queueId && !isNil(queueId)) {

              const {language} = await Company.findByPk(companyId);
              const queue = await Queue.findByPk(queueId);
              const wbot = await GetTicketWbot(ticket);

              const translatedMessage = {
                'pt': "*Mensaje automático*:\nFue transferido al departamento *" + queue?.name + "*\naguarde, ¡ya lo vamos a atender!",
                'en': "*Automatic message*:\nYou have been transferred to the *" + queue?.name + "* department\nplease wait, we'll assist you soon!",
                'es': "*Mensaje automático*:\nFue transferido al departamento *" + queue?.name + "*\naguarde, ¡ya lo vamos a atender!"
              }

              const queueChangedMessage = await wbot.sendMessage(
                `${ticket.contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`,
                {
                  text: translatedMessage[language]
                }
              );
              await verifyMessage(queueChangedMessage, ticket, ticket.contact);
            }
    }

    await ticket.update({
      status,
      queueId,
      userId,
      whatsappId,
      chatbot,
      queueOptionId
    });

    await ticket.reload();

    if (status !== undefined && ["pending"].indexOf(status) > -1) {
      ticketTraking.update({
        whatsappId,
        queuedAt: moment().toDate(),
        startedAt: null,
        userId: null
      });
    }

    if (status !== undefined && ["open"].indexOf(status) > -1) {
      ticketTraking.update({
        startedAt: moment().toDate(),
        ratingAt: null,
        rated: false,
        whatsappId,
        userId: ticket.userId
      });
    }

    await ticketTraking.save();

    if (ticket.status !== oldStatus || ticket.user?.id !== oldUserId) {

      io.to(`company-${companyId}-${oldStatus}`)
        .to(`queue-${ticket.queueId}-${oldStatus}`)
        .to(`user-${oldUserId}`)
        .emit(`company-${companyId}-ticket`, {
          action: "delete",
          ticketId: ticket.id
        });
    }

    io.to(`company-${companyId}-${ticket.status}`)
      .to(`company-${companyId}-notification`)
      .to(`queue-${ticket.queueId}-${ticket.status}`)
      .to(`queue-${ticket.queueId}-notification`)
      .to(ticketId.toString())
      .to(`user-${ticket?.userId}`)
      .to(`user-${oldUserId}`)
      .emit(`company-${companyId}-ticket`, {
        action: "update",
        ticket
      });

    return { ticket, oldStatus, oldUserId };
  } catch (err) {
    Sentry.captureException(err);
  }
};

export default UpdateTicketService;
