function wireShareButton(button, statusEl, getShareData) {
  if (!button) {
    return;
  }

  button.addEventListener('click', function () {
    var data = getShareData();

    if (navigator.share) {
      navigator.share(data).catch(function () {
        // User cancelled the share sheet or it failed silently; no fallback needed.
      });
      return;
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(data.url).then(function () {
        if (statusEl) {
          statusEl.textContent = '링크가 복사되었습니다.';
          statusEl.hidden = false;
        }
      });
    }
  });
}
