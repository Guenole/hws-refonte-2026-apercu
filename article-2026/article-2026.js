/*
 * HWS Agency 2026 — gabarit d'article du Journal.
 * 1. Titre : la ponctuation finale du H1 passe en corail ; sans ponctuation, un point corail est ajouté
 *    par le CSS (.ar26-h1--point). Le texte du champ CMS ne change pas.
 * 2. Sommaire : construit à partir des H2 du texte riche (comme hws_blog_toc_builder en ligne), numéroté
 *    01 → n comme les intertitres ; la partie lue est marquée (aria-current="location"). Au-dessus de 1024 px
 *    c'est une liste ouverte dans la marge, sous un simple titre ; en dessous, un <details> replié en tête
 *    d'article. Sans script, il reste masqué (les intertitres restent tous dans le texte).
 * À charger après systeme-2026.js (qui pose les espaces insécables dans les titres).
 */
(() => {
  'use strict';

  /* ── 1. Ponctuation finale du titre ── */
  const h1 = document.querySelector('.ar26-h1');
  if (h1) {
    const marcheur = document.createTreeWalker(h1, NodeFilter.SHOW_TEXT);
    let dernier = null;
    while (marcheur.nextNode()) if (marcheur.currentNode.nodeValue.trim()) dernier = marcheur.currentNode;
    const m = dernier && dernier.nodeValue.match(/[?!.…]+\s*$/);
    if (m) {
      const fin = dernier.splitText(m.index);
      const point = document.createElement('span');
      point.className = 's26-point';
      fin.replaceWith(point);
      point.append(fin);
    } else {
      h1.classList.add('ar26-h1--point');
    }
  }

  /* ── 2. Sommaire ── */
  const nav = document.querySelector('.ar26-sommaire');
  const texte = document.querySelector('.ar26-texte');
  if (!nav || !texte) return;
  const titres = [...texte.querySelectorAll('h2')];
  const liste = nav.querySelector('.ar26-som-liste');
  const details = nav.querySelector('details');
  if (!titres.length || !liste || !details) return;

  const ancre = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 72);
  const liens = titres.map((h, i) => {
    if (!h.id) {
      let id = ancre(h.textContent) || `partie-${i + 1}`;
      if (document.getElementById(id)) id += `-${i + 1}`;
      h.id = id;
    }
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = `#${h.id}`;
    const num = document.createElement('span');
    num.className = 'ar26-som-num';
    num.setAttribute('aria-hidden', 'true');
    num.textContent = String(i + 1).padStart(2, '0');
    const nom = document.createElement('span');
    nom.className = 'ar26-som-nom';
    for (const n of h.childNodes) nom.append(n.cloneNode(true)); // garde les espaces insécables et mots liés
    a.append(num, nom);
    li.append(a);
    liste.append(li);
    return a;
  });
  nav.hidden = false;

  /* Ouvert dans la marge sur grand écran (le <summary> y est masqué), repliable en dessous */
  const large = window.matchMedia('(min-width: 1025px)');
  const regler = () => { details.open = large.matches; };
  large.addEventListener('change', regler);
  regler();
  /* Clic sur une entrée : on défile nous-mêmes (le script Webflow des ancres ignore la nav fixe et
     laisse l'intertitre dessous), puis le focus passe à l'intertitre pour le clavier. */
  const reduit = window.matchMedia('(prefers-reduced-motion: reduce)');
  liste.addEventListener('click', (e) => {
    const a = e.target.closest('a');
    if (!a) return;
    const h = titres[liens.indexOf(a)];
    if (!h) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    if (!large.matches) details.open = false; // replié d'abord : la position se calcule sur la page finale
    const marge = parseFloat(getComputedStyle(h).scrollMarginTop) || 0;
    window.scrollTo({ top: h.getBoundingClientRect().top + window.scrollY - marge, behavior: reduit.matches ? 'auto' : 'smooth' });
    history.replaceState(null, '', `#${h.id}`);
    if (!h.hasAttribute('tabindex')) h.setAttribute('tabindex', '-1');
    h.focus({ preventScroll: true });
  }, true);

  /* Partie lue : le dernier H2 passé au-dessus du tiers de l'écran */
  let actif = -1;
  const suivre = () => {
    const seuil = window.innerHeight * 0.32;
    let i = -1;
    for (let k = 0; k < titres.length; k++) {
      if (titres[k].getBoundingClientRect().top <= seuil) i = k;
      else break;
    }
    if (i === actif) return;
    if (actif >= 0) liens[actif].removeAttribute('aria-current');
    actif = i;
    if (i < 0) return;
    liens[i].setAttribute('aria-current', 'location');
    // Sommaire plus haut que l'écran : l'entrée lue reste visible
    if (large.matches && nav.scrollHeight > nav.clientHeight) {
      const a = liens[i];
      const haut = a.offsetTop - nav.clientHeight / 2 + a.offsetHeight / 2;
      nav.scrollTo({ top: Math.max(0, haut) });
    }
  };
  let tic = 0;
  const auDefilement = () => {
    if (!tic) tic = requestAnimationFrame(() => { tic = 0; suivre(); });
  };
  window.addEventListener('scroll', auDefilement, { passive: true });
  window.addEventListener('resize', auDefilement, { passive: true });
  suivre();
})();
