(function() {
  var tip = document.getElementById("history-tip");
  if (!tip) return;
  function show(mark, x, y) {
    var value = document.createElement("strong");
    value.textContent = mark.getAttribute("data-value");
    tip.replaceChildren(value, document.createTextNode(mark.getAttribute("data-label")));
    tip.hidden = false;
    tip.style.left = Math.max(8, Math.min(x + 12, innerWidth - tip.offsetWidth - 8)) + "px";
    tip.style.top = y + 12 + "px";
  }
  function hide() {
    tip.hidden = true;
  }
  var marks = document.querySelectorAll(".history-report [data-value]");
  for (var i = 0; i < marks.length; i++) {
    (function(mark) {
      mark.addEventListener("pointermove", function(e) {
        show(mark, e.clientX, e.clientY);
      });
      mark.addEventListener("pointerleave", hide);
      mark.addEventListener("focus", function() {
        var r = mark.getBoundingClientRect();
        show(mark, r.right, r.top);
      });
      mark.addEventListener("blur", hide);
    })(marks[i]);
  }
})();
