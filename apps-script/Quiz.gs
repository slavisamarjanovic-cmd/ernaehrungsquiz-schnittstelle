/**
 * QUIZ-DEFINITION FÜR DIE SCHNITTSTELLE (Server)
 * -----------------------------------------------------------------
 * Diese Datei ist die verbindliche Quelle für:
 *   - Quizversion, Frage-IDs, Options-IDs und Antwortregeln (Prüfung)
 *   - Lösungsschlüssel und Bewertung (Punkte werden NUR hier berechnet)
 *   - Lernziele (nur für die Auswertung, nicht für Teilnehmende)
 *   - Rückmeldungen (werden erst nach bestätigter Speicherung angezeigt)
 *   - Kurzbezeichnungen für die Tabellen und Diagramme
 *
 * Die sichtbaren Frage- und Antworttexte stehen im Frontend in
 * assets/js/quiz-content.js. IDs, Fragetypen und Regeln müssen in beiden
 * Dateien übereinstimmen (automatische Prüfung: tests/run-tests.js).
 *
 * FOTOAUFGABEN FREIGEBEN (Fragen 12 und 13):
 *   Nach fachlicher Prüfung (Rezeptur, gegarte Mengen, Protein je Komponente)
 *   bei der Frage unter scoring:
 *     active: true,
 *     correct: ['c'],                          // bestätigte Antwort-ID
 *     approval: { date: '2026-12-01', by: 'Funktion/Kürzel' }
 *   und die Rückmeldung mit den bestätigten Werten anpassen.
 *   Danach "version" erhöhen (auch in quiz-content.js), damit bewertete und
 *   unbewertete Abgaben nicht vermischt werden. Siehe docs/AKTUALISIEREN.md.
 */
var QUIZ = {
  version: '2026-11-v1',

  // Berufsgruppen (Auswahl vor Frage 1). Die Bezeichnung (label) wird in der
  // Tabelle gespeichert und in der Auswertung verwendet. IDs nicht ändern.
  groups: [
    { id: 'pflege', label: 'Pflege' },
    { id: 'lernende_pflege', label: 'Lernende / Studierende Pflege' },
    { id: 'med_therapien', label: 'Medizinische Therapien' },
    { id: 'hotellerie', label: 'Hotellerie' },
    { id: 'arztdienst', label: 'Arztdienst' },
    { id: 'administration', label: 'Administration' },
    { id: 'andere', label: 'Andere' }
  ],

  questions: [
    {
      id: 'q01', nr: 1, section: 'pflegealltag', type: 'single', title: 'Wünsche beim Essen',
      options: [
        { id: 'a', kurz: 'A Ruhigerer Tisch im Speisesaal' },
        { id: 'b', kurz: 'B Essen im Zimmer bereitstellen' },
        { id: 'c', kurz: 'C Angehörige fragen' },
        { id: 'd', kurz: 'D Essen nach gemeinsamer Mahlzeit' },
        { id: 'weiss_nicht', kurz: 'Ich weiss es nicht' }
      ],
      scoring: { active: true, correct: ['b'] },
      lernziel: 'Einen klar geäusserten Wunsch bei der Mahlzeitengestaltung berücksichtigen.',
      rueckmeldung: [
        'Der Fall nennt eine selbstständig entscheidende Bewohnerin. Ihr aktueller Wunsch ist die Grundlage; Gemeinschaft bleibt ein Angebot.'
      ]
    },
    {
      id: 'q02', nr: 2, section: 'pflegealltag', type: 'single', title: 'Geringere Nahrungsaufnahme',
      options: [
        { id: 'a', kurz: 'A Portionen verkleinern, abwarten' },
        { id: 'b', kurz: 'B Nur noch Trinknahrung' },
        { id: 'c', kurz: 'C Lieblingsspeisen, erst später abklären' },
        { id: 'd', kurz: 'D Dokumentieren, abklären, planen' },
        { id: 'weiss_nicht', kurz: 'Ich weiss es nicht' }
      ],
      scoring: { active: true, correct: ['d'] },
      lernziel: 'Bei verminderter Nahrungsaufnahme Beobachtung, Abklärung und Unterstützung verbinden.',
      rueckmeldung: [
        'Die tatsächlich gegessene Menge und Veränderungen dokumentieren. Ursachen im zuständigen Team abklären, Unterstützung individuell planen und deren Wirkung überprüfen. Lieblingsspeisen können helfen, ersetzen die Abklärung aber nicht.'
      ]
    },
    {
      id: 'q03', nr: 3, section: 'pflegealltag', type: 'single', title: 'Eine kleine Portion',
      options: [
        { id: 'a', kurz: 'A Höhere Energie- und Proteindichte' },
        { id: 'b', kurz: 'B Halbe Portion, alles halbiert' },
        { id: 'c', kurz: 'C Zusätzliche Gemüsebouillon' },
        { id: 'd', kurz: 'D Zusätzlicher Blattsalat' },
        { id: 'weiss_nicht', kurz: 'Ich weiss es nicht' }
      ],
      scoring: { active: true, correct: ['a'] },
      lernziel: 'Bei kleiner Essmenge die Nährstoffdichte berücksichtigen.',
      rueckmeldung: [
        'Weniger Volumen muss nicht im gleichen Verhältnis weniger Nährstoffe bedeuten. Vorlieben und der individuelle Plan bleiben massgeblich.'
      ]
    },
    {
      id: 'q04', nr: 4, section: 'pflegealltag', type: 'single', title: 'Trinknahrung zeitlich einplanen',
      options: [
        { id: 'a', kurz: 'A Direkt vor dem Mittagessen' },
        { id: 'b', kurz: 'B Zusammen mit dem Mittagessen' },
        { id: 'c', kurz: 'C Zwischen den Hauptmahlzeiten' },
        { id: 'd', kurz: 'D Anstelle des Abendessens' },
        { id: 'weiss_nicht', kurz: 'Ich weiss es nicht' }
      ],
      scoring: { active: true, correct: ['c'] },
      lernziel: 'Einen geeigneten Zeitpunkt für ergänzende Trinknahrung wählen.',
      rueckmeldung: [
        'Zwischen den Hauptmahlzeiten angeboten, beeinträchtigt Trinknahrung deren Aufnahme häufig weniger. Direkt davor kann sie sättigen; gleichzeitig kann sie die Mahlzeit verdrängen. Ein Ersatz des Abendessens widerspricht hier dem ergänzenden Einsatz. Zeitpunkt, Menge und Akzeptanz werden individuell abgestimmt.'
      ]
    },
    {
      id: 'q05', nr: 5, section: 'pflegealltag', type: 'single', title: 'Verdacht auf eine Schluckstörung',
      options: [
        { id: 'a', kurz: 'A Trinkhalm anbieten' },
        { id: 'b', kurz: 'B Fachlich abklären lassen' },
        { id: 'c', kurz: 'C Alle Getränke eindicken' },
        { id: 'd', kurz: 'D Nur püriertes Essen' },
        { id: 'weiss_nicht', kurz: 'Ich weiss es nicht' }
      ],
      scoring: { active: true, correct: ['b'] },
      lernziel: 'Bei Verdacht auf eine Schluckstörung die notwendige fachliche Abklärung erkennen.',
      rueckmeldung: [
        'Bei Verdacht auf eine Schluckstörung braucht es eine fachliche Abklärung. Die zuständige Pflegefachperson koordiniert diese mit den beteiligten Fachpersonen. Je nach Befund können beispielsweise F.O.T.T.-Massnahmen oder das gezielte Eindicken von Getränken sinnvoll sein. Die Massnahmen werden individuell festgelegt.'
      ]
    },
    {
      id: 'q06', nr: 6, section: 'pflegealltag', type: 'single', title: 'Selbstständigkeit erhalten',
      options: [
        { id: 'a', kurz: 'A Ganze Mahlzeit eingeben' },
        { id: 'b', kurz: 'B Löffel führen' },
        { id: 'c', kurz: 'C Nach fester Zeit eingeben' },
        { id: 'd', kurz: 'D Zeit lassen, kurze Hinweise' },
        { id: 'weiss_nicht', kurz: 'Ich weiss es nicht' }
      ],
      scoring: { active: true, correct: ['d'] },
      lernziel: 'Unterstützung an vorhandene Fähigkeiten anpassen.',
      rueckmeldung: [
        'Die Hilfe soll die noch vorhandenen Fähigkeiten unterstützen. Der Zeitbedarf allein begründet keine vollständige Übernahme.'
      ]
    },
    {
      id: 'q07', nr: 7, section: 'pflegealltag', type: 'single', title: 'Essen in der Sterbephase',
      options: [
        { id: 'a', kurz: 'A Kleine Mengen ohne Druck' },
        { id: 'b', kurz: 'B Zum Aufessen motivieren' },
        { id: 'c', kurz: 'C Essensangebote einstellen' },
        { id: 'd', kurz: 'D Trinknahrung statt Mahlzeiten' },
        { id: 'weiss_nicht', kurz: 'Ich weiss es nicht' }
      ],
      scoring: { active: true, correct: ['a'] },
      lernziel: 'Essensangebote in der Sterbephase an Wunsch, Wohlbefinden und Belastung ausrichten.',
      rueckmeldung: [
        'Mundbefeuchtung ist Teil der Mundpflege und wird im Fall bereits durchgeführt. Die Frage prüft ausschliesslich den Umgang mit Essensangeboten.',
        'Essen kann weiterhin Genuss und Nähe bedeuten; gewünschte, verträgliche Mengen werden ohne Druck ermöglicht. Eine Ablehnung wird respektiert, Wünsche werden erneut wahrgenommen.'
      ]
    },
    {
      id: 'q08', nr: 8, section: 'pflegealltag', type: 'multi', exclusive: ['weiss_nicht'], title: 'Mögliche Ursachen',
      options: [
        { id: 'a', kurz: 'A Schmerzen beim Kauen' },
        { id: 'b', kurz: 'B Seit Jahren dasselbe Geschirr' },
        { id: 'c', kurz: 'C Mundtrockenheit nach Medikamentenumstellung' },
        { id: 'd', kurz: 'D Durch Lärm abgelenkt' },
        { id: 'weiss_nicht', kurz: 'Ich weiss es nicht' }
      ],
      scoring: { active: true, correct: ['a', 'c', 'd'] },
      lernziel: 'Mögliche körperliche und umgebungsbezogene Ursachen erkennen.',
      rueckmeldung: [
        'A, C und D sind mögliche Hinweise, keine gesicherten Ursachen. Unverändert verwendetes Geschirr allein erklärt den neuen Rückgang nicht.'
      ]
    },
    {
      id: 'q09', nr: 9, section: 'pflegealltag', type: 'multi', exclusive: ['weiss_nicht'], title: 'Risiken erkennen',
      options: [
        { id: 'a', kurz: 'A BMI normal, Verlauf stabil' },
        { id: 'b', kurz: 'B Ungewollte Abnahme bei Übergewicht' },
        { id: 'c', kurz: 'C Deutlich mehr Essen bleibt übrig' },
        { id: 'd', kurz: 'D Bevorzugt vegetarische Menüs' },
        { id: 'weiss_nicht', kurz: 'Ich weiss es nicht' }
      ],
      scoring: { active: true, correct: ['b', 'c'] },
      lernziel: 'Ernährungsrisiken unabhängig von Körpergewicht und Ernährungsform erkennen.',
      rueckmeldung: [
        'Unbeabsichtigter Gewichtsverlust und deutlich geringere Aufnahme sind Abklärungsanlässe. Vegetarische Ernährung allein belegt kein Risiko; stabile Werte ersetzen das reguläre Screening nicht.'
      ]
    },
    {
      id: 'q10', nr: 10, section: 'pflegealltag', type: 'multi', exclusive: ['weiss_nicht'], title: 'Trinken unterstützen',
      options: [
        { id: 'a', kurz: 'A Tagesbedarf morgens im Krug' },
        { id: 'b', kurz: 'B Wiederholt kleine Mengen anbieten' },
        { id: 'c', kurz: 'C Warten, bis er Durst äussert' },
        { id: 'd', kurz: 'D Gefäss erreichbar, Hilfe anbieten' },
        { id: 'weiss_nicht', kurz: 'Ich weiss es nicht' }
      ],
      scoring: { active: true, correct: ['b', 'd'] },
      lernziel: 'Trinkangebote an Zugänglichkeit und Unterstützungsbedarf anpassen.',
      rueckmeldung: [
        'Wiederholte Angebote und erreichbare Gefässe setzen an den beschriebenen Hindernissen an. Bereitstellen allein zeigt noch nicht, ob tatsächlich getrunken wird.'
      ]
    },
    {
      id: 'q11', nr: 11, section: 'pflegealltag', type: 'multi', exclusive: ['weiss_nicht'], title: 'Wirkung beurteilen',
      options: [
        { id: 'a', kurz: 'A Tatsächlich gegessene Mengen' },
        { id: 'b', kurz: 'B Gelieferte Portionen' },
        { id: 'c', kurz: 'C Verträglichkeit' },
        { id: 'd', kurz: 'D Gewichtsverlauf im Gesamtzustand' },
        { id: 'weiss_nicht', kurz: 'Ich weiss es nicht' }
      ],
      scoring: { active: true, correct: ['a', 'c', 'd'] },
      lernziel: 'Tatsächliche Aufnahme und Verlauf zur Wirkungskontrolle nutzen.',
      rueckmeldung: [
        'Liefermengen beschreiben die Bereitstellung. Aufnahme, Verträglichkeit und Verlauf helfen bei der Beurteilung der Wirkung; Gewicht ist dabei im klinischen Zusammenhang zu verstehen.'
      ]
    },
    {
      id: 'q12', nr: 12, section: 'portionen', type: 'photo', title: 'Vegi-Spätzlipfanne mit Wirsing',
      options: [
        { id: 'a', kurz: 'A < 20 g' },
        { id: 'b', kurz: 'B ca. 20–25 g' },
        { id: 'c', kurz: 'C > 25 g' },
        { id: 'weiss_nicht', kurz: 'Kann ich nicht einschätzen' }
      ],
      // Noch kein bestätigter Lösungsschlüssel. Eine frühere Fotoschätzung
      // (12–18 g) ist KEINE bestätigte Berechnung und wird nicht angezeigt.
      scoring: { active: false, correct: null, approval: null },
      statusText: 'Kein bestätigter Lösungsschlüssel. Lösung erst nach Abgleich von Rezeptur und Portion festlegen.',
      lernziel: 'Eine vollständige vegetarische Portion zum vorgegebenen Proteinziel einordnen.',
      rueckmeldung: [
        'Für diese Portion liegt noch kein bestätigter Proteinwert vor. Rezeptur und geschöpfte Portion werden noch abgeglichen. Deine Einschätzung wird deshalb nicht als richtig oder falsch bewertet.',
        'Deine Antwort und deine Sicherheit helfen uns zu sehen, wie gut Portionen im Team eingeschätzt werden. Als betrieblicher Orientierungswert gelten 20–25 g Protein pro Hauptmahlzeit.'
      ]
    },
    {
      id: 'q13', nr: 13, section: 'portionen', type: 'photo', title: 'Kalbsadrio mit Beilagen',
      options: [
        { id: 'a', kurz: 'A < 10 g' },
        { id: 'b', kurz: 'B 10 bis < 20 g' },
        { id: 'c', kurz: 'C 20–30 g' },
        { id: 'd', kurz: 'D > 30 g' },
        { id: 'weiss_nicht', kurz: 'Kann ich nicht einschätzen' }
      ],
      // Vorläufige Vergleichsantwort C aus der Fotoschätzung vom 5. November 2026
      // (rund 25 g Protein für den gesamten Teller). Keine bestätigte Berechnung.
      scoring: { active: false, correct: null, provisional: 'c', approval: null },
      statusText: 'Vorläufige Vergleichsantwort C (20–30 g) aus einer Fotoschätzung (rund 25 g Protein, 5. November 2026). Keine bestätigte Nährwertberechnung – bis zum Rezeptur- und Portionsabgleich unbewertet.',
      referenceText: 'C) 20 bis 30 g – vorläufig, gestützt auf eine Fotoschätzung von rund 25 g Protein. Keine bestätigte Nährwertberechnung.',
      lernziel: 'Den Proteinbeitrag einer vollständigen Portion mit Kalbsadrio einschätzen.',
      rueckmeldung: [
        'Für den gesamten Teller wurden ungefähr 25 g Protein geschätzt. Damit liegt die Schätzung im Bereich von 20–30 g. Sie liegt ungefähr am oberen Ende unseres Orientierungswerts von 20–25 g pro Hauptmahlzeit. Die tatsächliche Menge hängt von Rezeptur und geschöpfter Portion ab.',
        'Wichtig: Dieser Wert ist eine Schätzung anhand des Fotos, keine gesicherte Nährwertberechnung. Deine Antwort wird deshalb nicht als richtig oder falsch bewertet.'
      ]
    },
    {
      id: 'q14', nr: 14, section: 'arbeitsalltag', type: 'matrix', title: 'Orientierung im Betrieb',
      rows: [
        { id: 'konzept', kurz: 'Ernährungskonzept und Arbeitshilfen' },
        { id: 'meldeweg', kurz: 'Meldeweg bei geringerer Nahrungsaufnahme' },
        { id: 'schlucken', kurz: 'Vorgehen bei Auffälligkeiten beim Schlucken' },
        { id: 'beratung', kurz: 'Kontaktweg zur Ernährungsberatung' }
      ],
      options: [
        { id: 'selbststaendig', kurz: 'Finde ich selbstständig' },
        { id: 'hilfe', kurz: 'Brauche Hilfe beim Finden' },
        { id: 'weiss_nicht_wo', kurz: 'Weiss nicht, wo suchen' },
        { id: 'nicht_zutreffend', kurz: 'Nicht zutreffend' }
      ],
      scoring: { active: false }
    },
    {
      id: 'q15', nr: 15, section: 'arbeitsalltag', type: 'multi', maxSelect: 3, exclusive: ['keine'], otherOption: 'andere', otherMaxLength: 300,
      title: 'Hindernisse bei der Umsetzung',
      options: [
        { id: 'zeit', kurz: 'Zu wenig Zeit' },
        { id: 'zustaendigkeit', kurz: 'Unklare Zuständigkeiten/Meldewege' },
        { id: 'unsicherheit', kurz: 'Unsicherheit Ernährung/Portionen' },
        { id: 'angebot', kurz: 'Fehlende Speisen/Getränke/Hilfsmittel' },
        { id: 'absprachen', kurz: 'Unzureichende Absprachen' },
        { id: 'wuensche_ziele', kurz: 'Wünsche vs. Ernährungsziele' },
        { id: 'andere', kurz: 'Andere Hindernisse' },
        { id: 'keine', kurz: 'Keine wesentlichen Hindernisse' }
      ],
      scoring: { active: false }
    },
    {
      id: 'q16', nr: 16, section: 'arbeitsalltag', type: 'text', optional: true, maxLength: 1000,
      title: 'Dein Schulungswunsch',
      scoring: { active: false }
    }
  ]
};
