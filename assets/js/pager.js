(function() {
  function PcclPager(pageSize) {
    var limit = pageSize;
    return {
      size: pageSize,
      page: function(list) {
        return list.slice(0, limit);
      },
      rest: function(list) {
        return Math.max(0, list.length - limit);
      },
      more: function() {
        limit += pageSize;
      },
      reset: function() {
        limit = pageSize;
      }
    };
  }
  PcclPager.syncMore = function(button, pager, list) {
    if (!button) return;
    var rest = pager.rest(list);
    button.hidden = rest === 0;
    button.textContent = "Show " + Math.min(rest, pager.size) + " more (" + rest.toLocaleString("en-US") + " left)";
  };
  window.PcclPager = PcclPager;
})();
