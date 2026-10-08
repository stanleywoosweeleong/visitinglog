import {createClient} from 'npm:@supabase/supabase-js@2.117.3';
const headers={'Access-Control-Allow-Origin':'https://stanleywoosweeleong.github.io','Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'POST,OPTIONS','Content-Type':'application/json'};
const reply=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers});
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers});
 if(req.method!=='POST')return reply({error:'Method not allowed'},405);
 const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}}),token=req.headers.get('authorization')?.replace(/^Bearer /i,'');
 if(!token)return reply({error:'Sign in required'},401);
 const {data:{user},error}=await db.auth.getUser(token);if(error||!user)return reply({error:'Sign in required'},401);
 const {data:member}=await db.from('memberships').select('role').eq('user_id',user.id).maybeSingle();if(member?.role!=='admin')return reply({error:'Administrator required'},403);
 let body;try{body=await req.json();}catch{return reply({error:'Invalid request'},400);}
 if(body.status){const {data}=await db.from('server_settings').select('name').eq('name','translator').maybeSingle();return reply({configured:!!data});}
 if(body.freeTier!==true)return reply({error:'Confirm that the Azure resource uses F0 Free before connecting.'},400);
 const {key,region=''}=body;if(typeof key!=='string'||key.length<16||key.length>200||typeof region!=='string'||!/^[a-z0-9-]*$/.test(region))return reply({error:'Valid Translator key and region required'},400);
 const h:Record<string,string>={'Content-Type':'application/json','Ocp-Apim-Subscription-Key':key};if(region)h['Ocp-Apim-Subscription-Region']=region;
 try{const test=await fetch('https://api.cognitive.microsofttranslator.com/translate?api-version=3.0&from=en&to=ms',{method:'POST',headers:h,body:JSON.stringify([{Text:'Hello'}]),signal:AbortSignal.timeout(15000)});if(!test.ok)return reply({error:'The translation service could not verify this key and region'},400);
 const {error:saveError}=await db.from('server_settings').upsert({name:'translator',value:{key,region}});if(saveError)return reply({error:'Configuration could not be saved'},500);return reply({configured:true});}catch{return reply({error:'Translation service unavailable'},503);}
});
