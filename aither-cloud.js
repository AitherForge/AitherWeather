/* Aither Cloud Sync — Firebase-backed through AitherBackendNew. */
(()=>{
  const APP_ID='weather';
  const API='https://aitherbackendnew.onrender.com';
  const BLOCKED=/(password|token|secret|api[_-]?key|client[_-]?secret|authorization|session)/i;
  const token=()=>localStorage.getItem('aither-session-token')||localStorage.getItem('aither_session_token')||'';
  const snapshot=()=>{const d={};for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k&&!BLOCKED.test(k))d[k]=localStorage.getItem(k)}return d};
  const restore=d=>{if(!d||typeof d!=='object')return;Object.entries(d).forEach(([k,v])=>{if(!BLOCKED.test(k)&&typeof v==='string')try{localStorage.setItem(k,v)}catch{}})};
  const request=async(p,o={})=>{const c=new AbortController(),t=setTimeout(()=>c.abort(),7000);try{const headers={Accept:'application/json','Content-Type':'application/json',...(o.headers||{})};if(token())headers.Authorization='Bearer '+token();const r=await fetch(API+p,{...o,credentials:'include',headers,cache:'no-store',signal:c.signal});let d={};try{d=await r.json()}catch{}if(!r.ok)throw Error(`HTTP ${r.status}`);return d}finally{clearTimeout(t)}};
  let last='';
  async function sync(){try{if(!token())return;const c=await request('/api/data/'+APP_ID),l=snapshot();if(c.updated_at&&c.updated_at!==last&&c.data&&Object.keys(c.data).length){restore(c.data);last=c.updated_at;return}await request('/api/data/'+APP_ID,{method:'PUT',body:JSON.stringify({data:l})});last=String(c.updated_at||Date.now())}catch(e){console.warn('[Aither Cloud] sync skipped',e?.message||e)}}
  window.AitherCloud={sync,snapshot};setTimeout(sync,250);setInterval(sync,15000);addEventListener('aither:user-changed',sync);addEventListener('storage',sync);
})();
