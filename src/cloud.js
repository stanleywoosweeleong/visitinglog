import {createClient} from '@supabase/supabase-js';
import {records,put,setting,setScope,remove} from './store';
import {projectUrl,publishableKey} from './config';
import {uploadPhotos,cloudPayload,restorePhotos,verifyPhoto} from './photos';
const url=import.meta.env.VITE_SUPABASE_URL||projectUrl,key=import.meta.env.VITE_SUPABASE_ANON_KEY||publishableKey;
export const cloud=url&&key?createClient(url,key):null;
export let membership=null;
let syncing=false;
export async function connect(){if(!cloud)return null;const {data:{session}}=await cloud.auth.getSession();setScope(session?.user?.id);if(!session){membership=null;return null;}const cacheKey=`membership:${session.user.id}`;if(!navigator.onLine){membership=await setting(cacheKey)||null;return membership;}const {data,error}=await cloud.from('memberships').select('*').eq('user_id',session.user.id).maybeSingle();if(error)throw error;membership=data;await setting(cacheKey,data);return data;}
export async function sync(){if(!cloud||!membership||!navigator.onLine||syncing)return;syncing=true;try{
 const local=(await records()).sort((a,b)=>(a.kind==='farm'?0:1)-(b.kind==='farm'?0:1));
 for(const record of local.filter(r=>r.dirty&&r.ownerId===membership.user_id)){
  const photos=await uploadPhotos(cloud,record,membership),candidate={...record,photos};
  const {data,error}=await cloud.rpc('save_record',{record_id:record.id,record_kind:record.kind,record_payload:cloudPayload(candidate),expected_revision:record.revision||0});
  if(error){if(error.message.includes('conflict')){await put({...record,conflict:true});continue;}throw error;}
  const latest=(await records()).find(r=>r.id===record.id);if(!latest)continue;
  const unchanged=latest.updatedAt===record.updatedAt;
  await put({...latest,photos:unchanged?photos:latest.photos,revision:data,dirty:!unchanged,conflict:false,syncedAt:new Date().toISOString()});
 }
 let offset=0;
 while(true){const {data,error}=await cloud.from('records').select('*').order('id').range(offset,offset+499);if(error)throw error;
  for(const row of data){const ours=(await records()).find(r=>r.id===row.id);if(row.payload.purged){if(ours)await remove(row.id);continue;}if(ours?.dirty)continue;
   const photos=(row.payload.photos||[]).map(p=>({...p,data:ours?.photos?.find(o=>o.id===p.id&&o.sha256===p.sha256)?.data}));
   let downloaded={...row.payload,id:row.id,kind:row.kind,ownerId:row.owner_id,revision:row.revision,photos,photosEvicted:ours?.photosEvicted||false,dirty:false,syncedAt:row.updated_at};
   if(!downloaded.photosEvicted)downloaded=await restorePhotos(cloud,downloaded);
   await put(downloaded);
  }
  if(data.length<500)break;offset+=500;
 }
 await setting(`lastSync:${membership.user_id}`,new Date().toISOString());
}finally{syncing=false;}}
export async function rehydrate(record){if(!(record.photos||[]).some(p=>!p.data))return record;if(!navigator.onLine)throw Error('Reconnect to download these photos first.');const restored=await restorePhotos(cloud,record);await put(restored);return restored;}
export async function freePhotoCopies(){if(!membership||!navigator.onLine)throw Error('Sign in and reconnect before freeing photo storage.');await sync();let count=0;
 for(const record of await records()){if(record.dirty||record.conflict||!record.syncedAt||!(record.photos||[]).some(p=>p.data))continue;
  const {data,error}=await cloud.from('records').select('revision,payload').eq('id',record.id).single();if(error)throw error;if(data.revision!==record.revision)continue;
  for(const photo of record.photos||[]){if(!data.payload.photos?.some(p=>p.id===photo.id&&p.sha256===photo.sha256))throw Error('Cloud photo metadata is not verified.');await verifyPhoto(cloud.storage.from('visit-photos'),photo);}
  await put({...record,photos:record.photos.map(({data,...p})=>p),photosEvicted:true});count++;
 }return count;
}
export async function translateRecord(record){if(!cloud||!membership||!navigator.onLine)return record;const {data,error}=await cloud.functions.invoke('translate-note',{body:{note:record.note,advice:record.advice,source:record.language}});if(error||!data?.translations)return record;return {...record,translations:data.translations};}
