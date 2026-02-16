import AppError from "../../errors/AppError";
import MetaConnection from "../../models/MetaConnection";
import MetaConnectionQueue from "../../models/MetaConnectionQueue";

interface MetaConnectionData {
  name?: string;
  channel?: string;
  status?: string;
  isDefault?: boolean;
  greetingMessage?: string;
  complationMessage?: string;
  outOfHoursMessage?: string;
  ratingMessage?: string;
  transferQueueId?: number;
  timeToTransfer?: number;
  promptId?: number;
  maxUseBotQueues?: number;
  expiresTicket?: number;
  expiresInactiveMessage?: string;
  integrationId?: number;
  queueIds?: number[];
  // OAuth fields (set internally)
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: Date;
  pageId?: string;
  pageName?: string;
  pageAccessToken?: string;
  instagramAccountId?: string;
  instagramUsername?: string;
}

interface Request {
  metaConnectionData: MetaConnectionData;
  metaConnectionId: string | number;
  companyId: number;
}

const UpdateMetaConnectionService = async ({
  metaConnectionData,
  metaConnectionId,
  companyId
}: Request): Promise<MetaConnection> => {
  const metaConnection = await MetaConnection.findOne({
    where: { id: metaConnectionId, companyId }
  });

  if (!metaConnection) {
    throw new AppError("ERR_NO_META_CONNECTION_FOUND", 404);
  }

  const { queueIds, ...updateData } = metaConnectionData;

  await metaConnection.update(updateData);

  // Update queue associations if provided
  if (queueIds !== undefined) {
    await MetaConnectionQueue.destroy({
      where: { metaConnectionId: metaConnection.id }
    });
    for (const queueId of queueIds) {
      await MetaConnectionQueue.create({
        metaConnectionId: metaConnection.id,
        queueId
      });
    }
  }

  await metaConnection.reload({
    include: ["queues"]
  });

  return metaConnection;
};

export default UpdateMetaConnectionService;
