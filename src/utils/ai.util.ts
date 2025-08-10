import { encode, decode } from 'gpt-3-encoder';
import dotenv from 'dotenv';

dotenv.config();

export const truncateByTokens = (text: string, maxTokens: number): string => {
  const tokens = encode(text);

  if (tokens.length <= maxTokens) {
    return text;
  }
  const truncatedTokens = tokens.slice(0, maxTokens);
  return decode(truncatedTokens);
};

export const isOpenRouterEnabled = (): boolean => {
  return Boolean(process.env.OPENROUTER_API_KEY);
};
