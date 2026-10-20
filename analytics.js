(() => {
  'use strict';
  const config = window.GUIDE_ANALYTICS_CONFIG || {};
  const id = String(config.measurementId || '').trim();
  const allowed = /^G-[A-Z0-9]{6,20}$/.test(id) &&
    Array.isArray(config.allowedOrigins) && config.allowedOrigins.includes(location.origin) &&
    location.protocol === 'https:' && !/(^|\/)admin(?:\.html)?\/?$/.test(location.pathname);
  const key = 'guide-statistics-choice-v1';
  let choice = null, started = false;
  try { choice = localStorage.getItem(key); } catch {}
  const page = location.origin + location.pathname;
  let referrer = '';
  try { referrer = new URL(document.referrer).origin + '/'; } catch {}
  function gtag() { window.dataLayer.push(arguments); }
  let banner;

  function start() {
    if (!allowed || choice !== 'accepted' || started) return;
    started = true;
    window['ga-disable-' + id] = false;
    window.dataLayer = window.dataLayer || [];
    gtag('consent', 'default', {analytics_storage:'granted',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});
    gtag('js', new Date());
    gtag('config', id, {send_page_view:false,allow_google_signals:false,
      allow_ad_personalization_signals:false,page_location:page,
      page_referrer:referrer,page_title:document.title});
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + id;
    document.head.append(script);
    send('page_view');
  }

  // Allowlist: jamais enviar valores de formulários, consultas livres ou URLs de contato.
  const fields = {
    listing_view:['listing_id','listing_category','listing_type'],
    contact_click:['listing_id','listing_category','listing_type','contact_method'],
    guide_filter:['filter_type','filter_value'],
    guide_search:['result_count','query_length'],
    registration_start:[], registration_submit:[]
  };
  function send(name, params = {}) {
    if (!allowed || choice !== 'accepted' || !started) return;
    if (name !== 'page_view' && !Object.hasOwn(fields, name)) return;
    const clean = {page_location:page,page_referrer:referrer,page_title:document.title};
    for (const field of fields[name] || []) {
      const value = params[field];
      if (typeof value === 'number' && Number.isFinite(value)) clean[field] = Math.max(0, Math.round(value));
      else if (typeof value === 'string') clean[field] = value.slice(0, 100);
    }
    gtag('event', name, clean);
  }

  function clearCookies() {
    const hostname = location.hostname;
    const domains = ['', hostname, '.' + hostname];
    const parts = hostname.split('.');
    for (let i = 1; i < parts.length - 1; i++) domains.push('.' + parts.slice(i).join('.'));
    for (const cookie of document.cookie.split(';')) {
      const name = cookie.split('=')[0].trim();
      if (!/^_ga(?:_|$)/.test(name)) continue;
      for (const domain of domains) document.cookie = name + '=; Max-Age=0; path=/;' + (domain ? ' domain=' + domain + ';' : '') + ' SameSite=Lax; Secure';
    }
  }
  function choose(next) {
    choice = next;
    try { localStorage.setItem(key, next); } catch {}
    banner.hidden = true;
    if (next === 'accepted') start();
    else if (allowed) {
      window['ga-disable-' + id] = true;
      clearCookies();
      // Uma tag já carregada é retirada com a recarga, sem novos eventos.
      if (started) location.reload();
    }
  }
  function preferences() {
    if (!allowed) return;
    banner.hidden = false;
    banner.querySelector('button').focus();
  }
  window.GuideAnalytics = {track:send,preferences};
  if (!allowed) return;
  window.addEventListener('storage', event => {
    if (event.key !== key) return;
    choice = event.newValue;
    if (choice === 'accepted') start();
    else if (started) { window['ga-disable-' + id] = true; clearCookies(); location.reload(); }
  });
  banner = document.createElement('section');
  banner.className = 'statistics-notice';
  banner.setAttribute('aria-label', 'Preferências de estatísticas');
  banner.innerHTML = '<div><strong>Ajude a melhorar o guia</strong><p>Podemos usar o Google Analytics para medir visitas e cliques? Você pode continuar usando o site sem aceitar. <a href="privacidade.html">Entenda as estatísticas</a>.</p></div><div class="statistics-actions"><button type="button" class="secondary-button" data-statistics="declined">Continuar sem estatísticas</button><button type="button" class="primary" data-statistics="accepted">Aceitar estatísticas</button></div>';
  banner.hidden = choice === 'accepted' || choice === 'declined';
  banner.addEventListener('click', e => {
    const button = e.target.closest('[data-statistics]');
    if (button) choose(button.dataset.statistics);
  });
  document.body.append(banner);
  document.querySelectorAll('[data-statistics-preferences]').forEach(button => {
    button.hidden = false;
    button.addEventListener('click', preferences);
  });
  start();
})();
