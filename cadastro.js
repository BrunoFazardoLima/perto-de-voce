(() => {
  const {taxonomy,neighborhoods,escape:esc,backend}=Guide;
  const $=id=>document.getElementById(id),form=$('registrationForm');
  let classificationReady=false,loading=false,sending=false;
  form.addEventListener('input',()=>window.GuideAnalytics?.track('registration_start'),{once:true});
  const notice=$('connectionNotice');
  notice.textContent=backend.configured?'Seu cadastro será enviado para análise. A publicação acontece após aprovação.':'O recebimento de cadastros ainda está em preparação. Você pode preencher e conferir o formulário, mas o envio ainda não está disponível.';
  $('submitButton').disabled=true;
  $('areaOptions').innerHTML=neighborhoods.map(n=>`<label class="check-line"><input type="checkbox" name="areas" value="${n}"> ${n}</label>`).join('');
  $('addressNeighborhood').innerHTML='<option value="">Selecione o bairro</option>'+neighborhoods.map(n=>`<option>${n}</option>`).join('');
  function specialties(selected=[]){if(!Array.isArray(selected))selected=[];const other=$('businessType').value==='Serviço'&&$('businessCategory').value==='Outros serviços';const list=taxonomy[$('businessType').value][$('businessCategory').value]||[];$('specialtiesBlock').hidden=$('businessType').value!=='Serviço'||other;$('requestedServiceBlock').hidden=!other;$('requestedService').required=other;$('specialtyOptions').innerHTML=list.map(s=>`<label class="check-line"><input type="checkbox" name="specialties" value="${esc(s)}" ${selected.includes(s)?'checked':''}> ${esc(s)}</label>`).join('');}
  function address(){const has=$('hasLocation').checked;$('addressBlock').hidden=!has;$('addressInput').required=has;$('addressNeighborhood').required=has;$('mobileServiceNote').hidden=has;}
  function type(){const service=$('businessType').value==='Serviço';$('businessCategory').innerHTML=Object.keys(taxonomy[$('businessType').value]).map(c=>`<option>${esc(c)}</option>`).join('');$('specialtiesBlock').hidden=!service;$('areasBlock').hidden=!service;$('physicalLabel').hidden=!service;$('hasLocation').checked=!service;specialties();address();}
  function payload(){
    const fd=new FormData(form),service=fd.get('type')==='Serviço',has=fd.get('hasLocation')==='on',phone=String(fd.get('phone')).replace(/\D/g,'');
    if(!form.reportValidity())return null;
    if(!/^\d{10,11}$/.test(phone))throw new Error('Informe um telefone com DDD e 10 ou 11 dígitos.');
    const other=service&&fd.get('category')==='Outros serviços',requested=other?String(fd.get('requested_service')||'').trim():'';
    const specialties=service&&!other?fd.getAll('specialties'):[],areas=service?fd.getAll('areas'):[];
    if(other&&requested.length<3)throw new Error('Descreva o serviço que você oferece.');
    if(service&&!other&&!specialties.length)throw new Error('Selecione pelo menos uma especialidade.');
    if(service&&!areas.length)throw new Error('Selecione pelo menos um bairro atendido.');
    const instagram=String(fd.get('instagram')).trim();
    if(instagram&&!/^https:\/\/(www\.)?instagram\.com\//i.test(instagram))throw new Error('Informe o link completo do Instagram, começando com https://www.instagram.com/.');
    if(fd.get('company_website'))throw new Error('Não foi possível validar o cadastro.');
    return {type:fd.get('type'),category:fd.get('category'),requested_service:requested,name:String(fd.get('name')).trim(),description:String(fd.get('description')).trim(),specialties,areas,has_location:has,address:has?String(fd.get('address')).trim():'',neighborhood:has?fd.get('neighborhood'):'',phone,whatsapp:fd.get('whatsapp')==='on',hours:String(fd.get('hours')).trim(),instagram,owner_email:String(fd.get('owner_email')).trim().toLowerCase(),consent:fd.get('consent')==='on'};
  }
  function message(text,error=false){$('formMessage').textContent=text;$('formMessage').classList.toggle('error',error);}
  function connectionState(text,{retry=false,error=false}={}){notice.textContent=text;$('submitReason').textContent=text;$('submitReason').classList.toggle('error',error);$('retryConnection').hidden=!retry;$('retryConnection').disabled=loading;$('submitButton').disabled=!classificationReady||sending;}
  async function loadCatalog(){
    if(loading)return;
    if(!backend.configured){connectionState('O envio ainda não está ativado neste endereço. Preencher os campos não envia o cadastro.',{error:true});return;}
    loading=true;classificationReady=false;connectionState('O envio está aguardando o carregamento das categorias. Seus dados preenchidos serão mantidos.');
    let timer;
    try{
      if(typeof backend.catalog!=='function'||typeof Guide.useCatalog!=='function'){const error=new Error('Arquivos desatualizados');error.code='outdated_assets';throw error;}
      const rows=await Promise.race([Promise.resolve().then(()=>backend.catalog()),new Promise((_,reject)=>{timer=setTimeout(()=>{const e=new Error('Tempo de carregamento excedido');e.code='timeout';reject(e);},15000);})]);
      if(!Array.isArray(rows)||!rows.some(c=>c.type==='Serviço')||!rows.some(c=>c.type==='Comércio')){const error=new Error('Categorias não disponíveis');error.code='catalog_unavailable';throw error;}
      const selectedCategory=$('businessCategory').value,selectedSpecialties=new FormData(form).getAll('specialties');
      Guide.useCatalog(rows);
      const categories=Object.keys(taxonomy[$('businessType').value]);
      $('businessCategory').innerHTML=categories.map(c=>`<option>${esc(c)}</option>`).join('');
      if(categories.includes(selectedCategory))$('businessCategory').value=selectedCategory;
      specialties(selectedSpecialties);
      classificationReady=true;connectionState('Envio disponível. Confira os dados antes de enviar para análise.');
    }catch(error){
      let explanation;
      if(error.code==='outdated_assets')explanation='O envio está bloqueado porque alguns arquivos desta página estão desatualizados. Atualize a página com Ctrl+F5 para carregar a versão mais recente.';
      else if(['PGRST205','42P01','catalog_unavailable'].includes(error.code))explanation='O envio está bloqueado porque a lista de categorias ainda não está disponível. A administração precisa conferir a atualização das categorias.';
      else if(error.code==='timeout')explanation='O envio está bloqueado porque o carregamento das categorias demorou mais que o esperado. Clique em Tentar novamente; seu preenchimento será mantido.';
      else explanation='O envio está bloqueado porque não foi possível carregar as categorias. Confira sua conexão e clique em Tentar novamente; seu preenchimento será mantido.';
      connectionState(explanation,{retry:true,error:true});
    }finally{clearTimeout(timer);loading=false;$('retryConnection').disabled=false;}
  }
  $('businessType').addEventListener('change',type);$('businessCategory').addEventListener('change',specialties);$('hasLocation').addEventListener('change',address);
  $('previewButton').addEventListener('click',()=>{try{const p=payload();if(!p)return;message('');$('previewContent').innerHTML=`<h3>${esc(p.name)}</h3><p>${esc(p.type)} · ${esc(p.category)}</p><p>${esc(p.description)}</p>${p.requested_service?`<p><strong>Serviço informado:</strong> ${esc(p.requested_service)}</p>`:''}${p.specialties.length?`<p><strong>Especialidades:</strong> ${esc(p.specialties.join(', '))}</p>`:''}${p.areas.length?`<p><strong>Atende:</strong> ${esc(p.areas.join(', '))}</p>`:''}${p.has_location?`<p><strong>Endereço:</strong> ${esc(p.address)}, ${esc(p.neighborhood)}</p>`:''}<p><strong>Contato:</strong> ${esc(p.phone)}${p.whatsapp?' · WhatsApp':''}</p>${p.hours?`<p><strong>Horários:</strong> ${esc(p.hours)}</p>`:''}`;$('registrationPreview').hidden=false;$('registrationPreview').scrollIntoView({behavior:'smooth'});}catch(e){message(e.message,true);}});
  form.addEventListener('submit',async e=>{e.preventDefault();if(sending)return;if(!backend.configured||!classificationReady){message($('submitReason').textContent,true);return;}try{const p=payload();if(!p)return;sending=true;$('submitButton').disabled=true;message('Enviando cadastro…');await backend.submit(p);window.GuideAnalytics?.track('registration_submit');message('Cadastro recebido! Ele ficará em análise e será publicado após aprovação.');form.reset();type();$('registrationPreview').hidden=true;}catch(e){message(e.message,true);}finally{sending=false;$('submitButton').disabled=!classificationReady;}});
  $('retryConnection').addEventListener('click',loadCatalog);
  type();
  loadCatalog();
})();
