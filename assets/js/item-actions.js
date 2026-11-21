(function() {
  var status = document.getElementById("item-status");
  var timer;
  function announce(message) {
    if (!status) return;
    clearTimeout(timer);
    status.textContent = "";
    status.classList.remove("show");
    timer = setTimeout(function() {
      status.textContent = message;
      status.classList.add("show");
      timer = setTimeout(function() {
        status.classList.remove("show");
        timer = setTimeout(function() {
          status.textContent = "";
        }, 300);
      }, 2e3);
    }, 50);
  }
  function copy(text, confirmation) {
    function failed() {
      announce("Could not copy: " + text);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function() {
        announce(confirmation);
      }, failed);
    } else {
      failed();
    }
  }
  function markWideTables() {
    var wraps = document.querySelectorAll(".table-wrap");
    for (var i = 0; i < wraps.length; i++) {
      var wrap = wraps[i];
      var next = wrap.nextElementSibling;
      var hint = next && next.classList.contains("table-hint") ? next : null;
      var wide = wrap.scrollWidth > wrap.clientWidth + 1;
      if (wide && !hint) {
        hint = document.createElement("p");
        hint.className = "table-hint";
        hint.textContent = "The table is wider than the screen: scroll it sideways for every column.";
        wrap.parentNode.insertBefore(hint, wrap.nextSibling);
      } else if (!wide && hint) {
        hint.remove();
      }
    }
  }
  markWideTables();
  window.addEventListener("resize", markWideTables);
  if (document.fonts) document.fonts.ready.then(markWideTables);
  document.addEventListener("click", function(e) {
    var button = e.target.closest("[data-print], [data-copy-link], [data-copy]");
    if (!button) return;
    if (button.hasAttribute("data-print")) {
      window.print();
    } else if (button.hasAttribute("data-copy-link")) {
      copy(location.origin + location.pathname, "Link copied");
    } else {
      copy(button.getAttribute("data-copy"), button.getAttribute("data-copied") || "Copied");
    }
  });
})();
