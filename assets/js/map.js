(function() {
  var DATA = window.PCCL_TAXONOMY;
  if (!DATA) return;
  var DETAIL = window.PCCL_DETAIL || {};
  var svg = document.getElementById("mapsvg");
  var tip = document.getElementById("maptip");
  var crumb = document.getElementById("mapcrumb");
  var legendEl = document.getElementById("maplegend");
  var detailEl = document.getElementById("mapdetail");
  var searchEl = document.getElementById("mapsearch");
  var suggestEl = document.getElementById("mapsuggest");
  if (!svg) return;
  var NS = "http://www.w3.org/2000/svg";
  var TAU = Math.PI * 2;
  var RANKS = ["collection", "order", "family", "genus", "species"];
  function build(node, depth, parent) {
    node.depth = depth;
    node.parent = parent;
    if (node.children && node.children.length) {
      node.nspecies = 0;
      node.nlines = 0;
      node.children.forEach(function(c) {
        build(c, depth + 1, node);
        node.nspecies += c.nspecies;
        node.nlines += c.nlines;
      });
    } else {
      node.nspecies = 1;
      var d = DETAIL[node.name];
      node.nlines = d && d.lines ? d.lines.length : 0;
    }
    return node;
  }
  var root = build(JSON.parse(JSON.stringify(DATA)), 0, null);
  (function rec(n) {
    n.value = n.nspecies;
    if (n.children) n.children.forEach(rec);
  })(root);
  var orders = root.children.map(function(o) {
    return o.name;
  });
  var hueOf = {};
  orders.forEach(function(o, i) {
    hueOf[o] = Math.round(i / orders.length * 360);
  });
  function orderAncestor(d) {
    while (d && d.depth > 1) d = d.parent;
    return d;
  }
  function isDark() {
    var t = document.documentElement.getAttribute("data-theme");
    if (t) return t === "dark";
    return matchMedia("(prefers-color-scheme: dark)").matches;
  }
  function color(d) {
    if (d.depth === 0) return isDark() ? "#3A2E25" : "#63493A";
    var oa = orderAncestor(d);
    var h = oa ? hueOf[oa.name] : 200;
    var dk = isDark();
    return "hsl(" + h + "," + (52 - (d.depth - 1) * 6) + "%," + ((dk ? 40 : 52) + (d.depth - 1) * (dk ? 7 : 8)) + "%)";
  }
  function el(name, attrs) {
    var e = document.createElementNS(NS, name);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }
  function showTip(html, x, y) {
    window.pcclHTML(tip, html);
    tip.style.opacity = 1;
    tip.style.left = x + "px";
    tip.style.top = y + "px";
  }
  function hideTip() {
    tip.style.opacity = 0;
  }
  function unit() {
    return "species";
  }
  function tipHTML(d) {
    var rank = RANKS[d.depth] || "taxon";
    var v = d.value, u = unit();
    var nm = d.depth === 4 ? "<em>" + esc(d.name) + "</em>" : esc(d.name);
    return '<div class="t-r">' + rank + '</div><div class="t-name">' + nm + '</div><div class="t-n">' + v + " " + u + "</div>";
  }
  function statusChip(s) {
    s = (s || "").toLowerCase();
    if (s.indexOf("live") >= 0 && s.indexOf("cryo") >= 0)
      return '<span class="chip cryo">\u25C6 Live &amp; Cryo</span>';
    if (s.indexOf("cryo") >= 0) return '<span class="chip cryo">\u2744 Cryopreserved</span>';
    if (s.indexOf("live") >= 0) return '<span class="chip live">\u25CF Live</span>';
    return "";
  }
  var SIZE = 700, R = SIZE / 2 - 4, CX = SIZE / 2, CY = SIZE / 2, MAXR = 4;
  var focus = root, selected = null;
  function layout() {
    (function rec(n, x0, x1) {
      n.x0 = x0;
      n.x1 = x1;
      if (n.children && n.value > 0) {
        var x = x0;
        n.children.forEach(function(c) {
          var w = (x1 - x0) * c.value / n.value;
          rec(c, x, x + w);
          x += w;
        });
      }
    })(root, 0, TAU);
  }
  function arc(ri, ro, a0, a1) {
    if (a1 - a0 > TAU - 1e-6) a1 = a0 + TAU - 1e-6;
    var lg = a1 - a0 > Math.PI ? 1 : 0;
    var x0 = CX + ri * Math.cos(a0), y0 = CY + ri * Math.sin(a0), x1 = CX + ro * Math.cos(a0), y1 = CY + ro * Math.sin(a0);
    var x2 = CX + ro * Math.cos(a1), y2 = CY + ro * Math.sin(a1), x3 = CX + ri * Math.cos(a1), y3 = CY + ri * Math.sin(a1);
    return "M" + x0 + "," + y0 + "L" + x1 + "," + y1 + "A" + ro + "," + ro + " 0 " + lg + " 1 " + x2 + "," + y2 + "L" + x3 + "," + y3 + "A" + ri + "," + ri + " 0 " + lg + " 0 " + x0 + "," + y0 + "Z";
  }
  function drawSun() {
    layout();
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    svg.setAttribute("viewBox", "0 0 " + SIZE + " " + SIZE);
    var top = focus.depth === 0, shown = top ? 2 : MAXR, ring = R / (shown + 1), span = focus.x1 - focus.x0 || TAU, nodes = [];
    (function collect(n) {
      nodes.push(n);
      if (n.children) n.children.forEach(collect);
    })(root);
    nodes.forEach(function(d) {
      var rd = d.depth - focus.depth;
      if (rd < 1 || rd > shown || d.value <= 0) return;
      var up = d;
      while (up.depth > focus.depth) up = up.parent;
      if (up !== focus) return;
      var a0 = (d.x0 - focus.x0) / span * TAU, a1 = (d.x1 - focus.x0) / span * TAU;
      if (a1 - a0 < 2e-3) return;
      var ri = rd * ring, ro = (rd + 1) * ring;
      if (!top && (a1 - a0) * ro < 3) return;
      var p = el("path", {
        d: arc(ri, ro, a0 - Math.PI / 2, a1 - Math.PI / 2),
        fill: color(d),
        stroke: d === selected ? "var(--ink)" : "var(--paper-raised)",
        "stroke-width": d === selected ? 2.5 : 1
      });
      p.classList.add("arc");
      p.setAttribute("data-depth", d.depth);
      p.addEventListener("mousemove", function(e) {
        var r = svg.getBoundingClientRect();
        showTip(tipHTML(d), e.clientX - r.left, e.clientY - r.top);
        p.style.opacity = 0.82;
      });
      p.addEventListener("mouseleave", function() {
        hideTip();
        p.style.opacity = 1;
      });
      p.style.cursor = "pointer";
      p.setAttribute("tabindex", "0");
      p.setAttribute("role", "button");
      p.setAttribute("aria-label", d.name + ", " + d.value + " " + unit());
      var act = function() {
        selected = d;
        openDetail(d);
        if (d.children) {
          focus = d;
        }
        drawSun();
        updateCrumb();
      };
      p.addEventListener("click", act);
      p.addEventListener("keydown", function(e) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          act();
        }
      });
      p.addEventListener("focus", function() {
        var b = p.getBBox();
        showTip(tipHTML(d), b.x + b.width / 2, b.y);
        p.style.opacity = 0.82;
      });
      p.addEventListener("blur", function() {
        hideTip();
        p.style.opacity = 1;
      });
      svg.appendChild(p);
    });
    var hub = el("circle", {
      cx: CX,
      cy: CY,
      r: ring - 2,
      fill: color(focus),
      stroke: "var(--paper-raised)",
      "stroke-width": 2
    });
    hub.style.cursor = focus.parent ? "pointer" : "default";
    hub.addEventListener("click", function() {
      if (focus.parent) {
        focus = focus.parent;
        selected = focus;
        openDetail(focus);
        drawSun();
        updateCrumb();
      }
    });
    hub.addEventListener("mousemove", function(e) {
      var r = svg.getBoundingClientRect();
      showTip(
        tipHTML(focus) + (focus.parent ? '<div class="t-hint">click to zoom out</div>' : ""),
        e.clientX - r.left,
        e.clientY - r.top
      );
    });
    hub.addEventListener("mouseleave", hideTip);
    svg.appendChild(hub);
    var label2 = el("text", {
      x: CX,
      y: CY,
      "text-anchor": "middle",
      "dominant-baseline": "central",
      class: "hub-label"
    });
    label2.textContent = focus.depth === 0 ? "PCCL" : focus.name;
    label2.style.pointerEvents = "none";
    svg.appendChild(label2);
  }
  function updateCrumb() {
    if (!crumb) return;
    var chain = [], d = focus;
    while (d) {
      chain.unshift(d);
      d = d.parent;
    }
    window.pcclHTML(
      crumb,
      chain.map(function(n, i) {
        return '<button class="cx" data-i="' + i + '">' + (n.depth === 0 ? "All orders" : esc(n.name)) + "</button>";
      }).join('<span class="csep">\u203A</span>')
    );
    Array.prototype.forEach.call(crumb.querySelectorAll(".cx"), function(b) {
      b.addEventListener("click", function() {
        focus = chain[+b.getAttribute("data-i")];
        selected = focus;
        openDetail(focus);
        drawSun();
        updateCrumb();
      });
    });
  }
  var seed = 1;
  function rand() {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  }
  function shuffled(a) {
    var out = a.slice();
    for (var i = out.length - 1; i > 0; i--) {
      var j = Math.floor(rand() * (i + 1)), t = out[i];
      out[i] = out[j];
      out[j] = t;
    }
    return out;
  }
  function enclosesNot(a, b) {
    var dr = a.r - b.r, dx = b.x - a.x, dy = b.y - a.y;
    return dr < 0 || dr * dr < dx * dx + dy * dy;
  }
  function enclosesWeak(a, b) {
    var dr = a.r - b.r + Math.max(a.r, b.r, 1) * 1e-9, dx = b.x - a.x, dy = b.y - a.y;
    return dr > 0 && dr * dr > dx * dx + dy * dy;
  }
  function enclosesWeakAll(a, B) {
    for (var i = 0; i < B.length; i++) if (!enclosesWeak(a, B[i])) return false;
    return true;
  }
  function basis2(a, b) {
    var x21 = b.x - a.x, y21 = b.y - a.y, r21 = b.r - a.r, l = Math.sqrt(x21 * x21 + y21 * y21);
    return {
      x: (a.x + b.x + x21 / l * r21) / 2,
      y: (a.y + b.y + y21 / l * r21) / 2,
      r: (l + a.r + b.r) / 2
    };
  }
  function basis3(a, b, c) {
    var x1 = a.x, y1 = a.y, r1 = a.r, a2 = x1 - b.x, a3 = x1 - c.x, b2 = y1 - b.y, b3 = y1 - c.y, c2 = b.r - r1, c3 = c.r - r1, d1 = x1 * x1 + y1 * y1 - r1 * r1, d2 = d1 - b.x * b.x - b.y * b.y + b.r * b.r, d3 = d1 - c.x * c.x - c.y * c.y + c.r * c.r, ab = a3 * b2 - a2 * b3, xa = (b2 * d3 - b3 * d2) / (ab * 2) - x1, xb = (b3 * c2 - b2 * c3) / ab, ya = (a3 * d2 - a2 * d3) / (ab * 2) - y1, yb = (a2 * c3 - a3 * c2) / ab, A = xb * xb + yb * yb - 1, B = 2 * (r1 + xa * xb + ya * yb), C = xa * xa + ya * ya - r1 * r1, r = -(Math.abs(A) > 1e-6 ? (B + Math.sqrt(B * B - 4 * A * C)) / (2 * A) : C / B);
    return { x: x1 + xa + xb * r, y: y1 + ya + yb * r, r };
  }
  function basis(B) {
    if (B.length === 1) return { x: B[0].x, y: B[0].y, r: B[0].r };
    if (B.length === 2) return basis2(B[0], B[1]);
    return basis3(B[0], B[1], B[2]);
  }
  function extendBasis(B, p) {
    var i, j;
    if (enclosesWeakAll(p, B)) return [p];
    for (i = 0; i < B.length; i++)
      if (enclosesNot(p, B[i]) && enclosesWeakAll(basis2(B[i], p), B)) return [B[i], p];
    for (i = 0; i < B.length - 1; i++)
      for (j = i + 1; j < B.length; j++)
        if (enclosesNot(basis2(B[i], B[j]), p) && enclosesNot(basis2(B[i], p), B[j]) && enclosesNot(basis2(B[j], p), B[i]) && enclosesWeakAll(basis3(B[i], B[j], p), B))
          return [B[i], B[j], p];
    throw new Error("enclose: no basis");
  }
  function enclose(circles) {
    var list = shuffled(circles), i = 0, B = [], e = null;
    while (i < list.length) {
      var p = list[i];
      if (e && enclosesWeak(e, p)) i++;
      else {
        B = extendBasis(B, p);
        e = basis(B);
        i = 0;
      }
    }
    return e;
  }
  function place(b, a, c) {
    var dx = b.x - a.x, dy = b.y - a.y, d2 = dx * dx + dy * dy, x, y, a2, b2;
    if (d2) {
      a2 = (a.r + c.r) * (a.r + c.r);
      b2 = (b.r + c.r) * (b.r + c.r);
      if (a2 > b2) {
        x = (d2 + b2 - a2) / (2 * d2);
        y = Math.sqrt(Math.max(0, b2 / d2 - x * x));
        c.x = b.x - x * dx - y * dy;
        c.y = b.y - x * dy + y * dx;
      } else {
        x = (d2 + a2 - b2) / (2 * d2);
        y = Math.sqrt(Math.max(0, a2 / d2 - x * x));
        c.x = a.x + x * dx - y * dy;
        c.y = a.y + x * dy + y * dx;
      }
    } else {
      c.x = a.x + c.r;
      c.y = a.y;
    }
  }
  function intersects(a, b) {
    var dr = a.r + b.r - 1e-6, dx = b.x - a.x, dy = b.y - a.y;
    return dr > 0 && dr * dr > dx * dx + dy * dy;
  }
  function score(node) {
    var a = node.c, b = node.next.c, ab = a.r + b.r, dx = (a.x * b.r + b.x * a.r) / ab, dy = (a.y * b.r + b.y * a.r) / ab;
    return dx * dx + dy * dy;
  }
  function packSiblings(circles) {
    var n = circles.length;
    if (!n) return 0;
    var a = circles[0], b, c, i, j, k, sj, sk, aa, ca;
    a.x = 0;
    a.y = 0;
    if (n === 1) return a.r;
    b = circles[1];
    a.x = -b.r;
    b.x = a.r;
    b.y = 0;
    if (n === 2) {
      var e2 = enclose([a, b]);
      a.x -= e2.x;
      a.y -= e2.y;
      b.x -= e2.x;
      b.y -= e2.y;
      return e2.r;
    }
    place(b, a, c = circles[2]);
    a = { c: a };
    b = { c: b };
    c = { c };
    a.next = c.previous = b;
    b.next = a.previous = c;
    c.next = b.previous = a;
    pack: for (i = 3; i < n; i++) {
      place(a.c, b.c, circles[i]);
      c = { c: circles[i] };
      j = b.next;
      k = a.previous;
      sj = b.c.r;
      sk = a.c.r;
      do {
        if (sj <= sk) {
          if (intersects(j.c, c.c)) {
            b = j;
            a.next = b;
            b.previous = a;
            i--;
            continue pack;
          }
          sj += j.c.r;
          j = j.next;
        } else {
          if (intersects(k.c, c.c)) {
            a = k;
            a.next = b;
            b.previous = a;
            i--;
            continue pack;
          }
          sk += k.c.r;
          k = k.previous;
        }
      } while (j !== k.next);
      c.previous = a;
      c.next = b;
      a.next = b.previous = b = c;
      aa = score(a);
      while ((c = c.next) !== b) {
        if ((ca = score(c)) < aa) {
          a = c;
          aa = ca;
        }
      }
      b = a.next;
    }
    var chain = [b.c];
    c = b;
    while ((c = c.next) !== b) chain.push(c.c);
    var e = enclose(chain);
    for (i = 0; i < n; i++) {
      circles[i].x -= e.x;
      circles[i].y -= e.y;
    }
    return e.r;
  }
  function packWithGap(circles, gap) {
    circles.forEach(function(c) {
      c.r += gap / 2;
    });
    var r = packSiblings(circles);
    circles.forEach(function(c) {
      c.r -= gap / 2;
    });
    return r;
  }
  function dotsOf(family) {
    return speciesLeaves(family).map(function(sp) {
      return { r: 1, sp };
    });
  }
  var packed = null;
  function packTree() {
    if (packed) return packed;
    seed = 1;
    var tree = [];
    root.children.forEach(function(o) {
      if (o.value <= 0) return;
      var fams = [];
      o.children.forEach(function(f) {
        if (f.value <= 0) return;
        var dots = dotsOf(f);
        fams.push({ node: f, dots, r: packWithGap(dots, 0.35) * 1.12 });
      });
      fams.sort(function(a, b) {
        return b.r - a.r;
      });
      tree.push({ node: o, fams, r: packWithGap(fams, 0.8) * 1.04 });
    });
    tree.sort(function(a, b) {
      return b.r - a.r;
    });
    packed = { orders: tree, r: packWithGap(tree, 2.5) };
    return packed;
  }
  function paper() {
    return getComputedStyle(document.documentElement).getPropertyValue("--paper-raised").trim();
  }
  function textFits(text, size, room) {
    return text.length * size * 0.58 < room;
  }
  function label(x, y, text, size) {
    var t = el("text", {
      x,
      y,
      "text-anchor": "middle",
      "dominant-baseline": "central",
      class: "blob-label",
      stroke: paper(),
      "stroke-width": size / 3.5,
      "stroke-linejoin": "round",
      "paint-order": "stroke"
    });
    t.textContent = text;
    t.style.pointerEvents = "none";
    t.style.fontSize = size + "px";
    return t;
  }
  function familyTipHTML(f, o) {
    return '<div class="t-r">family \xB7 ' + esc(o.node.name) + '</div><div class="t-name">' + esc(f.node.name) + '</div><div class="t-n">' + f.node.value + " " + unit() + "</div>";
  }
  function placeNames(items, size, box, placed) {
    var pad = size * 0.15;
    function clear(r) {
      if (r.x < box.x || r.y < box.y || r.x + r.w > box.x + box.w || r.y + r.h > box.y + box.w)
        return false;
      for (var i = 0; i < placed.length; i++) {
        var p = placed[i];
        if (r.x < p.x + p.w && p.x < r.x + r.w && r.y < p.y + p.h && p.y < r.y + r.h) return false;
      }
      return true;
    }
    items.slice().sort(function(a, b) {
      return b.r - a.r;
    }).forEach(function(it) {
      var t = label(it.x, it.y, it.text, size);
      svg.appendChild(t);
      var bb = t.getBBox(), w = bb.width + 2 * pad, h = bb.height + 2 * pad, lift = bb.y + bb.height / 2 - it.y, spots = bb.width < 1.9 * it.r ? [[0, 0]] : [];
      [1, 1.8].forEach(function(m) {
        var below = (it.r + h / 2) * m, side = (it.r + w / 2 + pad) * m, dx = (it.r * 0.71 + w / 2) * m, dy = (it.r * 0.71 + h / 2) * m;
        spots.push([0, below], [0, -below], [side, 0], [-side, 0]);
        spots.push([dx, dy], [-dx, dy], [dx, -dy], [-dx, -dy]);
      });
      var pick = spots[0], rect = null;
      for (var i = 0; i < spots.length; i++) {
        var r = {
          x: it.x + spots[i][0] - w / 2,
          y: it.y + spots[i][1] + lift - h / 2,
          w,
          h
        };
        if (clear(r)) {
          pick = spots[i];
          rect = r;
          break;
        }
      }
      t.setAttribute("x", it.x + pick[0]);
      t.setAttribute("y", it.y + pick[1]);
      placed.push(
        rect || { x: it.x + pick[0] - w / 2, y: it.y + pick[1] + lift - h / 2, w, h }
      );
    });
  }
  var zoomed = null, zoomedGroup = null, drawnWidth = 0;
  function zoomIn(node, fromKeyboard) {
    zoomed = node;
    selected = node;
    openDetail(node);
    hideTip();
    drawBubbles();
    if (fromKeyboard && zoomedGroup) {
      var first = zoomedGroup.querySelector(".blob");
      if (first) first.focus();
    }
  }
  function zoomOut(fromKeyboard) {
    var was = zoomed;
    zoomed = null;
    hideTip();
    drawBubbles();
    if (fromKeyboard && was) {
      Array.prototype.forEach.call(svg.querySelectorAll("g.b-order"), function(g) {
        if (g.getAttribute("data-name") === was.name) g.querySelector(".b-ring").focus();
      });
    }
  }
  svg.addEventListener("click", function(e) {
    if (view === "bubble" && zoomed && !(zoomedGroup && zoomedGroup.contains(e.target))) zoomOut();
  });
  document.addEventListener("keydown", function(e) {
    if (e.key !== "Escape" || view !== "bubble" || !zoomed) return;
    if (e.target.closest && e.target.closest("input, textarea, select")) return;
    zoomOut(svg.contains(e.target));
  });
  window.addEventListener("resize", function() {
    if (view === "bubble" && Math.abs(svg.getBoundingClientRect().width - drawnWidth) > 1)
      drawBubbles();
  });
  function asButton(c, node) {
    c.setAttribute("tabindex", "0");
    c.setAttribute("role", "button");
    c.setAttribute("aria-label", node.name + ", " + node.value + " " + unit());
  }
  function onActivate(node, act) {
    node.addEventListener("keydown", function(e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        act();
      }
    });
  }
  function tipAt(html, e) {
    var rc = svg.getBoundingClientRect();
    showTip(html, e.clientX - rc.left, e.clientY - rc.top);
  }
  var ZOOM_HINT = '<div class="t-hint">click to zoom in</div>';
  function drawBubbles() {
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    var t = packTree(), s = (SIZE / 2 - 4) / t.r, dk = isDark(), zo = null;
    t.orders.forEach(function(o) {
      if (o.node === zoomed) zo = o;
    });
    if (!zo) zoomed = null;
    zoomedGroup = null;
    var box = zo ? { x: CX + (zo.x - zo.r) * s, y: CY + (zo.y - zo.r) * s, w: 2 * zo.r * s } : { x: 0, y: 0, w: SIZE };
    svg.setAttribute("viewBox", box.x + " " + box.y + " " + box.w + " " + box.w);
    svg.style.cursor = zo ? "zoom-out" : "";
    drawnWidth = svg.getBoundingClientRect().width;
    var k = box.w / (drawnWidth || SIZE);
    var labels = [], named = [];
    t.orders.forEach(function(o) {
      var hue = hueOf[o.node.name], ox = CX + o.x * s, oy = CY + o.y * s, orr = o.r * s, open = o === zo, dim = zo && !open, ring = "hsl(" + hue + "," + (dk ? 40 : 50) + "%," + (dk ? 60 : 38) + "%)", tint = "hsl(" + hue + "," + (dk ? 38 : 52) + "%," + (dk ? 32 : 82) + "%)", dotFill = "hsl(" + hue + "," + (dk ? 45 : 55) + "%," + (dk ? 66 : 36) + "%)";
      var og = el("g", { class: "b-order", "data-name": o.node.name });
      if (dim) og.setAttribute("opacity", 0.25);
      var ringEl = el("circle", {
        class: "b-ring",
        cx: ox,
        cy: oy,
        r: orr,
        fill: "hsl(" + hue + ",40%," + (dk ? 16 : 96) + "%)",
        stroke: ring,
        "stroke-width": 1.6 * k
      });
      og.appendChild(ringEl);
      if (open) {
        zoomedGroup = og;
        og.style.cursor = "default";
      } else if (!zo) {
        og.style.cursor = "zoom-in";
        asButton(ringEl, o.node);
        og.addEventListener("click", function(e) {
          e.stopPropagation();
          zoomIn(o.node);
        });
        onActivate(ringEl, function() {
          zoomIn(o.node, true);
        });
        ringEl.addEventListener("mousemove", function(e) {
          tipAt(tipHTML(o.node) + ZOOM_HINT, e);
        });
        ringEl.addEventListener("mouseleave", hideTip);
      }
      o.fams.forEach(function(f) {
        var fx = ox + f.x * s, fy = oy + f.y * s, fr = f.r * s, dr = 0.82 * s;
        var g = el("g", { class: "b-family", "data-name": f.node.name });
        var blob = el("circle", {
          class: "blob",
          cx: fx,
          cy: fy,
          r: fr,
          fill: tint,
          stroke: ring,
          "stroke-width": 0.6 * k
        });
        g.appendChild(blob);
        if (open) {
          f.dots.forEach(function(dot) {
            var c = el("circle", {
              class: "b-dot",
              "data-name": dot.sp.name,
              cx: fx + dot.x * s,
              cy: fy + dot.y * s,
              r: dr,
              fill: dotFill
            });
            c.addEventListener("mousemove", function(e) {
              e.stopPropagation();
              tipAt(
                '<div class="t-r">species</div><div class="t-name"><em>' + esc(dot.sp.name) + '</em></div><div class="t-n">' + esc(f.node.name) + " \xB7 " + esc(o.node.name) + "</div>",
                e
              );
            });
            c.addEventListener("click", function(e) {
              e.stopPropagation();
              selected = dot.sp;
              openDetail(dot.sp);
            });
            g.appendChild(c);
          });
          g.style.cursor = "pointer";
          asButton(blob, f.node);
          var openFamily = function() {
            selected = f.node;
            openDetail(f.node);
          };
          g.addEventListener("click", openFamily);
          onActivate(blob, openFamily);
        } else {
          var d = "";
          f.dots.forEach(function(dot) {
            d += "M" + (fx + dot.x * s - dr) + "," + (fy + dot.y * s) + "a" + dr + "," + dr + " 0 1,0 " + 2 * dr + ",0a" + dr + "," + dr + " 0 1,0 " + -2 * dr + ",0";
          });
          g.appendChild(el("path", { class: "b-dots", d, fill: dotFill }));
        }
        if (!dim) {
          g.addEventListener("mousemove", function(e) {
            tipAt(familyTipHTML(f, o) + (zo ? "" : ZOOM_HINT), e);
          });
          g.addEventListener("mouseleave", hideTip);
        }
        og.appendChild(g);
        var fsize = 11 * k;
        if (open) named.push({ x: fx, y: fy, r: fr, text: f.node.name });
        else if (!zo && textFits(f.node.name, fsize, 1.9 * fr))
          labels.push(label(fx, fy, f.node.name, fsize));
      });
      svg.appendChild(og);
      var osize = 10.5 * k, oname = o.node.name.toUpperCase();
      if (!dim && textFits(oname, osize, 1.7 * orr))
        labels.push(label(ox, oy - orr + osize * 1.1, oname, osize));
    });
    labels.forEach(function(l) {
      svg.appendChild(l);
    });
    if (named.length)
      placeNames(
        named,
        11 * k,
        box,
        labels.map(function(l) {
          var b = l.getBBox();
          return { x: b.x, y: b.y, w: b.width, h: b.height };
        })
      );
  }
  function speciesLeaves(node) {
    var out = [];
    (function rec(n) {
      if (n.children) n.children.forEach(rec);
      else out.push(n);
    })(node);
    return out;
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function(c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function lineSlug(cid) {
    return String(cid == null ? "" : cid).trim().replace(/\s+/g, "-");
  }
  function openDetail(node) {
    if (!detailEl) return;
    var html = "";
    if (!node.children) {
      var d = DETAIL[node.name] || {};
      html += '<p class="d-rank">Species</p><h2 class="d-name sp">' + (d.id ? '<a href="species/' + esc(d.id) + '.html">' + esc(node.name) + "</a>" : esc(node.name)) + "</h2>";
      if (d.common) html += '<p class="d-common">' + esc(d.common.split(",").join(", ")) + "</p>";
      var genus = d.genus || node.name.split(" ")[0];
      var parts = [d.order, d.family, genus].filter(Boolean);
      html += parts.length ? '<p class="d-path">' + parts.map(esc).join(" \u203A ") + "</p>" : '<p class="d-path">Taxonomy not yet recorded</p>';
      if (d.acts && d.acts.length)
        html += '<div class="d-acts">' + d.acts.map(function(a) {
          return '<span class="tag">' + esc(a) + "</span>";
        }).join("") + "</div>";
      var lines = d.lines || [];
      html += '<p class="d-sub">' + lines.length + " cell line" + (lines.length === 1 ? "" : "s") + "</p>";
      if (lines.length) {
        html += '<ul class="d-lines">' + lines.map(function(l) {
          return '<li><a class="cid" href="line/' + esc(lineSlug(l.cid)) + '.html">' + esc(l.cid) + "</a>" + statusChip(l.status) + (l.media ? '<span class="d-media">media ' + esc(l.media) + "</span>" : "") + "</li>";
        }).join("") + "</ul>";
        html += '<a class="btn btn-primary d-req" href="order.html">Request a line \u203A</a>';
      }
    } else {
      var sp = speciesLeaves(node), nl = sp.reduce(function(s, x) {
        return s + x.nlines;
      }, 0);
      html += '<p class="d-rank">' + (RANKS[node.depth] || "taxon") + '</p><h2 class="d-name">' + esc(node.name) + "</h2>";
      html += '<p class="d-sub">' + node.nspecies + " species \xB7 " + nl + " cell lines</p>";
      var kids = (node.children || []).slice().sort(function(a, b) {
        return b.nspecies - a.nspecies;
      });
      html += '<p class="d-sub">' + (node.depth >= 3 ? "Species" : RANKS[node.depth + 1] + "s") + '</p><div class="d-chips">';
      html += kids.map(function(c) {
        return '<button class="d-chip" data-name="' + esc(c.name) + '">' + (c.children ? "" : "<em>") + esc(c.name) + (c.children ? "" : "</em>") + " <b>" + c.nspecies + "</b></button>";
      }).join("") + "</div>";
    }
    window.pcclHTML(detailEl, html);
    detailEl.classList.add("open");
    Array.prototype.forEach.call(detailEl.querySelectorAll(".d-chip"), function(b) {
      b.addEventListener("click", function() {
        var t = findNode(b.getAttribute("data-name"));
        if (t) showInView(t);
      });
    });
  }
  function showInView(t) {
    selected = t;
    openDetail(t);
    if (t.children) focus = t;
    if (view === "bubble") {
      zoomed = orderAncestor(t);
      drawBubbles();
    } else {
      drawSun();
      updateCrumb();
    }
  }
  var byName = {};
  (function idx(n) {
    byName[n.name.toLowerCase()] = n;
    if (n.children) n.children.forEach(idx);
  })(root);
  function findNode(nm) {
    return byName[(nm || "").toLowerCase()];
  }
  var allNodes = [];
  (function c(n) {
    if (n.depth > 0) allNodes.push(n);
    if (n.children) n.children.forEach(c);
  })(root);
  function runSearch(q) {
    if (!suggestEl) return;
    q = q.trim().toLowerCase();
    if (!q) {
      suggestEl.textContent = "";
      suggestEl.classList.remove("open");
      return;
    }
    var hits = allNodes.filter(function(n) {
      return n.name.toLowerCase().indexOf(q) >= 0;
    }).sort(function(a, b) {
      return a.name.toLowerCase().indexOf(q) - b.name.toLowerCase().indexOf(q) || b.nspecies - a.nspecies;
    }).slice(0, 8);
    if (!hits.length) {
      window.pcclHTML(suggestEl, '<div class="sg-empty">No match</div>');
      suggestEl.classList.add("open");
      return;
    }
    window.pcclHTML(
      suggestEl,
      hits.map(function(n) {
        return '<button class="sg" data-name="' + esc(n.name) + '"><span class="sg-r">' + RANKS[n.depth] + "</span> " + (n.depth === 4 ? "<em>" + esc(n.name) + "</em>" : esc(n.name)) + " <b>" + n.nspecies + "</b></button>";
      }).join("")
    );
    suggestEl.classList.add("open");
    Array.prototype.forEach.call(suggestEl.querySelectorAll(".sg"), function(b) {
      b.addEventListener("click", function() {
        jumpTo(findNode(b.getAttribute("data-name")));
      });
    });
  }
  function jumpTo(n) {
    if (!n) return;
    selected = n;
    openDetail(n);
    focus = n.children ? n : n.parent || root;
    setView("sun");
    suggestEl.classList.remove("open");
    if (searchEl) searchEl.value = n.name;
  }
  if (searchEl) {
    searchEl.addEventListener("input", function() {
      runSearch(searchEl.value);
    });
    searchEl.addEventListener("keydown", function(e) {
      if (e.key === "Enter") {
        var first = suggestEl.querySelector(".sg");
        if (first) jumpTo(findNode(first.getAttribute("data-name")));
      }
      if (e.key === "Escape") {
        suggestEl.classList.remove("open");
      }
    });
    document.addEventListener("click", function(e) {
      if (!suggestEl.contains(e.target) && e.target !== searchEl)
        suggestEl.classList.remove("open");
    });
  }
  function buildLegend() {
    if (!legendEl) return;
    var dk = isDark();
    window.pcclHTML(
      legendEl,
      root.children.map(function(o, i) {
        return '<button type="button" data-i="' + i + '"><i style="background:hsl(' + hueOf[o.name] + "," + (dk ? 45 : 52) + "%," + (dk ? 52 : 50) + '%)"></i>' + esc(o.name) + ' <b class="muted">' + o.value + '</b><span class="sr-only"> ' + unit() + "</span></button>";
      }).join("")
    );
    Array.prototype.forEach.call(legendEl.querySelectorAll("button"), function(b) {
      b.addEventListener("click", function() {
        showInView(root.children[+b.getAttribute("data-i")]);
      });
    });
  }
  var view = "bubble";
  function syncViewButtons() {
    Array.prototype.forEach.call(document.querySelectorAll(".view-btn"), function(b) {
      var on = b.getAttribute("data-view") === view;
      b.classList.toggle("on", on);
      b.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }
  function render() {
    buildLegend();
    if (view === "sun") {
      svg.style.cursor = "";
      drawSun();
      updateCrumb();
      if (crumb) crumb.style.display = "";
    } else {
      drawBubbles();
      if (crumb) crumb.style.display = "none";
    }
  }
  function setView(v) {
    view = v;
    syncViewButtons();
    render();
  }
  Array.prototype.forEach.call(document.querySelectorAll(".view-btn"), function(b) {
    b.addEventListener("click", function() {
      setView(b.getAttribute("data-view"));
    });
  });
  var mo = new MutationObserver(render);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", render);
  render();
  function fromHash() {
    var h = (location.hash || "").replace(/^#/, "");
    if (!h) return;
    try {
      h = decodeURIComponent(h);
    } catch {
      return;
    }
    h = h.replace(/^taxon=/, "");
    var n = findNode(h);
    if (n) {
      jumpTo(n);
      svg.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }
  fromHash();
  window.addEventListener("hashchange", fromHash);
})();
