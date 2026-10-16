const VER = "streaming-v1";
const SHELL = ["./", "index.html", "manifest.webmanifest", "icon-192.png", "icon-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VER).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(ks => Promise.all(ks.filter(k => k !== VER).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const r = e.request;
  if (r.method !== "GET") return;
  const u = new URL(r.url);

  // Datos en vivo de Firebase: nunca se cachean
  if (/firestore\.googleapis\.com|identitytoolkit|securetoken|firebasestorage|googleapis\.com\/(identitytoolkit|v1)/.test(u.host + u.pathname)) return;

  // Librerías de Firebase (gstatic): caché primero, para abrir rápido y sin internet
  if (u.host === "www.gstatic.com") {
    e.respondWith(
      caches.open(VER).then(c => c.match(r).then(hit => hit || fetch(r).then(res => { if (res.ok) c.put(r, res.clone()); return res; })))
    );
    return;
  }

  // Tu página: red primero (siempre ves la versión nueva), caché si no hay internet
  if (u.origin === location.origin) {
    e.respondWith(
      fetch(r).then(res => {
        if (res.ok) { const cp = res.clone(); caches.open(VER).then(c => c.put(r, cp)); }
        return res;
      }).catch(() => caches.match(r).then(h => h || caches.match("index.html")))
    );
  }
});
