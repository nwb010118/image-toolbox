(function (exports) {
  // Source rectangle that fills dstW x dstH without distortion ("cover"). posX/posY are 0..1 (0.5 = centred).
  function computeCoverCrop(srcW, srcH, dstW, dstH, posX, posY) {
    var px = typeof posX === 'number' ? Math.min(1, Math.max(0, posX)) : 0.5;
    var py = typeof posY === 'number' ? Math.min(1, Math.max(0, posY)) : 0.5;
    var srcRatio = srcW / srcH;
    var dstRatio = dstW / dstH;
    var sw = srcW;
    var sh = srcH;
    if (srcRatio > dstRatio) {
      sw = srcH * dstRatio;
    } else {
      sh = srcW / dstRatio;
    }
    return { sx: (srcW - sw) * px, sy: (srcH - sh) * py, sw: sw, sh: sh };
  }

  // Maximum pixel size when only one edge is bounded (keeps ratio, never upsizes).
  function fitInside(srcW, srcH, maxLongEdge) {
    var longEdge = Math.max(srcW, srcH);
    if (longEdge <= maxLongEdge) return { width: srcW, height: srcH };
    var f = maxLongEdge / longEdge;
    return { width: Math.max(1, Math.round(srcW * f)), height: Math.max(1, Math.round(srcH * f)) };
  }

  // width/height: exact size (cover crop). longEdge: ratio-preserving cap. maxBytes: target size.
  var PRESETS = [
    { id: 'id-photo', ko: '증명·여권 사진 (413×531)', en: 'ID / passport photo (413×531)', width: 413, height: 531 },
    { id: 'instagram-feed', ko: '인스타그램 피드 (1080×1350)', en: 'Instagram feed (1080×1350)', width: 1080, height: 1350 },
    { id: 'instagram-square', ko: '인스타그램 정사각형 (1080×1080)', en: 'Instagram square (1080×1080)', width: 1080, height: 1080 },
    { id: 'instagram-story', ko: '스토리·릴스 (1080×1920)', en: 'Story / Reels (1080×1920)', width: 1080, height: 1920 },
    { id: 'naver-thumb', ko: '네이버 블로그 썸네일 (1300×885)', en: 'Blog thumbnail (1300×885)', width: 1300, height: 885 },
    { id: 'youtube-thumb', ko: '유튜브 썸네일 (3840×2160, 2MB 이하)', en: 'YouTube thumbnail (3840×2160, under 2 MB)', width: 3840, height: 2160, maxBytes: 2 * 1024 * 1024, mime: 'image/jpeg' },
    { id: 'og-image', ko: '링크 미리보기 OG (1200×630)', en: 'Link preview OG image (1200×630)', width: 1200, height: 630 },
    { id: 'email', ko: '이메일·메신저용 (긴 변 1600px, 1MB 이하)', en: 'Email & messaging (long edge 1600px, under 1 MB)', longEdge: 1600, maxBytes: 1024 * 1024, mime: 'image/jpeg' },
    { id: 'web', ko: '웹 게시용 (긴 변 1920px, 300KB 이하)', en: 'Web publishing (long edge 1920px, under 300 KB)', longEdge: 1920, maxBytes: 300 * 1024, mime: 'image/jpeg' }
  ];

  function getPreset(id) {
    for (var i = 0; i < PRESETS.length; i++) if (PRESETS[i].id === id) return PRESETS[i];
    return null;
  }

  exports.computeCoverCrop = computeCoverCrop;
  exports.fitInside = fitInside;
  exports.PRESETS = PRESETS;
  exports.getPreset = getPreset;
})(typeof module !== 'undefined' ? module.exports : window);
