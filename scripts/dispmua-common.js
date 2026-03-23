export const UNKNOWN_ICON = 'unknown.png';

export const dispMUA =
{
  loaded: null,
  Info: {},
  arDispMUAOverlay: [],
  //strOverlayFilename: "dispMuaOverlay.csv",
  arDispMUAAllocation: {},
  identityId: null,

  getIcon()       { return this.Info["ICON"]; },
  setIcon(v)      { this.Info["ICON"] = v; },
  getMuaString()  { return this.Info["STRING"]; },
  setMuaString(v) { this.Info["STRING"] = v; },
  getIconPath()   { return this.Info["PATH"]; },
  setIconPath(v)  { this.Info["PATH"] = v; },
  isFound()       { return this.Info["FOUND"]; },
  setFound(v)     { this.Info["FOUND"] = v; },
  getUrl()        { return this.Info["URL"]; },
  setUrl(v)       { this.Info["URL"] = v; },
  getName()       { return this.Info["NAME"]; },
  setName(v)      { this.Info["NAME"] = v; },
  getMessageId()  { return this.Info["messageId"]; },
  setMessageId(v) { this.Info["messageId"] = v; },
}

dispMUA.getHeader = (key) =>
{
  let value = dispMUA.headers[key];

  if (value === null || value === undefined) value = "";
  else value = value.toString();

  value = value.replace(/\s+/g, " ");
  return(value);
}

dispMUA.searchIcon = (strUserAgent) =>
{
  if (!strUserAgent)
  {
    strUserAgent = dispMUA.getHeader("user-agent");
  }

  if (!strUserAgent)
  {
    strUserAgent = dispMUA.getHeader("x-mailer");

    if (!strUserAgent)
    {
      strUserAgent = dispMUA.getHeader("x-mail-agent");
    }
    if (!strUserAgent)
    {
      strUserAgent = dispMUA.getHeader("x-newsreader");
    }
  }
  //X-Mailer may be MIME encoded. Ignored if not UTF-8
  const target = "=?UTF-8?B?";
  if (strUserAgent.startsWith(target)) {
    let regExp = new RegExp(target.replace(/\?/g, "\\?"), "g");
    strUserAgent = strUserAgent.replace(/\s/, "");
    strUserAgent = strUserAgent.replace(regExp, "");
    strUserAgent = strUserAgent.replace(/\?=/g, "");
    strUserAgent = decodeURIComponent(escape(atob(strUserAgent)));
  }

  let strExtra = "";

  if (dispMUA.getHeader("x-bugzilla-reason"))
  {
    strExtra = "bugzilla";
  }
  else if (dispMUA.getHeader("x-php-bug"))
  {
    strExtra = "phpbug";
  }
  else if (dispMUA.getHeader("x-gitlab-project"))
  {
    strExtra = "gitlab";
  }
  //not good. If not found and an Office 365 user, the icon will be Office 365
  else if (/*dispMUA.getHeader("x-ms-office365-filtering-correlation-id") &&
           dispMUA.getHeader("x-ms-publictraffictype"))*/
           // thanks silversonic https://twitter.com/silversonicboom
           (dispMUA.getHeader("x-ms-exchange-crosstenant-fromentityheader").toLowerCase() === "hosted" &&
            dispMUA.getHeader("x-ms-exchange-crosstenant-mailboxtype").toLowerCase() === "hosted") ||
           (dispMUA.getHeader("x-ms-exchange-crosstenant-fromentityheader").toLowerCase() === "hosted" &&
            dispMUA.getHeader("x-ms-exchange-transport-crosstenantheadersstamped") !== "")
          )
  {
    strExtra = "o365";
  }
  else if (dispMUA.getHeader("x-ms-exchange-crosstenant-fromentityheader").toLowerCase() === "internet" &&
           dispMUA.getHeader("x-originatororg").toLowerCase() === "outlook.com")
  {
    strExtra = "oweb";
  }
  else if (dispMUA.getHeader("x-ms-exchange-crosstenant-fromentityheader").toLowerCase() === "internet" &&
           dispMUA.getHeader("x-originatororg").toLowerCase() === "email.teams.microsoft.com")
  {
    strExtra = "msteams";
  }
  else if (dispMUA.getHeader("x-correlation-id"))
  {
    if (dispMUA.getHeader("x-correlation-id") === dispMUA.getHeader("message-id"))
      strExtra = "fairemail" ;
  }
  else if (dispMUA.getHeader("x-ebay-mailtracker"))
  {
    let re = /d=(export\.)?ebay\.[.a-z]{2,6};/m
    if (dispMUA.headers["dkim-signature"]) {
      if (re.test(dispMUA.headers["dkim-signature"].join("\n"))) strExtra = "ebay" ;
      else if (dispMUA.getHeader("message-id").endsWith("@starship>")) strExtra = "ebay" ;
    }
  }
  else if (dispMUA.getHeader("sender") === dispMUA.getHeader("from"))
  {
    if (dispMUA.getHeader("sender").endsWith("ebay.com>")) strExtra = "ebay" ;
  }
  else if (dispMUA.getHeader("x-pardot-route") && dispMUA.getHeader("x-pardot-lb"))
  {
    strExtra = "pardot" ;
  }
  else if (dispMUA.getHeader("x-info").toLowerCase().startsWith("genese") &&
           dispMUA.getHeader("x-gateway").toLowerCase().startsWith("genese"))
  {
    strExtra = "genese";
  }

  strUserAgent = strUserAgent.replace(/(^\s+)|(\s+$)/g, "");
  dispMUA.setMuaString("");
  dispMUA.setInfo(false, []);

  if (strUserAgent !== "")
  {
    dispMUA.setMuaString(strUserAgent);
    //var lower = strUserAgent.toLowerCase();
    //MUA string starts with "WebService", Yahoo! Mail, maybe
    let lower = strUserAgent.toLowerCase().replace(/^webservice\/[0-9. ]+/, "");

    //user overlay array
    for (let key in dispMUA.arDispMUAOverlay)
    {
      if (lower.indexOf(key) > -1)
      {
        //an overlay icon already has the full path in it, including the protocol
        dispMUA.setIconPath("");
        dispMUA.setIcon(dispMUA.arDispMUAOverlay[key]);
        //that the user knows he made the crap
        dispMUA.setMuaString(strUserAgent + "\n" +
                                 "User override icon" + "\n" +
                                 "Key: " + key + "\n" +
                                 "Icon: " + dispMUA.getIcon());
        dispMUA.setFound(true);
        break ;
      }
    }

    if (!dispMUA.isFound())
    {
      for (let key in dispMUA.arDispMUAAllocation["fullmatch"])
      {
        if (lower === key)
        {
          dispMUA.setInfo(true, dispMUA.arDispMUAAllocation["fullmatch"][key]);
          break;
        }
      }
    }

    if (!dispMUA.isFound())
    {
      dispMUA.scan("presearch", strUserAgent);
    }

    if (!dispMUA.isFound())
    {
      let chLetter = lower.substr(0, 1);

      if (dispMUA.arDispMUAAllocation[chLetter])
      {
        for (let key in dispMUA.arDispMUAAllocation[chLetter])
        {
          if (lower.substr(0, key.length) === key)
          {
            dispMUA.setInfo(true, dispMUA.arDispMUAAllocation[chLetter][key]);
            break;
          }
        }
      }
    }

    if (!dispMUA.isFound())
    {
      dispMUA.scan("postsearch", strUserAgent);
    }

    if (!dispMUA.isFound())
    {
      dispMUA.setIcon(UNKNOWN_ICON);
    }

    if (dispMUA.getIcon() === "thunderbird.png")
    {
      let re = /rv:(\d{1,3}\.\d)/g;
      let arr = re.exec(lower);
      let rv = 2;
      if (arr) rv = Number(arr[1]);
      re = /thunderbird[/ ]([0-9a-z.]+)/;
      arr = re.exec(lower);
      let tb = "thunderbird";
      if (arr) {
        let ver = arr[1];
        if (ver.indexOf('a') > 0) tb = "daily";
        else if (ver.indexOf('b') > 0) tb = "earlybird";
        else if (rv >= 60) tb += "60";
      }
      tb += "-";
      if (lower.indexOf("; linux") > -1)
      {
        dispMUA.setIcon(tb + "linux.png");
      }
      else if ((lower.indexOf("(windows") > -1) || (lower.indexOf("; windows") > -1))
      {
        dispMUA.setIcon(tb + "windows.png");
      }
      else if ((lower.indexOf("(macintosh") > -1) || (lower.indexOf("; intel mac") > -1) || (lower.indexOf("; ppc mac") > -1))
      {
        dispMUA.setIcon(tb + "mac.png");
      }
      else if (lower.indexOf("; sunos") > -1)
      {
        dispMUA.setIcon(tb + "sunos.png");
      }
      else if (lower.indexOf("; freebsd") > -1)
      {
        dispMUA.setIcon(tb + "freebsd.png");
      }
      else if (lower.indexOf("(x11") > -1)
      {
        dispMUA.setIcon(tb + "x11.png");
      }
    }
    else if (dispMUA.getIcon() === "betterbird.png")
    {
      let tb = "betterbird-";
      if (lower.indexOf("; linux") > -1)
      {
        dispMUA.setIcon(tb + "linux.png");
      }
      else if ((lower.indexOf("(windows") > -1) || (lower.indexOf("; windows") > -1))
      {
        dispMUA.setIcon(tb + "windows.png");
      }
    }
  }
  else if (strExtra !== "")
  {
    if (strExtra === "bugzilla")
    {
      dispMUA.setIcon("bugzilla.png");
      dispMUA.setMuaString("X-Bugzilla-Reason");
      dispMUA.setFound(true);
    }
    else if (strExtra === "phpbug")
    {
      dispMUA.setIcon("bug.png");
      dispMUA.setMuaString("X-PHP-Bug");
      dispMUA.setFound(true);
    }
    else if (strExtra === "gitlab")
    {
      dispMUA.setIcon("gitlab.png");
      dispMUA.setMuaString("x-gitlab-project");
      dispMUA.setUrl("https://about.gitlab.com/");
      dispMUA.setFound(true);
    }
    else if (strExtra === "o365")
    {
      dispMUA.setIcon("o365outlook.png");
      dispMUA.setMuaString("Office 365 Outlook");
      dispMUA.setUrl("https://outlook.com");
      dispMUA.setFound(true);
    }
    else if (strExtra === "oweb")
    {
      dispMUA.setIcon("o365outlook.png");
      dispMUA.setMuaString("Outlook.com");
      dispMUA.setUrl("https://outlook.com");
      dispMUA.setFound(true);
    }
    else if (strExtra === "msteams")
    {
      dispMUA.setIcon("microsoftteams.png");
      dispMUA.setMuaString("Microsoft Teams");
      dispMUA.setUrl("https://www.microsoft.com/microsoft-365/microsoft-teams/group-chat-software");
      dispMUA.setFound(true);
    }
    else if (strExtra === "fairemail")
    {
      dispMUA.setIcon("fairemail.png");
      dispMUA.setMuaString("FairEmail");
      dispMUA.setUrl("https://email.faircode.eu/");
      dispMUA.setFound(true);
    }
    else if (strExtra === "ebay")
    {
      dispMUA.setIcon("ebay2012.png");
      dispMUA.setMuaString("eBay");
      dispMUA.setUrl("https://www.ebay.com/");
      dispMUA.setFound(true);
    }
    else if (strExtra === "pardot")
    {
      dispMUA.setIcon("pardot.png");
      dispMUA.setMuaString("Pardot");
      dispMUA.setUrl("https://www.pardot.com/");
      dispMUA.setFound(true);
    }
    else if (strExtra === "genese")
    {
      dispMUA.setIcon("genese.png");
      dispMUA.setMuaString("Genese");
      dispMUA.setUrl("https://www.genese.de/");
      dispMUA.setFound(true);
    }
  }
  else if (dispMUA.getHeader("organization") !== "")
  {
    dispMUA.getInfo("Organization", "organization");
  }
  else if (dispMUA.getHeader("x-mimeole") !== "")
  {
    dispMUA.getInfo("X-MimeOLE", "x-mimeole");
  }
  else if (dispMUA.getHeader("message-id") !== "")
  {
    dispMUA.getInfo("Message-ID", "message-id");
  }
  if (dispMUA.getIcon() === "empty.png" && dispMUA.getHeader("dkim-signature") !== "")
  {
    dispMUA.getInfo("DKIM-Signature", "dkim-signature");
  }

}

dispMUA.scan = (index, value) =>
{
  let lower = value.toLowerCase();

  for (let key in dispMUA.arDispMUAAllocation[index])
  {
    if (lower.indexOf(key) > -1)
    {
      dispMUA.setInfo(true, dispMUA.arDispMUAAllocation[index][key]);
      break;
    }
  }
}

dispMUA.getInfo = (header) =>
{
  let index = header.toLowerCase();
  let value = dispMUA.getHeader(index);
  dispMUA.setMuaString(header + ": " + value);
  dispMUA.scan(index, value);

  if (dispMUA.getName())
  {
    dispMUA.setMuaString(dispMUA.getName() + "\n" + dispMUA.getMuaString());
  }
}

dispMUA.setInfo = (found, info) =>
{
  dispMUA.setFound(found);
  //dispMUA.setIconPath("chrome://dispmua/content/48x48/");
  //moz-extension://<extension-UUID>/
  dispMUA.setIconPath("content/48x48/");
  dispMUA.setIcon("empty.png");
  dispMUA.setUrl("");
  dispMUA.setName("");

  if (info[0])
  {
    dispMUA.setIcon(info[0]);
  }

  if (info[1])
  {
    dispMUA.setUrl(info[1]);
  }

  if (info[2])
  {
    dispMUA.setName(info[2]);
  }
}

// load a JSON file from the ./content directory
dispMUA.loadJSON = (filename) => {
  return fetch("content/" + filename)
    .then(response => response.json())
    .then(data => {
      dispMUA.arDispMUAAllocation = data;
    });
}

/*
*  loads the user agent overlay file in which users can define their own icons
*
*  The overlay file has a semi-csv format.
*  - On every line, there have to be two strings, split by a comma ","
*  - The first string is the *lowercase* search string which shall match the user agent
*  - The second is the absolute path to the icon
*  If the search string shall include a comma itself, you can quote it.
*    So >"money,inc",/data/icons/money.png< would match the user agent
*    >Mail by Money,Inc. at Cayman Islands< but not >Moneymaker mailer<
*  There is no check for a third (or higher) column, so everything
*    behind the comma is used as the filename.
*  The filename may be quoted as well.
*/
dispMUA.loadMUAOverlayFile = (data) =>
{
  let strLine, nEndQuote, nCommaPos;
  let strKey, strValue;
  let i = 0;

  do
  {
    strLine = data[i++];

    if (strLine.substr(0, 1) === "#")
    {
      //comment
      continue;
    }

    if (strLine.substr(0, 1) === "\"")
    {
      //with quotes
      //find end quote
      nEndQuote = strLine.indexOf("\"", 2);

      if (nEndQuote === -1)
      {
        //no endquote? Bad line!
        continue;
      }

      nCommaPos = strLine.indexOf(",", nEndQuote);
    }
    else
    {
      //no quote
      nCommaPos = strLine.indexOf(",");
    }

    if (nCommaPos === -1)
    {
      //no comma? Bad line!
      continue;
    }

    strKey = dispMUA.stripSurroundingQuotes(strLine.substr(0, nCommaPos));
    strValue = dispMUA.stripSurroundingQuotes(strLine.substr(nCommaPos + 1));
    dispMUA.arDispMUAOverlay[strKey] = strValue;
  }
  while(i < data.length)
}

dispMUA.getOverlay = () => {
  const skey = "overlay";
  browser.storage.local.get(skey).then( s => {
    let data = s[skey];
    data = data.replace(/\r\n/g, "\n").split("\n");
    dispMUA.arDispMUAOverlay.length = 0;
    dispMUA.loadMUAOverlayFile(data);
  }, e => {
    console.log("read error:", e);
  });
}

dispMUA.stripSurroundingQuotes = (string) =>
{
  if (string.substr(0, 1) === "\"" && string.substr(string.length - 1) === "\"")
  {
    string = string.substr(1);
    string = string.substr(0, string.length - 1);
  }

  return(string.trim());
}
