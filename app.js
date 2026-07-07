const NOW = 2026;
const STORAGE_KEY = 'cave_w3';

function loadLocal(){try{const s=localStorage.getItem(STORAGE_KEY);if(s)return JSON.parse(s)}catch(e){}return null}
function save(w){localStorage.setItem(STORAGE_KEY,JSON.stringify(w))}

// Merge fresh entries from wines.json into whatever is already stored locally,
// so edits made in the app (quantities, notes...) survive updates to the source file.
function mergeWithLocal(fromFile, local){
  if(!local) return JSON.parse(JSON.stringify(fromFile));
  const byId = new Map(local.map(w=>[w.id,w]));
  for(const w of fromFile){ if(!byId.has(w.id)) local.push(w); }
  return local;
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

function card(w){
  const st=status(w);
  const bc={'rouge':'badge-rouge','blanc':'badge-blanc','porto':'badge-porto','inconnu':'badge-inconnu'}[w.couleur]||'badge-inconnu';
  const cl={'rouge':'🍷 Rouge','blanc':'🥂 Blanc','porto':'🍶 Porto','inconnu':'❓ Inconnu'}[w.couleur];
  const wt=w.couleur!=='inconnu'
    ?`<div class="w-text">Fenêtre : <strong>${w.debut}–${w.fin}</strong> &nbsp;|&nbsp; Apogée : <strong>${w.apogee_debut}–${w.apogee_fin}</strong></div>`
    :'';
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
        <div class="c-caisse-tag">${w.caisse?`Caisse ${w.caisse}`:'Hors caisse'}</div>
        ${w.format&&w.format!=='bouteille'?`<div class="c-format-tag">${{'magnum':'Magnum','jeroboam':'Jéroboam'}[w.format]||w.format}</div>`:''}
      </div>
    </div>
    <span class="badge ${bc}">${cl}</span>
    <div><span class="status ${st.c}">${st.lbl}</span></div>
    ${tl(w)}
    ${wt}
    ${w.notes?`<div class="notes">${w.notes}</div>`:''}
    <div class="qty-row">
      <span class="qty-l">Bouteilles en cave</span>
      <div style="display:flex;align-items:center">
        <div class="qty-c">
          <button class="qb" onclick="chg(${w.id},-1)">−</button>
          <span class="qv">${w.quantite}</span>
          <button class="qb" onclick="chg(${w.id},1)">+</button>
        </div>
        <div class="acts">
          <button class="bsm" onclick="edit(${w.id})">✏</button>
          <button class="bsm bdel" onclick="del(${w.id})">✕</button>
        </div>
      </div>
    </div>
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
  document.getElementById('grid').innerHTML=list.length
    ?list.map(card).join('')
    :`<div class="empty"><div class="empty-i">🍾</div><p>Aucun vin correspondant</p></div>`;

  const all=wines;
  const tot=all.reduce((s,w)=>s+w.quantite,0);
  const r=all.filter(w=>w.couleur==='rouge').reduce((s,w)=>s+w.quantite,0);
  const b=all.filter(w=>w.couleur==='blanc').reduce((s,w)=>s+w.quantite,0);
  const p=all.filter(w=>w.couleur==='porto').reduce((s,w)=>s+w.quantite,0);
  const bt=all.filter(w=>w.format==='bouteille').reduce((s,w)=>s+w.quantite,0);
  const mg=all.filter(w=>w.format==='magnum').reduce((s,w)=>s+w.quantite,0);
  const jb=all.filter(w=>w.format==='jeroboam').reduce((s,w)=>s+w.quantite,0);
  const cc=c=>all.filter(w=>w.caisse===c).reduce((s,w)=>s+w.quantite,0);
  document.getElementById('stats').innerHTML=
    `<div class="stat"><div class="stat-v">${tot}</div><div class="stat-l">Total</div></div>
     <div class="stat"><div class="stat-v">${r}</div><div class="stat-l">Rouges</div></div>
     <div class="stat"><div class="stat-v">${b}</div><div class="stat-l">Blancs</div></div>
     <div class="stat"><div class="stat-v">${p}</div><div class="stat-l">Portos</div></div>
     <div class="stat"><div class="stat-v">${bt}</div><div class="stat-l">Bouteilles</div></div>
     <div class="stat"><div class="stat-v">${mg}</div><div class="stat-l">Magnums</div></div>
     <div class="stat"><div class="stat-v">${jb}</div><div class="stat-l">Jéroboams</div></div>`;

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
