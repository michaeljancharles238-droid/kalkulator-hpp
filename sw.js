/* Service worker Kalkulator HPP Warung.

   Halaman utama memakai strategi "jaringan dulu": setiap kali dibuka dalam keadaan
   online, versi terbaru dari server yang dipakai, dan salinannya disimpan untuk
   keadaan offline. Versi sebelumnya memakai "cache dulu", yang membuat perangkat
   tetap menjalankan aplikasi lama meski sudah ada pembaruan di server.

   Berkas pendukung (ikon, manifest, huruf, SDK Firebase) tetap "cache dulu"
   karena isinya tidak berubah dan memuatnya dari cache jauh lebih cepat.

   Naikkan nomor versi di bawah setiap kali index.html berubah. */
const CACHE = 'kalkulator-hpp-v6';

const ASET = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-512-maskable.png',
];

/* Huruf Google Fonts dan SDK Firebase — ikut disimpan agar tampilan tetap utuh
   dan sinkronisasi tetap hidup lewat cache lokal saat sinyal di warung hilang. */
const LUAR = ['fonts.googleapis.com', 'fonts.gstatic.com', 'www.gstatic.com'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(ASET))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  );
});

/* Halaman menanyakan versi cache yang sedang melayani, lalu menampilkannya di
   Pengaturan. Begitu nomornya beda dengan versi aplikasi, perangkat itu ketahuan
   masih memegang berkas lama. */
self.addEventListener('message', e => {
  if (e.data === 'versi' && e.ports && e.ports[0]) e.ports[0].postMessage(CACHE);
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(k => Promise.all(k.filter(n => n !== CACHE).map(n => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

/* Permintaan halaman: navigasi peramban, atau alamat akar / index.html */
function halamanUtama(req, url) {
  if (req.mode === 'navigate') return true;
  if (url.origin !== self.location.origin) return false;
  return url.pathname.endsWith('/') || url.pathname.endsWith('/index.html');
}

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  const milikSendiri = url.origin === self.location.origin;
  const luarDikenal = LUAR.indexOf(url.hostname) !== -1;
  if (!milikSendiri && !luarDikenal) return;

  // Halaman utama: coba jaringan dulu, jatuh ke cache kalau offline.
  if (halamanUtama(e.request, url)) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          if (res && res.status === 200) {
            const salinan = res.clone();
            caches.open(CACHE).then(c => c.put('./index.html', salinan)).catch(() => {});
          }
          return res;
        })
        .catch(() => caches.match('./index.html').then(r => r || caches.match('./')))
    );
    return;
  }

  // Sisanya: cache dulu, ambil dari jaringan kalau belum tersimpan.
  e.respondWith(
    caches.match(e.request).then(tersimpan => {
      if (tersimpan) return tersimpan;
      return fetch(e.request).then(res => {
        if (res && (res.status === 200 || res.type === 'opaque')) {
          const salinan = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, salinan)).catch(() => {});
        }
        return res;
      }).catch(() => undefined);
    })
  );
});
