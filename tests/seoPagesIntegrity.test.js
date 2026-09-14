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

const GUIDE_ARTICLES_ROUND2 = [
  'web-image-loading-speed.html',
  'cloud-storage-photo-tips.html',
  'pdf-file-size-reduction.html',
  'sns-blog-image-size.html',
  'favicon-og-image-size.html'
];

GUIDE_ARTICLES_ROUND2.forEach(function (file) {
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

test('web-image-loading-speed.html contains the verified Core Web Vitals LCP thresholds', function () {
  const html = readRepoFile('web-image-loading-speed.html');
  assert.ok(html.includes('2.5'), 'missing LCP good threshold 2.5s');
  assert.ok(html.includes('4.0') || html.includes('4초'), 'missing LCP poor threshold 4.0s');
});

test('cloud-storage-photo-tips.html contains the verified free storage capacities', function () {
  const html = readRepoFile('cloud-storage-photo-tips.html');
  assert.ok(html.includes('15GB'), 'missing Google Drive 15GB');
  assert.ok(html.includes('30GB'), 'missing Naver MYBOX 30GB');
  assert.ok(html.includes('5GB'), 'missing iCloud/OneDrive 5GB');
});

test('pdf-file-size-reduction.html honestly states the tool cannot compress PDF directly', function () {
  const html = readRepoFile('pdf-file-size-reduction.html');
  assert.ok(html.includes('PDF 자체') || html.includes('PDF 파일 자체'), 'missing honest disclosure about PDF compression limitation');
  assert.ok(html.includes('href="index.html"'), 'missing link to image compression tool for the workaround');
  assert.ok(html.includes('href="pdf.html"'), 'missing link to pdf.html for the workaround');
});

test('pdf-file-size-reduction.html is linked from pdf.html FAQ', function () {
  const pdfHtml = readRepoFile('pdf.html');
  assert.ok(pdfHtml.includes('href="pdf-file-size-reduction.html"'), 'pdf.html FAQ missing link to pdf-file-size-reduction.html');
});

test('sns-blog-image-size.html contains the verified Instagram and Naver Blog dimensions', function () {
  const html = readRepoFile('sns-blog-image-size.html');
  assert.ok(html.includes('1080') && html.includes('1350'), 'missing Instagram feed 1080x1350');
  assert.ok(html.includes('1300') && html.includes('885'), 'missing Naver Blog thumbnail 1300x885');
});

test('favicon-og-image-size.html contains the verified favicon/touch-icon/og:image dimensions', function () {
  const html = readRepoFile('favicon-og-image-size.html');
  assert.ok(html.includes('180'), 'missing Apple touch icon 180x180');
  assert.ok(html.includes('192') && html.includes('512'), 'missing Android/PWA 192/512');
  assert.ok(html.includes('1200') && html.includes('630'), 'missing og:image 1200x630');
});

test('guide.html section 1 is restructured as a list and keeps all round 1 + round 2 links', function () {
  const html = readRepoFile('guide.html');
  assert.ok(/<h2>1\. [^<]*<\/h2>[\s\S]*?<ul>[\s\S]*?<\/ul>[\s\S]*?<h2>2\. /.test(html), 'guide.html section 1 is not restructured as a list with a <ul> before section 2');
  const mustKeepLinks = [
    'kakao-photo-quality.html',
    'email-attachment-size.html',
    'image-format-comparison.html',
    'photo-id-resize.html',
    'ai-upscaling-limits.html',
    'web-image-loading-speed.html',
    'cloud-storage-photo-tips.html',
    'sns-blog-image-size.html',
    'favicon-og-image-size.html'
  ];
  mustKeepLinks.forEach(function (link) {
    assert.ok(html.includes('href="' + link + '"'), 'guide.html missing link to ' + link);
  });
});

const GUIDE_ARTICLES_ROUND3 = [
  'iphone-heic-photo-guide.html',
  'monitor-resolution-wallpaper-size.html',
  'youtube-thumbnail-size.html',
  'old-photo-scan-digitize-workflow.html',
  'print-resolution-dpi-guide.html',
  'pdf-merge-multiple-files.html'
];

GUIDE_ARTICLES_ROUND3.forEach(function (file) {
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

test('iphone-heic-photo-guide.html states the iPhone setting path and this site does not accept HEIC directly', function () {
  const html = readRepoFile('iphone-heic-photo-guide.html');
  assert.ok(html.includes('카메라') && html.includes('포맷') && html.includes('호환성 우선'), 'missing iPhone setting path (설정 → 카메라 → 포맷 → 호환성 우선)');
  assert.ok(html.includes('HEIC'), 'missing HEIC mention');
  assert.ok(html.includes('href="index.html"'), 'missing link to compression tool for the after-conversion step');
});

test('monitor-resolution-wallpaper-size.html contains the verified FHD/QHD/4K resolutions and the upscale reachability facts', function () {
  const html = readRepoFile('monitor-resolution-wallpaper-size.html');
  assert.ok(html.includes('1920') && html.includes('1080'), 'missing FHD 1920x1080');
  assert.ok(html.includes('2560') && html.includes('1440'), 'missing QHD 2560x1440');
  assert.ok(html.includes('3840') && html.includes('2160'), 'missing 4K 3840x2160');
  assert.ok(html.includes('1000'), 'missing upscale tool input limit (1000px)');
  assert.ok(html.includes('href="upscale.html"'), 'missing link to upscale.html');
});

test('youtube-thumbnail-size.html contains the official current spec, not the outdated 1280x720 folklore figure', function () {
  const html = readRepoFile('youtube-thumbnail-size.html');
  assert.ok(html.includes('3840') && html.includes('2160'), 'missing official recommended resolution 3840x2160');
  assert.ok(html.includes('640'), 'missing minimum width 640px');
  assert.ok(html.includes('16:9'), 'missing 16:9 aspect ratio');
  assert.ok(html.includes('2MB'), 'missing mobile 2MB file size limit');
  assert.ok(html.includes('50MB'), 'missing desktop 50MB file size limit');
});

test('old-photo-scan-digitize-workflow.html contains the verified scan DPI recommendations and links both tools', function () {
  const html = readRepoFile('old-photo-scan-digitize-workflow.html');
  assert.ok(html.includes('300') && html.includes('600'), 'missing 300/600 DPI scan recommendation');
  assert.ok(html.includes('href="index.html"'), 'missing link to compression tool');
  assert.ok(html.includes('href="upscale.html"'), 'missing link to upscale tool');
});

test('print-resolution-dpi-guide.html contains the DPI formula and both print-quality thresholds', function () {
  const html = readRepoFile('print-resolution-dpi-guide.html');
  assert.ok(html.includes('300'), 'missing 300DPI print standard');
  assert.ok(html.includes('150') && html.includes('200'), 'missing 150-200DPI large-format threshold');
  assert.ok(html.includes('2.54'), 'missing inch-to-cm conversion constant');
});

test('pdf-merge-multiple-files.html honestly states PDF+PDF merge is unsupported and names the 50-image bottleneck', function () {
  const html = readRepoFile('pdf-merge-multiple-files.html');
  assert.ok(html.includes('병합') && html.includes('없습니다'), 'missing honest disclosure that PDF+PDF merge is unsupported');
  assert.ok(html.includes('href="pdf.html"'), 'missing link to pdf.html for the extraction step');
  assert.ok(html.includes('href="photos-to-pdf.html"'), 'missing link to photos-to-pdf.html for the re-merge step');
  assert.ok(html.includes('50'), 'missing mention of the 50-image batch limit bottleneck');
});

test('pdf-merge-multiple-files.html is linked from pdf.html FAQ', function () {
  const pdfHtml = readRepoFile('pdf.html');
  assert.ok(pdfHtml.includes('href="pdf-merge-multiple-files.html"'), 'pdf.html FAQ missing link to pdf-merge-multiple-files.html');
});

test('upscale.html links to monitor-resolution-wallpaper-size.html and old-photo-scan-digitize-workflow.html', function () {
  const html = readRepoFile('upscale.html');
  assert.ok(html.includes('href="monitor-resolution-wallpaper-size.html"'), 'upscale.html missing link to monitor-resolution-wallpaper-size.html');
  assert.ok(html.includes('href="old-photo-scan-digitize-workflow.html"'), 'upscale.html missing link to old-photo-scan-digitize-workflow.html');
});

test('css/style.css defines .guide-image classes', function () {
  const css = readRepoFile('css/style.css');
  assert.ok(css.includes('.guide-image {'), 'missing .guide-image rule');
  assert.ok(css.includes('.guide-image img'), 'missing .guide-image img rule');
  assert.ok(css.includes('.guide-image svg'), 'missing .guide-image svg rule');
  assert.ok(css.includes('.guide-image figcaption'), 'missing .guide-image figcaption rule');
});

test('kakao-photo-quality.html has a guide image with alt text', function () {
  const html = readRepoFile('kakao-photo-quality.html');
  assert.ok(html.includes('<figure class="guide-image">'), 'missing guide-image figure');
  const imgMatch = html.match(/<img[^>]*src="images\/tool-quality-slider\.png"[^>]*>/);
  assert.ok(imgMatch, 'missing tool-quality-slider.png image tag');
  assert.ok(/alt="[^"]+"/.test(imgMatch[0]), 'image missing non-empty alt text');
  assert.ok(/<figcaption>[^<]+<\/figcaption>/.test(html), 'missing figcaption');
});

test('images/tool-quality-slider.png exists on disk', function () {
  assert.ok(fs.existsSync(path.join(__dirname, '..', 'images', 'tool-quality-slider.png')), 'tool-quality-slider.png missing from images/');
});

test('photo-id-resize.html has a guide image with alt text', function () {
  const html = readRepoFile('photo-id-resize.html');
  assert.ok(html.includes('<figure class="guide-image">'), 'missing guide-image figure');
  const imgMatch = html.match(/<img[^>]*src="images\/tool-resize-413x531\.png"[^>]*>/);
  assert.ok(imgMatch, 'missing tool-resize-413x531.png image tag');
  assert.ok(/alt="[^"]+"/.test(imgMatch[0]), 'image missing non-empty alt text');
  assert.ok(/<figcaption>[^<]+<\/figcaption>/.test(html), 'missing figcaption');
});

test('images/tool-resize-413x531.png exists on disk', function () {
  assert.ok(fs.existsSync(path.join(__dirname, '..', 'images', 'tool-resize-413x531.png')), 'tool-resize-413x531.png missing from images/');
});

test('email-attachment-size.html has an inline SVG chart with correct capacity figures', function () {
  const html = readRepoFile('email-attachment-size.html');
  assert.ok(html.includes('<figure class="guide-image">'), 'missing guide-image figure');
  assert.ok(/<svg[^>]*role="img"/.test(html), 'missing inline svg chart');
  ['25MB', '10MB'].forEach(function (val) {
    assert.ok(html.includes(val), 'chart missing value ' + val);
  });
  assert.ok(/<figcaption>[^<]+<\/figcaption>/.test(html), 'missing figcaption');
});

test('image-format-comparison.html has inline SVG charts with exact benchmark figures', function () {
  const html = readRepoFile('image-format-comparison.html');
  const svgCount = (html.match(/<svg/g) || []).length;
  assert.ok(svgCount >= 2, 'expected at least 2 inline SVG charts, found ' + svgCount);
  ['22,791', '35,171', '6,010', '93.6%', '93.2%'].forEach(function (val) {
    assert.ok(html.includes(val), 'missing figure value ' + val);
  });
  const figureCount = (html.match(/<figure class="guide-image">/g) || []).length;
  assert.ok(figureCount >= 2, 'expected at least 2 guide-image figures, found ' + figureCount);
});

test('ai-upscaling-limits.html has before/after upscale screenshot', function () {
  const html = readRepoFile('ai-upscaling-limits.html');
  assert.ok(html.includes('<figure class="guide-image">'), 'missing guide-image figure');
  const imgMatch = html.match(/<img[^>]*src="images\/upscale-before-after\.png"[^>]*>/);
  assert.ok(imgMatch, 'missing img tag for upscale-before-after.png');
  assert.ok(/alt="[^"]+"/.test(imgMatch[0]), 'image missing non-empty alt text');
  assert.ok(/<figcaption>[^<]+<\/figcaption>/.test(html), 'missing figcaption');
});

test('images/upscale-before-after.png exists on disk', function () {
  assert.ok(fs.existsSync(path.join(__dirname, '..', 'images', 'upscale-before-after.png')), 'upscale-before-after.png missing from images/');
});

test('web-image-loading-speed.html has an inline LCP threshold chart', function () {
  const html = readRepoFile('web-image-loading-speed.html');
  assert.ok(html.includes('<figure class="guide-image">'), 'missing guide-image figure');
  assert.ok(/<svg[^>]*role="img"/.test(html), 'missing inline svg chart');
  assert.ok(html.includes('그림으로 보는 LCP 구간: 2.5초까지 좋음, 4.0초까지 개선 필요, 4.0초 초과는 나쁨'), 'missing unique chart desc sentence');
  assert.ok(/<figcaption>[^<]+<\/figcaption>/.test(html), 'missing figcaption');
});

test('cloud-storage-photo-tips.html has an inline storage capacity chart', function () {
  const html = readRepoFile('cloud-storage-photo-tips.html');
  assert.ok(html.includes('<figure class="guide-image">'), 'missing guide-image figure');
  assert.ok(/<svg[^>]*role="img"/.test(html), 'missing inline svg chart');
  assert.ok(html.includes('서비스별 무료 저장공간 막대그래프: 구글 드라이브 15기가바이트, 아이클라우드 5기가바이트, 원드라이브 5기가바이트, 네이버 마이박스 30기가바이트'), 'missing unique chart desc sentence');
  assert.ok(/<figcaption>[^<]+<\/figcaption>/.test(html), 'missing figcaption');
});

test('pdf-file-size-reduction.html has the real PDF-to-image extraction screenshot', function () {
  const html = readRepoFile('pdf-file-size-reduction.html');
  assert.ok(html.includes('<figure class="guide-image">'), 'missing guide-image figure');
  const imgMatch = html.match(/<img[^>]*src="images\/tool-pdf-extract\.png"[^>]*>/);
  assert.ok(imgMatch, 'missing tool-pdf-extract.png image tag');
  assert.ok(/alt="[^"]+"/.test(imgMatch[0]), 'image missing non-empty alt text');
  assert.ok(imgMatch[0].includes('width="346"'), 'missing correct width attribute');
  assert.ok(imgMatch[0].includes('height="165"'), 'missing correct height attribute');
  assert.ok(imgMatch[0].includes('loading="lazy"'), 'missing loading=lazy attribute');
  assert.ok(imgMatch[0].includes('decoding="async"'), 'missing decoding=async attribute');
  assert.ok(/<figcaption>[^<]+<\/figcaption>/.test(html), 'missing figcaption');
});

test('images/tool-pdf-extract.png exists on disk', function () {
  assert.ok(fs.existsSync(path.join(__dirname, '..', 'images', 'tool-pdf-extract.png')), 'tool-pdf-extract.png missing from images/');
});

test('sns-blog-image-size.html has the real 1080x1080 resize screenshot', function () {
  const html = readRepoFile('sns-blog-image-size.html');
  assert.ok(html.includes('<figure class="guide-image">'), 'missing guide-image figure');
  const imgMatch = html.match(/<img[^>]*src="images\/tool-resize-1080x1080\.png"[^>]*>/);
  assert.ok(imgMatch, 'missing tool-resize-1080x1080.png image tag');
  assert.ok(/alt="[^"]+"/.test(imgMatch[0]), 'image missing non-empty alt text');
  assert.ok(imgMatch[0].includes('width="768"'), 'missing correct width attribute');
  assert.ok(imgMatch[0].includes('height="341"'), 'missing correct height attribute');
  assert.ok(imgMatch[0].includes('loading="lazy"'), 'missing loading=lazy attribute');
  assert.ok(imgMatch[0].includes('decoding="async"'), 'missing decoding=async attribute');
  assert.ok(/<figcaption>[^<]+<\/figcaption>/.test(html), 'missing figcaption');
});

test('images/tool-resize-1080x1080.png exists on disk', function () {
  assert.ok(fs.existsSync(path.join(__dirname, '..', 'images', 'tool-resize-1080x1080.png')), 'tool-resize-1080x1080.png missing from images/');
});
