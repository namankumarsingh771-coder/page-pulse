const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function isValidUrl(str) {
    try {
        const u = new URL(str);
        return u.protocol === 'http:' || u.protocol === 'https:';
    } catch {
        return false;
    }
}

function countWords(text) {
    const trimmed = text.trim();
    if (!trimmed) return 0;
    return trimmed.split(/\s+/).length;
}

app.post('/audit', async (req, res) => {
    const { url } = req.body || {};

    if (!url || typeof url !== 'string' || !isValidUrl(url)) {
        return res.status(400).json({
            error: 'INVALID_URL',
            message: 'Please provide a valid http(s) URL, e.g. https://example.com'
        });
    }

    const start = Date.now();

    try {
        const response = await axios.get(url, {
            timeout: 8000,
            maxRedirects: 5,
            validateStatus: () => true,
            headers: {
                'User-Agent': 'PagePulse-Auditor/1.0 (+https://digitalheroesco.com)'
            }
        });

        const responseTime = Date.now() - start;
        const contentType = response.headers['content-type'] || '';

        if (!contentType.includes('text/html')) {
            return res.status(415).json({
                error: 'NOT_HTML',
                message: `Expected an HTML page but got content-type "${contentType || 'unknown'}"`,
                httpStatus: response.status,
                responseTimeMs: responseTime
            });
        }

        const $ = cheerio.load(response.data);

        const title = $('title').first().text().trim() || null;
        const metaDescription =
            $('meta[name="description"]').attr('content') ||
            $('meta[property="og:description"]').attr('content') ||
            null;

        const h1Count = $('h1').length;

        const images = $('img');
        let imagesMissingAlt = 0;
        images.each((_, el) => {
            const alt = $(el).attr('alt');
            if (alt === undefined || alt.trim() === '') imagesMissingAlt++;
        });

        const bodyText = $('body').text();
        const wordCount = countWords(bodyText);

        return res.status(200).json({
            url,
            httpStatus: response.status,
            responseTimeMs: responseTime,
            title,
            metaDescription,
            h1Count,
            totalImages: images.length,
            imagesMissingAlt,
            wordCount
        });
    } catch (err) {
        const responseTime = Date.now() - start;

        if (err.code === 'ECONNABORTED') {
            return res.status(408).json({
                error: 'TIMEOUT',
                message: 'The page took too long to respond (timeout after 8s).',
                responseTimeMs: responseTime
            });
        }

        if (err.code === 'ENOTFOUND' || err.code === 'EAI_AGAIN') {
            return res.status(400).json({
                error: 'DNS_ERROR',
                message: 'Could not resolve that domain. Double-check the URL.'
            });
        }

        if (err.code === 'ECONNREFUSED') {
            return res.status(502).json({
                error: 'CONNECTION_REFUSED',
                message: 'The server refused the connection.'
            });
        }

        console.error('Unexpected /audit error:', err.message);
        return res.status(500).json({
            error: 'UNKNOWN_ERROR',
            message: 'Something went wrong while auditing this URL.'
        });
    }
});

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => {
    console.log(`Page Pulse running on port ${PORT}`);
});