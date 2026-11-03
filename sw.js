// Седжаро трекер: работа без интернета.
// Файлы приложения кэшируются при установке; при каждом открытии с интернетом
// кэш тихо обновляется, так что новая версия подхватится со следующего запуска.
const CACHE = "sejaro-v2";
const SHELL = ["./", "index.html", "manifest.webmanifest", "icon-180.png", "icon-192.png", "icon-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  const isFont = url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com";
  if (!sameOrigin && !isFont) return;

  e.respondWith(caches.open(CACHE).then(async cache => {
    const key = req.mode === "navigate" ? "index.html" : req;
    const cached = await cache.match(key, { ignoreSearch: true });
    const network = fetch(req).then(res => {
      if (res && (res.ok || res.type === "opaque")) cache.put(key, res.clone());
      return res;
    }).catch(() => null);
    if (cached) { e.waitUntil(network); return cached; }
    const res = await network;
    return res || new Response("Нет соединения", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }));
});
