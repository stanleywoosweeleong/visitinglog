export async function cleanupPhotos(db:any,recordId?:string){
 let query=db.from('purge_jobs').select('record_id,prefix').order('created_at').limit(20);
 if(recordId)query=query.eq('record_id',recordId);
 const {data:jobs,error}=await query;if(error)throw Error('Photo cleanup unavailable');
 const bucket=db.storage.from('visit-photos');let pending=0;
 for(const job of jobs||[]){let complete=false;
  for(let round=0;round<10;round++){
   const {data:files,error:listError}=await bucket.list(job.prefix,{limit:100});if(listError)break;
   if(!files?.length){complete=true;break;}
   const {error:deleteError}=await bucket.remove(files.map((f:any)=>job.prefix+'/'+f.name));if(deleteError)break;
  }
  if(complete){const {error:removeJobError}=await db.from('purge_jobs').delete().eq('record_id',job.record_id);if(removeJobError)pending++;}else pending++;
 }
 return pending;
}
