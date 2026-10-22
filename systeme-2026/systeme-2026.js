/*
 * HWS Agency 2026 — comportements communs (socle).
 * Apparition douce à l'entrée dans l'écran : chaque élément marqué [data-s26-apparition] monte de 16 px
 * et se révèle une fois, avec un léger décalage entre éléments voisins. Sans script, tout reste visible.
 * Chiffres [data-s26-compte] : comptés une fois à l'apparition (texte final déjà présent dans le HTML).
 * Typographie : mots composés insécables, mots courts collés au suivant (voir plus bas).
 */
(() => {
  'use strict';
  /* Typographie française dans les sections du socle (le texte source ne change pas) :
     - un mot composé à trait d'union ne se coupe jamais (« sur-mesure », « sous-traitance ») ;
     - un mot d'une seule lettre reste collé au mot suivant (« à Toulouse ») ;
     - espace insécable avant : ; ? ! % » et après « ; le reste des fins de ligne
       est laissé à text-wrap: balance (titres) et pretty (paragraphes). */
  const COMPOSE = /[\p{L}\d]+(?:-[\p{L}\d]+)+/gu;
  // Seulement les mots d'une lettre (« à », « a », « y ») : lier aussi « de », « la »… déséquilibrait les colonnes étroites.
  const COURT = /(?<=^|[\s\u00A0(«])([\p{L}]) (?=\S)/gu;
  for (const racine of document.querySelectorAll('.s26')) {
    const marcheur = document.createTreeWalker(racine, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) => (n.parentElement.closest('script, style, svg, canvas, code, pre, .s26-insecable') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
    });
    const noeuds = [];
    while (marcheur.nextNode()) noeuds.push(marcheur.currentNode);
    for (const n of noeuds) {
      const t = n.nodeValue
        .replace(COURT, (m, mot) => `${mot}\u00A0`)
        .replace(/ ([:;?!%»])/g, '\u00A0$1') // espace insécable avant : ; ? ! % »
        .replace(/« /g, '«\u00A0');
      if (!COMPOSE.test(t)) {
        if (t !== n.nodeValue) n.nodeValue = t;
        continue;
      }
      COMPOSE.lastIndex = 0;
      const frag = document.createDocumentFragment();
      let i = 0;
      for (const m of t.matchAll(COMPOSE)) {
        if (m.index > i) frag.append(t.slice(i, m.index));
        const s = document.createElement('span');
        s.className = 's26-insecable';
        s.textContent = m[0];
        frag.append(s);
        i = m.index + m[0].length;
      }
      if (i < t.length) frag.append(t.slice(i));
      n.replaceWith(frag);
    }
  }

  const reduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const els = [...document.querySelectorAll('[data-s26-apparition]')];
  if (!els.length) return;
  document.documentElement.classList.add('s26-js');
  const rangs = new Map();
  for (const el of els) {
    if (el.style.getPropertyValue('--d')) continue;
    const p = el.parentElement;
    const i = rangs.get(p) || 0;
    rangs.set(p, i + 1);
    el.style.setProperty('--d', Math.min(i, 6));
  }
  const ease = (t) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);
  const compter = (el) => {
    if (reduit) return;
    const fin = parseFloat(el.dataset.s26Compte);
    if (!isFinite(fin)) return;
    const avant = el.dataset.avant || '', apres = el.dataset.apres || '';
    const t0 = performance.now(), duree = 1400;
    const pas = (now) => {
      const t = ease((now - t0) / duree);
      el.textContent = avant + Math.round(fin * t) + apres;
      if (t < 1) requestAnimationFrame(pas);
    };
    requestAnimationFrame(pas);
  };
  const io = new IntersectionObserver((entries) => {
    for (const en of entries) {
      if (!en.isIntersecting) continue;
      en.target.classList.add('is-in');
      for (const c of en.target.querySelectorAll('[data-s26-compte]')) compter(c);
      io.unobserve(en.target);
    }
  }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
  for (const el of els) io.observe(el);
})();
