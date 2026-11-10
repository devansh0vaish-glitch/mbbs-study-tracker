const C="mbbs-v35";
self.addEventListener("install",e=>{self.skipWaiting();e.waitUntil(caches.open(C).then(c=>c.addAll(["./","index.html","style.css","app.js","syllabus.js","manifest.json"])))});
self.addEventListener("activate",e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))).then(()=>clients.claim())));
self.addEventListener("fetch",e=>{const u=new URL(e.request.url);if(e.request.method!=="GET"||(u.origin!==location.origin&&u.hostname!=="cdn.jsdelivr.net"))return;e.respondWith(fetch(e.request).then(r=>{const cp=r.clone();caches.open(C).then(c=>c.put(e.request,cp));return r}).catch(()=>caches.match(e.request)))});
