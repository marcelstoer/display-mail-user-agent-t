const iId = "dispMUAicon";

browser.messageDisplayAction.onClicked.addListener((tabId) => {
  if (dispMUA.Info["ICON"] != "empty.png") {
    port.postMessage({command: "toggle feedback"});
  };
});

var options = {};
function setDefault(opt) {
  //console.log("startup option values:", opt, opt.showMessagePaneIcon);
  if (!opt.iconSize) {
    browser.storage.local.set({
      showToolbarButton: false,
      showMessagePaneIcon: true,
      iconPosTop: 8,
      iconPosRight: 8,
      iconSize: 48,
      hideIconTime: 0,
      iconPosFix: false,
      narrowMessagePane: false,
      feedbackBgcolor: "#ffe4c4",
    /*}).then((vv) => {
      console.log("option value showMessagePaneIcon(dispmua.js):" + vv.showMessagePaneIcon);*/
    }).then( v => { console.log("set default values of option finished(after then)." + v);});
    //console.log("set default option values finished. " + JSON.stringify(opt));
    options = {
      showToolbarButton: false,
      showMessagePaneIcon: true,
      iconPosTop: 8,
      iconPosRight: 8,
      iconSize: 48,
      hideIconTime: 0,
      iconPosFix: false,
      narrowMessagePane: false,
      feedbackBgcolor: "#ffe4c4",
    };
  } else {
    options = opt;
  }
}

function onError(e) {
  console.error(e);
}

//2021-6-2 let getOpt = browser.storage.local.get();
//2021-6-2 getOpt.then(setDefault, onError);
//browser.storage.local.get().then( v => { options = v; });

// inject scripts/css
// inject scripts does not work. Is it a Thunderbird bug?
/*
var regedScripts;
browser.messageDisplayScripts.register({
  js: [
    //{code: `document.body.textContent = "test";`},
    //{code: `let feedback = document.createElement("div");feedback.innerHTML = "hogehoge!"; document.body.appendChild(feedback);`},
    //{file: "scripts/content-scripts.js"}, //It doesn't seem to work
  ],
  css: [
    //{code: ".dispMUA-icon {z-index: 1; position: absolute; right: 8px; top: 8px; transition:opacity 1000ms;}"},
    //{code: ".popup-page {position: absolute; right: 8px; top: 8px; border: 1px; border-color: #0; border-style: soiid; border-radius: 5px; padding: 5px; background-color: bisque;}"},
    //{code: "#feedbackdiv {z-index: 2; opacity: 0; transition:opacity 500ms;}"},
    //{code: "input.flat {border: 0; width: 100%; background-color: bisque;} .wrap {display: flex; } .icon {width: 48px; height: 48px;} .throbber {width: 16px; height:16px; margin-left:3px; } .wrapbutton {display: flex; justify-content: space-between;}"}
    {code: ".dispMUA-icon {z-index: 1; position: absolute; right: " + options.iconPosRight + "px; top: " + options.iconPosTop + "px; transition:opacity 1000ms;}"},
    {code: ".popup-page {position: absolute; right: 8px; top: 8px; border: 1px; border-color: #0; border-style: soiid; border-radius: 5px; padding: 5px; background-color: " + options.feedbackBgcolor + ";}"},
    {code: "#feedbackdiv {z-index: 2; opacity: 0; transition:opacity 500ms;}"},
    {code: "input.flat {border: 0; width: 100%; background-color: " + options.feedbackBgcolor + ";} .wrap {display: flex; } .icon {width: 48px; height: 48px;} .throbber {width: 16px; height:16px; margin-left:3px; } .wrapbutton {display: flex; justify-content: space-between;}"}
  ]
}).then((r) => {regedScripts = r; console.log("content-script(CSS) registered.");}).catch(e => console.log("regist error" + e.message));
*/
browser.messageDisplay.onMessageDisplayed.addListener((tabId, message) => {
  let getOpt = browser.storage.local.get();
  getOpt.then(setDefault, onError);
    //console.log(`Message displayed in tab ${tabId}: ${message.subject}`);
  browser.messageDisplayAction.disable(tabId.id);
  if (!dispMUA.loaded) {
    dispMUA.loadJSON("dispmua-database.json");
    dispMUA.loaded = true;
  }
  if (Object.keys(dispMUA.arDispMUAOverlay).length == 0) {
    const skey = "overlay";
    browser.storage.local.get(skey).then( s => {
      if (s[skey]) {
        if (s[skey].length > 0) {
          dispMUA.getOverlay();
          dispMUA.olLoaded = true;
        }
      }
    });
  }
  browser.storage.local.get("overlayChanged").then( s => {
  //browser.storage.local.get().then( s => {
    if (s["overlayChanged"]) {
      //console.log("overlay data:", s["overlay"]);
      dispMUA.getOverlay();
      browser.storage.local.set({overlayChanged: false});
    }
  });

  browser.accounts.get(message.folder.accountId).then((MailAccount) => {
    //dispMUA.identityId = MailAccount.identities[0].id;
    dispMUA.identityId = MailAccount.identities.length > 0 ? MailAccount.identities[0].id : null;
  });

  var executing;
  executing = browser.tabs.executeScript(tabId.id, {
    file: "scripts/content-script.js"
  });

  browser.messages.getFull(message.id).then((messagePart) => {
    browser.messageDisplayAction.setPopup({popup: ''});
    browser.messageDisplayAction.setLabel({label: ''});
    //browser.messageDisplayAction.disable(tabId.id);
    dispMUA.headers = messagePart.headers;
    dispMUA.Info["messageId"] = message.id;
    //dispMUA.headerdata = this.content; // all headers strings
    //Correspondence to the problem that Subject and List-ID in messagePart.headers are decoded and stored
    const mheader = "=?UTF-8?B?";
    const ascii = /^[ -~]+$/;
    Object.keys(dispMUA.headers).forEach(function (key) {
      for (let i = 0; i < dispMUA.headers[key].length; i++) {
        if (dispMUA.headers[key][i].length > 0 && !ascii.test(dispMUA.headers[key][i])) {
          try {
            //dispMUA.headers[key][i] = mheader + btoa(unescape(encodeURIComponent(decodeURIComponent(escape(dispMUA.headers[key][i]))))) + "?=";
            //dispMUA.headers[key][i] = mheader + btoa(unescape(encodeURIComponent(decodeURIComponent(escape(unescape(encodeURIComponent(dispMUA.headers[key][i]))))))) + "?=";
            dispMUA.headers[key][i] = mheader + btoa(unescape(encodeURIComponent(dispMUA.headers[key][i]))) + "?=";
          }
          catch(e) {
            console.log("header decode error: " + dispMUA.headers[key][i]);
          }
        }
      }
    });
    if (dispMUA.headers["x-mozilla-keys"] !== undefined) {
      //No meaning. Whitespace characters seem to be deleted, and line breaks are not made if only the header is used. Is it a bug on the compose side?
      if (dispMUA.headers["x-mozilla-keys"][0].length == 0) dispMUA.headers["x-mozilla-keys"][0] = '\r\n';
    }
    dispMUA.searchIcon("");
    const len = 10;
    let pos = dispMUA.Info["STRING"].indexOf("\n");
    let str = dispMUA.Info["STRING"];
    if (pos != -1) { str = str.substr(0, pos); }
    if (dispMUA.Info["PATH"] == "") { // overlay
      if (dispMUA.Info["ICON"].startsWith("file:///")) {
        //There is no way to read local file icons here
        browser.messageDisplayAction.setIcon({path: "empty.png"});
        browser.messageDisplayAction.setTitle({title: "!?"});
      } else {
        browser.messageDisplayAction.setIcon({path: dispMUA.Info["ICON"]});
      }
    } else {
      browser.messageDisplayAction.setIcon({path: dispMUA.Info["PATH"]+dispMUA.Info["ICON"]});
    }
    //browser.messageDisplayAction.setTitle({title: str.length > len ? str.substr(0, len) + '...' : str});
    browser.messageDisplayAction.setTitle({title: str});  //API is now available(Added in TB 84.0b3, backported to TB 78.6.1) so I don't have to truncate strings.

    browser.tabs.insertCSS(tabId.id, {code:
      ".dispMUA-icon {z-index: 1; position: " + (options.iconPosFix ? "fixed" : "absolute") + "; right: " + options.iconPosRight + "px; top: " + options.iconPosTop + "px; transition:opacity 1000ms;} " +
      (options.narrowMessagePane ?
        ".moz-text-html {width: calc(100% - " + (+options.iconSize + 1) + "px);} " +
        ".moz-text-flowed {width: calc(100% - " + (+options.iconSize + 1) + "px);} " +
        ".moz-text-plain[wrap=\"true\"] {white-space: pre-wrap; width: calc(100% - " + (+options.iconSize + 1) + "px);} "
        : "") +
      ".popup-page {position: absolute; right: 8px; top: 8px; border: 1px; border-color: #0; border-style: soiid; border-radius: 5px; padding: 5px; background-color: " + options.feedbackBgcolor + ";} " +
      "#feedbackdiv {z-index: 2; opacity: 0; transition:opacity 500ms;} " +
      "input.flat {border: 0; width: 100%; background-color: " + options.feedbackBgcolor + ";} .wrap {display: flex; } .icon {width: 48px; height: 48px;} .throbber {width: 16px; height:16px; margin-left:3px; } .wrapbutton {display: flex; justify-content: space-between;}"}
    );

    browser.storage.local.get().then((s) => {
      if (s.showToolbarButton) browser.messageDisplayAction.enable(tabId.id);
      //console.log("before executeScript.");
      executing.then(() => {
        //console.log("executeScript done. tabid:" + tabId.id);
        //*Error: can't access property "url", info is undefined. why?
        let url = "";
        if (dispMUA.Info["PATH"] == "") { // overlay
          if (dispMUA.Info["ICON"].startsWith("file:///")) {
            //There is no way to read local file icons here
            url = "content/48x48/empty.png";
            //browser.messageDisplayAction.setTitle({title: "!?"});
          } else {
            url = dispMUA.Info["ICON"];
          }
        } else {
          //url = browser.extension.getURL("") + dispMUA.Info["PATH"] + dispMUA.Info["ICON"];
          url = browser.runtime.getURL("") + dispMUA.Info["PATH"] + dispMUA.Info["ICON"];
        }
        //browser.tabs.sendMessage(tabId.id, {command: "set", iconURL: url, MUA: dispMUA.Info["STRING"]});
        //console.log("option value showMessagePaneIcon:" + s.showMessagePaneIcon);
        if (s.showMessagePaneIcon) {
          port.postMessage({command: "set", iconURL: url, MUA: dispMUA.Info["STRING"], iconSize: s.iconSize, hideTime: s.hideIconTime});
        }
      }).catch((e) => {
        console.log("executeScript error: " + e.message);
      }).then(() => {/*console.log("finaly executeScript.")*/});
    });
  });
});

var port;
function connected(p) {
  port = p;
  port.onMessage.addListener(function(m) {
    switch (m.command) {
      case 'request MUA info':
        port.postMessage({
          "command": "MUA info",
          "mid": dispMUA.Info["messageId"],
          "eid": browser.runtime.getURL(""),  //browser.extension.getURL(""),
          "iid": dispMUA.identityId,
          "path": dispMUA.Info["PATH"],
          "icon": dispMUA.Info["ICON"],
          "url": dispMUA.Info["URL"],
          "str": dispMUA.Info["STRING"],
          "headers" : joinObj(dispMUA.headers, ": ", "\r\n"),
          "found" : dispMUA.Info["FOUND"]
        });
        break;
      case 'beginNew':
        //browser.compose.beginNew({to: m.to, subject: m.subject, body: m.body, identityId: m.identityId});
        browser.compose.beginNew({to: m.to, subject: m.subject, plainTextBody: m.body, identityId: m.identityId, isPlainText: true});
        break;
      case 'openURL':
        browser.tabs.create({url: m.url});
        break;
      /*case 'request getOverlay':
        dispMUA.getOverlay();
        break;*/
    }
  });
}
browser.runtime.onConnect.addListener(connected);

var joinObj = function(obj, fDelimiter, sDelimiter) {
  let tmpArr = [];
  if (typeof obj === 'undefined') return '';
  if (typeof fDelimiter === 'undefined') fDelimiter = '';
  if (typeof sDelimiter === 'undefined') sDelimiter = '';
  Object.keys(obj).forEach(function (key) {
    for (let i = 0; i < obj[key].length; i++) {
      tmpArr.push(key + fDelimiter + obj[key][i]);
    }
  });
  return tmpArr.join(sDelimiter);
};
