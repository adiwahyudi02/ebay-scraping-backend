import dotenv from 'dotenv';
import { logger } from './applications/logger';
import { web } from './applications/web';

dotenv.config();

const port = process.env.PORT || 4000;

web.listen(port, () => {
  logger.info(`Listening on port ${port}`);
});
