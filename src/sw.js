import {precacheAndRoute,createHandlerBoundToURL} from 'workbox-precaching';
import {registerRoute,NavigationRoute} from 'workbox-routing';
import {clientsClaim} from 'workbox-core';
precacheAndRoute(self.__WB_MANIFEST);
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html')));
clientsClaim();
self.addEventListener('message',event=>{if(event.data?.type==='SKIP_WAITING')self.skipWaiting();});
self.addEventListener('push',event=>{let data;try{data=event.data.json();}catch{return;}event.waitUntil(self.registration.showNotification(data.title||'Ladang',{body:data.body||'',tag:data.tag||'ladang-visit',icon:'icon-192.png',data:{visitId:data.visitId}}));});
self.addEventListener('notificationclick',event=>{event.notification.close();const id=event.notification.data?.visitId;const url=self.registration.scope+(id?'?visit='+encodeURIComponent(id):'');event.waitUntil(clients.openWindow(url));});
