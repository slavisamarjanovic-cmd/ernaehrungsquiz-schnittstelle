/*
 * Reine Antwortlogik ohne Darstellung (auch in den automatischen Tests genutzt).
 * Die Google-Schnittstelle prüft alles noch einmal selbst – diese Datei dient
 * nur der Bedienung im Browser.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.QuizLogic = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var PRACTICE_SECTIONS = ["pflegealltag", "portionen"];

  function getQuestions(content, mode) {
    if (mode === "practice") {
      return content.questions.filter(function (q) { return PRACTICE_SECTIONS.indexOf(q.section) !== -1; });
    }
    return content.questions.slice();
  }

  function emptyAnswer(q) {
    switch (q.type) {
      case "single": return { selected: [] };
      case "photo": return { selected: [], confidence: null };
      case "multi": return q.otherOption ? { selected: [], otherText: "" } : { selected: [] };
      case "matrix": return { rows: {} };
      case "text": return { text: "" };
      default: throw new Error("Unbekannter Fragetyp: " + q.type);
    }
  }

  function clone(a) { return JSON.parse(JSON.stringify(a)); }

  function optionLabel(q, id) {
    for (var i = 0; i < q.options.length; i++) if (q.options[i].id === id) return q.options[i].label.replace(/\.$/, "");
    return id;
  }

  /* Auswahl einer Option (Radio) oder An-/Abwählen (Checkbox).
   * Liefert { answer, message, blocked }. message ist ein Hinweis für
   * Screenreader und die sichtbare Statuszeile. */
  function applySelection(q, answer, optionId, checked) {
    var next = clone(answer || emptyAnswer(q));
    var message = "";
    if (q.type === "single" || q.type === "photo") {
      next.selected = [optionId];
      if (q.type === "photo" && optionId === "weiss_nicht") next.confidence = null;
      return { answer: next, message: message, blocked: false };
    }
    if (q.type !== "multi") throw new Error("applySelection: falscher Fragetyp");

    var exclusive = q.exclusive || [];
    var sel = next.selected.slice();
    var has = sel.indexOf(optionId) !== -1;

    if (!checked) {
      sel = sel.filter(function (x) { return x !== optionId; });
      next.selected = sel;
      if (q.otherOption && optionId === q.otherOption) next.otherText = "";
      return { answer: next, message: "", blocked: false };
    }
    if (has) return { answer: next, message: "", blocked: false };

    if (exclusive.indexOf(optionId) !== -1) {
      if (sel.length > 0) {
        message = "«" + optionLabel(q, optionId) + "» kann nur allein gewählt werden. Die anderen Antworten wurden abgewählt.";
      }
      next.selected = [optionId];
      if (q.otherOption) next.otherText = "";
      return { answer: next, message: message, blocked: false };
    }

    var removedExclusive = sel.filter(function (x) { return exclusive.indexOf(x) !== -1; });
    if (removedExclusive.length) {
      sel = sel.filter(function (x) { return exclusive.indexOf(x) === -1; });
      message = "«" + optionLabel(q, removedExclusive[0]) + "» wurde abgewählt.";
    }
    if (q.maxSelect && sel.length >= q.maxSelect) {
      return {
        answer: clone(answer),
        message: "Du kannst höchstens " + numberWord(q.maxSelect) + " Antworten wählen. Wähle zuerst eine andere Antwort ab.",
        blocked: true
      };
    }
    sel.push(optionId);
    // Reihenfolge wie im Fragebogen
    next.selected = q.options.map(function (o) { return o.id; }).filter(function (id) { return sel.indexOf(id) !== -1; });
    return { answer: next, message: message, blocked: false };
  }

  function numberWord(n) {
    return ["null", "eine", "zwei", "drei", "vier", "fünf"][n] || String(n);
  }

  function cleanText(s) {
    if (typeof s !== "string") return "";
    return s.replace(/\r\n?/g, "\n").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim();
  }

  /* Prüft eine Antwort. Liefert eine Liste von Fehlern { field, message }.
   * field: "options" | "confidence" | "other" | "text" | "row:<id>" */
  function validateAnswer(q, answer) {
    var a = answer || emptyAnswer(q);
    var errors = [];
    var ids = (q.options || []).map(function (o) { return o.id; });
    switch (q.type) {
      case "single":
        if (!a.selected || a.selected.length !== 1 || ids.indexOf(a.selected[0]) === -1)
          errors.push({ field: "options", message: "Bitte wähle eine Antwort aus." });
        break;
      case "photo":
        if (!a.selected || a.selected.length !== 1 || ids.indexOf(a.selected[0]) === -1) {
          errors.push({ field: "options", message: "Bitte wähle eine Einschätzung aus." });
        } else if (a.selected[0] !== "weiss_nicht" && !a.confidence) {
          errors.push({ field: "confidence", message: "Bitte gib an, wie sicher du bei deiner Einschätzung bist." });
        }
        break;
      case "multi": {
        var sel = a.selected || [];
        if (sel.length === 0) {
          errors.push({ field: "options", message: "Bitte wähle mindestens eine Antwort aus." });
          break;
        }
        if (q.maxSelect && sel.length > q.maxSelect)
          errors.push({ field: "options", message: "Bitte wähle höchstens " + numberWord(q.maxSelect) + " Antworten." });
        var ex = (q.exclusive || []).filter(function (x) { return sel.indexOf(x) !== -1; });
        if (ex.length && sel.length > 1)
          errors.push({ field: "options", message: "«" + optionLabel(q, ex[0]) + "» kann nur allein gewählt werden." });
        if (q.otherOption && sel.indexOf(q.otherOption) !== -1) {
          var t = cleanText(a.otherText);
          if (!t) errors.push({ field: "other", message: "Bitte beschreibe das andere Hindernis kurz oder wähle «Andere Hindernisse» wieder ab." });
          else if (t.length > (q.otherMaxLength || 300))
            errors.push({ field: "other", message: "Bitte kürze deinen Text auf höchstens " + (q.otherMaxLength || 300) + " Zeichen." });
        }
        break;
      }
      case "matrix":
        q.rows.forEach(function (r) {
          var v = a.rows && a.rows[r.id];
          if (!v || ids.indexOf(v) === -1)
            errors.push({ field: "row:" + r.id, message: "Bitte wähle eine Antwort für «" + r.label + "»." });
        });
        break;
      case "text": {
        var tx = cleanText(a.text);
        if (!q.optional && !tx) errors.push({ field: "text", message: "Bitte gib eine Antwort ein." });
        if (tx.length > (q.maxLength || 1000))
          errors.push({ field: "text", message: "Bitte kürze deinen Text auf höchstens " + (q.maxLength || 1000) + " Zeichen." });
        break;
      }
    }
    return errors;
  }

  function isAnswered(q, answer) {
    var a = answer || emptyAnswer(q);
    if (q.type === "matrix") return Object.keys(a.rows || {}).length > 0;
    if (q.type === "text") return !!cleanText(a.text);
    return (a.selected || []).length > 0;
  }

  /* Kurze Zusammenfassung für die Übersicht vor der Abgabe */
  function summarize(q, answer, content) {
    var a = answer || emptyAnswer(q);
    if (q.type === "matrix") {
      return q.rows.map(function (r) {
        var v = a.rows && a.rows[r.id];
        return r.label + ": " + (v ? optionLabel(q, v) : "– noch offen –");
      });
    }
    if (q.type === "text") {
      var t = cleanText(a.text);
      return [t ? (t.length > 140 ? t.slice(0, 140) + " …" : t) : "Keine Angabe (freiwillig)"];
    }
    var sel = a.selected || [];
    if (!sel.length) return ["– noch offen –"];
    var lines = sel.map(function (id) {
      var l = optionLabel(q, id);
      if (q.otherOption && id === q.otherOption && cleanText(a.otherText)) l += ": " + cleanText(a.otherText);
      return l;
    });
    if (q.type === "photo" && a.confidence && content) {
      var c = content.confidenceOptions.filter(function (o) { return o.id === a.confidence; })[0];
      if (c) lines.push("Sicherheit: " + c.label);
    }
    return lines;
  }

  /* Datensatz für die Übertragung – nur IDs und bereinigte Texte. */
  function buildAnswersPayload(questions, answers) {
    var out = {};
    questions.forEach(function (q) {
      var a = answers[q.id] || emptyAnswer(q);
      switch (q.type) {
        case "single": out[q.id] = { selected: (a.selected || []).slice(0, 1) }; break;
        case "photo": out[q.id] = { selected: (a.selected || []).slice(0, 1), confidence: a.selected && a.selected[0] === "weiss_nicht" ? null : (a.confidence || null) }; break;
        case "multi":
          out[q.id] = { selected: (a.selected || []).slice() };
          if (q.otherOption) out[q.id].otherText = (a.selected || []).indexOf(q.otherOption) !== -1 ? cleanText(a.otherText) : "";
          break;
        case "matrix": {
          var rows = {};
          q.rows.forEach(function (r) { if (a.rows && a.rows[r.id]) rows[r.id] = a.rows[r.id]; });
          out[q.id] = { rows: rows };
          break;
        }
        case "text": out[q.id] = { text: cleanText(a.text) }; break;
      }
    });
    return out;
  }

  /* Bewertung im Übungsmodus mit dem Schlüssel, den der Server nach der
   * bestätigten Abgabe geliefert hat. Gleiche Regeln wie auf dem Server. */
  function scoreWithKey(q, answer, keyEntry) {
    var sel = (answer && answer.selected) || [];
    if (!keyEntry || !keyEntry.scored) return { status: "unbewertet", points: 0, max: 0 };
    if (sel.indexOf("weiss_nicht") !== -1) return { status: "weiss_nicht", points: 0, max: 1 };
    var correct = keyEntry.correct || [];
    var ok = sel.length === correct.length && correct.every(function (c) { return sel.indexOf(c) !== -1; });
    return { status: ok ? "richtig" : "falsch", points: ok ? 1 : 0, max: 1 };
  }

  function uuid() {
    var c = (typeof crypto !== "undefined") ? crypto : null;
    if (c && c.randomUUID) return c.randomUUID();
    if (c && c.getRandomValues) {
      var b = new Uint8Array(16); c.getRandomValues(b);
      b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80;
      var h = Array.prototype.map.call(b, function (x) { return ("0" + x.toString(16)).slice(-2); }).join("");
      return h.slice(0, 8) + "-" + h.slice(8, 12) + "-" + h.slice(12, 16) + "-" + h.slice(16, 20) + "-" + h.slice(20);
    }
    throw new Error("Kein sicherer Zufallsgenerator verfügbar");
  }

  return {
    getQuestions: getQuestions,
    emptyAnswer: emptyAnswer,
    applySelection: applySelection,
    validateAnswer: validateAnswer,
    isAnswered: isAnswered,
    summarize: summarize,
    buildAnswersPayload: buildAnswersPayload,
    scoreWithKey: scoreWithKey,
    cleanText: cleanText,
    optionLabel: optionLabel,
    uuid: uuid
  };
});
