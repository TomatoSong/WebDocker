var CACHE_NAME = 'my-site-cache-v1';
var urlsToCache = ['/'];

self.addEventListener('install', function (event) {
    // Perform install steps
    event.waitUntil(
        caches.open(CACHE_NAME).then(function (cache) {
            return cache.addAll(urlsToCache);
        })
    );
});

self.addEventListener('fetch', function (event) {
    if (event.request.url == 'https://qq.com/') {
        // Replace this with web docker socket output
        var p = Promise.resolve(
            new Response('<h1>Hello!</h1>', {
                headers: {
                    'Content-Type': 'text/html',
                    'Access-Control-Allow-Origin': '*',
                },
            })
        );
        event.respondWith(p);
    } else {
        event.respondWith(fetch(event.request));
    }
});
