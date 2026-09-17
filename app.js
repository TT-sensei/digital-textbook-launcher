const STORAGE_NAMESPACE = 'digital-textbook-launcher';
const STATE_KEY = 'state-v1';

// 令和8年度の文科省案内を基準にした公式ログイン先。
// URLは変更せず、ランチャーから公式サイトへ移動するだけにする。
const PLATFORMS = {
  manaviewer: { name: 'まなビューア', short: 'MV', description: '公式ログイン', url: 'https://manaviewer.jp/' },
  cho: { name: '超教科書', short: '超', description: '公式教材利用画面', url: 'https://p01.cloud.cho-textbook.jp/' },
  lentrance: { name: 'Lentrance Reader', short: 'LR', description: '公式学校ログイン', url: 'https://www.lentrance.com/school/login' },
  mirai: { name: 'みらいスクール', short: 'MS', description: '公式ユーザーログイン', url: 'https://mirai-pf.jp/user/login.html' },
  tsubasa: { name: 'つばさブック', short: 'TB', description: '公式ユーザーログイン', url: 'https://tsubasabook.jp/' },
  esviewer: { name: 'エスビューア', short: 'SV', description: '公式ユーザーログイン', url: 'https://sviewer.jp/' },
  custom: { name: 'その他のログイン先', short: '＋', description: '登録した公式ログイン先', url: '' }
};

const PLATFORM_ORDER = ['manaviewer', 'cho', 'lentrance', 'mirai', 'tsubasa', 'esviewer'];
const SUBJECTS = ['国語','算数','理科','社会','英語','音楽','図工','家庭','体育・保健','道徳','その他'];

let storage = null;
let state = { links: [], recent: [] };
let toastTimer = null;
let teacherMode = false;

const $ = (selector) => document.querySelector(selector);
const viewerMap = $('#viewerMap');
const recentPanel = $('#recentPanel');
const recentGrid = $('#recentGrid');
const recentText = $('#recentText');
const emptyState = $('#emptyState');
const teacherModeButton = $('#teacherModeButton');
const dialog = $('#linkDialog');
const linkForm = $('#linkForm');
const platformInput = $('#platformInput');
const subjectInput = $('#subjectInput');
const publisherInput = $('#publisherInput');
const labelInput = $('#labelInput');
const customUrlInput = $('#customUrlInput');
const customUrlWrap = $('#customUrlWrap');
const favoriteInput = $('#favoriteInput');
const editingId = $('#editingId');
const dialogTitle = $('#dialogTitle');
const deleteLinkButton = $('#deleteLinkButton');
const toast = $('#toast');

function makeId() {
  return globalThis.crypto?.randomUUID?.() || `link-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function validUrl(value) {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
  } catch {
    return '';
  }
}

function normalizeLink(raw, index = 0) {
  if (!raw || typeof raw !== 'object') return null;
  const platform = PLATFORMS[raw.platform] ? raw.platform : 'custom';
  const url = validUrl(raw.url || PLATFORMS[platform]?.url || '');
  const subject = SUBJECTS.includes(raw.subject)
    ? raw.subject
    : String(raw.subject || '').trim().slice(0, 30);
  if (!subject || !url) return null;

  return {
    id: String(raw.id || makeId()),
    subject,
    publisher: String(raw.publisher || '').trim().slice(0, 40),
    platform,
    label: String(raw.label || '').trim().slice(0, 40),
    url,
    favorite: Boolean(raw.favorite),
    order: Number.isFinite(Number(raw.order)) ? Number(raw.order) : index
  };
}

function sanitizeState(raw) {
  const links = Array.isArray(raw?.links)
    ? raw.links.map((link, index) => normalizeLink(link, index)).filter(Boolean)
    : [];
  const ids = new Set(links.map((link) => link.id));
  const recent = Array.isArray(raw?.recent)
    ? raw.recent
      .filter((item) => ids.has(item.id) && Number.isFinite(Number(item.time)))
      .slice(0, 20)
      .map((item) => ({ id: String(item.id), time: Number(item.time) }))
    : [];
  return { links, recent };
}

function fallbackStorage() {
  const prefix = `edu:${STORAGE_NAMESPACE}:`;
  return {
    save(key, value) {
      try {
        localStorage.setItem(`${prefix}${key}`, JSON.stringify(value));
        return true;
      } catch {
        return false;
      }
    },
    load(key, defaultValue = null) {
      try {
        const raw = localStorage.getItem(`${prefix}${key}`);
        return raw == null ? defaultValue : JSON.parse(raw);
      } catch {
        return defaultValue;
      }
    },
    clear() {
      try {
        Object.keys(localStorage)
          .filter((key) => key.startsWith(prefix))
          .forEach((key) => localStorage.removeItem(key));
      } catch {}
    }
  };
}

async function initStorage() {
  try {
    const module = await import('https://tt-sensei.github.io/edu-components/index.js');
    storage = new module.StorageManager(STORAGE_NAMESPACE);
  } catch {
    storage = fallbackStorage();
  }
  state = sanitizeState(storage.load(STATE_KEY, { links: [], recent: [] }));
}

function saveState() {
  storage?.save?.(STATE_KEY, state);
}

function platformInfo(platformKey) {
  return PLATFORMS[platformKey] || PLATFORMS.custom;
}

function platformLinks(platformKey) {
  return state.links
    .filter((link) => link.platform === platformKey)
    .sort((a, b) => Number(b.favorite) - Number(a.favorite) || a.order - b.order);
}

function platformKeysToRender() {
  const keys = [...PLATFORM_ORDER];
  if (state.links.some((link) => link.platform === 'custom')) keys.push('custom');
  return keys;
}

function renderViewerMap() {
  viewerMap.innerHTML = '';
  const fragment = document.createDocumentFragment();

  for (const platformKey of platformKeysToRender()) {
    const platform = platformInfo(platformKey);
    const links = platformLinks(platformKey);
    const card = document.createElement('article');
    card.className = 'platform-card edu-card';
    card.dataset.platform = platformKey;

    const rows = links.length
      ? links.map((link) => `
        <div class="subject-row">
          <div class="subject-main">
            <span class="subject-badge">${escapeHtml(link.subject)}</span>
            <div class="subject-copy">
              <strong>${escapeHtml(link.publisher || link.label || '教科書会社未設定')}</strong>
              <small>${escapeHtml(link.label || platform.name)}</small>
            </div>
          </div>
          <div class="subject-actions">
            <button class="star-button ${link.favorite ? 'active' : ''}" type="button" data-action="favorite" data-id="${escapeHtml(link.id)}" aria-label="${link.favorite ? 'お気に入りを外す' : 'お気に入りにする'}" aria-pressed="${link.favorite}">${link.favorite ? '★' : '☆'}</button>
            <button class="row-launch" type="button" data-action="open" data-id="${escapeHtml(link.id)}">ひらく ↗</button>
            <div class="row-tools teacher-only">
              <button class="small-button" type="button" data-action="move-up" data-id="${escapeHtml(link.id)}" aria-label="上へ">↑</button>
              <button class="small-button" type="button" data-action="move-down" data-id="${escapeHtml(link.id)}" aria-label="下へ">↓</button>
              <button class="small-button" type="button" data-action="edit" data-id="${escapeHtml(link.id)}">編集</button>
            </div>
          </div>
        </div>`).join('')
      : `<div class="no-subjects"><span class="no-subject-dot" aria-hidden="true">—</span><span>まだ教科が登録されていません。</span></div>`;

    card.innerHTML = `
      <div class="platform-head">
        <div class="platform-title">
          <span class="viewer-mark" aria-hidden="true">${escapeHtml(platform.short)}</span>
          <div>
            <h3>${escapeHtml(platform.name)}</h3>
            <p>${escapeHtml(platform.description)} · ${links.length}教科</p>
          </div>
        </div>
        <a class="platform-login" href="${escapeHtml(platform.url || '#')}" ${platform.url ? 'target="_blank" rel="noopener noreferrer"' : ''} ${platform.url ? '' : 'aria-disabled="true"'}>公式サイト ↗</a>
      </div>
      <div class="platform-subjects">
        <div class="platform-subject-label">このビューアの教科</div>
        <div class="subject-list">${rows}</div>
      </div>
      <div class="platform-footer teacher-only">
        <button class="register-here" type="button" data-platform="${escapeHtml(platformKey)}">＋ このビューアに教科を登録</button>
      </div>`;

    fragment.appendChild(card);
  }

  viewerMap.appendChild(fragment);
  emptyState.hidden = state.links.length !== 0;
}

function formatRecentTime(time) {
  const date = new Date(time);
  const now = new Date();
  if (now.toDateString() === date.toDateString()) {
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  }
  const diff = Math.floor((now - date) / 86400000);
  if (diff === 1) return '昨日';
  if (diff < 7) return `${Math.max(diff, 2)}日前`;
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function renderRecent() {
  const recent = state.recent
    .map((item) => ({ item, link: state.links.find((link) => link.id === item.id) }))
    .filter(({ link }) => link)
    .sort((a, b) => b.item.time - a.item.time)
    .slice(0, 4);

  recentPanel.hidden = recent.length === 0;
  recentGrid.innerHTML = '';
  if (!recent.length) return;

  recentText.textContent = `${formatRecentTime(recent[0].item.time)}に利用`;
  for (const { item, link } of recent) {
    const platform = platformInfo(link.platform);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'recent-card';
    button.innerHTML = `<span class="recent-mark">${escapeHtml(platform.short)}</span><span class="recent-copy"><strong>${escapeHtml(link.subject)} ${escapeHtml(link.publisher || '')}</strong><small>${escapeHtml(platform.name)} · ${escapeHtml(formatRecentTime(item.time))}</small></span>`;
    button.addEventListener('click', () => openLink(link));
    recentGrid.appendChild(button);
  }
}

function renderAll() {
  renderViewerMap();
  renderRecent();
}

function populatePlatformSelect() {
  platformInput.innerHTML = Object.entries(PLATFORMS)
    .map(([key, value]) => `<option value="${escapeHtml(key)}">${escapeHtml(value.name)}</option>`)
    .join('');
}

function updateCustomUrlVisibility() {
  const custom = platformInput.value === 'custom';
  customUrlWrap.hidden = !custom;
  customUrlInput.required = custom;
}

function openDialog(platform = null, link = null) {
  editingId.value = link?.id || '';
  dialogTitle.textContent = link ? '教科を編集' : '教科を登録';
  subjectInput.value = link?.subject || '';
  publisherInput.value = link?.publisher || '';
  platformInput.value = platform || link?.platform || 'manaviewer';
  labelInput.value = link?.label || '';
  favoriteInput.checked = Boolean(link?.favorite);
  customUrlInput.value = link?.platform === 'custom' ? link.url : '';
  deleteLinkButton.hidden = !link;
  updateCustomUrlVisibility();
  dialog.showModal();
  requestAnimationFrame(() => subjectInput.focus());
}

function closeDialog() {
  if (dialog.open) dialog.close();
}

function addOrUpdateLink(event) {
  event.preventDefault();
  const subject = subjectInput.value.trim();
  const publisher = publisherInput.value.trim();
  const platform = platformInput.value;
  const label = labelInput.value.trim();
  const url = validUrl(platform === 'custom' ? customUrlInput.value.trim() : PLATFORMS[platform]?.url || '');

  if (!subject || !url) {
    showToast(platform === 'custom' ? '教科と正しいログインURLを入力してください。' : '教科を選んでください。');
    return;
  }

  const current = state.links.find((link) => link.id === editingId.value);
  const nextOrder = state.links.reduce((max, link) => Math.max(max, link.order), -1) + 1;
  const item = {
    id: editingId.value || makeId(),
    subject,
    publisher,
    platform,
    label,
    url,
    favorite: favoriteInput.checked,
    order: current?.order ?? nextOrder
  };

  const index = state.links.findIndex((link) => link.id === item.id);
  if (index >= 0) state.links[index] = item;
  else state.links.push(item);

  saveState();
  renderAll();
  closeDialog();
  showToast(index >= 0 ? '教科の設定を更新しました。' : '教科を登録しました。');
}

function removeLink(id) {
  const link = state.links.find((item) => item.id === id);
  if (!link) return;
  if (!window.confirm(`「${link.subject} ${link.publisher || ''}」を登録から削除しますか？`)) return;
  state.links = state.links.filter((item) => item.id !== id);
  state.recent = state.recent.filter((item) => item.id !== id);
  saveState();
  renderAll();
  closeDialog();
  showToast('登録を削除しました。');
}

function moveLink(id, direction) {
  const current = state.links.find((link) => link.id === id);
  if (!current) return;
  const group = platformLinks(current.platform);
  const index = group.findIndex((link) => link.id === id);
  const target = group[index + direction];
  if (!target) return;
  [current.order, target.order] = [target.order, current.order];
  saveState();
  renderViewerMap();
}

function toggleFavorite(id) {
  const link = state.links.find((item) => item.id === id);
  if (!link) return;
  link.favorite = !link.favorite;
  saveState();
  renderViewerMap();
  showToast(link.favorite ? 'お気に入りにしました。' : 'お気に入りを外しました。');
}

function setTeacherMode(active) {
  teacherMode = Boolean(active);
  document.body.classList.toggle('teacher-mode', teacherMode);
  teacherModeButton.setAttribute('aria-pressed', String(teacherMode));
  teacherModeButton.textContent = teacherMode ? '登録を終了' : '登録';
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
}

function openLink(link) {
  const url = validUrl(link.url);
  if (!url) {
    showToast('ログインURLを確認してください。');
    return;
  }

  state.recent = [{ id: link.id, time: Date.now() }, ...state.recent.filter((item) => item.id !== link.id)].slice(0, 20);
  saveState();
  renderRecent();

  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.target = '_blank';
  anchor.rel = 'noopener noreferrer';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

function exportSettings() {
  const payload = {
    type: 'tt-sensei-digital-textbook-launcher',
    version: 1,
    exportedAt: new Date().toISOString(),
    state
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `digital-textbook-launcher-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
  showToast('設定を書き出しました。');
}

async function importSettings(file) {
  try {
    const payload = JSON.parse(await file.text());
    if (payload?.type && payload.type !== 'tt-sensei-digital-textbook-launcher') throw new Error('形式が違います');
    state = sanitizeState(payload?.state ?? payload);
    saveState();
    renderAll();
    showToast(`${state.links.length}件の教科設定を読み込みました。`);
  } catch {
    showToast('設定ファイルを読み込めませんでした。');
  }
}

function resetSettings() {
  if (!window.confirm('この端末に保存した教科登録・お気に入り・最近の履歴をすべて初期化しますか？')) return;
  state = { links: [], recent: [] };
  storage?.clear?.();
  saveState();
  renderAll();
  showToast('設定を初期化しました。');
}

viewerMap.addEventListener('click', (event) => {
  const target = event.target.closest('[data-action], [data-platform]');
  if (!target) return;
  if (target.matches('[data-platform]') && !target.closest('.subject-row')) {
    openDialog(target.dataset.platform);
    return;
  }
  const id = target.dataset.id;
  if (!id) return;
  const action = target.dataset.action;
  const link = state.links.find((item) => item.id === id);
  if (!link) return;
  if (action === 'open') openLink(link);
  else if (action === 'favorite') toggleFavorite(id);
  else if (action === 'edit') openDialog(null, link);
  else if (action === 'move-up') moveLink(id, -1);
  else if (action === 'move-down') moveLink(id, 1);
});

$('#addLinkButton').addEventListener('click', () => openDialog());
$('#emptyAddButton').addEventListener('click', () => openDialog());
$('#closeDialogButton').addEventListener('click', closeDialog);
$('#cancelDialogButton').addEventListener('click', closeDialog);
$('#deleteLinkButton').addEventListener('click', () => removeLink(editingId.value));
linkForm.addEventListener('submit', addOrUpdateLink);
platformInput.addEventListener('change', updateCustomUrlVisibility);
teacherModeButton.addEventListener('click', () => setTeacherMode(!teacherMode));
$('#exportButton').addEventListener('click', exportSettings);
$('#importButton').addEventListener('click', () => $('#importFile').click());
$('#importFile').addEventListener('change', (event) => {
  const file = event.target.files?.[0];
  if (file) importSettings(file);
  event.target.value = '';
});
$('#resetButton').addEventListener('click', resetSettings);
dialog.addEventListener('click', (event) => { if (event.target === dialog) closeDialog(); });

populatePlatformSelect();
setTeacherMode(false);
renderAll();
await initStorage();
renderAll();
