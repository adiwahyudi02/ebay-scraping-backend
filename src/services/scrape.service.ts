import { Response } from 'express';
import axios from 'axios';
import { load } from 'cheerio';
import { Product, ScrapeRequest } from '../models/scrape';
import { ScrapeValidation } from '../validations/scrape.validation';
import { Validation } from '../validations/validation';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { cleanupHtml } from '../utils/cleanup-html.util';
import { rotateProxy } from '../utils/rotate-proxy.util';
import { SERVER_CONFIG } from '../constants/server.constant';
import { getClosestIpg } from '../utils/ebay.utils';
import { logger } from '../applications/logger';
import { DeepseekService } from './deepseek.service';

export class ScrapeService {
  static async scrape(request: ScrapeRequest, res: Response) {
    const scrapeRequest = Validation.validate(
      ScrapeValidation.SCRAPE_REQUEST,
      request,
    );

    const size = Number(scrapeRequest.size) || 60;
    const page = scrapeRequest.page;
    const search = encodeURIComponent(scrapeRequest.search.trim());
    const scrapeDetails = scrapeRequest.scrapeDetails;
    const getAll = scrapeRequest.getAll;

    const currentPage = typeof page === 'number' ? page : 1;
    let listPage = getAll ? 1 : currentPage; // start page

    while (true) {
      let url = '';

      // if getAll is false, only scrape the current page and size (based on query parameters)
      if (!getAll) {
        const ipg = getClosestIpg(size);
        url = `https://www.ebay.com/sch/i.html?_from=R40&_nkw=${search}&_sacat=0&rt=nc&_pgn=${page}&_ipg=${ipg}`;
      } else {
        // if getAll is true, scrape all pages & specific _ipg size
        url = `https://www.ebay.com/sch/i.html?_from=R40&_nkw=${search}&_sacat=0&rt=nc&_pgn=${listPage}&_ipg=${SERVER_CONFIG.MAX_GET_ALL_PAGES_SIZE}`;
      }

      logger.info({
        message: `Scraping listing page #${listPage}`,
        queries: {
          search,
          page,
          size,
          getAll,
          scrapeDetails,
        },
      });

      const products = await this.scrapeProductList(url);

      // Stop loop if no products returned or empty array
      if (!products || products.length === 0) {
        break;
      }

      // slice the products to the requested size
      // only slice if getAll is false
      const slicedProducts = !getAll ? products.slice(0, size) : products;
      logger.info(`Found ${slicedProducts.length} products`);

      const meta = {
        page: getAll ? listPage : page,
        size: getAll ? SERVER_CONFIG.MAX_GET_ALL_PAGES_SIZE : size,
        total: slicedProducts.length,
      };

      // send the meta data to the client
      res.write(`event: meta\n`);
      res.write(`data: ${JSON.stringify(meta)}\n\n`);

      const results: Product[] = [];
      let currentBatch: Product[] = [];

      // batch size for sending data to client (only for scrapeDetails is true)
      const batchSize = SERVER_CONFIG.BATCH_SIZE;

      if (scrapeDetails) {
        for (let i = 0; i < slicedProducts.length; i++) {
          const product = slicedProducts[i];

          try {
            const detail = await this.scrapeProductDetail(product);
            results.push(detail);
            currentBatch.push(detail);
          } catch (error: unknown) {
            logger.error({
              message: 'Failed to scrape product detail',
              product,
              error,
            });
          }

          // every batchSize slicedProducts, send the results to the client
          if (
            currentBatch.length === batchSize ||
            i === slicedProducts.length - 1
          ) {
            if (currentBatch.length > 0) {
              res.write(`event: batch\n`);
              res.write(`data: ${JSON.stringify(currentBatch)}\n\n`);
              currentBatch = [];
            }
          }
        }
      } else {
        // send products without description details
        res.write(`event: batch\n`);
        res.write(`data: ${JSON.stringify(slicedProducts)}\n\n`);
      }

      // If not getAll, we only scrape one page, so break here
      if (!getAll) {
        break;
      }

      listPage++;
    }

    // end the batch prosess
    res.write(`event: done\n`);
    res.write(`data: success\n`);
    res.end();
  }

  private static async scrapeProductList(url: string): Promise<Product[]> {
    try {
      // setup proxy and user-agent
      const proxy = rotateProxy();
      const agent = new HttpsProxyAgent(proxy);
      const response = await axios.get(url, {
        httpsAgent: agent,
        httpAgent: agent,
        timeout: 20000,
      });

      const $ = load(response.data as string);
      const products: Product[] = [];

      // extract product details from the listing page
      $('.s-item').each((_, el) => {
        const title = $(el).find('.s-item__title').text().trim();
        const price = $(el).find('.s-item__price').text().trim();
        const link = $(el).find('a.s-item__link').attr('href');
        const imgEl = $(el).find('.s-item__image-wrapper img');
        const image = imgEl.attr('src') || imgEl.attr('data-src') || '-';

        if (title && !title.toLowerCase().includes('shop on ebay') && link) {
          products.push({ title, price, image, link });
        }
      });

      return products;
    } catch (error) {
      logger.error({
        message: 'Error scraping product list',
        error,
      });
      return [];
    }
  }

  private static async scrapeProductDetail(
    product: Product,
    retryCount = 0,
  ): Promise<Product> {
    try {
      logger.info({
        message: `Scraping product detail`,
        product,
      });

      // setup proxy and user-agent
      const proxy = rotateProxy();
      const agent = new HttpsProxyAgent(proxy);
      const response = await axios.get(product.link, {
        httpsAgent: agent,
        httpAgent: agent,
        timeout: 60000,
      });

      const html = response.data as string;
      const $ = load(html);

      // check for the Checking your browser protection
      if (
        $('title').text().includes('Pardon Our Interruption') ||
        html.includes('Checking your browser')
      ) {
        throw new Error('CHECKING_BROWSER');
      }

      // extract the iframe src to get the descripton page
      const iframeSrc = $('#desc_ifr').attr('src') || null;

      // scrape the description from the iframe src
      const description = iframeSrc
        ? await this.scrapeProductDescription(iframeSrc)
        : '-';

      // return the product detail
      return {
        ...product,
        description,
      };
    } catch (error: unknown) {
      // handle retry logic for the Checking your browser protection
      if (
        error instanceof Error &&
        error.message === 'CHECKING_BROWSER' &&
        retryCount < SERVER_CONFIG.MAX_RETRIES
      ) {
        logger.warn({
          message: `Checking your browser detected, retrying (${
            retryCount + 1
          }/${SERVER_CONFIG.MAX_RETRIES})`,
        });
        return this.scrapeProductDetail(product, retryCount + 1);
      }

      logger.error({
        message: 'Failed to scrape product detail',
        product,
        error,
      });

      return {
        ...product,
        description: '-',
      };
    }
  }

  private static async scrapeProductDescription(
    iframeSrc: string,
  ): Promise<string> {
    try {
      logger.info({
        message: 'Scraping product description from iframe',
        iframeSrc,
      });

      // setup proxy and user-agent
      const proxy = rotateProxy();
      const agent = new HttpsProxyAgent(proxy);
      const response = await axios.get(iframeSrc, {
        httpsAgent: agent,
        httpAgent: agent,
        timeout: 60000,
      });

      // cleanup the HTML content
      const html = response.data as string;
      const description = cleanupHtml(html);

      const description_summary =
        await DeepseekService.getDescriptionSummary(description);
      // return the cleaned description
      return description_summary;
    } catch (error: unknown) {
      logger.error({
        message: 'Failed to scrape product description from iframe',
        iframeSrc,
        error,
      });
      return '-';
    }
  }
}
