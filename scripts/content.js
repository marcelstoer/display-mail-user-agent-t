(function() {
    /**
     * グローバルなガード変数をチェック、設定する。
     * コンテンツスクリプトが再び同じページに挿入された場合、
     * 次は何もしない。
     */
    if (window.hasRun) {
      return;
    }
    window.hasRun = true;
  
    /**
     * 動物の画像の URL を受け取り、既存の動物をすべて削除し、次に
     * 画像を指す IMG 要素の作成・スタイル適用を行い、
     * 作成したノードをドキュメント内に挿入する
     */
    function setIcon(iconPath) {
        let dispMUAicon = document.getElementById("feedback-icon");
        dispMUAicon.setAttribute("src", iconPath);
        /*beastImage.style.height = "100vh";
        beastImage.className = "beastify-image";
        document.body.appendChild(beastImage);*/
    }
  
    /**
     * バックグラウンドスクリプトからのメッセージをリッスンし、
     * "beastify()" か "reset()" を呼び出す。
     */
    browser.runtime.onMessage.addListener((message) => {
        console.log("dispMUA content_script loaded.");
        if (message.command === "dispMUAicon") {
            setIcon(message.iconPath);
        }
    });
  
  })();