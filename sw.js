const CACHE_NAME = 'dupla-financeira-v3.8';
const ASSETS_TO_CACHE = [
  'index.html',
  'style.css',
  'app.js',
  'photo.jpg',
  'icons/icon-72x72.png',
  'icons/icon-96x96.png',
  'icons/icon-128x128.png',
  'icons/icon-144x144.png',
  'icons/icon-152x152.png',
  'icons/icon-192x192.png',
  'icons/icon-384x384.png',
  'icons/icon-512x512.png',
  'manifest.json',
  'https://cdn.jsdelivr.net/npm/chart.js/dist/chart.min.js'
];

// Instalação do Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
});

// Ativação do Service Worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Estratégia: Cache-first
self.addEventListener('fetch', (event) => {
  // Ignorar requisições do Firebase
  if (event.request.url.includes('firebase') || 
      event.request.url.includes('googleapis') || 
      event.request.url.includes('gstatic')) {
    return fetch(event.request);
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Retorna a resposta em cache se existir
        if (response) {
          return response;
        }

        // Para requisições de navegação, retorna a página inicial
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }

        // Para outras requisições, busca na rede
        return fetch(event.request);
      })
  );
});

// Mensagem para atualizar o cache quando nova versão disponível
self.addEventListener('message', (event) => {
  if (event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
});
