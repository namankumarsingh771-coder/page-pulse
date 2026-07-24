const test = require('node:test');
const assert = require('node:assert/strict');
const { isValidUrl, countWords, parsePage } = require('../lib/parser');

test('parsePage: happy path extracts all fields from a well-formed page', () => {
    const html = `
    <html>
      <head>
        <title>  My Test Page  </title>
        <meta name="description" content="A page used for testing." />
      </head>
      <body>
        <h1>Welcome</h1>
        <img src="a.png" alt="a nice photo" />
        <img src="b.png" alt="" />
        <img src="c.png" />
        <p>Hello world this is some body text</p>
      </body>
    </html>
  `;

    const report = parsePage(html);

    assert.equal(report.title, 'My Test Page');
    assert.equal(report.metaDescription, 'A page used for testing.');
    assert.equal(report.h1Count, 1);
    assert.equal(report.totalImages, 3);
    assert.equal(report.imagesMissingAlt, 2);
    assert.equal(report.wordCount, 8);
});

test('parsePage: failure case - empty HTML returns safe defaults, never throws', () => {
    assert.doesNotThrow(() => parsePage(''));
    assert.doesNotThrow(() => parsePage(null));
    assert.doesNotThrow(() => parsePage(undefined));

    const report = parsePage('');

    assert.equal(report.title, null);
    assert.equal(report.metaDescription, null);
    assert.equal(report.h1Count, 0);
    assert.equal(report.totalImages, 0);
    assert.equal(report.imagesMissingAlt, 0);
    assert.equal(report.wordCount, 0);
});

test('parsePage: failure case - malformed HTML with unclosed tags does not crash', () => {
    const brokenHtml = '<html><head><title>Broken<body><h1>Oops<p>no closing tags';

    assert.doesNotThrow(() => parsePage(brokenHtml));

    const report = parsePage(brokenHtml);
    assert.equal(typeof report.h1Count, 'number');
    assert.ok(report.h1Count >= 0);
    assert.equal(typeof report.wordCount, 'number');
});

test('isValidUrl: accepts well-formed http/https URLs', () => {
    assert.equal(isValidUrl('https://example.com'), true);
    assert.equal(isValidUrl('http://example.com/path?query=1'), true);
});

test('isValidUrl: rejects invalid or non-http(s) input', () => {
    assert.equal(isValidUrl('not-a-url'), false);
    assert.equal(isValidUrl(''), false);
    assert.equal(isValidUrl('ftp://example.com'), false);
    assert.equal(isValidUrl('javascript:alert(1)'), false);
});

test('countWords: counts whitespace-separated words correctly', () => {
    assert.equal(countWords('one two three'), 3);
    assert.equal(countWords('  padded   with   spaces  '), 3);
    assert.equal(countWords(''), 0);
    assert.equal(countWords('   '), 0);
});