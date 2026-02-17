import { Configuration, OpenAIApi } from "openai";
import { logger } from "../../utils/logger";
import Prompt from "../../models/Prompt";

interface VariationParams {
  baseMessage: string;
  contactName: string;
  promptId: number;
}

export async function generateMessageVariation(
  params: VariationParams
): Promise<string> {
  const { baseMessage, contactName, promptId } = params;

  try {
    const prompt = await Prompt.findByPk(promptId);

    if (!prompt || !prompt.apiKey) {
      logger.warn("AIMessageVariation -> No prompt or API key found, returning original message");
      return baseMessage;
    }

    const configuration = new Configuration({
      apiKey: prompt.apiKey
    });

    const openai = new OpenAIApi(configuration);

    const systemPrompt = `Eres un asistente que reescribe mensajes de marketing/comunicación para WhatsApp.
Tu tarea es tomar un mensaje base y reescribirlo de forma natural y diferente, manteniendo EXACTAMENTE el mismo significado e intención.

Reglas estrictas:
- Mantén el mismo tono (formal/informal) del mensaje original
- NO agregues información nueva que no esté en el original
- NO uses emojis a menos que el mensaje original los tenga
- Varía la estructura de las frases, el orden de las ideas y las palabras usadas
- Si el mensaje menciona un nombre, usa "${contactName}" como nombre del destinatario
- La longitud debe ser similar al original (no más del 20% más largo o corto)
- Responde ÚNICAMENTE con el mensaje reescrito, sin explicaciones ni comillas
- El mensaje debe sonar natural, como si un humano lo escribiera casualmente
- NO repitas las mismas palabras del inicio del mensaje original`;

    const response = await openai.createChatCompletion({
      model: prompt.model || "gpt-3.5-turbo",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Reescribe este mensaje de forma diferente y natural:\n\n${baseMessage}` }
      ],
      max_tokens: prompt.maxTokens || 500,
      temperature: prompt.temperature || 0.9,
    });

    const variation = response.data.choices[0]?.message?.content?.trim();

    if (!variation) {
      logger.warn("AIMessageVariation -> Empty response from OpenAI, returning original");
      return baseMessage;
    }

    // Update token usage
    const usage = response.data.usage;
    if (usage) {
      await prompt.update({
        promptTokens: (prompt.promptTokens || 0) + (usage.prompt_tokens || 0),
        completionTokens: (prompt.completionTokens || 0) + (usage.completion_tokens || 0),
        totalTokens: (prompt.totalTokens || 0) + (usage.total_tokens || 0)
      });
    }

    logger.info(`AIMessageVariation -> Generated variation for ${contactName}`);
    return variation;
  } catch (error: any) {
    logger.error(`AIMessageVariation -> Error: ${error.message}`);
    return baseMessage;
  }
}
