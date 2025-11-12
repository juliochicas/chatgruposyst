import * as Yup from "yup";

import AppError from "../../errors/AppError";
import Channel from "../../models/Channel";

interface Request {
  channelId: string | number;
  companyId: number;
  name?: string;
  type?: string;
  provider?: string;
  status?: string;
  externalId?: string;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: Date | null;
  metadata?: Record<string, unknown>;
}

const UpdateChannelService = async ({
  channelId,
  companyId,
  name,
  type,
  provider,
  status,
  externalId,
  accessToken,
  refreshToken,
  tokenExpiresAt,
  metadata
}: Request): Promise<Channel> => {
  const channel = await Channel.findOne({ where: { id: channelId, companyId } });

  if (!channel) {
    throw new AppError("ERR_CHANNEL_NOT_FOUND", 404);
  }

  const schema = Yup.object().shape({
    name: Yup.string().optional(),
    type: Yup.string().optional(),
    provider: Yup.string().optional(),
    status: Yup.string().oneOf(["active", "inactive"]).optional()
  });

  try {
    await schema.validate({ name, type, provider, status });
  } catch (err) {
    throw new AppError(err.message);
  }

  if (name && name !== channel.name) {
    const channelWithSameName = await Channel.findOne({
      where: { companyId, name }
    });

    if (channelWithSameName) {
      throw new AppError("ERR_CHANNEL_NAME_ALREADY_EXISTS");
    }
  }

  await channel.update({
    name: name ?? channel.name,
    type: type ?? channel.type,
    provider: provider ?? channel.provider,
    status: status ?? channel.status,
    externalId: externalId ?? channel.externalId,
    accessToken: accessToken ?? channel.accessToken,
    refreshToken: refreshToken ?? channel.refreshToken,
    tokenExpiresAt: tokenExpiresAt ?? channel.tokenExpiresAt,
    metadata: metadata ?? channel.metadata
  });

  return channel;
};

export default UpdateChannelService;

