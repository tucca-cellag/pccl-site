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
  var cells = [], W = 0, H = 0, dpr = Math.min(window.devicePixelRatio || 1, 2), t = 0;
  function accent() {
    var c = getComputedStyle(root).getPropertyValue("--blue").trim();
    return c || "#3172AE";
  }
  function resize() {
    var host = canvas.parentElement;
    W = host.clientWidth;
    H = host.clientHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    seed();
  }
  function seed() {
    cells = [];
    var n = Math.max(14, Math.floor(W * H / 34e3));
    for (var i = 0; i < n; i++) {
      cells.push({
        x: Math.random() * W,
        y: Math.random() * H,
        r: 8 + Math.random() * 30,
        vx: (Math.random() - 0.5) * 0.12,
        vy: (Math.random() - 0.5) * 0.12,
        a: 0.04 + Math.random() * 0.06,
        ph: Math.random() * 6.28
      });
    }
  }
  function hexA(hex, a) {
    hex = hex.replace("#", "");
    if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    var r = parseInt(hex.substr(0, 2), 16), g = parseInt(hex.substr(2, 2), 16), b = parseInt(hex.substr(4, 2), 16);
    return "rgba(" + r + "," + g + "," + b + "," + a.toFixed(3) + ")";
  }
  function draw() {
    ctx.clearRect(0, 0, W, H);
    var col = accent();
    for (var i = 0; i < cells.length; i++) {
      var c = cells[i];
      c.x += c.vx;
      c.y += c.vy;
      if (c.x < -40) c.x = W + 40;
      if (c.x > W + 40) c.x = -40;
      if (c.y < -40) c.y = H + 40;
      if (c.y > H + 40) c.y = -40;
      var pulse = 1 + Math.sin(t * 0.01 + c.ph) * 0.06;
      var rr = c.r * pulse;
      ctx.beginPath();
      ctx.arc(c.x, c.y, rr, 0, 6.2832);
      ctx.fillStyle = hexA(col, c.a);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(c.x, c.y, rr, 0, 6.2832);
      ctx.strokeStyle = hexA(col, c.a * 2.2);
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(c.x - rr * 0.18, c.y - rr * 0.12, rr * 0.28, 0, 6.2832);
      ctx.fillStyle = hexA(col, c.a * 2.4);
      ctx.fill();
    }
    t++;
    if (!reduce) requestAnimationFrame(draw);
  }
  window.addEventListener("resize", resize);
  resize();
  if (reduce) draw();
  else requestAnimationFrame(draw);
})();
