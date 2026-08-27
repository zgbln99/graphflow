const state={templates:[{id:'final',name:'Final Score',category:'Mecz',size:'1080×1350',fields:[{key:'home_score',label:'Wynik Zastal',type:'number',value:92},{key:'away_score',label:'Wynik Anwil',type:'number',value:81},{key:'status',label:'Status',type:'select',value:'FINAL',options:['Q1','HALFTIME','Q3','FINAL','OT']},{key:'photo',label:'Zdjęcie',type:'photo',value:'IMG_4231'}],layers:[{id:'overlay',name:'Overlay PNG',type:'overlay',locked:true,visible:true,z:5},{id:'away',name:'Wynik gości',type:'text',field:'away_score',locked:false,visible:true,z:4},{id:'home',name:'Wynik gospodarzy',type:'text',field:'home_score',locked:false,visible:true,z:3},{id:'photo',name:'Zdjęcie',type:'photo',field:'photo',locked:false,visible:true,z:2,fit:'cover',mask:true},{id:'bg',name:'Tło',type:'background',locked:true,visible:true,z:1}]},{id:'matchday',name:'Matchday',category:'Mecz',size:'1080×1350',fields:[{key:'photo',label:'Zdjęcie',type:'photo',value:'IMG_4232'},{key:'date',label:'Data',type:'text',value:'27.09.2026'}],layers:[{id:'overlay',name:'Overlay PNG',type:'overlay',locked:true,visible:true,z:3},{id:'photo',name:'Zdjęcie',type:'photo',field:'photo',locked:false,visible:true,z:2},{id:'bg',name:'Tło',type:'background',locked:true,visible:true,z:1}]},{id:'birthday',name:'Urodziny',category:'Inne',size:'1080×1350',fields:[{key:'player_name',label:'Zawodnik',type:'text',value:'Jan Kowalski'},{key:'photo',label:'Zdjęcie',type:'photo',value:'IMG_4250'}],layers:[{id:'overlay',name:'Overlay PNG',type:'overlay',locked:true,visible:true,z:3},{id:'photo',name:'Zdjęcie',type:'photo',field:'photo',locked:false,visible:true,z:2},{id:'name',name:'Imię i nazwisko',type:'text',field:'player_name',locked:false,visible:true,z:4}]}],currentTemplate:'final',selectedLayer:'photo'};

const shell=document.getElementById('app-shell');
document.getElementById('mobile-menu')?.addEventListener('click',()=>shell.classList.toggle('sidebar-open'));
document.getElementById('sidebar-backdrop')?.addEventListener('click',()=>shell.classList.remove('sidebar-open'));

const views=[...document.querySelectorAll('.view')],title=document.getElementById('page-title'),eyebrow=document.getElementById('eyebrow');
function showView(name){views.forEach(v=>v.classList.remove('active-view'));const el=document.getElementById('view-'+name);if(el)el.classList.add('active-view');document.querySelectorAll('.sidebar nav button').forEach(b=>b.classList.toggle('active',b.dataset.view===name));const labels={dashboard:'Przegląd',matches:'Mecze',match:'Zastal vs Anwil',editor:'Edytor grafiki',other:'Materiały klubowe',social:'Monitoring social',templates:'Szablony',library:'Zdjęcia',history:'Eksporty',settings:'Ustawienia'};title.textContent=labels[name]||name;eyebrow.textContent=(name==='match'||name==='editor')?'Mecz':'Zastal Marketing Center';shell.classList.remove('sidebar-open');if(name==='social')loadSocialView()}
document.querySelectorAll('.sidebar nav button').forEach(b=>b.addEventListener('click',()=>showView(b.dataset.view)));
document.querySelector('[data-match]')?.addEventListener('click',e=>{if(e.target.tagName!=='BUTTON')showView('match')});

const graphicNames=['Matchday','Starting Five','Q1','Halftime','Q3','Final Score','MVP','Player Stats'];
const grid=document.getElementById('graphic-grid');graphicNames.forEach((name,i)=>{const d=document.createElement('article');d.className='graphic-card';d.innerHTML=`<div class="graphic-thumb"></div><footer><b>${name}</b><span>${i<4?'Gotowe':'Do zrobienia'}</span></footer>`;d.addEventListener('click',()=>{state.currentTemplate=name==='Final Score'?'final':'matchday';renderEditor();showView('editor')});grid.appendChild(d)});

function renderDynamicFields(){const root=document.getElementById('dynamic-fields');root.innerHTML='';const t=state.templates.find(x=>x.id===state.currentTemplate);document.getElementById('editor-template-name').textContent=t.name;t.fields.forEach(f=>{const wrap=document.createElement('div');wrap.className='field';const label=document.createElement('label');label.textContent=f.label;wrap.appendChild(label);let input;if(f.type==='select'){input=document.createElement('select');f.options.forEach(o=>input.add(new Option(o,o)));input.value=f.value}else if(f.type==='photo'){input=document.createElement('button');input.className='ghost full';input.textContent='Wybierz z folderów meczu'}else{input=document.createElement('input');input.type=f.type==='number'?'number':'text';input.value=f.value}if(input.tagName!=='BUTTON')input.addEventListener('input',e=>{f.value=e.target.value;drawCanvas()});wrap.appendChild(input);root.appendChild(wrap)})}

const photos=document.getElementById('photo-grid');for(let i=4231;i<4252;i++){const p=document.createElement('div');p.className='photo';p.dataset.file='IMG_'+i;p.title='IMG_'+i;p.addEventListener('click',()=>{document.querySelectorAll('.photo').forEach(x=>x.classList.remove('selected'));p.classList.add('selected');const t=state.templates.find(x=>x.id===state.currentTemplate);const field=t.fields.find(x=>x.type==='photo');if(field)field.value=p.dataset.file;drawCanvas()});photos.appendChild(p)}

function drawCanvas(){const c=document.getElementById('design-canvas'),ctx=c.getContext('2d'),t=state.templates.find(x=>x.id===state.currentTemplate);ctx.clearRect(0,0,c.width,c.height);ctx.fillStyle='#0b1014';ctx.fillRect(0,0,c.width,c.height);ctx.fillStyle='#152a1d';ctx.fillRect(20,20,c.width-40,c.height-40);ctx.fillStyle='#0b0f12';ctx.fillRect(40,40,c.width-80,c.height-80);const photo=t.fields.find(x=>x.type==='photo');ctx.fillStyle='#253128';ctx.fillRect(70,110,c.width-140,360);ctx.fillStyle='#7f8c84';ctx.font='16px sans-serif';ctx.textAlign='center';ctx.fillText(photo?photo.value:'PHOTO',c.width/2,290);ctx.fillStyle='#fff';ctx.font='bold 38px sans-serif';ctx.fillText(t.name.toUpperCase(),c.width/2,85);const hs=t.fields.find(x=>x.key==='home_score'),as=t.fields.find(x=>x.key==='away_score');if(hs&&as){ctx.font='bold 92px sans-serif';ctx.fillText(String(hs.value),160,585);ctx.fillText(String(as.value),380,585);ctx.fillStyle='#20c56b';ctx.font='bold 42px sans-serif';ctx.fillText('VS',270,575)}ctx.strokeStyle='#20c56b';ctx.lineWidth=3;ctx.strokeRect(40,40,c.width-80,c.height-80);ctx.fillStyle='#d8dde0';ctx.font='15px sans-serif';ctx.fillText('27.09.2026 • HALA CRS, ZIELONA GÓRA',c.width/2,635)}
function renderEditor(){renderDynamicFields();drawCanvas()}

function renderTemplates(){const list=document.getElementById('template-list');list.innerHTML='';state.templates.forEach(t=>{const r=document.createElement('div');r.className='template-row';r.innerHTML=`<div class="mini"></div><div><b>${t.name}</b><span style="display:block;color:#85919c;font-size:10px">${t.category} • ${t.size}</span></div><button>›</button>`;r.addEventListener('click',()=>{state.currentTemplate=t.id;state.selectedLayer=t.layers[0]?.id;renderLayers()});list.appendChild(r)});renderLayers()}
function renderLayers(){const t=state.templates.find(x=>x.id===state.currentTemplate),root=document.getElementById('layers-list');root.innerHTML='';[...t.layers].sort((a,b)=>b.z-a.z).forEach(l=>{const row=document.createElement('div');row.className='layer-row'+(l.id===state.selectedLayer?' active':'');row.innerHTML=`<span>☰</span><div><b>${l.name}</b><span style="display:block;color:#85919c;font-size:10px">${l.type}${l.field?' • '+l.field:''}</span></div><button>${l.locked?'🔒':'◉'}</button>`;row.addEventListener('click',()=>{state.selectedLayer=l.id;renderLayers()});root.appendChild(row)});renderLayerProps()}
function renderLayerProps(){const t=state.templates.find(x=>x.id===state.currentTemplate),l=t.layers.find(x=>x.id===state.selectedLayer),root=document.getElementById('layer-properties');if(!l){root.innerHTML='<p>Wybierz warstwę.</p>';return}root.innerHTML=`<label>Nazwa<input id="lp-name" value="${l.name}"></label><label>Typ<select id="lp-type"><option>${l.type}</option><option>photo</option><option>text</option><option>overlay</option><option>background</option></select></label><label>Warstwa / z-index<input type="number" id="lp-z" value="${l.z}"></label><label class="switchline">Widoczna <input type="checkbox" id="lp-visible" ${l.visible?'checked':''}></label><label class="switchline">Zablokowana <input type="checkbox" id="lp-locked" ${l.locked?'checked':''}></label>${l.type==='photo'?'<label class="switchline">Kadrowanie w masce <input type="checkbox" checked></label><label>Tryb dopasowania<select><option>cover</option><option>contain</option></select></label>':''}`;document.getElementById('lp-name').oninput=e=>{l.name=e.target.value};document.getElementById('lp-z').oninput=e=>{l.z=Number(e.target.value);renderLayers()};document.getElementById('lp-visible').onchange=e=>l.visible=e.target.checked;document.getElementById('lp-locked').onchange=e=>l.locked=e.target.checked}
document.getElementById('add-layer')?.addEventListener('click',()=>{const t=state.templates.find(x=>x.id===state.currentTemplate),id='layer_'+Date.now();t.layers.push({id,name:'Nowa warstwa',type:'photo',locked:false,visible:true,z:t.layers.length+1});state.selectedLayer=id;renderLayers()});
document.getElementById('create-template')?.addEventListener('click',()=>{const id='template_'+Date.now();state.templates.push({id,name:'Nowy szablon',category:'Mecz',size:'1080×1350',fields:[],layers:[{id:'overlay',name:'Overlay PNG',type:'overlay',locked:true,visible:true,z:2},{id:'photo',name:'Zdjęcie',type:'photo',locked:false,visible:true,z:1}]});state.currentTemplate=id;renderTemplates()});

const other=document.getElementById('other-grid');['Urodziny','Transfer','Nowy sponsor','Komunikat klubowy','MVP miesiąca','Kontuzja'].forEach(n=>{const d=document.createElement('div');d.className='other-card';d.innerHTML=`<div class="other-thumb"></div><b>${n}</b><span style="display:block;color:#85919c;font-size:11px">Szablon dynamiczny</span>`;other.appendChild(d)});
const lib=document.getElementById('library-grid');for(let i=0;i<24;i++){const p=document.createElement('div');p.className='photo';lib.appendChild(p)}
const history=document.getElementById('history-body');[['Final Score','Zastal vs Anwil','27.09.2026 19:32'],['Halftime','Zastal vs Anwil','27.09.2026 18:45'],['Matchday','Zastal vs Anwil','27.09.2026 12:10'],['Urodziny','Piotr Nowak','26.09.2026 08:00']].forEach(r=>{const tr=document.createElement('tr');tr.innerHTML=`<td><div style="width:52px;height:38px;background:#183626;border-radius:5px"></div></td><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td><td>PNG</td><td>${document.querySelector('.profile-copy b')?.textContent||'Użytkownik'}</td>`;history.appendChild(tr)});

renderTemplates();renderEditor();

const socialElements={
  connection:document.getElementById('social-connection'),
  lastSync:document.getElementById('social-last-sync'),
  followers:document.getElementById('social-followers'),
  postCount:document.getElementById('social-post-count'),
  average:document.getElementById('social-average'),
  engagement:document.getElementById('social-engagement'),
  posts:document.getElementById('social-posts'),
  advice:document.getElementById('social-advice'),
  model:document.getElementById('social-analysis-model'),
  refresh:document.getElementById('social-refresh'),
  analyze:document.getElementById('social-analyze')
};
let socialViewLoaded=false;
let socialIntegrations=null;

function escapeHTML(value){
  return String(value??'').replace(/[&<>'"]/g,char=>({
    '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'
  })[char]);
}

function safeExternalUrl(value){
  try{
    const url=new URL(value);
    return ['http:','https:'].includes(url.protocol)?url.href:'#';
  }catch{return '#'}
}

function formatSocialNumber(value){
  return new Intl.NumberFormat('pl-PL',{maximumFractionDigits:1}).format(Number(value||0));
}

function formatSocialDate(value){
  if(!value)return 'Brak daty';
  return new Intl.DateTimeFormat('pl-PL',{
    day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'
  }).format(new Date(value));
}

function setSocialConnection(state,title,detail){
  if(!socialElements.connection)return;
  socialElements.connection.dataset.state=state;
  const titleNode=socialElements.connection.querySelector('b');
  if(titleNode)titleNode.textContent=title;
  if(socialElements.lastSync)socialElements.lastSync.textContent=detail;
}

function setSocialBusy(button,busy,label){
  if(!button)return;
  if(!button.dataset.label)button.dataset.label=button.textContent;
  button.disabled=busy;
  button.textContent=busy?label:button.dataset.label;
}

async function socialRequest(url,options={}){
  const response=await fetch(url,{
    ...options,
    headers:{'Content-Type':'application/json',...(options.headers||{})}
  });
  const payload=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(payload.error||'Nie udało się pobrać danych.');
  return payload;
}

function renderSocialOverview(overview){
  if(!overview)return;
  socialElements.followers.textContent=overview.page.followers?formatSocialNumber(overview.page.followers):'—';
  socialElements.postCount.textContent=formatSocialNumber(overview.posts.length);
  socialElements.average.textContent=formatSocialNumber(overview.averages.interactions);
  socialElements.engagement.textContent=overview.averages.engagementRate===null?'—':`${formatSocialNumber(overview.averages.engagementRate)}%`;

  if(!overview.posts.length){
    socialElements.posts.innerHTML='<div class="social-empty"><b>Brak publikacji</b><span>Facebook nie zwrócił postów z wybranego okresu.</span></div>';
    return;
  }

  socialElements.posts.innerHTML=overview.posts.map(post=>{
    const url=safeExternalUrl(post.permalinkUrl);
    const best=post.id===overview.bestPostId?' is-best':'';
    return `<article class="social-post-row${best}">
      <time>${escapeHTML(formatSocialDate(post.createdAt))}</time>
      <div class="social-post-copy">
        <b>${escapeHTML(post.message.slice(0,150))}${post.message.length>150?'…':''}</b>
        <span>${best?'<em>Najlepszy wynik</em>':''}${post.imageUrl?'Post ze zdjęciem':'Post tekstowy'}</span>
      </div>
      <div class="social-post-result"><b>${formatSocialNumber(post.interactions)}</b><span>interakcji</span></div>
      <div class="social-post-breakdown"><span>${formatSocialNumber(post.reactions)} reakcji</span><span>${formatSocialNumber(post.comments)} komentarzy</span><span>${formatSocialNumber(post.shares)} udostępnień</span></div>
      ${url!=='#'?`<a href="${escapeHTML(url)}" target="_blank" rel="noopener noreferrer" aria-label="Otwórz post na Facebooku">↗</a>`:''}
    </article>`;
  }).join('');
}

function renderSocialAnalysis(analysis){
  if(!analysis)return;
  socialElements.model.textContent=analysis.model||'OpenAI';
  const action=analysis.recommendedAction;
  const suggestions=(analysis.suggestions||[]).map((item,index)=>`
    <article class="social-suggestion">
      <span>0${index+1} · ${escapeHTML(item.timing)}</span>
      <b>${escapeHTML(item.title)}</b>
      <p>${escapeHTML(item.concept)}</p>
      <footer><span>${escapeHTML(item.channel)} · ${escapeHTML(item.format)}</span><em>${escapeHTML(item.why)}</em></footer>
    </article>
  `).join('');
  const observations=(analysis.observations||[]).map(item=>`<li>${escapeHTML(item)}</li>`).join('');

  socialElements.advice.innerHTML=`
    <section class="social-recommendation" data-priority="${escapeHTML(action.priority)}">
      <span>Najważniejsza rekomendacja</span>
      <h4>${escapeHTML(action.title)}</h4>
      <p>${escapeHTML(action.rationale)}</p>
      <div><b>${escapeHTML(action.publishAt)}</b><span>${escapeHTML(action.format)}</span></div>
    </section>
    <section class="social-observations">
      <span>Wnioski z profilu</span>
      <p>${escapeHTML(analysis.summary)}</p>
      <ul>${observations}</ul>
    </section>
    <section class="social-suggestions">
      <header><span>Kolejne pomysły</span><b>Okno: ${escapeHTML(analysis.timing.bestWindow)}</b></header>
      ${suggestions}
    </section>
  `;
}

function renderSocialSetup(status){
  const facebookReady=status.facebook.configured;
  const openaiReady=status.openai.configured;
  if(!facebookReady){
    setSocialConnection('setup','Facebook niepołączony','Dodaj dane strony Meta na serwerze');
    socialElements.posts.innerHTML='<div class="social-empty"><b>Połącz profil klubowy</b><span>Administrator musi dodać identyfikator strony i token dostępu Meta.</span></div>';
  }else if(!openaiReady){
    setSocialConnection('partial','Facebook połączony','Brakuje konfiguracji analizy OpenAI');
    socialElements.advice.innerHTML='<div class="social-empty"><b>Analiza OpenAI nieaktywna</b><span>Po dodaniu klucza API rekomendacje pojawią się w tym miejscu.</span></div>';
  }else{
    const detail=status.facebook.monitoringEnabled
      ?`Monitoring automatyczny co ${status.facebook.intervalMinutes} min`
      :'Facebook i OpenAI są gotowe';
    setSocialConnection('ready','Integracje aktywne',detail);
  }
}

async function loadSocialOverview(){
  try{
    const payload=await socialRequest('/api/social/overview');
    renderSocialOverview(payload.overview);
    if(payload.analysis)renderSocialAnalysis(payload.analysis);
    setSocialConnection(
      socialIntegrations?.openai.configured?'ready':'partial',
      'Dane Facebook aktualne',
      `Ostatnia synchronizacja: ${formatSocialDate(payload.overview.fetchedAt)}`
    );
  }catch(error){
    setSocialConnection('error','Nie udało się pobrać Facebooka',error.message);
    socialElements.posts.innerHTML=`<div class="social-empty is-error"><b>Błąd synchronizacji</b><span>${escapeHTML(error.message)}</span></div>`;
  }
}

async function loadSocialView(){
  if(socialViewLoaded||!socialElements.connection)return;
  socialViewLoaded=true;
  try{
    const payload=await socialRequest('/api/social/status');
    socialIntegrations=payload.integrations;
    renderSocialSetup(socialIntegrations);
    if(payload.cache?.overview)renderSocialOverview(payload.cache.overview);
    if(payload.cache?.analysis)renderSocialAnalysis(payload.cache.analysis);
    if(socialIntegrations.facebook.configured)await loadSocialOverview();
  }catch(error){
    socialViewLoaded=false;
    setSocialConnection('error','Integracje niedostępne',error.message);
  }
}

socialElements.refresh?.addEventListener('click',async()=>{
  setSocialBusy(socialElements.refresh,true,'Odświeżam…');
  try{
    const payload=await socialRequest('/api/social/refresh',{method:'POST',body:'{}'});
    renderSocialOverview(payload.overview);
    setSocialConnection('ready','Dane Facebook aktualne',`Ostatnia synchronizacja: ${formatSocialDate(payload.overview.fetchedAt)}`);
  }catch(error){
    setSocialConnection('error','Błąd synchronizacji',error.message);
  }finally{
    setSocialBusy(socialElements.refresh,false);
  }
});

socialElements.analyze?.addEventListener('click',async()=>{
  setSocialBusy(socialElements.analyze,true,'Analizuję…');
  setSocialConnection('loading','Analiza w toku','OpenAI analizuje ostatnie publikacje');
  try{
    const payload=await socialRequest('/api/social/analyze',{
      method:'POST',
      body:JSON.stringify({refresh:true})
    });
    renderSocialOverview(payload.overview);
    renderSocialAnalysis(payload.analysis);
    setSocialConnection('ready','Analiza gotowa',`Wygenerowano: ${formatSocialDate(payload.analysis.generatedAt)}`);
  }catch(error){
    setSocialConnection('error','Analiza nieudana',error.message);
  }finally{
    setSocialBusy(socialElements.analyze,false);
  }
});
