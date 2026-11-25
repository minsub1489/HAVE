'use strict';

const DB_NAME = 'have-author-gui-v1';

async function readAttentionCountFromDb() {
  if (!self.indexedDB) return null;
  try {
    const db = await new Promise((resolve, reject) => {
      const req = self.indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains('workspace')) {
          req.result.createObjectStore('workspace');
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    const record = await new Promise((resolve, reject) => {
      const tx = db.transaction('workspace', 'readonly');
      const getReq = tx.objectStore('workspace').get('current');
      tx.oncomplete = () => resolve(getReq.result || null);
      tx.onabort = () => reject(tx.error);
    });
    db.close();
    const works = record?.data?.works;
    if (!Array.isArray(works)) return 0;
    return works.filter(w => {
      const latest = w?.versions?.at?.(-1);
      return latest && ['CHALLENGE_PENDING', 'REVISION_REQUIRED'].includes(latest.status);
    }).length;
  } catch {
    return null;
  }
}

async function setBadge(count) {
  const n = Number(count);
  await chrome.action.setBadgeBackgroundColor({ color: '#0F766E' });
  await chrome.action.setBadgeText({ text: Number.isFinite(n) && n > 0 ? String(n) : '' });
}

async function refreshBadge() {
  const count = await readAttentionCountFromDb();
  if (count !== null) await setBadge(count);
}

async function openOrFocusAppTab(hash = '#works') {
  const normalizedHash = hash.startsWith('#') ? hash : '#' + hash;
  const targetUrl = chrome.runtime.getURL('app.html') + normalizedHash;
  const baseUrl = chrome.runtime.getURL('app.html');

  if (typeof chrome.runtime.getContexts === 'function') {
    const contexts = await chrome.runtime.getContexts({ contextTypes: ['TAB'] });
    const existing = contexts.find(ctx => typeof ctx.documentUrl === 'string' && ctx.documentUrl.startsWith(baseUrl) && ctx.tabId > 0);
    if (existing) {
      await chrome.tabs.update(existing.tabId, { url: targetUrl, active: true });
      if (existing.windowId > 0) {
        await chrome.windows.update(existing.windowId, { focused: true });
      }
      return;
    }
  }
  await chrome.tabs.create({ url: targetUrl });
}

chrome.runtime.onInstalled.addListener(() => {
  refreshBadge();
});

chrome.runtime.onStartup.addListener(() => {
  refreshBadge();
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || typeof message !== 'object') return false;
  if (message.type === 'HAVE_BADGE_UPDATE') {
    setBadge(message.count).then(() => sendResponse({ ok: true })).catch(() => sendResponse({ ok: false }));
    return true;
  }
  if (message.type === 'HAVE_OPEN_TAB') {
    openOrFocusAppTab(message.hash || '#works')
      .then(() => sendResponse({ ok: true }))
      .catch(err => sendResponse({ ok: false, error: err?.message || '탭을 열 수 없습니다.' }));
    return true;
  }
  return false;
});
