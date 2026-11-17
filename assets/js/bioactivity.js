(function() {
  "use strict";
  var DATA = window.PCCL_BIOACTIVITY;
  var DETAIL = window.PCCL_DETAIL || {};
  var panel = document.getElementById("mapdetail");
  var tip = document.getElementById("maptip");
  if (!DATA || !panel) return;
  var hint = Array.prototype.map.call(panel.childNodes, function(n) {
    return n.cloneNode(true);
  });
  var tally = /* @__PURE__ */ Object.create(null);
  DATA.forEach(function(d) {
    d.f.forEach(function(a) {
      tally[a] = (tally[a] || 0) + 1;
    });
  });
  var ACTS = Object.keys(tally).sort(function(a, b) {
    return tally[b] - tally[a] || (a < b ? -1 : 1);
  });
  var CODES = {
    Antiviral: "AV",
    Antibacterial: "AB",
    Antifungal: "AF",
    Trypanocidal: "TC",
    Anthelmintic: "AH",
    Insecticidal: "IC",
    Anticancer: "AC"
  };
  var code = function(a) {
    return CODES[a] || a.slice(0, 2).toUpperCase();
  };
  var byName = /* @__PURE__ */ Object.create(null);
  DATA.forEach(function(d) {
    byName[d.s] = d;
  });
  var membersOf = function(a) {
    return DATA.filter(function(d) {
      return d.f.indexOf(a) >= 0;
    });
  };
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function(c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  var plural = function(n, one, many) {
    return n + " " + (n === 1 ? one : many);
  };
  var stacked = window.matchMedia("(max-width: 900px)");
  var still = window.matchMedia("(prefers-reduced-motion: reduce)");
  function bringPanel() {
    if (stacked.matches)
      panel.scrollIntoView({ behavior: still.matches ? "auto" : "smooth", block: "nearest" });
  }
  function statusChip(s) {
    s = (s || "").toLowerCase();
    if (s.indexOf("live") >= 0 && s.indexOf("cryo") >= 0)
      return '<span class="chip live">\u25CF Live &amp; Cryo</span>';
    if (s.indexOf("cryo") >= 0) return '<span class="chip cryo">\u25C6 Cryopreserved</span>';
    return "";
  }
  function showSpecies(m) {
    var d = DETAIL[m.s];
    var html = '<p class="d-rank">Species</p><h3 class="d-name sp">' + (d && d.id ? '<a href="species/' + esc(d.id) + '.html">' + esc(m.s) + "</a>" : esc(m.s)) + "</h3>";
    if (d && d.common)
      html += '<p class="d-common">' + esc(d.common.split(",").join(", ")) + "</p>";
    if (d) {
      var parts = [d.order, d.family, d.genus || m.s.split(" ")[0]].filter(Boolean);
      if (parts.length) html += '<p class="d-path">' + parts.map(esc).join(" \u203A ") + "</p>";
    }
    html += '<p class="d-sub">Reported activities</p><div class="d-acts">' + m.f.map(function(a) {
      return '<span class="tag">' + esc(a) + "</span>";
    }).join("") + "</div>";
    if (d && d.lines && d.lines.length) {
      html += '<p class="d-sub">In the collection \xB7 ' + plural(d.lines.length, "cell line", "cell lines") + '</p><ul class="d-lines">' + d.lines.map(function(l) {
        return '<li><span class="cid">' + esc(l.cid) + "</span>" + statusChip(l.status) + (l.media ? '<span class="d-media">media ' + esc(l.media) + "</span>" : "") + "</li>";
      }).join("") + '</ul><a class="btn btn-primary d-req" href="order.html">Request a line \u203A</a>';
    } else {
      html += '<p class="d-hint">Reported in the literature review; not listed in the catalog.</p>';
    }
    window.pcclHTML(panel, html);
    panel.classList.add("open");
  }
  function showGroup(rank, title, members) {
    var sorted = members.slice().sort(function(a, b) {
      return b.n - a.n || (a.s < b.s ? -1 : 1);
    });
    window.pcclHTML(
      panel,
      '<p class="d-rank">' + esc(rank) + '</p><h3 class="d-name">' + esc(title) + '</h3><p class="d-sub">' + plural(members.length, "species", "species") + '</p><div class="d-chips">' + sorted.map(function(m) {
        return '<button type="button" class="d-chip" data-sp="' + esc(m.s) + '"><em>' + esc(m.s) + "</em> <b>" + m.n + "</b></button>";
      }).join("") + "</div>"
    );
    panel.classList.add("open");
    Array.prototype.forEach.call(panel.querySelectorAll(".d-chip"), function(b) {
      b.addEventListener("click", function() {
        openSpecies(byName[b.getAttribute("data-sp")], true);
      });
    });
  }
  function select(el) {
    Array.prototype.forEach.call(
      document.querySelectorAll("#combos .sel, #biotable .sel"),
      function(x) {
        x.classList.remove("sel");
      }
    );
    if (el) el.classList.add("sel");
  }
  function tipAt(x, y, value, label) {
    if (!tip) return;
    window.pcclHTML(
      tip,
      '<div class="t-name">' + esc(value) + '</div><div class="t-n">' + esc(label) + "</div>"
    );
    var stage = tip.parentNode.getBoundingClientRect();
    tip.style.left = x - stage.left + "px";
    tip.style.top = y - stage.top + "px";
    tip.style.opacity = 1;
  }
  function hideTip() {
    if (tip) tip.style.opacity = 0;
  }
  function hover(el, value, label) {
    el.addEventListener("pointermove", function(e) {
      tipAt(e.clientX, e.clientY, value, label);
    });
    el.addEventListener("pointerleave", hideTip);
    el.addEventListener("focus", function() {
      var r = el.getBoundingClientRect();
      tipAt(r.left + r.width * 0.75, r.top, value, label);
    });
    el.addEventListener("blur", hideTip);
  }
  var combos = document.getElementById("combos");
  var heads = /* @__PURE__ */ Object.create(null);
  var rows = [];
  if (combos) {
    var groups = /* @__PURE__ */ Object.create(null);
    DATA.forEach(function(d) {
      var key2 = ACTS.filter(function(a) {
        return d.f.indexOf(a) >= 0;
      }).join("\0");
      (groups[key2] = groups[key2] || []).push(d);
    });
    rows = Object.keys(groups).map(function(key2) {
      return { acts: key2.split("\0"), members: groups[key2] };
    }).sort(function(a, b) {
      return b.members.length - a.members.length || a.acts.length - b.acts.length;
    });
    var most = rows.length ? rows[0].members.length : 1;
    combos.style.setProperty("--n", ACTS.length);
    var head = document.createElement("div");
    head.className = "up-head";
    ACTS.forEach(function(a) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "up-h";
      var nm = document.createElement("span");
      nm.className = "nm";
      nm.textContent = a;
      var ct = document.createElement("span");
      ct.className = "ct";
      ct.textContent = tally[a];
      var sr = document.createElement("span");
      sr.className = "sr-only";
      sr.textContent = " species";
      b.appendChild(nm);
      b.appendChild(document.createTextNode(" "));
      b.appendChild(ct);
      b.appendChild(sr);
      b.addEventListener("click", function() {
        openActivity(a, true);
        bringPanel();
      });
      heads[a] = b;
      head.appendChild(b);
    });
    var hb = document.createElement("span");
    hb.className = "up-headbar";
    hb.textContent = "Species with exactly these";
    head.appendChild(hb);
    combos.appendChild(head);
    rows.forEach(function(r) {
      var n = r.members.length;
      var label = r.acts.join(" + ");
      var b = document.createElement("button");
      b.type = "button";
      b.className = "up-row";
      b.setAttribute(
        "aria-label",
        plural(n, "species carries", "species carry") + " exactly " + label
      );
      var on = ACTS.map(function(a) {
        return r.acts.indexOf(a) >= 0;
      });
      var first = on.indexOf(true);
      var last = on.lastIndexOf(true);
      if (last > first) {
        var link = document.createElement("span");
        link.className = "up-link";
        link.setAttribute("aria-hidden", "true");
        link.style.left = "calc(var(--cell) * " + (first + 0.5) + ")";
        link.style.width = "calc(var(--cell) * " + (last - first) + ")";
        b.appendChild(link);
      }
      on.forEach(function(isOn) {
        var cell = document.createElement("span");
        cell.className = "up-cell";
        cell.setAttribute("aria-hidden", "true");
        var dot = document.createElement("span");
        dot.className = "up-dot" + (isOn ? " on" : "");
        cell.appendChild(dot);
        b.appendChild(cell);
      });
      var bc = document.createElement("span");
      bc.className = "up-barcell";
      bc.setAttribute("aria-hidden", "true");
      var bar = document.createElement("span");
      bar.className = "up-bar";
      bar.style.width = n / most * 85 + "%";
      var num = document.createElement("span");
      num.className = "up-n";
      num.textContent = n;
      bc.appendChild(bar);
      bc.appendChild(num);
      b.appendChild(bc);
      hover(b, plural(n, "species", "species"), "exactly " + label);
      r.el = b;
      b.addEventListener("click", function() {
        openRow(r, true);
        bringPanel();
      });
      combos.appendChild(b);
    });
  }
  var table = document.getElementById("biotable");
  if (table) {
    var key = document.getElementById("biokey");
    if (key)
      key.textContent = ACTS.map(function(a) {
        return code(a) + " " + a;
      }).join(" \xB7 ");
    var sort = { by: "n", dir: -1 };
    var filter = "";
    var thead = document.createElement("thead");
    var tr = document.createElement("tr");
    var cols = [{ id: "s", label: "Species" }].concat(
      ACTS.map(function(a) {
        return { id: a, label: code(a), title: a };
      })
    ).concat([{ id: "n", label: "Count", title: "Activities reported" }]);
    var tbody = document.createElement("tbody");
    var count = document.getElementById("biocount");
    var drawTable = function() {
      Array.prototype.forEach.call(tr.children, function(th, i) {
        th.setAttribute(
          "aria-sort",
          cols[i].id === sort.by ? sort.dir > 0 ? "ascending" : "descending" : "none"
        );
      });
      var q = filter.trim().toLowerCase();
      var list = DATA.filter(function(d) {
        return !q || d.s.toLowerCase().indexOf(q) >= 0;
      }).sort(function(a, b) {
        var va, vb;
        if (sort.by === "s") {
          va = a.s;
          vb = b.s;
        } else if (sort.by === "n") {
          va = a.n;
          vb = b.n;
        } else {
          va = a.f.indexOf(sort.by) >= 0 ? 1 : 0;
          vb = b.f.indexOf(sort.by) >= 0 ? 1 : 0;
        }
        if (va !== vb) return (va < vb ? -1 : 1) * sort.dir;
        return a.s < b.s ? -1 : 1;
      });
      if (count) count.textContent = plural(list.length, "species", "species") + " shown";
      tbody.textContent = "";
      list.forEach(function(d) {
        var row = document.createElement("tr");
        var td = document.createElement("td");
        var b = document.createElement("button");
        b.type = "button";
        b.className = "sp";
        b.textContent = d.s;
        b.addEventListener("click", function() {
          openSpecies(d, true);
          bringPanel();
        });
        td.appendChild(b);
        row.appendChild(td);
        ACTS.forEach(function(a) {
          var c = document.createElement("td");
          if (d.f.indexOf(a) >= 0) {
            var dot = document.createElement("span");
            dot.className = "dot";
            dot.title = a;
            dot.setAttribute("role", "img");
            dot.setAttribute("aria-label", a);
            c.appendChild(dot);
          }
          row.appendChild(c);
        });
        var n = document.createElement("td");
        n.className = "n";
        n.textContent = d.n;
        row.appendChild(n);
        tbody.appendChild(row);
      });
    };
    cols.forEach(function(c) {
      var th = document.createElement("th");
      th.scope = "col";
      var b = document.createElement("button");
      b.type = "button";
      b.textContent = c.label;
      if (c.title) {
        b.title = c.title;
        if (c.id !== "n") {
          var full = document.createElement("span");
          full.className = "sr-only";
          full.textContent = " (" + c.title + ")";
          b.appendChild(full);
        }
      }
      b.addEventListener("click", function() {
        sort = { by: c.id, dir: sort.by === c.id ? -sort.dir : c.id === "s" ? 1 : -1 };
        drawTable();
      });
      th.appendChild(b);
      tr.appendChild(th);
    });
    thead.appendChild(tr);
    table.appendChild(thead);
    table.appendChild(tbody);
    var input = document.getElementById("biofilter");
    if (input)
      input.addEventListener("input", function() {
        filter = input.value;
        drawTable();
      });
    drawTable();
  }
  var drawnFor = null;
  function writeAddress(hash, step) {
    if (hash !== location.hash) {
      var url = location.pathname + location.search + hash;
      if (step) history.pushState(null, "", url);
      else history.replaceState(history.state, "", url);
    }
    drawnFor = location.hash;
  }
  function openActivity(a, step) {
    select(heads[a]);
    showGroup("Activity", a, membersOf(a));
    writeAddress("#act=" + encodeURIComponent(a), step);
  }
  function openRow(r, step) {
    select(r.el);
    showGroup(
      r.acts.length > 1 ? "Exactly these activities" : "Only this activity",
      r.acts.join(" + "),
      r.members
    );
    writeAddress("#exactly=" + r.acts.map(encodeURIComponent).join(","), step);
  }
  function openSpecies(m, step) {
    var b = [].filter.call(document.querySelectorAll("#biotable button.sp"), function(x) {
      return x.textContent === m.s;
    })[0];
    select(b ? b.closest("tr") : null);
    showSpecies(m);
    writeAddress("#species=" + encodeURIComponent(m.s), step);
  }
  function openNothing() {
    select(null);
    panel.textContent = "";
    hint.forEach(function(n) {
      panel.appendChild(n.cloneNode(true));
    });
    panel.classList.remove("open");
    writeAddress("", false);
  }
  function rawPart(key2) {
    var found = null;
    location.hash.slice(1).split("&").forEach(function(kv) {
      if (kv.slice(0, key2.length + 1) === key2 + "=") found = kv.slice(key2.length + 1);
    });
    return found;
  }
  function lowerDecoded(raw) {
    try {
      return decodeURIComponent(raw.replace(/\+/g, " ")).toLowerCase();
    } catch {
      return "";
    }
  }
  function fromAddress() {
    var raw = rawPart("act");
    if (raw !== null) {
      var a = ACTS.filter(function(x) {
        return x.toLowerCase() === lowerDecoded(raw);
      })[0];
      return a ? function() {
        openActivity(a, false);
      } : null;
    }
    raw = rawPart("exactly");
    if (raw !== null) {
      var want = raw.split(",").map(lowerDecoded);
      var r = rows.filter(function(x) {
        return x.acts.length === want.length && x.acts.every(function(y) {
          return want.indexOf(y.toLowerCase()) >= 0;
        });
      })[0];
      return r ? function() {
        openRow(r, false);
      } : null;
    }
    raw = rawPart("species");
    if (raw !== null) {
      var m = DATA.filter(function(d) {
        return d.s.toLowerCase() === lowerDecoded(raw);
      })[0];
      return m ? function() {
        openSpecies(m, false);
      } : null;
    }
    return null;
  }
  function followAddress() {
    if (location.hash === drawnFor) return;
    var open = fromAddress();
    if (open) open();
    else openNothing();
  }
  var linked = fromAddress();
  if (linked) {
    linked();
    if (stacked.matches) bringPanel();
    else if (combos)
      combos.scrollIntoView({ behavior: still.matches ? "auto" : "smooth", block: "start" });
  } else {
    writeAddress("", false);
  }
  window.addEventListener("popstate", followAddress);
  window.addEventListener("hashchange", followAddress);
})();
