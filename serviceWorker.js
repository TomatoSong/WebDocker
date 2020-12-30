var CACHE_NAME = 'my-site-cache-v1';
var urlsToCache = [
  '/',
];

self.addEventListener('install', function(event) {
  // Perform install steps
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Connect to the channel named "my_bus".
var channel = new BroadcastChannel('my_bus');

self.addEventListener('fetch', function(event) {
 console.log(event.request.url);
 console.log(1)
 channel.postMessage({url: event.request.url});
 if(event.request.url == "https://qq.com/") {
   console.log(1111111)
   // Replace this with web docker socket output
   var p = Promise.resolve(new Response("<h1>Hello!</h1>", {
        headers: {'Content-Type': 'text/html', "Access-Control-Allow-Origin": "*"}
       }))
   event.respondWith(p)
 } else {
   event.respondWith(fetch(event.request))
 }
});

