import { Op } from "sequelize";
import Tag from "../../models/Tag";
import Ticket from "../../models/Ticket";
import TicketTag from "../../models/TicketTag";
import Prompt from "../../models/Prompt";
import ShopifyConnection from "../../models/ShopifyConnection";

interface Request {
  companyId: number;
}

const KanbanListService = async ({
  companyId
}: Request): Promise<Tag[]> => {
  const tags = await Tag.findAll({
    where: {
      kanban: 1,
      companyId: companyId,
    },
    order: [["parentId", "ASC"], ["id", "ASC"]],
    include: [
      {
        model: Tag,
        as: "children",
        where: { kanban: 1 },
        required: false,
        include: [
          {
            model: Prompt,
            attributes: ["id", "name"],
            required: false,
          },
          {
            model: ShopifyConnection,
            attributes: ["id", "shopName", "shopDomain"],
            required: false,
          },
        ],
      },
      {
        model: Tag,
        as: "parent",
        required: false,
      },
      {
        model: Prompt,
        attributes: ["id", "name"],
        required: false,
      },
      {
        model: ShopifyConnection,
        attributes: ["id", "shopName", "shopDomain"],
        required: false,
      },
    ],
  });
  return tags;
};

export default KanbanListService;
