importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js');

const V='innerflow-v5';
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
  const url=e.request.url;
  if(e.request.method!=='GET')return;
  if(/^https?:/i.test(url)===false)return;
  const st=url.indexOf(self.location.origin);
  if(st!==0)return;
  const isDoc=e.request.mode==='navigate';
  if(isDoc){
    e.respondWith(fetch(e.request).then(res=>{
      const copy=res.clone();
      caches.open(V).then(c=>c.put(e.request,copy));
      return res;
    }).catch(()=>caches.match('./index.html')));
    return;
  }
  e.respondWith(
    caches.match(e.request).then(hit=>hit||fetch(e.request).then(res=>{
      const copy=res.clone();
      caches.open(V).then(c=>c.put(e.request,copy));
      return res;
    }).catch(()=>caches.match('./index.html')))
  );
});
self.addEventListener('push',e=>{
  let j=null;
  try{j=e.data?e.data.json():null;}catch(err){j=null;}
  if(j&&j.data&&j.data.oneSignalNotification)return;
  let data={title:'Inner Flow',body:'',icon:'icon-192.png',badge:'icon-192.png'};
  data=Object.assign({},data,j||{});
  e.waitUntil(self.registration.showNotification(data.title,{body:data.body,icon:data.icon,badge:data.badge,data:data.data||{url:'index.html'},tag:data.tag||'pf'}));
});
self.addEventListener('notificationclick',e=>{
  e.notification.close();
  if(e.notification.data&&e.notification.data.oneSignalNotification)return;
  const url=e.notification.data&&e.notification.data.url?e.notification.data.url:'index.html';
  e.waitUntil(clients.matchAll({type:'window'}).then(list=>{
    for(const c of list){if('focus' in c){c.navigate(url);return c.focus();}}
    return clients.openWindow(url);
  }));
});