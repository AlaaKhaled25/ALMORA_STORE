// Simple static-asset cache. Never cache HTML pages or private data.
const CACHE_NAME = "my-store-static-v1";
const OFFLINE_URL = "/offline.html";
const PRECACHE_URLS = [
  OFFLINE_URL,
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    self.caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    self.caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => self.caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

function matchesPath(pathname, base) {
  return pathname === base || pathname.startsWith(`${base}/`);
}

function isPrivatePath(pathname) {
  return (
    matchesPath(pathname, "/api") ||
    matchesPath(pathname, "/admin") ||
    matchesPath(pathname, "/cart") ||
    matchesPath(pathname, "/checkout") ||
    matchesPath(pathname, "/track") ||
    matchesPath(pathname, "/order") ||
    matchesPath(pathname, "/orders")
  );
}

function isStaticAsset(pathname) {
  return (
    pathname.startsWith("/_next/static/") ||
    pathname.startsWith("/icons/") ||
    pathname === "/favicon.ico"
  );
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Let private and order/tracking requests go straight to the network.
  // The SW neither caches nor intercepts them.
  if (isPrivatePath(url.pathname)) return;

  // Cache only static assets (built JS/CSS, fonts, icons).
  if (isStaticAsset(url.pathname)) {
    event.respondWith(
      self.caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;

        const response = await fetch(request);
        if (response.ok) {
          await cache.put(request, response.clone());
        }
        return response;
      }),
    );
    return;
  }

  // Page navigations are always fetched fresh. Offline shows a safe page.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => {
        const offline = await self.caches.match(OFFLINE_URL);
        return offline || new Response("Offline", { status: 503 });
      }),
    );
  }
});
