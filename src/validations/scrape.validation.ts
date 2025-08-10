import { z, ZodType } from 'zod';

export class ScrapeValidation {
  static readonly SCRAPE_REQUEST: ZodType = z.object({
    search: z.string().min(1).optional(),
    page: z.number().min(1).positive(),
    size: z.number().min(1).max(240).positive(),
    getAll: z.boolean().optional(),
    scrapeDetails: z.boolean().optional(),
  });
}
