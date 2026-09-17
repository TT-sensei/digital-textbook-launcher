(() => {
  const viewerMap = document.querySelector('#viewerMap');
  if (!viewerMap) return;

  const safeToken = (value) => String(value || '')
    .trim()
    .replace(/[^\p{L}\p{N}_-]+/gu, '-');

  const SUBJECTS = new Set([
    '国語', '算数', '理科', '社会', '英語', '音楽', '図工',
    '家庭', '体育・保健', '道徳', 'その他'
  ]);

  const SUBJECT_FALLBACK = 'その他';

  // 教科書会社は登録名が自由入力なので、色は名前から決定的に生成する。
  // 同じ会社名なら、どの教科でも同じアクセント色になる。
  function publisherColor(name) {
    const text = String(name || '').trim();
    if (!text) return '#8293a2';

    const known = {
      '光村図書': '#8b4457',
      '東京書籍': '#276fbf',
      '教育出版': '#3d7c59',
      '啓林館': '#8a5aa8',
      '大日本図書': '#bf6b32',
      '日本文教出版': '#2f7f82',
      '三省堂': '#b24b62',
      '学校図書': '#5678a8',
      '開隆堂': '#7b6b3f'
    };
    if (known[text]) return known[text];

    let hash = 0;
    for (const char of text) hash = ((hash << 5) - hash + char.codePointAt(0)) | 0;
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue} 46% 43%)`;
  }

  function enhance() {
    viewerMap.querySelectorAll('.platform-card').forEach((card) => {
      const key = safeToken(card.dataset.platform || 'custom');
      card.classList.add(`platform-${key}`);
    });

    viewerMap.querySelectorAll('.subject-row').forEach((row) => {
      const badgeText = row.querySelector('.subject-badge')?.textContent?.trim() || SUBJECT_FALLBACK;
      const subject = SUBJECTS.has(badgeText) ? badgeText : SUBJECT_FALLBACK;
      row.classList.add(`subject-${safeToken(subject)}`);

      const publisher = row.querySelector('.subject-copy strong')?.textContent?.trim() || '';
      row.style.setProperty('--publisher-accent', publisherColor(publisher));

      if (!row.dataset.launchEnhanced) {
        row.dataset.launchEnhanced = 'true';
        row.setAttribute('role', 'link');
        row.setAttribute('tabindex', '0');
        const label = row.querySelector('.subject-copy strong')?.textContent?.trim() || subject;
        row.setAttribute('aria-label', `${subject} ${label}をひらく`);
      }
    });
  }

  function launchFromRow(row) {
    const openButton = row.querySelector('[data-action="open"]');
    if (openButton) openButton.click();
  }

  viewerMap.addEventListener('click', (event) => {
    const row = event.target.closest('.subject-row');
    if (!row || !viewerMap.contains(row)) return;

    // 星・編集・並び替えなどの操作は、そのまま使えるようにする。
    if (event.target.closest('button, a, input, select, textarea')) return;
    launchFromRow(row);
  });

  viewerMap.addEventListener('keydown', (event) => {
    const row = event.target.closest('.subject-row');
    if (!row || !viewerMap.contains(row)) return;
    if (event.target.closest('button, a, input, select, textarea')) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      launchFromRow(row);
    }
  });

  const observer = new MutationObserver(enhance);
  observer.observe(viewerMap, { childList: true, subtree: true });
  enhance();
})();
