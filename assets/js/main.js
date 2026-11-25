(function() {
  var root = document.documentElement;
  var themeBtn = document.getElementById("theme");
  if (themeBtn) {
    themeBtn.addEventListener("click", function() {
      var cur = root.getAttribute("data-theme");
      if (!cur) cur = matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      var next = cur === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
      try {
        localStorage.setItem("pccl-theme", next);
      } catch {
      }
    });
  }
  var menuBtn = document.getElementById("menu");
  var links = document.getElementById("nav-links");
  if (menuBtn && links) {
    menuBtn.addEventListener("click", function() {
      var open = links.classList.toggle("open");
      menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
    });
    links.addEventListener("click", function(e) {
      if (e.target.tagName === "A") {
        links.classList.remove("open");
        menuBtn.setAttribute("aria-expanded", "false");
      }
    });
  }
  var canvas = document.getElementById("cells");
  if (!canvas) return;
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var ctx = canvas.getContext("2d");
  var TAU = Math.PI * 2;
  var groups = [], W = 0, H = 0, dpr = Math.min(window.devicePixelRatio || 1, 2);
  var tint = (function(hex) {
    hex = hex.replace("#", "");
    if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    return "rgba(" + parseInt(hex.substr(0, 2), 16) + "," + parseInt(hex.substr(2, 2), 16) + "," + parseInt(hex.substr(4, 2), 16) + ",";
  })(getComputedStyle(root).getPropertyValue("--tufts-blue").trim() || "#3e8ede");
  function rgba(a) {
    return tint + a.toFixed(3) + ")";
  }
  function rand(lo, hi) {
    return lo + Math.random() * (hi - lo);
  }
  function cell(x, y, rot, wid, len) {
    var plastids = [];
    var k = 2 + Math.floor(Math.random() * 3);
    for (var j = 0; j < k; j++) plastids.push({ u: Math.random(), rot: rand(0, Math.PI) });
    return {
      x,
      y,
      rot,
      len,
      wid,
      side: Math.random() < 0.5 ? -1 : 1,
      along: rand(-0.25, 0.25),
      plastids,
      stream: rand(3e-4, 9e-4) * (Math.random() < 0.5 ? -1 : 1)
    };
  }
  function group() {
    var cells = [], kind = Math.random(), i, x;
    if (kind < 0.35) {
      var base = rand(15, 23), rows = 2 + Math.floor(Math.random() * 3), cols = 2 + Math.floor(Math.random() * 3);
      for (var r = 0; r < rows; r++)
        for (var c = 0; c < cols; c++) {
          if (Math.random() < 0.15) continue;
          var w = base * rand(0.95, 1.1);
          cells.push(
            cell(
              (c + r % 2 * 0.5) * base * 1.3 + rand(-1.5, 1.5),
              r * base + rand(-1.5, 1.5),
              rand(-0.1, 0.1),
              w,
              base * rand(1.25, 1.4)
            )
          );
        }
    } else if (kind < 0.65) {
      var wid = rand(16, 30), n = 2 + Math.floor(Math.random() * 3);
      x = 0;
      for (i = 0; i < n; i++) {
        var cw = wid * rand(0.9, 1.1), len = cw * rand(1.2, 2);
        cells.push(cell(x + len / 2, 0, 0, cw, len));
        x += len;
      }
    } else {
      var sw = rand(16, 32);
      cells.push(cell(0, 0, 0, sw, sw * rand(1.1, 1.9)));
    }
    var mx = 0, my = 0;
    for (i = 0; i < cells.length; i++) {
      mx += cells[i].x / cells.length;
      my += cells[i].y / cells.length;
    }
    var span = 0;
    for (i = 0; i < cells.length; i++) {
      cells[i].x -= mx;
      cells[i].y -= my;
      span = Math.max(span, Math.hypot(cells[i].x, cells[i].y) + cells[i].len);
    }
    return {
      x: Math.random() * W,
      y: Math.random() * H,
      rot: rand(0, Math.PI),
      vx: rand(-0.06, 0.06),
      vy: rand(-0.06, 0.06),
      vr: rand(-5e-4, 5e-4),
      a: rand(0.05, 0.1),
      span,
      cells
    };
  }
  function resize() {
    var host = canvas.parentElement, oldW = W, oldH = H;
    W = host.clientWidth;
    H = host.clientHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var n = Math.max(10, Math.floor(W * H / 52e3));
    while (groups.length < n) groups.push(group());
    groups.length = n;
    if (oldW && oldH)
      for (var i = 0; i < groups.length; i++) {
        groups[i].x *= W / oldW;
        groups[i].y *= H / oldH;
      }
    if (reduce) paint();
  }
  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function rimPoint(x, y, w, h, u) {
    var d = (u % 1 + 1) % 1 * (2 * w + 2 * h);
    if (d < w) return [x + d, y];
    d -= w;
    if (d < h) return [x + w, y + d];
    d -= h;
    if (d < w) return [x + w - d, y + h];
    return [x, y + h - (d - w)];
  }
  function drawCell(c, a) {
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate(c.rot);
    var x = -c.len / 2, y = -c.wid / 2, r = c.wid * 0.3, rim = c.wid * 0.16;
    roundRect(x + rim, y + rim, c.len - 2 * rim, c.wid - 2 * rim, Math.max(r - rim, 2));
    ctx.fillStyle = rgba(a * 0.35);
    ctx.fill();
    roundRect(x + rim / 2, y + rim / 2, c.len - rim, c.wid - rim, Math.max(r - rim / 2, 2));
    ctx.lineWidth = rim;
    ctx.strokeStyle = rgba(a * 1.1);
    ctx.stroke();
    roundRect(x, y, c.len, c.wid, r);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = rgba(a * 3.2);
    ctx.stroke();
    var nr = c.wid * 0.17;
    var nx = c.along * c.len, ny = c.side * (c.wid / 2 - rim - nr * 0.55);
    ctx.beginPath();
    ctx.arc(nx, ny, nr, 0, TAU);
    ctx.fillStyle = rgba(a * 3);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(nx + nr * 0.2, ny - nr * 0.15, nr * 0.35, 0, TAU);
    ctx.fillStyle = rgba(a * 4.5);
    ctx.fill();
    for (var i = 0; i < c.plastids.length; i++) {
      var pl = c.plastids[i];
      var pt = rimPoint(x + rim / 2, y + rim / 2, c.len - rim, c.wid - rim, pl.u);
      ctx.beginPath();
      ctx.ellipse(pt[0], pt[1], c.wid * 0.085, c.wid * 0.05, pl.rot, 0, TAU);
      ctx.fillStyle = rgba(a * 2.6);
      ctx.fill();
    }
    ctx.restore();
  }
  function step() {
    for (var i = 0; i < groups.length; i++) {
      var g = groups[i];
      g.x += g.vx;
      g.y += g.vy;
      g.rot += g.vr;
      if (g.x < -g.span) g.x = W + g.span;
      if (g.x > W + g.span) g.x = -g.span;
      if (g.y < -g.span) g.y = H + g.span;
      if (g.y > H + g.span) g.y = -g.span;
      for (var j = 0; j < g.cells.length; j++) {
        var c = g.cells[j];
        for (var k = 0; k < c.plastids.length; k++) c.plastids[k].u += c.stream;
      }
    }
  }
  function paint() {
    ctx.clearRect(0, 0, W, H);
    for (var i = 0; i < groups.length; i++) {
      var g = groups[i];
      ctx.save();
      ctx.translate(g.x, g.y);
      ctx.rotate(g.rot);
      for (var j = 0; j < g.cells.length; j++) drawCell(g.cells[j], g.a);
      ctx.restore();
    }
  }
  var visible = true, running = false;
  function frame() {
    if (!visible) {
      running = false;
      return;
    }
    step();
    paint();
    requestAnimationFrame(frame);
  }
  function start() {
    if (reduce || running || !visible) return;
    running = true;
    requestAnimationFrame(frame);
  }
  if ("IntersectionObserver" in window)
    new IntersectionObserver(function(entries) {
      visible = entries[entries.length - 1].isIntersecting;
      start();
    }).observe(canvas);
  window.addEventListener("resize", resize);
  resize();
  start();
})();
