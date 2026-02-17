import axios from "axios";
import { logger } from "../../utils/logger";

const ULTRAMSG_BASE_URL = "https://api.ultramsg.com";

interface UltraMsgCredentials {
  instanceId: string;
  token: string;
}

interface SendMessageParams {
  to: string;
  body: string;
}

interface SendMediaParams {
  to: string;
  caption?: string;
  filename?: string;
  mediaUrl?: string;
  mediaBase64?: string;
}

function buildUrl(instanceId: string, endpoint: string): string {
  return `${ULTRAMSG_BASE_URL}/${instanceId}/${endpoint}`;
}

async function makeRequest(
  instanceId: string,
  endpoint: string,
  token: string,
  data: Record<string, any>
): Promise<any> {
  const url = buildUrl(instanceId, endpoint);
  try {
    const response = await axios.post(url, { ...data, token }, {
      headers: { "Content-Type": "application/json" },
      timeout: 30000
    });
    return response.data;
  } catch (error: any) {
    logger.error(
      `UltraMsgAPI -> ${endpoint}: ${error.response?.data?.message || error.message}`
    );
    throw error;
  }
}

export async function sendTextMessage(
  credentials: UltraMsgCredentials,
  params: SendMessageParams
): Promise<any> {
  const { instanceId, token } = credentials;
  const { to, body } = params;

  const formattedTo = to.includes("@") ? to : to;

  return makeRequest(instanceId, "messages/chat", token, {
    to: formattedTo,
    body
  });
}

export async function sendImage(
  credentials: UltraMsgCredentials,
  params: SendMediaParams
): Promise<any> {
  const { instanceId, token } = credentials;
  return makeRequest(instanceId, "messages/image", token, {
    to: params.to,
    image: params.mediaUrl || params.mediaBase64,
    caption: params.caption || ""
  });
}

export async function sendDocument(
  credentials: UltraMsgCredentials,
  params: SendMediaParams
): Promise<any> {
  const { instanceId, token } = credentials;
  return makeRequest(instanceId, "messages/document", token, {
    to: params.to,
    document: params.mediaUrl || params.mediaBase64,
    filename: params.filename || "document",
    caption: params.caption || ""
  });
}

export async function sendVideo(
  credentials: UltraMsgCredentials,
  params: SendMediaParams
): Promise<any> {
  const { instanceId, token } = credentials;
  return makeRequest(instanceId, "messages/video", token, {
    to: params.to,
    video: params.mediaUrl || params.mediaBase64,
    caption: params.caption || ""
  });
}

export async function sendAudio(
  credentials: UltraMsgCredentials,
  params: SendMediaParams
): Promise<any> {
  const { instanceId, token } = credentials;
  return makeRequest(instanceId, "messages/audio", token, {
    to: params.to,
    audio: params.mediaUrl || params.mediaBase64
  });
}

export async function getInstanceStatus(
  credentials: UltraMsgCredentials
): Promise<any> {
  const { instanceId, token } = credentials;
  const url = buildUrl(instanceId, "instance/status");
  try {
    const response = await axios.get(url, {
      params: { token },
      timeout: 15000
    });
    return response.data;
  } catch (error: any) {
    logger.error(
      `UltraMsgAPI -> getInstanceStatus: ${error.response?.data?.message || error.message}`
    );
    throw error;
  }
}

export async function checkContact(
  credentials: UltraMsgCredentials,
  chatId: string
): Promise<any> {
  const { instanceId, token } = credentials;
  const url = buildUrl(instanceId, "contacts/check");
  try {
    const response = await axios.get(url, {
      params: { token, chatId },
      timeout: 15000
    });
    return response.data;
  } catch (error: any) {
    logger.error(
      `UltraMsgAPI -> checkContact: ${error.response?.data?.message || error.message}`
    );
    throw error;
  }
}

export async function getInstanceQR(
  credentials: UltraMsgCredentials
): Promise<any> {
  const { instanceId, token } = credentials;
  const url = buildUrl(instanceId, "instance/qr");
  try {
    const response = await axios.get(url, {
      params: { token },
      timeout: 15000
    });
    return response.data;
  } catch (error: any) {
    logger.error(
      `UltraMsgAPI -> getInstanceQR: ${error.response?.data?.message || error.message}`
    );
    throw error;
  }
}

export async function getMessageStatistics(
  credentials: UltraMsgCredentials
): Promise<any> {
  const { instanceId, token } = credentials;
  const url = buildUrl(instanceId, "messages/statistics");
  try {
    const response = await axios.get(url, {
      params: { token },
      timeout: 15000
    });
    return response.data;
  } catch (error: any) {
    logger.error(
      `UltraMsgAPI -> getMessageStatistics: ${error.response?.data?.message || error.message}`
    );
    throw error;
  }
}
