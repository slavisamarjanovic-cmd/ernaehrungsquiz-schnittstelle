/*
 * Minimale Nachbildung der Google-Apps-Script-Dienste für lokale Tests.
 * Bildet nur das ab, was Code.gs und Setup.gs verwenden. Ersetzt NICHT den
 * Test in echtem Google Sheets.
 */
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const crypto = require("crypto");

function colToNum(c) { let n = 0; for (const ch of c) n = n * 26 + (ch.charCodeAt(0) - 64); return n; }
function numToCol(n) { let s = ""; while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; }

function chain() {
  // Objekt, das jede Methode erlaubt und sich selbst zurückgibt (für Formatierungen/Diagramme)
  const handler = { get: (t, p) => (p === "build" ? () => ({ chart: true }) : (p in t ? t[p] : () => proxy)) };
  const proxy = new Proxy({}, handler);
  return proxy;
}

class Cell {
  constructor(v, f, text) { this.v = v; this.f = f || null; this.text = !!text; }
}

class MockRange {
  constructor(sheet, row, col, nr, nc) { Object.assign(this, { sheet, row, col, nr, nc }); }
  getRow() { return this.row; }
  getValues() {
    const out = [];
    for (let r = 0; r < this.nr; r++) {
      const line = [];
      for (let c = 0; c < this.nc; c++) { const cell = this.sheet.cell(this.row + r, this.col + c); line.push(cell ? cell.v : ""); }
      out.push(line);
    }
    return out;
  }
  getValue() {
    const cell = this.sheet.cell(this.row, this.col);
    if (cell && cell.f === "=SUM(1,2)") return this.sheet.sep === "," ? 3 : 1.2; // Sprachprobe
    return this.getValues()[0][0];
  }
  getFormulas() {
    const out = [];
    for (let r = 0; r < this.nr; r++) { const line = []; for (let c = 0; c < this.nc; c++) { const cell = this.sheet.cell(this.row + r, this.col + c); line.push(cell && cell.f ? cell.f : ""); } out.push(line); }
    return out;
  }
  setValues(vals) {
    if (vals.length !== this.nr || vals.some(r => r.length !== this.nc)) throw new Error(`setValues: Dimension ${vals.length}x${vals[0] && vals[0].length} passt nicht zu ${this.nr}x${this.nc}`);
    vals.forEach((row, r) => row.forEach((v, c) => this.sheet.write(this.row + r, this.col + c, v)));
    return this;
  }
  setValue(v) { this.sheet.write(this.row, this.col, v); return this; }
  setFormula(f) { this.sheet.write(this.row, this.col, f); return this; }
  clearContent() { for (let r = 0; r < this.nr; r++) for (let c = 0; c < this.nc; c++) this.sheet.del(this.row + r, this.col + c); return this; }
  createTextFinder(text) {
    const self = this;
    const finder = {
      matchEntireCell() { return finder; }, matchCase() { return finder; },
      findAll() {
        const res = [];
        for (let r = 0; r < self.nr; r++) for (let c = 0; c < self.nc; c++) {
          const cell = self.sheet.cell(self.row + r, self.col + c);
          if (cell && String(cell.v) === text) res.push(new MockRange(self.sheet, self.row + r, self.col + c, 1, 1));
        }
        return res;
      },
      findNext() { return finder.findAll()[0] || null; }
    };
    return finder;
  }
  setDataValidation() { return this; }
}
// alle Formatierungsmethoden als No-op
["setNumberFormat", "setFontWeight", "setFontSize", "setFontColor", "setFontStyle", "setBackground", "setWrap", "setVerticalAlignment"]
  .forEach(m => { MockRange.prototype[m] = function () { return this; }; });

class MockSheet {
  constructor(name, sep) { this.name = name; this.sep = sep || ","; this.cells = new Map(); this.charts = []; this.writes = 0; }
  key(r, c) { return r + ":" + c; }
  cell(r, c) { return this.cells.get(this.key(r, c)); }
  del(r, c) { this.cells.delete(this.key(r, c)); }
  write(r, c, v) {
    this.writes++;
    if (v === "" || v === null || v === undefined) { this.del(r, c); return; }
    if (typeof v === "string" && v.startsWith("'")) { this.cells.set(this.key(r, c), new Cell(v.slice(1), null, true)); return; }
    if (typeof v === "string" && v.startsWith("=")) { this.cells.set(this.key(r, c), new Cell(v, v)); return; }
    this.cells.set(this.key(r, c), new Cell(v));
  }
  getName() { return this.name; }
  getLastRow() { let m = 0; for (const k of this.cells.keys()) m = Math.max(m, +k.split(":")[0]); return m; }
  getLastColumn() { let m = 0; for (const k of this.cells.keys()) m = Math.max(m, +k.split(":")[1]); return m; }
  getRange(a, b, c, d) {
    if (typeof a === "number") return new MockRange(this, a, b, c || 1, d || 1);
    const m = /^([A-Z]+)(\d*)(?::([A-Z]+)(\d*))?$/.exec(a);
    if (!m) throw new Error("A1 nicht unterstützt: " + a);
    const c1 = colToNum(m[1]), r1 = m[2] ? +m[2] : 1;
    const c2 = m[3] ? colToNum(m[3]) : c1, r2 = m[4] ? +m[4] : (m[2] && !m[3] ? r1 : 1000);
    return new MockRange(this, r1, c1, r2 - r1 + 1, c2 - c1 + 1);
  }
  deleteRow(r) {
    const next = new Map();
    for (const [k, v] of this.cells) {
      const [rr, cc] = k.split(":").map(Number);
      if (rr === r) continue;
      next.set(this.key(rr > r ? rr - 1 : rr, cc), v);
    }
    this.cells = next;
  }
  clear() { this.cells.clear(); return this; }
  getCharts() { return this.charts.slice(); }
  removeChart(c) { this.charts = this.charts.filter(x => x !== c); }
  insertChart(c) { this.charts.push(c); }
  newChart() { return chain(); }
  protect() { return chain(); }
  getProtections() { return []; }
  setFrozenRows() { return this; } setColumnWidth() { return this; } setColumnWidths() { return this; }
  clearConditionalFormatRules() { return this; }
  /** Tabelle als Zeilen (nur Werte), ohne Kopfzeile */
  rows() {
    const out = [];
    const lr = this.getLastRow(), lc = this.getLastColumn();
    for (let r = 2; r <= lr; r++) { const line = []; for (let c = 1; c <= lc; c++) { const x = this.cell(r, c); line.push(x ? x.v : ""); } out.push(line); }
    return out;
  }
}

class MockSpreadsheet {
  constructor(sep) { this.sep = sep || ","; this.sheets = []; this.names = new Map(); this.tz = null; }
  getSheetByName(n) { return this.sheets.find(s => s.name === n) || null; }
  insertSheet(n, idx) { const s = new MockSheet(n, this.sep); if (typeof idx === "number") this.sheets.splice(idx, 0, s); else this.sheets.push(s); return s; }
  getSheets() { return this.sheets.slice(); }
  deleteSheet(s) { this.sheets = this.sheets.filter(x => x !== s); }
  setActiveSheet() { }
  setSpreadsheetTimeZone(tz) { this.tz = tz; }
  getRangeByName(n) { return this.names.get(n) || null; }
  setNamedRange(n, r) { this.names.set(n, r); }
  removeNamedRange(n) { this.names.delete(n); }
}

function createContext(opts) {
  opts = opts || {};
  const ss = new MockSpreadsheet(opts.sep);
  const cache = new Map();
  const state = { lockAvailable: true, flushes: 0, logs: [] };
  const ctx = {
    console: { log: (...a) => state.logs.push(a.join(" ")), error: (...a) => state.logs.push("ERR " + a.join(" ")) },
    Date, JSON, Math, Object, Array, String, Number, RegExp, parseInt, isNaN, Error,
    SpreadsheetApp: {
      getActiveSpreadsheet: () => ss,
      flush: () => { state.flushes++; },
      getUi: () => { throw new Error("Keine Oberfläche im Test"); },
      newDataValidation: () => chain(),
      ProtectionType: { SHEET: "SHEET" }
    },
    LockService: {
      getScriptLock: () => ({
        tryLock: () => state.lockAvailable,
        waitLock: () => { if (!state.lockAvailable) throw new Error("Lock"); },
        releaseLock: () => { }
      })
    },
    CacheService: {
      getScriptCache: () => ({ get: k => (cache.has(k) ? cache.get(k) : null), put: (k, v) => cache.set(k, v) })
    },
    ContentService: {
      MimeType: { JSON: "application/json" },
      createTextOutput: s => ({ _s: s, setMimeType() { return this; }, getContent() { return this._s; } })
    },
    Utilities: { getUuid: () => crypto.randomUUID() }
  };
  vm.createContext(ctx);
  const dir = path.join(__dirname, "..", "apps-script");
  for (const f of ["Quiz.gs", "Code.gs", "Setup.gs"]) {
    vm.runInContext(fs.readFileSync(path.join(dir, f), "utf8"), ctx, { filename: f });
  }
  return { ctx, ss, cache, state };
}

module.exports = { createContext, numToCol, colToNum };
