'use strict';
const CACHE='mashinsky-encrypted-remember-device-v2';
const FILES=["./app.webmanifest", "./atlas.css", "./clay.webmanifest", "./design-options.png", "./designs.html", "./forest.webmanifest", "./icons/clay-180.png", "./icons/clay-192.png", "./icons/clay-48.png", "./icons/clay-512.png", "./icons/forest-180.png", "./icons/forest-192.png", "./icons/forest-48.png", "./icons/forest-512.png", "./icons/modern-180.png", "./icons/modern-192.png", "./icons/modern-48.png", "./icons/modern-512.png", "./index.html", "./modern.webmanifest", "./research.html", "./robots.txt", "./shell.css", "./shell.js", "./vault.json", "./vault/atlas-2e9c648802dff6e2.txt"];
const SCOPE=new URL('./',self.location.href);
const ALLOWED=new Set(FILES.map(p=>new URL(p,SCOPE).pathname));
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(c=>Promise.allSettled(FILES.map(f=>c.add(f)))).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('mashinsky-encrypted-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);
 if(request.method!=='GET'||url.origin!==SCOPE.origin)return;
 const home=url.pathname===SCOPE.pathname||url.pathname===SCOPE.pathname+'index.html';
 if(!home&&!ALLOWED.has(url.pathname))return;
 const cacheKey=home?new URL('./index.html',SCOPE).href:url.origin+url.pathname;
 event.respondWith(fetch(request).then(response=>{if(response.ok){const copy=response.clone();caches.open(CACHE).then(c=>c.put(cacheKey,copy));}return response;}).catch(async()=>{const saved=await caches.match(cacheKey);return saved||new Response('Откройте атлас один раз при подключении к сети.',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}});}));
});
