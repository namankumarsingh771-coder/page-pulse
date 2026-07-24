const cheerio = require('cheerio');

function isValidUrl(str) {
    try {
        const u = new URL(str);
        return u.protocol === 'http:' || u.protocol === 'https:';
    } catch {
        return false;
    }
}

function countWords(text) {
    const trimmed = (text || '').trim();
    if (!trimmed) return 0;
    return trimmed.split(/\s+/).length;
}

function parsePage(html) {
    const $ = cheerio.load(html || '');

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

    return {
        title,
        metaDescription,
        h1Count,
        totalImages: images.length,
        imagesMissingAlt,
        wordCount
    };
}

module.exports = { isValidUrl, countWords, parsePage };