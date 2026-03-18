import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { dispMUA, UNKNOWN_ICON } from '../scripts/dispmua-common.js';

describe('loadJSON', () => {
  const DB_FILE = 'test.json';
  const UA_STRING = 'TestMailer/1.0';
  const MUA_ICON = 'testmailer.png';
  const mockDb = { fullmatch: { [UA_STRING.toLowerCase()]: [MUA_ICON] }, presearch: {}, postsearch: {} };

  it('loadJSON() returns a Promise', () => {
    global.fetch = async () => ({ json: async () => ({}) });
    const result = dispMUA.loadJSON(DB_FILE);
    assert.ok(result instanceof Promise, 'loadJSON() must return a Promise');
  });

  it('populates arDispMUAAllocation after being awaited', async () => {
    global.fetch = async () => ({ json: async () => mockDb });
    dispMUA.arDispMUAAllocation = {};
    await dispMUA.loadJSON(DB_FILE);
    assert.deepEqual(dispMUA.arDispMUAAllocation, mockDb);
  });

  it(`searchIcon() returns ${UNKNOWN_ICON} before DB loads, correct icon after`, async () => {
    let resolveFetch;
    global.fetch = () => new Promise(resolve => { resolveFetch = () => resolve({ json: async () => mockDb }); });
    dispMUA.arDispMUAAllocation = {};
    dispMUA.headers = { 'user-agent': [UA_STRING] };
    dispMUA.Info = {};

    const loadPromise = dispMUA.loadJSON(DB_FILE);

    dispMUA.searchIcon('');
    assert.equal(dispMUA.getIcon(), UNKNOWN_ICON, `race: ${UNKNOWN_ICON} before DB loads`);

    resolveFetch();
    await loadPromise;

    dispMUA.searchIcon('');
    assert.equal(dispMUA.getIcon(), MUA_ICON, 'correct icon after DB loaded');
  });
});
