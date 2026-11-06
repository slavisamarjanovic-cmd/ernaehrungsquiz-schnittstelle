/*
 * INHALTE DES QUIZ  –  Ernährung im Alter
 * ------------------------------------------------------------------
 * Hier stehen alle sichtbaren Texte: Startseite, Abschnitte, Fragen,
 * Antwortmöglichkeiten, Fotos und Alternativtexte.
 *
 * WICHTIG beim Bearbeiten:
 *  - Die IDs (id: "q01", id: "a", id: "weiss_nicht" …) NIE ändern.
 *    Sie verbinden Quiz, Lösungsschlüssel und Google-Tabelle.
 *  - Reine Formulierungsänderungen (text, prompt, label, alt) sind
 *    jederzeit möglich, ohne die Version zu ändern.
 *  - Neue Fragen, neue/entfernte Optionen oder geänderte Regeln:
 *    "version" erhöhen UND dieselben Änderungen in apps-script/Quiz.gs
 *    nachführen (siehe docs/AKTUALISIEREN.md).
 *  - Lösungen und Begründungen stehen absichtlich NICHT hier,
 *    sondern nur in apps-script/Quiz.gs.
 */
window.QUIZ_CONTENT = {
  version: "2026-11-v1",

  title: "Ernährung im Alter",
  subtitle: "Wissen einschätzen und bewusst schöpfen",

  intro: [
    "Deine Antworten helfen, Schulungen für unseren Alltag zu planen. Bitte antworte ohne Nachschlagen oder Absprache. Es geht um vorhandenes Wissen und Einschätzungen, nicht um eine persönliche Leistungsbeurteilung. Die Lösungen erhältst du nach Abschluss.",
    "Bei jeder Frage steht, ob eine oder mehrere Antworten möglich sind. Bei Fotoaufgaben geht es um ungefähre Mengen. «Ich weiss es nicht» ist eine hilfreiche Antwort, wenn du unsicher bist."
  ],

  /* Berufsgruppe: wird vor Frage 1 abgefragt. IDs nicht ändern; Bezeichnungen
     müssen mit QUIZ.groups in apps-script/Quiz.gs übereinstimmen. */
  groups: {
    title: "Deine Berufsgruppe",
    prompt: "Zu welcher Berufsgruppe gehörst du?",
    intro: "Die Angabe hilft, Schulungen gezielt für einzelne Berufsgruppen zu planen. In der Auswertung werden Ergebnisse einer Berufsgruppe nur gezeigt, wenn genügend Personen aus dieser Gruppe teilgenommen haben.",
    options: [
      { id: "pflege", label: "Pflege" },
      { id: "lernende_pflege", label: "Lernende / Studierende Pflege" },
      { id: "med_therapien", label: "Medizinische Therapien" },
      { id: "hotellerie", label: "Hotellerie" },
      { id: "arztdienst", label: "Arztdienst" },
      { id: "hauswirtschaft", label: "Hauswirtschaft" },
      { id: "administration", label: "Administration" },
      { id: "andere", label: "Andere" }
    ]
  },

  privacyHint: "Bitte keine Namen oder Angaben nennen, durch die Bewohnende oder Mitarbeitende erkennbar werden.",

  sections: [
    {
      id: "pflegealltag",
      title: "Entscheidungen im Pflegealltag",
      intro: "Kurze Situationen aus dem Alltag. Wähle jeweils die Antwort, die am besten passt."
    },
    {
      id: "portionen",
      title: "Portionen einschätzen",
      intro: "Für die folgenden Aufgaben verwenden wir 20–25 g Protein als betrieblichen Orientierungswert pro Hauptmahlzeit. Schätze anhand von Foto und Speisenbezeichnung; eine grammgenaue Antwort ist nicht gefragt. Der Wert beschreibt keine individuelle Verordnung."
    },
    {
      id: "arbeitsalltag",
      title: "Erfahrungen aus dem Arbeitsalltag",
      intro: "Diese Fragen werden nicht bewertet. Bitte keine Namen oder identifizierbaren Angaben zu anderen Personen nennen."
    }
  ],

  questions: [
    /* ---------------- Abschnitt 1: Einfachauswahl ---------------- */
    {
      id: "q01", section: "pflegealltag", type: "single",
      title: "Wünsche beim Essen",
      prompt: "Frau Meier entscheidet selbstständig. Heute möchte sie im Zimmer essen; eine Begleitung ist nicht nötig. Welche Reaktion berücksichtigt ihren Wunsch am besten?",
      options: [
        { id: "a", label: "Sie für heute einem ruhigeren Tisch im Speisesaal zuweisen." },
        { id: "b", label: "Ihr das Essen heute im Zimmer zugänglich bereitstellen." },
        { id: "c", label: "Ihre Angehörigen nach dem bevorzugten Essensort fragen." },
        { id: "d", label: "Ihr das Essen nach Ende der gemeinsamen Mahlzeit anbieten." },
        { id: "weiss_nicht", label: "Ich weiss es nicht." }
      ]
    },
    {
      id: "q02", section: "pflegealltag", type: "single",
      title: "Geringere Nahrungsaufnahme",
      prompt: "Herr Keller isst seit mehreren Tagen deutlich weniger. Sein Gewicht ist bisher unverändert. Welche Massnahmen sind erforderlich?",
      options: [
        { id: "a", label: "Die Portionen verkleinern und bis zur nächsten Gewichtskontrolle abwarten." },
        { id: "b", label: "Die Hauptmahlzeiten ersetzen und vorerst nur noch Trinknahrung anbieten." },
        { id: "c", label: "Die Lieblingsspeisen anbieten und erst bei Gewichtsverlust weiter abklären." },
        { id: "d", label: "Die Essmenge dokumentieren, Ursachen abklären und passende Unterstützung planen." },
        { id: "weiss_nicht", label: "Ich weiss es nicht." }
      ]
    },
    {
      id: "q03", section: "pflegealltag", type: "single",
      title: "Eine kleine Portion",
      prompt: "Eine Bewohnerin hat wenig Appetit und möchte eine kleine Portion. Eine Anreicherung ist vereinbart. Welche Zusammenstellung unterstützt diesen Plan am besten?",
      options: [
        { id: "a", label: "Eine kleine Portion mit höherer Energie- und Proteindichte." },
        { id: "b", label: "Eine halbe Portion mit halbierter Menge jeder Komponente." },
        { id: "c", label: "Eine kleine Portion mit zusätzlicher klarer Gemüsebouillon." },
        { id: "d", label: "Eine kleine Portion mit zusätzlichem Blattsalat ohne Dressing." },
        { id: "weiss_nicht", label: "Ich weiss es nicht." }
      ]
    },
    {
      id: "q04", section: "pflegealltag", type: "single",
      title: "Trinknahrung zeitlich einplanen",
      prompt: "Frau Frei erhält ergänzend zu den normalen Mahlzeiten Trinknahrung. Wann sollte die Pflegefachperson diese vorzugsweise anbieten?",
      options: [
        { id: "a", label: "Direkt vor dem Mittagessen, damit Frau Frei die Zusatznahrung noch vollständig schafft." },
        { id: "b", label: "Zusammen mit dem Mittagessen, damit die gesamte Nährstoffaufnahme auf einen Termin fällt." },
        { id: "c", label: "Zwischen den Hauptmahlzeiten, damit die Zusatznahrung möglichst wenig den Appetit auf das Essen beeinträchtigt." },
        { id: "d", label: "Anstelle des Abendessens, damit Frau Frei die Nährstoffe mit weniger Essaufwand aufnehmen kann." },
        { id: "weiss_nicht", label: "Ich weiss es nicht." }
      ]
    },
    {
      id: "q05", section: "pflegealltag", type: "single",
      title: "Verdacht auf eine Schluckstörung",
      prompt: "Eine Bewohnerin hustet häufig beim Trinken. Es besteht der Verdacht auf eine Schluckstörung. Welche Massnahme ist erforderlich?",
      options: [
        { id: "a", label: "Der Bewohnerin einen Trinkhalm anbieten, damit sie leichter trinken kann." },
        { id: "b", label: "Das Schlucken durch Fachpersonen abklären lassen und die weiteren Massnahmen gemeinsam festlegen." },
        { id: "c", label: "Alle Getränke eindicken, ohne eine weitere Abklärung einzuleiten." },
        { id: "d", label: "Nur noch püriertes Essen anbieten und die Getränke unverändert lassen." },
        { id: "weiss_nicht", label: "Ich weiss es nicht." }
      ]
    },
    {
      id: "q06", section: "pflegealltag", type: "single",
      title: "Selbstständigkeit erhalten",
      prompt: "Herr Frei isst selbstständig mit dem Löffel. Er braucht Zeit und gelegentliche Erinnerungen. Welche Unterstützung passt zu seinen Fähigkeiten?",
      options: [
        { id: "a", label: "Die gesamte Mahlzeit in seinem Tempo eingeben." },
        { id: "b", label: "Jeden Bissen vorbereiten und den Löffel führen." },
        { id: "c", label: "Nach fester Zeit das Essen vollständig eingeben." },
        { id: "d", label: "Zeit lassen und bei Bedarf kurze Hinweise geben." },
        { id: "weiss_nicht", label: "Ich weiss es nicht." }
      ]
    },
    {
      id: "q07", section: "pflegealltag", type: "single",
      title: "Essen in der Sterbephase",
      prompt: "Ein Bewohner in der Sterbephase lehnt aktuell Essen ab. Das vereinbarte Ziel ist Wohlbefinden. Gegen seinen trockenen Mund erhält er Mundpflege. Wie soll die Pflege mit weiteren Essensangeboten umgehen?",
      options: [
        { id: "a", label: "Gewünschte kleine Mengen ohne Druck anbieten und eine Ablehnung respektieren." },
        { id: "b", label: "Die bisherigen Portionsmengen beibehalten und zum vollständigen Aufessen motivieren." },
        { id: "c", label: "Weitere Essensangebote einstellen und die Mundpflege als alleinige Massnahme fortführen." },
        { id: "d", label: "Feste Mengen Trinknahrung anbieten und damit die bisherigen Mahlzeiten ersetzen." },
        { id: "weiss_nicht", label: "Ich weiss es nicht." }
      ]
    },

    /* ---------------- Abschnitt 1: Mehrfachauswahl ---------------- */
    {
      id: "q08", section: "pflegealltag", type: "multi", exclusive: ["weiss_nicht"],
      title: "Mögliche Ursachen",
      prompt: "Eine Bewohnerin isst seit Kurzem weniger. Welche Beobachtungen können Hinweise auf eine Ursache geben?",
      options: [
        { id: "a", label: "Sie berichtet über Schmerzen beim Kauen." },
        { id: "b", label: "Sie benutzt seit Jahren dasselbe Geschirr." },
        { id: "c", label: "Sie berichtet über Mundtrockenheit nach Medikamentenumstellung." },
        { id: "d", label: "Sie wirkt beim Essen durch Lärm abgelenkt." },
        { id: "weiss_nicht", label: "Ich weiss es nicht.", hint: "Bitte allein auswählen." }
      ]
    },
    {
      id: "q09", section: "pflegealltag", type: "multi", exclusive: ["weiss_nicht"],
      title: "Risiken erkennen",
      prompt: "Welche Beobachtungen geben Anlass, den Ernährungszustand genauer abzuklären?",
      options: [
        { id: "a", label: "Der BMI liegt im Normalbereich und der Verlauf ist stabil." },
        { id: "b", label: "Ein übergewichtiger Bewohner nimmt ab, obwohl er nicht abnehmen möchte." },
        { id: "c", label: "Über mehrere Tage bleibt deutlich mehr Essen übrig." },
        { id: "d", label: "Eine Bewohnerin bevorzugt seit Jahren vegetarische Menüs." },
        { id: "weiss_nicht", label: "Ich weiss es nicht.", hint: "Bitte allein auswählen." }
      ]
    },
    {
      id: "q10", section: "pflegealltag", type: "multi", exclusive: ["weiss_nicht"],
      title: "Trinken unterstützen",
      prompt: "Herr Weber vergisst häufig zu trinken und erreicht sein Glas schlecht. Eine Trinkmengenbegrenzung besteht nicht. Welche Massnahmen passen zu diesen Schwierigkeiten?",
      options: [
        { id: "a", label: "Den Tagesbedarf morgens in einem grossen Krug bereitstellen." },
        { id: "b", label: "Bevorzugte Getränke wiederholt in kleinen Mengen anbieten." },
        { id: "c", label: "Mit weiteren Angeboten warten, bis er Durst äussert." },
        { id: "d", label: "Das Trinkgefäss erreichbar platzieren und Hilfe anbieten." },
        { id: "weiss_nicht", label: "Ich weiss es nicht.", hint: "Bitte allein auswählen." }
      ]
    },
    {
      id: "q11", section: "pflegealltag", type: "multi", exclusive: ["weiss_nicht"],
      title: "Wirkung beurteilen",
      prompt: "Eine Bewohnerin erhält seit zwei Wochen zusätzliche Zwischenmahlzeiten. Welche Angaben helfen, deren Wirkung auf das vereinbarte Ernährungsziel zu beurteilen?",
      options: [
        { id: "a", label: "Die tatsächlich gegessenen Mengen im Verlauf." },
        { id: "b", label: "Die Zahl der durch die Küche gelieferten Portionen." },
        { id: "c", label: "Die Verträglichkeit der zusätzlich gegessenen Speisen." },
        { id: "d", label: "Der Gewichtsverlauf im Zusammenhang mit dem Gesamtzustand." },
        { id: "weiss_nicht", label: "Ich weiss es nicht.", hint: "Bitte allein auswählen." }
      ]
    },

    /* ---------------- Abschnitt 2: Fotoaufgaben ---------------- */
    {
      id: "q12", section: "portionen", type: "photo",
      title: "Vegi-Spätzlipfanne mit Wirsing",
      description: "",
      image: {
        src: "assets/img/frage12-vegi-spaetzlipfanne.jpg",
        alt: "Weisser Teller mit einer Portion Spätzlipfanne mit Gemüsestücken in heller, cremiger Sauce; darunter eine Portion gedünsteter Wirsing.",
        width: 1600, height: 1200
      },
      prompt: "Wie viel Protein enthält die gesamte abgebildete Portion deiner Einschätzung nach?",
      options: [
        { id: "a", label: "Weniger als 20 g." },
        { id: "b", label: "Etwa 20–25 g." },
        { id: "c", label: "Mehr als 25 g." },
        { id: "weiss_nicht", label: "Ich kann das nicht einschätzen." }
      ],
      confidencePrompt: "Wie sicher bist du?",
      confidenceNote: "Diese Angabe wird nicht bewertet."
    },
    {
      id: "q13", section: "portionen", type: "photo",
      title: "Kalbsadrio mit Beilagen",
      description: "Kalbsadrio mit Pilzsauce, Wildreis und Gemüsegarniture.",
      image: {
        src: "assets/img/frage13-kalbsadrio.jpg",
        alt: "Weisser Teller mit einem Kalbsadrio in heller Pilzsauce, einer Portion Wildreis und gemischtem Gemüse aus Karotten, Erbsen, grünen Bohnen und Blumenkohl.",
        width: 1600, height: 1200
      },
      prompt: "Wie viel Protein enthält die gesamte abgebildete Portion ungefähr?",
      options: [
        { id: "a", label: "Weniger als 10 g." },
        { id: "b", label: "10 bis unter 20 g." },
        { id: "c", label: "20 bis 30 g." },
        { id: "d", label: "Mehr als 30 g." },
        { id: "weiss_nicht", label: "Ich kann das nicht einschätzen." }
      ],
      confidencePrompt: "Wie sicher bist du?",
      confidenceNote: "Diese Angabe wird nicht bewertet."
    },

    /* ---------------- Abschnitt 3: Erfahrungen ---------------- */
    {
      id: "q14", section: "arbeitsalltag", type: "matrix",
      title: "Orientierung im Betrieb",
      prompt: "Wie gut findest du die folgenden Informationen? Wähle pro Zeile eine Antwort.",
      rows: [
        { id: "konzept", label: "Ernährungskonzept und Arbeitshilfen" },
        { id: "meldeweg", label: "Meldeweg bei deutlich geringerer Nahrungsaufnahme" },
        { id: "schlucken", label: "Vorgehen bei Auffälligkeiten beim Schlucken" },
        { id: "beratung", label: "Kontaktweg zur Ernährungsberatung" }
      ],
      options: [
        { id: "selbststaendig", label: "Ich finde die Information selbstständig" },
        { id: "hilfe", label: "Ich brauche Hilfe beim Finden" },
        { id: "weiss_nicht_wo", label: "Ich weiss nicht, wo ich suchen soll" },
        { id: "nicht_zutreffend", label: "Für meine Aufgabe nicht zutreffend" }
      ]
    },
    {
      id: "q15", section: "arbeitsalltag", type: "multi", maxSelect: 3,
      exclusive: ["keine"], otherOption: "andere",
      title: "Hindernisse bei der Umsetzung",
      prompt: "Was erschwert dir die Unterstützung beim Essen und Trinken?",
      options: [
        { id: "zeit", label: "Zu wenig Zeit für die benötigte Unterstützung." },
        { id: "zustaendigkeit", label: "Unklare Zuständigkeiten oder Meldewege." },
        { id: "unsicherheit", label: "Unsicherheit bei Ernährung oder Portionsgrössen." },
        { id: "angebot", label: "Fehlende passende Speisen, Getränke oder Hilfsmittel." },
        { id: "absprachen", label: "Unzureichende Absprachen zwischen den beteiligten Bereichen." },
        { id: "wuensche_ziele", label: "Schwierige Abstimmung von Wünschen und Ernährungszielen." },
        { id: "andere", label: "Andere Hindernisse", hint: "Bitte im Textfeld kurz beschreiben." },
        { id: "keine", label: "Keine wesentlichen Hindernisse.", hint: "Bitte allein auswählen." }
      ],
      otherMaxLength: 300
    },
    {
      id: "q16", section: "arbeitsalltag", type: "text", optional: true,
      title: "Dein Schulungswunsch",
      prompt: "Bei welcher konkreten Situation rund um Essen, Trinken oder Schöpfen möchtest du sicherer werden? Beschreibe freiwillig ein kurzes Beispiel.",
      maxLength: 1000
    }
  ],

  confidenceOptions: [
    { id: "sicher", label: "Sicher" },
    { id: "eher_sicher", label: "Eher sicher" },
    { id: "unsicher", label: "Unsicher" }
  ]
};
