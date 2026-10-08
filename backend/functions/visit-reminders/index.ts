import {createClient} from 'npm:@supabase/supabase-js@2.101.0';
import webpush from 'npm:web-push@3.6.7';
const allowedHosts=['fcm.googleapis.com','updates.push.services.mozilla.com','web.push.apple.com'];
const endpointAllowed=(endpoint:string)=>{try{const u=new URL(endpoint);return u.protocol==='https:'&&(allowedHosts.includes(u.hostname)||u.hostname.endsWith('.notify.windows.com'));}catch{return false;}};
Deno.serve(async req=>{
 const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}});
 const {data:settings,error:configError}=await db.from('server_settings').select('value').eq('name','push').single();
 if(configError||!settings)return new Response('Not configured',{status:503});
 const config=settings.value;
 if(req.headers.get('x-cron-secret')!==config.cronSecret)return new Response('Unauthorised',{status:401});
 const {data:subscriptions,error:subError}=await db.from('push_subscriptions').select('*');
 if(subError)return new Response('Subscription lookup failed',{status:500});
 let delivered=0,failed=0;
 for(const sub of subscriptions||[]){if(!endpointAllowed(sub.endpoint))continue;
  const {data:member}=await db.from('memberships').select('org_id').eq('user_id',sub.user_id).maybeSingle();if(!member)continue;
  const {data:visits,error}=await db.from('records').select('*').eq('owner_id',sub.user_id).eq('org_id',member.org_id).eq('kind','visit').not('payload->>next','is',null);
  if(error){failed++;continue;}
  for(const visit of visits||[]){const v=visit.payload;if(v.deletedAt||v.purged||v.nextCompleted)continue;
   const next=new Date(v.next),reminder=Math.max(0,Math.min(7,Number(v.reminder??1))),due=new Date(+next-reminder*86400000),now=Date.now();
   if(!Number.isFinite(+due)||+due>now||+next<now)continue;
   const scheduled=next.toISOString();const {data:previous}=await db.from('reminder_deliveries').select('*').eq('subscription_id',sub.id).eq('visit_id',visit.id).eq('scheduled_for',scheduled).maybeSingle();
   if(previous&&(previous.status==='sent'||now-+new Date(previous.attempted_at)<600000))continue;
   if(previous)await db.from('reminder_deliveries').delete().eq('subscription_id',sub.id).eq('visit_id',visit.id).eq('scheduled_for',scheduled);
   const {error:claimError}=await db.from('reminder_deliveries').insert({subscription_id:sub.id,visit_id:visit.id,scheduled_for:scheduled});if(claimError)continue;
   const {data:farm}=await db.from('records').select('payload').eq('id',v.farmId).eq('org_id',member.org_id).maybeSingle();
   const title=({en:'Your next farm visit',ms:'Lawatan ladang seterusnya',zh:'您的下次农场走访'} as Record<string,string>)[sub.language]||'Your next farm visit';
   const date=new Intl.DateTimeFormat(({en:'en-MY',ms:'ms-MY',zh:'zh-CN'} as Record<string,string>)[sub.language],{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Kuala_Lumpur'}).format(next);
   const payload=JSON.stringify({title,body:`${farm?.payload?.name||'Ladang'} · ${date}`,visitId:visit.id,tag:`visit-${visit.id}-${scheduled}`});
   try{await webpush.sendNotification({endpoint:sub.endpoint,keys:sub.keys},payload,{TTL:3600,vapidDetails:{subject:'mailto:standphoto@gmail.com',publicKey:config.publicKey,privateKey:config.privateKey}});await db.from('reminder_deliveries').update({status:'sent'}).eq('subscription_id',sub.id).eq('visit_id',visit.id).eq('scheduled_for',scheduled);delivered++;}
   catch(err){failed++;if([404,410].includes(err.statusCode))await db.from('push_subscriptions').delete().eq('id',sub.id);else await db.from('reminder_deliveries').update({status:'failed'}).eq('subscription_id',sub.id).eq('visit_id',visit.id).eq('scheduled_for',scheduled);}
  }
 }
 return Response.json({delivered,failed});
});
