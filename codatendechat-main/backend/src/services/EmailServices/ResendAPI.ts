import axios from "axios";
import { logger } from "../../utils/logger";

const RESEND_BASE_URL = "https://api.resend.com";

interface ResendCredentials {
  apiKey: string;
}

interface SendEmailParams {
  from: string;
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  replyTo?: string;
  tags?: { name: string; value: string }[];
}

interface BatchEmailItem {
  from: string;
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  replyTo?: string;
  tags?: { name: string; value: string }[];
}

function getHeaders(apiKey: string) {
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json"
  };
}

export async function sendEmail(
  credentials: ResendCredentials,
  params: SendEmailParams
): Promise<{ id: string }> {
  try {
    const response = await axios.post(
      `${RESEND_BASE_URL}/emails`,
      {
        from: params.from,
        to: Array.isArray(params.to) ? params.to : [params.to],
        subject: params.subject,
        html: params.html,
        text: params.text,
        reply_to: params.replyTo,
        tags: params.tags
      },
      {
        headers: getHeaders(credentials.apiKey),
        timeout: 30000
      }
    );

    logger.info(`ResendAPI -> Email sent: ${response.data.id}`);
    return response.data;
  } catch (error: any) {
    const errorMsg = error.response?.data?.message || error.message;
    logger.error(`ResendAPI -> sendEmail error: ${errorMsg}`);
    throw new Error(errorMsg);
  }
}

export async function sendBatchEmails(
  credentials: ResendCredentials,
  emails: BatchEmailItem[]
): Promise<{ data: { id: string }[] }> {
  try {
    const response = await axios.post(
      `${RESEND_BASE_URL}/emails/batch`,
      emails,
      {
        headers: getHeaders(credentials.apiKey),
        timeout: 60000
      }
    );

    logger.info(`ResendAPI -> Batch sent: ${response.data.data.length} emails`);
    return response.data;
  } catch (error: any) {
    const errorMsg = error.response?.data?.message || error.message;
    logger.error(`ResendAPI -> sendBatchEmails error: ${errorMsg}`);
    throw new Error(errorMsg);
  }
}

export async function getEmailStatus(
  credentials: ResendCredentials,
  emailId: string
): Promise<any> {
  try {
    const response = await axios.get(
      `${RESEND_BASE_URL}/emails/${emailId}`,
      {
        headers: getHeaders(credentials.apiKey),
        timeout: 15000
      }
    );
    return response.data;
  } catch (error: any) {
    logger.error(`ResendAPI -> getEmailStatus error: ${error.message}`);
    throw error;
  }
}

export async function listDomains(
  credentials: ResendCredentials
): Promise<any> {
  try {
    const response = await axios.get(
      `${RESEND_BASE_URL}/domains`,
      {
        headers: getHeaders(credentials.apiKey),
        timeout: 15000
      }
    );
    return response.data;
  } catch (error: any) {
    logger.error(`ResendAPI -> listDomains error: ${error.message}`);
    throw error;
  }
}
