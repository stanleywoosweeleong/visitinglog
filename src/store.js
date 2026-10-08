import {openDB} from 'idb';
export const db=await openDB('ladang-notebook',1,{upgrade(db){db.createObjectStore('records',{keyPath:'id'});db.createObjectStore('settings');}});
let scope='personal';
export const setScope=value=>{scope=value||'personal';};
export const records=async()=> (await db.getAll('records')).filter(r=>(r.cacheUser||'personal')===scope);
export const put=r=>db.put('records',{...r,cacheUser:scope});
export const remove=id=>db.delete('records',id);
export const setting=async(k,v)=>v===undefined?db.get('settings',k):db.put('settings',v,k);
