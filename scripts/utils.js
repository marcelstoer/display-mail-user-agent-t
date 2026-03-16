/**
 * Re-encodes a plain Unicode string as an RFC 2047 UTF-8 base64 encoded-word.
 *
 * @param {string} str - The string to encode.
 * @returns {string} RFC 2047 encoded-word, e.g. =?UTF-8?B?...?=
 */
export function encodeHeader(str) {
  const bytes = new TextEncoder().encode(str);
  const binaryStr = Array.from(bytes, b => String.fromCharCode(b)).join('');
  return '=?UTF-8?B?' + btoa(binaryStr) + '?=';
}
