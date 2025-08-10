import express from 'express';
import { ScrapeController } from '../controllers/scrape.controller';

export const publicRouter = express.Router();

publicRouter.get('/api/scrape', ScrapeController.scrape);
