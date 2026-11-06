/**
 * EINRICHTUNG UND AUSWERTUNG DER GOOGLE-TABELLE
 * -----------------------------------------------------------------
 * Menü «Ernährungsquiz» (erscheint nach dem Neuladen der Tabelle):
 *   - Tabelle einrichten / Auswertung neu aufbauen
 *       Legt fehlende Blätter an und baut die Auswertungsblätter und das
 *       Dashboard neu auf. Rohdaten (Teilnahmen, Antworten, Optionen,
 *       Freitexte) werden NIE gelöscht.
 *   - Selbsttest: Testabgabe speichern
 *   - Testdaten löschen
 *
 * Alle Auswertungen sind Formeln und berücksichtigen neue Abgaben
 * automatisch. Testdaten (Spalte «Testdaten» = JA) sind ausgeschlossen.
 * Ausgewertet wird nur die Quizversion im Blatt «Einstellungen».
 */

var EVAL = {
  WISSEN: 'Auswertung Wissen',
  FOTOS: 'Auswertung Fotos',
  PRAXIS: 'Praxis und Schulungsbedarf',
  DASHBOARD: 'Dashboard',
  GRUPPEN: 'Auswertung Berufsgruppen'
};

var COLORS = {
  head: '#0f5257', headText: '#ffffff', band: '#e3f0ef', note: '#fdf0e6',
  richtig: '#1d6b3a', falsch: '#e07a3f', weiss: '#9aa5b1',
  series4: ['#0f5257', '#5aa3a8', '#e07a3f', '#b9c3c4']
};

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Ernährungsquiz')
    .addItem('Tabelle einrichten / Auswertung neu aufbauen', 'einrichten')
    .addSeparator()
    .addItem('Selbsttest: Testabgabe speichern', 'selbsttest')
    .addItem('Testdaten löschen', 'testdatenLoeschen')
    .addToUi();
}

/* ======================= Einrichten ======================= */

function einrichten() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  ss.setSpreadsheetTimeZone('Europe/Zurich');
  setupSettings_(ss);
  setupRawSheets_(ss);
  buildWissen_(ss);
  buildFotos_(ss);
  buildPraxis_(ss);
  buildGruppen_(ss);
  buildDashboard_(ss);
  // Formeln an die Spracheinstellung der Tabelle anpassen (z. B. «;» statt «,»)
  var sep = formulaSeparator_(ss);
  if (sep !== ',') {
    [SHEET.EINSTELLUNGEN, EVAL.WISSEN, EVAL.FOTOS, EVAL.PRAXIS, EVAL.GRUPPEN, EVAL.DASHBOARD].forEach(function (n) {
      localizeSheetFormulas_(ss.getSheetByName(n), sep);
    });
  }
  ss.setActiveSheet(ss.getSheetByName(EVAL.DASHBOARD));
  var def = ss.getSheetByName('Tabellenblatt1') || ss.getSheetByName('Sheet1');
  if (def && def.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(def);
  safeAlert_('Einrichtung abgeschlossen. Quizversion: ' + QUIZ.version + '.\n\nRohdaten wurden nicht verändert.');
}

function setupSettings_(ss) {
  var sh = ss.getSheetByName(SHEET.EINSTELLUNGEN) || ss.insertSheet(SHEET.EINSTELLUNGEN);
  var existing = {
    offen: ss.getRangeByName('EINST_OFFEN') ? ss.getRangeByName('EINST_OFFEN').getValue() : '',
    version: ss.getRangeByName('AUSW_VERSION') ? ss.getRangeByName('AUSW_VERSION').getValue() : '',
    max: ss.getRangeByName('EINST_MAX_ABGABEN') ? ss.getRangeByName('EINST_MAX_ABGABEN').getValue() : '',
    code: ss.getRangeByName('EINST_CODE') ? ss.getRangeByName('EINST_CODE').getValue() : '',
    gruppe: ss.getRangeByName('AUSW_GRUPPE') ? ss.getRangeByName('AUSW_GRUPPE').getValue() : '',
    min: ss.getRangeByName('EINST_MIN_GRUPPE') ? ss.getRangeByName('EINST_MIN_GRUPPE').getValue() : ''
  };
  sh.clear();
  sh.getRange('A1:C1').setValues([['Einstellung', 'Wert', 'Erklärung']]);
  sh.getRange('A2:C9').setValues([
    ['Erhebung offen', existing.offen || 'JA', 'JA = Abgaben werden angenommen. NEIN = geschlossen (Testabgaben bleiben möglich).'],
    ['Ausgewertete Quizversion', existing.version || QUIZ.version, 'Nur Abgaben dieser Version erscheinen in den Auswertungen. Aktuelle Version der Schnittstelle: ' + QUIZ.version],
    ['Max. neue Abgaben pro 10 Minuten', existing.max || LIMITS.DEFAULT_MAX_PER_WINDOW, 'Schutz vor Massenabgaben. Bei grossen Schulungsgruppen erhöhen.'],
    ['Erhebungscode (optional)', existing.code || '', 'Leer = kein Code nötig. Kein Passwort: hält nur zufällige automatisierte Abgaben fern. Im Frontend SURVEY_CODE_REQUIRED auf true setzen.'],
    ['Ausgewertete Berufsgruppe', existing.gruppe || 'Alle', '«Alle» oder eine Berufsgruppe. Gilt für Auswertung Wissen, Fotos, Praxis und das Dashboard (Freitexte ausgenommen).'],
    ['Mindestgrösse je Berufsgruppe', existing.min || 5, 'Ergebnisse einer Berufsgruppe werden erst ab dieser Anzahl Teilnahmen ausgewiesen (Schutz vor Rückschlüssen auf Einzelpersonen).'],
    ['Filterkriterium (automatisch)', '=IF(B6="Alle","*",B6)', 'Nicht bearbeiten.'],
    ['Hinweis', '', 'Zeilen und Zellen nicht verschieben. Die Schnittstelle liest die Werte über benannte Bereiche.']
  ]);
  setName_(ss, 'EINST_OFFEN', sh.getRange('B2'));
  setName_(ss, 'AUSW_VERSION', sh.getRange('B3'));
  setName_(ss, 'EINST_MAX_ABGABEN', sh.getRange('B4'));
  setName_(ss, 'EINST_CODE', sh.getRange('B5'));
  setName_(ss, 'AUSW_GRUPPE', sh.getRange('B6'));
  setName_(ss, 'EINST_MIN_GRUPPE', sh.getRange('B7'));
  setName_(ss, 'AUSW_GRUPPE_KRIT', sh.getRange('B8'));
  sh.getRange('B6').setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(['Alle'].concat(QUIZ.groups.map(function (g) { return g.label; })), true).build());
  sh.getRange('A8:C8').setFontColor('#6b7f80');
  sh.getRange('B2').setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(['JA', 'NEIN'], true).build());
  sh.getRange('B3').setNumberFormat('@');
  sh.getRange('B5').setNumberFormat('@');
  styleHeader_(sh.getRange('A1:C1'));
  sh.setColumnWidth(1, 260); sh.setColumnWidth(2, 160); sh.setColumnWidth(3, 620);
  sh.getRange('A2:A9').setFontWeight('bold');
  sh.getRange('C2:C9').setWrap(true);
  sh.setFrozenRows(1);
}

function setName_(ss, name, range) {
  var old = ss.getRangeByName(name);
  if (old) ss.removeNamedRange(name);
  ss.setNamedRange(name, range);
}

function setupRawSheets_(ss) {
  [SHEET.TEILNAHMEN, SHEET.ANTWORTEN, SHEET.OPTIONEN, SHEET.FREITEXTE].forEach(function (name) {
    var sh = ss.getSheetByName(name) || ss.insertSheet(name);
    var head = HEADERS[name];
    sh.getRange(1, 1, 1, head.length).setValues([head]);
    styleHeader_(sh.getRange(1, 1, 1, head.length));
    sh.setFrozenRows(1);
    // Textspalten als reiner Text: keine Formeln, keine automatische Umwandlung
    sh.getRange('A:B').setNumberFormat('@');
    if (name === SHEET.ANTWORTEN) { sh.getRange('C:H').setNumberFormat('@'); sh.getRange('J:J').setNumberFormat('@'); sh.getRange('K:K').setNumberFormat('dd.mm.yyyy hh:mm:ss'); sh.getRange('L:L').setNumberFormat('@'); }
    if (name === SHEET.OPTIONEN) { sh.getRange('C:E').setNumberFormat('@'); sh.getRange('H:I').setNumberFormat('@'); }
    if (name === SHEET.FREITEXTE) { sh.getRange('C:E').setNumberFormat('@'); sh.getRange('F:F').setNumberFormat('dd.mm.yyyy hh:mm:ss'); sh.setColumnWidth(5, 520); sh.getRange('E:E').setWrap(true); }
    if (name === SHEET.TEILNAHMEN) { sh.getRange('C:C').setNumberFormat('dd.mm.yyyy hh:mm:ss'); sh.getRange('D:D').setNumberFormat('@'); sh.getRange('H:H').setNumberFormat('@'); }
    sh.setColumnWidth(1, 300);
    // Schutz mit Warnung gegen versehentliche Änderungen
    sh.getProtections(SpreadsheetApp.ProtectionType.SHEET).forEach(function (p) { p.remove(); });
    sh.protect().setDescription('Rohdaten – nur durch die Schnittstelle schreiben').setWarningOnly(true);
  });
}

/* ======================= Formel-Bausteine ======================= */

// Version + keine Testdaten + Berufsgruppenfilter (Einstellungen)
var BASE_A = 'Antworten!$B:$B,AUSW_VERSION,Antworten!$C:$C,"NEIN",Antworten!$L:$L,AUSW_GRUPPE_KRIT';
var BASE_O = 'Optionen!$B:$B,AUSW_VERSION,Optionen!$C:$C,"NEIN",Optionen!$I:$I,AUSW_GRUPPE_KRIT';
var BASE_T = 'Teilnahmen!$B:$B,AUSW_VERSION,Teilnahmen!$D:$D,"NEIN",Teilnahmen!$H:$H,AUSW_GRUPPE_KRIT';
// ohne Berufsgruppenfilter (für den Gruppenvergleich)
var BASE_A_V = 'Antworten!$B:$B,AUSW_VERSION,Antworten!$C:$C,"NEIN"';
var BASE_O_V = 'Optionen!$B:$B,AUSW_VERSION,Optionen!$C:$C,"NEIN"';
var BASE_T_V = 'Teilnahmen!$B:$B,AUSW_VERSION,Teilnahmen!$D:$D,"NEIN"';

function q_(s) { return '"' + String(s).replace(/"/g, '""') + '"'; }
function cA_(pairs) { // COUNTIFS über Antworten
  var parts = [];
  Object.keys(pairs).forEach(function (col) { parts.push('Antworten!$' + col + ':$' + col + ',' + q_(pairs[col])); });
  return 'COUNTIFS(' + parts.join(',') + ',' + BASE_A + ')';
}
function cO_(pairs) { // COUNTIFS über Optionen
  var parts = [];
  Object.keys(pairs).forEach(function (col) {
    var v = pairs[col];
    parts.push('Optionen!$' + col + ':$' + col + ',' + (typeof v === 'number' ? v : q_(v)));
  });
  return 'COUNTIFS(' + parts.join(',') + ',' + BASE_O + ')';
}
function pct_(num, den) { return '=IF(' + den + '=0,"",' + num + '/' + den + ')'; }
function ref_(sheetName, a1) { return "'" + sheetName + "'!" + a1; }

function freshSheet_(ss, name, index) {
  var sh = ss.getSheetByName(name);
  if (sh) { sh.getCharts().forEach(function (c) { sh.removeChart(c); }); sh.clear(); sh.clearConditionalFormatRules(); }
  else sh = ss.insertSheet(name, index);
  return sh;
}

function headerBlock_(sh, title, extraLines) {
  sh.getRange('A1').setValue(title).setFontSize(16).setFontWeight('bold').setFontColor(COLORS.head);
  var rows = [
    ['Ausgewertete Quizversion', '=AUSW_VERSION'],
    ['Abgeschlossene Teilnahmen (ohne Testdaten)', '=COUNTIFS(' + BASE_T + ')'],
    ['Teilnahmen anderer Quizversionen (nicht enthalten)', '=COUNTIFS(Teilnahmen!$D:$D,"NEIN",Teilnahmen!$H:$H,AUSW_GRUPPE_KRIT)-COUNTIFS(' + BASE_T + ')'],
    ['Testdaten (ausgeschlossen)', '=COUNTIF(Teilnahmen!$D:$D,"JA")']
  ].concat(extraLines || []).concat([
    ['Ausgewertete Berufsgruppe', '=AUSW_GRUPPE'],
    ['', '=IF(AND(AUSW_GRUPPE<>"Alle",B3<EINST_MIN_GRUPPE),"Achtung: weniger als "&EINST_MIN_GRUPPE&" Teilnahmen in dieser Berufsgruppe – Ergebnisse nicht weitergeben.","")']
  ]);
  sh.getRange(2, 1, rows.length, 2).setValues(rows);
  sh.getRange(1 + rows.length, 2).setFontColor('#a3261c').setFontWeight('bold');
  sh.getRange(2, 1, rows.length, 1).setFontWeight('bold');
  sh.getRange('B4').setFontColor('#a3261c');
  return rows.length + 2; // nächste freie Zeile
}

function styleHeader_(range) {
  range.setBackground(COLORS.head).setFontColor(COLORS.headText).setFontWeight('bold').setWrap(true).setVerticalAlignment('middle');
}

function scoredQuestions_() {
  return QUIZ.questions.filter(function (q) {
    return q.scoring && q.scoring.active && q.scoring.correct && q.scoring.correct.length && q.type !== 'matrix' && q.type !== 'text';
  });
}
function byQid_(id) { return QUIZ.questions.filter(function (q) { return q.id === id; })[0]; }

/* ======================= Auswertung Wissen ======================= */

var LAYOUT = {}; // Positionen für das Dashboard

function buildWissen_(ss) {
  var sh = freshSheet_(ss, EVAL.WISSEN);
  var r = headerBlock_(sh, 'Auswertung Wissen', [
    ['Durchschnitt Punkte', '=IFERROR(AVERAGEIFS(Teilnahmen!$E:$E,' + BASE_T + '),"–")'],
    ['Max. Punkte (bewertete Fragen)', '=IFERROR(1/(1/MAXIFS(Teilnahmen!$F:$F,' + BASE_T + ')),"–")']
  ]);
  sh.getRange('B6').setNumberFormat('0.0');
  sh.getRange(r, 1).setValue('Die Punktzahl ist nachrangig. Für die Schulungsplanung zählen vor allem die Anteile je Frage und je Option.').setFontStyle('italic');
  r += 2;

  var head = ['Nr', 'Frage', 'Antworten (n)', 'Richtig', 'Falsch', 'Unsicher («Ich weiss es nicht»)', 'Anteil richtig', 'Anteil falsch', 'Anteil unsicher', 'Lernziel'];
  sh.getRange(r, 1, 1, head.length).setValues([head]);
  styleHeader_(sh.getRange(r, 1, 1, head.length));
  var first = r + 1;
  var qs = scoredQuestions_();
  var rows = qs.map(function (q, i) {
    var row = first + i;
    var n = cA_({ D: q.id });
    return [
      q.nr, q.title,
      '=' + n,
      '=' + cA_({ D: q.id, H: 'richtig' }),
      '=' + cA_({ D: q.id, H: 'falsch' }),
      '=' + cA_({ D: q.id, H: 'weiss_nicht' }),
      pct_('D' + row, 'C' + row), pct_('E' + row, 'C' + row), pct_('F' + row, 'C' + row),
      q.lernziel || ''
    ];
  });
  sh.getRange(first, 1, rows.length, head.length).setValues(rows);
  sh.getRange(first, 7, rows.length, 3).setNumberFormat('0%');
  LAYOUT.wissenFirst = first; LAYOUT.wissenCount = rows.length;
  r = first + rows.length + 2;

  // Analyse je Option bei Mehrfachauswahl
  sh.getRange(r, 1).setValue('Mehrfachauswahl: Analyse je Option').setFontWeight('bold').setFontSize(13);
  sh.getRange(r + 1, 1).setValue('Nenner = Antworten auf die Frage OHNE «Ich weiss es nicht». «–» = trifft für diese Option nicht zu (laut Schlüssel der Version ' + QUIZ.version + ').').setFontStyle('italic');
  r += 2;
  var oh = ['Nr', 'Frage', 'Option', 'Laut Schlüssel', 'Nenner (ohne «Ich weiss es nicht»)', 'Korrekt gewählt', 'Anteil', 'Übersehen', 'Anteil', 'Falsch gewählt', 'Anteil'];
  sh.getRange(r, 1, 1, oh.length).setValues([oh]);
  styleHeader_(sh.getRange(r, 1, 1, oh.length));
  r++;
  var multi = qs.filter(function (q) { return q.type === 'multi'; });
  var orows = [];
  multi.forEach(function (q) {
    q.options.forEach(function (o) {
      if (o.id === 'weiss_nicht') return;
      var row = r + orows.length;
      var zutreffend = q.scoring.correct.indexOf(o.id) !== -1;
      var den = '=' + cA_({ D: q.id, H: 'weiss_nicht' }).replace('Antworten!$H:$H,"weiss_nicht"', 'Antworten!$H:$H,"<>weiss_nicht"');
      orows.push([
        q.nr, q.title, o.kurz, zutreffend ? 'zutreffend' : 'nicht zutreffend', den,
        zutreffend ? '=' + cO_({ D: q.id, E: o.id, H: 'korrekt_gewaehlt' }) : '–',
        zutreffend ? pct_('F' + row, 'E' + row) : '–',
        zutreffend ? '=' + cO_({ D: q.id, E: o.id, H: 'uebersehen' }) : '–',
        zutreffend ? pct_('H' + row, 'E' + row) : '–',
        zutreffend ? '–' : '=' + cO_({ D: q.id, E: o.id, H: 'falsch_gewaehlt' }),
        zutreffend ? '–' : pct_('J' + row, 'E' + row)
      ]);
    });
  });
  if (orows.length) {
    sh.getRange(r, 1, orows.length, oh.length).setValues(orows);
    [7, 9, 11].forEach(function (c) { sh.getRange(r, c, orows.length, 1).setNumberFormat('0%'); });
    for (var i = 0; i < orows.length; i++) if (i % 2 === 1) sh.getRange(r + i, 1, 1, oh.length).setBackground('#f6f8f8');
  }
  sh.setColumnWidth(1, 60); sh.setColumnWidth(2, 260); sh.setColumnWidth(3, 260); sh.setColumnWidths(4, 8, 120); sh.setColumnWidth(10, 380);
  sh.getRange('A2:A7').setWrap(false);
  sh.setFrozenRows(0);
}

/* ======================= Auswertung Fotos ======================= */

function buildFotos_(ss) {
  var sh = freshSheet_(ss, EVAL.FOTOS);
  var r = headerBlock_(sh, 'Auswertung Fotoaufgaben');
  sh.getRange(r, 1).setValue('Solange keine fachliche Freigabe vorliegt, gibt es hier keine Einteilung in richtig, falsch, Unter- oder Überschätzung.').setFontStyle('italic');
  r += 2;
  LAYOUT.fotos = {};
  QUIZ.questions.filter(function (q) { return q.type === 'photo'; }).forEach(function (q) {
    var active = !!(q.scoring && q.scoring.active && q.scoring.correct && q.scoring.correct.length);
    sh.getRange(r, 1).setValue('Frage ' + q.nr + ' · ' + q.title).setFontWeight('bold').setFontSize(13);
    sh.getRange(r + 1, 1, 1, 2).setValues([['Stand Lösungsschlüssel', active ? 'Freigegeben: ' + q.scoring.correct.join(', ').toUpperCase() + (q.scoring.approval ? ' (' + (q.scoring.approval.date || '') + ', ' + (q.scoring.approval.by || '') + ')' : '') : (q.statusText || 'Nicht bewertet')]]);
    sh.getRange(r + 1, 2).setWrap(true).setBackground(COLORS.note);
    sh.getRange(r + 2, 1, 1, 2).setValues([['Antworten (n)', '=' + cA_({ D: q.id })]]);
    var nCell = 'B' + (r + 2);
    var head = ['Antwort', 'Anzahl', 'Anteil', 'Sicher', 'Eher sicher', 'Unsicher', 'Ohne Angabe (nur bei «kann nicht einschätzen»)'];
    var hr = r + 4;
    sh.getRange(hr, 1, 1, head.length).setValues([head]);
    styleHeader_(sh.getRange(hr, 1, 1, head.length));
    var rows = q.options.map(function (o, i) {
      var row = hr + 1 + i;
      return [
        o.kurz,
        '=' + cA_({ D: q.id, G: o.id }),
        pct_('B' + row, nCell),
        '=' + cA_({ D: q.id, G: o.id, J: 'sicher' }),
        '=' + cA_({ D: q.id, G: o.id, J: 'eher_sicher' }),
        '=' + cA_({ D: q.id, G: o.id, J: 'unsicher' }),
        '=B' + row + '-SUM(D' + row + ':F' + row + ')'
      ];
    });
    sh.getRange(hr + 1, 1, rows.length, head.length).setValues(rows);
    sh.getRange(hr + 1, 3, rows.length, 1).setNumberFormat('0%');
    var tr = hr + 1 + rows.length;
    var colSum = function (c) { return '=SUM(' + c + (hr + 1) + ':' + c + (tr - 1) + ')'; };
    sh.getRange(tr, 1, 2, 7).setValues([
      ['Verteilung Antwortsicherheit (Anzahl)', colSum('B'), '', colSum('D'), colSum('E'), colSum('F'), colSum('G')],
      ['Verteilung Antwortsicherheit (Anteil)', '', '', pct_('D' + tr, nCell), pct_('E' + tr, nCell), pct_('F' + tr, nCell), pct_('G' + tr, nCell)]
    ]);
    sh.getRange(tr, 1, 2, 7).setFontWeight('bold').setBackground(COLORS.band);
    sh.getRange(tr + 1, 4, 1, 4).setNumberFormat('0%');
    LAYOUT.fotos[q.id] = { first: hr + 1, count: rows.length };
    r = tr + 2;
    if (active) {
      sh.getRange(r, 1, 3, 3).setValues([
        ['Nach Freigabe: richtig', '=' + cA_({ D: q.id, H: 'richtig' }), pct_('B' + r, nCell)],
        ['Nach Freigabe: falsch', '=' + cA_({ D: q.id, H: 'falsch' }), pct_('B' + (r + 1), nCell)],
        ['Nach Freigabe: kann nicht einschätzen', '=' + cA_({ D: q.id, H: 'weiss_nicht' }), pct_('B' + (r + 2), nCell)]
      ]);
      sh.getRange(r, 3, 3, 1).setNumberFormat('0%');
      r += 3;
    }
    r += 2;
  });
  sh.setColumnWidth(1, 300); sh.setColumnWidth(2, 420); sh.setColumnWidths(3, 4, 110); sh.setColumnWidth(7, 200);
}

/* ======================= Praxis und Schulungsbedarf ======================= */

function buildPraxis_(ss) {
  var sh = freshSheet_(ss, EVAL.PRAXIS);
  var r = headerBlock_(sh, 'Praxis und Schulungsbedarf');
  r += 1;
  var q14 = byQid_('q14');
  sh.getRange(r, 1).setValue('Frage 14 · ' + q14.title).setFontWeight('bold').setFontSize(13);
  r++;
  var head = ['Information', 'Antworten (n)'].concat(q14.options.map(function (o) { return o.kurz; })).concat(q14.options.map(function (o) { return 'Anteil: ' + o.kurz; }));
  sh.getRange(r, 1, 1, head.length).setValues([head]);
  styleHeader_(sh.getRange(r, 1, 1, head.length));
  var first = r + 1;
  var rows = q14.rows.map(function (row, i) {
    var rr = first + i;
    var counts = q14.options.map(function (o) { return '=' + cA_({ D: 'q14', E: row.id, G: o.id }); });
    var cols = ['C', 'D', 'E', 'F'];
    var pcts = cols.map(function (c) { return pct_(c + rr, 'B' + rr); });
    return [row.kurz, '=' + cA_({ D: 'q14', E: row.id })].concat(counts).concat(pcts);
  });
  sh.getRange(first, 1, rows.length, head.length).setValues(rows);
  sh.getRange(first, 7, rows.length, 4).setNumberFormat('0%');
  LAYOUT.q14 = { first: first, count: rows.length };
  r = first + rows.length + 2;

  var q15 = byQid_('q15');
  sh.getRange(r, 1).setValue('Frage 15 · ' + q15.title + ' (bis zu drei Nennungen pro Person)').setFontWeight('bold').setFontSize(13);
  r++;
  sh.getRange(r, 1, 1, 2).setValues([['Antworten auf Frage 15 (n)', '=' + cA_({ D: 'q15' })]]);
  var nCell = 'B' + r;
  r++;
  sh.getRange(r, 1, 1, 3).setValues([['Hindernis', 'Nennungen', 'Anteil der Teilnehmenden']]);
  styleHeader_(sh.getRange(r, 1, 1, 3));
  var f15 = r + 1;
  var rows15 = q15.options.map(function (o, i) {
    return [o.kurz, '=' + cO_({ D: 'q15', E: o.id, F: 1 }), pct_('B' + (f15 + i), nCell)];
  });
  sh.getRange(f15, 1, rows15.length, 3).setValues(rows15);
  sh.getRange(f15, 3, rows15.length, 1).setNumberFormat('0%');
  LAYOUT.q15 = { first: f15, count: rows15.length };
  r = f15 + rows15.length + 2;

  sh.getRange(r, 1).setValue('Freiwillige Freitexte').setFontWeight('bold').setFontSize(13);
  sh.getRange(r + 1, 1).setValue('Nur intern verwenden – nicht automatisch veröffentlichen. Vor einer Weitergabe prüfen, ob Rückschlüsse auf Personen möglich sind.').setFontColor('#a3261c').setFontWeight('bold');
  r += 3;
  sh.getRange(r, 1).setValue('Andere Hindernisse (Frage 15)');
  sh.getRange(r, 3).setValue('Schulungswünsche (Frage 16)');
  styleHeader_(sh.getRange(r, 1));
  styleHeader_(sh.getRange(r, 3, 1, 6));
  sh.getRange(r + 1, 1).setFormula('=IFERROR(FILTER(Freitexte!$E$2:$E,Freitexte!$D$2:$D="q15",Freitexte!$B$2:$B=AUSW_VERSION,Freitexte!$C$2:$C="NEIN"),"Noch keine Einträge")');
  sh.getRange(r + 1, 3).setFormula('=IFERROR(FILTER(Freitexte!$E$2:$E,Freitexte!$D$2:$D="q16",Freitexte!$B$2:$B=AUSW_VERSION,Freitexte!$C$2:$C="NEIN"),"Noch keine Einträge")');
  sh.getRange(r + 1, 1, 500, 1).setWrap(true).setVerticalAlignment('top');
  sh.getRange(r + 1, 3, 500, 1).setWrap(true).setVerticalAlignment('top');
  sh.setColumnWidth(1, 320); sh.setColumnWidth(2, 120); sh.setColumnWidth(3, 520); sh.setColumnWidths(4, 7, 120);
}

/* ======================= Auswertung Berufsgruppen ======================= */

function buildGruppen_(ss) {
  var sh = freshSheet_(ss, EVAL.GRUPPEN);
  sh.getRange('A1').setValue('Auswertung nach Berufsgruppen').setFontSize(16).setFontWeight('bold').setFontColor(COLORS.head);
  sh.getRange('A2:B3').setValues([
    ['Ausgewertete Quizversion', '=AUSW_VERSION'],
    ['Mindestgrösse je Berufsgruppe', '=EINST_MIN_GRUPPE']
  ]);
  sh.getRange('A2:A3').setFontWeight('bold');
  sh.getRange('A4').setValue('Berufsgruppen mit weniger Teilnahmen als die Mindestgrösse werden mit «–» ausgeblendet. Dieses Blatt ignoriert den Berufsgruppenfilter in «Einstellungen». Testdaten sind ausgeschlossen.').setFontStyle('italic');

  var groups = QUIZ.groups.map(function (g) { return g.label; });
  var cols = ['Alle'].concat(groups);
  var crit = function (label) { return label === 'Alle' ? '"*"' : q_(label); };
  var minRef = 'EINST_MIN_GRUPPE';

  // Tabelle 1: Übersicht
  var r = 6;
  var h1 = ['Berufsgruppe', 'Teilnahmen', 'Anteil an allen', 'Ø Punkte', 'Ø Anteil richtig', 'Anteil «Ich weiss es nicht»'];
  sh.getRange(r, 1, 1, h1.length).setValues([h1]);
  styleHeader_(sh.getRange(r, 1, 1, h1.length));
  var t1 = r + 1;
  var nRef = {};
  var rows1 = cols.map(function (label, i) {
    var row = t1 + i;
    nRef[label] = '$B$' + row;
    var tCrit = BASE_T_V + ',Teilnahmen!$H:$H,' + crit(label);
    var maxF = 'MAXIFS(Teilnahmen!$F:$F,' + tCrit + ')';
    var hide = function (f) { return '=IF(B' + row + '<' + minRef + ',"–",IFERROR(' + f + ',"–"))'; };
    return [
      label,
      '=COUNTIFS(' + tCrit + ')',
      '=IF(B' + row + '<' + minRef + ',"–",IFERROR(B' + row + '/$B$' + t1 + ',"–"))',
      hide('AVERAGEIFS(Teilnahmen!$E:$E,' + tCrit + ')'),
      hide('AVERAGEIFS(Teilnahmen!$E:$E,' + tCrit + ')/' + maxF),
      hide('SUMIFS(Teilnahmen!$G:$G,' + tCrit + ')/(B' + row + '*' + maxF + ')')
    ];
  });
  sh.getRange(t1, 1, rows1.length, h1.length).setValues(rows1);
  sh.getRange(t1, 3, rows1.length, 1).setNumberFormat('0%');
  sh.getRange(t1, 4, rows1.length, 1).setNumberFormat('0.0');
  sh.getRange(t1, 5, rows1.length, 2).setNumberFormat('0%');
  sh.getRange(t1, 1, 1, h1.length).setFontWeight('bold').setBackground(COLORS.band);
  LAYOUT.gruppen = { first: t1 + 1, count: groups.length };
  r = t1 + rows1.length + 2;

  // Hilfsfunktion: Matrix «Zeilen × Berufsgruppen»
  function matrix(title, note, rowLabels, cellFormula) {
    sh.getRange(r, 1).setValue(title).setFontWeight('bold').setFontSize(13);
    sh.getRange(r + 1, 1).setValue(note).setFontStyle('italic');
    r += 2;
    sh.getRange(r, 1, 1, cols.length + 1).setValues([[''].concat(cols)]);
    styleHeader_(sh.getRange(r, 1, 1, cols.length + 1));
    var data = rowLabels.map(function (rl, i) {
      return [rl.label].concat(cols.map(function (label) {
        return '=IF(' + nRef[label] + '<' + minRef + ',"–",IFERROR(' + cellFormula(rl, label) + ',""))';
      }));
    });
    sh.getRange(r + 1, 1, data.length, cols.length + 1).setValues(data);
    sh.getRange(r + 1, 2, data.length, cols.length).setNumberFormat('0%');
    r += data.length + 3;
  }

  var aCrit = function (label) { return BASE_A_V + ',Antworten!$L:$L,' + crit(label); };
  var oCrit = function (label) { return BASE_O_V + ',Optionen!$I:$I,' + crit(label); };

  matrix('Anteil richtig je Frage', 'Anteil der Antworten auf die Frage, die richtig waren.',
    scoredQuestions_().map(function (q) { return { label: 'F' + q.nr + ' ' + q.title, q: q }; }),
    function (rl, label) {
      return 'COUNTIFS(Antworten!$D:$D,' + q_(rl.q.id) + ',Antworten!$H:$H,"richtig",' + aCrit(label) + ')/COUNTIFS(Antworten!$D:$D,' + q_(rl.q.id) + ',' + aCrit(label) + ')';
    });

  matrix('Anteil «Ich weiss es nicht» je Frage', 'Hinweis auf Unsicherheit und möglichen Schulungsbedarf.',
    scoredQuestions_().map(function (q) { return { label: 'F' + q.nr + ' ' + q.title, q: q }; }),
    function (rl, label) {
      return 'COUNTIFS(Antworten!$D:$D,' + q_(rl.q.id) + ',Antworten!$H:$H,"weiss_nicht",' + aCrit(label) + ')/COUNTIFS(Antworten!$D:$D,' + q_(rl.q.id) + ',' + aCrit(label) + ')';
    });

  var q14 = byQid_('q14');
  matrix('Orientierung im Betrieb (Frage 14): braucht Hilfe oder weiss nicht, wo suchen', 'Anteil der Antworten «Ich brauche Hilfe beim Finden» oder «Ich weiss nicht, wo ich suchen soll».',
    q14.rows.map(function (row) { return { label: row.kurz, id: row.id }; }),
    function (rl, label) {
      var base = 'Antworten!$D:$D,"q14",Antworten!$E:$E,' + q_(rl.id) + ',' + aCrit(label);
      return '(COUNTIFS(' + base + ',Antworten!$G:$G,"hilfe")+COUNTIFS(' + base + ',Antworten!$G:$G,"weiss_nicht_wo"))/COUNTIFS(' + base + ')';
    });

  var q15 = byQid_('q15');
  matrix('Hindernisse (Frage 15)', 'Anteil der Teilnehmenden der Berufsgruppe, die das Hindernis genannt haben (bis zu drei Nennungen).',
    q15.options.map(function (o) { return { label: o.kurz, id: o.id }; }),
    function (rl, label) {
      return 'COUNTIFS(Optionen!$D:$D,"q15",Optionen!$E:$E,' + q_(rl.id) + ',Optionen!$F:$F,1,' + oCrit(label) + ')/COUNTIFS(Antworten!$D:$D,"q15",' + aCrit(label) + ')';
    });

  sh.setColumnWidth(1, 330); sh.setColumnWidths(2, cols.length, 115);
  sh.getRange(6, 1, 1, cols.length + 1).setWrap(true);
}

/* ======================= Dashboard ======================= */

function buildDashboard_(ss) {
  var sh = freshSheet_(ss, EVAL.DASHBOARD, 0);
  sh.getRange('A1').setValue('Dashboard · Ernährung im Alter').setFontSize(18).setFontWeight('bold').setFontColor(COLORS.head);
  sh.getRange('A2:B6').setValues([
    ['Ausgewertete Quizversion', '=AUSW_VERSION'],
    ['Abgeschlossene Teilnahmen (ohne Testdaten)', '=' + ref_(EVAL.WISSEN, 'B3')],
    ['Mittlerer Anteil richtig (bewertete Fragen)', '=IFERROR(' + ref_(EVAL.WISSEN, 'B6') + '/' + ref_(EVAL.WISSEN, 'B7') + ',"–")'],
    ['Nicht enthalten: andere Versionen / Testdaten', '=' + ref_(EVAL.WISSEN, 'B4') + '&" / "&' + ref_(EVAL.WISSEN, 'B5')],
    ['Ausgewertete Berufsgruppe (Einstellungen)', '=AUSW_GRUPPE&IF(AND(AUSW_GRUPPE<>"Alle",B3<EINST_MIN_GRUPPE),"  – zu wenige Teilnahmen, nicht weitergeben","")']
  ]);
  sh.getRange('A2:A6').setFontWeight('bold');
  sh.getRange('B3').setFontSize(14).setFontWeight('bold');
  sh.getRange('B4').setNumberFormat('0%');
  sh.setColumnWidth(1, 330); sh.setColumnWidth(2, 140);

  // ---- Diagrammdaten (rechts, automatisch) ----
  var C0 = 14; // Spalte N
  sh.getRange(1, C0).setValue('Diagrammdaten – automatisch berechnet, bitte nicht bearbeiten').setFontStyle('italic').setFontColor('#46595b');

  // 1) Wissen je Frage
  var r = 3;
  var qs = scoredQuestions_();
  sh.getRange(r, C0, 1, 4).setValues([['Frage', 'Richtig', 'Falsch', 'Ich weiss es nicht']]);
  var data1 = qs.map(function (q, i) {
    var wr = LAYOUT.wissenFirst + i;
    return ['F' + q.nr + ' ' + q.title, '=N(' + ref_(EVAL.WISSEN, 'G' + wr) + ')', '=N(' + ref_(EVAL.WISSEN, 'H' + wr) + ')', '=N(' + ref_(EVAL.WISSEN, 'I' + wr) + ')'];
  });
  sh.getRange(r + 1, C0, data1.length, 4).setValues(data1);
  sh.getRange(r + 1, C0 + 1, data1.length, 3).setNumberFormat('0%');
  var range1 = sh.getRange(r, C0, data1.length + 1, 4);
  r += data1.length + 3;

  // 2) Fotoaufgaben
  var photoRanges = [];
  QUIZ.questions.filter(function (q) { return q.type === 'photo'; }).forEach(function (q) {
    var lay = LAYOUT.fotos[q.id];
    sh.getRange(r, C0, 1, 5).setValues([['F' + q.nr + ' Antwort', 'Sicher', 'Eher sicher', 'Unsicher', 'Ohne Sicherheitsangabe']]);
    var d = q.options.map(function (o, oi) {
      var fr = lay.first + oi;
      return [o.kurz].concat(['D', 'E', 'F', 'G'].map(function (c) { return '=' + ref_(EVAL.FOTOS, c + fr); }));
    });
    sh.getRange(r + 1, C0, d.length, 5).setValues(d);
    photoRanges.push({ q: q, range: sh.getRange(r, C0, d.length + 1, 5) });
    r += d.length + 3;
  });

  // 3) Hindernisse (sortiert)
  sh.getRange(r, C0, 1, 2).setValues([['Hindernis', 'Nennungen']]);
  var lay15 = LAYOUT.q15;
  sh.getRange(r + 1, C0).setFormula('=SORT(' + ref_(EVAL.PRAXIS, 'A' + lay15.first + ':B' + (lay15.first + lay15.count - 1)) + ',2,FALSE)');
  var range3 = sh.getRange(r, C0, lay15.count + 1, 2);
  r += lay15.count + 3;

  // 4) Orientierung im Betrieb
  var q14 = byQid_('q14');
  sh.getRange(r, C0, 1, 5).setValues([['Information'].concat(q14.options.map(function (o) { return o.kurz; }))]);
  var lay14 = LAYOUT.q14;
  var d4 = q14.rows.map(function (row, i) {
    var pr = lay14.first + i;
    return [row.kurz].concat(['G', 'H', 'I', 'J'].map(function (c) { return '=N(' + ref_(EVAL.PRAXIS, c + pr) + ')'; }));
  });
  sh.getRange(r + 1, C0, d4.length, 5).setValues(d4);
  sh.getRange(r + 1, C0 + 1, d4.length, 4).setNumberFormat('0%');
  var range4 = sh.getRange(r, C0, d4.length + 1, 5);
  r += d4.length + 3;

  // 5) Berufsgruppen: Anteil richtig (nur Gruppen ab Mindestgrösse)
  sh.getRange(r, C0, 1, 2).setValues([['Berufsgruppe', 'Ø Anteil richtig']]);
  var lg = LAYOUT.gruppen;
  var d5 = QUIZ.groups.map(function (g, i) {
    var gr = lg.first + i;
    return [g.label, '=IF(ISNUMBER(' + ref_(EVAL.GRUPPEN, 'E' + gr) + '),' + ref_(EVAL.GRUPPEN, 'E' + gr) + ',"")'];
  });
  sh.getRange(r + 1, C0, d5.length, 2).setValues(d5);
  sh.getRange(r + 1, C0 + 1, d5.length, 1).setNumberFormat('0%');
  var range5 = sh.getRange(r, C0, d5.length + 1, 2);

  // ---- Diagramme ----
  var W = 760;
  sh.insertChart(sh.newChart().asBarChart().addRange(range1).setNumHeaders(1)
    .setStacked().setOption('isStacked', 'percent')
    .setOption('title', 'Wissensstand und Unsicherheit je Frage (Anteile)')
    .setOption('colors', [COLORS.richtig, COLORS.falsch, COLORS.weiss])
    .setOption('legend', { position: 'top' })
    .setOption('hAxis', { format: 'percent', minValue: 0, maxValue: 1 })
    .setOption('width', W).setOption('height', 420)
    .setPosition(7, 1, 0, 0).build());

  photoRanges.forEach(function (p, i) {
    sh.insertChart(sh.newChart().asColumnChart().addRange(p.range).setNumHeaders(1)
      .setStacked()
      .setOption('title', 'Frage ' + p.q.nr + ': Antworten nach Sicherheit (Anzahl) – unbewertet')
      .setOption('colors', [COLORS.head, '#5aa3a8', '#e07a3f', '#b9c3c4'])
      .setOption('legend', { position: 'top' })
      .setOption('width', 372).setOption('height', 320)
      .setPosition(29, 1 + i * 3, i === 0 ? 0 : 20, 0).build());
  });

  sh.insertChart(sh.newChart().asBarChart().addRange(range3).setNumHeaders(1)
    .setOption('title', 'Häufigste Umsetzungshindernisse (Nennungen)')
    .setOption('colors', [COLORS.falsch])
    .setOption('legend', { position: 'none' })
    .setOption('width', W).setOption('height', 340)
    .setPosition(46, 1, 0, 0).build());

  sh.insertChart(sh.newChart().asBarChart().addRange(range4).setNumHeaders(1)
    .setStacked().setOption('isStacked', 'percent')
    .setOption('title', 'Orientierung im Betrieb (Anteile)')
    .setOption('colors', COLORS.series4)
    .setOption('legend', { position: 'top', maxLines: 2 })
    .setOption('hAxis', { format: 'percent', minValue: 0, maxValue: 1 })
    .setOption('width', W).setOption('height', 320)
    .setPosition(64, 1, 0, 0).build());

  sh.insertChart(sh.newChart().asBarChart().addRange(range5).setNumHeaders(1)
    .setOption('title', 'Ø Anteil richtig je Berufsgruppe (ohne zu kleine Gruppen)')
    .setOption('colors', [COLORS.head])
    .setOption('legend', { position: 'none' })
    .setOption('hAxis', { format: 'percent', minValue: 0, maxValue: 1 })
    .setOption('width', W).setOption('height', 340)
    .setPosition(81, 1, 0, 0).build());
}

/* ======================= Spracheinstellung ======================= */

/**
 * Ermittelt das Trennzeichen für Formelargumente in dieser Tabelle.
 * Apps Script schreibt Formeln in der Spracheinstellung der Tabelle:
 * z. B. «Deutschland» verlangt «;», «Schweiz»/«USA» verlangen «,».
 */
function formulaSeparator_(ss) {
  var sh = ss.getSheetByName(SHEET.EINSTELLUNGEN);
  var probe = sh.getRange('Z1');
  probe.setValues([['=SUM(1,2)']]); // gleicher Schreibweg wie die Auswertungsformeln
  SpreadsheetApp.flush();
  var v = probe.getValue();
  probe.clearContent();
  return v === 3 ? ',' : ';';
}

/** Ersetzt Kommas ausserhalb von Texten in Anführungszeichen durch sep. */
function localizeFormula_(f, sep) {
  var out = '', inStr = false;
  for (var i = 0; i < f.length; i++) {
    var ch = f.charAt(i);
    if (ch === '"') inStr = !inStr;
    out += (!inStr && ch === ',') ? sep : ch;
  }
  return out;
}

function localizeSheetFormulas_(sh, sep) {
  if (!sh || sh.getLastRow() === 0) return;
  var range = sh.getRange(1, 1, sh.getLastRow(), sh.getLastColumn());
  var formulas = range.getFormulas();
  var values = range.getValues();
  var changed = false;
  for (var r = 0; r < formulas.length; r++) {
    for (var c = 0; c < formulas[r].length; c++) {
      if (formulas[r][c]) { values[r][c] = localizeFormula_(formulas[r][c], sep); changed = true; }
    }
  }
  if (changed) range.setValues(values);
}

/* ======================= Werkzeuge ======================= */

/** Speichert eine vollständige Beispielabgabe als TESTDATEN (prüft Schreibrechte und Formeln). */
function selbsttest() {
  var answers = {};
  QUIZ.questions.forEach(function (q) {
    if (q.type === 'single') answers[q.id] = { selected: [q.options[0].id] };
    else if (q.type === 'photo') answers[q.id] = { selected: [q.options[1].id], confidence: 'eher_sicher' };
    else if (q.type === 'multi') answers[q.id] = q.otherOption ? { selected: [q.options[0].id, q.otherOption], otherText: 'Selbsttest' } : { selected: [q.options[0].id, q.options[2].id] };
    else if (q.type === 'matrix') { var rows = {}; q.rows.forEach(function (r) { rows[r.id] = q.options[0].id; }); answers[q.id] = { rows: rows }; }
    else if (q.type === 'text') answers[q.id] = { text: '=Selbsttest (Formelschutz-Prüfung)' };
  });
  var id = 'selbsttest-' + Utilities.getUuid();
  var res = handleSubmit_({ postData: { contents: JSON.stringify({ action: 'submit', quizVersion: QUIZ.version, submissionId: id, test: true, code: readSettings_().code, group: 'andere', website: '', answers: answers }) } });
  var again = handleSubmit_({ postData: { contents: JSON.stringify({ action: 'submit', quizVersion: QUIZ.version, submissionId: id, test: true, code: readSettings_().code, group: 'andere', website: '', answers: answers }) } });
  var msg = res.ok
    ? 'Selbsttest erfolgreich.\nAbgabe-ID: ' + id + '\nPunkte: ' + res.score.points + ' von ' + res.score.max +
      '\nWiederholung erkannt (kein Doppeleintrag): ' + (again.ok && again.duplicate ? 'JA' : 'NEIN – bitte prüfen') +
      '\n\nDie Zeilen sind als Testdaten (JA) markiert und erscheinen nicht in der Auswertung.'
    : 'Selbsttest fehlgeschlagen: ' + res.code + ' – ' + res.message;
  safeAlert_(msg);
  return res;
}

/** Entfernt alle Zeilen mit Testdaten = JA aus den Rohdaten. */
function testdatenLoeschen() {
  var ui = null;
  try { ui = SpreadsheetApp.getUi(); } catch (e) { }
  if (ui) {
    var a = ui.alert('Testdaten löschen', 'Alle Zeilen mit «Testdaten = JA» in Teilnahmen, Antworten, Optionen und Freitexte werden gelöscht. Fortfahren?', ui.ButtonSet.YES_NO);
    if (a !== ui.Button.YES) return;
  }
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  var total = 0;
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var cols = {}; cols[SHEET.TEILNAHMEN] = 4; cols[SHEET.ANTWORTEN] = 3; cols[SHEET.OPTIONEN] = 3; cols[SHEET.FREITEXTE] = 3;
    Object.keys(cols).forEach(function (name) {
      var sh = ss.getSheetByName(name);
      if (!sh || sh.getLastRow() < 2) return;
      var vals = sh.getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn()).getValues();
      var keep = vals.filter(function (row) { return row[cols[name] - 1] !== 'JA'; });
      var removed = vals.length - keep.length;
      if (!removed) return;
      total += removed;
      sh.getRange(2, 1, vals.length, vals[0].length).clearContent();
      // Texte erneut gegen Formelausführung sichern (getValues liefert sie ohne Schutzzeichen)
      keep = keep.map(function (row) { return row.map(function (v) { return typeof v === 'string' ? safeCellText_(v) : v; }); });
      if (keep.length) sh.getRange(2, 1, keep.length, keep[0].length).setValues(keep);
    });
  } finally { lock.releaseLock(); }
  safeAlert_(total + ' Testzeilen gelöscht.');
}

function safeAlert_(msg) {
  try { SpreadsheetApp.getUi().alert(msg); } catch (e) { console.log(msg); }
}
