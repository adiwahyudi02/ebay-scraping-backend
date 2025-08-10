# eBay Scraping (Backend)

## Description

**This is an eBay scraper that allows you to search for products and view the results in json.**

This backend is designed to scrape eBay search results and return them to the frontend in real-time using Event Stream (Server-Sent Events, SSE).

You can check out the frontend here: [GitHub - ebay-scraping-frontend](https://github.com/adiwahyudi02/ebay-scraping-frontend)

**Server-Sent Events (SSE)**

Instead of sending a single bulk response after scraping is fully complete, this backend streams the results as they are found using Server-Sent Events (SSE). This means the client (frontend) starts receiving data immediately, without waiting for the entire scraping job to finish.

Because scraping can take a long time, streaming results improves the user experience by making the app feel faster. It also reduces server load since data is sent in one continuous connection, lowers latency by avoiding repeated requests, and simplifies frontend logic because it only needs to listen to the stream.

## API Specification

### GET `/api/scrape` — Server-Sent Events (SSE).

This endpoint initiates a scraping job based on the query parameters and streams results as they become available using

#### Query Parameter

| Query Parameter | Type    | Required | Description                                                                                              |
| --------------- | ------- | -------- | -------------------------------------------------------------------------------------------------------- |
| `search`        | string  | Yes      | The search keyword or phrase to scrape data for.                                                         |
| `page`          | number  | No       | Page number to start scraping from (default: 1).                                                         |
| `size`          | number  | No       | Number of items per page to scrape.                                                                      |
| `getAll`        | boolean | No       | If true, scrape all pages until data ends.                                                               |
| `scrapeDetails` | boolean | No       | If true, scrape additional detailed info (like description). **Caution: This will be take a long time!** |

---

#### Response Format

This endpoint streams data using Server-Sent Events (SSE). The response consists of multiple event types:

| Event Name | Description                             | Data Format                                      |
| ---------- | --------------------------------------- | ------------------------------------------------ |
| `meta`     | Metadata about the current scrape batch | JSON object with `page`, `size`, `total` numbers |
| `batch`    | A batch (array) of scraped products     | JSON array of `Product` objects                  |
| `done`     | Indicates scraping is finished          | String message (e.g., `"success"`)               |

##### Product Object

| Field         | Type    | Description                     |
| ------------- | ------- | ------------------------------- |
| `title`       | string  | Product title.                  |
| `price`       | string  | Product price as a string.      |
| `link`        | string  | URL link to the product page.   |
| `image`       | string  | URL link to the product image.  |
| `description` | string? | (Optional) Product description. |

---

#### Example Request

```http
GET /api/scrape?search=nike&page=1&size=10&getAll=false&scrapeDetails=true
Accept: text/event-stream
```

## Tech Stack

- Express includes with helmet + cors
- Scraping (axios + cheerio + https-proxy-agent)
- AI (openapi, gpt-3-encoder) use `openrouter.ai/deepseek/deepseek-r1-0528:free`
- Zod validation
- Winston logging
- Testing (jest + supertest)
- Typescript + eslint + prettier + husky

## Run the app

You can run locally with Node.js, or use Docker.

### Option 1: Local development

##### 1. Install Dependencies

```bash
  npm install
```

##### 2. Setup environments

Create a .env file in the root project by copying from the provided example file:

```bash
  cp .env.example .env
```

Then adjust the values to match your local setup. especially for `OPENROUTER_API_KEY` environment. You can create your `OPENROUTER_API_KEY` by signing up and generating an API key at OpenRouter's official site: https://openrouter.ai/signup

##### 3. Run the app

```bash
  # run in dev mode
  npm run dev

  # or build & start production build
  npm run build
  npm run start
```

### Option 2: With Docker

This project includes a `docker-compose.yml` that runs the `ebayebay-scraping-backend` image and the `ebay-scraping-frontend` image together.

Docker images are published automatically to GitHub Container Registry (GHCR) through the CI/CD pipeline.

> By default, in `docker-compose.yml` uses the `latest` tag for the images. Optionally you can change it by checking the available tags in the GitHub Packages registry.

##### 1. Setup configuration in `docker-compose.yml`

Then adjust the values to match your local setup. especially for `OPENROUTER_API_KEY` environment. You can create your `OPENROUTER_API_KEY` by signing up and generating an API key at OpenRouter's official site: https://openrouter.ai/signup

##### 2. Docker scripts

- To start the Apps (Backend & Frontend)

```bash
   docker compose up

   # After that you can access the app in http://localhost:3000
```

- To stop and remove the containers:

```bash
   docker compose down
```

## Run Test

```bash
  npm run test
```

## Run Linter

```bash
  npm run lint
```

## Run Formater

```bash
  npm run format
```
