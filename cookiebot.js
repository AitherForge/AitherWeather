/* ============================================================
   WhatTheWether — Cookiebot integration
   Add your Cookiebot Domain Group ID in WTW_COOKIEBOT_CBID below.
   ============================================================ */
(() => {
  'use strict';

  // Cookiebot Domain Group ID. Get this from the Cookiebot Manager.
  // Example: '12345678-1234-1234-1234-123456789abc'
  const CBID = window.WTW_COOKIEBOT_CBID || '';

  if (!CBID || CBID === 'YOUR-COOKIEBOT-DOMAIN-GROUP-ID') {
    console.warn('[WhatTheWether] Cookiebot is not active yet: add your Cookiebot Domain Group ID.');
    return;
  }

  // Avoid loading Cookiebot twice if the page or service worker re-initializes.
  if (document.querySelector('script[data-cbid]')) return;

  const script = document.createElement('script');
  script.id = 'Cookiebot';
  script.src = 'https://consent.cookiebot.com/uc.js';
  script.dataset.cbid = CBID;
  script.dataset.blockingmode = 'auto';
  script.async = true;
  document.head.appendChild(script);
})();
