(() => {
  const {escape:esc,normalize,mapUrl,https,backend,taxonomy}=Guide;
  const $=id=>document.getElementById(id);
  let places=window.SEED_PLACES.slice(),type='Todos',neighborhood='Todos',category='Todas',specialty='Todas',query='';
  let lastFocus=null;
  function choices(){
    $('types').innerHTML=['Todos','Comércio','Serviço'].map(t=>`<button class="filter ${t===type?'active':''}" data-type="${t}" aria-pressed="${t===type}">${t==='Comércio'?'Comércios':t==='Serviço'?'Serviços':'Tudo'}</button>`).join('');
    $('neighborhoods').innerHTML=['Todos',...Guide.neighborhoods].map(n=>`<button class="filter ${n===neighborhood?'active':''}" data-neighborhood="${n}" aria-pressed="${n===neighborhood}">${n==='Todos'?'Todos os bairros':n}</button>`).join('');
    const cats=['Todas',...new Set(places.filter(p=>type==='Todos'||p.type===type).map(p=>p.category))];
    if(!cats.includes(category))category='Todas';
    $('categories').innerHTML=cats.map(c=>`<button class="${c===category?'active':''}" data-category="${esc(c)}" aria-pressed="${c===category}">${esc(c)}</button>`).join('');
    $('specialtyFilter').hidden=type!=='Serviço';
    const names=[...(category==='Todas'?Object.values(taxonomy.Serviço).flat():taxonomy.Serviço[category]||[]),...places.filter(p=>p.type==='Serviço'&&(category==='Todas'||p.category===category)).flatMap(p=>p.specialties||[])];
    const specs=['Todas',...new Map(names.map(n=>[Guide.labelKey(n),n])).values()];
    if(!specs.includes(specialty))specialty='Todas';
    $('specialtySelect').innerHTML=specs.map(s=>`<option ${s===specialty?'selected':''}>${esc(s)}</option>`).join('');
  }
  function render(){
    choices();
    const filtered=places.filter(p=>(type==='Todos'||p.type===type)&&(category==='Todas'||p.category===category)&&(specialty==='Todas'||p.specialties?.includes(specialty))&&(neighborhood==='Todos'||(p.type==='Serviço'&&p.areas?.length?p.areas.includes(neighborhood):p.neighborhood===neighborhood))&&normalize([p.name,p.category,p.neighborhood,p.description,p.address,...p.specialties||[],...p.areas||[]].join(' ')).includes(normalize(query)));
    $('count').textContent=`${filtered.length} ${filtered.length===1?'resultado':'resultados'}`;
    $('results').innerHTML=filtered.length?filtered.map(p=>{
      const index=places.indexOf(p),map=mapUrl(p),areas=p.type==='Serviço'&&p.areas?.length?`Atende: ${p.areas.join(', ')}`:p.neighborhood;
      return `<article class="card" data-card="${index}"><div class="icon" aria-hidden="true">${esc(p.icon|| (p.type==='Serviço'?'🛠️':'🏪'))}</div><div class="tag">${esc(p.category)} · ${esc(p.type)}</div><h3><a href="#detalhes" data-place="${index}" aria-haspopup="dialog">${esc(p.name)}</a></h3><p>${esc(p.description)}</p>${p.specialties?.length?`<div class="specialty-tags">${p.specialties.map(s=>`<span>${esc(s)}</span>`).join('')}</div>`:''}<div class="foot">${map?`<a href="${map}" target="_blank" rel="noopener noreferrer" aria-label="Abrir ${esc(p.name)} no Google Maps">📍 ${esc(areas)} · Ver no mapa ↗</a>`:`<span>📍 ${esc(areas||'Consulte a área de atendimento')}</span>`}</div></article>`;
    }).join(''):'<div class="empty">Nenhum resultado para estes filtros. Tente outra especialidade, bairro ou palavra.<br><a href="cadastro.html">É prestador? Cadastre seu serviço.</a></div>';
  }
  function openPlace(index){
    const p=places[index];if(!p)return;
    lastFocus=document.activeElement;
    $('dialogIcon').textContent=p.icon||'🏪';$('dialogTag').textContent=`${p.category} · ${p.type}`;$('dialogTitle').textContent=p.name;
    const map=mapUrl(p),address=p.hasLocation!==false&&p.address?`${p.address} · ${p.neighborhood}, Americana - SP`:p.areas?.length?`Atende: ${p.areas.join(', ')}`:'Atendimento a domicílio';
    $('dialogAddress').innerHTML=map?`<a href="${map}" target="_blank" rel="noopener noreferrer">📍 ${esc(address)} ↗</a>`:esc(address);
    $('dialogDescription').textContent=p.description+(p.specialties?.length?` Especialidades: ${p.specialties.join(', ')}.`:'');
    $('hoursBlock').hidden=!p.hours;$('dialogHours').textContent=p.hours||'';
    const links=[];
    if(map)links.push(`<a href="${map}" target="_blank" rel="noopener noreferrer">Abrir no Google Maps ↗</a>`);
    if(https(p.source)&&p.source!==map)links.push(`<a class="secondary" href="${esc(https(p.source))}" target="_blank" rel="noopener noreferrer">Ver fonte ↗</a>`);
    const phone=String(p.phone||'').replace(/\D/g,'');
    if(phone){links.push(`<a class="secondary" href="tel:+55${phone}">Ligar</a>`);if(p.whatsapp)links.push(`<a class="secondary" href="https://wa.me/55${phone}" target="_blank" rel="noopener noreferrer">WhatsApp ↗</a>`);}
    if(https(p.instagram))links.push(`<a class="secondary" href="${esc(https(p.instagram))}" target="_blank" rel="noopener noreferrer">Instagram ↗</a>`);
    $('dialogActions').innerHTML=links.join('');$('backdrop').classList.add('open');document.body.style.overflow='hidden';$('closeDialog').focus();
  }
  function close(){ $('backdrop').classList.remove('open');document.body.style.overflow='';if(lastFocus?.isConnected)lastFocus.focus();}
  $('searchForm').addEventListener('submit',e=>{e.preventDefault();query=$('searchInput').value.trim();render();$('guia').scrollIntoView({behavior:'smooth'});});
  $('searchInput').addEventListener('input',e=>{query=e.target.value.trim();render();});
  $('types').addEventListener('click',e=>{const b=e.target.closest('[data-type]');if(b){type=b.dataset.type;category='Todas';specialty='Todas';render();}});
  $('neighborhoods').addEventListener('click',e=>{const b=e.target.closest('[data-neighborhood]');if(b){neighborhood=b.dataset.neighborhood;render();}});
  $('categories').addEventListener('click',e=>{const b=e.target.closest('[data-category]');if(b){category=b.dataset.category;specialty='Todas';render();}});
  $('specialtySelect').addEventListener('change',e=>{specialty=e.target.value;render();});
  $('results').addEventListener('click',e=>{
    const detail=e.target.closest('[data-place]');
    if(detail){e.preventDefault();openPlace(Number(detail.dataset.place));return;}
    if(e.target.closest('a,button,input,select,textarea')||window.getSelection()?.toString())return;
    const card=e.target.closest('[data-card]');
    if(card&&matchMedia('(max-width: 850px), (pointer: coarse)').matches)openPlace(Number(card.dataset.card));
  });
  $('closeDialog').addEventListener('click',close);$('backdrop').addEventListener('click',e=>{if(e.target===$('backdrop'))close();});
  document.addEventListener('keydown',e=>{
    if(!$('backdrop').classList.contains('open'))return;
    if(e.key==='Escape')close();
    if(e.key==='Tab'){const nodes=[...$('backdrop').querySelectorAll('button,a[href]')];const first=nodes[0],last=nodes.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}
  });
  render();
  if(backend.configured)Promise.allSettled([backend.publicPlaces(),backend.catalog()]).then(([listingResult,catalogResult])=>{if(listingResult.status==='fulfilled')places=listingResult.value.map(({has_location,...p})=>({...p,hasLocation:has_location}));else $('loadMessage').textContent='Não foi possível atualizar os dados online. Exibindo a seleção inicial do guia.';if(catalogResult.status==='fulfilled')Guide.useCatalog(catalogResult.value);render();});
})();
