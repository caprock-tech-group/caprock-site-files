// IndexedDB helpers
const DB_NAME = 'caprock-onboarding';
const DB_VERSION = 1;
let dbPromise;
function openDB(){ if(dbPromise) return dbPromise; dbPromise=new Promise((resolve,reject)=>{const req=indexedDB.open(DB_NAME,DB_VERSION);req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains('draft')) db.createObjectStore('draft');if(!db.objectStoreNames.contains('outbox')) db.createObjectStore('outbox',{keyPath:'id',autoIncrement:true});};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);}); return dbPromise;}
async function idbGet(s,k){const db=await openDB(); return new Promise((res,rej)=>{const tx=db.transaction(s,'readonly');const st=tx.objectStore(s);const rq=st.get(k);rq.onsuccess=()=>res(rq.result);rq.onerror=()=>rej(rq.error);});}
async function idbSet(s,k,v){const db=await openDB(); return new Promise((res,rej)=>{const tx=db.transaction(s,'readwrite');const st=tx.objectStore(s);const rq=st.put(v,k);rq.onsuccess=()=>res(true);rq.onerror=()=>rej(rq.error);});}
async function idbAdd(s,v){const db=await openDB(); return new Promise((res,rej)=>{const tx=db.transaction(s,'readwrite');const st=tx.objectStore(s);const rq=st.add(v);rq.onsuccess=()=>res(rq.result);rq.onerror=()=>rej(rq.error);});}
async function idbDel(s,k){const db=await openDB(); return new Promise((res,rej)=>{const tx=db.transaction(s,'readwrite');const st=tx.objectStore(s);const rq=st.delete(k);rq.onsuccess=()=>res(true);rq.onerror=()=>rej(rq.error);});}
async function idbAll(s){const db=await openDB(); return new Promise((res,rej)=>{const tx=db.transaction(s,'readonly');const st=tx.objectStore(s);const rq=st.getAll();rq.onsuccess=()=>res(rq.result||[]);rq.onerror=()=>rej(rq.error);});}

// UI helpers
const qs=(s,el=document)=>el.querySelector(s);
const qsa=(s,el=document)=>Array.from(el.querySelectorAll(s));
const onlineBadge=qs('#online-status');
const syncBadge=qs('#sync-status');
const queueCount=qs('#queue-count');
function setOnlineBadge(){onlineBadge.textContent=navigator.onLine?'Online':'Offline';onlineBadge.style.background=navigator.onLine?'#064e3b':'#7f1d1d';onlineBadge.style.borderColor=navigator.onLine?'#065f46':'#991b1b';}
function setSyncStatus(t,ok=true){syncBadge.textContent=t;syncBadge.style.background=ok?'#1f2937':'#7f1d1d';syncBadge.style.borderColor=ok?'#334155':'#991b1b';}
async function refreshQueueCount(){const items=await idbAll('outbox');queueCount.textContent=`Queued: ${items.length}`;}
function buildSummary(d){
  const lines = [];
  lines.push(`Company: ${d.company_name}`);
  lines.push(`Primary: ${d.primary_contact} | ${d.primary_email} | ${d.primary_phone}`);
  if (d.m365_tenant || d.primary_domain) lines.push(`Tenant/Domain: ${d.m365_tenant||'-'} / ${d.primary_domain||'-'}`);
  lines.push(`Network: WAN ${d.wan_ip||'-'} | Router ${d.router_model||'-'} | FW ${d.firewall||'-'} | SW ${d.switching||'-'} | WiFi ${d.wireless||'-'}`);
  if (Array.isArray(d.vlans) && d.vlans.length){
    lines.push(`VLANs: ${d.vlans.map(v=>`${v.id||'?'}:${v.purpose||'-'} ${v.subnet||''}`).join(' | ')}`);
  }
  if (Array.isArray(d.ssids) && d.ssids.length){
    lines.push(`SSIDs: ${d.ssids.map(s=>`${s.name||'?'} (${s.purpose||'-'})`).join(' | ')}`);
  }
  lines.push(`Endpoints: D:${d.count_desktops||0} L:${d.count_laptops||0} S:${d.count_servers||0}`);
  if (Array.isArray(d.lobs) && d.lobs.length){
    lines.push(`LOBs: ${d.lobs.map(l=>`${l.name||'?'} (${l.vendor||'-'})`).join(' | ')}`);
  }
  if (d.backup) lines.push(`Backup: ${d.backup}`);
  if (d.compliance) lines.push(`Compliance: ${d.compliance}`);
  if (d.escalation) lines.push(`Escalation: ${d.escalation}`);
  if (d.notes) lines.push(`Notes: ${d.notes}`);
  return lines.join('\n');
}

function buildSummaryInline(d){
  // Single-line for Netlify card: replace newlines with separators
  return buildSummary(d).replace(/\n+/g, ' | ').replace(/\s+\|\s+$/,'');
}
function flattenForNetlify(d, max=5){
  const out = {
    company_name: d.company_name || '',
    primary_contact: d.primary_contact || '',
    primary_email: d.primary_email || '',
    primary_phone: d.primary_phone || '',
    m365_tenant: d.m365_tenant || '',
    primary_domain: d.primary_domain || '',
    counts: `D:${d.count_desktops||0} L:${d.count_laptops||0} S:${d.count_servers||0}`,
    locations_count: Array.isArray(d.locations) ? d.locations.length : 0,
    vlans_count: Array.isArray(d.vlans) ? d.vlans.length : 0,
    ssids_count: Array.isArray(d.ssids) ? d.ssids.length : 0,
    lobs_count: Array.isArray(d.lobs) ? d.lobs.length : 0,
    summary: buildSummary(d),
    summary_inline: buildSummaryInline(d)
  };
  (d.locations||[]).slice(0,max).forEach((loc,i)=>{
    const k = i+1;
    out[`loc_${k}_name`] = (loc && loc.name) || '';
    out[`loc_${k}_addr`] = (loc && loc.address) || '';
    out[`loc_${k}_isp`]  = (loc && loc.isp) || '';
  });
  (d.vlans||[]).slice(0,max).forEach((v,i)=>{
    const k = i+1;
    out[`vlan_${k}_id`] = (v && v.id) || '';
    out[`vlan_${k}_purpose`] = (v && v.purpose) || '';
    out[`vlan_${k}_subnet`] = (v && v.subnet) || '';
  });
  (d.ssids||[]).slice(0,max).forEach((s,i)=>{
    const k = i+1;
    out[`ssid_${k}_name`] = (s && s.name) || '';
    out[`ssid_${k}_purpose`] = (s && s.purpose) || '';
  });
  (d.lobs||[]).slice(0,max).forEach((l,i)=>{
    const k = i+1;
    out[`lob_${k}_name`] = (l && l.name) || '';
    out[`lob_${k}_vendor`] = (l && l.vendor) || '';
  });
  return out;
}

function clearErrors(){
  qsa('input.invalid, textarea.invalid, select.invalid').forEach(el=>el.classList.remove('invalid'));
  qsa('label.error').forEach(l=>l.classList.remove('error'));
  qsa('.error-text').forEach(n=>n.remove());
}
function appendError(el, msg){
  const label = el.closest('label') || el.parentElement;
  if (label) label.classList.add('error');
  el.classList.add('invalid');
  const note = document.createElement('div');
  note.className = 'error-text';
  note.textContent = msg || 'Required';
  (label || el.parentElement).appendChild(note);
}
function validateRequiredFields(){
  clearErrors();
  const reqs = qsa('input[required], textarea[required], select[required]');
  let first = null;
  for (const el of reqs){
    const val = (el.value || '').trim();
    if (!val){
      appendError(el, 'This field is required');
      if (!first) first = el;
      continue;
    }
    if (el.type === 'email' && el.validity && el.validity.typeMismatch){
      appendError(el, 'Enter a valid email address');
      if (!first) first = el;
    }
  }
  if (first){
    try { first.scrollIntoView({behavior:'smooth', block:'center'}); } catch {}
    first.focus();
    return false;
  }
  return true;
}

function clearInvalids(names){
  names.forEach(n=>{ const el=qs(`[name="${n}"]`); if(el) el.classList.remove('invalid'); });
}
function markInvalid(el){
  if(!el) return;
  el.classList.add('invalid');
  try{ el.scrollIntoView({behavior:'smooth', block:'center'}); }catch{}
  el.focus();
}


// Dynamic groups
function createLocationGroup(d={}){const w=document.createElement('div');w.className='group';w.innerHTML=`
  <div class="row">
    <label>Location Name<input name="loc_name" value="${d.loc_name||''}"></label>
    <label>Address<textarea name="loc_address" rows="2">${d.loc_address||''}</textarea></label>
    <label>ISP & Circuit Details<textarea name="loc_isp" rows="2">${d.loc_isp||''}</textarea></label>
    <label>Notes<textarea name="loc_notes" rows="2">${d.loc_notes||''}</textarea></label>
  </div>
  <button class="btn danger small remove" type="button">Remove</button>`; w.querySelector('.remove').onclick=()=>w.remove(); return w;}
function createVlanGroup(d={}){const w=document.createElement('div');w.className='group';w.innerHTML=`
  <label>VLAN ID<input name="vlan_id" value="${d.vlan_id||''}" placeholder="e.g., 20"></label>
  <label>Purpose<input name="vlan_purpose" value="${d.vlan_purpose||''}" placeholder="Voice, Guest, Staff"></label>
  <label>Subnet<input name="vlan_subnet" value="${d.vlan_subnet||''}" placeholder="192.168.20.0/24"></label>
  <button class="btn danger small remove" type="button">Remove</button>`; w.querySelector('.remove').onclick=()=>w.remove(); return w;}
function createSSIDGroup(d={}){const w=document.createElement('div');w.className='group';w.innerHTML=`
  <label>SSID<input name="ssid_name" value="${d.ssid_name||''}"></label>
  <label>Purpose<input name="ssid_purpose" value="${d.ssid_purpose||''}" placeholder="Guest/Staff/IoT"></label>
  <label>Auth/Notes<input name="ssid_notes" value="${d.ssid_notes||''}" placeholder="WPA2, VLAN tag, etc."></label>
  <button class="btn danger small remove" type="button">Remove</button>`; w.querySelector('.remove').onclick=()=>w.remove(); return w;}
function createLobGroup(d={}){const w=document.createElement('div');w.className='group';w.innerHTML=`
  <label>Application Name<input name="lob_name" value="${d.lob_name||''}"></label>
  <label>Vendor<input name="lob_vendor" value="${d.lob_vendor||''}"></label>
  <label>Notes<input name="lob_notes" value="${d.lob_notes||''}"></label>
  <button class="btn danger small remove" type="button">Remove</button>`; w.querySelector('.remove').onclick=()=>w.remove(); return w;}

// Serialization
function gatherDynamicList(container,mapping){return qsa('.group',container).map(g=>{const o={}; for(const [name,key] of Object.entries(mapping)){const el=qs(`[name="${name}"]`,g); o[key]=el?el.value.trim():'';} return o;});}
function serializeForm(){const d={
  company_name:qs('[name="company_name"]').value.trim(),
  primary_contact:qs('[name="primary_contact"]').value.trim(),
  primary_email:qs('[name="primary_email"]').value.trim(),
  primary_phone:qs('[name="primary_phone"]').value.trim(),
  business_address:qs('[name="business_address"]').value.trim(),
  business_hours:qs('[name="business_hours"]').value.trim(),
  m365_tenant:qs('[name="m365_tenant"]').value.trim(),
  primary_domain:qs('[name="primary_domain"]').value.trim(),
  m365_notes:qs('[name="m365_notes"]').value.trim(),
  wan_ip:qs('[name="wan_ip"]').value.trim(),
  router_model:qs('[name="router_model"]').value.trim(),
  firewall:qs('[name="firewall"]').value.trim(),
  switching:qs('[name="switching"]').value.trim(),
  wireless:qs('[name="wireless"]').value.trim(),
  count_desktops:+qs('[name="count_desktops"]').value||0,
  count_laptops:+qs('[name="count_laptops"]').value||0,
  count_servers:+qs('[name="count_servers"]').value||0,
  os_av:qs('[name="os_av"]').value.trim(),
  backup:qs('[name="backup"]').value.trim(),
  compliance:qs('[name="compliance"]').value.trim(),
  escalation:qs('[name="escalation"]').value.trim(),
  notes:qs('[name="notes"]').value.trim(),
  locations:gatherDynamicList(document.getElementById('locations'),{loc_name:'name',loc_address:'address',loc_isp:'isp',loc_notes:'notes'}),
  vlans:gatherDynamicList(document.getElementById('vlans'),{vlan_id:'id',vlan_purpose:'purpose',vlan_subnet:'subnet'}),
  ssids:gatherDynamicList(document.getElementById('ssids'),{ssid_name:'name',ssid_purpose:'purpose',ssid_notes:'notes'}),
  lobs:gatherDynamicList(document.getElementById('lobs'),{lob_name:'name',lob_vendor:'vendor',lob_notes:'notes'}),
  ts:new Date().toISOString()
}; return d;}
function hydrateForm(d){for(const [sel,key] of [['company_name','company_name'],['primary_contact','primary_contact'],['primary_email','primary_email'],['primary_phone','primary_phone'],['business_address','business_address'],['business_hours','business_hours'],['m365_tenant','m365_tenant'],['primary_domain','primary_domain'],['m365_notes','m365_notes'],['wan_ip','wan_ip'],['router_model','router_model'],['firewall','firewall'],['switching','switching'],['wireless','wireless'],['count_desktops','count_desktops'],['count_laptops','count_laptops'],['count_servers','count_servers'],['os_av','os_av'],['backup','backup'],['compliance','compliance'],['escalation','escalation'],['notes','notes']]){const el=qs(`[name="${sel}"]`); if(el && d[key]!=null) el.value=d[key];}
  const lw=document.getElementById('locations'); lw.innerHTML=''; (d.locations||[]).forEach(i=>lw.appendChild(createLocationGroup(i)));
  const vw=document.getElementById('vlans'); vw.innerHTML=''; (d.vlans||[]).forEach(i=>vw.appendChild(createVlanGroup(i)));
  const sw=document.getElementById('ssids'); sw.innerHTML=''; (d.ssids||[]).forEach(i=>sw.appendChild(createSSIDGroup(i)));
  const aw=document.getElementById('lobs'); aw.innerHTML=''; (d.lobs||[]).forEach(i=>aw.appendChild(createLobGroup(i)));
}

// Netlify Forms encoding + queue
function encode(data){return Object.keys(data).map(k=>encodeURIComponent(k)+'='+encodeURIComponent(data[k])).join('&');}
async function queueSubmission(data){const payload={type:'caprock-onboarding',primary:{company_name:data.company_name,primary_email:data.primary_email,primary_contact:data.primary_contact},data,queuedAt:new Date().toISOString()}; const id=await idbAdd('outbox',payload); await refreshQueueCount(); return id;}

async function trySync(){
  setSyncStatus('Syncing…');
  const items=await idbAll('outbox');
  if(!navigator.onLine){ setSyncStatus('Offline – queued',false); return; }
  for(const item of items){
    const flat = flattenForNetlify(item.data);
    const simple={
      'form-name':'caprock-onboarding',
      subject:`Onboarding: ${item.data.company_name || 'Unknown'} (${item.data.primary_domain || 'no-domain'})`,
      ...flat,
      payload: JSON.stringify(item.data),
      'bot-field':''
    };
    try{
      const res=await fetch(window.location.pathname + '?no-cache=1',{
        method:'POST',
        headers:{'Content-Type':'application/x-www-form-urlencoded'},
        body: encode(simple)
      });
      if(res.ok){ await idbDel('outbox',item.id); } else { console.warn('Submit failed',res.status); }
    }catch(e){ console.warn('Network error submitting',e); }
  }
  await refreshQueueCount();
  const remaining=await idbAll('outbox');
  setSyncStatus(remaining.length?'Some queued':'All synced', remaining.length===0);
}

// Draft + export
let saveTimer;
function autoSaveDraft(){ clearTimeout(saveTimer); saveTimer=setTimeout(async()=>{const data=serializeForm(); await idbSet('draft','current',data);},400); }
async function exportJSON(){ const outbox=await idbAll('outbox'); const draft=await idbGet('draft','current'); const blob=new Blob([JSON.stringify({draft,outbox},null,2)],{type:'application/json'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=`caprock-onboarding-export-${Date.now()}.json`; a.click(); URL.revokeObjectURL(url); }

// Init
window.addEventListener('online',()=>{setOnlineBadge(); trySync();});
window.addEventListener('offline',()=>setOnlineBadge());
async function init(){
  setOnlineBadge(); await refreshQueueCount();
  const draft=await idbGet('draft','current'); if(draft) hydrateForm(draft);
  if(!draft){ document.getElementById('locations').appendChild(createLocationGroup()); document.getElementById('vlans').appendChild(createVlanGroup()); document.getElementById('ssids').appendChild(createSSIDGroup()); document.getElementById('lobs').appendChild(createLobGroup()); }
  qs('#add-location').onclick=()=>document.getElementById('locations').appendChild(createLocationGroup());
  qs('#add-vlan').onclick=()=>document.getElementById('vlans').appendChild(createVlanGroup());
  qs('#add-ssid').onclick=()=>document.getElementById('ssids').appendChild(createSSIDGroup());
  qs('#add-lob').onclick=()=>document.getElementById('lobs').appendChild(createLobGroup());
  qs('#save-draft').onclick=async()=>{const data=serializeForm(); await idbSet('draft','current',data); setSyncStatus('Draft saved');};
  qs('#clear-draft').onclick=async()=>{await idbSet('draft','current',{}); hydrateForm({locations:[],vlans:[],ssids:[],lobs:[]}); setSyncStatus('Draft cleared');};
  qs('#export-json').onclick=exportJSON;
  qs('#force-sync').onclick=trySync;
  qsa('input,textarea').forEach(el=>el.addEventListener('input',autoSaveDraft));
  qs('#submit-btn').onclick=async()=>{
    if(!validateRequiredFields()){ setSyncStatus('Please fix the highlighted fields', false); return; }
    const data=serializeForm();
    await queueSubmission(data);
    await idbSet('draft','current',{});
    hydrateForm({locations:[],vlans:[],ssids:[],lobs:[]});
    setSyncStatus('Queued for sync'); trySync();
  };
  trySync();
}
init();
