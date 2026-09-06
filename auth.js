/* Aither Weather — shared Aither Account authentication. */
const WTWAuth = (() => {
  const API_URL_KEY = 'aither-backend-url';
  const TOKEN_KEY = 'aither-session-token';
  const LEGACY_API = 'https://aither-backend.onrender.com';
  const BACKEND = (() => {
    const saved = String(localStorage.getItem(API_URL_KEY) || '').trim().replace(/\/+$/, '');
    if (saved === LEGACY_API) { localStorage.removeItem(API_URL_KEY); return 'https://aitherbackend.onrender.com'; }
    return saved || 'https://aitherbackend.onrender.com';
  })();
  const state = { profile: null, onChange: null };
  const $ = id => document.getElementById(id);
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const toast = (msg, error=false) => {
    let el = $('coreToast');
    if (!el) { el=document.createElement('div'); el.id='coreToast'; el.className='toast'; document.body.appendChild(el); }
    el.textContent=msg; el.dataset.error=error?'true':'false'; el.classList.add('show');
    clearTimeout(el._timer); el._timer=setTimeout(()=>el.classList.remove('show'),3200);
  };
  const css = document.createElement('style');
  css.textContent = `
    #localSignInForm{display:grid;gap:11px;margin-top:14px;padding:20px;border:1px solid #5f6368;border-radius:18px;background:#202124;color:#fff;box-shadow:0 20px 55px #0008}
    #localSignInForm input{width:100%;min-height:48px;box-sizing:border-box;padding:11px 13px;border:1px solid #5f6368;border-radius:12px;background:#303134;color:#fff;outline:none;font:inherit}
    #localSignInForm input:focus{border-color:#8ab4f8;box-shadow:0 0 0 3px #8ab4f833}
    #localSignInBtn{width:100%;min-height:48px;border:0;border-radius:12px;background:#8ab4f8;color:#202124;font-weight:800;cursor:pointer}
    #localSignInBtn:disabled{opacity:.6;cursor:wait}
    .signin-local-note{margin:2px 0 0;color:#bdc1c6;font-size:11px;line-height:1.5}
    .wtw-account-profile{display:grid;gap:12px;padding:18px;border:1px solid #3c4043;border-radius:16px;background:#303134}
    .wtw-account-profile-head{display:flex;align-items:center;gap:14px}.wtw-account-avatar{width:48px;height:48px;display:grid;place-items:center;border-radius:14px;background:#8ab4f8;color:#202124;font-size:18px;font-weight:900}
    .wtw-account-copy strong,.wtw-account-copy span{display:block}.wtw-account-copy span{margin-top:3px;color:#bdc1c6;font-size:12px;overflow-wrap:anywhere}
    .wtw-account-status{color:#a4f3c8;font-size:12px}.wtw-account-signout{width:100%;min-height:44px;border:1px solid #5f6368;border-radius:10px;background:#303134;color:#fff;font-weight:700}
  `;
  document.head.appendChild(css);

  async function api(path, options={}) {
    const controller = new AbortController();
    const timer = setTimeout(()=>controller.abort(),15000);
    const headers = {Accept:'application/json','Content-Type':'application/json',...(options.headers||{})};
    const token = String(localStorage.getItem(TOKEN_KEY)||'').trim();
    if (token) headers.Authorization = `Bearer ${token}`;
    try {
      const res = await fetch(BACKEND + path, {...options, credentials:'omit', headers, cache:'no-store', signal:controller.signal});
      let data={}; try { data=await res.json(); } catch(_) {}
      if (!res.ok) {
        const detail = Array.isArray(data.detail) ? data.detail.map(x=>x.msg).join(', ') : (data.detail || `Request failed (${res.status})`);
        throw new Error(String(detail));
      }
      return data;
    } catch(err) {
      if (err.name === 'AbortError') throw new Error('Aither Backend took too long to respond. Please try again.');
      if (err instanceof TypeError) throw new Error(`Could not connect to Aither Backend.\n${BACKEND}\n\nCheck that Aither Backend is online and try again.`);
      throw err;
    } finally { clearTimeout(timer); }
  }

  function saveProfile(user) {
    state.profile=user||null;
    try { if(user) localStorage.setItem('wtw-backend-profile',JSON.stringify(user)); else localStorage.removeItem('wtw-backend-profile'); } catch(_) {}
    if(typeof state.onChange==='function') state.onChange(state.profile);
    window.dispatchEvent(new CustomEvent('aither:user-changed',{detail:{user:state.profile}}));
  }
  function getProfile(){return state.profile;}
  const isSignedIn=()=>!!state.profile;

  async function refreshSession(silent=true) {
    try {
      const data=await api('/api/auth/session');
      if(data.authenticated&&data.user) saveProfile(data.user); else { localStorage.removeItem(TOKEN_KEY); saveProfile(null); }
      return data;
    } catch(err) {
      if(!silent) toast(err.message||'Could not load Aither Account.',true);
      return {authenticated:false,user:null,error:err.message};
    }
  }

  function setupBackendForm(){
    const form=$('localSignInForm');
    if(!form||form.dataset.backendReady==='true') return;
    form.dataset.backendReady='true';
    renderForm();
  }

  function renderForm(){
    const form=$('localSignInForm'); if(!form) return;
    if(state.profile){
      form.innerHTML=`<div class="wtw-account-profile"><div class="wtw-account-profile-head"><div class="wtw-account-avatar">${esc((state.profile.name||state.profile.email||'A').trim().charAt(0).toUpperCase())}</div><div class="wtw-account-copy"><strong>${esc(state.profile.name||'Aither Account')}</strong><span>${esc(state.profile.email||'')}</span></div></div><div class="wtw-account-status">✓ Connected to Aither Backend</div><button type="button" class="wtw-account-signout" id="wtwAccountSignout">Sign out</button></div>`;
      $('wtwAccountSignout')?.addEventListener('click',signOut); return;
    }
    form.innerHTML=`<label style="font-size:10px;letter-spacing:.15em;color:#8ab4f8;font-weight:900">AITHER ACCOUNT</label><input id="aitherAccountName" type="text" maxlength="80" autocomplete="name" placeholder="Name (only needed when creating an account)"><input id="aitherAccountEmail" type="email" maxlength="320" autocomplete="email" placeholder="Email" required><input id="aitherAccountPassword" type="password" minlength="8" maxlength="200" autocomplete="current-password" placeholder="Password (8+ characters)" required><button type="submit" id="localSignInBtn">Sign in / Create account</button><p class="signin-local-note">One Aither Account across the Aither ecosystem.</p>`;
    form.onsubmit=submit;
  }

  async function submit(e){
    e.preventDefault();
    const name=$('aitherAccountName')?.value.trim()||'', email=$('aitherAccountEmail')?.value.trim()||'', password=$('aitherAccountPassword')?.value||'';
    if(!email||password.length<8){toast('Enter an email and a password with at least 8 characters.',true);return;}
    const button=$('localSignInBtn'); if(button)button.disabled=true;
    try{
      let data;
      try { data=await api('/api/auth/login',{method:'POST',body:JSON.stringify({email,password})}); }
      catch(loginErr){
        if(!name) throw loginErr;
        data=await api('/api/auth/register',{method:'POST',body:JSON.stringify({name,email,password})});
      }
      if(!data?.user) throw new Error('Aither Backend did not return an account session.');
      if(data.session_token) localStorage.setItem(TOKEN_KEY,data.session_token);
      saveProfile(data.user); renderForm(); toast(`Signed in as ${data.user.name||data.user.email}`);
    }catch(err){ toast(err.message||'Account sign-in failed.',true); }
    finally{ if(button)button.disabled=false; }
  }

  async function signInLocally(rawName){
    setupBackendForm();
    const email=$('aitherAccountEmail')?.value.trim()||'',password=$('aitherAccountPassword')?.value||'',name=$('aitherAccountName')?.value.trim()||String(rawName||'').trim();
    if(!email||!password) return {ok:false,reason:'backend-form'};
    try{
      let data;
      try{data=await api('/api/auth/login',{method:'POST',body:JSON.stringify({email,password})});}
      catch(loginErr){if(!name)throw loginErr;data=await api('/api/auth/register',{method:'POST',body:JSON.stringify({name,email,password})});}
      if(data.session_token)localStorage.setItem(TOKEN_KEY,data.session_token); saveProfile(data.user); renderForm(); return {ok:true};
    }catch(err){toast(err.message||'Account sign-in failed.',true);return {ok:false,reason:'error'};}
  }
  async function signOut(){try{await api('/api/auth/logout',{method:'POST'});}catch(_){}localStorage.removeItem(TOKEN_KEY);saveProfile(null);renderForm();toast('Signed out');}
  function isSupportedHere(){return location.protocol==='https:'||location.hostname==='localhost'||location.hostname==='127.0.0.1'}
  const providers=()=>[]; const isConfigured=()=>true; async function renderGoogleButton(){return'unavailable'} async function signInWithMicrosoft(){return{ok:false,reason:'backend-only'}} async function signInWithApple(){return{ok:false,reason:'backend-only'}} function setClientId(){return null} function storedClientId(){return''} function configuredClientId(){return null} function avatars(){return[]}
  function exportAccount(){const payload={v:2,profile:state.profile,settings:window.WTWStorage?.getSettings?.()||{},favorites:window.WTWStorage?.getFavorites?.()||[],madeAt:Date.now()};return btoa(unescape(encodeURIComponent(JSON.stringify(payload))))}
  function importAccount(code){try{const p=JSON.parse(decodeURIComponent(escape(atob(String(code||'').trim()))));if(!p||!p.settings)return{ok:false,reason:'unreadable'};window.WTWStorage?.saveSettings?.(p.settings);if(Array.isArray(p.favorites))window.WTWStorage?.saveFavorites?.(p.favorites);return{ok:true,name:p.profile?.name||'',favorites:Array.isArray(p.favorites)?p.favorites.length:0}}catch(_){return{ok:false,reason:'unreadable'}}}
  async function init({onChange}={}){state.onChange=onChange;setupBackendForm();await refreshSession(true);renderForm();if(typeof onChange==='function')onChange(state.profile);}
  return {init,signOut,getProfile,isSignedIn,isConfigured,isSupportedHere,providers,renderGoogleButton,signInWithMicrosoft,signInWithApple,signInLocally,avatars,exportAccount,importAccount,setClientId,storedClientId,configuredClientId,refreshSession};
})();
window.WTWAuth=WTWAuth;
const _c=document.createElement('script');_c.src='aither-cloud.js?v=2';document.head.appendChild(_c);