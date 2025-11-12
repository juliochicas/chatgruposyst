import { WebhookModel } from "../../models/Webhook";
import { randomString } from "../../utils/randomCode";

interface Request {
  status: boolean;
  webhookId: number;
}

const UpdateActiveWebHookService = async ({
  status,
  webhookId
}: Request): Promise<String> => {
  try {

    const webhook = await WebhookModel.update({ active: status }, {
      where: {id: webhookId}
    });

    return 'ok';
  } catch (error) {
    console.error("Error al registrar el usuario:", error);

    return error
  }
};

export default UpdateActiveWebHookService;
