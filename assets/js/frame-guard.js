(function() {
  var framed;
  try {
    framed = window.top !== window.self;
  } catch {
    framed = true;
  }
  if (framed) document.documentElement.style.display = "none";
})();
