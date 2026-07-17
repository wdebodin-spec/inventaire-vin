const NOW = 2026;
const STORAGE_KEY = 'cave_w3';

function loadLocal(){try{const s=localStorage.getItem(STORAGE_KEY);if(s)return JSON.parse(s)}catch(e){}return null}
function save(w){localStorage.setItem(STORAGE_KEY,JSON.stringify(w))}

// Merge fresh entries from wines.json into whatever is already stored locally.
// Content fields always come from the file (so corrections/new fields propagate);
// only quantite is kept from local storage, since that's the field the app itself edits.
function mergeWithLocal(fromFile, local){
  if(!local) return JSON.parse(JSON.stringify(fromFile));
  const byId = new Map(local.map(w=>[w.id,w]));
  const merged = fromFile.map(w=>{
    const l = byId.get(w.id);
    return l ? {...w, quantite:l.quantite} : w;
  });
  const fileIds = new Set(fromFile.map(w=>w.id));
  for(const w of local){ if(!fileIds.has(w.id)) merged.push(w); }
  return merged;
}

let wines = [], fColor='all', fCaisse='all', fFormat='all', search='', sort='status';

function status(w){
  if(w.couleur==='inconnu') return{k:'unk',lbl:'❓ À identifier',c:'s-pa'};
  const y=NOW;
  if(w.debut>y+1) return{k:'tt',lbl:'⏳ Trop tôt',c:'s-tt'};
  if(w.debut>y)   return{k:'bt',lbl:'⌛ Bientôt prêt',c:'s-bt'};
  if(y>=w.apogee_debut&&y<=w.apogee_fin) return{k:'ap',lbl:'⭐ À l\'apogée',c:'s-ap'};
  if(y>=w.debut&&y<w.apogee_debut)       return{k:'pr',lbl:'✓ Prêt à boire',c:'s-pr'};
  if(y>w.apogee_fin&&y<=w.fin)           return{k:'su',lbl:'⚠ À surveiller',c:'s-su'};
  return{k:'pa',lbl:'✗ Passé',c:'s-pa'};
}
function sOrder(w){return{'ap':0,'pr':1,'bt':2,'su':3,'tt':4,'pa':5,'unk':6}[status(w).k]??9}

function tl(w){
  if(w.couleur==='inconnu') return '';
  const rs=Math.min(w.millesime||w.debut,w.debut)-2;
  const re=w.fin+6; const r=re-rs;
  const p=y=>Math.max(0,Math.min(100,((y-rs)/r)*100));
  return`<div class="tl">
    <div class="tl-labs"><span>${rs}</span><span>${re}</span></div>
    <div class="tl-bar">
      <div class="tl-win" style="left:${p(w.debut)}%;width:${Math.max(0,p(w.fin)-p(w.debut))}%"></div>
      <div class="tl-peak" style="left:${p(w.apogee_debut)}%;width:${Math.max(0,p(w.apogee_fin)-p(w.apogee_debut))}%"></div>
      <div class="tl-now" style="left:${p(NOW)}%"></div>
    </div>
  </div>`;
}

// Same wine spread across several caisses (added at different times) is grouped
// into a single card so the grid doesn't repeat the whole card for each caisse;
// the per-caisse quantity/edit/delete rows stay separate underneath.
function groupKey(w){return [w.domaine,w.vin,w.millesime,w.format].join('|')}

function card(group){
  const w=group[0];
  const multi=group.length>1;
  const st=status(w);
  const bc={'rouge':'badge-rouge','blanc':'badge-blanc','porto':'badge-porto','spiritueux':'badge-spiritueux','inconnu':'badge-inconnu'}[w.couleur]||'badge-inconnu';
  const cl={'rouge':'🍷 Rouge','blanc':'🥂 Blanc','porto':'🍶 Porto','spiritueux':'🥃 Spiritueux','inconnu':'❓ Inconnu'}[w.couleur];
  const wt=w.couleur!=='inconnu'
    ?`<div class="w-text">Fenêtre : <strong>${w.debut}–${w.fin}</strong> &nbsp;|&nbsp; Apogée : <strong>${w.apogee_debut}–${w.apogee_fin}</strong></div>`
    :'';
  const formatLbl={'magnum':'Magnum','jeroboam':'Jéroboam','mignonnette':'Mignonnette'}[w.format]||w.format;
  const caisses=[...new Set(group.map(e=>e.caisse))].filter(c=>c!=null).sort((a,b)=>a-b);
  const caisseLbl=caisses.length?`Caisse${caisses.length>1?'s':''} ${caisses.join(', ')}`:'Hors caisse';
  const total=group.reduce((s,e)=>s+e.quantite,0);
  const notes=[...new Set(group.map(e=>e.notes).filter(Boolean))].join(' — ');
  const rows=group.map(e=>`
    <div class="qty-row">
      <span class="qty-l">${multi?`Caisse ${e.caisse??'—'} : `:''}Bouteilles en cave</span>
      <div style="display:flex;align-items:center">
        <div class="qty-c">
          <button class="qb" onclick="chg(${e.id},-1)">−</button>
          <span class="qv">${e.quantite}</span>
          <button class="qb" onclick="chg(${e.id},1)">+</button>
        </div>
        <div class="acts">
          <button class="bsm" onclick="edit(${e.id})">✏</button>
          <button class="bsm bdel" onclick="del(${e.id})">✕</button>
        </div>
      </div>
    </div>`).join('');
  return`<div class="card">
    <div class="card-top">
      <div>
        <div class="c-dom">${w.domaine}</div>
        <div class="c-vin">${w.vin}</div>
        <div class="c-app">${w.appellation||''}</div>
      </div>
      <div>
        <div class="c-year">${w.millesime||'—'}</div>
        <div class="c-reg">${w.region||''}</div>
        <div class="c-caisse-tag">${caisseLbl}</div>
        ${w.format&&w.format!=='bouteille'?`<div class="c-format-tag">${formatLbl}</div>`:''}
      </div>
    </div>
    <span class="badge ${bc}">${cl}</span>
    <div><span class="status ${st.c}">${st.lbl}</span>${multi?`<span class="c-caisse-tag" style="margin-left:6px">Total : ${total}</span>`:''}</div>
    ${tl(w)}
    ${wt}
    ${notes?`<div class="notes">${notes}</div>`:''}
    ${rows}
  </div>`;
}

function filtered(){
  let list=wines.slice();
  if(fColor!=='all') list=list.filter(w=>w.couleur===fColor);
  if(fCaisse!=='all') list=list.filter(w=>String(w.caisse)===fCaisse);
  if(fFormat!=='all') list=list.filter(w=>(w.format||'bouteille')===fFormat);
  if(search){const q=search.toLowerCase();list=list.filter(w=>[w.domaine,w.vin,w.appellation||'',w.region||'',String(w.millesime||'')].join(' ').toLowerCase().includes(q))}
  if(sort==='status') list.sort((a,b)=>sOrder(a)-sOrder(b)||(a.apogee_debut||0)-(b.apogee_debut||0));
  else if(sort==='mil_asc') list.sort((a,b)=>(a.millesime||9999)-(b.millesime||9999));
  else if(sort==='mil_desc') list.sort((a,b)=>(b.millesime||0)-(a.millesime||0));
  else if(sort==='region') list.sort((a,b)=>(a.region||'').localeCompare(b.region||''));
  else if(sort==='domaine') list.sort((a,b)=>a.domaine.localeCompare(b.domaine));
  else if(sort==='qty') list.sort((a,b)=>b.quantite-a.quantite);
  return list;
}

function render(){
  const list=filtered();
  const groups=[];
  const idx=new Map();
  for(const w of list){
    const k=groupKey(w);
    if(idx.has(k)) groups[idx.get(k)].push(w);
    else{idx.set(k,groups.length);groups.push([w])}
  }
  document.getElementById('grid').innerHTML=groups.length
    ?groups.map(card).join('')
    :`<div class="empty"><div class="empty-i">🍾</div><p>Aucun vin correspondant</p></div>`;

  const all=wines;
  const tot=all.reduce((s,w)=>s+w.quantite,0);
  const r=all.filter(w=>w.couleur==='rouge').reduce((s,w)=>s+w.quantite,0);
  const b=all.filter(w=>w.couleur==='blanc').reduce((s,w)=>s+w.quantite,0);
  const p=all.filter(w=>w.couleur==='porto').reduce((s,w)=>s+w.quantite,0);
  const sp=all.filter(w=>w.couleur==='spiritueux').reduce((s,w)=>s+w.quantite,0);
  const bt=all.filter(w=>w.format==='bouteille').reduce((s,w)=>s+w.quantite,0);
  const mg=all.filter(w=>w.format==='magnum').reduce((s,w)=>s+w.quantite,0);
  const jb=all.filter(w=>w.format==='jeroboam').reduce((s,w)=>s+w.quantite,0);
  const mn=all.filter(w=>w.format==='mignonnette').reduce((s,w)=>s+w.quantite,0);
  const cc=c=>all.filter(w=>w.caisse===c).reduce((s,w)=>s+w.quantite,0);
  document.getElementById('stats').innerHTML=
    `<div class="stat"><div class="stat-v">${tot}</div><div class="stat-l">Total</div></div>
     <div class="stat"><div class="stat-v">${r}</div><div class="stat-l">Rouges</div></div>
     <div class="stat"><div class="stat-v">${b}</div><div class="stat-l">Blancs</div></div>
     <div class="stat"><div class="stat-v">${p}</div><div class="stat-l">Portos</div></div>
     ${sp?`<div class="stat"><div class="stat-v">${sp}</div><div class="stat-l">Spiritueux</div></div>`:''}
     <div class="stat"><div class="stat-v">${bt}</div><div class="stat-l">Bouteilles</div></div>
     <div class="stat"><div class="stat-v">${mg}</div><div class="stat-l">Magnums</div></div>
     <div class="stat"><div class="stat-v">${jb}</div><div class="stat-l">Jéroboams</div></div>
     ${mn?`<div class="stat"><div class="stat-v">${mn}</div><div class="stat-l">Mignonnettes</div></div>`:''}`;

  document.querySelectorAll('.caisse-btn[data-c]').forEach(btn=>{
    const c=btn.dataset.c;
    if(c==='all'){btn.textContent='Toutes';return}
    const n=cc(parseInt(c));
    btn.textContent=`Caisse ${c} (${n})`;
  });
}

function chg(id,d){const w=wines.find(w=>w.id===id);if(!w)return;w.quantite=Math.max(0,w.quantite+d);save(wines);render()}
function del(id){if(!confirm('Supprimer ce vin ?'))return;wines=wines.filter(w=>w.id!==id);save(wines);render()}

function openModal(w=null){
  document.getElementById('m-title').textContent=w?'Modifier un vin':'Ajouter un vin';
  document.getElementById('eid').value=w?w.id:'';
  document.getElementById('fd').value=w?.domaine||'';
  document.getElementById('fv').value=w?.vin||'';
  document.getElementById('fa').value=w?.appellation||'';
  document.getElementById('frg').value=w?.region||'';
  document.getElementById('fm').value=w?.millesime||'';
  document.getElementById('fc').value=w?.couleur||'rouge';
  document.getElementById('fq').value=w?.quantite??1;
  document.getElementById('ffo').value=w?.format||'bouteille';
  document.getElementById('fca').value=w?.caisse||'';
  document.getElementById('fdb').value=w?.debut||'';
  document.getElementById('ffn').value=w?.fin||'';
  document.getElementById('fad').value=w?.apogee_debut||'';
  document.getElementById('faf').value=w?.apogee_fin||'';
  document.getElementById('fno').value=w?.notes||'';
  document.getElementById('ov').classList.add('open');
}
function edit(id){const w=wines.find(w=>w.id===id);if(w)openModal(w)}
function closeModal(){document.getElementById('ov').classList.remove('open')}
function saveWine(){
  const id=document.getElementById('eid').value;
  const d=document.getElementById('fd').value.trim();
  const v=document.getElementById('fv').value.trim();
  if(!d||!v){alert('Domaine et nom du vin requis');return}
  const data={
    domaine:d,vin:v,
    appellation:document.getElementById('fa').value.trim(),
    region:document.getElementById('frg').value.trim(),
    millesime:parseInt(document.getElementById('fm').value)||null,
    couleur:document.getElementById('fc').value,
    quantite:parseInt(document.getElementById('fq').value)||0,
    format:document.getElementById('ffo').value,
    caisse:parseInt(document.getElementById('fca').value)||null,
    debut:parseInt(document.getElementById('fdb').value)||NOW,
    fin:parseInt(document.getElementById('ffn').value)||NOW+5,
    apogee_debut:parseInt(document.getElementById('fad').value)||NOW,
    apogee_fin:parseInt(document.getElementById('faf').value)||NOW+3,
    notes:document.getElementById('fno').value.trim(),
  };
  if(id){const i=wines.findIndex(w=>w.id==id);if(i>=0)wines[i]={...wines[i],...data}}
  else{data.id=Date.now();wines.push(data)}
  save(wines);closeModal();render();
}

// Hand-placed approximate positions (stylized outline, not a precise geo projection)
// for the regions currently used in wines.json. Only French regions are shown for now —
// entries with no matching region here (e.g. Portugal) are left out of the map entirely.
const FRANCE_PATH='M210,15 L360,100 L378,200 L402,280 L432,375 L372,425 L260,445 L90,435 L55,325 L20,195 L70,120 L130,65 Z';
const REGION_POS={
  'Normandie':[140,90],
  'Lorraine':[335,120],
  'Vallée de la Loire':[130,255],
  'Bourgogne':[300,210],
  'Bordeaux':[95,355],
  'Vallée du Rhône Nord':[330,300],
  'Vallée du Rhône Sud':[345,395],
  'Provence':[410,400],
  'Languedoc-Roussillon':[230,430],
};

function openMap(){
  const byRegion=new Map();
  for(const w of wines){
    const r=w.region||'Inconnu';
    byRegion.set(r,(byRegion.get(r)||0)+w.quantite);
  }
  const entries=[...byRegion.entries()].filter(([name])=>REGION_POS[name]).sort((a,b)=>b[1]-a[1]);
  const rad=q=>Math.max(12,Math.min(32,8+Math.sqrt(q)*3));

  const pins=entries.map(([name,qty])=>{
    const[x,y]=REGION_POS[name];
    const rr=rad(qty);
    return`<g>
      <circle class="map-pin-c" cx="${x}" cy="${y}" r="${rr}"></circle>
      <text class="map-pin-n" x="${x}" y="${y+4}">${qty}</text>
      <text class="map-pin-lbl" x="${x}" y="${y+rr+13}" text-anchor="middle">${name}</text>
    </g>`;
  }).join('');

  const legend=entries.map(([name,qty])=>`<div class="map-legend-row"><span>${name}</span><b>${qty}</b></div>`).join('');

  document.getElementById('map-content').innerHTML=`
    <div class="map-wrap">
      <svg class="map-svg" viewBox="0 0 480 560" width="300" height="350">
        <path d="${FRANCE_PATH}" fill="#F2EAD8" stroke="#B36F63" stroke-width="2"></path>
        ${pins}
      </svg>
      <div class="map-legend">${legend}</div>
    </div>`;
  document.getElementById('map-ov').classList.add('open');
}
function closeMap(){document.getElementById('map-ov').classList.remove('open')}

// Events
document.getElementById('search').addEventListener('input',e=>{search=e.target.value;render()});
document.getElementById('sort').addEventListener('change',e=>{sort=e.target.value;render()});
document.getElementById('f-color').addEventListener('click',e=>{
  const btn=e.target.closest('.fb');if(!btn)return;
  document.querySelectorAll('#f-color .fb').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');fColor=btn.dataset.f;render();
});
document.getElementById('f-caisse').addEventListener('click',e=>{
  const btn=e.target.closest('.fb');if(!btn)return;
  document.querySelectorAll('#f-caisse .fb').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');fCaisse=btn.dataset.c;render();
});
document.getElementById('f-format').addEventListener('click',e=>{
  const btn=e.target.closest('.fb');if(!btn)return;
  document.querySelectorAll('#f-format .fb').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');fFormat=btn.dataset.fo;render();
});
document.getElementById('ov').addEventListener('click',e=>{if(e.target===e.currentTarget)closeModal()});
document.getElementById('map-ov').addEventListener('click',e=>{if(e.target===e.currentTarget)closeMap()});

// Simple client-side gate: deters casual visitors who land on the link,
// not a real security boundary (credentials are readable in this file).
const AUTH_USER = 'wdebodin';
const AUTH_PASS = 'Will123!';
const AUTH_KEY = 'cave_auth_ok';

function initApp(){
  document.getElementById('login-gate').classList.remove('open');
  document.getElementById('app-content').style.display = '';
  fetch('wines.json').then(r=>r.json()).catch(()=>[]).then(fromFile=>{
    wines = mergeWithLocal(fromFile, loadLocal());
    save(wines);
    render();
  });
}

function tryLogin(){
  const u = document.getElementById('login-user').value.trim();
  const p = document.getElementById('login-pass').value;
  if(u === AUTH_USER && p === AUTH_PASS){
    localStorage.setItem(AUTH_KEY, '1');
    initApp();
  } else {
    document.getElementById('login-error').textContent = 'Identifiant ou mot de passe incorrect';
  }
}
document.getElementById('login-pass').addEventListener('keydown', e=>{if(e.key==='Enter') tryLogin()});
document.getElementById('login-user').addEventListener('keydown', e=>{if(e.key==='Enter') tryLogin()});

if(localStorage.getItem(AUTH_KEY) === '1'){
  initApp();
}

// PWA install prompt
let deferredPrompt;
window.addEventListener('beforeinstallprompt', e=>{
  e.preventDefault();
  deferredPrompt = e;
  document.getElementById('install-btn').classList.add('show');
});
document.getElementById('install-btn').addEventListener('click', async ()=>{
  if(!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
  document.getElementById('install-btn').classList.remove('show');
});
window.addEventListener('appinstalled', ()=>{
  document.getElementById('install-btn').classList.remove('show');
});

if('serviceWorker' in navigator){
  window.addEventListener('load', ()=>{
    navigator.serviceWorker.register('sw.js');
  });
}
