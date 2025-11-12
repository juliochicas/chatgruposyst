import AppError from "../../errors/AppError";
import Channel from "../../models/Channel";

interface Request {
  channelId: string | number;
  companyId: number;
}

const ShowChannelService = async ({
  channelId,
  companyId
}: Request): Promise<Channel> => {
  const channel = await Channel.findOne({
    where: { id: channelId, companyId }
  });

  if (!channel) {
    throw new AppError("ERR_CHANNEL_NOT_FOUND", 404);
  }

  return channel;
};

export default ShowChannelService;

