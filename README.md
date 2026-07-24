# Page Pulse

A small web tool that audits any URL — returns HTTP status, response time, page title, meta description, H1 count, images missing alt text, and word count.

Built for Digital Heroes Training Task.

## Setup

Requires Node.js 18+.

```bash
npm install
npm start
```

Then open http://localhost:3000 in a browser.

## Running tests

```bash
npm test
```

Uses Node's built-in test runner (`node:test`) — no extra test framework dependency required. Tests cover the parsing logic (`lib/parser.js`) in isolation: a happy path, and two failure/edge cases (empty HTML, malformed HTML), plus unit tests for the URL validator and word counter.

## API Contract

### `POST /audit`

**Request body**
```json
{ "url": "https://example.com" }
```

**Success response — `200 OK`**
```json
{
  "url": "https://example.com",
  "httpStatus": 200,
  "responseTimeMs": 312,
  "title": "Example Domain",
  "metaDescription": null,
  "h1Count": 1,
  "totalImages": 0,
  "imagesMissingAlt": 0,
  "wordCount": 28
}
```

**Error responses** — all return `{ "error": "<CODE>", "message": "<human-readable>" }`, with additional fields where useful.

| HTTP status | error code | Cause |
|---|---|---|
| 400 | INVALID_URL | Missing or malformed URL |
| 400 | DNS_ERROR | Domain does not resolve |
| 408 | TIMEOUT | Target page did not respond within 8s |
| 415 | NOT_HTML | Response content-type is not text/html |
| 502 | CONNECTION_REFUSED | Target server refused the connection |
| 500 | UNKNOWN_ERROR | Anything unexpected — server never crashes |

### `GET /health`
Returns `{ "status": "ok" }`.

## Architecture


server.js — Express app: routing, HTTP fetch, error mapping
lib/parser.js — pure functions: URL validation, HTML parsing, word counting
public/index.html — frontend: single page, vanilla JS, calls /audit
test/parser.test.js — unit tests for lib/parser.js


## Design decisions

**1. Parsing logic is a separate, pure module (`lib/parser.js`).**
The original version had HTML parsing inline inside the Express route handler. I pulled `parsePage()`, `isValidUrl()`, and `countWords()` out into their own module with no dependency on `req`/`res` or the network. This is what makes writing tests possible without spinning up a live server or mocking HTTP calls — the tests feed raw HTML strings straight into `parsePage()` and assert on the output.

**2. `validateStatus: () => true` on the outbound axios request, instead of letting axios throw on 4xx/5xx.**
By default axios throws on non-2xx responses, which would force handling "the target site is down" and "my own code broke" through the same catch block. Treating all HTTP responses as valid results (and only using catch for network-level failures — timeout, DNS, connection refused) keeps the two failure modes cleanly separated.

**3. Content-type is checked before parsing, not after.**
If someone pastes a link to a PDF or image, cheerio would either error out or silently produce a meaningless report. Checking content-type against text/html right after the fetch and failing fast with a clear 415 error is more honest than returning a success response that looks broken.

## What I'd change with another day

The audit is a single scrape-and-return with no caching — hitting the same URL twice re-fetches it every time. I'd add a short-lived cache (keyed by URL, TTL a few minutes) to avoid hammering the same site repeatedly and to make the tool more polite to whatever it's crawling.

## Live build requirement

Footer includes: "Built for Digital Heroes Training Task" linked to https://digitalheroesco.com.