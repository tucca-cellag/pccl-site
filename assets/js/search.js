(function() {
  "use strict";
  var forms = document.querySelectorAll("form.site-search");
  if (!forms.length) return;
  var LIMIT = 8;
  var MIN = 2;
  var MSG_NONE = "No suggestions. Press Enter to search the catalog.";
  var MSG_FAIL = "Suggestions could not be loaded. Press Enter to search the catalog.";
  var MSG_LOADING = "Loading suggestions\u2026";
  function fold(s) {
    return String(s).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
  }
  function squash(s) {
    return fold(s).replace(/ /g, "");
  }
  function cap(s) {
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
  }
  function plural(n, word) {
    return n + " " + word + (n === 1 ? "" : "s");
  }
  function catalogSearch(text) {
    return "catalog.html#q=" + encodeURIComponent(text);
  }
  var WHOSE = Object.assign(/* @__PURE__ */ Object.create(null), {
    1: "WCVP's name",
    2: "GRIN's name",
    3: "WCVP's and GRIN's name"
  });
  function prepare(ix) {
    var out = [];
    function add(e) {
      e.key = e.code ? squash(e.match) : fold(e.match);
      if (e.key) out.push(e);
    }
    var commonCarriers = /* @__PURE__ */ Object.create(null);
    function carry(name, i2) {
      var list = commonCarriers[fold(name)] = commonCarriers[fold(name)] || [];
      if (list.indexOf(i2) < 0) list.push(i2);
    }
    ix.species.forEach(function(s, i2) {
      s[2].forEach(function(c) {
        carry(c, i2);
      });
    });
    (ix.grinCommon || []).forEach(function(g) {
      if (ix.species[g[1]]) carry(g[0], g[1]);
    });
    var grinLabels = Array.isArray(ix.grinLabels) ? ix.grinLabels : [];
    function labelled(name, labels) {
      var list = (Array.isArray(labels) ? labels : []).map(function(k) {
        return typeof k === "number" ? grinLabels[k] : void 0;
      }).filter(function(l) {
        return typeof l === "string" && l !== "";
      });
      return cap(name) + (list.length ? " (" + list.join(", ") + ")" : "");
    }
    function alsoNote(note, list, i2) {
      list.filter(function(j) {
        return j !== i2;
      }).forEach(function(j, n) {
        note.push([n ? ", " : " \xB7 also "]);
        note.push([ix.species[j][0], "binom"]);
      });
      return note;
    }
    function commonNote(c, i2, labels) {
      return alsoNote([[labelled(c, labels)]], commonCarriers[fold(c)] || [], i2);
    }
    ix.species.forEach(function(s, i2) {
      var commons = s[2];
      var labels = Array.isArray(s[3]) ? s[3] : [];
      add({
        match: s[0],
        kind: 0,
        target: "s" + i2,
        name: s[0],
        style: "binom",
        note: commons.length ? [[cap(commons[0])]] : [],
        tag: "Species",
        group: "sp",
        href: s[1]
      });
      commons.forEach(function(c, k) {
        add({
          match: c,
          kind: 0,
          target: "s" + i2,
          name: s[0],
          style: "binom",
          note: commonNote(c, i2, labels[k]),
          tag: "Species",
          group: "sp",
          href: s[1]
        });
      });
    });
    ix.former.forEach(function(f) {
      var s = ix.species[f[1]];
      add({
        match: f[0],
        kind: 0,
        target: "s" + f[1],
        name: f[0],
        style: "binom",
        note: [["now "], [s[0], "binom"]],
        tag: "Former name",
        group: "sp",
        href: s[1]
      });
    });
    (ix.otherNames || []).forEach(function(o) {
      var s = ix.species[o[1]];
      var tag = WHOSE[o[2]];
      if (!s || !tag) return;
      add({
        match: o[0],
        other: 1,
        kind: 0,
        target: "s" + o[1],
        name: o[0],
        style: "binom",
        note: [["listed as "], [s[0], "binom"]],
        tag,
        group: "sp",
        href: s[1]
      });
    });
    (ix.grinCommon || []).forEach(function(g) {
      var s = ix.species[g[1]];
      if (!s) return;
      add({
        match: g[0],
        other: 1,
        kind: 0,
        target: "s" + g[1],
        name: s[0],
        style: "binom",
        note: commonNote(g[0], g[1], g[2]),
        tag: "GRIN's common name",
        group: "sp",
        href: s[1]
      });
    });
    (ix.wfo || []).forEach(function(w) {
      var id = /^wfo-(\d{10})$/i.exec(w[0]);
      var s = ix.species[w[1]];
      if (!id || !s) return;
      add({
        match: id[1],
        wfo: true,
        kind: 0,
        target: "s" + w[1],
        name: w[0],
        style: "cid",
        note: [[s[0], "binom"]],
        tag: "WFO ID",
        group: "sp",
        href: s[1]
      });
    });
    ix.genera.forEach(function(g) {
      var f = ix.families[g[2]];
      var href = "catalog.html#" + (f ? "family=" + encodeURIComponent(f[0]) + "&" : "") + "genus=" + encodeURIComponent(g[0]);
      add({
        match: g[0],
        kind: 1,
        target: "g" + g[0],
        name: g[0],
        style: "binom",
        note: [[g[1] + " species"]],
        tag: "Genus",
        group: "taxon",
        href
      });
    });
    ix.families.forEach(function(f) {
      add({
        match: f[0],
        kind: 2,
        target: "f" + f[0],
        name: f[0],
        style: "",
        note: [[f[1] + " species"]],
        tag: "Family",
        group: "taxon",
        href: "catalog.html#family=" + encodeURIComponent(f[0])
      });
    });
    ix.lines.forEach(function(l, i2) {
      var s = ix.species[l[2]];
      add({
        match: l[0],
        code: true,
        kind: 3,
        target: "l" + i2,
        name: l[0],
        style: "cid",
        note: s ? [[s[0], "binom"]] : [],
        tag: "Cell line",
        group: "line",
        href: l[1]
      });
    });
    ix.formerLines.forEach(function(f) {
      var l = ix.lines[f[1]];
      add({
        match: f[0],
        code: true,
        kind: 3,
        target: "l" + f[1],
        name: f[0],
        style: "cid",
        note: [["now "], [l[0], "cid"]],
        tag: "Former Culture ID",
        group: "line",
        href: l[1]
      });
    });
    ix.media.forEach(function(m) {
      add({
        match: m[0],
        code: true,
        kind: 3,
        target: "m" + m[0],
        name: m[0],
        style: "cid",
        note: [[(m[2] ? m[2] + " \xB7 " : "") + plural(m[3], "line")]],
        tag: "Medium",
        group: "medium",
        href: m[1]
      });
    });
    return out;
  }
  function rank(key, q) {
    if (key === q) return 0;
    var best = -1;
    for (var at = key.indexOf(q); at >= 0; at = key.indexOf(q, at + 1)) {
      var end = at + q.length;
      var wordStart = at === 0 || key.charAt(at - 1) === " ";
      var wordEnd = end === key.length || key.charAt(end) === " ";
      var r = wordStart && wordEnd ? at === 0 ? 1 : 2 : at === 0 ? 3 : wordStart ? 4 : 5;
      if (best < 0 || r < best) best = r;
    }
    return best;
  }
  function suggest(entries2, text) {
    var q = fold(text);
    var qs = q.replace(/ /g, "");
    if (q.length < MIN) return [];
    var typedWfo = /^(?:wfo)?(\d{10})$/.exec(qs);
    var hits = [];
    for (var i2 = 0; i2 < entries2.length; i2++) {
      var e = entries2[i2];
      var r = e.wfo ? typedWfo && e.key === typedWfo[1] ? 0 : -1 : rank(e.key, e.code ? qs : q);
      if (r >= 0) hits.push({ e, rank: r });
    }
    hits.sort(function(a, b) {
      return a.rank - b.rank || a.e.kind - b.e.kind || (a.e.other ? 1 : 0) - (b.e.other ? 1 : 0) || a.e.key.length - b.e.key.length || (a.e.key < b.e.key ? -1 : a.e.key > b.e.key ? 1 : 0);
    });
    var seen = {};
    var out = [];
    for (var j = 0; j < hits.length && out.length < LIMIT; j++) {
      var t = hits[j].e.target;
      if (seen[t]) continue;
      seen[t] = true;
      out.push(hits[j].e);
    }
    return out;
  }
  var entries = null;
  var pending = false;
  var failed = false;
  var boxes = [];
  var indexURL = forms[0].getAttribute("data-index");
  function load() {
    if (entries || pending) return;
    pending = true;
    failed = false;
    fetch(indexURL).then(function(r) {
      if (!r.ok) throw new Error("search index: HTTP " + r.status);
      return r.json();
    }).then(function(ix) {
      entries = prepare(ix);
    }).catch(function() {
      failed = true;
    }).then(function() {
      pending = false;
      boxes.forEach(function(box) {
        if (document.activeElement === box.input) box.update();
      });
    });
  }
  function setup(form) {
    var input = form.querySelector('input[role="combobox"]');
    var list = form.querySelector('[role="listbox"]');
    var msg = form.querySelector('[role="status"]');
    var root = form.getAttribute("data-root") || "";
    var shown = [];
    var active = -1;
    function go(href) {
      window.location.assign(root + href);
    }
    function say(text2, visible) {
      msg.textContent = text2;
      msg.classList.toggle("is-shown", !!visible);
    }
    function setActive(i2) {
      active = i2;
      var opts = list.children;
      for (var j = 0; j < opts.length; j++) {
        opts[j].setAttribute("aria-selected", j === i2 ? "true" : "false");
      }
      if (i2 >= 0) input.setAttribute("aria-activedescendant", opts[i2].id);
      else input.removeAttribute("aria-activedescendant");
    }
    function isOpen() {
      return !list.hidden;
    }
    function open() {
      if (!shown.length) return;
      list.hidden = false;
      input.setAttribute("aria-expanded", "true");
    }
    function close() {
      setActive(-1);
      list.hidden = true;
      input.setAttribute("aria-expanded", "false");
      msg.classList.remove("is-shown");
    }
    function pause() {
      var span = document.createElement("span");
      span.className = "visually-hidden";
      span.textContent = ", ";
      return span;
    }
    function text(el, value, style) {
      if (style === "binom" && window.pcclNameInto) window.pcclNameInto(el, value);
      else el.textContent = value;
    }
    function option(e, i2) {
      var li = document.createElement("li");
      li.id = input.id + "-opt-" + i2;
      li.className = "site-search-opt";
      li.setAttribute("role", "option");
      li.setAttribute("aria-selected", "false");
      li.setAttribute("data-i", String(i2));
      var name = document.createElement("span");
      name.className = "site-search-name" + (e.style ? " " + e.style : "");
      text(name, e.name, e.style);
      li.appendChild(name);
      if (e.note.length) {
        li.appendChild(pause());
        var note = document.createElement("span");
        note.className = "site-search-note";
        e.note.forEach(function(part) {
          if (part[1]) {
            var span = document.createElement("span");
            span.className = part[1];
            text(span, part[0], part[1]);
            note.appendChild(span);
          } else {
            note.appendChild(document.createTextNode(part[0]));
          }
        });
        li.appendChild(note);
      }
      li.appendChild(pause());
      var tag = document.createElement("span");
      tag.className = "site-search-tag is-" + e.group;
      tag.textContent = e.tag;
      li.appendChild(tag);
      return li;
    }
    function update() {
      setActive(-1);
      list.replaceChildren();
      shown = [];
      if (fold(input.value).length < MIN) {
        close();
        say("", false);
        return;
      }
      if (!entries) {
        close();
        say(failed ? MSG_FAIL : MSG_LOADING, failed);
        return;
      }
      shown = suggest(entries, input.value);
      shown.forEach(function(e, i2) {
        list.appendChild(option(e, i2));
      });
      if (shown.length) {
        open();
        say(plural(shown.length, "suggestion"), false);
      } else {
        close();
        say(MSG_NONE, true);
      }
    }
    input.addEventListener("focus", function() {
      load();
      if (input.value) update();
    });
    input.addEventListener("input", function() {
      load();
      update();
    });
    input.addEventListener("blur", close);
    input.addEventListener("keydown", function(e) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        if (!isOpen()) {
          if (!shown.length) update();
          open();
          if (!e.altKey && shown.length) setActive(e.key === "ArrowDown" ? 0 : shown.length - 1);
          return;
        }
        var n = shown.length;
        if (e.key === "ArrowDown") setActive(active + 1 >= n ? 0 : active + 1);
        else setActive(active <= 0 ? n - 1 : active - 1);
      } else if (e.key === "Escape") {
        if (isOpen() || msg.classList.contains("is-shown")) {
          e.preventDefault();
          close();
        } else if (input.value) {
          e.preventDefault();
          input.value = "";
          update();
        }
      }
    });
    list.addEventListener("mousedown", function(e) {
      e.preventDefault();
    });
    list.addEventListener("click", function(e) {
      var li = e.target.closest('[role="option"]');
      if (li) go(shown[Number(li.getAttribute("data-i"))].href);
    });
    form.addEventListener("submit", function(e) {
      e.preventDefault();
      if (isOpen() && active >= 0) {
        go(shown[active].href);
        return;
      }
      var text2 = input.value.trim();
      if (text2) go(catalogSearch(text2));
      else input.focus();
    });
    boxes.push({ input, update, close });
  }
  for (var i = 0; i < forms.length; i++) setup(forms[i]);
  window.addEventListener("pageshow", function() {
    boxes.forEach(function(box) {
      box.close();
    });
  });
})();
