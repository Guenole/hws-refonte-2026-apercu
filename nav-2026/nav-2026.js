/*
 * HWS Agency — navbar 2026 : méga-menu « Nos services ».
 * Ouverture au clic (pas au survol : rien ne se ferme quand le curseur descend vers le panneau).
 * Fermeture : second clic, bouton « Fermer », Échap, clic à l'extérieur, ou focus qui sort du menu.
 * aria-expanded tient l'état ; à la fermeture au clavier, le focus revient sur « Nos services ».
 * Sur mobile, les catégories sont des <details> natifs : rien à piloter ici.
 */
(() => {
  'use strict';

  const mega = document.querySelector('.nv-mega');
  if (!mega) return;
  const toggle = mega.querySelector('.nv-mega-toggle');
  const panel = mega.querySelector('.nv-mega-panel');
  const fermer = mega.querySelector('.nv-fermer');
  const nav = document.querySelector('.nav-section');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let timer = 0;

  const ouvert = () => toggle.getAttribute('aria-expanded') === 'true';

  function ouvrir() {
    clearTimeout(timer);
    panel.hidden = false;
    toggle.setAttribute('aria-expanded', 'true');
    document.documentElement.classList.add('nv-mega-ouvert');
    // Une image plus tard, pour que la transition d'entrée se joue.
    requestAnimationFrame(() => requestAnimationFrame(() => panel.classList.add('is-open')));
  }

  function refermer(rendreFocus) {
    if (!ouvert()) return;
    toggle.setAttribute('aria-expanded', 'false');
    panel.classList.remove('is-open');
    document.documentElement.classList.remove('nv-mega-ouvert');
    timer = setTimeout(() => (panel.hidden = true), reduced ? 0 : 260);
    if (rendreFocus) toggle.focus();
  }

  toggle.addEventListener('click', () => (ouvert() ? refermer(false) : ouvrir()));
  if (fermer) fermer.addEventListener('click', () => refermer(true));

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && ouvert()) {
      e.preventDefault();
      refermer(true);
    }
  });

  // Clic à l'extérieur du menu (la navbar comprise, hors « Nos services ») : on referme.
  document.addEventListener('pointerdown', (e) => {
    if (ouvert() && !mega.contains(e.target)) refermer(false);
  });

  // Clic sur le voile, sous le panneau (c'est un pseudo-élément du panneau lui-même).
  panel.addEventListener('pointerdown', (e) => {
    if (e.target === panel) refermer(false);
  });

  // Le focus quitte le menu au clavier (Tab après le dernier lien) : on referme.
  mega.addEventListener('focusout', (e) => {
    if (ouvert() && e.relatedTarget && !mega.contains(e.relatedTarget)) refermer(false);
  });

  // Un lien choisi : on referme (utile pour les ancres et le bouton de réservation).
  panel.addEventListener('click', (e) => {
    if (e.target.closest('a')) refermer(false);
  });

  // Passage en affichage mobile : le panneau desktop n'a plus lieu d'être.
  window.matchMedia('(max-width: 991px)').addEventListener('change', (m) => {
    if (m.matches) refermer(false);
  });

  // Le panneau se cale toujours sous la navbar, quelle que soit sa hauteur.
  if (nav) {
    const caler = () => document.documentElement.style.setProperty('--nv-haut', nav.getBoundingClientRect().height + 'px');
    caler();
    new ResizeObserver(caler).observe(nav);
  }
})();
