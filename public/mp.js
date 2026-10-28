/* Jembatan mabar: meniru antarmuka claude.use("room") supaya kode game tetap sama. */
(function () {
  const post = (u, b) => fetch(u, {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify(b)}).then(r => r.json());
  const room = {
    async join(name) {
      let nm = "Pemain"; try { nm = localStorage.getItem("gasmain_nama") || nm; } catch (e) {}
      const r = await post("/api/enter", {room: name, name: nm});
      if (r.err) throw new Error(r.err);
      const h = {}, ph = []; let es = null, dead = false;
      await new Promise((ok, no) => {
        es = new EventSource(`/api/events?room=${encodeURIComponent(name)}&pid=${r.pid}&token=${r.token}`);
        es.addEventListener("peer", e => { try { const d = JSON.parse(e.data); ph.forEach(f => f(d)); } catch (_) {} });
        es.addEventListener("left", e => { try { const d = JSON.parse(e.data); d.state = "left"; ph.forEach(f => f(d)); } catch (_) {} });
        const t = setTimeout(() => no(new Error("timeout")), 8000);
        es.addEventListener("hello", () => { clearTimeout(t); ok(); });
        es.addEventListener("msg", e => {
          const m = JSON.parse(e.data);
          (h[m.topic] || []).forEach(f => f({data: m.data, from: m.from, name: m.name, isMe: false}));
        });
      });
      if (typeof window.addEventListener === "function") window.addEventListener("pagehide", ev => {
        if (!ev.persisted && !dead && navigator.sendBeacon) navigator.sendBeacon("/api/leave", new Blob([JSON.stringify({room: name, pid: r.pid, token: r.token})], {type: "application/json"}));
      });
      return {
        onPeer(fn) { ph.push(fn); },
        on(topic, fn) { (h[topic] = h[topic] || []).push(fn); },
        emit(topic, data) { return post("/api/send", {room: name, pid: r.pid, token: r.token, topic, data}); },
        leave() { dead = true; if (es) es.close(); return post("/api/leave", {room: name, pid: r.pid, token: r.token}).catch(() => {}); }
      };
    }
  };
  window.claude = {use: async n => n === "room" ? room : null};
})();
