(function() {
  var tt = window.trustedTypes;
  var policy = tt && tt.createPolicy ? tt.createPolicy("pccl", {
    createHTML: function(html) {
      return html;
    }
  }) : null;
  window.pcclHTML = function(el, html) {
    el.innerHTML = policy ? policy.createHTML(html) : html;
  };
})();
