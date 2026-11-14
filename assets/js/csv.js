(function() {
  var BOM = String.fromCharCode(65279);
  var FORMULA = /^[=+\-@\t\r]/;
  function field(value) {
    if (value === null || value === void 0) return "";
    if (typeof value === "object") {
      throw new Error(
        "pcclCSV: a cell must be text, a number or true/false, not " + JSON.stringify(value)
      );
    }
    var s = String(value);
    if (typeof value === "string" && FORMULA.test(s)) s = "'" + s;
    return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }
  window.pcclCSV = function(header, rows) {
    var lines = [header].concat(rows).map(function(row) {
      return row.map(field).join(",");
    });
    return BOM + lines.join("\r\n") + "\r\n";
  };
})();
