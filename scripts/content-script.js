(function() {
    /**
     * Check and set a global guard variable.
     * If this content script is injected into the same page again,
     * it will do nothing next time.
     */
    if (window.hasRun) {
      return;
    }
    window.hasRun = true;
  
    function insertIcon(iconURL, MUA, iconSize, hideTime) {
      removeExistingIcons();
      let dispMUAImage = document.createElement("img");
      dispMUAImage.setAttribute("src", iconURL);
      dispMUAImage.setAttribute("title", MUA);
      dispMUAImage.style.width = iconSize + "px";
      dispMUAImage.style.height = iconSize + "px";
      dispMUAImage.id = "dispMUAicon";
      dispMUAImage.className = "dispMUA-icon";
      dispMUAImage.addEventListener("click", () => {
        if (!iconURL.endsWith("empty.png")) {
          showFeedback();
        }
      }, false);
      document.body.appendChild(dispMUAImage);
      if (hideTime > 0) {
        setTimeout(function(){
          document.getElementById("dispMUAicon").style.opacity = "0";
          //document.getElementById("dispMUAicon").style.visibility = "hidden";
        }, 1000*hideTime);
      }
    }

    function insertFeedback(info) {
      let feedback = document.createElement("div");
      feedback.className = "popup-page";
      feedback.style.width = "450px";
      feedback.style.visibility = "hidden";
      feedback.id = "feedbackdiv";
      let content = `<div class="` + feedback.id + `-wrap">
          <div style="flex: 1;">
              <input id="feedback-MUA1" type="text" readonly="readonly" class="flat" style="min-width:280px; width:100%; background:none; font-weight:bold; font-size:large;"></input>
              <input id="feedback-MUA2" type="text" readonly="readonly" class="flat" style="width: 100%;"></input>
              <label id="feedback-supported"/>
          </div>
          <div class="` + feedback.id + `-icon">
              <image id="feedback-icon" src="" style="width:48px; height:48px;" />
          </div>
          <div class="` + feedback.id + `-throbber">
              <image id="feedback-throbber" src=""/>
          </div>
      </div>
      <div>
          <input id="feedback-mailinfo1" type="text" readonly="readonly" class="flat" />
          <input id="feedback-mailinfo2" type="text" readonly="readonly" class="flat" />
          <input id="feedback-iconinfo" type="text" readonly="readonly" class="flat" />
      </div>
      <div class="` + feedback.id + `-wrapbutton">
        <div>
          <image id="feedback-openoption" src="chrome://messenger/skin/icons/developer.svg" style="position:relative; top:5px; left:1px"/>
          <input type="button" id="feedback-button-send""/>
        </div>
        <input type="button" id="feedback-button-close"/>
      </div>`;
      feedback.innerHTML = content;
      document.body.appendChild(feedback);
      document.getElementById("feedback-button-send").addEventListener("click", doSend);
      document.getElementById("feedback-button-close").addEventListener("click", doClose);
      //document.getElementById("feedback-icon").addEventListener("click", doOpenURL(info.url));
      document.getElementById("feedback-icon").addEventListener("click", {handleEvent: doOpenURL, url: info.url, eid: info.eid});
      document.getElementById("feedback-openoption").addEventListener("click", function(){port.postMessage({command: "openURL", url: "/content/options.html"})});
    }

    function showFeedback() {
      document.getElementById("feedbackdiv").style.opacity = "1";
      document.getElementById("feedbackdiv").style.visibility = "visible";
      console.log("shoeFeedback executed.");
    }

    function removeExistingIcons() {
      let existingIcons = document.querySelectorAll(".dispMUA-icon");
      for (let icon of existingIcons) {
        icon.remove();
      }
    }
  
    var port = browser.runtime.connect({name:"dispMUA-T"});
    port.postMessage({command: "request MUA info"});

    var info;
    port.onMessage.addListener(function(s) {

      console.log("contentscript: " + s.command);
      switch (s.command) {
        case 'set':
          insertIcon(s.iconURL, s.MUA, s.iconSize, s.hideTime);
          break;
        case 'reset':
          removeExistingIcons();
          break;
        case 'MUA info':
          info = s;
          //console.log("In content script, received message from background script: ");
          //console.log(s.cmd + ": " + s.str);
          //console.log("setContent from Message");
          if (s.str == "") {
            alert(browser.i18n.getMessage("dispMUA.NoUserAgent"));
          } else if (s.icon == "empty.png") {
            //window.close();
            console.log("In content script, enmty.png");
            //return;
          } else {
            insertFeedback(s);
            setContent(s);
          }
          break;
        case 'show feedback':
          //insertFeedback(s);
          showFeedback();
          //document.getElementById("dispMUAicon").click();
          break;
        case 'toggle feedback':
          if (document.getElementById("feedbackdiv").style.visibility == "visible") {
            doClose();
          } else {
            showFeedback();
          }
          break;
      }
    });

    function setContent(s) {
      let MUAstring1 = s.str;
      let MUAstring2 = "";
      let pos = MUAstring1.indexOf("\n");
      if (pos != -1)
      {
        MUAstring2 = MUAstring1.substr(pos + 1).replace(/\n/g, " ");
        MUAstring1 = MUAstring1.substr(0, pos);
      }
      document.getElementById("feedback-MUA1").value = MUAstring1;
      document.getElementById("feedback-MUA2").value = MUAstring2;
      let color = s.found ? "#008800" : "#990000";
      document.getElementById("feedback-supported").setAttribute("style", "color:" + color);
      let supported = s.found ? browser.i18n.getMessage("dispMUA.supported") : browser.i18n.getMessage("dispMUA.NOTsupported");
      document.getElementById("feedback-supported").textContent = supported;
      let icon = document.getElementById("feedback-icon");
      if (s.path == "") {
        icon.setAttribute("src", s.icon);
      } else {
        icon.setAttribute("src", s.eid + s.path + s.icon);
      }
      icon.setAttribute("title", s.url);
      icon.setAttribute("width", 48);
      icon.setAttribute("height", 48);
      icon.addEventListener("click", () => { doOpenURL(info.url); }, false);
      let throbber = document.getElementById("feedback-throbber");
      throbber.setAttribute("src", s.eid + "images/throbber.png");
      document.getElementById("feedback-mailinfo1").value = browser.i18n.getMessage("feedback.mailinfo1");
      document.getElementById("feedback-mailinfo2").value = browser.i18n.getMessage("feedback.mailinfo2");
      document.getElementById("feedback-iconinfo").value = browser.i18n.getMessage("feedback.iconinfo");
      document.getElementById("feedback-openoption").setAttribute("title", browser.i18n.getMessage("Options.options"));
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
      port.postMessage({command: "beginNew", to: email, subject: subject, body: body, identityId: info.iid});
    }

    function doClose() {
      document.getElementById("feedbackdiv").style.opacity = "0";
      setTimeout(function(){document.getElementById("feedbackdiv").style.visibility = "hidden";}, 500);
    }

    function doOpenURL(e) {
      let path = this.eid;
      if (this.url) {
        document.getElementById("feedback-throbber").src = path + "images/throbber.gif";
        port.postMessage({command: "openURL", url: this.url});
        setTimeout(function(){document.getElementById("feedback-throbber").src = path + "images/throbber.png";}, 10000);
      }
    }

})();
