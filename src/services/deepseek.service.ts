import { openRouter } from '../applications/openRouter';
import { logger } from '../applications/logger';
import { SERVER_CONFIG } from '../constants/server.constant';
import { isOpenRouterEnabled, truncateByTokens } from '../utils/ai.util';

export class DeepseekService {
  static async getDescriptionSummary(description: string): Promise<string> {
    try {
      if (!isOpenRouterEnabled()) return description;

      logger.info({
        message: 'Generating description summary using DeepSeek',
        description: description,
      });

      const prompt = `Summarize the following product description:\n ${description}`;

      const truncatedPrompt = truncateByTokens(
        prompt,
        SERVER_CONFIG.MAX_INPUT_TOKENS,
      );

      const response = await openRouter.chat.completions.create({
        model: 'deepseek/deepseek-r1-0528:free',
        messages: [
          {
            role: 'system',
            content:
              'You are a helpful assistant that summarizes long product descriptions into short, clear, and simple text for e-commerce. Output ONLY the summary, no introductions or extra commentary.',
          },
          {
            role: 'user',
            content: truncatedPrompt,
          },
        ],
        max_tokens: SERVER_CONFIG.MAX_OUTPUT_TOKENS,
      });

      return response.choices[0].message.content || description;
    } catch (error) {
      logger.error({
        message: 'Failed to generate description summary using DeepSeek',
        error,
      });

      // return the original description
      return description;
    }
  }
}
