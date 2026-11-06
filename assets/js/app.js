/*
 * Darstellung und Ablauf des Quiz.
 * Inhalte: quiz-content.js  ·  Einstellungen: config.js  ·  Regeln: logic.js
 */
(function () {
  "use strict";

  var C = window.QUIZ_CONTENT;
  var CFG = window.QUIZ_CONFIG || {};
  var L = window.QuizLogic;
  var main = document.getElementById("main");
  var live = document.getElementById("live");

  var params = new URLSearchParams(window.location.search);
  var TEST_MODE = params.get("test") === "1";
  var URL_CODE = (params.get("code") || "").slice(0, 64);

  var KEY_STATE = "ernquiz:" + C.version + ":state";
  var KEY_FEEDBACK = "ernquiz:" + C.version + ":schluessel";
  var KEY_DONE = "ernquiz:" + C.version + ":abgeschickt";

  /* ---------------- Speicher im Browser (nur dieses Gerät) ---------------- */
  function sGet(store, k) { try { var v = window[store].getItem(k); return v ? JSON.parse(v) : null; } catch (e) { return null; } }
  function sSet(store, k, v) { try { window[store].setItem(k, JSON.stringify(v)); } catch (e) { /* privater Modus o. Ä. */ } }
  function sDel(store, k) { try { window[store].removeItem(k); } catch (e) { } }

  function freshState(mode) {
    return { mode: mode, stepIndex: -1, answers: {}, group: "", submissionId: null, returnToReview: false, code: "", result: null, practiceResult: null };
  }
  var state = sGet("sessionStorage", KEY_STATE) || freshState("survey");
  var submitting = false;

  function save() { sSet("sessionStorage", KEY_STATE, state); }

  /* ---------------- Hilfsfunktionen ---------------- */
  function h(tag, attrs) {
    var el = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v === null || v === undefined || v === false) return;
      if (k === "class") el.className = v;
      else if (k === "text") el.textContent = v;
      else if (k.slice(0, 2) === "on") el.addEventListener(k.slice(2), v);
      else if (v === true) el.setAttribute(k, "");
      else el.setAttribute(k, v);
    });
    for (var i = 2; i < arguments.length; i++) append(el, arguments[i]);
    return el;
  }
  function append(el, c) {
    if (c === null || c === undefined || c === false) return;
    if (Array.isArray(c)) { c.forEach(function (x) { append(el, x); }); return; }
    el.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
  }
  function svg(path, size) {
    var ns = "http://www.w3.org/2000/svg";
    var s = document.createElementNS(ns, "svg");
    s.setAttribute("viewBox", "0 0 24 24"); s.setAttribute("width", size || 18); s.setAttribute("height", size || 18);
    s.setAttribute("aria-hidden", "true"); s.setAttribute("focusable", "false");
    var p = document.createElementNS(ns, "path");
    p.setAttribute("d", path); p.setAttribute("fill", "none"); p.setAttribute("stroke", "currentColor");
    p.setAttribute("stroke-width", "3"); p.setAttribute("stroke-linecap", "round"); p.setAttribute("stroke-linejoin", "round");
    s.appendChild(p); return s;
  }
  var ICON_CHECK = "M5 12.5l4.5 4.5L19 7.5";
  var ICON_CHEV = "M6 9l6 6 6-6";
  var ICON_INFO = "M12 8h.01M11 12h1v5h1";
  function announce(msg) { live.textContent = ""; if (msg) setTimeout(function () { live.textContent = msg; }, 60); }
  function letter(i) { return String.fromCharCode(65 + i); }
  function sectionOf(id) { return C.sections.filter(function (s) { return s.id === id; })[0]; }
  function sectionIndex(id) { for (var i = 0; i < C.sections.length; i++) if (C.sections[i].id === id) return i; return -1; }
  function byId(id) { return C.questions.filter(function (q) { return q.id === id; })[0]; }

  /* ---------------- Schritte ---------------- */
  function questions() { return L.getQuestions(C, state.mode); }
  function buildSteps() {
    var steps = [], last = null;
    if (state.mode === "survey") steps.push({ kind: "group" });
    questions().forEach(function (q, i) {
      if (q.section !== last) { steps.push({ kind: "section", section: q.section }); last = q.section; }
      steps.push({ kind: "question", q: q, number: i + 1 });
    });
    steps.push({ kind: "review" });
    return steps;
  }
  function answers() { return state.answers; }

  /* ---------------- Kopfzeile ---------------- */
  function updateChrome(step) {
    var prog = document.getElementById("progress");
    document.getElementById("test-banner").hidden = !TEST_MODE || state.mode === "practice";
    document.getElementById("practice-banner").hidden = state.mode !== "practice" || !step;
    if (!step) { prog.hidden = true; return; }
    prog.hidden = false;
    var total = questions().length;
    var label = document.getElementById("progress-label");
    label.textContent = "";
    var sec = null, done = 0;
    if (step.kind === "question") {
      sec = step.q.section;
      done = step.number;
      label.appendChild(document.createTextNode("Frage " + step.number + " von " + total));
    } else if (step.kind === "group") {
      done = 0;
      label.appendChild(document.createTextNode("Vor dem Start"));
    } else if (step.kind === "section") {
      sec = step.section;
      var si = sectionIndex(sec);
      done = questions().filter(function (q) { return sectionIndex(q.section) < si; }).length;
      label.appendChild(document.createTextNode("Abschnitt " + (si + 1) + " von " + activeSections().length));
    } else {
      done = total;
      label.appendChild(document.createTextNode("Übersicht vor der Abgabe"));
    }
    if (sec) label.appendChild(h("span", { class: "section-name", text: sectionOf(sec).title }));
    var bar = document.getElementById("progress-bar");
    bar.setAttribute("aria-valuemax", total);
    bar.setAttribute("aria-valuenow", done);
    bar.setAttribute("aria-valuetext", step.kind === "question" ? "Frage " + step.number + " von " + total : done + " von " + total + " Fragen");
    document.getElementById("progress-fill").style.width = Math.round(done / total * 100) + "%";

    var stepper = document.getElementById("stepper");
    stepper.textContent = "";
    var curIdx = sec ? sectionIndex(sec) : (step.kind === "group" ? -1 : C.sections.length);
    activeSections().forEach(function (s) {
      var i = sectionIndex(s.id);
      var st = i < curIdx ? "done" : (i === curIdx ? "current" : "todo");
      var li = h("li", { "data-state": st },
        h("span", { class: "dot", "aria-hidden": "true" }, st === "done" ? svg(ICON_CHECK, 12) : String(i + 1)),
        h("span", { class: "label" }, s.title));
      if (st === "current") li.setAttribute("aria-current", "step");
      li.appendChild(h("span", { class: "sr-only", text: st === "done" ? " (abgeschlossen)" : st === "current" ? " (aktuell)" : "" }));
      stepper.appendChild(li);
    });
  }
  function activeSections() {
    var used = {};
    questions().forEach(function (q) { used[q.section] = true; });
    return C.sections.filter(function (s) { return used[s.id]; });
  }

  function show(screen, focusEl) {
    main.textContent = "";
    main.appendChild(screen);
    window.scrollTo(0, 0);
    var target = focusEl || screen.querySelector("h1");
    if (target) { target.setAttribute("tabindex", "-1"); target.focus({ preventScroll: true }); }
  }

  /* ================= Startseite ================= */
  function renderStart() {
    updateChrome(null);
    document.title = C.title + " – Quiz";
    var card = h("section", { class: "card screen hero" });
    card.appendChild(h("h1", { text: C.title }));
    card.appendChild(h("p", { class: "subtitle", text: C.subtitle }));
    C.intro.forEach(function (p) { card.appendChild(h("p", { text: p })); });

    card.appendChild(h("ul", { class: "facts" },
      h("li", null, h("strong", { text: "16 Fragen" }), "in drei Abschnitten"),
      h("li", null, h("strong", { text: "Kein Zeitdruck" }), "Zurückgehen jederzeit möglich"),
      h("li", null, h("strong", { text: "Ohne Namen" }), "keine Personendaten")
    ));
    var ol = h("ol", { class: "sections-preview", "aria-label": "Abschnitte" });
    C.sections.forEach(function (s, i) { ol.appendChild(h("li", null, h("span", { class: "num", "aria-hidden": "true", text: String(i + 1) }), s.title)); });
    card.appendChild(ol);

    if (!CFG.ENDPOINT_URL) {
      card.appendChild(h("div", { class: "notice notice--danger", role: "note" },
        h("strong", { text: "Hinweis für die Einrichtung: " }),
        "Die Speicheradresse (ENDPOINT_URL in assets/js/config.js) ist noch nicht eingetragen. Das Quiz kann so keine Antworten speichern."));
    }

    var hasResult = !!state.result && state.mode === "survey";
    var inProgress = state.mode === "survey" && !state.result && state.stepIndex >= 0;
    var feedbackKey = sGet("sessionStorage", KEY_FEEDBACK);
    var doneOnDevice = sGet("localStorage", KEY_DONE);

    if (hasResult) {
      card.appendChild(h("div", { class: "notice notice--ok" }, "Du hast das Quiz abgeschlossen. Deine Antworten wurden gespeichert."));
      var row = h("div", { class: "nav" },
        h("button", { type: "button", class: "btn btn--secondary", onclick: function () { renderResult(); } }, "Rückmeldung ansehen"),
        h("button", { type: "button", class: "btn btn--primary", onclick: startPractice }, "Übungsdurchlauf starten"));
      card.appendChild(row);
      card.appendChild(h("p", { class: "small muted" }, "Der Übungsdurchlauf wird nicht gespeichert."));
      card.appendChild(newPersonButton());
      main.textContent = ""; main.appendChild(card); card.querySelector("h1").setAttribute("tabindex", "-1");
      return;
    }

    if (doneOnDevice && !inProgress) {
      card.appendChild(h("div", { class: "notice", role: "note" },
        "Auf diesem Gerät wurde das Quiz bereits abgeschickt. Falls du selbst schon teilgenommen hast, sende es bitte nicht ein zweites Mal ab."));
    }

    var codeInput = null;
    if (CFG.SURVEY_CODE_REQUIRED && !inProgress) {
      codeInput = h("input", { class: "input", id: "survey-code", name: "code", autocomplete: "off", autocapitalize: "characters", spellcheck: "false", maxlength: "64", "aria-describedby": "code-hint code-err", value: state.code || URL_CODE });
      card.appendChild(h("div", { class: "field" },
        h("label", { for: "survey-code", text: "Erhebungscode" }),
        h("p", { id: "code-hint", class: "small muted", text: "Den Code findest du auf der Einladung oder dem Aushang." }),
        codeInput,
        h("div", { id: "code-err", class: "error-box", role: "alert" })));
    }

    var nav = h("div", { class: "nav" });
    if (inProgress) {
      nav.appendChild(h("button", { type: "button", class: "btn btn--ghost", onclick: function () {
        if (window.confirm("Alle bisherigen Antworten verwerfen und neu beginnen?")) { state = freshState("survey"); save(); renderStart(); }
      } }, "Neu beginnen"));
      nav.appendChild(h("button", { type: "button", class: "btn btn--primary", onclick: function () { go(state.stepIndex); } }, "Weitermachen"));
    } else {
      nav.appendChild(h("button", { type: "button", class: "btn btn--primary", id: "start-btn", onclick: function () {
        if (codeInput) {
          var v = codeInput.value.trim();
          var err = document.getElementById("code-err");
          if (!v) {
            err.textContent = "Bitte gib den Erhebungscode ein."; err.classList.add("is-visible");
            codeInput.setAttribute("aria-invalid", "true"); codeInput.focus(); return;
          }
          state.code = v;
        } else if (URL_CODE) { state.code = URL_CODE; }
        state.mode = "survey"; save(); go(0);
      } }, "Quiz starten"));
    }
    card.appendChild(nav);
    if (feedbackKey && !inProgress) {
      card.appendChild(h("p", { class: "small" }, h("button", { type: "button", class: "btn btn--link", onclick: startPractice }, "Übungsdurchlauf starten (wird nicht gespeichert)")));
    }
    main.textContent = ""; main.appendChild(card);
  }

  function newPersonButton() {
    return h("p", { class: "small" }, h("button", { type: "button", class: "btn btn--link", onclick: function () {
      if (!window.confirm("Neue Teilnahme für eine andere Person an diesem Gerät starten? Die Rückmeldung der vorherigen Person wird dabei aus diesem Browserfenster entfernt.")) return;
      sDel("sessionStorage", KEY_FEEDBACK);
      state = freshState("survey"); save(); renderStart();
    } }, "Eine andere Person möchte an diesem Gerät teilnehmen"));
  }

  function startPractice() {
    if (!sGet("sessionStorage", KEY_FEEDBACK)) { renderStart(); return; }
    var keep = state.result;
    state = freshState("practice"); state.result = keep; save(); go(0);
  }

  /* ================= Navigation ================= */
  function go(i) {
    var steps = buildSteps();
    if (i < 0) { state.stepIndex = -1; save(); renderStart(); return; }
    if (i >= steps.length) i = steps.length - 1;
    state.stepIndex = i; save();
    var st = steps[i];
    if (st.kind === "group") renderGroup(st, i);
    else if (st.kind === "section") renderSection(st, i);
    else if (st.kind === "question") renderQuestion(st, i);
    else renderReview(i);
  }

  /* ================= Berufsgruppe ================= */
  function groupLabel(id) {
    var g = C.groups.options.filter(function (o) { return o.id === id; })[0];
    return g ? g.label : "";
  }

  function renderGroup(step, i) {
    updateChrome(step);
    var G = C.groups;
    var card = h("section", { class: "card screen" });
    card.appendChild(h("p", { class: "eyebrow", text: "Vor dem Start" }));
    card.appendChild(h("h1", { text: G.title }));
    card.appendChild(h("p", { class: "muted", text: G.intro }));
    var errorBox = h("div", { class: "error-box", id: "err-gruppe", role: "alert" });
    var fs = h("fieldset", { "aria-describedby": "mode-gruppe err-gruppe" });
    fs.appendChild(h("legend", { class: "prompt", text: G.prompt }));
    fs.appendChild(h("p", { class: "mode", id: "mode-gruppe" }, modeIcon({ type: "single" }), "Eine Antwort wählen"));
    var list = h("div", { class: "options options--groups" });
    G.options.forEach(function (o) {
      list.appendChild(optionEl("radio", "gruppe", null, o, null, state.group === o.id, function () {
        state.group = o.id; save(); syncClasses(fs);
        errorBox.classList.remove("is-visible"); errorBox.textContent = "";
        fs.querySelectorAll("[aria-invalid]").forEach(function (x) { x.removeAttribute("aria-invalid"); });
      }));
    });
    fs.appendChild(list);
    card.appendChild(fs);
    card.appendChild(errorBox);
    card.appendChild(h("div", { class: "nav" },
      h("button", { type: "button", class: "btn btn--ghost", onclick: function () { state.returnToReview = false; go(i - 1); } }, "Zurück"),
      h("button", { type: "button", class: "btn btn--primary", onclick: function () {
        if (!groupLabel(state.group)) {
          errorBox.textContent = "Bitte wähle deine Berufsgruppe aus."; errorBox.classList.add("is-visible");
          var first = fs.querySelector("input");
          fs.querySelectorAll("input").forEach(function (x) { x.setAttribute("aria-invalid", "true"); });
          first.focus(); return;
        }
        if (state.returnToReview) { state.returnToReview = false; go(buildSteps().length - 1); }
        else go(i + 1);
      } }, state.returnToReview ? "Zur Übersicht" : "Weiter")));
    document.title = G.title + " – " + C.title;
    show(card);
  }

  /* ================= Abschnittsseite ================= */
  function renderSection(step, i) {
    updateChrome(step);
    var s = sectionOf(step.section);
    var idx = activeSections().indexOf(s);
    var card = h("section", { class: "card screen section-intro" },
      h("div", { class: "badge-big", "aria-hidden": "true", text: String(idx + 1) }),
      h("p", { class: "eyebrow", text: "Abschnitt " + (idx + 1) + " von " + activeSections().length }),
      h("h1", { text: s.title }),
      h("p", { class: "lead", text: s.intro }));
    if (step.section === "arbeitsalltag") card.appendChild(h("p", { class: "privacy-hint" }, svg(ICON_INFO), C.privacyHint));
    card.appendChild(h("div", { class: "nav" },
      h("button", { type: "button", class: "btn btn--ghost", onclick: function () { go(i - 1); } }, "Zurück"),
      h("button", { type: "button", class: "btn btn--primary", onclick: function () { go(i + 1); } }, "Los geht's")));
    document.title = s.title + " – " + C.title;
    show(card);
  }

  /* ================= Fragen ================= */
  function modeText(q) {
    if (q.type === "single" || q.type === "photo") return "Eine Antwort wählen";
    if (q.type === "matrix") return "Pro Zeile eine Antwort wählen";
    if (q.type === "text") return "Freiwillig – du kannst dieses Feld leer lassen";
    if (q.maxSelect) return "Bis zu " + ({ 2: "zwei", 3: "drei" }[q.maxSelect] || q.maxSelect) + " Antworten wählen";
    return "Mehrere Antworten möglich – alle zutreffenden wählen";
  }
  function modeIcon(q) {
    var multi = q.type === "multi";
    var ns = "http://www.w3.org/2000/svg";
    var s = document.createElementNS(ns, "svg");
    s.setAttribute("viewBox", "0 0 20 20"); s.setAttribute("width", "18"); s.setAttribute("height", "18"); s.setAttribute("aria-hidden", "true");
    var shape = document.createElementNS(ns, multi ? "rect" : "circle");
    if (multi) { shape.setAttribute("x", "3"); shape.setAttribute("y", "3"); shape.setAttribute("width", "14"); shape.setAttribute("height", "14"); shape.setAttribute("rx", "3"); }
    else { shape.setAttribute("cx", "10"); shape.setAttribute("cy", "10"); shape.setAttribute("r", "7"); }
    shape.setAttribute("fill", "none"); shape.setAttribute("stroke", "currentColor"); shape.setAttribute("stroke-width", "2");
    s.appendChild(shape); return s;
  }

  function optionEl(kind, name, q, opt, idx, checked, onChange, extraClass) {
    var id = name + "-" + opt.id;
    var input = h("input", { type: kind, name: name, id: id, value: opt.id });
    input.checked = !!checked;
    input.addEventListener("change", onChange);
    var isDk = /^weiss_nicht/.test(opt.id) || opt.id === "keine";
    var label = h("label", { class: "option" + (checked ? " is-selected" : "") + (isDk && opt.id !== "keine" ? " is-dontknow" : "") + (extraClass ? " " + extraClass : ""), for: id, "data-kind": kind, "data-option": opt.id },
      input,
      h("span", { class: "marker", "aria-hidden": "true" }, svg(ICON_CHECK, 14)),
      idx !== null ? h("span", { class: "letter", "aria-hidden": "true", text: letter(idx) + ")" }) : null,
      h("span", { class: "text" }, opt.label, opt.hint ? h("span", { class: "hint", text: opt.hint }) : null));
    return label;
  }

  function renderQuestion(step, i) {
    updateChrome(step);
    var q = step.q;
    var a = answers()[q.id] || L.emptyAnswer(q);
    answers()[q.id] = a;
    var sec = sectionOf(q.section);
    var card = h("section", { class: "card screen" });
    var errId = "err-" + q.id, modeId = "mode-" + q.id, statusId = "status-" + q.id;

    card.appendChild(h("div", { class: "q-head" },
      h("p", { class: "eyebrow", text: sec.title }),
      h("h1", null, h("span", { class: "q-number", text: "Frage " + step.number + " von " + questions().length }), q.title)));

    if (q.type === "photo") {
      card.appendChild(h("p", { class: "orientation", text: sec.intro }));
      var img = h("img", { src: q.image.src, alt: q.image.alt, width: q.image.width, height: q.image.height, loading: "eager", decoding: "async" });
      var zoom = h("button", { type: "button", class: "btn btn--ghost photo__zoom", "aria-haspopup": "dialog" }, "Foto vergrössern");
      zoom.addEventListener("click", function () { openLightbox(q, zoom); });
      img.addEventListener("click", function () { openLightbox(q, zoom); });
      card.appendChild(h("figure", { class: "photo" },
        h("div", { class: "photo__frame" }, img, zoom),
        h("figcaption", null, h("strong", { text: q.title }), q.description ? " – " + q.description : "")));
    }

    var errorBox = h("div", { class: "error-box", id: errId, role: "alert" });
    var statusLine = h("p", { class: "status-line", id: statusId, "aria-live": "polite" });

    if (q.type === "single" || q.type === "photo" || q.type === "multi") {
      var kind = q.type === "multi" ? "checkbox" : "radio";
      var fs = h("fieldset", { "aria-describedby": modeId + " " + errId });
      fs.appendChild(h("legend", { class: "prompt", text: q.prompt }));
      fs.appendChild(h("p", { class: "mode", id: modeId }, modeIcon(q), modeText(q)));
      var list = h("div", { class: "options" });
      var otherBox = null;
      q.options.forEach(function (opt, idx) {
        var showLetter = q.section === "arbeitsalltag" ? null : idx;
        var lab = optionEl(kind, q.id, q, opt, showLetter, a.selected.indexOf(opt.id) !== -1, function (ev) {
          onSelect(q, opt.id, ev.target.checked, card, statusLine);
        });
        list.appendChild(lab);
        if (q.otherOption && opt.id === q.otherOption) {
          otherBox = buildOtherBox(q, a);
          list.appendChild(otherBox);
        }
      });
      fs.appendChild(list);
      card.appendChild(fs);
      card.appendChild(statusLine);
      if (otherBox) otherBox.hidden = a.selected.indexOf(q.otherOption) === -1;

      if (q.type === "photo") {
        var conf = h("fieldset", { class: "confidence", id: "conf-" + q.id, "aria-describedby": "confnote-" + q.id });
        conf.appendChild(h("legend", { text: q.confidencePrompt }));
        conf.appendChild(h("p", { class: "small muted", id: "confnote-" + q.id, text: q.confidenceNote }));
        var clist = h("div", { class: "options" });
        C.confidenceOptions.forEach(function (o) {
          clist.appendChild(optionEl("radio", q.id + "_sicherheit", q, o, null, a.confidence === o.id, function () {
            answers()[q.id].confidence = o.id; save(); syncClasses(conf); clearErrors(card);
          }));
        });
        conf.appendChild(clist);
        conf.hidden = !a.selected.length || a.selected[0] === "weiss_nicht";
        card.appendChild(conf);
      }
    } else if (q.type === "matrix") {
      card.appendChild(h("p", { class: "prompt", text: q.prompt }));
      card.appendChild(h("p", { class: "mode", id: modeId }, modeIcon(q), modeText(q)));
      q.rows.forEach(function (r, ri) {
        var fs2 = h("fieldset", { class: "matrix-group", id: "row-" + q.id + "-" + r.id, "aria-describedby": errId });
        fs2.appendChild(h("legend", { text: (ri + 1) + ". " + r.label }));
        var l2 = h("div", { class: "options" });
        q.options.forEach(function (o) {
          l2.appendChild(optionEl("radio", q.id + "_" + r.id, q, o, null, a.rows[r.id] === o.id, function () {
            answers()[q.id].rows[r.id] = o.id; save(); syncClasses(fs2);
            fs2.classList.remove("is-invalid"); clearErrors(card, true);
          }));
        });
        fs2.appendChild(l2);
        card.appendChild(fs2);
      });
    } else if (q.type === "text") {
      var taId = "text-" + q.id;
      var ta = h("textarea", { id: taId, maxlength: String(q.maxLength), "aria-describedby": "ph-" + q.id + " cnt-" + q.id + " " + errId, rows: "6" });
      ta.value = a.text || "";
      var cnt = h("p", { class: "counter", id: "cnt-" + q.id });
      var upd = function () { cnt.textContent = ta.value.length + " / " + q.maxLength + " Zeichen"; };
      ta.addEventListener("input", function () { answers()[q.id].text = ta.value; save(); upd(); });
      upd();
      card.appendChild(h("label", { for: taId, class: "prompt", style: "display:block;font-weight:650", text: q.prompt }));
      card.appendChild(h("p", { class: "mode", id: modeId }, svg(ICON_INFO), modeText(q)));
      card.appendChild(h("p", { class: "privacy-hint", id: "ph-" + q.id }, svg(ICON_INFO), C.privacyHint));
      card.appendChild(ta);
      card.appendChild(cnt);
    }

    card.appendChild(errorBox);

    var steps = buildSteps();
    var isLastBeforeReview = steps[i + 1] && steps[i + 1].kind === "review";
    var nextLabel = state.returnToReview ? "Zur Übersicht" : (isLastBeforeReview ? "Zur Übersicht" : "Weiter");
    card.appendChild(h("div", { class: "nav" },
      h("button", { type: "button", class: "btn btn--ghost", onclick: function () { state.returnToReview = false; go(i - 1); } }, "Zurück"),
      h("button", { type: "button", class: "btn btn--primary", onclick: function () {
        var errs = L.validateAnswer(q, answers()[q.id]);
        if (errs.length) { showErrors(card, q, errs); return; }
        if (state.returnToReview) { state.returnToReview = false; go(buildSteps().length - 1); }
        else go(i + 1);
      } }, nextLabel)));

    document.title = "Frage " + step.number + ": " + q.title + " – " + C.title;
    show(card);
  }

  function buildOtherBox(q, a) {
    var id = "other-" + q.id;
    var ta = h("textarea", { id: id, maxlength: String(q.otherMaxLength || 300), rows: "3", "aria-describedby": "otherhint-" + q.id + " othercnt-" + q.id });
    ta.value = a.otherText || "";
    var cnt = h("p", { class: "counter", id: "othercnt-" + q.id });
    var upd = function () { cnt.textContent = ta.value.length + " / " + (q.otherMaxLength || 300) + " Zeichen"; };
    ta.addEventListener("input", function () { answers()[q.id].otherText = ta.value; save(); upd(); });
    upd();
    return h("div", { class: "other-box", id: "otherbox-" + q.id },
      h("label", { for: id, text: "Anderes Hindernis – bitte kurz beschreiben" }),
      h("p", { class: "privacy-hint", id: "otherhint-" + q.id }, svg(ICON_INFO), C.privacyHint),
      ta, cnt);
  }

  function onSelect(q, optionId, checked, card, statusLine) {
    var res = L.applySelection(q, answers()[q.id], optionId, checked);
    answers()[q.id] = res.answer; save();
    // Eingabefelder mit dem Zustand abgleichen
    card.querySelectorAll('input[name="' + q.id + '"]').forEach(function (inp) {
      inp.checked = res.answer.selected.indexOf(inp.value) !== -1;
    });
    syncClasses(card);
    if (res.blocked) {
      var lab = card.querySelector('label[data-option="' + optionId + '"]');
      if (lab) { lab.classList.remove("is-blocked"); void lab.offsetWidth; lab.classList.add("is-blocked"); }
    }
    statusLine.textContent = res.message || "";
    if (q.otherOption) {
      var box = card.querySelector("#otherbox-" + q.id);
      var on = res.answer.selected.indexOf(q.otherOption) !== -1;
      if (box) {
        var wasHidden = box.hidden;
        box.hidden = !on;
        if (!on) { var t = box.querySelector("textarea"); if (t) { t.value = ""; } }
        if (on && wasHidden) { var t2 = box.querySelector("textarea"); if (t2) t2.dispatchEvent(new Event("input")); }
      }
    }
    if (q.type === "photo") {
      var conf = card.querySelector("#conf-" + q.id);
      var hide = res.answer.selected[0] === "weiss_nicht";
      conf.hidden = hide;
      if (hide) conf.querySelectorAll("input").forEach(function (x) { x.checked = false; });
      syncClasses(conf);
    }
    if (!res.blocked) clearErrors(card, true);
  }

  function syncClasses(scope) {
    scope.querySelectorAll("label.option").forEach(function (l) {
      var inp = l.querySelector("input");
      l.classList.toggle("is-selected", !!inp && inp.checked);
    });
  }

  function clearErrors(card, keepIfStillInvalid) {
    var box = card.querySelector(".error-box");
    if (!box || !box.classList.contains("is-visible")) return;
    if (keepIfStillInvalid) {
      var step = buildSteps()[state.stepIndex];
      if (step && step.q && L.validateAnswer(step.q, answers()[step.q.id]).length) {
        showErrors(card, step.q, L.validateAnswer(step.q, answers()[step.q.id]), true);
        return;
      }
    }
    box.classList.remove("is-visible"); box.textContent = "";
    card.querySelectorAll("[aria-invalid]").forEach(function (x) { x.removeAttribute("aria-invalid"); });
    card.querySelectorAll(".is-invalid").forEach(function (x) { x.classList.remove("is-invalid"); });
  }

  function showErrors(card, q, errs, silent) {
    var box = card.querySelector(".error-box");
    box.textContent = "";
    if (errs.length === 1) box.appendChild(document.createTextNode(errs[0].message));
    else { var ul = h("ul"); errs.forEach(function (e) { ul.appendChild(h("li", { text: e.message })); }); box.appendChild(ul); }
    box.classList.add("is-visible");
    card.querySelectorAll("[aria-invalid]").forEach(function (x) { x.removeAttribute("aria-invalid"); });
    card.querySelectorAll(".is-invalid").forEach(function (x) { x.classList.remove("is-invalid"); });
    var first = null;
    errs.forEach(function (e) {
      var target = null;
      if (e.field === "options") { target = card.querySelector('input[name="' + q.id + '"]'); card.querySelectorAll('input[name="' + q.id + '"]').forEach(function (x) { x.setAttribute("aria-invalid", "true"); }); }
      else if (e.field === "confidence") { target = card.querySelector('input[name="' + q.id + '_sicherheit"]'); }
      else if (e.field === "other") { target = card.querySelector("#other-" + q.id); if (target) target.setAttribute("aria-invalid", "true"); }
      else if (e.field === "text") { target = card.querySelector("#text-" + q.id); if (target) target.setAttribute("aria-invalid", "true"); }
      else if (e.field.indexOf("row:") === 0) {
        var rid = e.field.slice(4);
        var g = card.querySelector("#row-" + q.id + "-" + rid);
        if (g) { g.classList.add("is-invalid"); target = g.querySelector("input"); }
      }
      if (!first && target) first = target;
    });
    if (!silent && first) {
      first.focus();
      var lab = first.closest("fieldset") || first;
      if (lab.scrollIntoView) lab.scrollIntoView({ block: "center", behavior: "auto" });
    }
  }

  /* ---------------- Foto vergrössern ---------------- */
  var lightbox = document.getElementById("lightbox");
  var lastZoomBtn = null;
  function openLightbox(q, btn) {
    lastZoomBtn = btn;
    document.getElementById("lightbox-title").textContent = q.title;
    var im = document.getElementById("lightbox-img");
    im.src = q.image.src; im.alt = q.image.alt;
    if (typeof lightbox.showModal === "function") lightbox.showModal();
    else lightbox.setAttribute("open", "");
    document.getElementById("lightbox-close").focus();
  }
  function closeLightbox() {
    if (typeof lightbox.close === "function") lightbox.close(); else lightbox.removeAttribute("open");
  }
  document.getElementById("lightbox-close").addEventListener("click", closeLightbox);
  lightbox.addEventListener("click", function (e) { if (e.target === lightbox) closeLightbox(); });
  lightbox.addEventListener("close", function () { if (lastZoomBtn && document.body.contains(lastZoomBtn)) lastZoomBtn.focus(); });

  /* ================= Übersicht ================= */
  function renderReview(i) {
    var step = { kind: "review" };
    updateChrome(step);
    var card = h("section", { class: "card screen" });
    card.appendChild(h("h1", { text: state.mode === "practice" ? "Übersicht deiner Übung" : "Übersicht vor der Abgabe" }));
    card.appendChild(h("p", { class: "muted", text: state.mode === "practice"
      ? "Prüfe deine Antworten. Danach siehst du deine Lernrückmeldung. Nichts wird gespeichert."
      : "Prüfe deine Antworten. Mit «Ändern» kommst du direkt zur Frage zurück. Nach dem Absenden siehst du die Lösungen und Begründungen." }));

    var missing = [];
    var steps = buildSteps();
    if (state.mode === "survey") {
      var gi = 0;
      var hasGroup = !!groupLabel(state.group);
      if (!hasGroup) missing.push({ label: "Berufsgruppe", index: gi });
      card.appendChild(h("div", { class: "review-section" }, h("h2", { text: "Vor dem Start" }),
        h("ul", { class: "review-list" }, h("li", { class: "review-item" + (hasGroup ? "" : " is-missing") },
          h("div", null, h("h3", { text: "Berufsgruppe" }), h("ul", null, h("li", { text: hasGroup ? groupLabel(state.group) : "– noch offen –" }))),
          h("button", { type: "button", class: "btn btn--ghost", "aria-label": "Berufsgruppe ändern", onclick: function () { state.returnToReview = true; go(gi); } }, "Ändern")))));
    }
    activeSections().forEach(function (s) {
      var sec = h("div", { class: "review-section" }, h("h2", { text: s.title }));
      var ul = h("ul", { class: "review-list" });
      steps.forEach(function (st, si) {
        if (st.kind !== "question" || st.q.section !== s.id) return;
        var q = st.q;
        var errs = L.validateAnswer(q, answers()[q.id]);
        if (errs.length) missing.push({ label: "Frage " + st.number, index: si });
        var lines = L.summarize(q, answers()[q.id], C);
        var li = h("li", { class: "review-item" + (errs.length ? " is-missing" : "") },
          h("div", null,
            h("h3", { text: "Frage " + st.number + " · " + q.title }),
            h("ul", null, lines.map(function (l) { return h("li", { text: l }); }))),
          h("button", { type: "button", class: "btn btn--ghost", "aria-label": "Frage " + st.number + " ändern", onclick: function () { state.returnToReview = true; go(si); } }, "Ändern"));
        ul.appendChild(li);
      });
      sec.appendChild(ul);
      card.appendChild(sec);
    });

    // Unsichtbares Feld gegen einfache Bots (Menschen sehen und füllen es nicht)
    var hp = h("div", { "aria-hidden": "true", style: "position:absolute;left:-10000px;top:auto;width:1px;height:1px;overflow:hidden" },
      h("label", { for: "website", text: "Website (bitte leer lassen)" }),
      h("input", { type: "text", id: "website", name: "website", tabindex: "-1", autocomplete: "off" }));
    card.appendChild(hp);

    var statusBox = h("div", { id: "submit-status", role: "status", "aria-live": "polite" });
    card.appendChild(statusBox);

    if (missing.length) {
      card.appendChild(h("div", { class: "notice notice--danger", role: "note" },
        "Bitte beantworte noch: " + missing.map(function (m) { return m.label; }).join(", ") + "."));
    } else if (state.mode === "survey") {
      card.appendChild(h("p", { class: "small muted", text: "Nach dem Absenden kannst du die Antworten nicht mehr ändern." }));
    }

    var submitBtn = h("button", { type: "button", class: "btn btn--primary", id: "submit-btn" }, state.mode === "practice" ? "Übung auswerten" : "Antworten absenden");
    if (missing.length) submitBtn.setAttribute("aria-disabled", "true");
    submitBtn.addEventListener("click", function () {
      if (missing.length) { state.returnToReview = true; go(missing[0].index); return; }
      if (state.mode === "practice") { finishPractice(); return; }
      doSubmit(submitBtn, statusBox, hp.querySelector("input").value);
    });
    card.appendChild(h("div", { class: "nav" },
      h("button", { type: "button", class: "btn btn--ghost", onclick: function () { go(i - 1); } }, "Zurück"),
      submitBtn));
    document.title = "Übersicht – " + C.title;
    show(card);
  }

  /* ================= Abgabe ================= */
  var ERROR_TEXT = {
    VALIDATION: "Die Antworten wurden von der Speicherstelle nicht angenommen",
    VERSION: "Das Quiz wurde inzwischen aktualisiert. Bitte lade die Seite neu und fülle es erneut aus.",
    CLOSED: "Die Erhebung ist zurzeit geschlossen. Deine Antworten wurden nicht gespeichert.",
    RATE_LIMIT: "Zurzeit gehen sehr viele Abgaben ein. Bitte versuche es in einigen Minuten erneut. Deine Antworten bleiben erhalten.",
    CODE: "Der Erhebungscode ist nicht gültig. Bitte prüfe den Code auf der Einladung.",
    BUSY: "Die Speicherstelle ist gerade ausgelastet. Bitte versuche es gleich noch einmal. Deine Antworten bleiben erhalten.",
    SERVER: "Bei der Speicherung ist ein Fehler aufgetreten. Bitte versuche es erneut. Deine Antworten bleiben erhalten."
  };

  function setSubmitStatus(box, kind, msg, withRetry, btn, hpValue) {
    box.textContent = "";
    if (!kind) return;
    var cls = kind === "error" ? "notice notice--danger" : "notice";
    var n = h("div", { class: cls }, msg);
    if (withRetry) n.appendChild(h("p", { class: "small", style: "margin:.5rem 0 0" }, "Sobald die Verbindung wieder steht, kannst du mit «Erneut senden» noch einmal speichern. Es entsteht dabei kein doppelter Eintrag."));
    box.appendChild(n);
    if (btn && withRetry) btn.textContent = "Erneut senden";
  }

  function doSubmit(btn, box, hpValue) {
    if (submitting) return;
    if (!CFG.ENDPOINT_URL) {
      setSubmitStatus(box, "error", "Die Speicheradresse ist noch nicht eingerichtet (ENDPOINT_URL in assets/js/config.js). Deine Antworten wurden nicht gespeichert.");
      return;
    }
    submitting = true;
    if (!state.submissionId) { state.submissionId = L.uuid(); save(); }
    var qs = questions();
    var payload = {
      action: "submit",
      quizVersion: C.version,
      submissionId: state.submissionId,
      test: TEST_MODE,
      code: state.code || "",
      group: state.group || "",
      website: hpValue || "",
      answers: L.buildAnswersPayload(qs, answers())
    };
    btn.disabled = true;
    btn.textContent = "";
    btn.appendChild(h("span", { class: "spinner", "aria-hidden": "true" }));
    btn.appendChild(document.createTextNode("Wird gespeichert …"));
    setSubmitStatus(box, "info", "Deine Antworten werden gesendet. Bitte warte auf die Bestätigung.");

    var ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, CFG.REQUEST_TIMEOUT_MS || 30000);

    fetch(CFG.ENDPOINT_URL, {
      method: "POST",
      // text/plain = «einfache» Anfrage ohne CORS-Vorabprüfung; Apps Script liest den Text als JSON.
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
      redirect: "follow",
      credentials: "omit",
      cache: "no-store",
      signal: ctrl ? ctrl.signal : undefined
    }).then(function (res) {
      if (res.type === "opaque" || !res.ok) throw new Error("http");
      return res.text();
    }).then(function (txt) {
      var data;
      try { data = JSON.parse(txt); } catch (e) { throw new Error("parse"); }
      clearTimeout(timer);
      submitting = false;
      if (data && data.ok === true && data.saved === true && data.submissionId === payload.submissionId) {
        state.result = { feedback: data.feedback, score: data.score, savedAt: data.receivedAt || null, duplicate: !!data.duplicate, answers: JSON.parse(JSON.stringify(state.answers)) };
        var key = {};
        Object.keys(data.feedback || {}).forEach(function (k) {
          var f = data.feedback[k];
          key[k] = { scored: !!f.scored, correct: f.correct || [], explanation: f.explanation || [], reference: f.reference || null };
        });
        sSet("sessionStorage", KEY_FEEDBACK, key);
        sSet("localStorage", KEY_DONE, { at: new Date().toISOString().slice(0, 10) });
        state.stepIndex = -1;
        save();
        renderResult(true);
        return;
      }
      btn.disabled = false; btn.textContent = "Erneut senden";
      var code = data && data.code;
      var msg = ERROR_TEXT[code] || ERROR_TEXT.SERVER;
      if (code === "VALIDATION" && data.message) msg += ": " + data.message;
      if (code === "VERSION" || code === "CLOSED" || code === "CODE") setSubmitStatus(box, "error", msg);
      else setSubmitStatus(box, "error", msg, code !== "VALIDATION", btn);
      if (code === "VALIDATION") btn.textContent = "Erneut senden";
    }).catch(function (err) {
      clearTimeout(timer);
      submitting = false;
      btn.disabled = false;
      var msg = (err && err.name === "AbortError")
        ? "Die Speicherstelle hat nicht rechtzeitig geantwortet. Die Speicherung ist nicht bestätigt."
        : "Keine Verbindung zur Speicherstelle. Die Speicherung ist nicht bestätigt.";
      setSubmitStatus(box, "error", msg + " Deine Antworten sind auf diesem Gerät noch vorhanden.", true, btn);
    });
  }

  /* ================= Übung auswerten ================= */
  function finishPractice() {
    var key = sGet("sessionStorage", KEY_FEEDBACK) || {};
    var fb = {}, points = 0, max = 0, dk = 0;
    questions().forEach(function (q) {
      var k = key[q.id];
      if (!k) return;
      var r = L.scoreWithKey(q, answers()[q.id], k);
      fb[q.id] = { scored: k.scored, correct: k.correct, explanation: k.explanation, reference: k.reference, status: r.status };
      points += r.points; max += r.max; if (r.status === "weiss_nicht") dk++;
    });
    state.practiceResult = { feedback: fb, score: { points: points, max: max, dontKnow: dk }, answers: JSON.parse(JSON.stringify(state.answers)) };
    state.stepIndex = -1;
    save();
    renderResult(true);
  }

  /* ================= Rückmeldung ================= */
  var STATUS_LABEL = {
    richtig: "Richtig",
    falsch: "Lohnt sich anzuschauen",
    weiss_nicht: "«Ich weiss es nicht»",
    unbewertet: "Schätzaufgabe · nicht bewertet"
  };

  function renderResult(fresh) {
    var practice = state.mode === "practice";
    var res = practice ? state.practiceResult : state.result;
    if (!res) { renderStart(); return; }
    updateChrome(null);
    document.getElementById("practice-banner").hidden = !practice;
    var card = h("section", { class: "card screen result-hero" });
    if (practice) {
      card.appendChild(h("div", { class: "notice" }, h("strong", { text: "Übungsdurchlauf – nicht gespeichert." }), " Diese Antworten wurden nicht übermittelt."));
    } else {
      card.appendChild(h("div", { class: "saved", role: "status" }, svg(ICON_CHECK, 22), "Erfolgreich gespeichert. Danke für deine Teilnahme!"));
    }
    card.appendChild(h("h1", { text: "Deine Lernrückmeldung" }));
    card.appendChild(h("p", { class: "muted", text: "Hier siehst du zu jeder Frage deine Antwort und die fachliche Begründung. Fragen, bei denen sich ein zweiter Blick lohnt, sind bereits aufgeklappt." }));

    var s = res.score || { points: 0, max: 0, dontKnow: 0 };
    card.appendChild(h("div", { class: "scorecard", "aria-label": "Punkte" },
      h("span", null, "Bewertete Fragen richtig: ", h("strong", { text: s.points + " von " + s.max })),
      h("span", null, "«Ich weiss es nicht»: ", h("strong", { text: String(s.dontKnow || 0) })),
      h("span", { class: "small", text: "Die Punkte dienen nur deiner Orientierung." })));

    var qs = L.getQuestions(C, practice ? "practice" : "survey");
    var lastSec = null, number = 0;
    var ans = res.answers || answers();
    qs.forEach(function (q) {
      number++;
      var f = res.feedback && res.feedback[q.id];
      if (q.section !== lastSec) {
        lastSec = q.section;
        card.appendChild(h("h2", { style: "margin-top:1.4rem", text: sectionOf(q.section).title }));
        if (q.section === "arbeitsalltag") {
          card.appendChild(h("p", { text: "Danke für deine Angaben zum Arbeitsalltag. Sie werden nicht bewertet und fliessen gesammelt in die Schulungsplanung ein." }));
        }
      }
      if (!f) return;
      card.appendChild(feedbackItem(q, number, ans[q.id], f));
    });

    card.appendChild(h("div", { class: "nav" },
      h("button", { type: "button", class: "btn btn--ghost", onclick: function () {
        if (practice) { state.mode = "survey"; state.answers = {}; save(); }
        state.stepIndex = -1; save(); renderStart();
      } }, "Zur Startseite"),
      h("button", { type: "button", class: "btn btn--primary", onclick: startPractice }, practice ? "Nochmals üben" : "Übungsdurchlauf starten")));
    card.appendChild(h("p", { class: "small muted", text: "Ein Übungsdurchlauf umfasst die Fragen 1–13 und wird nicht gespeichert." }));
    if (!practice) card.appendChild(newPersonButton());
    document.title = "Lernrückmeldung – " + C.title;
    show(card, fresh ? card.querySelector(".saved, .notice") || card.querySelector("h1") : null);
  }

  function feedbackItem(q, number, a, f) {
    var status = f.status || "unbewertet";
    var det = h("details", { class: "fb" });
    if (status === "falsch" || status === "weiss_nicht" || q.type === "photo") det.open = true;
    det.appendChild(h("summary", null,
      h("span", { class: "sum-main" },
        h("span", { class: "t", text: number + ". " + q.title }),
        h("span", { class: "chip chip--" + status, text: STATUS_LABEL[status] || status })),
      h("span", { class: "chev" }, svg(ICON_CHEV))));
    var body = h("div", { class: "body" });
    var sel = (a && a.selected) || [];
    var ul = h("ul", { class: "optlist" });
    q.options.forEach(function (o, idx) {
      var mine = sel.indexOf(o.id) !== -1;
      var correct = f.scored && (f.correct || []).indexOf(o.id) !== -1;
      if (/^weiss_nicht/.test(o.id) && !mine) return;
      var tags = h("span", { class: "tags" });
      if (mine) tags.appendChild(h("span", { class: "tag tag--mine", text: "Deine Wahl" }));
      if (correct) tags.appendChild(h("span", { class: "tag tag--correct", text: "Zutreffend" }));
      ul.appendChild(h("li", null, h("strong", { text: letter(idx) + ")" }), h("span", { text: o.label }), tags));
    });
    body.appendChild(h("h4", { text: q.type === "photo" ? "Deine Einschätzung" : (q.type === "multi" ? "Antwortmöglichkeiten" : "Antworten") }));
    body.appendChild(ul);
    if (q.type === "photo" && a && a.confidence) {
      var c = C.confidenceOptions.filter(function (o) { return o.id === a.confidence; })[0];
      body.appendChild(h("p", { class: "small", style: "margin:.5rem 0 0" }, "Deine Sicherheit: ", h("strong", { text: c ? c.label : a.confidence })));
    }
    if (f.reference && f.reference.text) {
      body.appendChild(h("p", { class: "small", style: "margin:.6rem 0 0" }, h("strong", { text: "Vergleichswert: " }), f.reference.text));
    }
    var ex = h("div", { class: "explanation" });
    (f.explanation || []).forEach(function (p) { ex.appendChild(h("p", { text: p })); });
    if ((f.explanation || []).length) { body.appendChild(h("h4", { text: "Begründung" })); body.appendChild(ex); }
    det.appendChild(body);
    return det;
  }

  /* ---------------- Start ---------------- */
  if (state.stepIndex >= 0) {
    go(state.stepIndex);
  } else if (state.mode === "practice" && state.practiceResult) {
    renderResult();
  } else {
    renderStart();
  }
})();
