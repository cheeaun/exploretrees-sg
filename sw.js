importScripts('https://storage.googleapis.com/workbox-cdn/releases/4.2.0/workbox-sw.js');

// Don't need on local for now
workbox.setConfig({ debug: false });

workbox.googleAnalytics.initialize();

// "index" pages, e.g. index.html and /dir/xxx/
// - Assumes no '.' in file name
// - Works for hashes too, e.g.: /test#whatever
workbox.routing.registerRoute(
  /^[^\.]+(#.*)?$/,
  new workbox.strategies.NetworkFirst({
    cacheName: 'index',
  }),
);

workbox.routing.registerRoute(
  /\/.*\.(?:png|gif|jpg|jpeg|svg)$/,
  new workbox.strategies.CacheFirst({
    cacheName: 'images',
    plugins: [
      new workbox.expiration.Plugin({
        maxEntries: 60,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 Days
        purgeOnQuotaError: true,
      }),
      new workbox.cacheableResponse.Plugin({
        statuses: [0, 200]
      }),
    ],
  }),
);

workbox.routing.registerRoute(
  /\/.*\.mp$/,
  new workbox.strategies.CacheFirst({
    cacheName: 'data',
    plugins: [
      new workbox.expiration.Plugin({
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 Days
        purgeOnQuotaError: true,
      }),
      new workbox.cacheableResponse.Plugin({
        statuses: [0, 200]
      }),
    ],
  }),
);

workbox.routing.registerRoute(
  /.*api\.mapbox\.com\/fonts/,
  new workbox.strategies.CacheFirst({
    cacheName: 'mapbox-fonts',
    plugins: [
      new workbox.expiration.Plugin({
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 Days
        purgeOnQuotaError: true,
      }),
      new workbox.cacheableResponse.Plugin({
        statuses: [0, 200]
      }),
    ],
  }),
);

workbox.routing.registerRoute(
  /.*(?:tiles\.mapbox|api\.mapbox)\.com.*$/,
  new workbox.strategies.CacheFirst({
    cacheName: 'mapbox',
    plugins: [
      new workbox.expiration.Plugin({
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 Days
        purgeOnQuotaError: true,
      }),
      new workbox.cacheableResponse.Plugin({
        statuses: [0, 200]
      }),
    ],
  }),
);

workbox.routing.registerRoute(
  /.*(?:maps\.tilehosting|api\.maptiler)\.com.*$/,
  new workbox.strategies.CacheFirst({
    cacheName: 'maptiler',
    plugins: [
      new workbox.expiration.Plugin({
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 Days
        purgeOnQuotaError: true,
      }),
      new workbox.cacheableResponse.Plugin({
        statuses: [0, 200]
      }),
    ],
  }),
);