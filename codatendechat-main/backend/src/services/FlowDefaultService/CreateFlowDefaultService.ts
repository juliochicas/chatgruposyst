import { FlowBuilderModel } from "../../models/FlowBuilder";
import { FlowCampaignModel } from "../../models/FlowCampaign";
import { FlowDefaultModel } from "../../models/FlowDefault";
import { WebhookModel } from "../../models/Webhook";
import { randomString } from "../../utils/randomCode";

interface Request {
  userId: number;
  companyId: number
  flowIdWelcome: number
  flowIdPhrase: number
}

const CreateFlowDefaultService = async ({
  userId,
  companyId,
  flowIdWelcome,
  flowIdPhrase
}: Request): Promise<FlowDefaultModel> => {
  try {
    const flow = await FlowDefaultModel.create({
      userId: userId,
      companyId: companyId,
      flowIdWelcome,
      flowIdNotPhrase: flowIdPhrase
    });

    return flow;
  } catch (error) {
    console.error("Error al registrar el usuario:", error);

    return error
  }
};

export default CreateFlowDefaultService;