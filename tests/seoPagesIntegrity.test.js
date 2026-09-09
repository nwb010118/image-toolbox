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

const TRUST_PAGES = ['about.html', 'contact.html'];

TRUST_PAGES.forEach(function (file) {
  test(file + ' exists and has required <head> tags', function () {
    const html = readRepoFile(file);
    assert.ok(/<title>[^<]+<\/title>/.test(html), 'missing <title>');
    assert.ok(html.includes('rel="canonical"'), 'missing canonical link');
    assert.ok(html.includes('property="og:title"'), 'missing og:title');
  });
});

test('about.html has valid AboutPage JSON-LD', function () {
  const html = readRepoFile('about.html');
  const types = extractJsonLdBlocks(html).map(function (b) { return b['@type']; });
  assert.ok(types.includes('AboutPage'), 'missing AboutPage block');
});

test('contact.html has valid ContactPage JSON-LD', function () {
  const html = readRepoFile('contact.html');
  const types = extractJsonLdBlocks(html).map(function (b) { return b['@type']; });
  assert.ok(types.includes('ContactPage'), 'missing ContactPage block');
});

test('contact.html includes a mailto link to the contact email', function () {
  const html = readRepoFile('contact.html');
  assert.ok(html.includes('mailto:nwb010118@gmail.com'), 'missing mailto link');
});

test('about.html links to contact.html', function () {
  const html = readRepoFile('about.html');
  assert.ok(html.includes('href="contact.html"'), 'about.html missing link to contact.html');
});

test('contact.html links to about.html', function () {
  const html = readRepoFile('contact.html');
  assert.ok(html.includes('href="about.html"'), 'contact.html missing link to about.html');
});

test('about.html and contact.html footers link to privacy.html', function () {
  ['about.html', 'contact.html'].forEach(function (file) {
    const html = readRepoFile(file);
    assert.ok(html.includes('href="privacy.html"'), file + ' footer missing link to privacy.html');
  });
});

const ALL_PAGES = [
  'index.html', 'pdf.html', 'upscale.html', 'guide.html', 'privacy.html',
  'photos-to-pdf.html', 'pdf-to-word.html', 'pdf-to-ppt.html', 'about.html', 'contact.html'
];

ALL_PAGES.forEach(function (file) {
  test(file + ' footer links to About and 문의 (except its own page)', function () {
    const html = readRepoFile(file);
    if (file !== 'about.html') {
      assert.ok(html.includes('href="about.html"'), file + ' footer missing link to about.html');
    }
    if (file !== 'contact.html') {
      assert.ok(html.includes('href="contact.html"'), file + ' footer missing link to contact.html');
    }
  });
});

test('sitemap.xml includes about.html and contact.html', function () {
  const xml = readRepoFile('sitemap.xml');
  ['about.html', 'contact.html'].forEach(function (page) {
    assert.ok(xml.includes('/image-toolbox/' + page), 'sitemap.xml missing ' + page);
  });
});

test('privacy.html points to contact.html instead of GitHub Issues for policy inquiries', function () {
  const html = readRepoFile('privacy.html');
  assert.ok(html.includes('href="contact.html"'), 'privacy.html missing link to contact.html in its inquiry section');
});

test('index.html has the compression-mechanics content sections', function () {
  const html = readRepoFile('index.html');
  assert.ok(html.includes('<h2>압축은 어떻게 동작하나요</h2>'), 'missing 압축은 어떻게 동작하나요 section');
  assert.ok(html.includes('<h2>어떤 형식을 골라야 할까요</h2>'), 'missing 어떤 형식을 골라야 할까요 section');
});

test('upscale.html has the AI-upscaling mechanics content sections', function () {
  const html = readRepoFile('upscale.html');
  assert.ok(html.includes('<h2>AI 업스케일링은 어떻게 동작하나요</h2>'), 'missing AI 업스케일링은 어떻게 동작하나요 section');
  assert.ok(html.includes('<h2>언제 필요한가요</h2>'), 'missing 언제 필요한가요 section');
});

test('pdf.html has the tool-overview content section linking to all 3 long-tail pages', function () {
  const html = readRepoFile('pdf.html');
  assert.ok(html.includes('<h2>이 도구로 무엇을 할 수 있나요</h2>'), 'missing 이 도구로 무엇을 할 수 있나요 section');
  ['photos-to-pdf.html', 'pdf-to-word.html', 'pdf-to-ppt.html'].forEach(function (page) {
    assert.ok(html.includes('href="' + page + '"'), 'pdf.html missing link to ' + page);
  });
});

test('benchmark.html exists and has required <head> tags', function () {
  const html = readRepoFile('benchmark.html');
  assert.ok(/<title>[^<]+<\/title>/.test(html), 'missing <title>');
  assert.ok(html.includes('rel="canonical"'), 'missing canonical link');
  assert.ok(html.includes('property="og:title"'), 'missing og:title');
});

test('benchmark.html has valid Article JSON-LD', function () {
  const html = readRepoFile('benchmark.html');
  const types = extractJsonLdBlocks(html).map(function (b) { return b['@type']; });
  assert.ok(types.includes('Article'), 'missing Article block');
});

test('benchmark.html links back to index.html', function () {
  const html = readRepoFile('benchmark.html');
  assert.ok(html.includes('href="index.html"'), 'benchmark.html missing link to index.html');
});

test('benchmark.html contains the measured photo-image byte values', function () {
  const html = readRepoFile('benchmark.html');
  assert.ok(html.includes('1,808,456'), 'missing original photo-image size');
  assert.ok(html.includes('787,571'), 'missing JPG 100% photo result');
  assert.ok(html.includes('115,393'), 'missing JPG 80% photo result');
});

test('benchmark.html contains the measured graphic-image byte values', function () {
  const html = readRepoFile('benchmark.html');
  assert.ok(html.includes('22,791'), 'missing original graphic-image size');
  assert.ok(html.includes('35,171'), 'missing JPG 100% graphic result (larger than original)');
  assert.ok(html.includes('6,010'), 'missing WebP 100% graphic result');
});

test('index.html links to benchmark.html', function () {
  const html = readRepoFile('index.html');
  assert.ok(html.includes('href="benchmark.html"'), 'index.html missing link to benchmark.html');
});

test('guide.html links to benchmark.html', function () {
  const html = readRepoFile('guide.html');
  assert.ok(html.includes('href="benchmark.html"'), 'guide.html missing link to benchmark.html');
});

test('sitemap.xml includes benchmark.html', function () {
  const xml = readRepoFile('sitemap.xml');
  assert.ok(xml.includes('/image-toolbox/benchmark.html'), 'sitemap.xml missing benchmark.html');
});

const GUIDE_ARTICLES = [
  'kakao-photo-quality.html',
  'email-attachment-size.html',
  'image-format-comparison.html',
  'photo-id-resize.html',
  'ai-upscaling-limits.html'
];

GUIDE_ARTICLES.forEach(function (file) {
  test(file + ' exists and has required <head> tags', function () {
    const html = readRepoFile(file);
    assert.ok(/<title>[^<]+<\/title>/.test(html), 'missing <title>');
    assert.ok(html.includes('rel="canonical"'), 'missing canonical link');
    assert.ok(html.includes('property="og:title"'), 'missing og:title');
  });

  test(file + ' has valid Article JSON-LD', function () {
    const html = readRepoFile(file);
    const types = extractJsonLdBlocks(html).map(function (b) { return b['@type']; });
    assert.ok(types.includes('Article'), 'missing Article block');
  });

  test(file + ' footer links to privacy/about/contact', function () {
    const html = readRepoFile(file);
    assert.ok(html.includes('href="privacy.html"'), file + ' footer missing privacy.html link');
    assert.ok(html.includes('href="about.html"'), file + ' footer missing about.html link');
    assert.ok(html.includes('href="contact.html"'), file + ' footer missing contact.html link');
  });

  test(file + ' is linked from guide.html', function () {
    const guideHtml = readRepoFile('guide.html');
    assert.ok(guideHtml.includes('href="' + file + '"'), 'guide.html missing link to ' + file);
  });

  test(file + ' is listed in sitemap.xml', function () {
    const xml = readRepoFile('sitemap.xml');
    assert.ok(xml.includes('/image-toolbox/' + file), 'sitemap.xml missing ' + file);
  });
});

test('email-attachment-size.html contains the verified size limits', function () {
  const html = readRepoFile('email-attachment-size.html');
  assert.ok(html.includes('25MB'), 'missing Gmail 25MB limit');
  assert.ok(html.includes('10MB'), 'missing Naver 10MB base limit');
  assert.ok(html.includes('2GB'), 'missing Naver large-attachment 2GB limit');
  assert.ok(html.includes('4GB'), 'missing Daum large-attachment 4GB limit');
});

test('photo-id-resize.html contains the verified photo spec numbers', function () {
  const html = readRepoFile('photo-id-resize.html');
  assert.ok(html.includes('35') && html.includes('45'), 'missing 35x45mm spec');
  assert.ok(html.includes('413') && html.includes('531'), 'missing 413x531px spec');
  assert.ok(html.includes('300'), 'missing 300DPI spec');
});

test('image-format-comparison.html cites benchmark.html data instead of duplicating measurement', function () {
  const html = readRepoFile('image-format-comparison.html');
  assert.ok(html.includes('href="benchmark.html"'), 'missing link to benchmark.html');
});

test('ai-upscaling-limits.html links to and from upscale.html', function () {
  const article = readRepoFile('ai-upscaling-limits.html');
  const upscalePage = readRepoFile('upscale.html');
  assert.ok(article.includes('href="upscale.html"'), 'ai-upscaling-limits.html missing link to upscale.html');
  assert.ok(upscalePage.includes('href="ai-upscaling-limits.html"'), 'upscale.html missing link to ai-upscaling-limits.html');
});

test('benchmark.html links to image-format-comparison.html', function () {
  const html = readRepoFile('benchmark.html');
  assert.ok(html.includes('href="image-format-comparison.html"'), 'benchmark.html missing link to image-format-comparison.html');
});
