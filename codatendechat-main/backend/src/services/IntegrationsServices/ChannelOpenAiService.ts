import { Configuration, OpenAIApi } from "openai";

import Ticket from "../../models/Ticket";
import Message from "../../models/Message";
import Channel from "../../models/Channel";
import Contact from "../../models/Contact";
import ShowPromptService from "../PromptServices/ShowPromptService";
import SendChannelMessage from "../../helpers/SendChannelMessage";
import CreateMessageService from "../MessageServices/CreateMessageService";
import { transferQueue } from "../WbotServices/wbotMessageListener";
import { logger } from "../../utils/logger";

interface Params {
  ticket: Ticket;
  message: Message;
  channel: Channel;
  contact: Contact;
}

const buildConversation = (
  ticketMessages: Message[],
  promptSystem: string,
  incomingBody: string
) => {
  const history = [{ role: "system", content: promptSystem }] as Array<{
    role: "system" | "assistant" | "user";
    content: string;
  }>;

  ticketMessages.forEach((msg) => {
    if (!msg.body) return;

    history.push({
      role: msg.fromMe ? "assistant" : "user",
      content: msg.body
    });
  });

  history.push({
    role: "user",
    content: incomingBody
  });

  return history;
};

const createOutgoingMessage = async (
  ticket: Ticket,
  channel: Channel,
  response: string
) => {
  const messageId = `bot-${ticket.id}-${Date.now()}`;

  await CreateMessageService({
    companyId: ticket.companyId,
    messageData: {
      id: messageId,
      ticketId: ticket.id,
      body: response,
      fromMe: true,
      read: true,
      channelId: channel.id,
      channelType: channel.type,
      channelExternalId: ticket.channelExternalId,
      metadata: {
        provider: "meta",
        generatedBy: "openai"
      }
    }
  });
};

const ChannelOpenAiService = async ({
  ticket,
  message,
  channel,
  contact
}: Params): Promise<void> => {
  try {
    if (
      message.fromMe ||
      contact.disableBot ||
      !ticket.promptId ||
      !message.body
    ) {
      return;
    }

    const prompt = await ShowPromptService({
      promptId: ticket.promptId,
      companyId: ticket.companyId
    });

    const configuration = new Configuration({
      apiKey: prompt.apiKey
    });
    const openai = new OpenAIApi(configuration);

    const history = await Message.findAll({
      where: { ticketId: ticket.id },
      order: [["createdAt", "ASC"]],
      limit: prompt.maxMessages || 10
    });

    const promptSystem = `${prompt.prompt}\n`;

    const conversation = buildConversation(
      history,
      promptSystem,
      message.body
    );

    const responseCompletion = await openai.createChatCompletion({
      model: prompt.model || "gpt-3.5-turbo-1106",
      messages: conversation as any,
      max_tokens: prompt.maxTokens || 100,
      temperature: prompt.temperature || 1
    });

    let response = responseCompletion.data.choices[0].message?.content?.trim();

    if (!response) {
      return;
    }

    if (
      prompt.queueId &&
      response.includes("Ação: Transferir para o setor de atendimento")
    ) {
      await transferQueue(prompt.queueId, ticket, contact);
      response = response
        .replace("Ação: Transferir para o setor de atendimento", "")
        .trim();
      if (!response) {
        return;
      }
    }

    await SendChannelMessage(ticket, {
      number: ticket.channelExternalId || contact.number,
      body: response
    });

    await createOutgoingMessage(ticket, channel, response);
  } catch (error) {
    logger.error({ error }, "ChannelOpenAiService failed");
  }
};

export default ChannelOpenAiService;

