import assert from 'node:assert/strict';
const suffix=Date.now().toString(36);
let checks=0;
const base=process.env.PILOT_URL||'https://folio-caprock-pilot.netlify.app';
async function call(path,body,method='GET',cookie='',origin=base){const response=await fetch(base+'/api/'+path,{method,headers:{...(cookie?{cookie}:{}),...(method!=='GET'?{Origin:origin}:{}),...(body instanceof FormData?{}:{'Content-Type':'application/json'})},body:method==='GET'?undefined:body instanceof FormData?body:JSON.stringify(body||{})});const type=response.headers.get('content-type')||'';const value=type.includes('application/json')?await response.json():await response.text();return {status:response.status,value,cookie:response.headers.get('set-cookie')?.split(';')[0]||''};}
function expect(value,expected,message){assert.equal(value,expected,message);checks++;}
try{
 expect((await call('dashboard')).status,401,'Private studio requires login');
 const a=await call('auth/register',{name:'Test Creator',handle:'pilot-'+suffix,email:'creator-'+suffix+'@example.invalid',password:'correct-test-password'},'POST');expect(a.status,200,'Account creation');assert.ok(a.cookie);checks++;
 const cookie=a.cookie;
 const b=await call('auth/register',{name:'Other Creator',handle:'other-'+suffix,email:'other-'+suffix+'@example.invalid',password:'other-test-password'},'POST');expect(b.status,200,'Second isolated account');
 expect((await call('auth/register',{name:'Duplicate',handle:'pilot-'+suffix,email:'new@example.invalid',password:'correct-test-password'},'POST')).status,409,'Handle uniqueness');
 expect((await call('store',{},'PATCH',cookie,'https://evil.test')).status,403,'Cross-origin mutation denied');
 const dash=(await call('dashboard',null,'GET',cookie)).value;expect(dash.products.length,3,'Realistic starter products');
 const invalid=await call('products',{title:'Missing file',description:'Requires file',type:'download',price:0,published:1},'POST',cookie);expect(invalid.status,400,'Cannot publish a download without a file');
 const form=new FormData();form.append('kind','product');form.append('file',new File(['name,value\nplan,real uploaded content\n'],'test.csv',{type:'text/csv'}));
 const file=await call('upload',form,'POST',cookie);expect(file.status,200,'File upload through Netlify to isolated durable storage');
 expect((await call('files/'+file.value.id)).status,403,'Unpurchased file denied');expect((await call('files/'+file.value.id,null,'GET',b.cookie)).status,403,'Other creator file denied');
 const product=await call('products',{title:'Real uploaded template',description:'A real test file',type:'download',price:0,file_id:file.value.id,published:1,cover:'',lessons:[]},'POST',cookie);expect(product.status,200,'Publish product');
 const publicP=(await call('products/'+product.value.id)).value;expect('file_id' in publicP.product,false,'File identity hidden in public product');expect('content' in publicP.product,false,'Lesson content hidden');
 expect((await call('products/'+product.value.id,{title:'Stolen'},'PATCH',b.cookie)).status,404,'Product ownership enforced');
 const order=await call('checkout',{product_id:product.value.id,name:'Sample Buyer',email:'buyer@example.invalid',price:999999},'POST');expect(order.status,200,'Genuine free checkout');const token=order.value.url.split('/').pop();
 const receipt=(await call('orders/'+token)).value;expect(receipt.order.status,'completed','Order completed');expect(receipt.order.amount,0,'Server price ignores client manipulation');
 const downloaded=await call('orders/'+token+'/download');expect(downloaded.status,200,'Authorized download');expect(downloaded.value,'name,value\nplan,real uploaded content\n','Uploaded bytes delivered unchanged');
 const defaultOrder=await call('checkout',{product_id:dash.products.find(p=>p.type==='download').id,name:'Planner Buyer',email:'planner@example.invalid'},'POST');expect((await call('orders/'+defaultOrder.value.url.split('/').pop()+'/download')).value.startsWith('Day,Prompt'),true,'Starter CSV delivery');
 const course=dash.products.find(p=>p.type==='course');const co=await call('checkout',{product_id:course.id,name:'Learner',email:'learner@example.invalid'},'POST');const ct=co.value.url.split('/').pop(),cr=(await call('orders/'+ct)).value;expect(cr.product.content.length,3,'Course lessons unlocked');
 const lesson=cr.product.content[0].id;expect((await call('progress/'+ct,{lesson_id:lesson,complete:true},'POST')).status,200,'Save course progress');expect((await call('orders/'+ct)).value.completed.includes(lesson),true,'Progress persists');expect((await call('progress/'+ct,{lesson_id:'forged-lesson',complete:true},'POST')).status,404,'Unknown lesson denied');
 const booking=dash.products.find(p=>p.type==='booking');const slot=(await call('slots/'+booking.id)).value.slots[0].id;const bookings=await Promise.all([call('checkout',{product_id:booking.id,name:'Booking One',email:'one@example.invalid',slot_id:slot},'POST'),call('checkout',{product_id:booking.id,name:'Booking Two',email:'two@example.invalid',slot_id:slot},'POST')]);expect(bookings.filter(r=>r.status===200).length,1,'Exactly one concurrent booking succeeds');expect(bookings.filter(r=>r.status===409).length,1,'Conflicting booking rejected');
 const bt=bookings.find(r=>r.status===200).value.url.split('/').pop();const calendar=await call('orders/'+bt+'/calendar');expect(calendar.status,200,'Booking calendar available');expect(calendar.value.includes('BEGIN:VEVENT'),true,'Valid calendar event');expect((await call('slots/'+booking.id)).value.slots.some(s=>s.id===slot),false,'Booked slot removed from availability');
 await call('products/'+product.value.id,{...publicP.product,price:2500,file_id:file.value.id,lessons:[]},'PATCH',cookie);expect((await call('checkout',{product_id:product.value.id,name:'Paid Buyer',email:'paid@example.invalid'},'POST')).status,503,'Paid checkout truthfully unavailable without Stripe');
 const demo=await call('auth/demo',{},'POST');expect(demo.status,200,'Isolated demo studio');const demoDash=(await call('dashboard',null,'GET',demo.cookie)).value;expect(demoDash.store.handle!==dash.store.handle,true,'Demo has its own storefront');
 const demoCourse=demoDash.products.find(p=>p.type==='course');const preview=await call('checkout',{product_id:demoCourse.id,name:'Preview Buyer',email:'preview@example.invalid',preview:true},'POST');expect(preview.status,200,'Explicit preview checkout works');expect((await call('orders/'+preview.value.url.split('/').pop())).value.order.demo,1,'Preview is marked separately');
 const before=(await call('dashboard',null,'GET',cookie)).value;expect(before.orders.some(o=>o.email==='preview@example.invalid'),false,'Customer records isolated');
 await call('auth/logout',{},'POST',cookie);expect((await call('dashboard',null,'GET',cookie)).status,401,'Logout invalidates session');
 const login=await call('auth/login',{email:'creator-'+suffix+'@example.invalid',password:'correct-test-password'},'POST');expect(login.status,200,'Password login');expect((await call('auth/login',{email:'creator-'+suffix+'@example.invalid',password:'wrong-password'},'POST')).status,401,'Wrong password rejected');
 const persistent=(await call('dashboard',null,'GET',login.cookie)).value;expect(persistent.orders.length,before.orders.length,'Orders persist across sessions');
 await call('store',{name:'Pilot QA',bio:'Automated pilot flow verification',theme:'purple',avatar:'',instagram:'',published:0},'PATCH',login.cookie);
 await call('store',{name:'Pilot QA other',bio:'Automated pilot flow verification',theme:'purple',avatar:'',instagram:'',published:0},'PATCH',b.cookie);
 await call('store',{name:'Pilot QA demo',bio:'Automated pilot flow verification',theme:'purple',avatar:'',instagram:'',published:0},'PATCH',demo.cookie);
 console.log(JSON.stringify({passed:checks,flows:['auth','ownership','CSRF','uploads','real file fulfillment','course access and progress','booking conflict and calendar','payment gating','isolated demo','saved customer history']}));
}finally{}
