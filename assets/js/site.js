/* Tproject 公式サイト  最小限のJS
   1) スマホ用メニューの開閉
   2) スクロールで要素をふわっと出す（reduced-motion では無効）
   3) フッターの年号                                             */
(function () {
  "use strict";

  // 1) メニュー
  var btn = document.querySelector(".menu-btn");
  var drawer = document.getElementById("drawer");
  if (btn && drawer) {
    btn.addEventListener("click", function () {
      var open = btn.getAttribute("aria-expanded") === "true";
      btn.setAttribute("aria-expanded", String(!open));
      drawer.setAttribute("data-open", String(!open));
    });
    drawer.addEventListener("click", function (e) {
      if (e.target.closest("a")) {
        btn.setAttribute("aria-expanded", "false");
        drawer.setAttribute("data-open", "false");
      }
    });
  }

  // 2) スクロール出現
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var targets = document.querySelectorAll(".reveal");
  if (!reduce && "IntersectionObserver" in window && targets.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    targets.forEach(function (t) { io.observe(t); });
  } else {
    targets.forEach(function (t) { t.classList.add("in"); });
  }

  // 2b) 浮くLINEボタン：最終CTA（#contact）が見えている間は隠す（QRコードと重なるため）
  var fab = document.querySelector(".line-float");
  var contact = document.getElementById("contact");
  if (fab && contact && "IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { fab.classList.toggle("hide", en.isIntersecting); });
    }, { threshold: 0.15 }).observe(contact);
  }

  // 3) 年号
  var y = document.getElementById("year");
  if (y) y.textContent = String(new Date().getFullYear());
})();

// 4) Instagram連携フィード（tproject-jp.com/ig/feed から取得して並べる）
(function () {
  var FEED_ENDPOINT = "https://tproject-jp.com/ig/feed";

  document.querySelectorAll(".ig-feed").forEach(function (root) {
    var grid = root.querySelector(".ig-feed__grid");
    var fallback = root.querySelector(".ig-feed__fallback");
    if (!grid || !fallback) return;

    var link = fallback.querySelector("a");
    if (link) link.href = "https://www.instagram.com/" + root.dataset.account + "/";

    function showFallback() { grid.hidden = true; fallback.hidden = false; }

    fetch(FEED_ENDPOINT + "?shop=" + encodeURIComponent(root.dataset.shop))
      .then(function (res) { return res.ok ? res.json() : Promise.reject(res.status); })
      .then(function (data) {
        if (!data.posts || !data.posts.length) return showFallback();
        data.posts.forEach(function (post) {
          var a = document.createElement("a");
          a.className = "ig-feed__item";
          a.href = post.link;
          a.target = "_blank";
          a.rel = "noopener";
          a.setAttribute("role", "listitem");
          var img = document.createElement("img");
          img.src = post.image;
          img.loading = "lazy";
          img.decoding = "async";
          // キャプションの1行目を代替テキストにする（読み上げ対応）
          img.alt = (post.caption || "Instagramの投稿").split("\n")[0].slice(0, 80);
          a.appendChild(img);
          grid.appendChild(a);
        });
      })
      .catch(showFallback);
  });
})();

/* 4) 問い合わせの入口ごとの押された回数をGA4へ（2026-10-09）
   メール・公式LINE・電話相談の予約、どれが押されたかを月次レポートで比べるため。
   イベント名：contact_email／contact_line／contact_booking（どのページのどこかは GA4 のページの情報で分かる） */
(function () {
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("a[href]");
    if (!a || typeof window.gtag !== "function") return;
    var href = a.getAttribute("href") || "";
    var name = null;
    if (href.indexOf("mailto:") === 0) name = "contact_email";
    else if (/(^|\/\/)(line\.me|lin\.ee)\//.test(href)) name = "contact_line";
    else if (/calendar\.app\.google|calendar\.google\.com/.test(href)) name = "contact_booking";
    if (!name) return;
    window.gtag("event", name, { link_text: (a.textContent || "").trim().slice(0, 40), transport_type: "beacon" });
  }, true);
})();
