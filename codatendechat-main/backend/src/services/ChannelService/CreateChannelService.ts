import * as Yup from "yup";

import AppError from "../../errors/AppError";
import Channel from "../../models/Channel";

interface Request {
  name: string;
  type: string;
  provider?: string;
  companyId: number;
  status?: string;
  externalId?: string;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: Date | null;
  metadata?: Record<string, unknown>;
}

const CreateChannelService = async ({
  name,
  type,
  provider,
  companyId,
  status = "active",
  externalId,
  accessToken,
  refreshToken,
  tokenExpiresAt,
  metadata
}: Request): Promise<Channel> => {
  const schema = Yup.object().shape({
    name: Yup.string().required(),
    type: Yup.string().required(),
    provider: Yup.string().nullable(),
    status: Yup.string().oneOf(["active", "inactive"]).default("active")
  });

  try {
    await schema.validate({ name, type, provider, status });
  } catch (err) {
    throw new AppError(err.message);
  }

  const channelExists = await Channel.findOne({
    where: { companyId, name }
  });

  if (channelExists) {
    throw new AppError("ERR_CHANNEL_NAME_ALREADY_EXISTS");
  }

  const channel = await Channel.create({
    name,
    type,
    provider,
    companyId,
    status,
    externalId,
    accessToken,
    refreshToken,
    tokenExpiresAt,
    metadata
  });

  return channel;
};

export default CreateChannelService;

