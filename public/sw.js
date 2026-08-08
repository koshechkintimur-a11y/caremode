// SYNC service worker — CacheFirst для статики, network-only для API/навигации.
// v4: Web Push + инвалидация статики. ВАЖНО: бампать CACHE при каждом деплое,
// иначе браузер вечно отдаёт старые чанки (пользователь «не видит изменений»).
const CACHE = "sync-v26"; // ⚠️ БАМПАТЬ ПРИ КАЖДОМ ДЕПЛОЕ, иначе PWA-ярлык отдаёт старые чанки

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches
      .open(CACHE)
      .then((c) =>
        c.addAll(["/", "/manifest.json", "/icons/icon-192.png", "/icons/icon-512.png"])
      )
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    // удаляем ВСЕ старые кэши (включая sync-v1 и любые чужие)
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET") return;
  // API и навигация — только сеть (никакого кэша личных данных)
  if (url.pathname.startsWith("/api/") || e.request.mode === "navigate") return;
  e.respondWith(
    caches.match(e.request).then(
      (hit) =>
        hit ||
        fetch(e.request)
          .then((res) => {
            if (res.ok && url.origin === self.location.origin) {
              const clone = res.clone();
              caches.open(CACHE).then((c) => c.put(e.request, clone));
            }
            return res;
          })
          // сеть упала (рестарт сервера, офлайн) — тихо отдаём кэш, не сыпем ошибками
          .catch(() =>
            caches.match(e.request).then((h) => h ?? new Response("offline", { status: 503 }))
          )
    )
  );
});

// ===== Web Push =====
self.addEventListener("push", (e) => {
  let data = { title: "CareMode", body: "", url: "/today" };
  try {
    data = e.data ? JSON.parse(e.data.text()) : data;
  } catch {
    /* невалидный payload — дефолт */
  }
  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { url: data.url },
    })
  );
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || "/today";
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const c of clients) {
        if ("focus" in c) {
          c.navigate(url);
          return c.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
