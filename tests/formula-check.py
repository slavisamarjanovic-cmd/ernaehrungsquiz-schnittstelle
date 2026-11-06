"""
Prüft die Auswertungsformeln aus Setup.gs mit LibreOffice:
  1. Export der nachgebildeten Tabelle (tests/export-for-formula-check.js)
  2. Aufbau einer .xlsx-Datei mit denselben Formeln und benannten Bereichen
  3. Berechnung durch LibreOffice (headless)
  4. Vergleich mit einer unabhängigen Nachrechnung aus den Rohdaten

Grenzen: FILTER und SORT kennt LibreOffice 24.2 nicht; diese Zellen
(Freitext-Liste, sortierte Hindernisse im Dashboard) werden hier nicht
geprüft. Aufruf:  python3 tests/formula-check.py /tmp/dump.json
"""
import json, os, re, subprocess, sys, tempfile, shutil
from collections import Counter
from openpyxl import Workbook, load_workbook
from openpyxl.workbook.defined_name import DefinedName
from openpyxl.utils import get_column_letter

dump = json.load(open(sys.argv[1]))
V = dump["__version"]
KEY = dump["__key"]

UNSUPPORTED = ("FILTER(", "SORT(")
skipped = []
def calc(dump, overrides=None):
  """Baut die xlsx-Datei, lässt LibreOffice rechnen und gibt das Ergebnis zurück."""
  overrides = overrides or {}
  wb = Workbook(); wb.remove(wb.active)
  skipped.clear()
  for name, cells in dump.items():
    if name.startswith("__"): continue
    ws = wb.create_sheet(name)
    for r, c, v, isf in cells:
        if (name, r, c) in overrides: v, isf = overrides[(name, r, c)], False
        if isf:
            f = v
            if any(u in f for u in UNSUPPORTED):
                skipped.append(f"{name}!{get_column_letter(c)}{r}"); continue
            f = re.sub(r"\bMAXIFS\(", "_xlfn.MAXIFS(", f)
            ws.cell(row=r, column=c, value=f)
        else:
            ws.cell(row=r, column=c, value=v)
  for n, (sh, r, c) in dump["__names"].items():
    ref = f"'{sh}'!${get_column_letter(c)}${r}"
    wb.defined_names[n] = DefinedName(n, attr_text=ref)
  tmp = tempfile.mkdtemp()
  src = os.path.join(tmp, "in.xlsx"); wb.save(src)
  outdir = os.path.join(tmp, "out"); os.mkdir(outdir)
  subprocess.run(["soffice", "--headless", "--calc", "--convert-to", "xlsx", "--outdir", outdir, src],
                 check=True, capture_output=True, timeout=180)
  out = load_workbook(os.path.join(outdir, "in.xlsx"), data_only=True)
  shutil.rmtree(tmp)
  return out

res = calc(dump)

# ---------- unabhängige Nachrechnung ----------
def rows(sheet):
    m = {}
    for r, c, v, isf in dump[sheet]:
        if r == 1: continue
        m.setdefault(r, {})[c] = v
    return [m[k] for k in sorted(m)]

A = [r for r in rows("Antworten") if r.get(2) == V and r.get(3) == "NEIN"]
O = [r for r in rows("Optionen") if r.get(2) == V and r.get(3) == "NEIN"]
T = rows("Teilnahmen")

fails = 0; checks = 0
def check(label, got, exp):
    global fails, checks
    checks += 1
    if isinstance(exp, float) and isinstance(got, (int, float)):
        good = abs(got - exp) < 1e-9
    else:
        good = got == exp
    if not good:
        fails += 1; print(f"  ✗ {label}: LibreOffice={got!r} erwartet={exp!r}")

def find_row(ws, col, value, start=1):
    for r in range(start, ws.max_row + 1):
        if ws.cell(r, col).value == value: return r
    return None

# Kopfbereich
W = res["Auswertung Wissen"]
real_v = [t for t in T if t.get(2) == V and t.get(4) == "NEIN"]
check("Teilnahmen (Version, ohne Test)", W["B3"].value, len(real_v))
check("andere Versionen", W["B4"].value, len([t for t in T if t.get(4) == "NEIN"]) - len(real_v))
check("Testdaten", W["B5"].value, len([t for t in T if t.get(4) == "JA"]))
check("Durchschnitt Punkte", W["B6"].value, sum(t[5] for t in real_v) / len(real_v))
check("Max Punkte", W["B7"].value, 11)

# Je Frage
hdr = find_row(W, 1, "Nr")
for qid, k in KEY.items():
    if not k["correct"]: continue
    r = find_row(W, 1, k["nr"], hdr + 1)
    qa = [x for x in A if x.get(4) == qid]
    n = len(qa); c = Counter(x.get(8) for x in qa)
    check(f"{qid} n", W.cell(r, 3).value, n)
    check(f"{qid} richtig", W.cell(r, 4).value, c["richtig"])
    check(f"{qid} falsch", W.cell(r, 5).value, c["falsch"])
    check(f"{qid} weiss nicht", W.cell(r, 6).value, c["weiss_nicht"])
    check(f"{qid} Anteil richtig", W.cell(r, 7).value, c["richtig"] / n)
    check(f"{qid} Anteil unsicher", W.cell(r, 9).value, c["weiss_nicht"] / n)

# Optionsanalyse
ohdr = find_row(W, 3, "Option")
r = ohdr + 1
for qid, k in KEY.items():
    if not k["correct"] or k["type"] != "multi": continue
    den = len([x for x in A if x.get(4) == qid and x.get(8) != "weiss_nicht"])
    for opt in [o for o in k["options"] if o != "weiss_nicht"]:
        oo = [x for x in O if x.get(4) == qid and x.get(5) == opt]
        c = Counter(x.get(8) for x in oo)
        check(f"{qid}/{opt} Nenner", W.cell(r, 5).value, den)
        if opt in k["correct"]:
            check(f"{qid}/{opt} korrekt gewählt", W.cell(r, 6).value, c["korrekt_gewaehlt"])
            check(f"{qid}/{opt} übersehen", W.cell(r, 8).value, c["uebersehen"])
            check(f"{qid}/{opt} Anteil übersehen", W.cell(r, 9).value, c["uebersehen"] / den)
            check(f"{qid}/{opt} korrekt+übersehen = Nenner", c["korrekt_gewaehlt"] + c["uebersehen"], den)
        else:
            check(f"{qid}/{opt} falsch gewählt", W.cell(r, 10).value, c["falsch_gewaehlt"])
            check(f"{qid}/{opt} Anteil falsch gewählt", W.cell(r, 11).value, c["falsch_gewaehlt"] / den)
        r += 1

# Fotos
F = res["Auswertung Fotos"]
for qid in ("q12", "q13"):
    k = KEY[qid]
    qa = [x for x in A if x.get(4) == qid]
    title_r = find_row(F, 1, None) # dummy
    start = None
    for rr in range(1, F.max_row + 1):
        v = F.cell(rr, 1).value
        if isinstance(v, str) and v.startswith(f"Frage {k['nr']} "): start = rr; break
    check(f"{qid} n", F.cell(start + 2, 2).value, len(qa))
    hr = start + 4
    for i, opt in enumerate(k["options"]):
        rr = hr + 1 + i
        sub = [x for x in qa if x.get(7) == opt]
        check(f"{qid}/{opt} Anzahl", F.cell(rr, 2).value, len(sub))
        for j, conf in enumerate(["sicher", "eher_sicher", "unsicher"]):
            check(f"{qid}/{opt}/{conf}", F.cell(rr, 4 + j).value, len([x for x in sub if x.get(10) == conf]))
        check(f"{qid}/{opt} ohne Angabe", F.cell(rr, 7).value, len([x for x in sub if not x.get(10)]))
    tr = hr + 1 + len(k["options"])
    check(f"{qid} Summe sicher", F.cell(tr, 4).value, len([x for x in qa if x.get(10) == "sicher"]))

# Praxis
P = res["Praxis und Schulungsbedarf"]
q14 = KEY["q14"]
hr = find_row(P, 1, "Information")
for i, row in enumerate(q14["rows"]):
    rr = hr + 1 + i
    sub = [x for x in A if x.get(4) == "q14" and x.get(5) == row]
    check(f"q14/{row} n", P.cell(rr, 2).value, len(sub))
    for j, opt in enumerate(q14["options"]):
        cnt = len([x for x in sub if x.get(7) == opt])
        check(f"q14/{row}/{opt}", P.cell(rr, 3 + j).value, cnt)
        check(f"q14/{row}/{opt} Anteil", P.cell(rr, 7 + j).value, cnt / len(sub))
hr15 = find_row(P, 1, "Hindernis")
n15 = len([x for x in A if x.get(4) == "q15"])
check("q15 n", P.cell(hr15 - 1, 2).value, n15)
for i, opt in enumerate(KEY["q15"]["options"]):
    cnt = len([x for x in O if x.get(4) == "q15" and x.get(5) == opt and x.get(6) == 1])
    check(f"q15/{opt}", P.cell(hr15 + 1 + i, 2).value, cnt)

# Dashboard
D = res["Dashboard"]
check("Dashboard Teilnahmen", D["B3"].value, len(real_v))
check("Dashboard Anteil richtig", D["B4"].value, (sum(t[5] for t in real_v) / len(real_v)) / 11)
first = find_row(D, 14, "Frage")
for i, (qid, k) in enumerate([(q, k) for q, k in KEY.items() if k["correct"]]):
    qa = [x for x in A if x.get(4) == qid]
    check(f"Dashboard {qid} Anteil richtig", D.cell(first + 1 + i, 15).value, len([x for x in qa if x.get(8) == "richtig"]) / len(qa))

# Berufsgruppen-Vergleich
GR = res["Auswertung Berufsgruppen"]
MIN = 5
groups = [g["label"] for g in dump["__groups"]]
t1 = find_row(GR, 1, "Berufsgruppe") + 1
check("Gruppen: Zeile Alle", GR.cell(t1, 1).value, "Alle")
check("Gruppen: Alle n", GR.cell(t1, 2).value, len(real_v))
qcols = {}
for i, g in enumerate(groups):
    rr = t1 + 1 + i
    tg = [t for t in real_v if t.get(8) == g]
    check(f"Gruppe {g} n", GR.cell(rr, 2).value, len(tg))
    if len(tg) < MIN:
        check(f"Gruppe {g} ausgeblendet (<{MIN})", GR.cell(rr, 5).value, "–")
    else:
        check(f"Gruppe {g} Ø Anteil richtig", GR.cell(rr, 5).value, sum(t[5] for t in tg) / len(tg) / 11)
        check(f"Gruppe {g} Anteil weiss nicht", GR.cell(rr, 6).value, sum(t[7] for t in tg) / (len(tg) * 11))
small = [g for g in groups if 0 < len([t for t in real_v if t.get(8) == g]) < MIN]
big = [g for g in groups if len([t for t in real_v if t.get(8) == g]) >= MIN]
check("Testdaten enthalten kleine und grosse Gruppen", bool(small) and bool(big), True)
mr = find_row(GR, 1, "Anteil richtig je Frage") + 3
hdr_cols = [GR.cell(mr - 1, c).value for c in range(1, len(groups) + 3)]
for qi, (qid, k) in enumerate([(q, k) for q, k in KEY.items() if k["correct"]]):
    for g in big + small:
        col = hdr_cols.index(g) + 1
        qa = [x for x in A if x.get(4) == qid and x.get(12) == g]
        got = GR.cell(mr + qi, col).value
        if g in small: check(f"Matrix {qid}/{g} ausgeblendet", got, "–")
        else: check(f"Matrix {qid}/{g} Anteil richtig", got, len([x for x in qa if x.get(8) == "richtig"]) / len(qa))
hr = find_row(GR, 1, "Hindernisse (Frage 15)") + 3
for oi, opt in enumerate(KEY["q15"]["options"]):
    g = big[0]; col = hdr_cols.index(g) + 1
    n15g = len([x for x in A if x.get(4) == "q15" and x.get(12) == g])
    cnt = len([x for x in O if x.get(4) == "q15" and x.get(5) == opt and x.get(6) == 1 and x.get(9) == g])
    check(f"Hindernis {opt}/{g}", GR.cell(hr + oi, col).value, cnt / n15g)
h14 = find_row(GR, 1, "Orientierung im Betrieb (Frage 14): braucht Hilfe oder weiss nicht, wo suchen") + 3
for ri, row in enumerate(KEY["q14"]["rows"]):
    g = big[0]; col = hdr_cols.index(g) + 1
    sub = [x for x in A if x.get(4) == "q14" and x.get(5) == row and x.get(12) == g]
    check(f"Orientierung {row}/{g}", GR.cell(h14 + ri, col).value, len([x for x in sub if x.get(7) in ("hilfe", "weiss_nicht_wo")]) / len(sub))

# Filter «Ausgewertete Berufsgruppe» = grösste Gruppe → alle Auswertungsblätter gefiltert
fg = big[0]
r6 = [c for c in dump["Einstellungen"] if c[0] == 6 and c[1] == 2][0]
res2 = calc(dump, {("Einstellungen", 6, 2): fg})
W2 = res2["Auswertung Wissen"]
tg = [t for t in real_v if t.get(8) == fg]
check(f"Filter {fg}: Teilnahmen", W2["B3"].value, len(tg))
check(f"Filter {fg}: Durchschnitt Punkte", W2["B6"].value, sum(t[5] for t in tg) / len(tg))
Ag = [x for x in A if x.get(12) == fg]
hdr2 = find_row(W2, 1, "Nr")
for qid, k in KEY.items():
    if not k["correct"]: continue
    r = find_row(W2, 1, k["nr"], hdr2 + 1)
    qa = [x for x in Ag if x.get(4) == qid]
    check(f"Filter {fg}: {qid} richtig", W2.cell(r, 4).value, len([x for x in qa if x.get(8) == "richtig"]))
P2 = res2["Praxis und Schulungsbedarf"]
h15 = find_row(P2, 1, "Hindernis")
check(f"Filter {fg}: Frage 15 n", P2.cell(h15 - 1, 2).value, len([x for x in Ag if x.get(4) == "q15"]))
check(f"Filter {fg}: Dashboard Teilnahmen", res2["Dashboard"]["B3"].value, len(tg))
sg = small[0]
res3 = calc(dump, {("Einstellungen", 6, 2): sg})
warn = None
for rr in range(2, 12):
    v = res3["Auswertung Wissen"].cell(rr, 2).value
    if isinstance(v, str) and v.startswith("Achtung"): warn = v
check(f"Filter {sg} (<{MIN}): Warnhinweis", bool(warn), True)
check("ohne Filter: kein Warnhinweis", any(isinstance(W.cell(rr, 2).value, str) and W.cell(rr, 2).value.startswith("Achtung") for rr in range(2, 12)), False)

# Fehlerwerte irgendwo?
errs = []
for ws in res.worksheets:
    for row in ws.iter_rows():
        for cell in row:
            if isinstance(cell.value, str) and (cell.value.startswith("#") or cell.value.startswith("Err:")):
                errs.append(f"{ws.title}!{cell.coordinate}={cell.value}")
check("keine Fehlerwerte in berechneten Zellen", errs, [])

print(f"Nicht in LibreOffice prüfbar (FILTER/SORT): {', '.join(skipped)}")
print(("✓" if not fails else "✗") + f" {checks - fails} von {checks} Formelprüfungen bestanden")
sys.exit(1 if fails else 0)
