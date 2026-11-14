(function() {
  "use strict";
  var DATA = window.PCCL_CATALOG || [];
  var grid = document.getElementById("catGrid");
  if (!grid || !DATA.length) return;
  var banner = document.getElementById("catLensBanner");
  var lensText = document.getElementById("catLensText");
  var sortNote = document.getElementById("catSortNote");
  var countEl = document.getElementById("catCount");
  var qEl = document.getElementById("catQ");
  var famSel = document.getElementById("catFamily");
  var actSel = document.getElementById("catActivity");
  var STATUS = {
    lc: { cls: "lc", label: "Live & Cryo" },
    lo: { cls: "lo", label: "Live only" },
    co: { cls: "co", label: "Cryopreserved" }
  };
  var ACCENTS = [
    "--green",
    "--teal",
    "--orange",
    "--purple",
    "--red",
    "--blue",
    "--brown",
    "--yellow"
  ];
  var famColorCache = {};
  function famColor(fam) {
    if (!fam) return "--ink-faint";
    if (!(fam in famColorCache)) {
      var h = 0;
      for (var i2 = 0; i2 < fam.length; i2++) h = h * 31 + fam.charCodeAt(i2) >>> 0;
      famColorCache[fam] = ACCENTS[h % ACCENTS.length];
    }
    return famColorCache[fam];
  }
  var LEAF = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21c0-6 0-9 0-13"/><path d="M12 12C8 12 5 9 5 5c4 0 7 3 7 7Z"/><path d="M12 9c3-1 6-4 6-7-3 0-6 3-6 7Z"/></svg>';
  var CHEV = '<svg class="cat-chev" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>';
  var LENSES = {
    plant: {
      c: "--green",
      sort: "common",
      note: "\xB7 by common name",
      text: "<b>Plant person.</b> Sorted by common name, to browse the collection as plants.",
      chips: []
    },
    startup: {
      c: "--orange",
      sort: "acts",
      note: "\xB7 most bioactive first",
      text: "<b>Startup.</b> Lines from species with reported bioactivity first.",
      chips: ["bio"]
    },
    research: {
      c: "--teal",
      sort: "species",
      note: "\xB7 A\u2013Z by species",
      text: "<b>Researcher.</b> Sorted A\u2013Z by species. Search a name or Culture ID above; open a card for media &amp; lines.",
      chips: []
    },
    industry: {
      c: "--blue-deep",
      sort: "growth",
      note: "\xB7 fastest-growing first",
      text: "<b>Big industry.</b> Fastest-growing lines first, for scale-up.",
      chips: ["fast"]
    }
  };
  var activeLens = null;
  var state = { q: "", fast: false, bio: false, avail: false, named: false, fam: "", act: "" };
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function(c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }
  function cap(s) {
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
  }
  function lineSlug(cid) {
    return String(cid == null ? "" : cid).trim().replace(/\s+/g, "-");
  }
  function cardHTML(d, idx) {
    var fam = famColor(d.family);
    var title = d.common ? '<span class="common">' + esc(cap(d.common)) + "</span>" : '<span class="common sp">' + esc(d.sp) + "</span>";
    var showBinom = d.common && d.common.toLowerCase() !== d.sp.toLowerCase();
    var path = [d.order, d.family, d.genus].filter(Boolean).join(" \u203A ") || "Taxonomy pending";
    var st = d.status && STATUS[d.status];
    var statusBadge = st ? '<span class="cat-status ' + st.cls + '">' + st.label + "</span>" : "";
    var growthBadge = d.maxGrowth ? '<span class="cat-growth">growth <span class="g">' + d.maxGrowth + "</span>/5</span>" : "";
    var acts = d.acts && d.acts.length ? '<div class="cat-actrow">' + d.acts.map(function(a) {
      return '<span class="cat-act">' + esc(a) + "</span>";
    }).join("") + "</div>" : "";
    var n = d.lines.length;
    var open = !!openSet[d.sp];
    return '<article class="cat-card' + (open ? " open" : "") + '" data-i="' + idx + '" style="--fam:var(' + fam + ')"><button class="cat-head" type="button" aria-expanded="' + open + '" aria-controls="catlines-' + idx + '"><span class="cat-thumb">' + LEAF + '</span><span class="cat-title">' + title + (showBinom ? '<span class="binom">' + esc(d.sp) + "</span>" : "") + '<span class="path">' + esc(path) + '</span></span><span class="cat-badges">' + statusBadge + growthBadge + '<span class="cat-nlines">' + n + " line" + (n > 1 ? "s" : "") + "</span></span>" + CHEV + "</button>" + acts + '<div class="cat-expand" id="catlines-' + idx + '">' + (open ? linesHTML(d) : "") + "</div></article>";
  }
  function linesHTML(d) {
    return '<div class="cat-lines"><div class="lh">Cell lines \xB7 Culture ID / status / media / growth</div>' + d.lines.map(function(l) {
      var ls = l.status && STATUS[l.status];
      var lstat = ls ? '<span class="cat-status lstat ' + ls.cls + '">' + ls.label + "</span>" : "";
      var media = l.media ? '<span class="lmeta">' + esc(l.media) + "</span>" : "";
      var g = l.growth ? '<span class="lmeta">growth ' + l.growth + "/5</span>" : "";
      return '<div class="cat-line"><a class="cid" href="line/' + esc(lineSlug(l.cid)) + '.html">' + esc(l.cid) + "</a>" + lstat + media + g + '<a class="req" href="order.html">Request \u2192</a></div>';
    }).join("") + (d.id ? '<div class="cat-line"><a class="req" href="species/' + esc(d.id) + '.html">Species page \u2192</a></div>' : "") + "</div>";
  }
  var STATUS_RANK = { lc: 3, lo: 2, co: 1 };
  function hasCommon(x) {
    return x.common ? 1 : 0;
  }
  function isAvail(x) {
    return x.hasAvail ? 1 : 0;
  }
  function hasMedia(x) {
    return x.lines.some(function(l) {
      return l.media;
    }) ? 1 : 0;
  }
  function sortList(list) {
    var s = activeLens ? LENSES[activeLens].sort : "common";
    var arr = list.slice();
    var byName = function(a, b) {
      return (a.common || a.sp).localeCompare(b.common || b.sp);
    };
    if (s === "common")
      arr.sort(function(a, b) {
        return hasCommon(b) - hasCommon(a) || byName(a, b);
      });
    else if (s === "species")
      arr.sort(function(a, b) {
        return a.sp.localeCompare(b.sp);
      });
    else if (s === "acts")
      arr.sort(function(a, b) {
        return b.acts.length - a.acts.length || b.maxGrowth - a.maxGrowth || isAvail(b) - isAvail(a) || byName(a, b);
      });
    else if (s === "growth")
      arr.sort(function(a, b) {
        return b.maxGrowth - a.maxGrowth || isAvail(b) - isAvail(a) || (STATUS_RANK[b.status] || 0) - (STATUS_RANK[a.status] || 0) || hasMedia(b) - hasMedia(a) || byName(a, b);
      });
    return arr;
  }
  function fold(s) {
    return String(s == null ? "" : s).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
  }
  var hayCache = /* @__PURE__ */ new WeakMap();
  function hay(d) {
    if (!hayCache.has(d)) {
      hayCache.set(
        d,
        fold(
          [d.sp, d.allCommon, d.family, d.genus].concat(
            d.lines.map(function(l) {
              return l.cid;
            })
          ).join(" ")
        )
      );
    }
    return hayCache.get(d);
  }
  function matches(d) {
    var q = fold(state.q);
    if (q && hay(d).indexOf(q) === -1) return false;
    if (state.fast && d.maxGrowth < 4) return false;
    if (state.bio && !d.hasAct) return false;
    if (state.avail && !d.hasAvail) return false;
    if (state.named && !d.common) return false;
    if (state.fam && d.family !== state.fam) return false;
    if (state.act && !(d.acts && d.acts.indexOf(state.act) !== -1)) return false;
    return true;
  }
  var pager = window.PcclPager(48);
  var moreBtn = document.getElementById("catMore");
  var current = [];
  var openSet = /* @__PURE__ */ Object.create(null);
  function cardsHTML(list, from) {
    return list.map(function(d, k) {
      return cardHTML(d, from + k);
    }).join("");
  }
  function render() {
    pager.reset();
    current = sortList(DATA.filter(matches));
    var visible = pager.page(current);
    window.pcclHTML(
      grid,
      visible.length ? cardsHTML(visible, 0) : '<div class="cat-empty">No lines match. Try clearing a filter or the lens.</div>'
    );
    countEl.textContent = current.length;
    sortNote.textContent = activeLens ? LENSES[activeLens].note : "";
    window.PcclPager.syncMore(moreBtn, pager, current);
    if (dlBtn) dlBtn.disabled = current.length === 0;
    writeAddress();
  }
  function readAddress() {
    var params = new URLSearchParams(location.hash.slice(1));
    state.q = params.get("q") || "";
    if (qEl) qEl.value = state.q;
    var fam = params.get("family") || "";
    if (famSel) {
      var known = [].some.call(famSel.options, function(o) {
        return o.value === fam;
      });
      famSel.value = known ? fam : "";
      state.fam = famSel.value;
      famSel.classList.toggle("on", !!state.fam);
    }
    return !!(state.q || state.fam);
  }
  function writeAddress() {
    var parts = [];
    if (state.q.trim()) parts.push("q=" + encodeURIComponent(state.q));
    if (state.fam) parts.push("family=" + encodeURIComponent(state.fam));
    var hash = parts.length ? "#" + parts.join("&") : "";
    if (hash !== location.hash) {
      history.replaceState(history.state, "", location.pathname + location.search + hash);
    }
  }
  function showMore() {
    var before = pager.page(current).length;
    pager.more();
    var tpl = document.createElement("template");
    window.pcclHTML(tpl, cardsHTML(pager.page(current).slice(before), before));
    var firstHead = tpl.content.querySelector(".cat-head");
    grid.appendChild(tpl.content);
    window.PcclPager.syncMore(moreBtn, pager, current);
    if (firstHead) firstHead.focus();
  }
  grid.addEventListener("click", function(e) {
    var head = e.target.closest(".cat-head");
    if (!head) return;
    var card = head.closest(".cat-card");
    var d = current[Number(card.getAttribute("data-i"))];
    var open = card.classList.toggle("open");
    head.setAttribute("aria-expanded", open ? "true" : "false");
    if (open) openSet[d.sp] = true;
    else delete openSet[d.sp];
    var expand = card.querySelector(".cat-expand");
    if (open && !expand.firstChild) window.pcclHTML(expand, linesHTML(d));
  });
  if (moreBtn) moreBtn.addEventListener("click", showMore);
  var dlBtn = document.getElementById("catDownload");
  var DL_HEADER = [
    "culture_id",
    "species",
    "species_id",
    "common_names",
    "genus",
    "family",
    "order",
    "status",
    "medium",
    "growth",
    "available_to_request",
    "species_activities"
  ];
  function downloadResults() {
    var words = JSON.parse(dlBtn.getAttribute("data-status"));
    var rows = [];
    current.forEach(function(d) {
      var common = d.allCommon ? d.allCommon.split(",").join("; ") : "";
      d.lines.forEach(function(l) {
        rows.push([
          l.cid,
          d.sp,
          d.id,
          common,
          d.genus,
          d.family,
          d.order,
          words[l.status] || "Not recorded",
          l.media || "",
          l.growth,
          !!l.avail,
          (d.acts || []).join("; ")
        ]);
      });
    });
    var blob = new Blob([window.pcclCSV(DL_HEADER, rows)], { type: "text/csv;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "pccl-catalog-results-" + dlBtn.getAttribute("data-date") + ".csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function() {
      URL.revokeObjectURL(url);
    }, 0);
  }
  if (dlBtn) dlBtn.addEventListener("click", downloadResults);
  function syncChips() {
    var chips2 = document.querySelectorAll(".cat-chip");
    for (var i2 = 0; i2 < chips2.length; i2++) {
      var f = chips2[i2].getAttribute("data-filter");
      chips2[i2].setAttribute("aria-pressed", state[f] ? "true" : "false");
    }
  }
  function resetFilters() {
    state.fast = state.bio = state.avail = state.named = false;
    state.fam = state.act = "";
    if (famSel) {
      famSel.value = "";
      famSel.classList.remove("on");
    }
    if (actSel) {
      actSel.value = "";
      actSel.classList.remove("on");
    }
  }
  function populateFilters() {
    var famCounts = {}, actCounts = {};
    DATA.forEach(function(d) {
      if (d.family) famCounts[d.family] = (famCounts[d.family] || 0) + 1;
      (d.acts || []).forEach(function(a) {
        actCounts[a] = (actCounts[a] || 0) + 1;
      });
    });
    function fill(el, counts, byCount) {
      if (!el) return;
      Object.keys(counts).sort(function(a, b) {
        return byCount ? counts[b] - counts[a] || a.localeCompare(b) : a.localeCompare(b);
      }).forEach(function(k) {
        var o = document.createElement("option");
        o.value = k;
        o.textContent = k + " (" + counts[k] + ")";
        el.appendChild(o);
      });
    }
    fill(famSel, famCounts, false);
    fill(actSel, actCounts, true);
  }
  function setLens(lens) {
    if (activeLens === lens) {
      clearLens();
      return;
    }
    activeLens = lens;
    var doors2 = document.querySelectorAll(".cat-door");
    for (var i2 = 0; i2 < doors2.length; i2++) {
      doors2[i2].setAttribute(
        "aria-pressed",
        doors2[i2].getAttribute("data-lens") === lens ? "true" : "false"
      );
    }
    var L = LENSES[lens];
    resetFilters();
    L.chips.forEach(function(c) {
      state[c] = true;
    });
    banner.hidden = false;
    banner.style.setProperty("--lc", "var(" + L.c + ")");
    window.pcclHTML(lensText, L.text);
    if (lens === "research" && qEl) {
      try {
        qEl.focus({ preventScroll: true });
      } catch {
        qEl.focus();
      }
    }
    syncChips();
    render();
  }
  function clearLens() {
    activeLens = null;
    var doors2 = document.querySelectorAll(".cat-door");
    for (var i2 = 0; i2 < doors2.length; i2++) doors2[i2].setAttribute("aria-pressed", "false");
    banner.hidden = true;
    resetFilters();
    syncChips();
    render();
  }
  var doors = document.querySelectorAll(".cat-door");
  for (var i = 0; i < doors.length; i++) {
    (function(btn) {
      btn.addEventListener("click", function() {
        setLens(btn.getAttribute("data-lens"));
      });
    })(doors[i]);
  }
  document.getElementById("catLensClear").addEventListener("click", clearLens);
  var chips = document.querySelectorAll(".cat-chip");
  for (var j = 0; j < chips.length; j++) {
    (function(chip) {
      chip.addEventListener("click", function() {
        var f = chip.getAttribute("data-filter");
        state[f] = !state[f];
        syncChips();
        render();
      });
    })(chips[j]);
  }
  if (qEl)
    qEl.addEventListener("input", function(e) {
      state.q = e.target.value;
      render();
    });
  if (famSel)
    famSel.addEventListener("change", function() {
      state.fam = this.value;
      this.classList.toggle("on", !!this.value);
      render();
    });
  if (actSel)
    actSel.addEventListener("change", function() {
      state.act = this.value;
      this.classList.toggle("on", !!this.value);
      render();
    });
  populateFilters();
  if (readAddress()) {
    render();
    document.querySelector(".cat-filters").scrollIntoView({ block: "start" });
  } else {
    render();
  }
  window.addEventListener("hashchange", function() {
    readAddress();
    render();
  });
})();
