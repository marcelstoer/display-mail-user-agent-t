function saveOptions(e) {
  if (!document.querySelector("form").reportValidity()) return;
  browser.storage.local.set({
    showToolbarButton: document.getElementById("showToolbarButton").checked,
    showMessagePaneIcon: document.getElementById("showMessagePaneIcon").checked,
    iconPosTop: document.getElementById("iconPosTop").value,
    iconPosRight: document.getElementById("iconPosRight").value,
    iconSize: document.getElementById("iconSize").value,
    hideIconTime: document.getElementById("hideIconTime").value,
    iconPosFix: document.getElementById("iconPosFix").checked,
    narrowMessagePane: document.getElementById("narrowMessagePane").checked,
    feedbackBgcolor: document.getElementById("feedbackBgcolor").value,
  });
  e.preventDefault();
}

function saveOverlay() {
  browser.storage.local.set({
    overlay: document.getElementById("overlayDef").value,
    overlayChanged: true
  }).then( () => { console.log("overlay saved.", document.getElementById("overlayDef").value); });
}

function importOverlay(e) {
  let file = e.target.files[0];
  let reader = new FileReader();
  reader.readAsText(file);
  reader.onload = function(e) {
    let result = e.target.result;
    browser.storage.local.set({overlay: result});
    document.getElementById("overlayDef").value = result;
  }
}

function exportOverlay() {
  let data = document.getElementById("overlayDef").value;
  console.log("data: ", data);
  let blob = new Blob([data], {type: "text/plain"});
  browser.downloads.download({
    url: URL.createObjectURL(blob),
    filename: "dispMUAOverlay.csv",
    saveAs: true
  });
}

function restoreOptions() {
  // remove old option key and value
  browser.storage.local.remove("showIcon");
  browser.storage.local.remove("iconPosition");

  function setCurrentChoice(data) {
    document.getElementById("showToolbarButton").checked = data.showToolbarButton;// ?? false;
    document.getElementById("showMessagePaneIcon").checked = data.showMessagePaneIcon;// ?? true;
    document.getElementById("iconPosTop").value = data.iconPosTop;// ?? 8;
    document.getElementById("iconPosRight").value = data.iconPosRight;// ?? 8;
    document.getElementById("iconSize").value = data.iconSize;// ?? 48;
    document.getElementById("hideIconTime").value = data.hideIconTime;// ?? 0;
    document.getElementById("iconPosFix").checked = data.iconPosFix;
    document.getElementById("narrowMessagePane").checked = data.narrowMessagePane;
    document.getElementById("feedbackBgcolor").value = data.feedbackBgcolor;// ?? "#ffe4c4";
    //if (data.overlay.length > 0) document.getElementById("overlayDef").value = data.overlay;
    if (data.overlay) document.getElementById("overlayDef").value = data.overlay;
  }

  function onError(error) {
    console.log(`Error: ${error}`);
  }

  // localization
  document.title = browser.i18n.getMessage("extensionName") + " " + browser.i18n.getMessage("options.options");
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const msg = browser.i18n.getMessage(el.dataset.i18n);
    if (el.tagName === "INPUT") {
      el.value = msg;
    } else {
      el.textContent = msg;
    }
  });
  document.getElementById("overlayLbl").textContent = "User overrides (dispMuaOverlay.csv)";
  document.getElementById("overlayExamples").innerHTML = "<b>Example override</b><br />#Lines beginning with # are comment lines<br />#X-Mailer/User-Agent, URI *file:/// support is not good enough<br />thunderbird,file:///data/grafik/mytbicon.png<br />exampleagent,http://example.com/icons/agent.gif<br />\"agent,with,comma\",http://example.com/icons/commaagent.png";

  // event registration
  document.getElementById("applyBtn").addEventListener("click", saveOptions);
  document.getElementById("showToolbarButton").addEventListener("change", saveOptions);
  document.getElementById("messagePaneIcon").addEventListener("change", saveOptions);
  document.getElementById("exportBtn").addEventListener("click", exportOverlay);
  document.getElementById("applyOlBtn").addEventListener("click", saveOverlay);

  let getting = browser.storage.local.get();
  getting.then(setCurrentChoice, onError);
}

document.addEventListener("DOMContentLoaded", restoreOptions);
document.getElementById("importBtn").addEventListener("change", importOverlay);
