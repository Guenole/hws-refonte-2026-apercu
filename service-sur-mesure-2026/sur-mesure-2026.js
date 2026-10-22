/*
 * HWS Agency 2026 — page service « Sites web sur-mesure » : comportements propres à la page.
 * 1. « Pour qui » : onglets accessibles (clic, flèches, Début/Fin), un vrai projet par type.
 * 2. Méthode : la section se fige à l'écran et les 8 étapes glissent à l'horizontale pendant le
 *    défilement vertical ; compteur « 01 / 08 », barre de progression, repère corail sur l'étape en cours.
 *    Sans script ou sous 900 px : les étapes restent lisibles (défilement horizontal natif ou colonne).
 */
(() => {
  'use strict';
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

  /* ── 1. Onglets ── */
  const liste = document.querySelector('.sm26-types-liste');
  if (liste) {
    const onglets = [...liste.querySelectorAll('[role="tab"]')];
    const vertical = () => window.matchMedia('(min-width: 1101px)').matches;
    function choisir(o, focus) {
      for (const t of onglets) {
        const oui = t === o;
        t.setAttribute('aria-selected', oui ? 'true' : 'false');
        t.tabIndex = oui ? 0 : -1;
        const p = document.getElementById(t.getAttribute('aria-controls'));
        if (!p) continue;
        p.hidden = !oui;
        p.classList.toggle('is-in', oui);
      }
      liste.setAttribute('aria-orientation', vertical() ? 'vertical' : 'horizontal');
      if (focus) o.focus();
      if (!vertical()) o.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
    }
    onglets.forEach((o) => o.addEventListener('click', () => choisir(o, false)));
    liste.addEventListener('keydown', (e) => {
      const i = onglets.indexOf(document.activeElement);
      if (i < 0) return;
      const avant = ['ArrowUp', 'ArrowLeft'], apres = ['ArrowDown', 'ArrowRight'];
      let j = null;
      if (avant.includes(e.key)) j = (i - 1 + onglets.length) % onglets.length;
      if (apres.includes(e.key)) j = (i + 1) % onglets.length;
      if (e.key === 'Home') j = 0;
      if (e.key === 'End') j = onglets.length - 1;
      if (j === null) return;
      e.preventDefault();
      choisir(onglets[j], true);
    });
    liste.setAttribute('aria-orientation', vertical() ? 'vertical' : 'horizontal');
  }

  /* ── 2. Méthode en défilement horizontal ── */
  const section = document.querySelector('.sm26-methode');
  if (section) {
    const piste = section.querySelector('.sm26-methode-piste');
    const fenetre = section.querySelector('.sm26-methode-fenetre');
    const ol = section.querySelector('.sm26-etapes');
    const etapes = [...ol.children];
    const courant = section.querySelector('.sm26-courant');
    const barre = section.querySelector('.sm26-progression');
    const large = window.matchMedia('(min-width: 901px)');
    let distance = 0, actif = -1, raf = 0;

    function mesurer() {
      if (!large.matches) {
        section.classList.remove('sm26-methode--js');
        piste.style.height = '';
        ol.style.transform = '';
        marquer(-1);
        return;
      }
      section.classList.add('sm26-methode--js');
      ol.style.transform = '';
      const styles = getComputedStyle(fenetre);
      const utile = fenetre.clientWidth - parseFloat(styles.paddingLeft) - parseFloat(styles.paddingRight);
      // On s'arrête quand la dernière étape est entièrement visible.
      distance = Math.max(0, ol.scrollWidth - utile);
      const collant = section.querySelector('.sm26-methode-collant');
      piste.style.height = `${collant.offsetHeight + distance * 1.15}px`;
      suivre();
    }
    function marquer(i) {
      if (i === actif) return;
      actif = i;
      etapes.forEach((li, k) => {
        li.classList.toggle('is-actif', k === i);
        li.classList.toggle('is-passe', i >= 0 && k < i);
      });
      if (courant && i >= 0) courant.textContent = String(i + 1).padStart(2, '0');
    }
    function suivre() {
      raf = 0;
      if (!section.classList.contains('sm26-methode--js')) return;
      const r = piste.getBoundingClientRect();
      const course = piste.offsetHeight - section.querySelector('.sm26-methode-collant').offsetHeight;
      const p = course > 0 ? clamp(-r.top / course, 0, 1) : 0;
      ol.style.transform = `translate3d(${(-p * distance).toFixed(1)}px, 0, 0)`;
      if (barre) barre.style.setProperty('--p', (1 + p * (etapes.length - 1)) / etapes.length);
      marquer(Math.round(p * (etapes.length - 1)));
    }
    window.addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(suivre); }, { passive: true });
    new ResizeObserver(() => mesurer()).observe(fenetre);
    large.addEventListener('change', mesurer);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(mesurer);
    mesurer();
  }

})();
