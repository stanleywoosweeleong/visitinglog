import {createClient} from 'npm:@supabase/supabase-js@2.117.3';
import {cleanupPhotos} from './cleanup.ts';
const headers={'Access-Control-Allow-Origin':'https://stanleywoosweeleong.github.io','Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'POST,OPTIONS','Content-Type':'application/json'};
const reply=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers});
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers});if(req.method!=='POST')return reply({error:'Method not allowed'},405);
 const token=req.headers.get('authorization')?.replace(/^Bearer /i,'');if(!token)return reply({error:'Sign in required'},401);
 const url=Deno.env.get('SUPABASE_URL')!,service=createClient(url,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}});
 const {data:{user},error:authError}=await service.auth.getUser(token);if(authError||!user)return reply({error:'Sign in required'},401);
 const {data:member}=await service.from('memberships').select('role').eq('user_id',user.id).maybeSingle();if(member?.role!=='admin')return reply({error:'Administrator required'},403);
 let body;try{body=await req.json();}catch{return reply({error:'Invalid request'},400);}
 if(body.confirmation!=='DELETE'||typeof body.id!=='string'||!Number.isInteger(body.revision))return reply({error:'Confirm permanent deletion'},400);
 const client=createClient(url,Deno.env.get('SUPABASE_ANON_KEY')!,{auth:{persistSession:false},global:{headers:{Authorization:'Bearer '+token}}});
 const {data,error}=await client.rpc('purge_record',{record_id:body.id,expected_revision:body.revision});if(error)return reply({error:error.message},400);
 let photosPending=true;try{photosPending=(await cleanupPhotos(service,body.id))>0;}catch{/* Scheduler retries protected cleanup jobs. */}
 return reply({...data,photosPending});
});
