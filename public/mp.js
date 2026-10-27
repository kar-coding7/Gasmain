/* Jembatan mabar: meniru antarmuka claude.use("room") supaya kode game tetap sama. */
(function () {
  const post = (u, b) => fetch(u, {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify(b)}).then(r => r.json());
  const room = {
    async join(name) {
      let nm = "Pemain"; try { nm = localStorage.getItem("gasmain_nama") || nm; } catch (e) {}
      const r = await post("/api/enter", {room: name, name: nm});
      if (r.err) throw new Error(r.err);
      const h = {}; let es = null, dead = false;
      await new Promise((ok, no) => {
        es = new EventSource(`/api/events?room=${encodeURIComponent(name)}&pid=${r.pid}&token=${r.token}`);
        const t = setTimeout(() => no(new Error("timeout")), 8000);
        es.addEventListener("hello", () => { clearTimeout(t); ok(); });
        es.addEventListener("msg", e => {
          const m = JSON.parse(e.data);
          (h[m.topic] || []).forEach(f => f({data: m.data, from: m.from, name: m.name, isMe: false}));
        });
      });
      return {
        on(topic, fn) { (h[topic] = h[topic] || []).push(fn); },
        emit(topic, data) { return post("/api/send", {room: name, pid: r.pid, token: r.token, topic, data}); },
        leave() { dead = true; if (es) es.close(); return post("/api/leave", {room: name, pid: r.pid, token: r.token}).catch(() => {}); }
      };
    }
  };
  window.claude = {use: async n => n === "room" ? room : null};
})();
