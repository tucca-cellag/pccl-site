(function() {
  "use strict";
  var UPRIGHT_WORDS = [
    "subsp.",
    "ssp.",
    "var.",
    "subvar.",
    "f.",
    "subf.",
    "forma",
    "nothosubsp.",
    "nothovar.",
    "nothof.",
    "convar.",
    "cv.",
    "sect.",
    "subsect.",
    "ser.",
    "subser.",
    "subg.",
    "agg.",
    "sp.",
    "spp."
  ];
  var QUOTED = /(^|\s)(['‘"“][^'’"”]+['’"”])(?=\s|$)/g;
  function nameParts(name) {
    var text = String(name == null ? "" : name);
    var parts = [];
    function push(t, upright) {
      if (!t) return;
      var last = parts[parts.length - 1];
      if (last && last.upright === upright) last.text += t;
      else parts.push({ text: t, upright });
    }
    function words(chunk) {
      chunk.split(/(\s+)/).forEach(function(token) {
        if (UPRIGHT_WORDS.indexOf(token) !== -1) push(token, true);
        else
          token.split(/(×)/).forEach(function(bit) {
            push(bit, bit === "\xD7");
          });
      });
    }
    var at = 0;
    var m;
    QUOTED.lastIndex = 0;
    while (m = QUOTED.exec(text)) {
      words(text.slice(at, m.index + m[1].length));
      push(m[2], true);
      at = m.index + m[0].length;
    }
    words(text.slice(at));
    return parts;
  }
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function(c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }
  nameParts.words = UPRIGHT_WORDS.slice();
  window.pcclNameParts = nameParts;
  window.pcclNameHTML = function(name) {
    return nameParts(name).map(function(p) {
      return p.upright ? '<span class="upright">' + esc(p.text) + "</span>" : esc(p.text);
    }).join("");
  };
  window.pcclNameInto = function(el, name) {
    nameParts(name).forEach(function(p) {
      if (!p.upright) {
        el.appendChild(document.createTextNode(p.text));
        return;
      }
      var span = document.createElement("span");
      span.className = "upright";
      span.textContent = p.text;
      el.appendChild(span);
    });
    return el;
  };
})();
