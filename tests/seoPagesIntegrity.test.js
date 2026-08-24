const fs = require('fs');
const path = require('path');
const assert = require('assert');

function test(name, fn) {
  try {
    fn();
    console.log('PASS: ' + name);
  } catch (err) {
    console.error('FAIL: ' + name);
    console.error(err.message);
    process.exitCode = 1;
  }
}

function readRepoFile(relPath) {
  return fs.readFileSync(path.join(__dirname, '..', relPath), 'utf8');
}

function extractJsonLdBlocks(html) {
  const blocks = [];
  const re = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    blocks.push(JSON.parse(m[1]));
  }
  return blocks;
}

const PAGES = [
  {
    file: 'photos-to-pdf.html',
    ctaHref: 'pdf.html#imgToPdfUploadArea',
    relatedLinks: ['pdf-to-word.html', 'pdf-to-ppt.html', 'pdf.html']
  },
  {
    file: 'pdf-to-word.html',
    ctaHref: 'pdf.html#pdfConvertUploadArea',
    relatedLinks: ['pdf-to-ppt.html', 'photos-to-pdf.html', 'pdf.html']
  },
  {
    file: 'pdf-to-ppt.html',
    ctaHref: 'pdf.html#pdfConvertUploadArea',
    relatedLinks: ['pdf-to-word.html', 'photos-to-pdf.html', 'pdf.html']
  }
];

PAGES.forEach(function (page) {
  test(page.file + ' exists and has required <head> tags', function () {
    const html = readRepoFile(page.file);
    assert.ok(/<title>[^<]+<\/title>/.test(html), 'missing <title>');
    assert.ok(html.includes('rel="canonical"'), 'missing canonical link');
    assert.ok(html.includes('property="og:title"'), 'missing og:title');
  });

  test(page.file + ' has valid HowTo and FAQPage JSON-LD', function () {
    const html = readRepoFile(page.file);
    const blocks = extractJsonLdBlocks(html);
    const types = blocks.map(function (b) { return b['@type']; });
    assert.ok(types.includes('HowTo'), 'missing HowTo block');
    assert.ok(types.includes('FAQPage'), 'missing FAQPage block');
  });

  test(page.file + ' CTA links to an anchor that exists in pdf.html', function () {
    const html = readRepoFile(page.file);
    assert.ok(html.includes('href="' + page.ctaHref + '"'), 'missing CTA href=' + page.ctaHref);
    const anchorId = page.ctaHref.split('#')[1];
    const pdfHtml = readRepoFile('pdf.html');
    assert.ok(pdfHtml.includes('id="' + anchorId + '"'), 'pdf.html missing id=' + anchorId);
  });

  test(page.file + ' links to all related pages that exist on disk', function () {
    const html = readRepoFile(page.file);
    page.relatedLinks.forEach(function (rel) {
      assert.ok(html.includes('href="' + rel + '"'), 'missing link to ' + rel);
      assert.ok(fs.existsSync(path.join(__dirname, '..', rel)), rel + ' does not exist on disk');
    });
  });
});

test('pdf.html links to photos-to-pdf.html', function () {
  const html = readRepoFile('pdf.html');
  assert.ok(html.includes('href="photos-to-pdf.html"'), 'pdf.html missing link to photos-to-pdf.html');
});

test('pdf.html links to pdf-to-word.html and pdf-to-ppt.html', function () {
  const html = readRepoFile('pdf.html');
  assert.ok(html.includes('href="pdf-to-word.html"'), 'pdf.html missing link to pdf-to-word.html');
  assert.ok(html.includes('href="pdf-to-ppt.html"'), 'pdf.html missing link to pdf-to-ppt.html');
});

test('guide.html links to photos-to-pdf.html', function () {
  const html = readRepoFile('guide.html');
  assert.ok(html.includes('href="photos-to-pdf.html"'), 'guide.html missing link to photos-to-pdf.html');
});

test('sitemap.xml includes the 3 new pages', function () {
  const xml = readRepoFile('sitemap.xml');
  ['photos-to-pdf.html', 'pdf-to-word.html', 'pdf-to-ppt.html'].forEach(function (page) {
    assert.ok(xml.includes('/image-toolbox/' + page), 'sitemap.xml missing ' + page);
  });
});
