import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { encodeHeader } from '../scripts/utils.js';

describe('encodeHeader', () => {
  // Non-ASCII header values (e.g. Subject, List-ID) are decoded by Thunderbird
  // before being handed to the extension. dispmua.js re-encodes them as RFC 2047
  // encoded-words so the MUA detection algorithm receives a consistent format.
  //
  // Contract: the encoding must produce a =?UTF-8?B?...?= encoded-word whose
  // base64 payload decodes back to the original string.

  const PREFIX = '=?UTF-8?B?';
  const SUFFIX = '?=';

  function decodeEncodedWord(encodedWord) {
    const base64 = encodedWord.slice(PREFIX.length, -SUFFIX.length);
    const bytes = Uint8Array.from(atob(base64), c => c.codePointAt(0));
    return new TextDecoder('utf-8').decode(bytes);
  }

  const cases = [
    'Müller',     // German umlaut (2-byte UTF-8)
    'José',       // Latin accented letter (2-byte UTF-8)
    '日本語',      // Japanese (3-byte UTF-8)
    'Ünteresting Subject: re: Héllo Wörld',  // mixed ASCII and non-ASCII
  ];

  for (const str of cases) {
    it(`round-trips "${str}"`, () => {
      const encoded = encodeHeader(str);
      assert.ok(encoded.startsWith(PREFIX), 'must start with encoded-word prefix');
      assert.ok(encoded.endsWith(SUFFIX), 'must end with encoded-word suffix');
      assert.equal(decodeEncodedWord(encoded), str);
    });
  }
});
