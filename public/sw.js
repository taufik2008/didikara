const CACHE_NAME = "ailms-v5";
const STATIC_ASSETS = ["/manifest.json"];
// Hanya cache aset statis (gambar, font) — JANGAN cache JS/CSS chunks karena berubah tiap build
const CACHE_PATTERNS = [/\.(?:png|jpg|jpeg|svg|gif|ico|woff2?)$/];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const { request } = e;
  if (request.method !== "GET") return;

  const shouldCache = CACHE_PATTERNS.some(p => p.test(request.url));

  if (shouldCache) {
    e.respondWith(
      caches.match(request).then(cached => cached || fetch(request).then(res => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(request, clone));
        return res;
      }))
    );
    return;
  }

  // Network-first untuk API
  if (request.url.includes("/api/")) {
    e.respondWith(
      fetch(request).catch(() => new Response(JSON.stringify({ error: "Offline", offline: true }), {
        headers: { "Content-Type": "application/json" }
      }))
    );
  }
});

// Push notification handler
self.addEventListener("push", (e) => {
  const data = e.data?.json() || { title: "AI LMS", body: "Ada notifikasi baru" };
  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: { url: data.url || "/" },
      actions: [{ action: "open", title: "Buka" }],
    })
  );
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(clients.openWindow(e.notification.data?.url || "/"));
});
