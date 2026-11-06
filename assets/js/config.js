/*
 * EINSTELLUNGEN DES QUIZ (Frontend)
 * ------------------------------------------------------------------
 * ENDPOINT_URL:
 *   Web-App-URL deiner Apps-Script-Bereitstellung. Sie endet auf "/exec".
 *   Beispiel: "https://script.google.com/macros/s/AKfy.../exec"
 *   Solange hier "" steht, kann das Quiz nicht speichern und zeigt einen
 *   deutlichen Hinweis.
 *   Hinweis: Diese Adresse ist im Browser sichtbar. Sie ist kein Geheimnis.
 *
 * SURVEY_CODE_REQUIRED:
 *   true  = Auf der Startseite erscheint ein Feld «Erhebungscode».
 *           Der Code kann auch per Link mitgegeben werden: ...?code=ABC123
 *           Den gültigen Code legst du in der Google-Tabelle im Blatt
 *           «Einstellungen» fest. Der Code ist KEIN Passwort, er hält nur
 *           zufällige automatisierte Abgaben fern.
 *   false = kein Code nötig.
 *
 * REQUEST_TIMEOUT_MS:
 *   Wie lange auf die Bestätigung gewartet wird (Millisekunden).
 *
 * Testmodus: Rufe das Quiz mit ?test=1 am Ende der Adresse auf.
 *   Solche Abgaben werden in der Tabelle als Testdaten markiert und aus der
 *   Auswertung ausgeschlossen.
 */
window.QUIZ_CONFIG = {
  ENDPOINT_URL: "",
  SURVEY_CODE_REQUIRED: false,
  REQUEST_TIMEOUT_MS: 30000
};
