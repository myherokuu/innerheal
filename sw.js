const V='innerflow-v1';
const CACHE=['./','./index.html','./manifest.webmanifest','./icon-192.png','./icon-512.png'];
self.addEventListener('install',e=>{
  e.waitUntil(caches.open(V).then(c=>c.addAll(CACHE)));
  self.skipWaiting();
});
self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==V).map(k=>caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  e.respondWith(
    caches.match(e.request).then(hit=>hit||fetch(e.request).then(res=>{
      const copy=res.clone();
      caches.open(V).then(c=>c.put(e.request,copy));
      return res;
    }).catch(()=>caches.match('./index.html')))
  );
});
self.addEventListener('push',e=>{
  let data={title:'Inner Flow',body:'',icon:'icon-192.png',badge:'icon-192.png'};
  try{const j=e.data?e.data.json():{};data=Object.assign({},data,j);}catch(err){data.body=e.data?e.data.text():'';}
  e.waitUntil(self.registration.showNotification(data.title,{body:data.body,icon:data.icon,badge:data.badge,data:data.data||{url:'index.html'},tag:data.tag||'pf'}));
});
self.addEventListener('notificationclick',e=>{
  e.notification.close();
  const url=e.notification.data&&e.notification.data.url?e.notification.data.url:'index.html';
  e.waitUntil(clients.matchAll({type:'window'}).then(list=>{
    for(const c of list){if('focus' in c){c.navigate(url);return c.focus();}}
    return clients.openWindow(url);
  }));
});