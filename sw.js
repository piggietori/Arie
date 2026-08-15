'use strict';

var CACHE_NAME = 'arie-plan-v1';
var PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  './icons/apple-touch-icon.png',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(PRECACHE_URLS);
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (names) {
      return Promise.all(
        names
          .filter(function (name) { return name !== CACHE_NAME; })
          .map(function (name) { return caches.delete(name); })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function (event) {
  var request = event.request;
  if (request.method !== 'GET') return;

  var isSameOrigin = new URL(request.url).origin === self.location.origin;

  if (isSameOrigin) {
    // Network-first: prefer fresh content while the site is reachable,
    // fall back to the cached app shell once it isn't (offline, or the
    // repo has gone private and Pages stops serving it).
    event.respondWith(
      fetch(request).then(function (response) {
        var copy = response.clone();
        caches.open(CACHE_NAME).then(function (cache) { cache.put(request, copy); });
        return response;
      }).catch(function () {
        return caches.match(request).then(function (cached) {
          return cached || caches.match('./index.html');
        });
      })
    );
  } else {
    // Cross-origin (fonts): cache-first — a cached font is always still
    // valid, no need to revalidate against the network.
    event.respondWith(
      caches.match(request).then(function (cached) {
        if (cached) return cached;
        return fetch(request).then(function (response) {
          var copy = response.clone();
          caches.open(CACHE_NAME).then(function (cache) { cache.put(request, copy); });
          return response;
        });
      })
    );
  }
});
