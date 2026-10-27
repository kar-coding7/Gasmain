/* Jembatan mabar: meniru antarmuka claude.use("room") supaya kode game tetap sama. */
(function () {
  const post = (u, b) => fetch(u, {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify(b)}).then(r => r.json());
  let bar = null, barT = 0;                              // banner status lawan (terputus / keluar)
  function note(txt, ms) {
    if (!document.body) return;
    if (!bar) {
      bar = document.createElement("div"); bar.setAttribute("role", "status");
      bar.style.cssText = "position:fixed;left:50%;top:10px;transform:translateX(-50%);max-width:92vw;z-index:99999;padding:10px 16px;border-radius:12px;background:#1d1640;color:#fff;border:1px solid #ff4f8b;font:600 14px system-ui,sans-serif;text-align:center;box-shadow:0 6px 24px #0008;pointer-events:none";
      document.body.appendChild(bar);
    }
    clearTimeout(barT); bar.textContent = txt; bar.style.display = "block";
    if (ms) barT = setTimeout(() => { bar.style.display = "none"; }, ms);
  }
  const room = {
    async join(name) {
      name = String(name || "").trim().toLowerCase();
      let nm = "Pemain"; try { nm = localStorage.getItem("gasmain_nama") || nm; } catch (e) {}
      const r = await post("/api/enter", {room: name, name: nm});
      if (r.err) throw new Error(r.err);
      const h = {}, gone = new Set(); let es = null, dead = false, max = 0;
      const emitP = d => (h["_p"] || []).forEach(f => f({data: d}));
      const bye = e => {                                  // tab ditutup: beri tahu server (bukan saat bfcache)
        if (dead || (e && e.persisted)) return; dead = true;
        try { navigator.sendBeacon("/api/leave", new Blob([JSON.stringify({room: name, pid: r.pid, token: r.token})], {type: "application/json"})); } catch (_) {}
      };
      addEventListener("pagehide", bye);
      await new Promise((ok, no) => {
        es = new EventSource(`/api/events?room=${encodeURIComponent(name)}&pid=${r.pid}&token=${r.token}`);
        const t = setTimeout(() => no(new Error("timeout")), 8000);
        es.addEventListener("hello", e => { try { max = JSON.parse(e.data).max || max; } catch (_) {} clearTimeout(t); ok(); });
        es.addEventListener("msg", e => {
          const m = JSON.parse(e.data);
          (h[m.topic] || []).forEach(f => f({data: m.data, from: m.from, name: m.name, isMe: false}));
        });
        const peer = k => e => {
          let m = {}; try { m = JSON.parse(e.data); } catch (_) {}
          const w = max === 2 ? "Lawan" : (m.name || "Pemain");
          if (k === "away") { if (!gone.has(m.id)) note(w + " terputus. Menunggu tersambung kembali...", 0); return; }
          if (k === "back") { if (!gone.has(m.id)) note(w + " tersambung kembali.", 3000); return; }
          if (gone.has(m.id)) return; gone.add(m.id);       // "left": hindari notifikasi ganda
          note(m.reason === "timeout" ? "Koneksi " + w.toLowerCase() + " terputus terlalu lama. " + w + " dianggap meninggalkan permainan." : w + " telah meninggalkan permainan.", 0);
          emitP({t: "left", reason: m.reason, name: m.name, id: m.id});
        };
        ["away", "back", "left"].forEach(k => es.addEventListener(k, peer(k)));
      });
      return {
        on(topic, fn) { (h[topic] = h[topic] || []).push(fn); },
        emit(topic, data) { return post("/api/send", {room: name, pid: r.pid, token: r.token, topic, data}); },
        leave() { dead = true; removeEventListener("pagehide", bye); if (es) es.close(); return post("/api/leave", {room: name, pid: r.pid, token: r.token}).catch(() => {}); }
      };
    }
  };
  window.claude = {use: async n => n === "room" ? room : null};
})();
