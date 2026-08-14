const CACHE='mcp-v5';
const FILES=['./','./index.html','./style.css','./app.js','./manifest.json'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET') return;
  const url=new URL(e.request.url);
  const shell=url.origin===location.origin && /\/(index\.html|app\.js|style\.css|manifest\.json|sw\.js)$/.test(url.pathname);
  if(shell){
    e.respondWith(fetch(e.request,{cache:'no-store'}).then(r=>{
      if(r.ok){const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));}
      return r;
    }).catch(()=>caches.match(e.request).then(r=>r||caches.match('./index.html'))));
    return;
  }
  e.respondWith(caches.match(e.request).then(x=>x||fetch(e.request).then(r=>{
    if(r.ok&&url.origin===location.origin){const q=r.clone();caches.open(CACHE).then(c=>c.put(e.request,q));}
    return r;
  }).catch(()=>caches.match('./index.html'))));
});
