(() => {
  const {backend,escape:esc,labelKey}=Guide,$=id=>document.getElementById(id);
  let pendingRows=[];
  function message(text,error=false){$('adminMessage').textContent=text;$('adminMessage').classList.toggle('error',error);}
  function panel(){const logged=!!backend.session();$('loginForm').hidden=logged;$('adminPanel').hidden=!logged;}
  const categoriesFor=p=>Guide.getCatalog().filter(c=>c.type===p.type);
  function normalizedWords(text){return labelKey(text).replace(/portoes/g,'portao').replace(/motores/g,'motor').split(' ').filter(w=>w.length>2&&!['para','dos','das','com','uma','outro','servico'].includes(w));}
  function suggestions(p){
    if(!p.requested_service)return [];
    const input=new Set(normalizedWords(p.requested_service));
    return categoriesFor(p).flatMap(c=>c.specialties.filter(s=>s.name!=='Outro serviço').map(s=>{const words=normalizedWords(s.name),matches=words.filter(w=>input.has(w)).length;return {category:c,specialty:s,score:matches/Math.max(1,words.length),matches};})).filter(s=>s.matches>0&&s.score>=.5).sort((a,b)=>b.score-a.score||b.matches-a.matches).slice(0,3);
  }
  function categoryOptions(p){const cats=categoriesFor(p);const match=cats.find(c=>labelKey(c.name)===labelKey(p.category));return cats.map(c=>`<option value="${esc(c.id)}" ${match?.id===c.id?'selected':''}>${esc(c.name)}</option>`).join('')+'<option value="__new">+ Criar categoria</option>';}
  function specialtyOptions(categoryId,selected=[]){const cat=Guide.getCatalog().find(c=>c.id===categoryId);return (cat?.specialties||[]).map(s=>`<label class="check-line"><input type="checkbox" data-specialty value="${esc(s.id)}" ${selected.some(n=>labelKey(n)===labelKey(s.name))?'checked':''}> ${esc(s.name)}</label>`).join('')||'<p class="muted">Você pode criar a primeira especialidade desta categoria no campo abaixo.</p>';}
  function classificationPanel(r){
    const p=r.data,cat=categoriesFor(p).find(c=>labelKey(c.name)===labelKey(p.category)),service=p.type==='Serviço',matches=suggestions(p);
    return `<fieldset class="classification-panel"><legend>Classificação para publicar</legend><p class="muted">Escolha um filtro existente para agrupar serviços equivalentes. Crie um novo somente quando precisar.</p>${matches.length?`<div class="classification-suggestions"><strong>Sugestões para conferir</strong>${matches.map(m=>`<button type="button" class="secondary-button" data-suggest-category="${esc(m.category.id)}" data-suggest-specialty="${esc(m.specialty.id)}">Usar ${esc(m.category.name)} › ${esc(m.specialty.name)}</button>`).join('')}</div>`:''}<label>Categoria aprovada<select data-approved-category>${categoryOptions(p)}</select></label><label data-new-category-block hidden>Nome da nova categoria<input data-new-category maxlength="100" minlength="2" placeholder="Ex.: Jardinagem"></label>${service?`<div data-service-classification><p><strong>Especialidades aprovadas</strong></p><div class="check-grid" data-approved-specialties>${specialtyOptions(cat?.id,p.requested_service?[]:p.specialties||[])}</div><label>Criar especialidades <span class="optional">(opcional; uma por linha)</span><textarea data-new-specialties rows="2" maxlength="1200" placeholder="Ex.: Manutenção de motores para portão"></textarea></label><p class="muted">O filtro usará exatamente os nomes aprovados aqui. O texto original do cadastro permanece no histórico.</p></div>`:''}</fieldset>`;
  }
  async function load(){
    panel();if(!backend.session())return;
    try{
      message('Carregando cadastros e classificações…');
      let catalog;try{catalog=await backend.catalog();}catch{throw new Error('Atualize o banco com o arquivo 04-classificacao-servicos.sql antes de usar a nova aprovação.');}
      Guide.useCatalog(catalog);pendingRows=await backend.pending();
      $('pendingCount').textContent=`${pendingRows.length} cadastro(s) aguardando análise`;
      $('pendingList').innerHTML=pendingRows.length?pendingRows.map(r=>{const p=r.data;return `<article class="form-panel" data-submission="${esc(r.id)}"><div class="tag">${esc(p.type)} · ${esc(p.category)}</div><h2>${esc(p.name)}</h2><p>${esc(p.description)}</p>${p.requested_service?`<div class="notice"><strong>Serviço descrito pelo responsável:</strong> ${esc(p.requested_service)}</div>`:''}<p><strong>Especialidades informadas:</strong> ${esc(p.specialties?.join(', ')||'A classificar')}</p><p><strong>Atende:</strong> ${esc(p.areas?.join(', ')||'—')}</p><p><strong>Endereço público:</strong> ${esc(p.has_location?`${p.address}, ${p.neighborhood}`:'Atendimento sem endereço público')}</p><p><strong>Telefone:</strong> ${esc(p.phone)}${p.whatsapp?' · WhatsApp':''}</p><p><strong>Horários:</strong> ${esc(p.hours||'Não informado')}</p><p><strong>Instagram:</strong> ${esc(p.instagram||'Não informado')}</p><p><strong>E-mail do responsável (privado):</strong> ${esc(r.owner_email)}</p><p class="muted">Recebido em ${new Date(r.created_at).toLocaleString('pt-BR')}</p>${classificationPanel(r)}<p class="form-message" data-review-message role="status"></p><div class="form-actions"><button class="primary" data-decision="approved" data-id="${esc(r.id)}">Aprovar com esta classificação</button><button class="secondary-button" data-decision="rejected" data-id="${esc(r.id)}">Recusar cadastro</button></div></article>`;}).join(''):'<div class="empty">Nenhum cadastro pendente.</div>';
      message('');
    }catch(e){$('pendingList').innerHTML='';message(e.message,true);}
  }
  function updateCategory(article,selected=[]){
    const choice=article.querySelector('[data-approved-category]').value;
    const isNew=choice==='__new';article.querySelector('[data-new-category-block]').hidden=!isNew;
    const list=article.querySelector('[data-approved-specialties]');if(list)list.innerHTML=specialtyOptions(choice,selected);
  }
  function classification(article,p){
    const choice=article.querySelector('[data-approved-category]').value;
    let categoryId=choice==='__new'?'':choice,categoryName=choice==='__new'?article.querySelector('[data-new-category]').value.trim():'';
    if(!categoryId&&(categoryName.length<2||categoryName.length>100||!labelKey(categoryName)))throw new Error('Informe o nome da nova categoria.');
    const existing=categoriesFor(p).find(c=>labelKey(c.name)===labelKey(categoryName));if(existing)categoryId=existing.id;
    const specialtyIds=[...article.querySelectorAll('[data-specialty]:checked')].map(n=>n.value);
    const typed=p.type==='Serviço'?article.querySelector('[data-new-specialties]').value.split(/\r?\n/).map(n=>n.trim()).filter(Boolean):[];
    const newSpecialties=[...new Map(typed.map(n=>[labelKey(n),n])).values()];
    if(newSpecialties.some(n=>n.length<2||n.length>100||!labelKey(n)))throw new Error('Cada especialidade precisa ter de 2 a 100 caracteres.');
    if(p.type==='Serviço'&&!specialtyIds.length&&!newSpecialties.length)throw new Error('Selecione uma especialidade existente ou crie uma nova.');
    if(specialtyIds.length+newSpecialties.length>12)throw new Error('Escolha até 12 especialidades por cadastro.');
    return {category_id:categoryId,category_name:categoryName,specialty_ids:specialtyIds,new_specialties:newSpecialties};
  }
  $('adminNotice').textContent=backend.configured?'Somente a conta habilitada para administração pode revisar cadastros.':'O recebimento de cadastros ainda não foi ativado. A área de aprovação ficará disponível após a conexão do serviço de dados.';
  $('loginButton').disabled=!backend.configured;
  $('loginForm').addEventListener('submit',async e=>{e.preventDefault();$('loginButton').disabled=true;try{await backend.login($('adminEmail').value.trim(),$('adminPassword').value);$('adminPassword').value='';await load();}catch(e){message(e.message,true);}finally{$('loginButton').disabled=false;}});
  $('logoutButton').addEventListener('click',async()=>{await backend.logout();$('pendingList').innerHTML='';panel();message('Você saiu da área de aprovação.');});$('refreshButton').addEventListener('click',load);
  $('pendingList').addEventListener('change',e=>{if(e.target.matches('[data-approved-category]'))updateCategory(e.target.closest('article'));});
  $('pendingList').addEventListener('click',async e=>{
    const suggestion=e.target.closest('[data-suggest-category]');
    if(suggestion){const article=suggestion.closest('article');article.querySelector('[data-approved-category]').value=suggestion.dataset.suggestCategory;updateCategory(article);const checkbox=[...article.querySelectorAll('[data-specialty]')].find(n=>n.value===suggestion.dataset.suggestSpecialty);if(checkbox)checkbox.checked=true;const status=article.querySelector('[data-review-message]');status.classList.remove('error');status.textContent='Classificação selecionada. Confira os dados e aprove quando estiver correto.';return;}
    const b=e.target.closest('[data-decision]');if(!b)return;
    const article=b.closest('article'),buttons=article.querySelectorAll('button'),localMessage=article.querySelector('[data-review-message]');
    try{const p=pendingRows.find(r=>r.id===b.dataset.id).data;const approved=b.dataset.decision==='approved'?classification(article,p):null;buttons.forEach(x=>x.disabled=true);await backend.review(b.dataset.id,b.dataset.decision,approved);await load();message(b.dataset.decision==='approved'?'Cadastro aprovado. Os filtros já usam a classificação escolhida.':'Cadastro recusado.');}catch(e){localMessage.textContent=e.message;localMessage.classList.add('error');buttons.forEach(x=>x.disabled=false);}
  });
  panel();if(backend.configured)load();
})();
