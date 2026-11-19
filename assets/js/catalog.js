(function() {
  "use strict";
  var DATA = window.PCCL_CATALOG || [];
  var grid = document.getElementById("catGrid");
  if (!grid || !DATA.length) return;
  var countEl = document.getElementById("catCount");
  var qEl = document.getElementById("catQ");
  var famSel = document.getElementById("catFamily");
  var genSel = document.getElementById("catGenus");
  var actSel = document.getElementById("catActivity");
  var sortSel = document.getElementById("catSort");
  var growthNote = document.getElementById("catGrowthNote");
  var clearBtn = document.getElementById("catClear");
  var sortSaid = document.getElementById("catSortSaid");
  function fmt(x) {
    return x.toLocaleString("en-US");
  }
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
  var famColorCache = /* @__PURE__ */ Object.create(null);
  function famColor(fam) {
    if (!fam) return "--ink-faint";
    if (!(fam in famColorCache)) {
      var h = 0;
      for (var i = 0; i < fam.length; i++) h = h * 31 + fam.charCodeAt(i) >>> 0;
      famColorCache[fam] = ACCENTS[h % ACCENTS.length];
    }
    return famColorCache[fam];
  }
  var LEAF = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21c0-6 0-9 0-13"/><path d="M12 12C8 12 5 9 5 5c4 0 7 3 7 7Z"/><path d="M12 9c3-1 6-4 6-7-3 0-6 3-6 7Z"/></svg>';
  var CHEV = '<svg class="cat-chev" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>';
  var state = {
    q: "",
    growth: false,
    bio: false,
    fam: "",
    genus: "",
    act: "",
    sort: "common"
  };
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
  function nameKey(name) {
    return name.replace(/×\s*/g, "").trim();
  }
  function sortList(list) {
    var arr = list.slice();
    if (state.sort === "scientific")
      return arr.sort(function(a, b) {
        return nameKey(a.sp).localeCompare(nameKey(b.sp));
      });
    return arr.sort(function(a, b) {
      return (b.common ? 1 : 0) - (a.common ? 1 : 0) || (a.common || nameKey(a.sp)).localeCompare(b.common || nameKey(b.sp));
    });
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
  function wfoDigits(q) {
    var m = /^(?:wfo)?(\d{10})$/.exec(q.replace(/ /g, ""));
    return m ? m[1] : null;
  }
  function matches(d) {
    var q = fold(state.q);
    var byWfo = d.wfo && wfoDigits(q) === d.wfo.slice("wfo-".length);
    if (q && hay(d).indexOf(q) === -1 && !byWfo) return false;
    if (state.growth && !(d.maxGrowth >= 4)) return false;
    if (state.bio && !d.hasAct) return false;
    if (state.fam && d.family !== state.fam) return false;
    if (state.genus && d.genus !== state.genus) return false;
    if (state.act && !(d.acts && d.acts.indexOf(state.act) !== -1)) return false;
    return true;
  }
  var pager = window.PcclPager(48);
  var moreBtn = document.getElementById("catMore");
  var current = [];
  var openSet = /* @__PURE__ */ Object.create(null);
  var drawnFor = null;
  var searching = false;
  function cardsHTML(list, from) {
    return list.map(function(d, k) {
      return cardHTML(d, from + k);
    }).join("");
  }
  function render(step) {
    pager.reset();
    current = sortList(DATA.filter(matches));
    var visible = pager.page(current);
    window.pcclHTML(
      grid,
      visible.length ? cardsHTML(visible, 0) : '<div class="cat-empty">No species match. <button type="button" class="btn btn-ghost" data-clear>Show all species</button></div>'
    );
    countEl.textContent = fmt(current.length);
    if (growthNote) growthNote.hidden = !state.growth;
    if (clearBtn) clearBtn.hidden = !filtered();
    if (sortSaid && sortSel)
      sortSaid.textContent = ", sorted by " + sortSel.options[sortSel.selectedIndex].text.toLowerCase();
    window.PcclPager.syncMore(moreBtn, pager, current);
    if (dlBtn) dlBtn.disabled = current.length === 0;
    writeAddress(step);
    drawnFor = location.hash;
    if (step) searching = false;
  }
  function setMenu(sel, value) {
    if (!sel) return "";
    var known = [].some.call(sel.options, function(o) {
      return o.value === value;
    });
    sel.value = known ? value : sel.options[0].value;
    return sel.value;
  }
  function readAddress() {
    var params = new URLSearchParams(location.hash.slice(1));
    state.q = params.get("q") || "";
    if (qEl) qEl.value = state.q;
    var genus = params.get("genus") || "";
    var fam = params.get("family") || "";
    if (genus && familyOf[genus] && !generaOf[fam]) fam = familyOf[genus];
    setFamily(fam);
    setGenus(genus);
    state.act = setMenu(actSel, params.get("act") || "");
    if (actSel) actSel.classList.toggle("on", !!state.act);
    state.bio = params.get("bio") === "1";
    state.growth = params.get("growth") === "4-5";
    state.sort = setMenu(sortSel, params.get("sort") || "common") || "common";
    syncChips();
    return filtered() || state.sort !== "common";
  }
  function writeAddress(step) {
    var parts = [];
    if (state.q.trim()) parts.push("q=" + encodeURIComponent(state.q));
    if (state.fam) parts.push("family=" + encodeURIComponent(state.fam));
    if (state.genus) parts.push("genus=" + encodeURIComponent(state.genus));
    if (state.act) parts.push("act=" + encodeURIComponent(state.act));
    if (state.bio) parts.push("bio=1");
    if (state.growth) parts.push("growth=4-5");
    if (state.sort === "scientific") parts.push("sort=scientific");
    var hash = parts.length ? "#" + parts.join("&") : "";
    if (hash === location.hash) return;
    var url = location.pathname + location.search + hash;
    if (step) history.pushState(null, "", url);
    else history.replaceState(history.state, "", url);
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
    if (e.target.closest("[data-clear]")) {
      clearFilters();
      return;
    }
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
  function filtered() {
    return !!(state.q.trim() || state.growth || state.bio || state.fam || state.genus || state.act);
  }
  function clearFilters() {
    state.q = "";
    if (qEl) qEl.value = "";
    state.growth = state.bio = false;
    state.act = "";
    setFamily("");
    if (actSel) {
      actSel.value = "";
      actSel.classList.remove("on");
    }
    syncChips();
    render(true);
    if (qEl) qEl.focus();
  }
  if (clearBtn) clearBtn.addEventListener("click", clearFilters);
  function syncChips() {
    var chips2 = document.querySelectorAll(".cat-chip");
    for (var i = 0; i < chips2.length; i++) {
      var f = chips2[i].getAttribute("data-filter");
      chips2[i].setAttribute("aria-pressed", state[f] ? "true" : "false");
    }
  }
  function fillChips() {
    var kept = { bio: 0, growth: 0 };
    var lines = 0;
    var rated = 0;
    DATA.forEach(function(d) {
      if (d.hasAct) kept.bio++;
      if (d.maxGrowth >= 4) kept.growth++;
      d.lines.forEach(function(l) {
        lines++;
        if (l.growth) rated++;
      });
    });
    var spans = document.querySelectorAll("[data-chip-count]");
    for (var i = 0; i < spans.length; i++)
      spans[i].textContent = fmt(kept[spans[i].getAttribute("data-chip-count")]);
    if (growthNote)
      growthNote.textContent = "Growth, 1 slow to 5 fast, is rated for " + fmt(rated) + " of " + fmt(lines) + " held lines.";
  }
  function fillMenu(el, counts, byCount) {
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
  var generaOf = /* @__PURE__ */ Object.create(null);
  var familyOf = /* @__PURE__ */ Object.create(null);
  function populateFilters() {
    var famCounts = /* @__PURE__ */ Object.create(null), actCounts = /* @__PURE__ */ Object.create(null);
    DATA.forEach(function(d) {
      if (d.family) famCounts[d.family] = (famCounts[d.family] || 0) + 1;
      if (d.family && d.genus) {
        var g = generaOf[d.family] = generaOf[d.family] || /* @__PURE__ */ Object.create(null);
        g[d.genus] = (g[d.genus] || 0) + 1;
        familyOf[d.genus] = d.family;
      }
      (d.acts || []).forEach(function(a) {
        actCounts[a] = (actCounts[a] || 0) + 1;
      });
    });
    fillMenu(famSel, famCounts, false);
    fillMenu(actSel, actCounts, true);
  }
  function setFamily(fam) {
    state.fam = setMenu(famSel, fam);
    if (famSel) famSel.classList.toggle("on", !!state.fam);
    state.genus = "";
    if (!genSel) return;
    genSel.textContent = "";
    var all = document.createElement("option");
    all.value = "";
    all.textContent = state.fam ? "All genera" : "Pick a family first";
    genSel.appendChild(all);
    fillMenu(genSel, state.fam && generaOf[state.fam] || {}, false);
    genSel.disabled = !state.fam;
    genSel.classList.remove("on");
  }
  function setGenus(genus) {
    state.genus = setMenu(genSel, genus);
    if (genSel) genSel.classList.toggle("on", !!state.genus);
  }
  var chips = document.querySelectorAll(".cat-chip");
  for (var j = 0; j < chips.length; j++) {
    (function(chip) {
      chip.addEventListener("click", function() {
        var f = chip.getAttribute("data-filter");
        state[f] = !state[f];
        syncChips();
        render(true);
      });
    })(chips[j]);
  }
  if (qEl)
    qEl.addEventListener("input", function(e) {
      state.q = e.target.value;
      render(!searching);
      searching = true;
    });
  if (famSel)
    famSel.addEventListener("change", function() {
      setFamily(this.value);
      render(true);
    });
  if (genSel)
    genSel.addEventListener("change", function() {
      setGenus(this.value);
      render(true);
    });
  if (sortSel)
    sortSel.addEventListener("change", function() {
      state.sort = this.value;
      render(true);
    });
  if (actSel)
    actSel.addEventListener("change", function() {
      state.act = this.value;
      this.classList.toggle("on", !!this.value);
      render(true);
    });
  populateFilters();
  fillChips();
  if (readAddress()) {
    render();
    document.querySelector(".cat-filters").scrollIntoView({ block: "start" });
  } else {
    render();
  }
  function followAddress() {
    if (location.hash === drawnFor) return;
    searching = false;
    readAddress();
    render();
  }
  window.addEventListener("popstate", followAddress);
  window.addEventListener("hashchange", followAddress);
})();
