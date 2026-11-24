/* Service worker Kalkulator HPP Warung.
   Naikkan nomor versi di bawah setiap kali index.html berubah, supaya
   perangkat yang sudah memasang aplikasi ini mengambil versi baru. */
const CACHE = 'kalkulator-hpp-v1';

const ASET = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
];

/* Huruf diambil dari Google Fonts. Disimpan terpisah agar tampilan tetap
   utuh saat offline — tanpa ini, aplikasi offline jatuh ke huruf bawaan HP. */
const HURUF = ['fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(ASET))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(k => Promise.all(k.filter(n => n !== CACHE).map(n => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  const milikSendiri = url.origin === self.location.origin;
  const fontGoogle = HURUF.indexOf(url.hostname) !== -1;
  if (!milikSendiri && !fontGoogle) return;

  e.respondWith(
    caches.match(e.request).then(tersimpan => {
      if (tersimpan) return tersimpan;
      return fetch(e.request).then(res => {
        // Respons huruf bertipe opaque tetap berguna untuk dipakai offline.
        if (res && (res.status === 200 || res.type === 'opaque')) {
          const salinan = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, salinan)).catch(() => {});
        }
        return res;
      }).catch(() => milikSendiri ? caches.match('./index.html') : undefined);
    })
  );
});
