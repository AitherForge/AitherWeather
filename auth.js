/* Aither Weather — shared Firebase Aither Account authentication. */
const WTWAuth = (() => {
  const API_URL_KEY='aither-backend-url', TOKEN_KEY='aither-session-token', NEW_API='https://aitherbackendnew.onrender.com';
  const BACKEND=NEW_API;
  const state={profile:null,onChange:null,auth:null,modules:null};
  const $=id=>document.getElementById(id);
  async function firebase(){
    if(state.modules)return state.modules;
    const [app,auth]=await Promise.all([
      import('https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js')
    ]);
    const config=(await import('./firebase-config.js')).default;
    const firebaseApp=app.initializeApp(config);
    state.auth=auth.getAuth(firebaseApp);
    state.modules={...app,...auth,config};
    return state.modules;
  }
  async function api(path,options={}){
    const headers={Accept:'application/json','Content-Type':'application/json',...(options.headers||{})};
    const token=String(localStorage.getItem(TOKEN_KEY)||'').trim();
    if(token)headers.Authorization=`Bearer ${token}`;
    const res=await fetch(BACKEND+path,{...options,credentials:'include',headers,cache:'no-store'});
    let data={};try{data=await res.json()}catch(_){}
    if(!res.ok)throw new Error(Array.isArray(data.detail)?data.detail.map(x=>x.msg).join(', '):(data.detail||`Request failed (${res.status})`));
    return data;
  }
  function saveProfile(user){state.profile=user||null;try{if(user)localStorage.setItem('wtw-backend-profile',JSON.stringify(user));else localStorage.removeItem('wtw-backend-profile')}catch(_){}if(typeof state.onChange==='function')state.onChange(state.profile);window.dispatchEvent(new CustomEvent('aither:user-changed',{detail:{user:state.profile}}));}
  async function exchangeFirebaseUser(user){
    if(!user)return null;
    const idToken=await user.getIdToken();
    const data=await api('/api/auth/firebase',{method:'POST',body:JSON.stringify({id_token:idToken}),headers:{'Content-Type':'application/json'}});
    if(data.session_token)localStorage.setItem(TOKEN_KEY,data.session_token);
    saveProfile(data.user);return data;
  }
  async function refreshSession(silent=true){try{const data=await api('/api/auth/session');if(data.authenticated&&data.user)saveProfile(data.user);else{localStorage.removeItem(TOKEN_KEY);saveProfile(null)}return data}catch(err){if(!silent)console.error(err);return{authenticated:false,user:null,error:err.message}}}
  function renderForm(){const form=$('localSignInForm');if(!form)return;if(state.profile){form.innerHTML=`<div class="wtw-account-profile"><strong>${state.profile.name||'Aither Account'}</strong><span>${state.profile.email||''}</span><button type="button" class="wtw-account-signout" id="wtwAccountSignout">Sign out</button></div>`;$('wtwAccountSignout')?.addEventListener('click',signOut);return}form.innerHTML=`<label>AITHER ACCOUNT</label><input id="aitherAccountName" type="text" maxlength="80" autocomplete="name" placeholder="Name"><input id="aitherAccountEmail" type="email" maxlength="320" autocomplete="email" placeholder="Email" required><input id="aitherAccountPassword" type="password" minlength="8" maxlength="200" autocomplete="current-password" placeholder="Password (8+ characters)" required><button type="submit" id="localSignInBtn">Sign in / Create account</button>`;form.onsubmit=submit}
  async function submit(e){e.preventDefault();const email=$('aitherAccountEmail')?.value.trim()||'',password=$('aitherAccountPassword')?.value||'',name=$('aitherAccountName')?.value.trim()||'';if(!email||password.length<8)return;try{const m=await firebase();let cred;try{cred=await m.signInWithEmailAndPassword(state.auth,email,password)}catch(loginErr){if(!name)throw loginErr;cred=await m.createUserWithEmailAndPassword(state.auth,email,password);if(cred.user&&!cred.user.displayName)await m.updateProfile(cred.user,{displayName:name})}await exchangeFirebaseUser(cred.user);renderForm()}catch(err){console.error(err);const status=$('localSignInForm')?.querySelector('.wtw-account-error');if(status)status.textContent=String(err.message||'Authentication failed')}}
  async function signOut(){try{if(state.auth&&state.modules)await state.modules.signOut(state.auth)}catch(_){}try{await api('/api/auth/logout',{method:'POST'})}catch(_){}localStorage.removeItem(TOKEN_KEY);saveProfile(null);renderForm()}
  async function renderGoogleButton(){const host=$('googleButtonHost');if(!host)return'unavailable';try{const m=await firebase();host.hidden=false;host.innerHTML='<button type="button" class="aither-firebase-google">Continue with Google</button>';host.querySelector('button').onclick=async()=>{try{const cred=await m.signInWithPopup(state.auth,new m.GoogleAuthProvider());await exchangeFirebaseUser(cred.user);renderForm()}catch(err){console.error(err)}};return'ready'}catch(err){return'error'}}
  async function signInWithGoogle(){return renderGoogleButton()}
  const providers=()=>['google','password'];
  const isConfigured=()=>true;
  const isSupportedHere=()=>location.protocol==='https:'||location.hostname==='localhost'||location.hostname==='127.0.0.1';
  const setClientId=()=>'',storedClientId=()=>'',configuredClientId=()=>'';
  async function init({onChange}={}){state.onChange=onChange;try{const m=await firebase();m.onAuthStateChanged(state.auth,async user=>{if(user){try{await exchangeFirebaseUser(user)}catch(err){console.error(err)}}else{await refreshSession(true)}})}catch(err){console.error(err)}renderForm();renderGoogleButton();if(typeof onChange==='function')onChange(state.profile)}
  return{init,signOut,getProfile:()=>state.profile,isSignedIn:()=>!!state.profile,isConfigured,isSupportedHere,providers,renderGoogleButton,signInWithGoogle,signInLocally:submit,signInWithMicrosoft:async()=>({ok:false}),signInWithApple:async()=>({ok:false}),avatars:()=>[],exportAccount:()=>'',importAccount:()=>({ok:false}),setClientId,storedClientId,configuredClientId,refreshSession};
})();
window.WTWAuth=WTWAuth;
const _c=document.createElement('script');_c.src='aither-cloud.js?v=4';document.head.appendChild(_c);
