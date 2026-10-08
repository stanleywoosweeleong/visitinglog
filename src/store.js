import {openDB} from 'idb';
export const db=await openDB('ladang-notebook',1,{upgrade(db){db.createObjectStore('records',{keyPath:'id'});db.createObjectStore('settings');}});
export const records=()=>db.getAll('records');
export const put=r=>db.put('records',r);
export const remove=id=>db.delete('records',id);
export const setting=async(k,v)=>v===undefined?db.get('settings',k):db.put('settings',v,k);
