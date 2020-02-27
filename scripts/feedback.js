/*browser.tabs.query({
  active: true,
  currentWindow: true,
}).then(tabs => {
  let tabId = tabs[0].id;
  browser.messageDisplay.getDisplayedMessage(tabId).then((message) => {
    //document.body.textContent = message.subject;
    //document.body.textContent = browser.messages.getFull(message.id).headers["X-Mailer"];
    browser.messages.getFull(message.id).then((messagePart) => {
      //let content = "";
      //for (let key in messagePart.headers)
      //{
      //  content += key + ": " + messagePart.headers[key] + "\r\n";
      //}
      //document.body.textContent = content;
      browser.storage.local.get().then((s) => {
        console.log(s.str);
        console.log("setContent from storage");
        setContent(s);
        //browser.tabs.executeScript({file: "scripts/content.js"})
      });
    });
  });
});*/

var port = browser.runtime.connect({name:"dispMUA-T"});
port.postMessage({command: "request MUA info"});

var info;
port.onMessage.addListener(function(s) {
  info = s;
  console.log("In content script, received message from background script: ");
  console.log(s.cmd + ": " + s.str);
  console.log("setContent from Message");
  if (s.str == "") {
    alert(browser.i18n.getMessage("dispMUA.NoUserAgent"));
  } else if (s.icon == "empty.png") {
    window.close();
    return;
  } else {
    setContent(s);
  }
});

document.getElementById("feedback-button-send").addEventListener("click", doSend);
document.getElementById("feedback-button-close").addEventListener("click", doClose);

function setContent(s) {
  let MUAstring1 = s.str;
  let MUAstring2 = "";
  let pos = MUAstring1.indexOf("\n");
  if (pos != -1)
  {
    MUAstring2 = MUAstring1.substr(pos + 1);
    MUAstring1 = MUAstring1.substr(0, pos);
  }
  document.getElementById("feedback-MUA1").value = MUAstring1;
  document.getElementById("feedback-MUA2").value = MUAstring2;
  //not supported "#990000",
  //suported #008800
  let color = s.found ? "#008800" : "#990000";
  document.getElementById("feedback-supported").setAttribute("style", "color:" + color);
  let supported = s.found ? browser.i18n.getMessage("dispMUA.supported") : browser.i18n.getMessage("dispMUA.NOTsupported");
  document.getElementById("feedback-supported").textContent = supported;
  let icon = document.createElement("img");
  icon.id = "feedback-icon";
  icon.setAttribute("src", s.eid + s.path + s.icon);
  icon.setAttribute("title", s.url);
  icon.addEventListener("click", () => { doOpenURL(info.url); }, false);
  let parentDiv = document.getElementById("feedback-icon0").parentNode;
  let targetDiv = document.getElementById("feedback-icon0");
  parentDiv.insertBefore(icon, targetDiv);
  let throbber = document.createElement("img");
  throbber.id = "feedback-throbber";
  throbber.setAttribute("src", s.eid + "images/throbber.png");
  parentDiv = document.getElementById("feedback-throbber0").parentNode;
  targetDiv = document.getElementById("feedback-throbber0");
  parentDiv.insertBefore(throbber, targetDiv);
  document.getElementById("feedback-mailinfo1").value = browser.i18n.getMessage("feedback.mailinfo1");
  document.getElementById("feedback-mailinfo2").value = browser.i18n.getMessage("feedback.mailinfo2");
  document.getElementById("feedback-iconinfo").value = browser.i18n.getMessage("feedback.iconinfo");
  document.getElementById("feedback-button-send").value = browser.i18n.getMessage("feedback.button.send");
  document.getElementById("feedback-button-close").value = browser.i18n.getMessage("feedback.button.close");;
}

function doSend() {
  let email = "dispmua@outlook.com";
  let subject = browser.i18n.getMessage("feedback.subject") + " " + browser.runtime.getManifest().version;
  let body = browser.i18n.getMessage("feedback.body.MUA") + "\n" +
    info.str + "\n\n" +
    browser.i18n.getMessage("feedback.body.url") + "\n\n" +
    browser.i18n.getMessage("feedback.body.icon") + "\n" +
    browser.i18n.getMessage("feedback.iconinfo") + "\n\n\n\n\n" +
    "------------------------------\n" + info.headers;
  // beginNewで差出人を指定する方法がない。アカウントが複数ある場合に表示されてるメールのアカウント外のものが使われてしまう
  // beginForwardでの転送でも正しいアカウントは設定されない。バグか
  browser.compose.beginNew( { to: email, subject: subject, body: body } );
  //browser.compose.beginForward(info.mid, "forwardInline",  { to: email, subject: subject, body: body } );
}

function doClose(time) {
  if (!time) time = 10;
  setTimeout(function () { window.close(); }, time);
  //window.close();
}

function doOpenURL(url) {
  if (url) {
    document.getElementById("feedback-throbber0").src = info.eid + "images/throbber.gif";
    browser.tabs.create({url: url});
  }
}
