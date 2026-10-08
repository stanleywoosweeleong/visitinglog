import {createClient} from 'npm:@supabase/supabase-js@2.117.3';
const origin='https://stanleywoosweeleong.github.io';
const headers={'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'POST,OPTIONS','Content-Type':'application/json'};
const response=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers});
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers});
 if(req.method!=='POST')return response({error:'Method not allowed'},405);
 const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}});
 const token=req.headers.get('authorization')?.replace(/^Bearer /i,'');if(!token)return response({error:'Sign in required'},401);
 const {data:{user},error:authError}=await db.auth.getUser(token);if(authError||!user)return response({error:'Sign in required'},401);
 const {data:member}=await db.from('memberships').select('user_id').eq('user_id',user.id).maybeSingle();if(!member)return response({error:'Team access required'},403);
 const {data:config}=await db.from('server_settings').select('value').eq('name','translator').maybeSingle();if(!config)return response({configured:false,error:'Translation service not configured'},503);
 let body;try{body=await req.json();}catch{return response({error:'Invalid JSON'},400);}
 const {note='',advice='',source}=body;if(!['en','ms','zh'].includes(source)||typeof note!=='string'||typeof advice!=='string'||note.length+advice.length>12000)return response({error:'Invalid note or language; maximum 12000 characters'},400);
 const {count,error:limitError}=await db.from('translation_requests').select('id',{count:'exact',head:true}).eq('user_id',user.id).gte('created_at',new Date(Date.now()-60000).toISOString());if(limitError)return response({error:'Translation service busy'},503);if((count||0)>=20)return response({error:'Please retry later'},429);
 const {error:logError}=await db.from('translation_requests').insert({user_id:user.id,characters:(note.length+advice.length)*2});if(logError)return response({error:'Translation service busy'},503);
 const code:Record<string,string>={en:'en',ms:'ms',zh:'zh-Hans'},targets=Object.keys(code).filter(k=>k!==source),parts=[{key:'note',text:note},{key:'advice',text:advice}].filter(p=>p.text.trim());
 const translations:Record<string,unknown>={[source]:{note,advice}};
 for(const target of targets)translations[target]={note:'',advice:''};
 if(!parts.length)return response({translations});
 const url=new URL('https://api.cognitive.microsofttranslator.com/translate');url.searchParams.set('api-version','3.0');url.searchParams.set('from',code[source]);for(const target of targets)url.searchParams.append('to',code[target]);
 const h:Record<string,string>={'Content-Type':'application/json','Ocp-Apim-Subscription-Key':config.value.key};if(config.value.region)h['Ocp-Apim-Subscription-Region']=config.value.region;
 try{const upstream=await fetch(url,{method:'POST',headers:h,body:JSON.stringify(parts.map(p=>({Text:p.text}))),signal:AbortSignal.timeout(15000)});if(!upstream.ok)return response({error:'Translation provider unavailable'},503);const results=await upstream.json();for(let i=0;i<parts.length;i++)for(const tr of results[i].translations||[]){const target=targets.find(k=>code[k]===tr.to);if(target)(translations[target] as Record<string,string>)[parts[i].key]=tr.text;}return response({translations,automaticallyTranslated:true});}catch{return response({error:'Translation provider unavailable'},503);}
});
