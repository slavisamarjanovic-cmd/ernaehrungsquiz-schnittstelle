/**
 * @OnlyCurrentDoc
 *
 * DATENSCHNITTSTELLE  –  Ernährungsquiz
 * -----------------------------------------------------------------
 * Nimmt Abgaben des Quiz entgegen, prüft sie vollständig, berechnet die
 * Punkte aus dem Lösungsschlüssel (Quiz.gs) und schreibt sie in diese
 * Google-Tabelle. Erst danach wird "saved: true" zurückgemeldet.
 *
 * Bereitstellung: Bereitstellen > Neue Bereitstellung > Web-App
 *   Ausführen als: Ich       Zugriff: Jeder (auch anonym)
 * Die Tabelle selbst bleibt privat: Teilnehmende sprechen nur mit dieser
 * Schnittstelle und erhalten nie Lesezugriff auf die Tabelle.
 */

var SHEET = {
  TEILNAHMEN: 'Teilnahmen',
  ANTWORTEN: 'Antworten',
  OPTIONEN: 'Optionen',
  FREITEXTE: 'Freitexte',
  EINSTELLUNGEN: 'Einstellungen'
};

var HEADERS = {
  Teilnahmen: ['Abgabe-ID', 'Quizversion', 'Eingang (Server)', 'Testdaten', 'Punkte', 'Max. Punkte', 'Anzahl «Ich weiss es nicht» (bewertete Fragen)', 'Berufsgruppe'],
  Antworten: ['Abgabe-ID', 'Quizversion', 'Testdaten', 'Frage-ID', 'Teil-ID', 'Fragetyp', 'Gewählte Options-IDs', 'Bewertungsstatus', 'Punkte', 'Antwortsicherheit', 'Eingang (Server)', 'Berufsgruppe'],
  Optionen: ['Abgabe-ID', 'Quizversion', 'Testdaten', 'Frage-ID', 'Option-ID', 'Gewählt (1/0)', 'Zutreffend laut Schlüssel (1/0)', 'Analyse', 'Berufsgruppe'],
  // Freitexte bewusst OHNE Berufsgruppe (Datenschutz: Kombination erhöht die Erkennbarkeit)
  Freitexte: ['Abgabe-ID', 'Quizversion', 'Testdaten', 'Frage-ID', 'Text', 'Eingang (Server)']
};

var LIMITS = {
  MAX_BODY_CHARS: 20000,
  ID_PATTERN: /^[A-Za-z0-9-]{16,64}$/,
  LOCK_WAIT_MS: 30000,
  RATE_WINDOW_MS: 10 * 60 * 1000,
  DEFAULT_MAX_PER_WINDOW: 60
};

/* ======================= Einstiegspunkte ======================= */

function doGet(e) {
  var p = (e && e.parameter) || {};
  if (p.action === 'ping') {
    var s = readSettings_();
    return json_({ ok: true, service: 'ernaehrungsquiz', quizVersion: QUIZ.version, open: s.open });
  }
  return json_({ ok: true, service: 'ernaehrungsquiz', message: 'Diese Adresse nimmt nur Quiz-Abgaben entgegen.' });
}

function doPost(e) {
  var result;
  try {
    result = handleSubmit_(e);
  } catch (err) {
    console.error('Unerwarteter Fehler: ' + (err && err.stack || err));
    result = { ok: false, code: 'SERVER', message: 'Interner Fehler bei der Speicherung.' };
  }
  return json_(result);
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function fail_(code, message) { return { ok: false, code: code, message: message }; }

/* ======================= Abgabe verarbeiten ======================= */

function handleSubmit_(e) {
  var raw = e && e.postData && typeof e.postData.contents === 'string' ? e.postData.contents : '';
  if (!raw) return fail_('VALIDATION', 'Leere Anfrage');
  if (raw.length > LIMITS.MAX_BODY_CHARS) return fail_('VALIDATION', 'Die Abgabe ist zu gross');

  var data;
  try { data = JSON.parse(raw); } catch (err) { return fail_('VALIDATION', 'Ungültiges Datenformat'); }
  if (!isPlainObject_(data) || data.action !== 'submit') return fail_('VALIDATION', 'Unbekannte Aktion');

  // Unsichtbares Feld: Menschen lassen es leer.
  if (data.website !== undefined && data.website !== '' ) return fail_('VALIDATION', 'Abgabe abgelehnt');

  if (data.quizVersion !== QUIZ.version) return fail_('VERSION', 'Quizversion passt nicht (erwartet ' + QUIZ.version + ')');
  if (typeof data.submissionId !== 'string' || !LIMITS.ID_PATTERN.test(data.submissionId)) return fail_('VALIDATION', 'Ungültige Abgabe-ID');
  if (data.test !== undefined && typeof data.test !== 'boolean') return fail_('VALIDATION', 'Ungültige Testkennzeichnung');
  var isTest = data.test === true;

  var settings = readSettings_();
  if (!settings.open && !isTest) return fail_('CLOSED', 'Die Erhebung ist geschlossen');
  if (settings.code) {
    var given = typeof data.code === 'string' ? data.code.trim().toUpperCase() : '';
    if (given !== settings.code.trim().toUpperCase()) return fail_('CODE', 'Erhebungscode ungültig');
  }

  var group = groupById_(data.group);
  if (!group) return fail_('VALIDATION', 'Berufsgruppe fehlt oder ist ungültig');

  var checked = validateAndScore_(data.answers);
  if (checked.errors.length) return fail_('VALIDATION', checked.errors[0]);

  return storeSubmission_(data.submissionId, isTest, checked, settings, group.label);
}

function storeSubmission_(submissionId, isTest, checked, settings, groupLabel) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(LIMITS.LOCK_WAIT_MS)) return fail_('BUSY', 'Zurzeit ausgelastet');
  var receivedAt;
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var shT = requireSheet_(ss, SHEET.TEILNAHMEN);

    // 1) Doppelte Abgabe? (Doppelklick oder erneuter Versuch nach Verbindungsfehler)
    var existingRow = findIdRow_(shT, submissionId);
    if (existingRow) {
      receivedAt = shT.getRange(existingRow, 3).getValue();
      return successResponse_(submissionId, checked, receivedAt, true);
    }

    // 2) Schutz vor Massenabgaben (gilt für alle neuen Abgaben gemeinsam)
    var cache = CacheService.getScriptCache();
    var bucket = 'rl:' + Math.floor(Date.now() / LIMITS.RATE_WINDOW_MS);
    var count = parseInt(cache.get(bucket) || '0', 10);
    if (count >= settings.maxPerWindow) return fail_('RATE_LIMIT', 'Zu viele Abgaben in kurzer Zeit');

    // 3) Reste eines früher abgebrochenen Schreibvorgangs entfernen
    removeRowsWithId_(ss, submissionId, [SHEET.ANTWORTEN, SHEET.OPTIONEN, SHEET.FREITEXTE]);

    receivedAt = new Date();
    var version = QUIZ.version;
    var testFlag = isTest ? 'JA' : 'NEIN';

    var aRows = checked.answerRows.map(function (r) {
      return [submissionId, version, testFlag, r.questionId, r.partId || '', r.type, r.selected, r.status, r.points === null ? '' : r.points, r.confidence || '', receivedAt, groupLabel];
    });
    var oRows = checked.optionRows.map(function (r) {
      return [submissionId, version, testFlag, r.questionId, r.optionId, r.chosen, r.expected === null ? '' : r.expected, r.analysis, groupLabel];
    });
    var fRows = checked.textRows.map(function (r) {
      return [submissionId, version, testFlag, r.questionId, safeCellText_(r.text), receivedAt];
    });

    appendRows_(requireSheet_(ss, SHEET.ANTWORTEN), aRows);
    appendRows_(requireSheet_(ss, SHEET.OPTIONEN), oRows);
    appendRows_(requireSheet_(ss, SHEET.FREITEXTE), fRows);
    SpreadsheetApp.flush();

    // 4) Zuletzt die Teilnahme selbst: sie bestätigt die vollständige Abgabe.
    appendRows_(shT, [[submissionId, version, receivedAt, testFlag, checked.score.points, checked.score.max, checked.score.dontKnow, groupLabel]]);
    SpreadsheetApp.flush();

    cache.put(bucket, String(count + 1), 900);
  } finally {
    lock.releaseLock();
  }
  return successResponse_(submissionId, checked, receivedAt, false);
}

function successResponse_(submissionId, checked, receivedAt, duplicate) {
  return {
    ok: true,
    saved: true,
    duplicate: duplicate,
    submissionId: submissionId,
    quizVersion: QUIZ.version,
    receivedAt: receivedAt instanceof Date ? receivedAt.toISOString() : String(receivedAt || ''),
    score: checked.score,
    feedback: checked.feedback
  };
}

/* ======================= Prüfung und Bewertung ======================= */

/**
 * Prüft alle Antworten gegen QUIZ und bestimmt die Bewertung.
 * Liefert { errors, answerRows, optionRows, textRows, score, feedback }.
 */
function validateAndScore_(answers) {
  var out = { errors: [], answerRows: [], optionRows: [], textRows: [], score: { points: 0, max: 0, dontKnow: 0 }, feedback: {} };
  if (!isPlainObject_(answers)) { out.errors.push('Antworten fehlen'); return out; }

  var known = {};
  QUIZ.questions.forEach(function (q) { known[q.id] = true; });
  Object.keys(answers).forEach(function (k) { if (!known[k]) out.errors.push('Unbekannte Frage: ' + k); });
  if (out.errors.length) return out;

  QUIZ.questions.forEach(function (q) {
    var a = answers[q.id];
    var label = 'Frage ' + q.nr;
    if (a === undefined || a === null) {
      if (q.optional) a = (q.type === 'text') ? { text: '' } : {};
      else { out.errors.push(label + ': Antwort fehlt'); return; }
    }
    if (!isPlainObject_(a)) { out.errors.push(label + ': ungültiges Format'); return; }
    var optionIds = (q.options || []).map(function (o) { return o.id; });

    if (q.type === 'single' || q.type === 'photo' || q.type === 'multi') {
      var sel = a.selected;
      if (!Array.isArray(sel)) { out.errors.push(label + ': Auswahl fehlt'); return; }
      for (var i = 0; i < sel.length; i++) {
        if (typeof sel[i] !== 'string' || optionIds.indexOf(sel[i]) === -1) { out.errors.push(label + ': unbekannte Antwortoption'); return; }
        if (sel.indexOf(sel[i]) !== i) { out.errors.push(label + ': Option doppelt gewählt'); return; }
      }
      if (q.type !== 'multi' && sel.length !== 1) { out.errors.push(label + ': genau eine Antwort erforderlich'); return; }
      if (q.type === 'multi') {
        if (sel.length < 1) { out.errors.push(label + ': mindestens eine Antwort erforderlich'); return; }
        if (q.maxSelect && sel.length > q.maxSelect) { out.errors.push(label + ': höchstens ' + q.maxSelect + ' Antworten erlaubt'); return; }
        var ex = (q.exclusive || []).filter(function (x) { return sel.indexOf(x) !== -1; });
        if (ex.length && sel.length > 1) { out.errors.push(label + ': «' + ex[0] + '» muss allein gewählt werden'); return; }
      }
      // Reihenfolge normalisieren
      sel = optionIds.filter(function (id) { return sel.indexOf(id) !== -1; });

      var otherText = '';
      if (q.otherOption) {
        var ot = a.otherText === undefined || a.otherText === null ? '' : a.otherText;
        if (typeof ot !== 'string') { out.errors.push(label + ': ungültiger Freitext'); return; }
        ot = cleanText_(ot);
        if (sel.indexOf(q.otherOption) !== -1) {
          if (!ot) { out.errors.push(label + ': Freitext zu «Andere Hindernisse» fehlt'); return; }
          if (ot.length > (q.otherMaxLength || 300)) { out.errors.push(label + ': Freitext zu lang'); return; }
          otherText = ot;
        } else if (ot) { out.errors.push(label + ': Freitext ohne «Andere Hindernisse»'); return; }
      } else if (a.otherText !== undefined && a.otherText !== '' && a.otherText !== null) {
        out.errors.push(label + ': unerwarteter Freitext'); return;
      }

      var confidence = '';
      if (q.type === 'photo') {
        var cf = a.confidence === undefined ? null : a.confidence;
        if (sel[0] === 'weiss_nicht') {
          if (cf !== null && cf !== '') { out.errors.push(label + ': Sicherheit bei «kann ich nicht einschätzen» nicht vorgesehen'); return; }
        } else {
          if (CONFIDENCE_IDS.indexOf(cf) === -1) { out.errors.push(label + ': Antwortsicherheit fehlt oder ungültig'); return; }
          confidence = cf;
        }
      }

      var ev = evaluate_(q, sel);
      if (ev.max) { out.score.max += ev.max; out.score.points += ev.points; if (ev.status === 'weiss_nicht') out.score.dontKnow++; }
      out.answerRows.push({ questionId: q.id, partId: '', type: q.type, selected: sel.join(','), status: ev.status, points: ev.max ? ev.points : null, confidence: confidence });

      if (q.type === 'multi') {
        var scored = q.scoring && q.scoring.active;
        var dk = sel.indexOf('weiss_nicht') !== -1;
        optionIds.forEach(function (oid) {
          if (scored && oid === 'weiss_nicht') return;
          var chosen = sel.indexOf(oid) !== -1 ? 1 : 0;
          var expected = scored ? (q.scoring.correct.indexOf(oid) !== -1 ? 1 : 0) : null;
          var analysis;
          if (!scored) analysis = 'nicht_bewertet';
          else if (dk) analysis = 'ausgeschlossen_weiss_nicht';
          else if (expected && chosen) analysis = 'korrekt_gewaehlt';
          else if (expected && !chosen) analysis = 'uebersehen';
          else if (!expected && chosen) analysis = 'falsch_gewaehlt';
          else analysis = 'korrekt_nicht_gewaehlt';
          out.optionRows.push({ questionId: q.id, optionId: oid, chosen: chosen, expected: expected, analysis: analysis });
        });
      }
      if (otherText) out.textRows.push({ questionId: q.id, text: otherText });

      var fb = feedbackFor_(q, ev);
      if (fb) out.feedback[q.id] = fb;
      return;
    }

    if (q.type === 'matrix') {
      var rows = a.rows;
      if (!isPlainObject_(rows)) { out.errors.push(label + ': Zeilenantworten fehlen'); return; }
      var rowIds = q.rows.map(function (r) { return r.id; });
      var keys = Object.keys(rows);
      for (var k = 0; k < keys.length; k++) if (rowIds.indexOf(keys[k]) === -1) { out.errors.push(label + ': unbekannte Zeile'); return; }
      for (var r = 0; r < rowIds.length; r++) {
        var v = rows[rowIds[r]];
        if (typeof v !== 'string' || optionIds.indexOf(v) === -1) { out.errors.push(label + ': Antwort für jede Zeile erforderlich'); return; }
      }
      rowIds.forEach(function (rid) {
        out.answerRows.push({ questionId: q.id, partId: rid, type: 'matrix', selected: rows[rid], status: 'nicht_bewertet', points: null, confidence: '' });
      });
      return;
    }

    if (q.type === 'text') {
      var t = a.text === undefined || a.text === null ? '' : a.text;
      if (typeof t !== 'string') { out.errors.push(label + ': ungültiger Text'); return; }
      t = cleanText_(t);
      if (!t && !q.optional) { out.errors.push(label + ': Text fehlt'); return; }
      if (t.length > (q.maxLength || 1000)) { out.errors.push(label + ': Text zu lang'); return; }
      out.answerRows.push({ questionId: q.id, partId: '', type: 'text', selected: t ? 'freitext' : 'leer', status: 'nicht_bewertet', points: null, confidence: '' });
      if (t) out.textRows.push({ questionId: q.id, text: t });
      return;
    }

    out.errors.push(label + ': unbekannter Fragetyp');
  });
  return out;
}

var CONFIDENCE_IDS = ['sicher', 'eher_sicher', 'unsicher'];

/** Bewertung einer Auswahl nach dem Schlüssel in Quiz.gs. */
function evaluate_(q, sel) {
  var sc = q.scoring || {};
  if (q.type === 'multi' && !sc.active) return { status: 'nicht_bewertet', points: 0, max: 0 };
  if (!sc.active || !sc.correct || !sc.correct.length) return { status: 'unbewertet', points: 0, max: 0 };
  if (sel.indexOf('weiss_nicht') !== -1) return { status: 'weiss_nicht', points: 0, max: 1 };
  var ok = sel.length === sc.correct.length && sc.correct.every(function (c) { return sel.indexOf(c) !== -1; });
  return { status: ok ? 'richtig' : 'falsch', points: ok ? 1 : 0, max: 1 };
}

/** Rückmeldung nach der Abgabe (nur Fragen mit Begründung). */
function feedbackFor_(q, ev) {
  if (!q.rueckmeldung) return null;
  var sc = q.scoring || {};
  var scored = !!(sc.active && sc.correct && sc.correct.length);
  var fb = {
    scored: scored,
    status: ev.status,
    correct: scored ? sc.correct.slice() : [],
    explanation: q.rueckmeldung.slice()
  };
  if (!scored && q.referenceText) fb.reference = { text: q.referenceText };
  return fb;
}

/** Maximal erreichbare Punkte aus den tatsächlich bewerteten Fragen. */
function maxPoints_() {
  return QUIZ.questions.filter(function (q) {
    return q.scoring && q.scoring.active && q.scoring.correct && q.scoring.correct.length && q.type !== 'matrix' && q.type !== 'text';
  }).length;
}

/* ======================= Hilfsfunktionen ======================= */

function groupById_(id) {
  if (typeof id !== 'string') return null;
  return QUIZ.groups.filter(function (g) { return g.id === id; })[0] || null;
}

function isPlainObject_(x) { return x !== null && typeof x === 'object' && !Array.isArray(x); }

function cleanText_(s) {
  return String(s).replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F​-‏‪-‮⁦-⁩]/g, '').trim();
}

/** Verhindert, dass Freitext als Tabellenformel ausgeführt wird. */
function safeCellText_(s) {
  var t = String(s);
  if (/^[=+\-@\t\r＝＋－＠]/.test(t)) t = "'" + t;
  return t;
}

function readSettings_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var get = function (name, fallback) {
    var r = ss.getRangeByName(name);
    if (!r) return fallback;
    var v = r.getValue();
    return v === '' || v === null ? fallback : v;
  };
  var openVal = String(get('EINST_OFFEN', 'JA')).trim().toUpperCase();
  var max = parseInt(get('EINST_MAX_ABGABEN', LIMITS.DEFAULT_MAX_PER_WINDOW), 10);
  return {
    open: openVal === 'JA' || openVal === 'TRUE' || openVal === 'WAHR',
    maxPerWindow: isNaN(max) || max < 1 ? LIMITS.DEFAULT_MAX_PER_WINDOW : max,
    code: String(get('EINST_CODE', '') || '').trim()
  };
}

function requireSheet_(ss, name) {
  var sh = ss.getSheetByName(name);
  if (!sh) throw new Error('Tabellenblatt fehlt: ' + name + ' – bitte Menü «Ernährungsquiz > Tabelle einrichten» ausführen.');
  return sh;
}

function findIdRow_(sheet, id) {
  var last = sheet.getLastRow();
  if (last < 2) return 0;
  var cell = sheet.getRange(2, 1, last - 1, 1).createTextFinder(id).matchEntireCell(true).matchCase(true).findNext();
  return cell ? cell.getRow() : 0;
}

function removeRowsWithId_(ss, id, sheetNames) {
  sheetNames.forEach(function (name) {
    var sh = ss.getSheetByName(name);
    if (!sh || sh.getLastRow() < 2) return;
    var cells = sh.getRange(2, 1, sh.getLastRow() - 1, 1).createTextFinder(id).matchEntireCell(true).matchCase(true).findAll();
    var rows = cells.map(function (c) { return c.getRow(); }).sort(function (a, b) { return b - a; });
    rows.forEach(function (r) { sh.deleteRow(r); });
  });
}

function appendRows_(sheet, rows) {
  if (!rows.length) return;
  sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
}
