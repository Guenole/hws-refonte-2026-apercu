/*
 * HWS Agency 2026 — navigation entre les pages refaites (prototypes seulement, à ne pas reporter dans Webflow).
 * Le HTML des pages garde les vraies adresses du site (https://www.hws.pm/… ou /…), pour être reporté tel quel
 * dans Webflow. Hors de hws.pm (serveur local, Netlify, fichier ouvert), ce script réécrit les liens au chargement :
 *  - un lien vers une page déjà refaite mène à sa version 2026 (l'ancre est conservée : /#contact, #methode…) ;
 *  - les autres liens vers le site (en « /… » ou https://www.hws.pm/…) sont désactivés : l'aperçu ne renvoie jamais vers le site actuel
 *    (23 oct. 2026, demande du user). Ancienne version : /tmp/qd/liens-refonte-avant-desactivation.js.
 * Les liens externes, les ancres de la page, mailto: et les chemins relatifs (../print-2026/…) ne changent pas.
 *
 * Une page vient d'être refaite ? Ajouter une ligne dans PAGES : chemin sur le site → fichier, relatif à prototypes/.
 */
(() => {
  'use strict';
  if (/(^|\.)hws\.pm$/i.test(location.hostname)) return;

  const PAGES = {
    '/': 'home-ascii/index-2026-collaboration.html',
    '/services/sites-web-sur-mesure': 'service-sur-mesure-2026/index.html',
    '/services/sites-no-code-webflow': 'service-no-code-2026/index.html',
    '/services/applications-mobiles-saas': 'service-apps-saas-2026/index.html',
    '/blog/ecommerce-shopify-webflow-sur-mesure': 'article-2026/index.html',
    '/projets/banquiz': 'projet-2026/index.html',
    '/projets/listti': 'projet-2026/listti.html',
    '/projets-realises': 'projets-realises-2026/index.html',
    '/blog': 'journal-index-2026/index.html',
  };
  const SITE = 'https://www.hws.pm';
  const script = document.currentScript;
  const racine = new URL('./', script ? script.src : location.href); // dossier prototypes/

  const chemin = (p) => (p.length > 1 ? p.replace(/\/+$/, '') : '/');

  for (const a of document.querySelectorAll('a[href]')) {
    const brut = a.getAttribute('href').trim();
    let u = null;
    if (/^https?:\/\/(www\.)?hws\.pm(?=[/?#]|$)/i.test(brut)) u = new URL(brut);
    else if (brut.startsWith('/') && !brut.startsWith('//')) u = new URL(brut, SITE);
    if (!u) continue;

    const cible = PAGES[chemin(u.pathname)];
    if (cible) {
      const dest = new URL(cible, racine);
      dest.hash = u.hash;
      a.setAttribute('href', dest.href);
      a.dataset.refonte2026 = '';
    } else {
      // Page pas encore refaite : le lien est désactivé dans l'aperçu (plus aucun renvoi vers le site actuel).
      a.removeAttribute('href');
      a.removeAttribute('target');
      a.setAttribute('aria-disabled', 'true');
      a.setAttribute('title', 'Page pas encore refaite dans cet aperçu');
      a.dataset.refonteInactif = '';
      // Petits liens (menu, footer, liens texte) atténués ; les grands blocs (lignes de projets, cartes d'articles) gardent leur aspect.
      if (!a.querySelector('img, picture, video') && a.textContent.trim().length < 60) a.dataset.refonteInactif = 'attenue';
    }
  }
  const style = document.createElement('style');
  style.textContent = '[data-refonte-inactif]{cursor:default!important}[data-refonte-inactif] *{pointer-events:none}'
    + '[data-refonte-inactif="attenue"]{opacity:.45}';
  document.head.appendChild(style);
  // Clic ou touche Entrée sur un lien désactivé : rien ne se passe
  document.addEventListener('click', (e) => { if (e.target.closest('[data-refonte-inactif]')) e.preventDefault(); }, true);
})();
