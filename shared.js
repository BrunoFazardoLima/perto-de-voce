(() => {
  const config = window.GUIDE_CONFIG || {};
  const url = (config.supabaseUrl || '').replace(/\/$/, '');
  const key = config.supabasePublicKey || '';
  const configured = /^https:\/\//.test(url) && !!key && !key.startsWith('sb_secret_');
  const neighborhoods = ['Jardim Boer I', 'Jardim Boer II', 'Jardim Mirandola', 'Jardim Esperança'];
  const taxonomy = {
    'Comércio': {'Mercados':[], 'Moda':[], 'Alimentação':[], 'Bebidas':[], 'Pets':[], 'Casa e construção':[]},
    'Serviço': {'Casa e reparos':['Eletricista','Encanador','Manutenção de portões','Pedreiro','Pintor','Marido de aluguel','Ar-condicionado','Limpeza'], 'Beleza':['Barbearia','Cabeleireiro','Manicure','Estética'], 'Saúde e bem-estar':['Academia','Personal trainer','Fisioterapia'], 'Automotivo':['Mecânica','Autoelétrica','Borracharia'], 'Tecnologia':['Informática','Celulares','Redes e câmeras'], 'Outros serviços':['Outro serviço']}
  };
  const escape = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const https = value => {try { const u=new URL(value); return u.protocol==='https:'?u.href:null; } catch { return null; }};
  const mapUrl = p => p.hasLocation === false || !p.address ? null : (p.source?.startsWith('https://www.google.com/maps/place/') ? p.source : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${p.name}, ${p.address}, ${p.neighborhood}, Americana, SP`)}`);
  async function request(path, options={}) {
    if (!configured) throw new Error('O recebimento de cadastros ainda não foi ativado.');
    const headers={apikey:key,'Content-Type':'application/json'};
    if(options.token) headers.Authorization=`Bearer ${options.token}`;
    else if(key.startsWith('eyJ')) headers.Authorization=`Bearer ${key}`;
    let response;
    try { response=await fetch(url+path,{method:options.method||'GET',headers,body:options.body?JSON.stringify(options.body):undefined,signal:AbortSignal.timeout(15000)}); }
    catch {throw new Error('Não foi possível conectar. Confira sua internet e tente novamente.');}
    const data=await response.json().catch(()=>null);
    if(!response.ok) {
      if(response.status===401) throw new Error('E-mail ou senha inválidos, ou sessão expirada.');
      if(response.status===403) throw new Error('Sua conta não tem permissão para esta ação.');
      if(data?.message?.includes('recent_submission')) throw new Error('Já recebemos um cadastro recente com esses dados. Aguarde a análise.');
      throw new Error('Não foi possível concluir a ação. Confira os dados e tente novamente.');
    }
    return data;
  }
  const sessionKey='perto-admin-session';
  function session(){try{const s=JSON.parse(sessionStorage.getItem(sessionKey));if(s?.expires_at>Date.now()/1000)return s;sessionStorage.removeItem(sessionKey);}catch{}return null;}
  async function login(email,password){const s=await request('/auth/v1/token?grant_type=password',{method:'POST',body:{email,password}});const rows=await request(`/rest/v1/guide_admins?select=user_id&user_id=eq.${encodeURIComponent(s.user.id)}`,{token:s.access_token});if(!rows?.length)throw new Error('Esta conta ainda não foi habilitada para aprovar cadastros.');const saved={access_token:s.access_token,expires_at:Date.now()/1000+s.expires_in};sessionStorage.setItem(sessionKey,JSON.stringify(saved));}
  async function logout(){const s=session();sessionStorage.removeItem(sessionKey);if(s)await request('/auth/v1/logout',{method:'POST',token:s.access_token}).catch(()=>{});}
  const backend={configured,login,logout,session,publicPlaces:()=>request('/rest/v1/guide_listings?select=*&order=name.asc'),submit:payload=>request('/rest/v1/rpc/submit_listing',{method:'POST',body:{payload}}),pending:()=>request('/rest/v1/guide_submissions?select=*&status=eq.pending&order=created_at.asc',{token:session()?.access_token}),review:(id,decision)=>request('/rest/v1/rpc/review_submission',{method:'POST',token:session()?.access_token,body:{submission_id:id,decision}})};
  window.Guide={neighborhoods,taxonomy,escape,normalize,https,mapUrl,backend};
})();
