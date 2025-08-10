import supertest, { Response } from 'supertest';
import { web } from '../src/applications/web';

describe('SSE Scrape', () => {
  describe('GET /api/scrape', () => {
    it('should receive meta, batch, and done events in order', (done) => {
      const receivedEvents: { event: string; data: any }[] = [];
      const agent = supertest.agent(web);

      let currentEvent: string | null = null;

      agent
        .get('/api/scrape')
        .query({
          search: 'nike',
          page: 1,
          size: 3,
        })
        .expect(200)
        .buffer(false)
        .parse((res: Response) => {
          res.setEncoding('utf8');
          res.on('data', (chunk: string) => {
            // SSE lines may arrive together, so split by \n
            const lines = chunk
              .split('\n')
              .filter((line: string) => line.trim() !== '');

            for (const line of lines) {
              if (line.startsWith('event:')) {
                currentEvent = line.replace('event:', '').trim();
              } else if (line.startsWith('data:') && currentEvent) {
                const data = line.replace('data:', '').trim();
                try {
                  receivedEvents.push({
                    event: currentEvent,
                    data: JSON.parse(data) as unknown,
                  });
                } catch {
                  receivedEvents.push({
                    event: currentEvent,
                    data: data,
                  });
                } finally {
                  // reset current event after processing
                  currentEvent = null;
                }
              }
            }

            // check when all 3 events have been received
            if (
              receivedEvents.some((e) => e.event === 'meta') &&
              receivedEvents.some((e) => e.event === 'batch') &&
              receivedEvents.some((e) => e.event === 'done')
            ) {
              expect(receivedEvents[0].event).toBe('meta');
              expect(receivedEvents.some((e) => e.event === 'batch')).toBe(
                true,
              );
              expect(receivedEvents[receivedEvents.length - 1].event).toBe(
                'done',
              );

              done();
              (
                res as unknown as NodeJS.ReadableStream & {
                  destroy: () => void;
                }
              ).destroy();
            }
          });

          res.on('error', done);
        })
        .end((err) => {
          if (err) done(err);
        });
    }, 60000);

    it('should return 400 for invalid query parameters', (done) => {
      const agent = supertest.agent(web);

      agent
        .get('/api/scrape')
        .query({
          search: '',
          page: -1,
          size: 300,
        })
        .expect(400, done);
    });
  });
});
