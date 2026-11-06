# Fragen, Bilder und Lösungen aktualisieren

Grundregel: **Sichtbare Texte** stehen in `assets/js/quiz-content.js` (GitHub). **Regeln, Lösungen und Begründungen** stehen in `apps-script/Quiz.gs` (Apps Script). **IDs nie ändern**, denn `q05`, `b` oder `weiss_nicht` verbinden Quiz, Schlüssel und Tabelle.

Dateien auf GitHub bearbeitest du direkt im Browser: Datei öffnen → **✏** → ändern → **Commit changes**. Die Seite ist nach ein bis drei Minuten aktualisiert. Danach im Browser neu laden (bei Bedarf **Strg/Cmd + Shift + R**).

| Ich möchte … | Datei | Einstellung | Version erhöhen? |
|---|---|---|---|
| eine Formulierung ändern (Frage, Antwort, Einleitung) | `assets/js/quiz-content.js` | `title`, `prompt`, `label`, `intro` | Nein, solange sich der Sinn nicht ändert |
| eine Begründung (Rückmeldung) ändern | `apps-script/Quiz.gs` | `rueckmeldung` | Nein → Skript **neu bereitstellen** |
| ein Foto austauschen | `assets/img/…` und `quiz-content.js` | `image.src`, `image.alt` | Ja, wenn das neue Foto eine andere Portion zeigt |
| eine neue Frage ergänzen | beide Dateien | neuer Eintrag in `questions` | **Ja** |
| einen Lösungsschlüssel nach Freigabe aktivieren | `apps-script/Quiz.gs` | `scoring.active`, `scoring.correct` | **Ja** |
| die Zieladresse der Schnittstelle ändern | `assets/js/config.js` | `ENDPOINT_URL` | Nein |
| Erhebung öffnen/schliessen, Code, Grenze, Berufsgruppenfilter, Mindestgrösse | Google-Tabelle, Blatt «Einstellungen» | Zeilen 2–7 | Nein |
| eine Berufsgruppe umbenennen | `quiz-content.js` (`groups.options`) **und** `Quiz.gs` (`groups`) | `label` – in beiden Dateien gleich | **Ja** (die Bezeichnung wird gespeichert) |
| eine Berufsgruppe ergänzen | beide Dateien, gleiche `id` und `label` | neuer Eintrag | **Ja**, danach «Auswertung neu aufbauen» |

## Formulierung ändern
`assets/js/quiz-content.js` → Text zwischen den Anführungszeichen anpassen. Typografische Anführungszeichen «…» sind erlaubt. Gerade Anführungszeichen `"` im Text müssen als `\"` geschrieben werden. Die Kurzbezeichnungen in den Tabellen (`kurz` in `Quiz.gs`) kannst du bei Bedarf ebenfalls anpassen.

## Foto austauschen
1. Neues Foto als JPG vorbereiten (Querformat, etwa 1600 × 1200 Pixel, unter 500 KB). Standortdaten vorher entfernen (viele Handys speichern GPS in Fotos).
2. Auf GitHub in `assets/img` → **Add file → Upload files** → hochladen. Gleicher Dateiname = Ersatz. Neuer Name: in `quiz-content.js` bei `image.src` eintragen (relativer Pfad wie `assets/img/neues-foto.jpg`, **ohne** führenden `/`, damit es unter der Projektadresse funktioniert).
3. `image.alt` anpassen: Speise beschreiben, **keine** Nährwerte nennen.
4. Zeigt das neue Foto eine andere Portion, die Version erhöhen (siehe unten). Sonst würden alte und neue Schätzungen vermischt.

## Neue Frage ergänzen
1. In `quiz-content.js` einen Block kopieren (z. B. `q07`) und an passender Stelle einfügen. Eine **neue ID** vergeben (z. B. `q17`, auch wenn die Frage in der Mitte steht; angezeigt wird automatisch die laufende Nummer).
2. In `apps-script/Quiz.gs` denselben Block an **derselben Position** ergänzen: `id`, `nr` (laufende Nummer), `type`, `options` mit gleichen IDs und `kurz`-Bezeichnung, `scoring` (`active: true, correct: ['…']`), `lernziel`, `rueckmeldung`. Folgende `nr` anpassen.
3. Version erhöhen (beide Dateien), Skript neu bereitstellen, in der Tabelle **Ernährungsquiz → Tabelle einrichten / Auswertung neu aufbauen** ausführen.

Fragetypen: `single` (eine Antwort), `multi` (mehrere; `exclusive: ["weiss_nicht"]`, optional `maxSelect`), `photo` (Schätzung + Sicherheit), `matrix` (mehrere Zeilen), `text` (Freitext; `optional: true`).

## Lösungsschlüssel für Fotoaufgaben aktivieren (nach fachlicher Freigabe)
Voraussetzung laut Dokument: Gericht und Rezeptur, gegarte Komponenten in Gramm, Protein pro Komponente, Gesamtwert, passende Antwort, Datum und prüfende Person sind dokumentiert. Foto und berechnete Portion stimmen überein.

In `apps-script/Quiz.gs` bei `q12` bzw. `q13`:
```js
scoring: { active: true, correct: ['…'], approval: { date: '2026-12-01', by: 'Funktion/Kürzel' } },
```
- `rueckmeldung` mit den **bestätigten** Werten ersetzen (Vorlage aus dem Dokument: «Diese Portion enthält ungefähr … g Protein. Davon stammen … g aus … . Beim Schöpfen ist besonders auf … zu achten.»). Keine erfundenen Zahlen.
- Bei `q13` die Zeile `referenceText` löschen (der Hinweis «vorläufig» entfällt) und `statusText` anpassen.
- Die Höchstpunktzahl wird automatisch aus den bewerteten Fragen berechnet (dann 12 bzw. 13).
- **Version erhöhen**, damit bewertete und unbewertete Abgaben getrennt bleiben.

## Version erhöhen
1. `assets/js/quiz-content.js`: `version: "2026-11-v1"` → z. B. `"2027-01-v2"`.
2. `apps-script/Quiz.gs`: `version: '2026-11-v1'` → **genau gleich** `'2027-01-v2'`.
3. Apps Script: speichern → **Bereitstellen → Bereitstellungen verwalten → ✏ → Neue Version → Bereitstellen**.
4. Tabelle: **Ernährungsquiz → Tabelle einrichten / Auswertung neu aufbauen**. Danach im Blatt «Einstellungen» die *Ausgewertete Quizversion* auf die neue Version setzen.
5. Alte Abgaben bleiben erhalten. Die Auswertung zeigt jeweils eine Version. Die Zahl der Abgaben anderer Versionen steht oben in jedem Auswertungsblatt.

Zwischen Schritt 1 und Schritt 3 lehnt die Schnittstelle Abgaben mit der Meldung «Das Quiz wurde inzwischen aktualisiert» ab. Ändere die Version deshalb ausserhalb laufender Erhebungszeiten.

## Zieladresse der Schnittstelle ändern
`assets/js/config.js` → `ENDPOINT_URL`. Eine neue Adresse entsteht nur bei «Neue Bereitstellung». Normale Updates über «Bereitstellungen verwalten» behalten die Adresse.

## Automatische Prüfung
Nach jedem Commit prüft GitHub unter **Actions**, ob Logik und (falls `apps-script` im selben Repository liegt) Frontend und Schnittstelle zusammenpassen. Ein rotes ✗ zeigt in der Ausgabe, welche ID oder Regel nicht übereinstimmt.
