import AppError from "../../errors/AppError";
import Channel from "../../models/Channel";
import Ticket from "../../models/Ticket";

interface Request {
  channelId: string | number;
  companyId: number;
  force?: boolean;
}

const DeleteChannelService = async ({
  channelId,
  companyId,
  force = false
}: Request): Promise<void> => {
  const channel = await Channel.findOne({ where: { id: channelId, companyId } });

  if (!channel) {
    throw new AppError("ERR_CHANNEL_NOT_FOUND", 404);
  }

  if (!force) {
    const ticketsCount = await Ticket.count({ where: { channelId: channel.id } });

    if (ticketsCount > 0) {
      throw new AppError("ERR_CHANNEL_IN_USE");
    }
  }

  await channel.destroy();
};

export default DeleteChannelService;

