import {openDB} from 'idb';
export const db=await openDB('ladang-notebook',2,{upgrade(db,oldVersion,newVersion,tx){if(oldVersion<1){db.createObjectStore('records',{keyPath:'id'});db.createObjectStore('settings');}if(oldVersion<2){const target=db.createObjectStore('scopedRecords',{keyPath:'cacheKey'});tx.objectStore('records').getAll().then(rows=>{for(const r of rows){const user=r.cacheUser||'personal';target.put({...r,cacheUser:user,cacheKey:`${user}:${r.id}`});}db.deleteObjectStore('records');});}}});
let scope='personal';
export const setScope=value=>{scope=value||'personal';};
export const getScope=()=>scope;
export const records=async()=>{const current=scope;return (await db.getAll('scopedRecords')).filter(r=>r.cacheUser===current);};
export const put=r=>db.put('scopedRecords',{...r,cacheUser:scope,cacheKey:`${scope}:${r.id}`});
export const remove=id=>db.delete('scopedRecords',`${scope}:${id}`);
export const setting=async(k,v)=>v===undefined?db.get('settings',k):db.put('settings',v,k);
