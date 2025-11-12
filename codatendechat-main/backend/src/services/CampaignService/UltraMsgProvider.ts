import axios from "axios";

import { Op } from "sequelize";

import Setting from "../../models/Setting";

const ULTRAMSG_INSTANCE_KEY = "ULTRAMSG_INSTANCE_ID";
const ULTRAMSG_TOKEN_KEY = "ULTRAMSG_TOKEN";

interface UltraMsgCredential {
  instanceId: string;
  token: string;
}

interface SendTextParams {
  instanceId: string;
  token: string;
  to: string;
  body: string;
}

export const GetActiveCredentialService = async (
  companyId: number
): Promise<UltraMsgCredential | null> => {
  const settings = await Setting.findAll({
    where: {
      companyId,
      key: {
        [Op.in]: [ULTRAMSG_INSTANCE_KEY, ULTRAMSG_TOKEN_KEY]
      }
    }
  });

  const map = settings.reduce<Record<string, string>>((acc, item) => {
    acc[item.key] = item.value;
    return acc;
  }, {});

  if (!map[ULTRAMSG_INSTANCE_KEY] || !map[ULTRAMSG_TOKEN_KEY]) {
    return null;
  }

  return {
    instanceId: map[ULTRAMSG_INSTANCE_KEY],
    token: map[ULTRAMSG_TOKEN_KEY]
  };
};

export const sendTextMessage = async ({
  instanceId,
  token,
  to,
  body
}: SendTextParams): Promise<void> => {
  await axios.post(
    `https://api.ultramsg.com/${instanceId}/messages/chat`,
    {
      token,
      to,
      body
    },
    {
      timeout: 15000
    }
  );
};

export const ultraMsgSettingKeys = {
  instance: ULTRAMSG_INSTANCE_KEY,
  token: ULTRAMSG_TOKEN_KEY
};

