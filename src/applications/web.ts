import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { publicRouter } from '../routes/public.routes';
import { errorMiddleware } from '../middlewares/error.middleware';

export const web = express();
web.use(cors());
web.use(
  helmet({
    contentSecurityPolicy: false, // CSP can block SSE
    noSniff: false, // allows text/event-stream to work
  }),
);
web.use(express.json());
web.use(publicRouter);
web.use(errorMiddleware);
