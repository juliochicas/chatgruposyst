import { Request, Response } from "express";
import { Op } from "sequelize";
import { getWbot } from "../libs/wbot";
import { getIO } from "../libs/socket";
import ShowWhatsAppService from "../services/WhatsappService/ShowWhatsAppService";
import { StartWhatsAppSession } from "../services/WbotServices/StartWhatsAppSession";
import UpdateWhatsAppService from "../services/WhatsappService/UpdateWhatsAppService";
import Ticket from "../models/Ticket";
import { logger } from "../utils/logger";

const closeStaleTickets = async (whatsappId: number, companyId: number): Promise<number> => {
  const io = getIO();

  const [affectedCount] = await Ticket.update(
    { status: "closed" },
    {
      where: {
        whatsappId,
        companyId,
        status: { [Op.in]: ["open", "pending"] },
      },
    }
  );

  if (affectedCount > 0) {
    logger.info(
      `closeStaleTickets: cerrados ${affectedCount} tickets para whatsappId=${whatsappId}, companyId=${companyId}`
    );

    // Notify all connected clients about the ticket changes
    io.to(`company-${companyId}-mainchannel`).emit(
      `company-${companyId}-ticket`,
      {
        action: "removeAll",
        whatsappId,
      }
    );
  }

  return affectedCount;
};

const store = async (req: Request, res: Response): Promise<Response> => {
  const { whatsappId } = req.params;
  const { companyId } = req.user;

  const whatsapp = await ShowWhatsAppService(whatsappId, companyId);
  await StartWhatsAppSession(whatsapp, companyId);

  return res.status(200).json({ message: "Starting session." });
};

const update = async (req: Request, res: Response): Promise<Response> => {
  const { whatsappId } = req.params;
  const { companyId } = req.user;

  const { whatsapp } = await UpdateWhatsAppService({
    whatsappId,
    companyId,
    whatsappData: { session: "" }
  });

  await StartWhatsAppSession(whatsapp, companyId);

  return res.status(200).json({ message: "Starting session." });
};

const remove = async (req: Request, res: Response): Promise<Response> => {
  const { whatsappId } = req.params;
  const { companyId } = req.user;
  const whatsapp = await ShowWhatsAppService(whatsappId, companyId);

  if (whatsapp.session) {
    await whatsapp.update({ status: "DISCONNECTED", session: "" });
    const wbot = getWbot(whatsapp.id);
    await wbot.logout();
  }

  // Close all open/pending tickets for this connection
  const closedCount = await closeStaleTickets(+whatsappId, companyId);

  return res.status(200).json({
    message: "Session disconnected.",
    closedTickets: closedCount,
  });
};

const cleanupTickets = async (req: Request, res: Response): Promise<Response> => {
  const { whatsappId } = req.params;
  const { companyId } = req.user;

  // Verify the connection belongs to this company
  await ShowWhatsAppService(whatsappId, companyId);

  const closedCount = await closeStaleTickets(+whatsappId, companyId);

  return res.status(200).json({
    message: `${closedCount} tickets cerrados.`,
    closedTickets: closedCount,
  });
};

export default { store, remove, update, cleanupTickets };
