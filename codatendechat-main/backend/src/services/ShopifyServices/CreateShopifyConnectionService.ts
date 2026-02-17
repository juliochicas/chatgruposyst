import * as Yup from "yup";
import AppError from "../../errors/AppError";
import ShopifyConnection from "../../models/ShopifyConnection";
import Company from "../../models/Company";
import Plan from "../../models/Plan";

interface Request {
  shopDomain: string;
  companyId: number;
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
}

const CreateShopifyConnectionService = async ({
  shopDomain,
  companyId,
  greetingMessage,
  complationMessage,
  outOfHoursMessage,
  ratingMessage,
  transferQueueId,
  timeToTransfer,
  promptId,
  maxUseBotQueues = 3,
  expiresTicket = 0,
  expiresInactiveMessage = ""
}: Request): Promise<ShopifyConnection> => {
  const company = await Company.findOne({
    where: { id: companyId },
    include: [{ model: Plan, as: "plan" }]
  });

  if (!company) {
    throw new AppError("ERR_COMPANY_NOT_FOUND");
  }

  // Normalize domain
  let normalizedDomain = shopDomain
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "");

  if (!normalizedDomain.includes(".myshopify.com")) {
    normalizedDomain = `${normalizedDomain}.myshopify.com`;
  }

  const schema = Yup.object().shape({
    shopDomain: Yup.string()
      .required()
      .test(
        "Check-domain",
        "Esta tienda ya está conectada",
        async value => {
          if (!value) return false;
          const exists = await ShopifyConnection.findOne({
            where: { shopDomain: value, companyId }
          });
          return !exists;
        }
      )
  });

  try {
    await schema.validate({ shopDomain: normalizedDomain });
  } catch (err: any) {
    throw new AppError(err.message);
  }

  const { v4: uuidv4 } = require("uuid");

  const shopifyConnection = await ShopifyConnection.create({
    shopDomain: normalizedDomain,
    status: "disconnected",
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
    webhookSecret: uuidv4()
  });

  return shopifyConnection;
};

export default CreateShopifyConnectionService;
