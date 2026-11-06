# Einrichtung Schritt für Schritt

Für Nichtprogrammierende. Dauer: etwa 45 Minuten. Du brauchst ein Google-Konto und ein GitHub-Konto.

> **Vorab klären:** Die Antworten liegen in einem Google-Konto, die Quizseite liegt bei GitHub. Kläre mit der zuständigen Stelle in deiner Institution (z. B. Datenschutz, Informatik), ob diese Dienste für eine interne Mitarbeitendenbefragung genutzt werden dürfen. Verwende wenn möglich ein Google-Konto der Institution statt eines privaten Kontos. Ich habe keine institutionelle Freigabe vorausgesetzt.

Die Menübezeichnungen von Google und GitHub ändern sich gelegentlich leicht. Die Schritte gelten sinngemäss.

---

## Teil A – Google-Tabelle und Schnittstelle

### A1. Tabelle anlegen
1. Öffne <https://sheets.google.com> und erstelle eine **leere Tabelle**.
2. Gib ihr einen Namen, z. B. `Ernährungsquiz – Antworten`.
3. **Nicht freigeben.** Die Tabelle bleibt privat. Teilnehmende brauchen keinen Zugriff.

### A2. Skript einfügen
1. In der Tabelle: **Erweiterungen → Apps Script**. Ein neues Fenster öffnet sich.
2. Links unter «Dateien» siehst du `Code.gs`. Klicke darauf, lösche den vorhandenen Inhalt und füge den **gesamten** Inhalt von `apps-script/Code.gs` ein.
3. Klicke auf **＋ (Datei hinzufügen) → Skript**, nenne die Datei `Quiz` (ohne `.gs`) und füge den Inhalt von `apps-script/Quiz.gs` ein.
4. Ebenso eine Datei `Setup` mit dem Inhalt von `apps-script/Setup.gs`.
5. Klicke auf das **Speichern-Symbol** (💾).
6. Links auf **Projekteinstellungen (⚙)**: Zeitzone **(GMT+01:00) Zürich** wählen.

### A3. Tabelle einrichten
1. Wähle oben in der Funktionsauswahl **`einrichten`** und klicke **Ausführen**.
2. Beim ersten Mal fragt Google nach einer Berechtigung:
   **Berechtigungen überprüfen → dein Konto wählen**. Erscheint «Google hat diese App nicht überprüft», klicke auf **Erweitert → Zu «…» wechseln (unsicher)** und dann **Zulassen**.
   *Das ist dein eigenes Skript. Es fordert nur Zugriff auf diese eine Tabelle an (`@OnlyCurrentDoc`).*
3. Wechsle zurück zur Tabelle. Dort gibt es jetzt diese Blätter: **Dashboard, Einstellungen, Teilnahmen, Antworten, Optionen, Freitexte, Auswertung Wissen, Auswertung Fotos, Praxis und Schulungsbedarf, Auswertung Berufsgruppen**.
4. Lade die Tabelle neu (F5). Oben erscheint das Menü **Ernährungsquiz**.
5. Prüfung: **Ernährungsquiz → Selbsttest: Testabgabe speichern**. Die Meldung muss «Selbsttest erfolgreich» und «Wiederholung erkannt: JA» enthalten. In «Teilnahmen» steht eine Zeile mit *Testdaten = JA*. Sie erscheint nicht in der Auswertung.

### A4. Schnittstelle bereitstellen (Web-App)
1. Im Apps-Script-Fenster: **Bereitstellen → Neue Bereitstellung**.
2. Bei «Typ auswählen» auf das **Zahnrad ⚙ → Web-App**.
3. Einstellungen:
   - Beschreibung: `Ernährungsquiz v1`
   - **Ausführen als: Ich (deine E-Mail-Adresse)**
   - **Zugriff: Jeder** (nicht «Jeder mit Google-Konto», sonst müssten sich Teilnehmende anmelden und die Übertragung scheitert)
4. **Bereitstellen** und gegebenenfalls erneut **Zugriff autorisieren**.
5. Kopiere die **Web-App-URL**. Sie endet auf **`/exec`**. Bewahre sie auf.
6. Verbindungstest: Öffne im Browser `DEINE-URL?action=ping`. Erwartet wird etwa:
   `{"ok":true,"service":"ernaehrungsquiz","quizVersion":"2026-11-v1","open":true}`

> **Wichtig bei späteren Änderungen am Skript:** Gespeicherter Code wird erst wirksam, wenn du ihn neu bereitstellst: **Bereitstellen → Bereitstellungen verwalten → ✏ (Bearbeiten) → Version: Neue Version → Bereitstellen**. Die URL bleibt dabei gleich. Wählst du stattdessen «Neue Bereitstellung», entsteht eine neue URL.

> **Hinweis Google Workspace:** In manchen Organisationskonten hat die Administration «Zugriff: Jeder» gesperrt. Fehlt diese Auswahl, bitte die Informatik um Freigabe oder verwende ein anderes Konto.

---

## Teil B – GitHub-Repository und Veröffentlichung

### B1. Entscheid: Wo liegt der Lösungsschlüssel?
GitHub Pages ist mit dem kostenlosen GitHub-Plan nur für **öffentliche** Repositories verfügbar. Alles im Repository ist dann für alle lesbar, auch `apps-script/Quiz.gs` mit Lösungen und Begründungen.

| Variante | Vorgehen | Folge |
|---|---|---|
| **1 – empfohlen** | Öffentliches Repository **ohne** den Ordner `apps-script`. Diesen Ordner zusätzlich in ein zweites, **privates** Repository legen (z. B. `ernaehrungsquiz-schnittstelle`). Private Repositories sind auch im Gratisplan möglich. | Lösungen nicht öffentlich. Zwei Repositories pflegen. |
| 2 – einfachste | Alles in ein öffentliches Repository. | Wer das Repository auf GitHub findet, kann die Lösungen lesen. |
| 3 – mit GitHub Pro/Team/Enterprise | Ein **privates** Repository mit Pages. | Lösungen nicht öffentlich. Die Quizseite ist trotzdem öffentlich erreichbar. |

Die Anleitung unten beschreibt Variante 1. Für Variante 2 oder 3 lädst du einfach alles in ein Repository hoch.

### B2. Konto und Repository
1. Konto anlegen auf <https://github.com> (falls noch keines vorhanden).
2. Oben rechts **＋ → New repository**.
3. Repository name: `ernaehrungsquiz` (wird Teil der Adresse) · **Public** · **Create repository**.

### B3. Dateien hochladen (Webbrowser, ohne Programme)
1. Im neuen Repository auf **uploading an existing file** (bzw. **Add file → Upload files**).
2. Entpacke die ZIP-Datei auf deinem Computer. Ziehe **den Inhalt** des Ordners `ernaehrungsquiz` (nicht den Ordner selbst) in das Upload-Feld: `index.html`, `datenschutz.html`, `README.md`, die Ordner `assets`, `docs`, `tests`, `.github` und die Datei `.nojekyll`. **Nicht** den Ordner `apps-script` (Variante 1).
   - Unter macOS sind `.github` und `.nojekyll` im Finder versteckt. Mit **⌘ + Shift + .** blendest du sie ein. `.nojekyll` ist optional. Fehlt `.github`, laufen die automatischen Tests nicht. Das Quiz funktioniert trotzdem.
3. Unten «Commit changes» → **Commit changes**.
4. Prüfe, dass `index.html` direkt auf der obersten Ebene liegt (nicht in einem Unterordner).
5. Für Variante 1: zweites Repository `ernaehrungsquiz-schnittstelle` als **Private** anlegen und dort den Ordner `apps-script` hochladen. Lade am besten auch `tests` und `assets/js` hoch, damit die vollständigen Tests laufen.

### B4. Schnittstellen-Adresse eintragen
1. Im öffentlichen Repository: `assets/js/config.js` öffnen → **✏ (Edit this file)**.
2. Zwischen die Anführungszeichen bei `ENDPOINT_URL: ""` die Web-App-URL aus A4 einfügen:
   `ENDPOINT_URL: "https://script.google.com/macros/s/AKfy…/exec",`
3. **Commit changes**.

### B5. GitHub Pages einschalten
1. Im Repository: **Settings → Pages**.
2. **Source: Deploy from a branch** · Branch: **main** · Ordner: **/ (root)** → **Save**.
3. Nach ein bis drei Minuten erscheint oben «Your site is live at …». Die Adresse lautet
   `https://DEIN-BENUTZERNAME.github.io/ernaehrungsquiz/`
4. Unter **Actions** siehst du den Test-Durchlauf (grüner Haken = in Ordnung).

---

## Teil C – Vor dem Start

1. **Datenschutzhinweis** anpassen: `datenschutz.html` öffnen → ✏ → gelb markierte Platzhalter `[ … ]` ersetzen → Commit.
2. **Testdurchlauf** gemäss [TESTANLEITUNG.md](TESTANLEITUNG.md), Teil B (mit `?test=1`).
3. **Testdaten löschen:** Tabelle → Menü **Ernährungsquiz → Testdaten löschen**.
4. **Einladung** an die Mitarbeitenden mit der Pages-Adresse (ohne `?test=1`), z. B. als QR-Code.
5. Optional **Erhebungscode**: Im Blatt «Einstellungen» einen Code eintragen (z. B. `KAFI26`) und in `config.js` `SURVEY_CODE_REQUIRED: true` setzen. Der Code kann im Link mitgegeben werden: `…/ernaehrungsquiz/?code=KAFI26`. Er ist **kein Passwort**, er hält nur zufällige automatisierte Abgaben fern.
6. Bei grossen Gruppen, die gleichzeitig ausfüllen: in «Einstellungen» die Grenze «Max. neue Abgaben pro 10 Minuten» (Standard 60) erhöhen.
7. **Berufsgruppen:** Teilnehmende wählen ihre Berufsgruppe vor Frage 1. Im Blatt «Einstellungen» legst du die *Mindestgrösse je Berufsgruppe* fest (Standard 5). Kleinere Gruppen werden in der Auswertung mit «–» ausgeblendet.

## Teil D – Während und nach der Erhebung

- **Dashboard** und Auswertungsblätter aktualisieren sich automatisch bei jeder neuen Abgabe.
- **Nach Berufsgruppe auswerten:** «Einstellungen» → *Ausgewertete Berufsgruppe* auswählen (z. B. «Hotellerie»). Dann zeigen «Auswertung Wissen», «Auswertung Fotos», «Praxis und Schulungsbedarf» und das Dashboard nur diese Gruppe. Bei zu wenigen Teilnahmen erscheint oben ein roter Warnhinweis. Für den Vergleich aller Gruppen nebeneinander gibt es das Blatt **«Auswertung Berufsgruppen»**: Teilnahmen, Ø Anteil richtig, Unsicherheit je Frage, Orientierung im Betrieb und Hindernisse je Gruppe. Zurück auf «Alle» stellen, wenn du fertig bist.
- **Erhebung schliessen:** «Einstellungen» → *Erhebung offen* = `NEIN`. Abgaben werden dann abgelehnt und die Teilnehmenden sehen eine klare Meldung.
- **Freitexte** stehen im Blatt «Freitexte» und gesammelt unter «Praxis und Schulungsbedarf». Sie werden nirgends automatisch veröffentlicht.
- **Aufbewahrung:** Daten nach der im Datenschutzhinweis genannten Frist löschen (Zeilen in den Rohdatenblättern löschen oder Tabelle löschen).
