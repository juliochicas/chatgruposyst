import { Configuration, OpenAIApi } from "openai";
import { logger } from "../../utils/logger";
import Prompt from "../../models/Prompt";

interface EmailVariationParams {
  baseSubject: string;
  baseBody: string;
  contactName: string;
  contactEmail: string;
  promptId: number;
}

interface EmailVariationResult {
  subject: string;
  body: string;
}

export async function generateEmailVariation(
  params: EmailVariationParams
): Promise<EmailVariationResult> {
  const { baseSubject, baseBody, contactName, contactEmail, promptId } = params;

  try {
    const prompt = await Prompt.findByPk(promptId);

    if (!prompt || !prompt.apiKey) {
      logger.warn("AIEmailVariation -> No prompt or API key found, returning original");
      return { subject: baseSubject, body: baseBody };
    }

    const configuration = new Configuration({
      apiKey: prompt.apiKey
    });

    const openai = new OpenAIApi(configuration);

    const systemPrompt = `Eres un experto en email marketing y copywriting. Tu tarea es reescribir emails de forma unica y personalizada para cada destinatario.

Reglas estrictas:
- Reescribe TANTO el asunto como el cuerpo del email
- Mantén EXACTAMENTE el mismo significado e intención comercial
- El nombre del destinatario es: ${contactName}
- Personaliza el mensaje usando el nombre cuando sea natural
- Varía la estructura, las frases de apertura, y el tono (pero mantenlo profesional)
- NO agregues información que no esté en el original
- El asunto debe ser atractivo pero NO parecer spam (evita MAYÚSCULAS, exclamaciones excesivas)
- El cuerpo debe mantener formato HTML si el original lo tiene
- NUNCA repitas exactamente las mismas palabras o estructura del original
- Responde ÚNICAMENTE en formato JSON con las claves "subject" y "body"
- No incluyas bloques de código ni markdown, solo el JSON puro`;

    const response = await openai.createChatCompletion({
      model: prompt.model || "gpt-3.5-turbo",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Reescribe este email de forma diferente y personalizada:

ASUNTO ORIGINAL: ${baseSubject}

CUERPO ORIGINAL:
${baseBody}

Responde SOLO con JSON: {"subject": "...", "body": "..."}`
        }
      ],
      max_tokens: prompt.maxTokens || 1000,
      temperature: prompt.temperature || 0.9
    });

    const content = response.data.choices[0]?.message?.content?.trim();

    if (!content) {
      logger.warn("AIEmailVariation -> Empty response, using original");
      return { subject: baseSubject, body: baseBody };
    }

    try {
      // Try to parse JSON response
      const cleanContent = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const parsed = JSON.parse(cleanContent);

      if (parsed.subject && parsed.body) {
        // Update token usage
        const usage = response.data.usage;
        if (usage) {
          await prompt.update({
            promptTokens: (prompt.promptTokens || 0) + (usage.prompt_tokens || 0),
            completionTokens: (prompt.completionTokens || 0) + (usage.completion_tokens || 0),
            totalTokens: (prompt.totalTokens || 0) + (usage.total_tokens || 0)
          });
        }

        logger.info(`AIEmailVariation -> Generated variation for ${contactName}`);
        return { subject: parsed.subject, body: parsed.body };
      }
    } catch (parseError) {
      logger.error(`AIEmailVariation -> JSON parse error, using original`);
    }

    return { subject: baseSubject, body: baseBody };
  } catch (error: any) {
    logger.error(`AIEmailVariation -> Error: ${error.message}`);
    return { subject: baseSubject, body: baseBody };
  }
}
