/*
 * Automatische Tests ohne Zusatzpakete:  node tests/run-tests.js
 *  1. Frontend-Inhalt und Server-Definition stimmen überein (IDs, Regeln, Version)
 *  2. Antwortlogik im Browser (Exklusivität, Auswahlgrenze, Prüfungen)
 *  3. Schnittstelle (Code.gs) mit nachgebildetem Google Sheets:
 *     Prüfung, Punkte, Doppelabgaben, Formelschutz, Testdaten, Grenzen
 *  4. Einrichtung (Setup.gs) läuft fehlerfrei durch
 */
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const HAS_SERVER = fs.existsSync(path.join(__dirname, "..", "apps-script", "Quiz.gs"));
const { createContext } = HAS_SERVER ? require("./gas-mock") : { createContext: null };
const SERVER_QUIZ = HAS_SERVER ? createContext().ctx.QUIZ : null;
const L = require("../assets/js/logic.js");

const root = path.join(__dirname, "..");
const win = {};
vm.runInNewContext(fs.readFileSync(path.join(root, "assets/js/quiz-content.js"), "utf8"), { window: win });
const C = win.QUIZ_CONTENT;

let passed = 0, failed = 0;
function ok(cond, name) {
  if (cond) { passed++; } else { failed++; console.log("  ✗ " + name); }
}
function eq(a, b, name) { ok(JSON.stringify(a) === JSON.stringify(b), name + " (erwartet " + JSON.stringify(b) + ", erhalten " + JSON.stringify(a) + ")"); }
function section(t) { console.log("\n▶ " + t); }

/* ---------- Hilfen ---------- */
function fullCorrectAnswers() {
  const a = {};
  C.questions.forEach(q => {
    // Lösungen aus apps-script/Quiz.gs (stehen bewusst nicht in dieser Datei)
    const key = SERVER_QUIZ.questions.find(x => x.id === q.id).scoring;
    if (q.type === "single") a[q.id] = { selected: key.correct.slice() };
    if (q.type === "multi" && q.id !== "q15") a[q.id] = { selected: key.correct.slice() };
    if (q.id === "q12") a[q.id] = { selected: ["b"], confidence: "unsicher" };
    if (q.id === "q13") a[q.id] = { selected: ["c"], confidence: "sicher" };
    if (q.id === "q14") a[q.id] = { rows: { konzept: "selbststaendig", meldeweg: "hilfe", schlucken: "weiss_nicht_wo", beratung: "nicht_zutreffend" } };
    if (q.id === "q15") a[q.id] = { selected: ["zeit", "andere"], otherText: "Personalwechsel" };
    if (q.id === "q16") a[q.id] = { text: "Schöpfen bei kleinen Portionen" };
  });
  return a;
}
function clone(x) { return JSON.parse(JSON.stringify(x)); }
let idCounter = 0;
function newId() { idCounter++; return "test-" + String(idCounter).padStart(4, "0") + "-aaaaaaaaaaaaaaaa"; }
function post(env, body) {
  const out = env.ctx.doPost({ postData: { contents: typeof body === "string" ? body : JSON.stringify(body), type: "text/plain" } });
  return JSON.parse(out.getContent());
}
function payload(answers, extra) {
  return Object.assign({ action: "submit", quizVersion: C.version, submissionId: newId(), test: false, code: "", group: "pflege", website: "", answers }, extra || {});
}
function setupEnv() {
  const env = createContext();
  env.ctx.einrichten();
  return env;
}
function sheetRows(env, name) { return env.ss.getSheetByName(name).rows(); }

/* =========================================================== */
section("1  Übereinstimmung Frontend ↔ Schnittstelle");
if (HAS_SERVER) {
  const env = createContext();
  const S = env.ctx.QUIZ;
  eq(C.version, S.version, "Quizversion identisch");
  eq(C.questions.length, 16, "16 Fragen im Frontend");
  eq(S.groups, C.groups.options, "Berufsgruppen identisch (IDs und Bezeichnungen)");
  eq(C.groups.options.map(g => g.label), ["Pflege", "Lernende / Studierende Pflege", "Medizinische Therapien", "Hotellerie", "Arztdienst", "Administration", "Andere"], "Berufsgruppen laut Auftrag");
  eq(S.questions.map(q => q.id), C.questions.map(q => q.id), "Frage-IDs und Reihenfolge");
  C.questions.forEach((fq, i) => {
    const sq = S.questions[i];
    eq(sq.type, fq.type, fq.id + " Fragetyp");
    eq(sq.nr, i + 1, fq.id + " Nummer");
    eq((sq.options || []).map(o => o.id), (fq.options || []).map(o => o.id), fq.id + " Options-IDs");
    eq((sq.rows || []).map(o => o.id), (fq.rows || []).map(o => o.id), fq.id + " Zeilen-IDs");
    eq(sq.maxSelect || null, fq.maxSelect || null, fq.id + " Auswahlgrenze");
    eq(sq.exclusive || [], fq.exclusive || [], fq.id + " exklusive Optionen");
    eq(sq.otherOption || null, fq.otherOption || null, fq.id + " Freitext-Option");
    eq(!!sq.optional, !!fq.optional, fq.id + " freiwillig");
    if (fq.maxLength) eq(sq.maxLength, fq.maxLength, fq.id + " Textlänge");
    if (fq.otherMaxLength) eq(sq.otherMaxLength, fq.otherMaxLength, fq.id + " Freitextlänge");
    eq(sq.section, fq.section, fq.id + " Abschnitt");
  });
  // Struktur laut Auftrag
  eq(C.questions.slice(0, 7).map(q => q.type), Array(7).fill("single"), "Fragen 1–7 Einfachauswahl");
  eq(C.questions.slice(7, 11).map(q => q.type), Array(4).fill("multi"), "Fragen 8–11 Mehrfachauswahl");
  eq([C.questions[11].type, C.questions[12].type], ["photo", "photo"], "Fragen 12–13 Fotoaufgaben");
  eq(C.questions[13].rows.length, 4, "Frage 14 mit vier Zeilen");
  eq(C.questions[14].maxSelect, 3, "Frage 15 maximal drei");
  ok(C.questions[15].optional === true, "Frage 16 freiwillig");
  ["q08", "q09", "q10", "q11"].forEach(id => eq(C.questions.find(q => q.id === id).exclusive, ["weiss_nicht"], id + " «Ich weiss es nicht» exklusiv"));
  eq(C.sections.map(s => s.title), ["Entscheidungen im Pflegealltag", "Portionen einschätzen", "Erfahrungen aus dem Arbeitsalltag"], "drei Abschnitte");
  // Fotos vorhanden, relative Pfade
  C.questions.filter(q => q.type === "photo").forEach(q => {
    ok(!q.image.src.startsWith("/") && !/^https?:/.test(q.image.src), q.id + " relativer Bildpfad");
    ok(fs.existsSync(path.join(root, q.image.src)), q.id + " Bilddatei vorhanden");
    ok(!/\d+\s*g\b/i.test(q.image.alt) && !/protein/i.test(q.image.alt), q.id + " Alternativtext ohne Nährwerte");
  });
  // Entfernte Fotoaufgaben dürfen nicht vorkommen
  const all = fs.readFileSync(path.join(root, "assets/js/quiz-content.js"), "utf8") + fs.readFileSync(path.join(root, "apps-script/Quiz.gs"), "utf8");
  ok(!/Fleischst(ü|u)ck/i.test(all) && !/Geschnetzelt/i.test(all), "keine entfernten Fotoaufgaben (Fleischstück, Geschnetzeltes)");
  ok(!/Spätzli(?!pfanne)/.test(all.replace(/Vegi-Spätzlipfanne|Spätzlipfanne/g, "")), "keine separate Spätzli-Fotoaufgabe");
  // Keine Lösungen im Frontend
  const fe = fs.readFileSync(path.join(root, "assets/js/quiz-content.js"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
  ok(!/correct|lösung|rueckmeldung|Rückmeldung:/i.test(fe.replace(/Die Lösungen erhältst du nach Abschluss\./, "")), "keine Lösungen im öffentlichen Inhalt");
  // Bewertbare Fragen = 11
  eq(env.ctx.maxPoints_(), 11, "maximal 11 Punkte aus bewerteten Fragen");
  ok(!S.questions[11].scoring.active && !S.questions[12].scoring.active, "Fotoaufgaben unbewertet");
  ok(S.questions[11].scoring.correct === null, "Frage 12 ohne Lösungsschlüssel");
  eq(S.questions[12].scoring.provisional, "c", "Frage 13 vorläufige Vergleichsantwort C");
}

/* =========================================================== */
section("2  Antwortlogik im Browser (logic.js)");
{
  const q08 = C.questions.find(q => q.id === "q08");
  let r = L.applySelection(q08, L.emptyAnswer(q08), "a", true);
  r = L.applySelection(q08, r.answer, "c", true);
  eq(r.answer.selected, ["a", "c"], "Mehrfachauswahl sammelt Antworten");
  r = L.applySelection(q08, r.answer, "weiss_nicht", true);
  eq(r.answer.selected, ["weiss_nicht"], "«Ich weiss es nicht» wählt andere ab");
  ok(/abgewählt/.test(r.message), "Hinweis bei Abwahl");
  r = L.applySelection(q08, r.answer, "d", true);
  eq(r.answer.selected, ["d"], "andere Antwort wählt «Ich weiss es nicht» ab");
  r = L.applySelection(q08, r.answer, "d", false);
  eq(r.answer.selected, [], "Abwählen möglich");

  const q15 = C.questions.find(q => q.id === "q15");
  let s = L.emptyAnswer(q15);
  ["zeit", "zustaendigkeit", "unsicherheit"].forEach(id => { s = L.applySelection(q15, s, id, true).answer; });
  const blocked = L.applySelection(q15, s, "angebot", true);
  ok(blocked.blocked, "Frage 15: vierte Auswahl blockiert");
  eq(blocked.answer.selected, ["zeit", "zustaendigkeit", "unsicherheit"], "Frage 15: Auswahl bleibt bei drei");
  ok(/höchstens drei/.test(blocked.message), "Frage 15: verständlicher Hinweis");
  const k = L.applySelection(q15, s, "keine", true);
  eq(k.answer.selected, ["keine"], "«Keine wesentlichen Hindernisse» exklusiv");
  const back = L.applySelection(q15, k.answer, "zeit", true);
  eq(back.answer.selected, ["zeit"], "andere Option wählt «Keine» ab");
  let o = L.applySelection(q15, L.emptyAnswer(q15), "andere", true).answer;
  ok(L.validateAnswer(q15, o).some(e => e.field === "other"), "«Andere» ohne Text → Fehlermeldung");
  o.otherText = "  Lärm  ";
  eq(L.validateAnswer(q15, o), [], "«Andere» mit Text gültig");
  o = L.applySelection(q15, o, "andere", false).answer;
  eq(o.otherText, "", "Abwahl von «Andere» leert Text");

  const q12 = C.questions.find(q => q.id === "q12");
  let p = L.applySelection(q12, L.emptyAnswer(q12), "b", true).answer;
  ok(L.validateAnswer(q12, p).some(e => e.field === "confidence"), "Foto: Sicherheit erforderlich");
  p.confidence = "sicher";
  p = L.applySelection(q12, p, "weiss_nicht", true).answer;
  eq(p.confidence, null, "Foto: «kann nicht einschätzen» entfernt Sicherheit");
  eq(L.validateAnswer(q12, p), [], "Foto: «kann nicht einschätzen» ohne Sicherheit gültig");

  const q14 = C.questions.find(q => q.id === "q14");
  const m = { rows: { konzept: "hilfe" } };
  eq(L.validateAnswer(q14, m).length, 3, "Frage 14: drei fehlende Zeilen gemeldet");
  const q16 = C.questions.find(q => q.id === "q16");
  eq(L.validateAnswer(q16, { text: "" }), [], "Frage 16 leer erlaubt");
  ok(L.validateAnswer(q16, { text: "x".repeat(1001) }).length === 1, "Frage 16 Längengrenze");
  ok(L.validateAnswer(C.questions[0], { selected: [] }).length === 1, "Einfachauswahl ohne Antwort → Fehler");
  eq(L.cleanText("a\u0000b\r\nc "), "ab\nc", "Steuerzeichen werden entfernt");
  ok(/^[0-9a-f-]{36}$/.test(L.uuid()), "Zufällige Abgabe-ID");
  eq(L.getQuestions(C, "practice").length, 13, "Übungsdurchlauf: Fragen 1–13");
}

/* =========================================================== */
section("3  Schnittstelle: gültige Abgabe und Bewertung");
if (HAS_SERVER) {
  const env = setupEnv();
  const answers = L.buildAnswersPayload(C.questions, fullCorrectAnswers());
  const body = payload(answers);
  const res = post(env, body);
  ok(res.ok && res.saved, "Abgabe gespeichert");
  eq(res.submissionId, body.submissionId, "Abgabe-ID bestätigt");
  eq(res.score, { points: 11, max: 11, dontKnow: 0 }, "11 von 11 Punkten");
  const T = sheetRows(env, "Teilnahmen");
  eq(T.length, 1, "eine Teilnahme-Zeile");
  eq([T[0][0], T[0][1], T[0][3], T[0][4], T[0][5], T[0][7]], [body.submissionId, C.version, "NEIN", 11, 11, "Pflege"], "Teilnahme: ID, Version, Testdaten, Punkte, Berufsgruppe");
  ok(sheetRows(env, "Antworten").every(r => r[11] === "Pflege"), "Berufsgruppe in jeder Antwortzeile");
  ok(sheetRows(env, "Optionen").every(r => r[8] === "Pflege"), "Berufsgruppe in jeder Optionszeile");
  ok(sheetRows(env, "Freitexte").every(r => r.length === 6 && !r.includes("Pflege")), "Freitexte ohne Berufsgruppe gespeichert");
  ok(T[0][2] instanceof Date, "serverseitiger Eingangszeitpunkt");
  const A = sheetRows(env, "Antworten");
  eq(A.length, 19, "19 Antwortzeilen (16 Fragen, Frage 14 mit 4 Zeilen)");
  const q14rows = A.filter(r => r[3] === "q14");
  eq(q14rows.map(r => r[4] + "=" + r[6]), ["konzept=selbststaendig", "meldeweg=hilfe", "schlucken=weiss_nicht_wo", "beratung=nicht_zutreffend"], "Frage 14 je Zeile getrennt");
  const q13 = A.find(r => r[3] === "q13");
  eq([q13[6], q13[7], q13[8], q13[9]], ["c", "unbewertet", "", "sicher"], "Frage 13 unbewertet mit Sicherheit");
  const q12 = A.find(r => r[3] === "q12");
  eq([q12[7], q12[9]], ["unbewertet", "unsicher"], "Frage 12 unbewertet mit Sicherheit");
  eq(res.feedback.q13.scored, false, "Rückmeldung Frage 13: nicht bewertet");
  ok(/Schätzung/.test(res.feedback.q13.explanation.join(" ")) && res.feedback.q13.explanation[0] === SERVER_QUIZ.questions[12].rueckmeldung[0], "Rückmeldung Frage 13 erklärt den Vergleichswert als Schätzung");
  eq(res.feedback.q13.correct, [], "Frage 13: keine Antwort als richtig markiert");
  ok(!/12[–-]18/.test(JSON.stringify(res.feedback.q12)), "Frage 12: keine unbestätigte Schätzung an Teilnehmende");
  ok(!res.feedback.q14 && !res.feedback.q15 && !res.feedback.q16, "Fragen 14–16 ohne Bewertung");
  eq(res.feedback.q08.correct, SERVER_QUIZ.questions[7].scoring.correct, "Lösung Frage 8 nach Abgabe");
  const O = sheetRows(env, "Optionen");
  eq(O.filter(r => r[3] === "q08").map(r => r[4] + ":" + r[7]), ["a:korrekt_gewaehlt", "b:korrekt_nicht_gewaehlt", "c:korrekt_gewaehlt", "d:korrekt_gewaehlt"], "Optionsanalyse Frage 8");
  eq(O.filter(r => r[3] === "q15" && r[5] === 1).map(r => r[4]), ["zeit", "andere"], "Frage 15 Nennungen");
  const F = sheetRows(env, "Freitexte");
  eq(F.map(r => r[3] + ":" + r[4]), ["q15:Personalwechsel", "q16:Schöpfen bei kleinen Portionen"], "Freitexte separat gespeichert");
  // Antwortreihenfolge in Optionen: Teilnahme zuletzt geschrieben
  ok(env.state.flushes >= 2, "Teilnahme nach den Detailzeilen bestätigt");
}

section("3b Bewertungsregeln");
if (HAS_SERVER) {
  const env = setupEnv();
  const base = fullCorrectAnswers();
  function score(mod) { const a = clone(base); mod(a); const r = post(env, payload(L.buildAnswersPayload(C.questions, a))); return r; }
  let r = score(a => { a.q01.selected = ["a"]; });
  eq(r.score.points, 10, "falsche Einfachauswahl: 0 Punkte, keine Minuspunkte");
  r = score(a => { a.q08.selected = ["a", "c"]; });
  eq([r.score.points, r.feedback.q08.status], [10, "falsch"], "unvollständige Mehrfachauswahl: 0 Punkte");
  r = score(a => { a.q09.selected = ["b", "c", "d"]; });
  eq([r.score.points, r.feedback.q09.status], [10, "falsch"], "Zusatzantwort falsch: 0 Punkte");
  r = score(a => { a.q10.selected = ["weiss_nicht"]; a.q02.selected = ["weiss_nicht"]; });
  eq(r.score, { points: 9, max: 11, dontKnow: 2 }, "«Ich weiss es nicht» gesondert gezählt");
  eq(r.feedback.q10.status, "weiss_nicht", "Status weiss_nicht");
  const env2 = setupEnv();
  const a2 = clone(base); a2.q10.selected = ["weiss_nicht"];
  post(env2, payload(L.buildAnswersPayload(C.questions, a2)));
  eq(sheetRows(env2, "Optionen").filter(x => x[3] === "q10").map(x => x[7]), Array(4).fill("ausgeschlossen_weiss_nicht"), "Optionsanalyse schliesst «Ich weiss es nicht» aus");
  r = score(a => { a.q13 = { selected: ["weiss_nicht"] }; a.q12 = { selected: ["a"], confidence: "sicher" }; });
  eq(r.score.max, 11, "Foto-Antworten ändern Maximalpunkte nicht");
}

section("3c Aktivierung einer Fotobewertung über die Konfiguration");
if (HAS_SERVER) {
  const env = createContext();
  const q13 = env.ctx.QUIZ.questions.find(q => q.id === "q13");
  q13.scoring.active = true; q13.scoring.correct = ["c"];
  env.ctx.einrichten();
  eq(env.ctx.maxPoints_(), 12, "nach Freigabe: 12 bewertete Fragen");
  const a = fullCorrectAnswers();
  const r = post(env, payload(L.buildAnswersPayload(C.questions, a)));
  eq([r.score.points, r.score.max, r.feedback.q13.status], [12, 12, "richtig"], "Frage 13 bewertet nach Freigabe");
}

section("4  Schnittstelle: Ablehnung ungültiger Abgaben");
if (HAS_SERVER) {
  const env = setupEnv();
  const good = L.buildAnswersPayload(C.questions, fullCorrectAnswers());
  function expect(mod, code, name, extra) {
    const a = clone(good); mod(a);
    const r = post(env, payload(a, extra));
    ok(r.ok === false && r.code === code, name + " → " + code + (r.ok ? " (wurde gespeichert!)" : " [" + r.code + ": " + r.message + "]"));
  }
  expect(a => { a.q08.selected = ["a", "weiss_nicht"]; }, "VALIDATION", "Mehrfachauswahl + «Ich weiss es nicht»");
  expect(a => { a.q15.selected = ["zeit", "zustaendigkeit", "unsicherheit", "angebot"]; a.q15.otherText = ""; }, "VALIDATION", "Frage 15 mit vier Antworten");
  expect(a => { a.q15.selected = ["keine", "zeit"]; a.q15.otherText = ""; }, "VALIDATION", "«Keine» mit weiterer Antwort");
  expect(a => { a.q15.selected = ["andere"]; a.q15.otherText = ""; }, "VALIDATION", "«Andere» ohne Text");
  expect(a => { a.q15.selected = ["zeit"]; a.q15.otherText = "x"; }, "VALIDATION", "Freitext ohne «Andere»");
  expect(a => { a.q15.otherText = "x".repeat(301); }, "VALIDATION", "Freitext zu lang");
  expect(a => { a.q16.text = "x".repeat(1001); }, "VALIDATION", "Frage 16 zu lang");
  expect(a => { a.q01.selected = ["b", "c"]; }, "VALIDATION", "Einfachauswahl mit zwei Antworten");
  expect(a => { a.q01.selected = ["z"]; }, "VALIDATION", "unbekannte Option");
  expect(a => { a.q01.selected = ["b", "b"]; }, "VALIDATION", "doppelte Option");
  expect(a => { delete a.q05; }, "VALIDATION", "fehlende Pflichtfrage");
  expect(a => { a.q99 = { selected: ["a"] }; }, "VALIDATION", "unbekannte Frage-ID");
  expect(a => { a.q12.confidence = null; }, "VALIDATION", "Foto ohne Sicherheit");
  expect(a => { a.q12.confidence = "ganz_sicher"; }, "VALIDATION", "ungültige Sicherheit");
  expect(a => { a.q13 = { selected: ["weiss_nicht"], confidence: "sicher" }; }, "VALIDATION", "Sicherheit bei «kann nicht einschätzen»");
  expect(a => { delete a.q14.rows.beratung; }, "VALIDATION", "Frage 14 unvollständig");
  expect(a => { a.q14.rows.extra = "hilfe"; }, "VALIDATION", "Frage 14 unbekannte Zeile");
  expect(a => { a.q14.rows.konzept = "ja"; }, "VALIDATION", "Frage 14 unbekannte Option");
  expect(a => { a.q16.text = 42; }, "VALIDATION", "Text kein String");
  expect(a => { }, "VERSION", "falsche Quizversion", { quizVersion: "alt" });
  expect(a => { }, "VALIDATION", "fehlende Berufsgruppe", { group: "" });
  expect(a => { }, "VALIDATION", "unbekannte Berufsgruppe", { group: "Pflege" });
  expect(a => { }, "VALIDATION", "Berufsgruppe kein String", { group: ["pflege"] });
  expect(a => { }, "VALIDATION", "ungültige Abgabe-ID", { submissionId: "kurz" });
  expect(a => { }, "VALIDATION", "Abgabe-ID mit Sonderzeichen", { submissionId: "=HYPERLINK(\"x\")-aaaaaaaaaaaa" });
  expect(a => { }, "VALIDATION", "ausgefülltes Bot-Feld", { website: "spam" });
  expect(a => { }, "VALIDATION", "Testkennzeichen kein Boolean", { test: "ja" });
  expect(a => { }, "VALIDATION", "Punktzahl vom Browser wird ignoriert", { answers: "nicht-objekt" });
  // vom Browser behauptete Punkte haben keine Wirkung
  const r = post(env, Object.assign(payload(good), { score: { points: 999, max: 999 }, points: 999 }));
  eq(r.score.points, 11, "behauptete Punktzahl wird ignoriert");
  const rb = post(env, "{kein json");
  eq(rb.code, "VALIDATION", "ungültiges JSON");
  const big = post(env, JSON.stringify(payload(good)).replace('"action"', '"pad":"' + "x".repeat(21000) + '","action"'));
  eq(big.code, "VALIDATION", "übergrosse Anfrage");
  eq(post(env, { action: "andere" }).code, "VALIDATION", "unbekannte Aktion");
  eq(sheetRows(env, "Teilnahmen").length, 1, "nur die gültige Abgabe gespeichert");
}

section("5  Doppelte Abgaben, Abbrüche, Gleichzeitigkeit");
if (HAS_SERVER) {
  const env = setupEnv();
  const a = L.buildAnswersPayload(C.questions, fullCorrectAnswers());
  const body = payload(a);
  const r1 = post(env, body), r2 = post(env, body), r3 = post(env, body);
  ok(r1.ok && !r1.duplicate, "erste Abgabe neu");
  ok(r2.ok && r2.duplicate && r3.duplicate, "Wiederholungen als Duplikat erkannt");
  eq(r2.receivedAt, r1.receivedAt, "Duplikat meldet ursprünglichen Eingang");
  eq(sheetRows(env, "Teilnahmen").length, 1, "nur eine Teilnahme trotz 3 Sendungen");
  eq(sheetRows(env, "Antworten").length, 19, "keine doppelten Antwortzeilen");
  // Abgebrochener Schreibvorgang: Detailzeilen ohne Teilnahme
  const body2 = payload(a);
  const shA = env.ss.getSheetByName("Antworten");
  shA.getRange(shA.getLastRow() + 1, 1, 1, 3).setValues([[body2.submissionId, C.version, "NEIN"]]);
  const r4 = post(env, body2);
  ok(r4.ok && !r4.duplicate, "Abgabe nach Abbruch gespeichert");
  eq(sheetRows(env, "Antworten").filter(r => r[0] === body2.submissionId).length, 19, "Reste des Abbruchs entfernt, keine Dubletten");
  // Sperre belegt
  env.state.lockAvailable = false;
  eq(post(env, payload(a)).code, "BUSY", "belegte Sperre → BUSY, nichts gespeichert");
  env.state.lockAvailable = true;
  eq(sheetRows(env, "Teilnahmen").length, 2, "Anzahl Teilnahmen korrekt");
  // Viele Abgaben nacheinander (Apps Script serialisiert über LockService)
  for (let i = 0; i < 25; i++) post(env, payload(a));
  eq(sheetRows(env, "Teilnahmen").length, 27, "25 weitere Abgaben vollständig");
  const ids = sheetRows(env, "Teilnahmen").map(r => r[0]);
  eq(new Set(ids).size, ids.length, "alle Abgabe-IDs eindeutig");
}

section("6  Formelschutz, Testdaten, Erhebungscode, Grenzen");
if (HAS_SERVER) {
  const env = setupEnv();
  const a = fullCorrectAnswers();
  a.q16.text = "=HYPERLINK(\"http://example.org\",\"klick\")";
  a.q15.otherText = "+SUM(A1:A9)";
  const r = post(env, payload(L.buildAnswersPayload(C.questions, a), { test: true }));
  ok(r.ok, "Abgabe mit formelartigem Text gespeichert");
  const F = env.ss.getSheetByName("Freitexte");
  let formulas = 0, texts = [];
  for (const [k, c] of F.cells) { if (c.f) formulas++; if (+k.split(":")[1] === 5 && +k.split(":")[0] > 1) texts.push(c.v); }
  eq(formulas, 0, "Freitext wird nicht als Formel gespeichert");
  ok(texts.includes("=HYPERLINK(\"http://example.org\",\"klick\")"), "Text bleibt lesbar erhalten");
  eq(sheetRows(env, "Teilnahmen")[0][3], "JA", "Testabgabe als Testdaten markiert");
  ok(sheetRows(env, "Antworten").every(r => r[2] === "JA"), "alle Antwortzeilen als Testdaten markiert");
  // Testdaten löschen
  post(env, payload(L.buildAnswersPayload(C.questions, fullCorrectAnswers())));
  env.ctx.testdatenLoeschen();
  eq(sheetRows(env, "Teilnahmen").map(r => r[3]), ["NEIN"], "Testdaten gelöscht, echte Daten erhalten");
  eq(sheetRows(env, "Freitexte").length, 2, "nur echte Freitexte übrig");
  let f2 = 0; for (const [, c] of env.ss.getSheetByName("Freitexte").cells) if (c.f) f2++;
  eq(f2, 0, "auch nach dem Löschen keine Formeln im Freitext");
  // Erhebung geschlossen
  env.ss.getRangeByName("EINST_OFFEN").setValue("NEIN");
  eq(post(env, payload(L.buildAnswersPayload(C.questions, fullCorrectAnswers()))).code, "CLOSED", "geschlossene Erhebung lehnt ab");
  ok(post(env, payload(L.buildAnswersPayload(C.questions, fullCorrectAnswers()), { test: true })).ok, "Testabgabe bei geschlossener Erhebung möglich");
  env.ss.getRangeByName("EINST_OFFEN").setValue("JA");
  // Erhebungscode
  env.ss.getRangeByName("EINST_CODE").setValue("Kafi26");
  eq(post(env, payload(L.buildAnswersPayload(C.questions, fullCorrectAnswers()))).code, "CODE", "fehlender Code abgelehnt");
  ok(post(env, payload(L.buildAnswersPayload(C.questions, fullCorrectAnswers()), { code: " kafi26 " })).ok, "Code ohne Gross-/Kleinschreibung akzeptiert");
  env.ss.getRangeByName("EINST_CODE").setValue("");
  // Ratenbegrenzung
  env.ss.getRangeByName("EINST_MAX_ABGABEN").setValue(2);
  env.cache.clear();
  const b1 = payload(L.buildAnswersPayload(C.questions, fullCorrectAnswers()));
  ok(post(env, b1).ok, "1. Abgabe im Zeitfenster");
  ok(post(env, payload(L.buildAnswersPayload(C.questions, fullCorrectAnswers()))).ok, "2. Abgabe im Zeitfenster");
  eq(post(env, payload(L.buildAnswersPayload(C.questions, fullCorrectAnswers()))).code, "RATE_LIMIT", "3. Abgabe begrenzt");
  ok(post(env, b1).duplicate, "Wiederholung bereits gespeicherter Abgabe weiterhin bestätigt");
  // GET ping
  const ping = JSON.parse(env.ctx.doGet({ parameter: { action: "ping" } }).getContent());
  eq([ping.ok, ping.quizVersion], [true, C.version], "Verbindungstest (GET ?action=ping)");
}

section("7  Einrichtung und Selbsttest");
if (HAS_SERVER) {
  const env = createContext();
  let err = null;
  try { env.ctx.einrichten(); } catch (e) { err = e; }
  ok(!err, "einrichten() ohne Fehler" + (err ? ": " + err.message : ""));
  const names = env.ss.getSheets().map(s => s.name);
  ["Dashboard", "Einstellungen", "Teilnahmen", "Antworten", "Optionen", "Freitexte", "Auswertung Wissen", "Auswertung Fotos", "Praxis und Schulungsbedarf", "Auswertung Berufsgruppen"]
    .forEach(n => ok(names.includes(n), "Blatt vorhanden: " + n));
  eq(env.ss.getSheetByName("Dashboard").charts.length, 6, "Dashboard mit 6 Diagrammen");
  eq(env.ss.getRangeByName("AUSW_GRUPPE").getValue(), "Alle", "Berufsgruppenfilter steht auf «Alle»");
  eq(env.ss.getRangeByName("EINST_MIN_GRUPPE").getValue(), 5, "Mindestgrösse je Berufsgruppe 5");
  eq(env.ss.tz, "Europe/Zurich", "Zeitzone Europe/Zurich");
  const res = env.ctx.selbsttest();
  ok(res.ok, "Selbsttest speichert Testabgabe");
  // erneutes Einrichten zerstört keine Rohdaten
  env.ctx.einrichten();
  eq(sheetRows(env, "Teilnahmen").length, 1, "erneutes Einrichten behält Rohdaten");
  eq(env.ss.getRangeByName("AUSW_VERSION").getValue(), C.version, "Auswertungsversion gesetzt");
  // Export für die Formelprüfung (tests/formula-check.py)
  if (process.env.EXPORT_SHEETS) {
    const dump = {};
    env.ss.getSheets().forEach(s => { dump[s.name] = []; for (const [k, c] of s.cells) { const [r, col] = k.split(":").map(Number); dump[s.name].push([r, col, c.v instanceof Date ? c.v.toISOString() : c.v, !!c.f]); } });
    dump.__names = {}; for (const [n, r] of env.ss.names) dump.__names[n] = [r.sheet.name, r.row, r.col];
    fs.writeFileSync(process.env.EXPORT_SHEETS, JSON.stringify(dump));
  }
}

if (!HAS_SERVER) console.log("\nHinweis: Ordner apps-script fehlt – nur die Browser-Logik wurde geprüft.");
section("8  Spracheinstellung der Tabelle (Trennzeichen «;» statt «,»)");
if (HAS_SERVER) {
  const formulasOf = env => {
    const m = {};
    env.ss.getSheets().forEach(sh => { for (const [k, c] of sh.cells) if (c.f) m[sh.name + "!" + k] = c.f; });
    return m;
  };
  const comma = createContext({ sep: "," }); comma.ctx.einrichten();
  const semi = createContext({ sep: ";" }); semi.ctx.einrichten();
  const fc = formulasOf(comma), fs2 = formulasOf(semi);
  eq(Object.keys(fs2).length, Object.keys(fc).length, "gleiche Anzahl Formeln in beiden Spracheinstellungen");
  ok(Object.keys(fc).length > 300, "viele Formeln geprüft (" + Object.keys(fc).length + ")");
  const outsideQuotes = f => f.replace(/"[^"]*"/g, "");
  ok(Object.values(fs2).every(f => !outsideQuotes(f).includes(",")), "«;»-Tabelle: keine Kommas ausserhalb von Texten");
  ok(Object.keys(fc).every(k => fs2[k] === comma.ctx.localizeFormula_(fc[k], ";")), "«;»-Formeln entsprechen den «,»-Formeln");
  ok(Object.keys(fc).every(k => fc[k] === comma.ctx.localizeFormula_(fc[k], ",")), "«,»-Tabelle bleibt unverändert");
  eq(comma.ctx.localizeFormula_('=IF(A1="x, y",B1,C1)', ";"), '=IF(A1="x, y";B1;C1)', "Kommas in Texten bleiben erhalten");
  ok(semi.ss.getSheetByName("Einstellungen").cell(1, 26) === undefined, "Sprachprobe wieder entfernt");
  eq(semi.ss.getRangeByName("AUSW_GRUPPE").getValue(), "Alle", "Einstellungswerte bleiben erhalten");
  const r = post(semi, payload(L.buildAnswersPayload(C.questions, fullCorrectAnswers())));
  ok(r.ok, "Abgaben funktionieren in «;»-Tabelle");
}

console.log("\n" + (failed ? "✗" : "✓") + " " + passed + " Prüfungen bestanden, " + failed + " fehlgeschlagen");
process.exit(failed ? 1 : 0);
