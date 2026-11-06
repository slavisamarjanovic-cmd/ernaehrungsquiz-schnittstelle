# Testanleitung

## Teil A – Bereits durchgeführt (bei der Erstellung)

Diese Tests liefen in einer Linux-Umgebung **ohne** Zugang zu deinem Google- oder GitHub-Konto. Google Sheets und Apps Script wurden dabei **nachgebildet** (`tests/gas-mock.js`), die Weiterleitung von Apps Script mit einem lokalen Server (`tests/mock-server.js`).

| Test | Werkzeug | Ergebnis |
|---|---|---|
| Frontend ↔ Schnittstelle: Version, Berufsgruppen, Frage-/Options-IDs, Regeln, 16 Fragen, Struktur, keine entfernten Fotoaufgaben, keine Lösungen im öffentlichen Inhalt | `node tests/run-tests.js` | bestanden |
| Antwortlogik: Exklusivität «Ich weiss es nicht» (8–11), max. 3 und «Keine» exklusiv (15), «Andere» mit Pflichttext, Sicherheit bei Fotos, Frage 14 je Zeile, Frage 16 freiwillig | `run-tests.js` | bestanden |
| Schnittstelle (echter Code.gs gegen Nachbildung): Punkte nur serverseitig, Mehrfachauswahl nur vollständig richtig, keine Minuspunkte, «Ich weiss es nicht» gesondert, max. 11, Fotos unbewertet, Aktivierung über Konfiguration (dann 12) | `run-tests.js` | bestanden |
| Über 25 Arten ungültiger Abgaben werden abgelehnt (falsche Version, IDs, Optionen, Grenzen, Textlängen, Bot-Feld, übergrosse Anfrage, behauptete Punktzahl usw.) | `run-tests.js` | bestanden |
| Doppelte Abgabe-ID, Reste abgebrochener Schreibvorgänge, belegte Sperre, 25 Abgaben in Folge | `run-tests.js` | bestanden |
| Formelschutz im Freitext (auch nach «Testdaten löschen»), Testdaten-Kennzeichnung und -Löschung, Erhebung geschlossen, Erhebungscode, Ratenbegrenzung, Verbindungstest; Berufsgruppe Pflicht, nur bekannte Gruppen, in Teilnahmen/Antworten/Optionen gespeichert, nicht bei Freitexten | `run-tests.js` | bestanden (309 Prüfungen) |
| Auswertungsformeln (Zählungen, Anteile, Optionsanalyse mit Nenner ohne «Ich weiss es nicht», Fotokreuztabellen, Frage 14/15, Dashboard-Bezüge, Ausschluss Testdaten und andere Version, Berufsgruppenfilter, Vergleich der Berufsgruppen, Ausblendung kleiner Gruppen, Warnhinweis) mit 69 Zufallsabgaben, berechnet durch **LibreOffice**, verglichen mit unabhängiger Nachrechnung | `tests/formula-check.py` | 365 von 365 bestanden |
| Browser (Chromium): Berufsgruppe vor dem Start (Pflicht, änderbar in der Übersicht), ganzer Ablauf, Tastatur, Fokus, Fehlermeldungen, Zurück/Weiter, Foto-Vergrösserung, Übersicht/Ändern, Doppelklick, Rückmeldung, Übungsdurchlauf ohne Speicherung, Weiterleitung POST→302→GET über verschiedene Herkünfte | `tests/e2e.py` | bestanden |
| Verbindungsfehler: Server nicht erreichbar / Antwort nach dem Speichern verloren / Antwort ohne CORS unlesbar → kein «Erfolgreich gespeichert», Antworten bleiben, «Erneut senden» erzeugt keinen zweiten Datensatz | `e2e.py` | bestanden |
| Smartphone 390 px und Tablet 820 px: kein seitliches Scrollen, Antwortflächen ≥ 48 px, Schrift ≥ 16 px; reduzierte Bewegung | `e2e.py` | bestanden (134 Prüfungen) |
| Barrierefreiheit (axe-core, WCAG 2.1 AA) auf Start, Berufsgruppe (auch mit Fehlermeldung), Fehlermeldung, Foto, Frage 14, Frage 15, Übersicht; Farbkontraste berechnet | axe-core | keine Befunde |

**Nicht** prüfbar ohne deine Konten: echtes Google Sheets (u. a. die Funktionen `FILTER` und `SORT`, Diagramme, Schutz, Menü), die echte Apps-Script-Weiterleitung, Berechtigungen, Quoten und tatsächlich gleichzeitige Ausführungen bei Google sowie GitHub Pages. Dafür ist Teil B da.

Tests selbst ausführen (optional, braucht Node.js): `node tests/run-tests.js`. Für Formel- und Browsertests zusätzlich Python mit `openpyxl`, `playwright` und LibreOffice.

---

## Teil B – Nach der Einrichtung in deinen Konten (etwa 30 Minuten)

Verwende für B1 bis B8 die Testadresse **`…/ernaehrungsquiz/?test=1`**. Oben erscheint ein gelber Testmodus-Hinweis.

### B1. Schnittstelle
- [ ] `WEB-APP-URL?action=ping` zeigt `"ok":true` und die richtige `quizVersion`.
- [ ] Tabelle → **Ernährungsquiz → Selbsttest** meldet «erfolgreich» und «Wiederholung erkannt: JA».

### B2. Vollständiger Durchlauf am Computer
- [ ] Nach «Quiz starten» erscheint die Berufsgruppe. Ohne Auswahl kein «Weiter».
- [ ] Startseite, drei Abschnitte, «Frage X von 16», eine Frage pro Bildschirm.
- [ ] Ohne Auswahl «Weiter» → rote, verständliche Meldung.
- [ ] Frage 8: A und C wählen, dann «Ich weiss es nicht» → A und C werden abgewählt; danach D wählen → «Ich weiss es nicht» wird abgewählt.
- [ ] Frage 12: «Foto vergrössern» öffnet das Foto, Escape schliesst es. Ohne Sicherheitsangabe kein «Weiter».
- [ ] Frage 13: «Ich kann das nicht einschätzen» → Sicherheitsfrage verschwindet.
- [ ] Frage 14: vier getrennte Gruppen. Ohne alle vier → Meldung nennt die fehlenden.
- [ ] Frage 15: Nach drei Antworten lässt sich keine vierte wählen (Hinweis erscheint). «Keine wesentlichen Hindernisse» wählt alle anderen ab. «Andere Hindernisse» öffnet ein Textfeld, das ausgefüllt werden muss.
- [ ] Zurück bis Frage 3 und wieder vor: Antworten sind erhalten.
- [ ] Übersicht: «Ändern» springt zur Frage, «Zur Übersicht» zurück.
- [ ] Bis zur Abgabe keine Lösungen oder Hinweise auf richtige Antworten sichtbar.

### B3. Speicherung und Punkte
- [ ] «Antworten absenden» **doppelt** anklicken → «Erfolgreich gespeichert».
- [ ] Tabelle «Teilnahmen»: **genau eine** neue Zeile, *Testdaten = JA*, Eingang mit aktueller Uhrzeit (Zürich), gewählte Berufsgruppe in der letzten Spalte.
- [ ] Punkte nachrechnen mit den Lösungen in `apps-script/Quiz.gs` (Eintrag `correct` je Frage; privates Repository). Mehrfachauswahl zählt nur bei exakt dieser Auswahl. Max. Punkte = 11.
- [ ] «Antworten»: Frage 12 und 13 mit Status *unbewertet* und Sicherheit; Frage 14 in vier Zeilen (Teil-ID).
- [ ] «Freitexte»: Gib in Frage 16 `=1+1` ein. In der Tabelle muss `=1+1` als Text stehen, nicht `2`.

### B4. Rückmeldung und Übung
- [ ] Rückmeldung zeigt deine Antworten, die zutreffenden Antworten und die Begründungen. Frage 13 erklärt den Vergleichswert ausdrücklich als Schätzung, ohne richtig/falsch.
- [ ] «Übungsdurchlauf starten» (Fragen 1–13) → «Übung auswerten» → **keine** neue Zeile in «Teilnahmen».

### B5. Verbindungsfehler
- [ ] Neuer Durchlauf bis zur Übersicht. Dann WLAN/Mobilfunk ausschalten (oder Flugmodus) → «Antworten absenden» → Meldung «nicht bestätigt», Knopf «Erneut senden», **kein** «Erfolgreich gespeichert».
- [ ] Verbindung wieder einschalten → «Erneut senden» → «Erfolgreich gespeichert» → in «Teilnahmen» **eine** neue Zeile.

### B6. Smartphone und Tablet
- [ ] Mit dem eigenen Smartphone (Hoch- und Querformat): gut lesbar, nichts abgeschnitten, kein seitliches Scrollen, Fotos vergrösserbar, Frage 14 als vier Gruppen.

### B7. Auswertung
- [ ] Testabgaben erscheinen **nicht** in «Auswertung Wissen» (dort steht «Testdaten (ausgeschlossen): n»).
- [ ] Zur Kontrolle der Formeln: eine Abgabe **ohne** `?test=1` machen → Zählungen in «Auswertung Wissen», «Auswertung Fotos», «Praxis und Schulungsbedarf» und die Diagramme im «Dashboard» erhöhen sich. Die Freitextliste zeigt den Text. Danach diese Zeile manuell löschen (Rohdatenblätter, gleiche Abgabe-ID) oder im Blatt «Teilnahmen» etc. die Spalte Testdaten auf `JA` setzen und **Testdaten löschen** ausführen.

### B8. Einstellungen
- [ ] Mit echten (Nicht-Test-)Abgaben: *Ausgewertete Berufsgruppe* auf eine Gruppe stellen → Zahlen und Diagramme ändern sich; bei weniger als 5 Teilnahmen erscheint der rote Warnhinweis. Danach wieder «Alle».
- [ ] Blatt «Auswertung Berufsgruppen»: Gruppen unter der Mindestgrösse zeigen «–».
- [ ] «Einstellungen» → *Erhebung offen* = `NEIN` → normale Abgabe (ohne `?test=1`) wird mit «Erhebung geschlossen» abgelehnt. Wieder `JA` setzen.
- [ ] Falls Erhebungscode genutzt: falscher Code → klare Meldung. Richtiger Code → gespeichert.

### B9. Abschluss
- [ ] **Ernährungsquiz → Testdaten löschen**.
- [ ] Datenschutzhinweis: alle Platzhalter ersetzt.
