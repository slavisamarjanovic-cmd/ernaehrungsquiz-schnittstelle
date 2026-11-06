"""
Browsertest mit Chromium (Playwright) gegen tests/mock-server.js.
Aufruf:  python3 tests/e2e.py [ausgabeordner-fuer-screenshots]
"""
import json, subprocess, sys, time, os, urllib.request
from playwright.sync_api import sync_playwright, expect

OUT = sys.argv[1] if len(sys.argv) > 1 else "/tmp/e2e-shots"
os.makedirs(OUT, exist_ok=True)
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = "http://localhost:8100/index.html"

srv = subprocess.Popen(["node", os.path.join(ROOT, "tests", "mock-server.js")], stdout=subprocess.PIPE, text=True)
srv.stdout.readline()

passed = 0; failed = 0
def ok(cond, name):
    global passed, failed
    if cond: passed += 1
    else: failed += 1; print("  ✗ " + name)
def section(t): print("\n▶ " + t)
_opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))  # lokale Anfragen nie über einen Proxy
def ctl(path): return _opener.open("http://127.0.0.1:8101" + path, timeout=10).read().decode()
def dump(): return json.loads(ctl("/__dump"))
def mode(m): ctl("/__mode?m=" + m)

ANS = {"q01": "b", "q02": "d", "q03": "a", "q04": "c", "q05": "b", "q06": "d", "q07": "a",
       "q08": ["a", "c", "d"], "q09": ["b", "c"], "q10": ["b", "d"], "q11": ["a", "c", "d"]}

def click_opt(page, name, opt):
    page.locator(f'label[for="{name}-{opt}"]').click()

def next_btn(page):
    page.locator("main .nav .btn--primary").click()

def no_overflow(page, label):
    w = [page.evaluate("document.documentElement.scrollWidth"), page.viewport_size["width"]]
    ok(w[0] <= w[1], f"kein waagrechtes Scrollen: {label} ({w[0]} > {w[1]})" if w[0] > w[1] else label)

def answer_screen(page, shots=None, practice=False):
    """Beantwortet den aktuellen Bildschirm mit Standardantworten. Gibt False bei der Übersicht zurück."""
    h1 = page.locator("main h1").inner_text()
    if "Übersicht" in h1: return False
    if page.locator("main .section-intro").count():
        next_btn(page); return True
    if page.locator('input[name="gruppe"]').count():
        click_opt(page, "gruppe", "pflege"); next_btn(page); return True
    if page.locator("#text-q16").count(): qid = "q16"
    else: qid = page.locator("main input").first.get_attribute("name").split("_")[0]
    if shots: no_overflow(page, qid)
    if qid in ANS:
        v = ANS[qid]
        for o in (v if isinstance(v, list) else [v]): click_opt(page, qid, o)
    elif qid == "q12": click_opt(page, "q12", "b"); click_opt(page, "q12_sicherheit", "eher_sicher")
    elif qid == "q13": click_opt(page, "q13", "c"); click_opt(page, "q13_sicherheit", "sicher")
    elif qid == "q14":
        for r in ["konzept", "meldeweg", "schlucken", "beratung"]: click_opt(page, "q14_" + r, "hilfe")
    elif qid == "q15": click_opt(page, "q15", "zeit")
    elif qid == "q16": page.fill("#text-q16", "Schöpfen bei Pürierkost")
    if shots and qid in shots: page.screenshot(path=f"{OUT}/{shots[qid]}.png", full_page=True)
    next_btn(page); return True

def fill_all(page, shots=None):
    try:
        for _ in range(40):
            if not answer_screen(page, shots): return
    except Exception:
        page.screenshot(path=f"{OUT}/FEHLER.png", full_page=True)
        raise
    raise RuntimeError("Übersicht nicht erreicht")

console_errors = []
try:
  with sync_playwright() as p:
      browser = p.chromium.launch(args=["--no-proxy-server"])

      # ------------------------------------------------------------------
      section("A  Gesamter Ablauf am Computer (Tastatur, Logik, Speicherung)")
      ctx = browser.new_context(viewport={"width": 1280, "height": 900}, locale="de-CH")
      page = ctx.new_page(); page.set_default_timeout(5000)
      page.on("console", lambda m: console_errors.append(m.text) if m.type == "error" else None)
      page.on("pageerror", lambda e: console_errors.append(str(e)))
      page.goto(BASE)
      ok("Ernährung im Alter" in page.locator("main h1").inner_text(), "Startseite mit Titel")
      ok(page.locator("text=16 Fragen").count() == 1, "Startseite: Umfang")
      page.screenshot(path=f"{OUT}/desktop-01-start.png", full_page=True)
      page.get_by_role("button", name="Quiz starten").click()
      ok(page.locator("main h1").inner_text() == "Deine Berufsgruppe", "Berufsgruppe vor dem Start")
      ok(page.locator('input[name="gruppe"]').count() == 8, "acht Berufsgruppen zur Auswahl")
      ok("Vor dem Start" in page.locator("#progress-label").inner_text(), "Fortschritt: Vor dem Start")
      next_btn(page)
      expect(page.locator("main .error-box.is-visible")).to_contain_text("Berufsgruppe")
      click_opt(page, "gruppe", "hotellerie")
      ok(page.locator("main .error-box.is-visible").count() == 0, "Fehlermeldung verschwindet nach Wahl der Berufsgruppe")
      page.screenshot(path=f"{OUT}/desktop-00-berufsgruppe.png", full_page=True)
      next_btn(page)
      ok(page.locator("main h1").inner_text() == "Entscheidungen im Pflegealltag", "Abschnitt 1")
      ok("Abschnitt 1 von 3" in page.locator("#progress-label").inner_text(), "Abschnittsanzeige")
      next_btn(page)
      ok("Frage 1 von 16" in page.locator("#progress-label").inner_text(), "Fortschritt «Frage 1 von 16»")
      ok("Eine Antwort wählen" in page.locator("main .mode").inner_text(), "Kennzeichnung Einfachauswahl")
      # Fehler ohne Antwort
      next_btn(page)
      expect(page.locator("main .error-box.is-visible")).to_contain_text("Bitte wähle eine Antwort aus.")
      ok(page.evaluate("document.activeElement.name") == "q01", "Fokus springt zur Frage")
      # Tastatur: Pfeiltasten in der Radiogruppe, Leertaste
      page.keyboard.press("ArrowDown")
      ok(page.evaluate("document.activeElement.value") == "b", "Pfeiltaste wählt nächste Option")
      ok(page.locator('label[for="q01-b"]').evaluate("e => getComputedStyle(e).outlineStyle") != "none", "sichtbarer Tastaturfokus")
      ok(page.locator("main .error-box.is-visible").count() == 0, "Fehlermeldung verschwindet nach Auswahl")
      page.screenshot(path=f"{OUT}/desktop-02-frage1.png")
      page.keyboard.press("Tab"); page.keyboard.press("Tab"); page.keyboard.press("Enter")
      ok("Frage 2 von 16" in page.locator("#progress-label").inner_text(), "Weiter per Tastatur")
      for q in ["q02", "q03", "q04", "q05", "q06", "q07"]:
          click_opt(page, q, ANS[q]); next_btn(page)
      # Frage 8: Exklusivität
      ok("Mehrere Antworten möglich" in page.locator("main .mode").inner_text(), "Kennzeichnung Mehrfachauswahl")
      click_opt(page, "q08", "a"); click_opt(page, "q08", "c")
      click_opt(page, "q08", "weiss_nicht")
      checked = page.evaluate("[...document.querySelectorAll('input[name=q08]:checked')].map(x=>x.value)")
      ok(checked == ["weiss_nicht"], "«Ich weiss es nicht» wählt A und C ab")
      ok("abgewählt" in page.locator("#status-q08").inner_text(), "Hinweis zur Abwahl sichtbar")
      click_opt(page, "q08", "a")
      checked = page.evaluate("[...document.querySelectorAll('input[name=q08]:checked')].map(x=>x.value)")
      ok(checked == ["a"], "A wählt «Ich weiss es nicht» ab")
      click_opt(page, "q08", "c"); click_opt(page, "q08", "d")
      page.screenshot(path=f"{OUT}/desktop-03-frage8.png")
      next_btn(page)
      # Zurück: Antworten bleiben
      page.locator("main .nav .btn--ghost").click()
      checked = page.evaluate("[...document.querySelectorAll('input[name=q08]:checked')].map(x=>x.value)")
      ok(checked == ["a", "c", "d"], "Antworten bleiben beim Zurückgehen erhalten")
      page.locator("main .nav .btn--ghost").click()
      ok(page.evaluate("document.querySelector('input[name=q07]:checked').value") == "a", "Frage 7 weiterhin gewählt")
      next_btn(page); next_btn(page)
      for q in ["q09", "q10", "q11"]:
          for o in ANS[q]: click_opt(page, q, o)
          next_btn(page)
      # Abschnitt 2, Fotos
      ok(page.locator("main h1").inner_text() == "Portionen einschätzen", "Abschnitt 2")
      ok("20–25 g Protein" in page.locator("main").inner_text(), "Orientierungswert angezeigt")
      next_btn(page)
      img = page.locator("main .photo img")
      ok(img.evaluate("i => i.complete && i.naturalWidth > 0"), "Foto Frage 12 geladen")
      alt = img.get_attribute("alt"); ok("Spätzli" in alt and "g " not in alt, "Alternativtext beschreibt Speise ohne Nährwert")
      page.get_by_role("button", name="Foto vergrössern").click()
      ok(page.locator("#lightbox").evaluate("d => d.open"), "Foto vergrösserbar (Dialog offen)")
      page.screenshot(path=f"{OUT}/desktop-04-lightbox.png")
      page.keyboard.press("Escape")
      ok(not page.locator("#lightbox").evaluate("d => d.open"), "Dialog schliesst mit Escape")
      ok(page.evaluate("document.activeElement.textContent") == "Foto vergrössern", "Fokus kehrt zurück")
      click_opt(page, "q12", "b")
      ok(page.locator("#conf-q12").is_visible(), "Sicherheitsfrage sichtbar")
      next_btn(page)
      expect(page.locator("main .error-box.is-visible")).to_contain_text("wie sicher")
      click_opt(page, "q12_sicherheit", "eher_sicher")
      page.screenshot(path=f"{OUT}/desktop-05-frage12.png", full_page=True)
      next_btn(page)
      click_opt(page, "q13", "weiss_nicht")
      ok(not page.locator("#conf-q13").is_visible(), "keine Sicherheitsfrage bei «kann nicht einschätzen»")
      click_opt(page, "q13", "c"); click_opt(page, "q13_sicherheit", "sicher")
      next_btn(page)
      # Abschnitt 3
      ok(page.locator("main h1").inner_text() == "Erfahrungen aus dem Arbeitsalltag", "Abschnitt 3")
      next_btn(page)
      ok(page.locator("main fieldset.matrix-group").count() == 4, "Frage 14 als vier Gruppen")
      next_btn(page)
      ok(page.locator("main .error-box li").count() == 4, "Frage 14: vier fehlende Zeilen gemeldet")
      for r, v in [("konzept", "selbststaendig"), ("meldeweg", "hilfe"), ("schlucken", "weiss_nicht_wo"), ("beratung", "nicht_zutreffend")]:
          click_opt(page, "q14_" + r, v)
      next_btn(page)
      # Frage 15
      ok("Bis zu drei" in page.locator("main .mode").inner_text(), "Kennzeichnung bis zu drei")
      for o in ["zeit", "zustaendigkeit", "unsicherheit"]: click_opt(page, "q15", o)
      click_opt(page, "q15", "angebot")
      checked = page.evaluate("[...document.querySelectorAll('input[name=q15]:checked')].map(x=>x.value)")
      ok(checked == ["zeit", "zustaendigkeit", "unsicherheit"], "vierte Auswahl wird verhindert")
      ok("höchstens drei" in page.locator("#status-q15").inner_text(), "Hinweis zur Auswahlgrenze")
      click_opt(page, "q15", "keine")
      checked = page.evaluate("[...document.querySelectorAll('input[name=q15]:checked')].map(x=>x.value)")
      ok(checked == ["keine"], "«Keine wesentlichen Hindernisse» exklusiv")
      click_opt(page, "q15", "zeit"); click_opt(page, "q15", "andere")
      ok(page.locator("#other-q15").is_visible(), "«Andere» öffnet Freitextfeld")
      ok("Bitte keine Namen" in page.locator("#otherbox-q15").inner_text(), "Datenschutzhinweis beim Freitext")
      next_btn(page)
      expect(page.locator("main .error-box.is-visible")).to_contain_text("andere Hindernis")
      page.fill("#other-q15", "<b>Lärm</b> im Speisesaal")
      page.screenshot(path=f"{OUT}/desktop-06-frage15.png", full_page=True)
      next_btn(page)
      ok("Freiwillig" in page.locator("main .mode").inner_text(), "Frage 16 freiwillig gekennzeichnet")
      page.fill("#text-q16", "=1+1 Schöpfen von Pürierkost")
      next_btn(page)
      # Übersicht
      ok("Übersicht vor der Abgabe" in page.locator("main h1").inner_text(), "Übersicht vor Abgabe")
      ok("Hotellerie" in page.locator("main").inner_text(), "Berufsgruppe in der Übersicht")
      page.get_by_role("button", name="Berufsgruppe ändern").click()
      ok(page.evaluate("document.querySelector('input[name=gruppe]:checked').value") == "hotellerie", "Berufsgruppe bleibt gewählt")
      click_opt(page, "gruppe", "arztdienst")
      page.get_by_role("button", name="Zur Übersicht").click()
      ok("Arztdienst" in page.locator("main").inner_text(), "geänderte Berufsgruppe in der Übersicht")
      html = page.content()
      ok(page.locator(".tag--correct, .explanation, details.fb").count() == 0, "keine Lösungsmarkierungen vor der Abgabe")
      ok(all(t not in html for t in ["Gemeinschaft bleibt ein Angebot", "Mundbefeuchtung", "rund 25 g"]), "keine Begründungstexte im Browser vor der Abgabe")
      page.screenshot(path=f"{OUT}/desktop-07-uebersicht.png", full_page=True)
      page.get_by_role("button", name="Frage 5 ändern").click()
      ok("Frage 5 von 16" in page.locator("#progress-label").inner_text(), "«Ändern» springt zur Frage")
      click_opt(page, "q05", "a")
      page.get_by_role("button", name="Zur Übersicht").click()
      ok("Übersicht" in page.locator("main h1").inner_text(), "zurück zur Übersicht")
      before = len(dump()["Teilnahmen"])
      page.locator("#submit-btn").dblclick()
      expect(page.locator("main .saved")).to_contain_text("Erfolgreich gespeichert", timeout=10000)
      d = dump()
      ok(len(d["Teilnahmen"]) == before + 1, "Doppelklick erzeugt genau eine Abgabe")
      t = d["Teilnahmen"][-1]
      ok(t[4] == 10 and t[5] == 11, f"serverseitige Punkte 10/11 (Frage 5 falsch) – erhalten {t[4]}/{t[5]}")
      ok(t[3] == "NEIN", "keine Testdaten ohne ?test=1")
      ok(t[7] == "Arztdienst", f"Berufsgruppe gespeichert ({t[7]})")
      ok(any(r[3] == "q16" and r[4] == "=1+1 Schöpfen von Pürierkost" for r in d["Freitexte"]), "Freitext als Text gespeichert")
      # Ergebnis
      res = page.locator("main").inner_text()
      ok("Deine Lernrückmeldung" in res and "Begründung" in res, "Lernrückmeldung mit Begründungen")
      ok("10 von 11" in res, "Punkte angezeigt (nachrangig)")
      ok("Schätzung" in res and "25 g" in res, "Frage 13: Schätzung erläutert")
      ok(page.locator("details.fb", has_text="Kalbsadrio").locator(".chip").inner_text() == "Schätzaufgabe · nicht bewertet", "Frage 13 nicht als richtig/falsch markiert")
      ok(page.locator("details.fb", has_text="Kalbsadrio").locator(".tag--correct").count() == 0, "Fotoantworten ohne «Zutreffend»")
      ok(page.locator("details.fb", has_text="Verdacht auf eine Schluckstörung").get_attribute("open") is not None, "falsch beantwortete Frage aufgeklappt")
      page.screenshot(path=f"{OUT}/desktop-08-rueckmeldung.png", full_page=True)
      # Übung
      page.get_by_role("button", name="Übungsdurchlauf starten").click()
      ok(page.locator("#practice-banner").is_visible(), "Übungsbanner sichtbar")
      next_btn(page)
      ok("Frage 1 von 13" in page.locator("#progress-label").inner_text(), "Übung umfasst 13 Fragen")
      page.locator("main .nav .btn--ghost").click()
      fill_all(page)
      page.locator("#submit-btn").click()
      ok("nicht gespeichert" in page.locator("main").inner_text(), "Übungsergebnis als nicht gespeichert gekennzeichnet")
      ok("11 von 11" in page.locator("main .scorecard").inner_text(), "Übung lokal bewertet")
      ok(len(dump()["Teilnahmen"]) == before + 1, "Übungsdurchlauf erzeugt KEINE Abgabe")
      page.get_by_role("button", name="Zur Startseite").click()
      page.get_by_role("button", name="Rückmeldung ansehen").click()
      ok("10 von 11" in page.locator("main .scorecard").inner_text(), "ursprüngliche Rückmeldung bleibt nach Übung erhalten")
      page.reload()
      ok(page.locator("main").count() == 1 and "Lernrückmeldung" in page.locator("main").inner_text() or "abgeschlossen" in page.locator("main").inner_text(), "Neuladen behält Zustand")
      ctx.close()

      # ------------------------------------------------------------------
      section("B  Verbindungsfehler und erneutes Senden")
      for m, label in [("down", "Server nicht erreichbar"), ("afterwrite", "Antwort geht nach dem Speichern verloren"), ("nocors", "unlesbare Antwort (ohne CORS)")]:
          ctx = browser.new_context(viewport={"width": 1024, "height": 800})
          page = ctx.new_page(); page.set_default_timeout(8000)
          page.goto(BASE + "?test=1")
          page.get_by_role("button", name="Quiz starten").click()
          ok(page.locator("#test-banner").is_visible(), f"[{m}] Testmodus-Banner")
          fill_all(page)
          before = len(dump()["Teilnahmen"])
          mode(m)
          page.locator("#submit-btn").click()
          expect(page.locator("#submit-status .notice--danger")).to_be_visible(timeout=15000)
          txt = page.locator("#submit-status").inner_text()
          ok("nicht bestätigt" in txt, f"[{m}] {label}: Speicherung nicht bestätigt gemeldet")
          ok(page.locator("main .saved").count() == 0, f"[{m}] kein «Erfolgreich gespeichert»")
          ok(page.locator("#submit-btn").inner_text() == "Erneut senden", f"[{m}] Knopf «Erneut senden»")
          after_fail = len(dump()["Teilnahmen"])
          if m == "down": ok(after_fail == before, f"[{m}] nichts gespeichert")
          else: ok(after_fail == before + 1, f"[{m}] Server hatte bereits gespeichert, Browser erhielt keine lesbare Bestätigung")
          if m == "down": page.screenshot(path=f"{OUT}/desktop-09-verbindungsfehler.png", full_page=True)
          mode("normal")
          page.locator("#submit-btn").click()
          expect(page.locator("main .saved")).to_contain_text("Erfolgreich gespeichert", timeout=10000)
          ok(len(dump()["Teilnahmen"]) == before + 1, f"[{m}] nach erneutem Senden genau eine Abgabe")
          last = dump()["Teilnahmen"][-1]
          ok(last[3] == "JA", f"[{m}] als Testdaten markiert")
          ctx.close()

      # ------------------------------------------------------------------
      section("C  Smartphone (390 × 844) und Tablet (820 × 1180)")
      for vp, tag in [({"width": 390, "height": 844}, "mobile"), ({"width": 820, "height": 1180}, "tablet")]:
          ctx = browser.new_context(viewport=vp, device_scale_factor=2, is_mobile=(tag == "mobile"), has_touch=True)
          page = ctx.new_page(); page.set_default_timeout(8000)
          page.goto(BASE)
          no_overflow(page, f"{tag} Startseite")
          page.screenshot(path=f"{OUT}/{tag}-01-start.png", full_page=True)
          page.get_by_role("button", name="Quiz starten").click()
          no_overflow(page, f"{tag} Berufsgruppe")
          page.screenshot(path=f"{OUT}/{tag}-00-berufsgruppe.png", full_page=True)
          click_opt(page, "gruppe", "pflege"); next_btn(page)
          next_btn(page)
          h = page.locator('label[for="q01-a"]').bounding_box()
          ok(h["height"] >= 48, f"{tag}: grosse Antwortfläche ({h['height']:.0f}px)")
          fs = page.locator('label[for="q01-a"] .text').evaluate("e => parseFloat(getComputedStyle(e).fontSize)")
          ok(fs >= 16, f"{tag}: Schrift ≥ 16px ({fs})")
          shots = {"q08": f"{tag}-02-frage8", "q12": f"{tag}-03-frage12", "q14": f"{tag}-04-frage14", "q15": f"{tag}-05-frage15"}
          page.locator("main .nav .btn--ghost").click()
          fill_all(page, shots)
          no_overflow(page, f"{tag} Übersicht")
          page.screenshot(path=f"{OUT}/{tag}-06-uebersicht.png", full_page=True)
          page.locator("#submit-btn").click()
          expect(page.locator("main .saved")).to_be_visible(timeout=10000)
          no_overflow(page, f"{tag} Rückmeldung")
          page.screenshot(path=f"{OUT}/{tag}-07-rueckmeldung.png", full_page=True)
          ctx.close()

      # ------------------------------------------------------------------
      section("D  Reduzierte Bewegung")
      ctx = browser.new_context(reduced_motion="reduce")
      page = ctx.new_page(); page.goto(BASE)
      an = page.locator("main .screen").evaluate("e => getComputedStyle(e).animationName")
      ok(an == "none", f"keine Animation bei reduzierter Bewegung ({an})")
      ctx.close()
      ctx = browser.new_context(); page = ctx.new_page(); page.goto(BASE)
      ok(page.locator("main .screen").evaluate("e => getComputedStyle(e).animationName") == "enter", "dezente Animation sonst aktiv")
      ctx.close()

      browser.close()

finally:
    srv.terminate()
real_errors = [e for e in console_errors if "Failed to load resource" not in e and "ERR_" not in e and "CORS" not in e and "Access-Control" not in e]
ok(real_errors == [], "keine JavaScript-Fehler in der Konsole: " + "; ".join(real_errors[:3]))
print(("\n✓" if not failed else "\n✗") + f" {passed} Browserprüfungen bestanden, {failed} fehlgeschlagen")
sys.exit(1 if failed else 0)
