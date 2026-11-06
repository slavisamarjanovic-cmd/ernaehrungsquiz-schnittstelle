/*
 * Erzeugt eine Tabelle mit zufälligen, aber reproduzierbaren Abgaben
 * (inkl. Testdaten und einer anderen Quizversion) und exportiert alle
 * Zellen als JSON für tests/formula-check.py.
 *   node tests/export-for-formula-check.js /tmp/dump.json
 */
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { createContext } = require("./gas-mock");
const L = require("../assets/js/logic.js");

const win = {};
vm.runInNewContext(fs.readFileSync(path.join(__dirname, "..", "assets/js/quiz-content.js"), "utf8"), { window: win });
const C = win.QUIZ_CONTENT;

let seed = 42;
function rnd() { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; }
function pick(arr) { return arr[Math.floor(rnd() * arr.length)]; }

function randomAnswers() {
  const a = {};
  C.questions.forEach(q => {
    const ids = (q.options || []).map(o => o.id);
    if (q.type === "single") a[q.id] = { selected: [pick(ids)] };
    else if (q.type === "photo") { const s = pick(ids); a[q.id] = { selected: [s], confidence: s === "weiss_nicht" ? null : pick(["sicher", "eher_sicher", "unsicher"]) }; }
    else if (q.type === "multi") {
      if (q.maxSelect) {
        if (rnd() < 0.15) { a[q.id] = { selected: ["keine"], otherText: "" }; return; }
        const pool = ids.filter(x => x !== "keine");
        const n = 1 + Math.floor(rnd() * 3);
        const sel = [];
        while (sel.length < n) { const x = pick(pool); if (!sel.includes(x)) sel.push(x); }
        a[q.id] = { selected: sel, otherText: sel.includes("andere") ? "Freitext " + Math.floor(rnd() * 100) : "" };
      } else if (rnd() < 0.2) a[q.id] = { selected: ["weiss_nicht"] };
      else {
        const sel = ids.filter(x => x !== "weiss_nicht" && rnd() < 0.55);
        a[q.id] = { selected: sel.length ? sel : ["a"] };
      }
    } else if (q.type === "matrix") { const rows = {}; q.rows.forEach(r => { rows[r.id] = pick(ids); }); a[q.id] = { rows }; }
    else if (q.type === "text") a[q.id] = { text: rnd() < 0.5 ? "Wunsch " + Math.floor(rnd() * 100) : "" };
  });
  return a;
}

const env = createContext();
env.ctx.einrichten();
env.ss.getRangeByName("EINST_MAX_ABGABEN").setValue(1000);
let n = 0;
// ungleich grosse Gruppen, damit die Mindestgrösse greift
const GROUPS = [].concat(Array(10).fill("pflege"), Array(4).fill("lernende_pflege"), Array(3).fill("hotellerie"), ["andere", "arztdienst", "hauswirtschaft"]);
function submit(test) {
  n++;
  const body = { action: "submit", quizVersion: env.ctx.QUIZ.version, submissionId: "fc-" + String(n).padStart(5, "0") + "-xxxxxxxxxxxxxxxx", test, code: "", group: pick(GROUPS), website: "", answers: L.buildAnswersPayload(C.questions, randomAnswers()) };
  const r = JSON.parse(env.ctx.doPost({ postData: { contents: JSON.stringify(body) } }).getContent());
  if (!r.ok) throw new Error(JSON.stringify(r));
}
for (let i = 0; i < 60; i++) submit(false);
for (let i = 0; i < 5; i++) submit(true);
// andere Quizversion simulieren
env.ctx.QUIZ.version = "2026-10-alt";
for (let i = 0; i < 4; i++) submit(false);
env.ctx.QUIZ.version = C.version;

const dump = {};
env.ss.getSheets().forEach(s => {
  dump[s.name] = [];
  for (const [k, c] of s.cells) { const [r, col] = k.split(":").map(Number); dump[s.name].push([r, col, c.v instanceof Date ? c.v.toISOString() : c.v, !!c.f]); }
});
dump.__names = {};
for (const [nm, r] of env.ss.names) dump.__names[nm] = [r.sheet.name, r.row, r.col];
dump.__key = {};
env.ctx.QUIZ.questions.forEach(q => { dump.__key[q.id] = { nr: q.nr, type: q.type, correct: q.scoring && q.scoring.active ? q.scoring.correct : null, options: (q.options || []).map(o => o.id), rows: (q.rows || []).map(r => r.id) }; });
dump.__version = C.version;
dump.__groups = env.ctx.QUIZ.groups;
fs.writeFileSync(process.argv[2] || "/tmp/dump.json", JSON.stringify(dump));
console.log("Export: 60 echte, 5 Test-, 4 Alt-Version-Abgaben");
