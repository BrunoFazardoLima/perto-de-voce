(() => {
  const {escape:esc,normalize,mapUrl,https,backend,taxonomy}=Guide;
  const $=id=>document.getElementById(id);
  let places=window.SEED_PLACES.slice(),type='Todos',neighborhood='Todos',category='Todas',specialty='Todas',query='';
  let lastFocus=null,activePlace=null,resultCount=0,searchTimer,lastSearch='';
  const track=(event,data)=>window.GuideAnalytics?.track(event,data);
  function listingFields(p){return {listing_id:String(p.id||`seed-${window.SEED_PLACES.indexOf(p)}`),listing_category:p.category,listing_type:p.type};}
  function measureSearch(){clearTimeout(searchTimer);if(!query||query===lastSearch)return;lastSearch=query;track('guide_search',{query_length:query.length,result_count:resultCount});}
  function businessIcon(p){
    const text=normalize([p.category,...p.specialties||[]].join(' '));
    const paths=/publicidade|marketing|design|tecnologia|informatica/.test(text)?'<rect x="3" y="4" width="18" height="13" rx="1.5"/><path d="M8 21h8m-4-4v4"/>':
      /pets|agropecuaria/.test(text)?'<ellipse cx="7" cy="7" rx="2" ry="3"/><ellipse cx="17" cy="7" rx="2" ry="3"/><ellipse cx="3.5" cy="12" rx="1.5" ry="2.5"/><ellipse cx="20.5" cy="12" rx="1.5" ry="2.5"/><path d="M6 19c0-3 4-7 6-7s6 4 6 7c0 2-3 2-6 1-3 1-6 1-6-1Z"/>':
      /beleza|barbearia|cabeleireiro/.test(text)?'<circle cx="6" cy="18" r="3"/><circle cx="18" cy="18" r="3"/><path d="m8 16 11-13M16 16 5 3m7 8v1"/>':
      /saude|academia/.test(text)?'<path d="M20 5c-3-3-7-1-8 1-1-2-5-4-8-1-4 4 1 9 8 15 7-6 12-11 8-15Z"/><path d="M4 11h4l2-3 3 7 2-4h5"/>':
      /moda/.test(text)?'<path d="M10 6a2 2 0 1 1 3 2l-1 1v3L3 18c-1 1 0 2 1 2h16c1 0 2-1 1-2l-9-6"/>':
      /mercado|bebida|alimentacao/.test(text)?'<path d="M2 3h3l3 13h11l3-10H6M9 16l-1 2h12"/><circle cx="9" cy="21" r="1"/><circle cx="19" cy="21" r="1"/>':
      '<path d="M14 4a6 6 0 0 0-7 7L2 16a3 3 0 0 0 4 4l5-5a6 6 0 0 0 7-7l-4 4-4-4Z"/>';
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
  }
  function choices(){
    $('types').innerHTML=['Todos','Comércio','Serviço'].map(t=>`<button class="filter ${t===type?'active':''}" data-type="${t}" aria-pressed="${t===type}">${t==='Comércio'?'Comércios':t==='Serviço'?'Serviços':'Tudo'}</button>`).join('');
    $('neighborhoodSelect').innerHTML=['Todos',...Guide.neighborhoods].map(n=>`<option value="${esc(n)}" ${n===neighborhood?'selected':''}>${esc(n==='Todos'?'Todos os bairros':n)}</option>`).join('');
    const cats=['Todas',...new Set(places.filter(p=>type==='Todos'||p.type===type).map(p=>p.category))];
    if(!cats.includes(category))category='Todas';
    $('categorySelect').innerHTML=cats.map(c=>`<option value="${esc(c)}" ${c===category?'selected':''}>${esc(c==='Todas'?'Todas as categorias':c)}</option>`).join('');
    $('specialtyFilter').hidden=type!=='Serviço';
    const names=[...(category==='Todas'?Object.values(taxonomy.Serviço).flat():taxonomy.Serviço[category]||[]),...places.filter(p=>p.type==='Serviço'&&(category==='Todas'||p.category===category)).flatMap(p=>p.specialties||[])];
    const specs=['Todas',...new Map(names.map(n=>[Guide.labelKey(n),n])).values()];
    if(!specs.includes(specialty))specialty='Todas';
    $('specialtySelect').innerHTML=specs.map(s=>`<option ${s===specialty?'selected':''}>${esc(s)}</option>`).join('');
  }
  function render(){
    choices();
    const filtered=places.filter(p=>(type==='Todos'||p.type===type)&&(category==='Todas'||p.category===category)&&(specialty==='Todas'||p.specialties?.includes(specialty))&&(neighborhood==='Todos'||(p.type==='Serviço'&&p.areas?.length?p.areas.includes(neighborhood):p.neighborhood===neighborhood))&&normalize([p.name,p.category,p.neighborhood,p.description,p.address,...p.specialties||[],...p.areas||[]].join(' ')).includes(normalize(query)));
    resultCount=filtered.length;
    $('count').textContent=`${filtered.length} ${filtered.length===1?'resultado':'resultados'}`;
    $('results').innerHTML=filtered.length?filtered.map(p=>{
      const index=places.indexOf(p),map=mapUrl(p),areas=p.type==='Serviço'&&p.areas?.length?`Atende: ${p.areas.join(', ')}`:p.neighborhood;
      return `<article class="card" data-card="${index}"><div class="card-main"><div class="icon" aria-hidden="true">${businessIcon(p)}</div><div class="card-copy"><h3><a href="#detalhes" data-place="${index}" aria-haspopup="dialog">${esc(p.name)}</a></h3><div class="card-tags"><span>${esc(p.type)}</span><span>${esc(p.category)}</span></div><p>${esc(p.description)}</p>${p.specialties?.length?`<div class="specialty-tags">${p.specialties.map(s=>`<span>${esc(s)}</span>`).join('')}</div>`:''}<div class="card-area">${esc(areas||'Consulte a área de atendimento')}</div></div></div><div class="foot"><a class="details-link" href="#detalhes" data-place="${index}" aria-haspopup="dialog" aria-label="Ver detalhes de ${esc(p.name)}">Ver detalhes <span aria-hidden="true">→</span></a>${map?`<a class="map-link" href="${map}" target="_blank" rel="noopener noreferrer" aria-label="Abrir ${esc(p.name)} no Google Maps">Mapa ↗</a>`:''}</div></article>`;
    }).join(''):'<div class="empty">Nenhum resultado para estes filtros. Tente outra especialidade, bairro ou palavra.<br><a href="cadastro.html">É prestador? Cadastre seu serviço.</a></div>';
  }
  function openPlace(index){
    const p=places[index];if(!p)return;
    lastFocus=document.activeElement;activePlace=p;
    track('listing_view',listingFields(p));
    $('dialogIcon').innerHTML=businessIcon(p);$('dialogTag').textContent=`${p.category} · ${p.type}`;$('dialogTitle').textContent=p.name;
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
  $('searchForm').addEventListener('submit',e=>{e.preventDefault();query=$('searchInput').value.trim();render();measureSearch();$('guia').scrollIntoView({behavior:'smooth'});});
  $('searchInput').addEventListener('input',e=>{query=e.target.value.trim();render();clearTimeout(searchTimer);if(!query)lastSearch='';else searchTimer=setTimeout(measureSearch,800);});
  $('types').addEventListener('click',e=>{const b=e.target.closest('[data-type]');if(b){type=b.dataset.type;category='Todas';specialty='Todas';render();track('guide_filter',{filter_type:'tipo',filter_value:type});}});
  $('neighborhoodSelect').addEventListener('change',e=>{neighborhood=e.target.value;render();track('guide_filter',{filter_type:'bairro',filter_value:neighborhood});});
  $('categorySelect').addEventListener('change',e=>{category=e.target.value;specialty='Todas';render();track('guide_filter',{filter_type:'categoria',filter_value:category});});
  $('specialtySelect').addEventListener('change',e=>{specialty=e.target.value;render();track('guide_filter',{filter_type:'especialidade',filter_value:specialty});});
  document.addEventListener('click',e=>{
    const link=e.target.closest('a[href]');if(!link)return;
    const card=link.closest('[data-card]'),inDialog=link.closest('#backdrop');
    const p=card?places[Number(card.dataset.card)]:(inDialog?activePlace:null);if(!p)return;
    let url;try{url=new URL(link.href,location.href);}catch{return;}
    const contact_method=url.protocol==='tel:'?'telefone':url.hostname==='wa.me'?'whatsapp':/(^|\.)instagram\.com$/.test(url.hostname)?'instagram':(url.hostname==='maps.google.com'||url.hostname==='maps.app.goo.gl'||(/(^|\.)google\.(com|com\.br)$/.test(url.hostname)&&url.pathname.startsWith('/maps')))?'mapa':null;
    if(contact_method)track('contact_click',{...listingFields(p),contact_method});
  });
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
