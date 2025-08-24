// --- IndexedDB tiny helpers ---
const DB_NAME = 'caprock-onboarding';
const DB_VERSION = 1;
let dbPromise;

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('draft')) db.createObjectStore('draft');
      if (!db.objectStoreNames.contains('outbox')) db.createObjectStore('outbox', { keyPath: 'id', autoIncrement: true });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

async function idbGet(store, key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const st = tx.objectStore(store);
    const req = st.get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function idbSet(store, key, value) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    const st = tx.objectStore(store);
    const req = st.put(value, key);
    req.onsuccess = () => resolve(true);
    req.onerror = () => reject(req.error);
  });
}
async function idbAdd(store, value) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    const st = tx.objectStore(store);
    const req = st.add(value);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function idbDel(store, key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    const st = tx.objectStore(store);
    const req = st.delete(key);
    req.onsuccess = () => resolve(true);
    req.onerror = () => reject(req.error);
  });
}
async function idbAll(store) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const st = tx.objectStore(store);
    const req = st.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

// --- UI helpers ---
const qs = (s, el=document) => el.querySelector(s);
const qsa = (s, el=document) => Array.from(el.querySelectorAll(s));
const onlineBadge = qs('#online-status');
const syncBadge = qs('#sync-status');
const queueCount = qs('#queue-count');

function setOnlineBadge() {
  onlineBadge.textContent = navigator.onLine ? 'Online' : 'Offline';
  onlineBadge.style.background = navigator.onLine ? '#064e3b' : '#7f1d1d';
  onlineBadge.style.borderColor = navigator.onLine ? '#065f46' : '#991b1b';
}

function setSyncStatus(text, ok=true) {
  syncBadge.textContent = text;
  syncBadge.style.background = ok ? '#1f2937' : '#7f1d1d';
  syncBadge.style.borderColor = ok ? '#334155' : '#991b1b';
}

async function refreshQueueCount() {
  const items = await idbAll('outbox');
  queueCount.textContent = `Queued: ${items.length}`;
}

// --- Dynamic groups (locations, VLANs, SSIDs, LOB apps) ---
function createLocationGroup(data={}) {
  const wrap = document.createElement('div');
  wrap.className = 'group';
  wrap.innerHTML = `
    <div class="row">
      <label>Location Name<input name="loc_name" value="${data.loc_name||''}"></label>
      <label>Address<textarea name="loc_address" rows="2">${data.loc_address||''}</textarea></label>
      <label>ISP & Circuit Details<textarea name="loc_isp" rows="2">${data.loc_isp||''}</textarea></label>
      <label>Notes<textarea name="loc_notes" rows="2">${data.loc_notes||''}</textarea></label>
    </div>
    <button class="btn danger small remove" type="button">Remove</button>
  `;
  wrap.querySelector('.remove').onclick = () => wrap.remove();
  return wrap;
}

function createVlanGroup(data={}) {
  const wrap = document.createElement('div');
  wrap.className = 'group';
  wrap.innerHTML = `
    <label>VLAN ID<input name="vlan_id" value="${data.vlan_id||''}" placeholder="e.g., 20"></label>
    <label>Purpose<input name="vlan_purpose" value="${data.vlan_purpose||''}" placeholder="Voice, Guest, Staff"></label>
    <label>Subnet<input name="vlan_subnet" value="${data.vlan_subnet||''}" placeholder="192.168.20.0/24"></label>
    <button class="btn danger small remove" type="button">Remove</button>
  `;
  wrap.querySelector('.remove').onclick = () => wrap.remove();
  return wrap;
}

function createSSIDGroup(data={}) {
  const wrap = document.createElement('div');
  wrap.className = 'group';
  wrap.innerHTML = `
    <label>SSID<input name="ssid_name" value="${data.ssid_name||''}"></label>
    <label>Purpose<input name="ssid_purpose" value="${data.ssid_purpose||''}" placeholder="Guest/Staff/IoT"></label>
    <label>Auth/Notes<input name="ssid_notes" value="${data.ssid_notes||''}" placeholder="WPA2, VLAN tag, etc."></label>
    <button class="btn danger small remove" type="button">Remove</button>
  `;
  wrap.querySelector('.remove').onclick = () => wrap.remove();
  return wrap;
}

function createLobGroup(data={}) {
  const wrap = document.createElement('div');
  wrap.className = 'group';
  wrap.innerHTML = `
    <label>Application Name<input name="lob_name" value="${data.lob_name||''}"></label>
    <label>Vendor<input name="lob_vendor" value="${data.lob_vendor||''}"></label>
    <label>Notes<input name="lob_notes" value="${data.lob_notes||''}"></label>
    <button class="btn danger small remove" type="button">Remove</button>
  `;
  wrap.querySelector('.remove').onclick = () => wrap.remove();
  return wrap;
}

// --- Gather & hydrate form ---
function gatherDynamicList(container, mapping) {
  return qsa('.group', container).map(g => {
    const obj = {};
    for (const [name, key] of Object.entries(mapping)) {
      const el = qs(`[name="${name}"]`, g);
      obj[key] = el ? el.value.trim() : '';
    }
    return obj;
  });
}

function serializeForm() {
  const data = {
    company_name: qs('[name="company_name"]').value.trim(),
    primary_contact: qs('[name="primary_contact"]').value.trim(),
    primary_email: qs('[name="primary_email"]').value.trim(),
    primary_phone: qs('[name="primary_phone"]').value.trim(),
    business_address: qs('[name="business_address"]').value.trim(),
    business_hours: qs('[name="business_hours"]').value.trim(),
    m365_tenant: qs('[name="m365_tenant"]').value.trim(),
    primary_domain: qs('[name="primary_domain"]').value.trim(),
    m365_notes: qs('[name="m365_notes"]').value.trim(),
    wan_ip: qs('[name="wan_ip"]').value.trim(),
    router_model: qs('[name="router_model"]').value.trim(),
    firewall: qs('[name="firewall"]').value.trim(),
    switching: qs('[name="switching"]').value.trim(),
    wireless: qs('[name="wireless"]').value.trim(),
    count_desktops: +qs('[name="count_desktops"]').value || 0,
    count_laptops: +qs('[name="count_laptops"]').value || 0,
    count_servers: +qs('[name="count_servers"]').value || 0,
    os_av: qs('[name="os_av"]').value.trim(),
    backup: qs('[name="backup"]').value.trim(),
    compliance: qs('[name="compliance"]').value.trim(),
    escalation: qs('[name="escalation"]').value.trim(),
    notes: qs('[name="notes"]').value.trim(),
    locations: gatherDynamicList(document.getElementById('locations'), {
      loc_name: 'name', loc_address: 'address', loc_isp: 'isp', loc_notes: 'notes'
    }),
    vlans: gatherDynamicList(document.getElementById('vlans'), {
      vlan_id: 'id', vlan_purpose: 'purpose', vlan_subnet: 'subnet'
    }),
    ssids: gatherDynamicList(document.getElementById('ssids'), {
      ssid_name: 'name', ssid_purpose: 'purpose', ssid_notes: 'notes'
    }),
    lobs: gatherDynamicList(document.getElementById('lobs'), {
      lob_name: 'name', lob_vendor: 'vendor', lob_notes: 'notes'
    }),
    ts: new Date().toISOString()
  };
  return data;
}

function hydrateForm(data) {
  for (const [sel, key] of [
    ['company_name','company_name'],['primary_contact','primary_contact'],
    ['primary_email','primary_email'],['primary_phone','primary_phone'],
    ['business_address','business_address'],['business_hours','business_hours'],
    ['m365_tenant','m365_tenant'],['primary_domain','primary_domain'],
    ['m365_notes','m365_notes'],['wan_ip','wan_ip'],['router_model','router_model'],
    ['firewall','firewall'],['switching','switching'],['wireless','wireless'],
    ['count_desktops','count_desktops'],['count_laptops','count_laptops'],
    ['count_servers','count_servers'],['os_av','os_av'],['backup','backup'],
    ['compliance','compliance'],['escalation','escalation'],['notes','notes']
  ]) {
    const el = qs(`[name="${sel}"]`);
    if (el && data[key] != null) el.value = data[key];
  }
  const locWrap = document.getElementById('locations');
  locWrap.innerHTML = '';
  (data.locations || []).forEach(item => locWrap.appendChild(createLocationGroup(item)));
  const vlanWrap = document.getElementById('vlans');
  vlanWrap.innerHTML = '';
  (data.vlans || []).forEach(item => vlanWrap.appendChild(createVlanGroup(item)));
  const ssidWrap = document.getElementById('ssids');
  ssidWrap.innerHTML = '';
  (data.ssids || []).forEach(item => ssidWrap.appendChild(createSSIDGroup(item)));
  const lobWrap = document.getElementById('lobs');
  lobWrap.innerHTML = '';
  (data.lobs || []).forEach(item => lobWrap.appendChild(createLobGroup(item)));
}

// --- Netlify Forms encoding ---
function encode(data) {
  return Object.keys(data).map(key => encodeURIComponent(key) + '=' + encodeURIComponent(data[key])).join('&');
}

async function queueSubmission(data) {
  const payload = {
    type: 'caprock-onboarding',
    primary: {
      company_name: data.company_name,
      primary_email: data.primary_email,
      primary_contact: data.primary_contact
    },
    data,
    queuedAt: new Date().toISOString()
  };
  const id = await idbAdd('outbox', payload);
  await refreshQueueCount();
  return id;
}

async function trySync() {
  setSyncStatus('Syncing…');
  const items = await idbAll('outbox');
  if (!navigator.onLine) {
    setSyncStatus('Offline – queued', false);
    return;
  }
  for (const item of items) {
    const simple = {
      'form-name': 'caprock-onboarding',
      company_name: item.primary.company_name || '',
      primary_email: item.primary.primary_email || '',
      primary_contact: item.primary.primary_contact || '',
      payload: JSON.stringify(item.data),
    };
    try {
      const res = await fetch('/?no-cache=1', {
        method: 'POST',
        headers: {'Content-Type': 'application/x-www-form-urlencoded'},
        body: encode(simple)
      });
      if (res.ok) {
        await idbDel('outbox', item.id);
      } else {
        console.warn('Submit failed', res.status);
      }
    } catch (e) {
      console.warn('Network error submitting', e);
    }
  }
  await refreshQueueCount();
  const remaining = await idbAll('outbox');
  setSyncStatus(remaining.length ? 'Some queued' : 'All synced', remaining.length === 0);
}

// --- Draft helpers ---
let saveTimer;
function autoSaveDraft() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    const data = serializeForm();
    await idbSet('draft', 'current', data);
  }, 400);
}

// --- Export ---
async function exportJSON() {
  const outbox = await idbAll('outbox');
  const draft = await idbGet('draft', 'current');
  const blob = new Blob([JSON.stringify({draft, outbox}, null, 2)], {type: 'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `caprock-onboarding-export-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// --- Init ---
window.addEventListener('online', () => { setOnlineBadge(); trySync(); });
window.addEventListener('offline', () => setOnlineBadge());

async function init() {
  setOnlineBadge();
  await refreshQueueCount();
  // hydrate draft if any
  const draft = await idbGet('draft', 'current');
  if (draft) hydrateForm(draft);

  // default one group of each for convenience
  if (!draft) {
    document.getElementById('locations').appendChild(createLocationGroup());
    document.getElementById('vlans').appendChild(createVlanGroup());
    document.getElementById('ssids').appendChild(createSSIDGroup());
    document.getElementById('lobs').appendChild(createLobGroup());
  }

  // bind buttons
  qs('#add-location').onclick = () => document.getElementById('locations').appendChild(createLocationGroup());
  qs('#add-vlan').onclick = () => document.getElementById('vlans').appendChild(createVlanGroup());
  qs('#add-ssid').onclick = () => document.getElementById('ssids').appendChild(createSSIDGroup());
  qs('#add-lob').onclick = () => document.getElementById('lobs').appendChild(createLobGroup());

  qs('#save-draft').onclick = async () => {
    const data = serializeForm();
    await idbSet('draft', 'current', data);
    setSyncStatus('Draft saved');
  };

  qs('#clear-draft').onclick = async () => {
    await idbSet('draft', 'current', {});
    hydrateForm({locations:[],vlans:[],ssids:[],lobs:[]});
    setSyncStatus('Draft cleared');
  };

  qs('#export-json').onclick = exportJSON;
  qs('#force-sync').onclick = trySync;

  // track changes for autosave
  qsa('input,textarea').forEach(el => el.addEventListener('input', autoSaveDraft));

  // submit -> queue -> try sync
  qs('#submit-btn').onclick = async () => {
    const required = ['company_name','primary_contact','primary_email','primary_phone'];
    for (const name of required) {
      const el = qs(`[name="${name}"]`);
      if (!el.value.trim()) {
        setSyncStatus('Missing required fields', false);
        el.focus();
        return;
      }
    }
    const data = serializeForm();
    await queueSubmission(data);
    await idbSet('draft', 'current', {});
    hydrateForm({locations:[],vlans:[],ssids:[],lobs:[]});
    setSyncStatus('Queued for sync');
    trySync();
  };

  // initial sync attempt
  trySync();
}
init();
