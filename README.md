# Ernährung im Alter – Quiz

Interaktives Online-Quiz für Mitarbeitende in der Langzeitpflege. Es erfasst den Wissensstand, gibt nach der Abgabe eine Lernrückmeldung und liefert eine automatische Auswertung in einer privaten Google-Tabelle für die Schulungsplanung. Es dient **keiner** individuellen Leistungsbeurteilung.

- **Einrichtung Schritt für Schritt:** [docs/EINRICHTUNG.md](docs/EINRICHTUNG.md)
- **Fragen, Bilder, Lösungen ändern:** [docs/AKTUALISIEREN.md](docs/AKTUALISIEREN.md)
- **Testanleitung:** [docs/TESTANLEITUNG.md](docs/TESTANLEITUNG.md)
- **Datenschutzhinweis (Vorlage mit Platzhaltern):** [datenschutz.html](datenschutz.html)

## Architektur in Kürze

```
Browser (Smartphone/PC)                    Google (dein Konto)
┌─────────────────────────┐   POST (JSON)  ┌──────────────────────────────┐
│ Quizseite auf           │ ─────────────► │ Apps Script Web-App          │
│ GitHub Pages (statisch) │   302 → GET    │  • prüft jede Abgabe         │
│  • Fragen, Fotos        │ ◄───────────── │  • berechnet Punkte          │
│  • Antwortlogik         │  Bestätigung   │  • verhindert Doppeleinträge │
│  • Rückmeldung          │  + Begründung  │  • schreibt in die Tabelle   │
└─────────────────────────┘                └──────────────┬───────────────┘
                                                          ▼
                                           Private Google-Tabelle
                                           Rohdaten · Auswertungen · Dashboard
```

- **GitHub Pages** liefert nur statische Dateien (HTML, CSS, JavaScript, Fotos). Es gibt dort keine Zugangsdaten.
- **Google Apps Script** ist an die private Tabelle gebunden, läuft unter deinem Konto («Ausführen als: Ich») und ist für alle erreichbar («Zugriff: Jeder»). Die Tabelle selbst bleibt privat.
- **Übertragung:** Der Browser sendet die Antworten im Anfragetext (`Content-Type: text/plain`, damit keine CORS-Vorabanfrage nötig ist), nie über URL-Parameter. Apps Script leitet die Antwort laut Dokumentation auf eine einmalige Adresse unter `script.googleusercontent.com` weiter; der Browser folgt automatisch und liest die JSON-Bestätigung. «Erfolgreich gespeichert» erscheint erst, wenn diese Bestätigung lesbar ist, `saved: true` enthält und die gesendete Abgabe-ID zurückmeldet.
- **Lösungsschlüssel und Begründungen** liegen nur in `apps-script/Quiz.gs`. Der Browser erhält sie erst nach bestätigter Speicherung. Die Punkte werden ausschliesslich auf dem Server berechnet.
- **Doppelte Abgaben:** Jede Abgabe hat eine zufällige ID. Ein Doppelklick oder ein erneutes Senden nach einem Verbindungsfehler erzeugt keinen zweiten Datensatz. Gleichzeitige Abgaben werden über eine Sperre (`LockService`) nacheinander geschrieben.
- **Missbrauchsschutz:** strenge Prüfung aller Werte, Grössenlimit, unsichtbares Bot-Feld, Obergrenze neuer Abgaben pro 10 Minuten, optionaler Erhebungscode, Erhebung schliessbar. Ein im Browser sichtbarer Wert ist kein Geheimnis. Die Quizseite ist öffentlich erreichbar und **nicht** zugriffsgeschützt.

## Projektstruktur

```
ernaehrungsquiz/
├── index.html                  Quizseite
├── datenschutz.html            Datenschutzhinweis (Vorlage)
├── .nojekyll                   GitHub Pages: Dateien unverändert ausliefern
├── assets/
│   ├── css/style.css           Gestaltung
│   ├── img/
│   │   ├── frage12-vegi-spaetzlipfanne.jpg   Foto aus dem Word-Dokument
│   │   └── frage13-kalbsadrio.jpg            Foto aus dem Word-Dokument
│   └── js/
│       ├── config.js           ► Adresse der Schnittstelle, Erhebungscode an/aus
│       ├── quiz-content.js     ► Alle sichtbaren Texte, Berufsgruppen, Fragen, Optionen, Fotos
│       ├── logic.js            Antwortregeln (Exklusivität, Grenzen, Prüfung)
│       └── app.js              Ablauf und Darstellung
├── apps-script/                → in das Apps-Script-Projekt der Tabelle kopieren
│   ├── Quiz.gs                 ► Version, Berufsgruppen, IDs, Regeln, Lösungsschlüssel, Begründungen
│   ├── Code.gs                 Schnittstelle (Prüfen, Bewerten, Speichern)
│   ├── Setup.gs                Tabellenblätter, Auswertung, Dashboard, Menü
│   └── appsscript.json         Manifest (optional, Zeitzone/Web-App)
├── tests/
│   ├── run-tests.js            Logik- und Schnittstellentests (node)
│   ├── gas-mock.js             Nachbildung von Google Sheets für die Tests
│   ├── export-for-formula-check.js + formula-check.py   Formelprüfung (LibreOffice)
│   ├── mock-server.js + e2e.py Browsertest mit nachgebildeter Weiterleitung
├── .github/workflows/tests.yml Automatische Tests bei jeder Änderung
└── docs/                       Anleitungen
```

► = Dateien, die du für Anpassungen brauchst.

## Datensparsamkeit

Gespeichert werden nur: Abgabe-ID (zufällig), Quizversion, serverseitiger Eingangszeitpunkt, Testkennzeichen, Berufsgruppe, gewählte Options-IDs, Antwortsicherheit, Punkte und freiwillige Freitexte. Freitexte werden ohne Berufsgruppe gespeichert. Ergebnisse einer Berufsgruppe erscheinen erst ab einer Mindestzahl Teilnahmen (Standard 5). Keine Namen, E-Mail-Adressen, Personalnummern, Bewohnerdaten oder IP-Adressen; kein Tracking, keine externen Schriften oder Dienste. Technische Protokolle von GitHub (IP-Adressen der Besuchenden) und Google sind davon getrennt zu betrachten (siehe `datenschutz.html`).
