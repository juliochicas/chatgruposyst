import { Op } from "sequelize";

import Channel from "../../models/Channel";

interface Request {
  companyId: number;
  searchParam?: string;
  type?: string;
}

const ListChannelService = async ({
  companyId,
  searchParam,
  type
}: Request): Promise<Channel[]> => {
  const where: any = { companyId };

  if (searchParam) {
    where[Op.or] = [
      { name: { [Op.iLike]: `%${searchParam}%` } },
      { type: { [Op.iLike]: `%${searchParam}%` } },
      { provider: { [Op.iLike]: `%${searchParam}%` } }
    ];
  }

  if (type) {
    where.type = type;
  }

  const channels = await Channel.findAll({
    where,
    order: [["name", "ASC"], ["id", "ASC"]]
  });

  return channels;
};

export default ListChannelService;

