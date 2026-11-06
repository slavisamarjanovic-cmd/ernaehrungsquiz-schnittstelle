/*
 * Lokaler Testserver für den Browsertest (tests/e2e.py).
 *  :8100  statische Quizseite (config.js zeigt auf :8101)
 *  :8101  «script.google.com»: POST /exec führt die echte Code.gs aus
 *         (mit nachgebildetem Sheets) und antwortet wie Apps Script mit
 *         302 auf eine einmalige Adresse einer ANDEREN Herkunft.
 *  :8102  «script.googleusercontent.com»: liefert die JSON-Antwort per GET.
 * Steuerung: GET :8101/__mode?m=normal|down|afterwrite|nocors, GET :8101/__dump
 */
"use strict";
const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { createContext } = require("./gas-mock");

const ROOT = path.join(__dirname, "..");
const env = createContext();
env.ctx.einrichten();
let mode = "normal";
const echo = new Map();

const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".jpg": "image/jpeg", ".svg": "image/svg+xml" };

http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]);
  if (p === "/") p = "/index.html";
  if (p === "/assets/js/config.js") {
    res.writeHead(200, { "Content-Type": TYPES[".js"] });
    res.end('window.QUIZ_CONFIG = { ENDPOINT_URL: "http://127.0.0.1:8101/macros/s/TEST/exec", SURVEY_CODE_REQUIRED: false, REQUEST_TIMEOUT_MS: 8000 };');
    return;
  }
  const f = path.join(ROOT, path.normalize(p));
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { "Content-Type": TYPES[path.extname(f)] || "application/octet-stream" });
  fs.createReadStream(f).pipe(res);
}).listen(8100, "127.0.0.1");

http.createServer((req, res) => {
  const url = new URL(req.url, "http://x");
  if (url.pathname === "/__mode") { mode = url.searchParams.get("m"); res.end("ok"); return; }
  if (url.pathname === "/__dump") {
    const out = {};
    ["Teilnahmen", "Antworten", "Optionen", "Freitexte"].forEach(n => { out[n] = env.ss.getSheetByName(n).rows(); });
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(out));
    return;
  }
  if (req.method === "OPTIONS") { res.writeHead(405); res.end(); return; } // Apps Script beantwortet keine Vorabanfragen
  if (req.method !== "POST" || url.pathname !== "/macros/s/TEST/exec") { res.writeHead(404); res.end(); return; }
  let body = "";
  req.on("data", c => { body += c; });
  req.on("end", () => {
    if (mode === "down") { req.socket.destroy(); return; }
    const out = env.ctx.doPost({ postData: { contents: body, type: req.headers["content-type"], length: body.length } });
    if (mode === "afterwrite") { req.socket.destroy(); return; }
    const key = crypto.randomBytes(12).toString("hex");
    echo.set(key, out.getContent());
    res.writeHead(302, { Location: "http://localhost:8102/macros/echo?user_content_key=" + key, "Access-Control-Allow-Origin": "*" });
    res.end();
  });
}).listen(8101, "127.0.0.1");

http.createServer((req, res) => {
  const url = new URL(req.url, "http://x");
  if (req.method !== "GET") { res.writeHead(405); res.end(); return; }
  const key = url.searchParams.get("user_content_key");
  const content = echo.get(key);
  echo.delete(key);
  const headers = { "Content-Type": "application/json; charset=utf-8" };
  if (mode !== "nocors") headers["Access-Control-Allow-Origin"] = "*";
  res.writeHead(content ? 200 : 404, headers);
  res.end(content || "");
}).listen(8102, "127.0.0.1");

console.log("bereit");
