/* HAVE 공통 도구 (1123) — 해시, 정규화 JSON, ID, 날짜.
   1123: 옛 HumanProof 시연 코드(domain.js)에서 실제로 쓰던 부분만 남기고 이름을 HaveCore로 바꿨다. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.HaveCore = api;
})(globalThis, function () {
  'use strict';
  const MAX_PDF_BYTES = 20 * 1024 * 1024;
  const ZERO_HASH = '0'.repeat(64);

  /** 키를 정렬한 JSON. 같은 내용이면 항상 같은 문자열이 나와 해시 비교에 쓴다. */
  const getCanonical = value => JSON.stringify(value, (_, item) =>
    item && typeof item === 'object' && !Array.isArray(item)
      ? Object.fromEntries(Object.keys(item).sort().map(key => [key, item[key]])) : item);

  /** 바이트의 SHA-256 (16진수 64자) */
  async function getSha256(bytes) {
    const buffer = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(buffer), byte => byte.toString(16).padStart(2, '0')).join('');
  }
  const getTextSha256 = text => getSha256(new TextEncoder().encode(text));

  const createId = prefix => prefix + '-' + crypto.randomUUID().slice(0, 8);

  function getDateAfter(days, from = new Date()) {
    const date = new Date(from.getTime() + days * 86400000);
    return date.toISOString().slice(0, 10);
  }

  const isText = (value, max, required = true) => typeof value === 'string' && value.length <= max && (!required || value.trim().length > 0);

  function getBase64(bytes) {
    let result = '';
    for (let i = 0; i < bytes.length; i += 8192) result += String.fromCharCode(...bytes.subarray(i, i + 8192));
    return btoa(result);
  }
  const getBytes = value => Uint8Array.from(atob(value), c => c.charCodeAt(0));

  return { MAX_PDF_BYTES, ZERO_HASH, getCanonical, getSha256, getTextSha256, createId, getDateAfter, isText, getBase64, getBytes };
});
