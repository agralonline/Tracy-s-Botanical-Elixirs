/**
 * THE BOTANICAL APOTHECARY — Visible error banner (diagnostic tool)
 * ---------------------------------------------------------------------
 * Loaded as a plain classic <script> (NOT type="module") at the very top
 * of <head> on every page — deliberately before anything else, so it
 * keeps working even if the main module script fails to load entirely
 * (404, wrong MIME type, syntax error, etc.).
 *
 * Why this exists: this is a static site deployed by hand (no CI, no
 * error monitoring service), and most debugging so far has been
 * "the customer describes what they see" over chat with no way to see
 * the actual browser console. This turns any uncaught JS error or
 * unhandled promise rejection into a plain red banner at the top of the
 * page with the real error message — so a screenshot from a phone is
 * enough to diagnose the problem, no dev tools needed.
 *
 * Safe to remove later once the site has been stable for a while and a
 * proper error-monitoring setup (e.g. Sentry) replaces it — but it's
 * inert / invisible when there's no error, so there's no harm in
 * leaving it in.
 */
(function () {
  var shown = false;

  function showError(message) {
    // Only show the FIRST error — once something's broken, cascading
    // follow-on errors from the same root cause would just spam the
    // banner and bury the useful first message.
    if (shown) return;
    shown = true;

    var bar = document.createElement("div");
    bar.id = "tracy-error-banner";
    bar.style.cssText =
      "position:fixed;top:0;left:0;right:0;z-index:2147483647;" +
      "background:#dc2626;color:#fff;font:12px/1.5 -apple-system,Menlo,monospace;" +
      "padding:10px 40px 10px 14px;white-space:pre-wrap;word-break:break-word;" +
      "max-height:45vh;overflow:auto;box-shadow:0 2px 10px rgba(0,0,0,.4);";
    bar.textContent =
      "Site error — please screenshot this red bar and send it to support:\n\n" + message;

    var closeBtn = document.createElement("button");
    closeBtn.textContent = "×";
    closeBtn.setAttribute("aria-label", "Dismiss");
    closeBtn.style.cssText =
      "position:absolute;top:6px;right:10px;background:none;border:none;color:#fff;" +
      "font-size:20px;line-height:1;cursor:pointer;padding:4px 8px;";
    closeBtn.onclick = function () {
      bar.remove();
    };
    bar.appendChild(closeBtn);

    function mount() {
      if (document.body) document.body.appendChild(bar);
    }
    if (document.body) mount();
    else document.addEventListener("DOMContentLoaded", mount);
  }

  window.addEventListener("error", function (e) {
    var loc = e.filename ? e.filename.split("/").pop() + ":" + e.lineno : "";
    showError((e.message || "Unknown script error") + (loc ? "\n(" + loc + ")" : ""));
  });

  window.addEventListener("unhandledrejection", function (e) {
    var reason = e.reason;
    var msg = reason && reason.message ? reason.message : String(reason);
    var stack = reason && reason.stack ? "\n" + String(reason.stack).split("\n").slice(0, 3).join("\n") : "";
    showError("Unhandled error: " + msg + stack);
  });
})();
