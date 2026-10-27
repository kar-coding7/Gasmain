"use strict";
// GasMain server: file statis + relay mabar (SSE). Tanpa dependensi, cukup Node.js 18+.
const http = require("http"), fs = require("fs"), path = require("path"), crypto = require("crypto");
const PORT = process.env.PORT || 3000, PUB = path.join(__dirname, "public");
const MIME = {".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json",".svg":"image/svg+xml",".png":"image/png",".ico":"image/x-icon"};
const MAXP = {ttt:2, c4:2, bs:2, oth:2};            // awalan nama room -> jumlah pemain maksimal (lainnya 4)
const rooms = new Map();                             // nama room -> {max, players:Map, created}
const now = () => Date.now(), rnd = () => crypto.randomBytes(8).toString("hex");
const cleanName = s => String(s || "").replace(/[^A-Za-z0-9 ]/g, "").trim().slice(0, 12) || "Pemain";
const validRoom = n => typeof n === "string" && /^[a-z0-9][a-z0-9-]{2,31}$/.test(n);
const json = (res, code, o) => { res.writeHead(code, {"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}); res.end(JSON.stringify(o)); };
const sse = (p, ev, data) => { if (p.res && !p.res.writableEnded) p.res.write(`event: ${ev}\ndata: ${JSON.stringify(data)}\n\n`); };
const auth = b => { const r = rooms.get(b.room), p = r && r.players.get(b.pid); return p && p.token === b.token ? [r, p] : [null, null]; };
function body(req) {
  return new Promise((ok, no) => {
    let d = "";
    req.on("data", c => { d += c; if (d.length > 20000) { no(new Error("terlalu besar")); req.destroy(); } });
    req.on("end", () => { try { ok(JSON.parse(d || "{}")); } catch (e) { no(e); } });
    req.on("error", no);
  });
}
function removePlayer(r, name, p) {
  r.players.delete(p.id);
  if (p.res) { try { p.res.end(); } catch (e) {} }
  r.players.forEach(q => sse(q, "left", {id: p.id, name: p.name}));
  if (!r.players.size) rooms.delete(name);
}
async function api(req, res, url) {
  const u = new URL(req.url, "http://x");
  if (req.method === "GET" && url === "/api/events") {
    const [r, p] = auth({room: u.searchParams.get("room"), pid: u.searchParams.get("pid"), token: u.searchParams.get("token")});
    if (!p) { res.writeHead(404); return res.end(); }
    res.writeHead(200, {"Content-Type":"text/event-stream","Cache-Control":"no-cache, no-transform","Connection":"keep-alive","X-Accel-Buffering":"no"});
    res.write("retry: 2000\n\n");
    if (p.res) { try { p.res.end(); } catch (e) {} }
    p.res = res; p.off = 0; sse(p, "hello", {count: r.players.size});
    req.on("close", () => { if (p.res === res) { p.res = null; p.off = now(); } });
    return;
  }
  if (req.method !== "POST") return json(res, 405, {err: "metode"});
  const b = await body(req);
  if (url === "/api/enter") {
    if (!validRoom(b.room)) return json(res, 400, {err: "Kode room tidak valid"});
    let r = rooms.get(b.room);
    if (!r) {
      if (rooms.size >= 500) return json(res, 503, {err: "Server sedang penuh"});
      r = {max: MAXP[b.room.split("-")[0]] || 4, players: new Map(), created: now()};
      rooms.set(b.room, r);
    }
    if (r.players.size >= r.max) return json(res, 409, {err: "Room sudah penuh"});
    const p = {id: rnd(), token: rnd(), name: cleanName(b.name), res: null, off: now(), n: 0, t0: now()};
    r.players.set(p.id, p);
    return json(res, 200, {pid: p.id, token: p.token, count: r.players.size});
  }
  const [r, p] = auth(b);
  if (!p) return json(res, 404, {err: "Room tidak ditemukan"});
  if (url === "/api/send") {
    const t = now(); if (t - p.t0 > 1000) { p.t0 = t; p.n = 0; }
    if (++p.n > 40) return json(res, 429, {err: "Terlalu cepat"});
    if (typeof b.topic !== "string" || b.topic.length > 20) return json(res, 400, {err: "topik"});
    const payload = {topic: b.topic, data: b.data, from: p.id, name: p.name};
    if (JSON.stringify(payload).length > 16000) return json(res, 413, {err: "pesan terlalu besar"});
    r.players.forEach(q => { if (q !== p) sse(q, "msg", payload); });
    return json(res, 200, {ok: 1});
  }
  if (url === "/api/leave") { removePlayer(r, b.room, p); return json(res, 200, {ok: 1}); }
  json(res, 404, {err: "tidak dikenal"});
}
function serve(req, res) {
  let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (p.endsWith("/")) p += "index.html";
  const f = path.normalize(path.join(PUB, p));
  if (!f.startsWith(PUB)) { res.writeHead(403); return res.end(); }
  fs.readFile(f, (e, d) => {
    if (e) { res.writeHead(404, {"Content-Type":"text/plain; charset=utf-8"}); return res.end("Tidak ditemukan"); }
    res.writeHead(200, {"Content-Type": MIME[path.extname(f)] || "application/octet-stream", "Cache-Control": "no-cache"});
    res.end(d);
  });
}
const server = http.createServer((req, res) => {
  const url = req.url.split("?")[0];
  if (url === "/health") return json(res, 200, {ok: 1, rooms: rooms.size});
  if (url.startsWith("/api/")) return api(req, res, url).catch(() => { if (!res.headersSent) json(res, 400, {err: "permintaan salah"}); });
  serve(req, res);
});
setInterval(() => {                                   // detak jantung SSE
  rooms.forEach(r => r.players.forEach(p => { if (p.res && !p.res.writableEnded) p.res.write(":\n\n"); }));
}, 20000);
setInterval(() => {                                   // bersihkan pemain yang offline > 60 detik dan room lama
  rooms.forEach((r, name) => {
    r.players.forEach(p => { if (p.off && now() - p.off > 60000) removePlayer(r, name, p); });
    if (rooms.has(name) && now() - r.created > 6 * 3600 * 1000) { r.players.forEach(p => { try { p.res && p.res.end(); } catch (e) {} }); rooms.delete(name); }
  });
}, 10000);
server.listen(PORT, "0.0.0.0", () => console.log("GasMain jalan di http://localhost:" + PORT));
