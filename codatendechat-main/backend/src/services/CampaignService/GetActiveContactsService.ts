import { Op } from "sequelize";
import moment from "moment";
import Contact from "../../models/Contact";
import Ticket from "../../models/Ticket";
import Message from "../../models/Message";
import { logger } from "../../utils/logger";

interface GetActiveContactsParams {
  companyId: number;
  daysFilter: number;
}

interface ActiveContact {
  name: string;
  number: string;
  email: string;
}

const GetActiveContactsService = async (
  params: GetActiveContactsParams
): Promise<ActiveContact[]> => {
  const { companyId, daysFilter } = params;

  const sinceDate = moment()
    .subtract(daysFilter, "days")
    .format("YYYY-MM-DD HH:mm:ss");

  logger.info(
    `GetActiveContacts -> Fetching contacts active since ${sinceDate} for company ${companyId}`
  );

  // Find tickets that have had messages in the last N days
  const tickets = await Ticket.findAll({
    where: {
      companyId,
      isGroup: false,
    },
    attributes: ["contactId"],
    include: [
      {
        model: Message,
        as: "messages",
        attributes: [],
        where: {
          createdAt: { [Op.gte]: sinceDate },
          fromMe: false
        },
        required: true
      }
    ],
    group: ["Ticket.contactId", "Ticket.id"]
  });

  const contactIds = [...new Set(tickets.map(t => t.contactId))];

  if (contactIds.length === 0) {
    logger.info("GetActiveContacts -> No active contacts found");
    return [];
  }

  const contacts = await Contact.findAll({
    where: {
      id: { [Op.in]: contactIds },
      companyId,
      isGroup: false
    },
    attributes: ["id", "name", "number", "email"]
  });

  logger.info(
    `GetActiveContacts -> Found ${contacts.length} active contacts`
  );

  return contacts.map(c => ({
    name: c.name,
    number: c.number,
    email: c.email || ""
  }));
};

export default GetActiveContactsService;
