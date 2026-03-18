import {before, describe, it} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dispMUA, UNKNOWN_ICON} from '../scripts/dispmua-common.js';

function reset(headers = {}) {
  dispMUA.Info = {};
  dispMUA.arDispMUAOverlay = [];
  dispMUA.arDispMUAAllocation = { fullmatch: {}, presearch: {}, postsearch: {} };
  dispMUA.headers = headers;
}

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

describe('header priority', () => {
  it('uses user-agent', () => {
    reset({ 'user-agent': ['UA/1.0'] });
    dispMUA.arDispMUAAllocation.fullmatch['ua/1.0'] = ['ua.png'];
    dispMUA.searchIcon('');
    assert.equal(dispMUA.getMuaString(), 'UA/1.0');
  });

  it('falls back to x-mailer', () => {
    reset({ 'x-mailer': ['XM/1.0'] });
    dispMUA.arDispMUAAllocation.fullmatch['xm/1.0'] = ['xm.png'];
    dispMUA.searchIcon('');
    assert.equal(dispMUA.getMuaString(), 'XM/1.0');
  });

  it('falls back to x-mail-agent', () => {
    reset({ 'x-mail-agent': ['XMA/1.0'] });
    dispMUA.arDispMUAAllocation.fullmatch['xma/1.0'] = ['xma.png'];
    dispMUA.searchIcon('');
    assert.equal(dispMUA.getMuaString(), 'XMA/1.0');
  });

  it('falls back to x-newsreader', () => {
    reset({ 'x-newsreader': ['XNR/1.0'] });
    dispMUA.arDispMUAAllocation.fullmatch['xnr/1.0'] = ['xnr.png'];
    dispMUA.searchIcon('');
    assert.equal(dispMUA.getMuaString(), 'XNR/1.0');
  });
});

describe('UTF-8 MIME decoding', () => {
  it('decodes =?UTF-8?B? x-mailer value before DB lookup', () => {
    reset({ 'x-mailer': ['=?UTF-8?B?VGVzdE1haWxlci8xLjA=?='] });
    dispMUA.arDispMUAAllocation.fullmatch['testmailer/1.0'] = ['testmailer.png'];
    dispMUA.searchIcon('');
    assert.equal(dispMUA.getIcon(), 'testmailer.png');
    assert.equal(dispMUA.isFound(), true);
  });
});

describe('special header detection', () => {
  it('detects bugzilla', () => {
    reset({ 'x-bugzilla-reason': ['AssignedTo'] });
    dispMUA.searchIcon('');
    assert.equal(dispMUA.getIcon(), 'bugzilla.png');
    assert.equal(dispMUA.getMuaString(), 'X-Bugzilla-Reason');
    assert.equal(dispMUA.isFound(), true);
  });

  it('detects gitlab', () => {
    reset({ 'x-gitlab-project': ['myproject'] });
    dispMUA.searchIcon('');
    assert.equal(dispMUA.getIcon(), 'gitlab.png');
    assert.equal(dispMUA.getMuaString(), 'x-gitlab-project');
    assert.equal(dispMUA.isFound(), true);
  });

  it('detects Office 365', () => {
    reset({
      'x-ms-exchange-crosstenant-fromentityheader': ['Hosted'],
      'x-ms-exchange-crosstenant-mailboxtype': ['Hosted'],
    });
    dispMUA.searchIcon('');
    assert.equal(dispMUA.getIcon(), 'o365outlook.png');
    assert.equal(dispMUA.getMuaString(), 'Office 365 Outlook');
    assert.equal(dispMUA.isFound(), true);
  });

  it('detects Outlook.com', () => {
    reset({
      'x-ms-exchange-crosstenant-fromentityheader': ['Internet'],
      'x-originatororg': ['outlook.com'],
    });
    dispMUA.searchIcon('');
    assert.equal(dispMUA.getIcon(), 'o365outlook.png');
    assert.equal(dispMUA.getMuaString(), 'Outlook.com');
    assert.equal(dispMUA.isFound(), true);
  });

  it('detects MS Teams', () => {
    reset({
      'x-ms-exchange-crosstenant-frosentityheader': ['Internet'],
      'x-ms-exchange-crosstenant-fromentityheader': ['Internet'],
      'x-originatororg': ['email.teams.microsoft.com'],
    });
    dispMUA.searchIcon('');
    assert.equal(dispMUA.getIcon(), 'microsoftteams.png');
    assert.equal(dispMUA.getMuaString(), 'Microsoft Teams');
    assert.equal(dispMUA.isFound(), true);
  });

  it('detects FairEmail', () => {
    reset({
      'x-correlation-id': ['<id@x>'],
      'message-id': ['<id@x>'],
    });
    dispMUA.searchIcon('');
    assert.equal(dispMUA.getIcon(), 'fairemail.png');
    assert.equal(dispMUA.getMuaString(), 'FairEmail');
    assert.equal(dispMUA.isFound(), true);
  });

  it('detects Pardot', () => {
    reset({
      'x-pardot-route': ['r'],
      'x-pardot-lb': ['lb'],
      'sender': ['pardot@example.com'],
    });
    dispMUA.searchIcon('');
    assert.equal(dispMUA.getIcon(), 'pardot.png');
    assert.equal(dispMUA.getMuaString(), 'Pardot');
    assert.equal(dispMUA.isFound(), true);
  });

  it('detects Genese', () => {
    reset({
      'x-info': ['Genese v1'],
      'x-gateway': ['Genese gw'],
      'sender': ['genese@example.com'],
    });
    dispMUA.searchIcon('');
    assert.equal(dispMUA.getIcon(), 'genese.png');
    assert.equal(dispMUA.getMuaString(), 'Genese');
    assert.equal(dispMUA.isFound(), true);
  });
});

describe('database lookups', () => {
  it('user overlay takes precedence', () => {
    reset({ 'user-agent': ['MyMailer/1.0'] });
    dispMUA.arDispMUAOverlay['mymailer'] = 'file:///icon.png';
    dispMUA.searchIcon('');
    assert.equal(dispMUA.getIconPath(), '');
    assert.equal(dispMUA.getIcon(), 'file:///icon.png');
    assert.equal(dispMUA.isFound(), true);
  });

  it('fullmatch lookup', () => {
    reset({ 'user-agent': ['FM/1.0'] });
    dispMUA.arDispMUAAllocation.fullmatch['fm/1.0'] = ['fm.png'];
    dispMUA.searchIcon('');
    assert.equal(dispMUA.getIcon(), 'fm.png');
    assert.equal(dispMUA.isFound(), true);
  });

  it('presearch lookup', () => {
    reset({ 'user-agent': ['Something presearchterm here'] });
    dispMUA.arDispMUAAllocation.presearch['presearchterm'] = ['pre.png'];
    dispMUA.searchIcon('');
    assert.equal(dispMUA.getIcon(), 'pre.png');
    assert.equal(dispMUA.isFound(), true);
  });

  it('per-letter prefix lookup', () => {
    reset({ 'user-agent': ['Prefix Mailer/1.0'] });
    dispMUA.arDispMUAAllocation['p'] = { 'prefix': ['prefix.png'] };
    dispMUA.searchIcon('');
    assert.equal(dispMUA.getIcon(), 'prefix.png');
    assert.equal(dispMUA.isFound(), true);
  });

  it('postsearch lookup', () => {
    reset({ 'user-agent': ['Something postterm here'] });
    dispMUA.arDispMUAAllocation.postsearch['postterm'] = ['post.png'];
    dispMUA.searchIcon('');
    assert.equal(dispMUA.getIcon(), 'post.png');
    assert.equal(dispMUA.isFound(), true);
  });

  it('unknown UA gets unknown icon', () => {
    reset({ 'user-agent': ['NoMatchAnywhere/9.9'] });
    dispMUA.searchIcon('');
    assert.equal(dispMUA.getIcon(), UNKNOWN_ICON);
    assert.ok(!dispMUA.isFound());
  });
});

describe('Thunderbird platform detection', () => {
  it('Linux', () => {
    reset({ 'user-agent': ['Thunderbird/78.0 (X11; Linux x86_64)'] });
    dispMUA.arDispMUAAllocation.fullmatch['thunderbird/78.0 (x11; linux x86_64)'] = ['thunderbird.png'];
    dispMUA.searchIcon('');
    assert.equal(dispMUA.getIcon(), 'thunderbird-linux.png');
  });

  it('Windows', () => {
    reset({ 'user-agent': ['Thunderbird/78.0 (Windows NT 10.0; Win64; x64)'] });
    dispMUA.arDispMUAAllocation.fullmatch['thunderbird/78.0 (windows nt 10.0; win64; x64)'] = ['thunderbird.png'];
    dispMUA.searchIcon('');
    assert.equal(dispMUA.getIcon(), 'thunderbird-windows.png');
  });

  it('macOS', () => {
    reset({ 'user-agent': ['Thunderbird/78.0 (Macintosh; Intel Mac OS X 10.15)'] });
    dispMUA.arDispMUAAllocation.fullmatch['thunderbird/78.0 (macintosh; intel mac os x 10.15)'] = ['thunderbird.png'];
    dispMUA.searchIcon('');
    assert.equal(dispMUA.getIcon(), 'thunderbird-mac.png');
  });
});

describe('fallback headers', () => {
  it('organization header', () => {
    reset({ 'organization': ['My Org'] });
    dispMUA.searchIcon('');
    assert.ok(dispMUA.getMuaString().startsWith('Organization: '));
  });

  it('x-mimeole header', () => {
    reset({ 'x-mimeole': ['Produced By Microsoft Exchange V6.5'] });
    dispMUA.searchIcon('');
    assert.ok(dispMUA.getMuaString().startsWith('X-MimeOLE: '));
  });

  it('message-id header', () => {
    reset({ 'message-id': ['<abc@def.com>'] });
    dispMUA.searchIcon('');
    assert.ok(dispMUA.getMuaString().startsWith('Message-ID: '));
  });
});

describe('UA string smoke test (real DB)', () => {
  // [ua string, expected icon] — null means not yet in DB (reported but not asserted)
  const emailUserAgents = [
    // Desktop Email Clients
    ["Microsoft Outlook 16.0.17928.20114",              "outlook1516.png"],
    ["Microsoft Outlook, Build 17.0",                   "ms_outlook.png"],
    ["Apple Mail (16.0)",                               "apple_mail.png"],
    ["Thunderbird 115.8.1",                             "thunderbird.png"],
    ["The Bat! 10.5.2.1 (64-bit)",                      "the_bat.png"],
    ["Lotus Notes 9.0.1",                               "lotus_notes.png"],
    ["Postbox 7.0.56",                                  "postbox.png"],

    // Webmail Services
    ["YahooMailBasic/YahooMailWebService/0.8.122.342075", "yahoomail.png"],
    ["Zimbra 9.0.0_GA_4234",                            "zimbra.png"],
    ["RoundCube Webmail/1.6.6",                         "roundcube.png"],
    ["SquirrelMail/1.4.22",                             "squirrelmail.png"],
    ["Horde Application Framework v5",                  "horde.png"],

    // Programmatic / Libraries
    ["PHPMailer 6.8.0 (https://github.com/PHPMailer/PHPMailer)", "phpmailer.png"],
    ["SwiftMailer v6.3.0",                              "swiftmailer.png"],
    ["sendmail 8.17.1.1",                               "sendmail.png"],
    ["Python/3.11 aiosmtplib/2.0.1",                   "python.png"],
    ["Nodemailer 6.9.8 (https://nodemailer.com/)",      "nodemailer.png"],
    ["MailKit/4.3.0 (https://www.mimekit.net/)",        "mailkitcom.png"],
    ["Amazon SES",                                      "amazon.png"],

    // Mobile Clients
    ["iPhone Mail 17.2",                                "apple_iphone.png"],
    ["Android Mail 2023.12.17",                         "android.png"],

    // Marketing / Bulk Sending Platforms
    ["MailChimp Mailer",                                "mailchimp.png"],
  ];

  before(() => {
    dispMUA.arDispMUAAllocation = JSON.parse(readFileSync(new URL('../content/dispmua-database.json', import.meta.url), 'utf8'));
    dispMUA.arDispMUAOverlay = [];
  });

  for (const [ua, expectedIcon] of emailUserAgents) {
    it(ua, (t) => {
      dispMUA.Info = {};
      dispMUA.headers = { 'user-agent': [ua] };
      dispMUA.searchIcon('');
      // t.diagnostic(`icon=${dispMUA.getIcon() ?? 'none'}, found=${!!dispMUA.isFound()}`);
      assert.equal(dispMUA.isFound(), true);
      assert.equal(dispMUA.getIcon(), expectedIcon);
    });
  }
});
