const CACHE='mcp-v2.3-current-match';
const FILES=['./','./index.html','./style.css','./app.js','./manifest.json','./logo.png','./sw.js'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
 if(e.request.method!=='GET')return;
 const u=new URL(e.request.url);
 const shell=u.origin===location.origin && /\/(index\.html|app\.js|style\.css|manifest\.json|sw\.js|logo\.png)$/.test(u.pathname);
 if(shell){e.respondWith(fetch(e.request,{cache:'no-store'}).then(r=>{if(r.ok){const c=r.clone();caches.open(CACHE).then(k=>k.put(e.request,c))}return r}).catch(()=>caches.match(e.request).then(r=>r||caches.match('./index.html'))));return}
 e.respondWith(caches.match(e.request).then(x=>x||fetch(e.request).then(r=>{if(r.ok&&u.origin===location.origin){const c=r.clone();caches.open(CACHE).then(k=>k.put(e.request,c))}return r}).catch(()=>caches.match('./index.html'))))
});