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
