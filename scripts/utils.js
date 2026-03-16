/**
 * Re-encodes a plain Unicode string as an RFC 2047 UTF-8 base64 encoded-word.
 *
 * Uses the deprecated unescape() approach to match the existing behaviour in
 * dispmua.js. Swap to TextEncoder once tests confirm equivalence.
 *
 * @param {string} str - The string to encode.
 * @returns {string} RFC 2047 encoded-word, e.g. =?UTF-8?B?...?=
 */
export function encodeHeader(str) {
  return '=?UTF-8?B?' + btoa(unescape(encodeURIComponent(str))) + '?=';
}
