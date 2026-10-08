import {test,expect} from '@playwright/test';
const project='https://uqstiltepalfvydwynkr.supabase.co';
const member={user_id:'11111111-1111-4111-8111-111111111111',org_id:'22222222-2222-4222-8222-222222222222',display_name:'Pilot staff',role:'staff'};
async function mockAccount(context,rows,images){
 await context.addInitScript(({member})=>{const user={id:member.user_id,email:'pilot@example.invalid',aud:'authenticated',role:'authenticated'};const expiry=Math.floor(Date.now()/1000)+3600;const token=btoa(JSON.stringify({alg:'HS256',typ:'JWT'}))+'.'+btoa(JSON.stringify({sub:user.id,exp:expiry,role:'authenticated'}))+'.test';localStorage.setItem('sb-uqstiltepalfvydwynkr-auth-token',JSON.stringify({access_token:token,refresh_token:'test-refresh',token_type:'bearer',expires_in:3600,expires_at:expiry,user}));},{member});
 await context.route(project+'/**',async route=>{const req=route.request(),url=new URL(req.url());const json=value=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(value)});
  if(url.pathname.includes('/memberships'))return json([member]);
  if(url.pathname.includes('/rpc/save_record')){const r=req.postDataJSON(),old=rows.get(r.record_id),revision=(old?.revision||0)+1;rows.set(r.record_id,{id:r.record_id,kind:r.record_kind,owner_id:member.user_id,org_id:member.org_id,payload:r.record_payload,revision,updated_at:new Date().toISOString()});return json(revision);}
  if(url.pathname.includes('/records')){const id=url.searchParams.get('id')?.replace('eq.','');return json(id?rows.get(id):[...rows.values()]);}
  if(url.pathname.includes('/storage/v1/object/')){const path=decodeURIComponent(url.pathname.split('visit-photos/')[1]);if(req.method()==='POST'){images.set(path,req.postDataBuffer());return json({Key:'visit-photos/'+path});}return route.fulfill({status:images.has(path)?200:404,contentType:'image/jpeg',body:images.get(path)||Buffer.from('missing')});}
  if(url.pathname.includes('/functions/'))return route.fulfill({status:503,body:'Translation pending'});
  return json({});
 });
}
test('team sync verifies private photos before cleanup and restores for viewing',async({browser})=>{
 const context=await browser.newContext({baseURL:'http://127.0.0.1:4173',timezoneId:'Asia/Kuala_Lumpur'}),rows=new Map(),images=new Map();await mockAccount(context,rows,images);const page=await context.newPage();
 await page.goto('/');await expect(page.locator('#syncStatus')).toContainText('Team records synced');await page.getByRole('button',{name:'Farms',exact:true}).click();await page.getByRole('button',{name:'Add farm',exact:true}).click();await page.locator('[name=name]').fill('Shared orchard');await page.getByRole('button',{name:'Save',exact:true}).click();
 await expect.poll(()=>rows.size).toBe(1);await page.getByRole('button',{name:'Add a discovery',exact:true}).click();await page.locator('[name=note]').fill('Team observation');
 const photo=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=20;c.height=20;return c.toDataURL('image/jpeg').split(',')[1];});await page.locator('#photos').setInputFiles({name:'photo.jpg',mimeType:'image/jpeg',buffer:Buffer.from(photo,'base64')});await expect(page.locator('#photoPreview img')).toHaveCount(1);await page.getByRole('button',{name:'Save',exact:true}).click();await expect.poll(()=>rows.size).toBe(2);await expect(page.locator('#syncStatus')).toContainText('Team records synced');
 const visit=[...rows.values()].find(r=>r.kind==='visit');expect(visit.payload.photos[0].data).toBeUndefined();expect(visit.payload.photos[0].sha256).toMatch(/^[a-f0-9]{64}$/);expect(images.size).toBe(1);
 await page.getByRole('button',{name:'Settings & backup',exact:true}).click();await page.locator('#cleanup').click();await expect(page.locator('.toast')).toContainText('Records with verified photo copies removed: 1');
 await page.getByRole('button',{name:'Visit notebook',exact:true}).click();await expect(page.locator('.thumbs img')).toHaveCount(0);await page.getByRole('button',{name:'Visit summary',exact:true}).click();await expect(page.locator('dialog .thumbs img')).toHaveCount(1);await context.close();
});
test('upgrading a previous offline notebook preserves its records',async({page})=>{
 await page.addInitScript(()=>{if(!sessionStorage.getItem('seeded')){sessionStorage.setItem('seeded','1');const open=indexedDB.open('ladang-notebook',1);open.onupgradeneeded=()=>{const db=open.result;db.createObjectStore('records',{keyPath:'id'});db.createObjectStore('settings');};open.onsuccess=()=>{const db=open.result;const tx=db.transaction('records','readwrite');tx.objectStore('records').put({id:'old-farm',kind:'farm',name:'Existing offline orchard'});tx.oncomplete=()=>db.close();};}});
 await page.goto('/');await page.getByRole('button',{name:'Farms',exact:true}).click();await expect(page.getByRole('heading',{name:'Existing offline orchard',exact:true})).toBeVisible();
});
