const CACHE='tann-egg-heist-v3';
const CORE=['./','./index.html','./style.css','./game.js','./manifest.json','./icon.svg'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).then(x=>{if(x.ok||x.type==='opaque'){const cp=x.clone();caches.open(CACHE).then(c=>c.put(e.request,cp))}return x}).catch(()=>caches.match('./index.html'))))});
