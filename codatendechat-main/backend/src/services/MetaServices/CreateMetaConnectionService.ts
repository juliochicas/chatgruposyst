import * as Yup from "yup";
import AppError from "../../errors/AppError";
import MetaConnection from "../../models/MetaConnection";
import MetaConnectionQueue from "../../models/MetaConnectionQueue";
import Company from "../../models/Company";
import Plan from "../../models/Plan";

interface Request {
  name: string;
  channel: string;
  companyId: number;
  queueIds?: number[];
  greetingMessage?: string;
  complationMessage?: string;
  outOfHoursMessage?: string;
  ratingMessage?: string;
  isDefault?: boolean;
  transferQueueId?: number;
  timeToTransfer?: number;
  promptId?: number;
  maxUseBotQueues?: number;
  expiresTicket?: number;
  expiresInactiveMessage?: string;
  integrationId?: number;
}

const CreateMetaConnectionService = async ({
  name,
  channel = "facebook",
  companyId,
  queueIds = [],
  greetingMessage,
  complationMessage,
  outOfHoursMessage,
  ratingMessage,
  isDefault = false,
  transferQueueId,
  timeToTransfer,
  promptId,
  maxUseBotQueues = 3,
  expiresTicket = 0,
  expiresInactiveMessage = "",
  integrationId = null
}: Request): Promise<MetaConnection> => {
  const company = await Company.findOne({
    where: { id: companyId },
    include: [{ model: Plan, as: "plan" }]
  });

  if (!company) {
    throw new AppError("ERR_COMPANY_NOT_FOUND");
  }

  const schema = Yup.object().shape({
    name: Yup.string()
      .required()
      .min(2)
      .test("Check-name", "Este nombre ya está en uso", async value => {
        if (!value) return false;
        const nameExists = await MetaConnection.findOne({
          where: { name: value, companyId }
        });
        return !nameExists;
      })
  });

  try {
    await schema.validate({ name });
  } catch (err: any) {
    throw new AppError(err.message);
  }

  const existingDefault = await MetaConnection.findOne({
    where: { companyId }
  });
  if (!existingDefault) {
    isDefault = true;
  }

  if (queueIds.length > 1 && !greetingMessage) {
    throw new AppError("ERR_META_GREETING_REQUIRED");
  }

  const { v4: uuidv4 } = require("uuid");
  const webhookVerifyToken = uuidv4();

  const metaConnection = await MetaConnection.create({
    name,
    channel,
    status: "DISCONNECTED",
    isDefault,
    companyId,
    greetingMessage,
    complationMessage,
    outOfHoursMessage,
    ratingMessage,
    transferQueueId,
    timeToTransfer,
    promptId,
    maxUseBotQueues,
    expiresTicket,
    expiresInactiveMessage,
    integrationId,
    webhookVerifyToken
  });

  // Associate queues
  if (queueIds.length > 0) {
    for (const queueId of queueIds) {
      await MetaConnectionQueue.create({
        metaConnectionId: metaConnection.id,
        queueId
      });
    }
  }

  return metaConnection;
};

export default CreateMetaConnectionService;
