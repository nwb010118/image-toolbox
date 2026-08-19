(function (exports) {
  var MIN_TEXT_LENGTH_FOR_CONVERSION = 20;
  var LINE_Y_TOLERANCE = 3;
  var PARAGRAPH_GAP_THRESHOLD = 20;
  var MAX_PPT_CONVERSION_PAGES = 100;
  var FORMAT_EXTENSIONS = { ppt: 'pptx', word: 'docx', excel: 'xlsx' };

  function hasSubstantialText(text) {
    return typeof text === 'string' && text.trim().length >= MIN_TEXT_LENGTH_FOR_CONVERSION;
  }

  function groupTextItemsIntoLines(items, yTolerance) {
    var lines = [];
    var current = null;

    items.forEach(function (item) {
      if (current === null || Math.abs(item.y - current.y) > yTolerance) {
        if (current !== null) {
          lines.push(current);
        }
        current = { y: item.y, parts: [{ x: item.x, str: item.str }] };
      } else {
        current.parts.push({ x: item.x, str: item.str });
      }
    });

    if (current !== null) {
      lines.push(current);
    }

    return lines
      .map(function (line) {
        var orderedParts = line.parts.slice().sort(function (a, b) {
          return a.x - b.x;
        });
        var text = orderedParts
          .map(function (part) { return part.str; })
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();
        return { y: line.y, text: text };
      })
      .filter(function (line) {
        return line.text.length > 0;
      });
  }

  function groupLinesIntoParagraphs(lines, gapThreshold) {
    var paragraphs = [];
    var current = [];
    var previousY = null;

    lines.forEach(function (line) {
      if (previousY !== null && Math.abs(previousY - line.y) > gapThreshold) {
        paragraphs.push(current.join(' '));
        current = [];
      }
      current.push(line.text);
      previousY = line.y;
    });

    if (current.length > 0) {
      paragraphs.push(current.join(' '));
    }

    return paragraphs;
  }

  function concatenatePagesLinesText(pagesLines) {
    return pagesLines
      .map(function (lines) {
        return lines.map(function (line) { return line.text; }).join(' ');
      })
      .join(' ')
      .trim();
  }

  function getConvertedFilename(baseName, format) {
    var extension = FORMAT_EXTENSIONS[format];
    if (!extension) {
      throw new Error('지원하지 않는 변환 형식입니다: ' + format);
    }
    return baseName + '.' + extension;
  }

  exports.MIN_TEXT_LENGTH_FOR_CONVERSION = MIN_TEXT_LENGTH_FOR_CONVERSION;
  exports.LINE_Y_TOLERANCE = LINE_Y_TOLERANCE;
  exports.PARAGRAPH_GAP_THRESHOLD = PARAGRAPH_GAP_THRESHOLD;
  exports.MAX_PPT_CONVERSION_PAGES = MAX_PPT_CONVERSION_PAGES;
  exports.hasSubstantialText = hasSubstantialText;
  exports.groupTextItemsIntoLines = groupTextItemsIntoLines;
  exports.groupLinesIntoParagraphs = groupLinesIntoParagraphs;
  exports.concatenatePagesLinesText = concatenatePagesLinesText;
  exports.getConvertedFilename = getConvertedFilename;
})(typeof module !== 'undefined' ? module.exports : window);
