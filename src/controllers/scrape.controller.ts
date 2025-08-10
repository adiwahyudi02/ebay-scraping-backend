import { NextFunction, Request, Response } from 'express';
import { ScrapeRequest } from '../models/scrape';
import { ScrapeService } from '../services/scrape.service';

export class ScrapeController {
  static scrape = async (req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    try {
      const request: ScrapeRequest = {
        search: req.query.search as string,
        page: parseInt(req.query.page as string) || 1,
        size: parseInt(req.query.size as string) || 10,
        getAll: req.query.getAll === 'true',
        scrapeDetails: req.query.scrapeDetails === 'true',
      };

      await ScrapeService.scrape(request, res);
    } catch (e) {
      next(e);
    }
  };
}
