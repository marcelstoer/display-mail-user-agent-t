browser.messageDisplayAction.onClicked.addListener((tabId) => {
  if (dispMUA.Info["ICON"] != "empty.png") {
   //promiseを返すけどthenで処理すると2回に1回エラーになるので普通に
   browser.messageDisplayAction.setPopup({popup: "content/feedback.xhtml"});
   browser.messageDisplayAction.openPopup();
  };
});

browser.messageDisplay.onMessageDisplayed.addListener((tabId, message) => {
  console.log(`Message displayed in tab ${tabId}: ${message.subject}`);
  //browser.browserAction.setTitle({title: null});
  //browser.browserAction.setIcon({path: "images/logo.png"});

  if (!dispMUA.loaded) {
    dispMUA.loadJSON("dispmua-database.json");
    dispMUA.loaded = true;
  }

  browser.messages.getFull(message.id).then((messagePart) => {
    browser.messageDisplayAction.setPopup({popup: ''});
    dispMUA.headers = messagePart.headers;
    dispMUA.Info["messageId"] = message.id;
    //dispMUA.headerdata = this.content; // all headers strings
    //Correspondence to the problem that Subject and List-ID in messagePart.headers are decoded and stored
    const mheader = "=?UTF-8?B?";
    const ascii = /^[ -~]+$/;
    Object.keys(dispMUA.headers).forEach(function (key) {
      for (let i = 0; i < dispMUA.headers[key].length; i++) {
        if (dispMUA.headers[key][i].length > 0 && !ascii.test(dispMUA.headers[key][i])) {
          dispMUA.headers[key][i] = mheader + btoa(unescape(encodeURIComponent(decodeURIComponent(escape(dispMUA.headers[key][i]))))) + "?=";
        }
      }
    });
    /*
    if (!ascii.test(dispMUA.headers.subject[0])) {
      dispMUA.headers.subject[0] = mheader + btoa(unescape(encodeURIComponent(decodeURIComponent(escape(messagePart.headers["subject"][0]))))) + "?=";
    }
    if (dispMUA.getHeader("list-id")) {
      if (!ascii.test(dispMUA.headers["list-id"][0])) {
        dispMUA.headers["list-id"][0] = mheader + btoa(unescape(encodeURIComponent(decodeURIComponent(escape(messagePart.headers["list-id"][0]))))) + "?=";
      }
    }
    */
    if (dispMUA.headers["x-mozilla-keys"] !== undefined) {
      //意味なし。空白文字は削除されるっぽく、ヘッダのみだと改行がされない。compose側のバグか？
      if (dispMUA.headers["x-mozilla-keys"][0].length == 0) dispMUA.headers["x-mozilla-keys"][0] = '\r\n'; //' '.repeat(40);
    }
    dispMUA.searchIcon("");
    const len = 10;
    let pos = dispMUA.Info["STRING"].indexOf("\n");
    let str = dispMUA.Info["STRING"];
    if (pos != -1) { str = str.substr(0, pos); }
    //browser.browserAction.setIcon({path: dispMUA.Info["PATH"]+dispMUA.Info["ICON"]});
    browser.messageDisplayAction.setIcon({path: dispMUA.Info["PATH"]+dispMUA.Info["ICON"]});
    browser.messageDisplayAction.setTitle({title: str.length > len ? str.substr(0, len) + '...' : str});
    //if (dispMUA.Info["ICON"] == "enmpty.png") browser.messageDisplayAction.disable(tabId);
    //else browser.messageDisplayAction.enable(tabId); // disableはボタンごと消えてしまう
    //browser.tabs.executeScript(tabId, {code: 'console.log(document.getElementById("dispMUAicon"))' });
    let code = 'let icon = document.createElement("img");' +
      'icon.setAttribute("src", "' + browser.extension.getURL("") + dispMUA.Info["PATH"] + dispMUA.Info["ICON"] + '");' +
      'icon.setAttribute("tooltiptext", "' + dispMUA.Info["URL"] + '");' +
      //'let parentDiv = document.getElementById("feedback-icon").parentNode;' +
      //'let targetDiv = document.getElementById("feedback-icon");' +
      //'parentDiv.insertBefore(icon, targetDiv);'
      'document.getElementById("expandedHeadersBottomBox").insertBefore(icon, document.getElementById("otherActionsBox"));'
    //browser.tabs.executeScript(tabId, {code: code}).then(successCB, failureCB);
    browser.tabs.executeScript(tabId, {code: code}).then((result) => {
      console.log("executeScript success: " + result);}).catch((e) => {
        console.log("executeScript failure: " + e.error);
      });
    
    browser.storage.local.get().then((s) => {
      const id = "dispMUAicon";
      if (s.showIcon) {
        browser.messageDisplayAction.setTitle({title: " "});
        let target = s.iconPosition ? "expandedHeaders2" : "otherActionsBox";
        //browser.dispmuaApi.remove(id);
        browser.dispmuaApi.insertBefore(browser.extension.getURL(""), dispMUA.Info["PATH"]+dispMUA.Info["ICON"], dispMUA.Info["STRING"], id, target);
        browser.dispmuaApi.move(id, target);
      }
      else browser.dispmuaApi.remove(id);
    });
    //browser.tabs.sendMessageが実装されていない。browser.runtime.sendMessageはbackground側からは利用出来ない？(エラー)
    //そもそもThunderbirdでcontent_scriptがまともに機能しているのかがわからない。browserオブジェクトがあるように見えない
    //browser.tabs.sendMessage(
    //browser.runtime.sendMessage(browser.runtime.id,
    /*var dmInfo =  {
      "path": dispMUA.Info["PATH"],
      "icon": dispMUA.Info["ICON"],
      "url": dispMUA.Info["URL"],
      "str": dispMUA.Info["STRING"],
      "found" : dispMUA.Info["FOUND"]
    }*/
    /*browser.storage.local.set({
      "eid": browser.extension.getURL(""),
      "path": dispMUA.Info["PATH"],
      "icon": dispMUA.Info["ICON"],
      "url": dispMUA.Info["URL"],
      "str": dispMUA.Info["STRING"],
      "found" : dispMUA.Info["FOUND"]
    });*/
  });
});
/*function successCB(result) {
  console.log("executeScript success: " + result);
}
function failureCB(error) {
  console.log("executeScript failure: " + error);
}*/

var port;
function connected(p) {
  port = p;
  //port.postMessage({greeting: "hi there content script!"});
  port.onMessage.addListener(function(m) {
    console.log("In background script, received message from content script")
    //console.log(m.greeting);
    switch (m.command) {
      case 'request MUA info':
        port.postMessage({
          "cmd": m.command,
          "mid": dispMUA.Info["messageId"],
          "eid": browser.extension.getURL(""),
          "path": dispMUA.Info["PATH"],
          "icon": dispMUA.Info["ICON"],
          "url": dispMUA.Info["URL"],
          "str": dispMUA.Info["STRING"],
          "headers" : joinObj(dispMUA.headers, ": ", "\r\n"),
          "found" : dispMUA.Info["FOUND"]
        });
        break;
    }
  });
}
browser.runtime.onConnect.addListener(connected);

var joinObj = function(obj, fDelimiter, sDelimiter) {
  let tmpArr = [];
  if (typeof obj === 'undefined') return '';
  if (typeof fDelimiter === 'undefined') fDelimiter = '';
  if (typeof sDelimiter === 'undefined') sDelimiter = '';
  /*for (var key in obj) {
      tmpArr.push(key + fDelimiter + obj[key]);
  }*/
  Object.keys(obj).forEach(function (key) {
    for (let i = 0; i < obj[key].length; i++) {
      tmpArr.push(key + fDelimiter + obj[key][i]);
    }
    //tmpArr.push(key + fDelimiter + obj[key]);
  });
  return tmpArr.join(sDelimiter);
};


function disconnected(p) {
  browser.dispmuaApi.remove("dispMUAicon");
}
// onDisconnect not implemented...
browser.runtime.onDisconnect.addListener(disconnected);


// Select the node that will be observed for mutations
const targetNode = document.getElementById("displaymailuseragent-t-me_toshi_-messageDisplayAction-toolbarbutton");

// Options for the observer (which mutations to observe)
const config = { attributes: true, childList: true, subtree: true };

// Callback function to execute when mutations are observed
const callback = function(mutationsList, observer) {
    // Use traditional 'for loops' for IE 11
    for(let mutation of mutationsList) {
        if (mutation.type === 'childList') {
            console.log('A child node has been added or removed.');
            browser.dispmuaApi.remove("dispMUAicon");
        }
        else if (mutation.type === 'attributes') {
            console.log('The ' + mutation.attributeName + ' attribute was modified.');
        }
    }
};

// Create an observer instance linked to the callback function
const observer = new MutationObserver(callback);

// Start observing the target node for configured mutations
observer.observe(targetNode, config);

// Later, you can stop observing
//observer.disconnect();
