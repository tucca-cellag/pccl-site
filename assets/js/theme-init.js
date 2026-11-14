try {
  var t = localStorage.getItem("pccl-theme");
  if (t) document.documentElement.setAttribute("data-theme", t);
} catch {
}
