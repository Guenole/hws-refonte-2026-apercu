/*
 * HWS Agency 2026 — section « Témoignages », variante « deck » (styles : avis-2026-deck.css).
 * Les avis restent ceux du HTML (ul.hav-liste > li.hav-avis) : le script ne réécrit aucun texte.
 * 1. Mise en scène : chaque feuille prend sa place sur une boucle sans fin autour de l'avis courant
 *    (décalage, recul, inclinaison et opacité selon la distance). Toutes les feuilles ont la hauteur
 *    de la plus haute, et la scène est fixée à cette hauteur : la page ne bouge pas au changement d'avis.
 * 2. Navigation : flèches, repères (un par avis), clic sur une feuille voisine, glissé à la souris ou
 *    au doigt (la boucle suit le doigt puis se cale), flèches du clavier, Début / Fin.
 * 3. Accessibilité : les dix avis restent dans l'arbre d'accessibilité (liste lisible en entier) ;
 *    l'avis courant est annoncé ; mouvement réduit = changements instantanés.
 * Sans script, la section reste une rangée de feuilles qui défile.
 */
(() => {
  'use strict';
  const section = document.querySelector('.hav.hav--deck');
  if (!section) return;
  const liste = section.querySelector('.hav-liste');
  const avis = [...liste.querySelectorAll('.hav-avis')];
  const n = avis.length;
  if (n < 2) return;

  const prec = section.querySelector('.hav-btn--prec');
  const suiv = section.querySelector('.hav-btn--suiv');
  const courantEl = section.querySelector('.hav-courant');
  const totalEl = section.querySelector('.hav-total');
  const points = section.querySelector('.hav-points');
  const annonce = section.querySelector('.hav-deck-annonce');
  const reduit = window.matchMedia('(prefers-reduced-motion: reduce)');
  const deux = (v) => String(v).padStart(2, '0');

  /* ── Préparation des feuilles (structure seulement, mots inchangés) ── */
  avis.forEach((li, i) => {
    li.setAttribute('aria-roledescription', 'témoignage');
    li.setAttribute('aria-label', `${i + 1} sur ${n}`);
    // En-tête : catégorie + numéro
    const cat = li.querySelector('.hav-cat');
    const tete = document.createElement('div');
    tete.className = 'hav-deck-tete';
    const num = document.createElement('span');
    num.className = 'hav-deck-num';
    num.setAttribute('aria-hidden', 'true');
    num.textContent = deux(i + 1);
    if (cat) { cat.replaceWith(tete); tete.append(cat, num); } else { tete.append(num); li.prepend(tete); }
    // « Poste — Entreprise » : l'entreprise passe à droite, en capitales discrètes
    const poste = li.querySelector('.hav-poste');
    if (poste) {
      const m = poste.textContent.match(/^(.*\S)\s+—\s+(.+)$/);
      if (m) {
        poste.textContent = m[1];
        const ent = document.createElement('span');
        ent.className = 'hav-entreprise';
        ent.textContent = m[2];
        poste.after(ent);
      }
    }
  });
  // La feuille visible devient une enveloppe intérieure : le <li> garde sa place dans le deck,
  // la feuille porte l'inclinaison au survol (voir plus bas).
  avis.forEach((li) => {
    const feuille = document.createElement('div');
    feuille.className = 'hav-deck-feuille';
    const reflet = document.createElement('span');
    reflet.className = 'hav-deck-reflet';
    reflet.setAttribute('aria-hidden', 'true');
    feuille.append(reflet);
    while (li.firstChild) feuille.append(li.firstChild);
    li.append(feuille);
  });
  if (totalEl) totalEl.textContent = deux(n);

  const boutons = avis.map((li, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'hav-point-btn';
    const nom = li.querySelector('.hav-nom');
    b.setAttribute('aria-label', `Témoignage ${i + 1} sur ${n}${nom ? ` : ${nom.textContent}` : ''}`);
    b.addEventListener('click', () => aller(i));
    points && points.append(b);
    return b;
  });

  section.classList.add('hav--deck-pret');
  liste.tabIndex = 0;
  liste.setAttribute('aria-label', 'Témoignages : flèches gauche et droite pour changer d\'avis');

  /* ── Géométrie ── */
  let pos = 0;          // position continue (index de l'avis au centre)
  let actif = 0;
  let largeur = 0;
  let pas = 0;
  const etroit = window.matchMedia('(max-width: 640px)');

  const ecart = (i, p) => {
    let d = (((i - p) % n) + n) % n;
    if (d > n / 2) d -= n;
    return d;
  };

  function placer() {
    const mobile = etroit.matches;
    const profondeur = mobile ? 90 : 150;
    const inclinaison = mobile ? 9 : 15;
    const visibles = mobile ? 1.6 : 2.6;
    avis.forEach((li, i) => {
      const d = ecart(i, pos);
      const a = Math.abs(d);
      const x = d * pas;
      const z = -Math.min(a, 3) * profondeur;
      const y = Math.min(a, 3) * (mobile ? 10 : 16);
      const ry = -Math.max(-2, Math.min(2, d)) * inclinaison;
      const rz = Math.max(-2, Math.min(2, d)) * 0.8;
      const voile = Math.min(0.82, a * (mobile ? 0.5 : 0.36));   // feuille opaque, voilée selon la distance
      const o = a >= visibles ? 0 : 1;
      li.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, ${z.toFixed(1)}px) rotateY(${ry.toFixed(2)}deg) rotateZ(${rz.toFixed(2)}deg)`;
      li.style.opacity = String(o);
      li.style.setProperty('--voile', voile.toFixed(3));
      li.style.zIndex = String(100 - Math.round(a * 10));
      li.classList.toggle('is-actif', a < 0.5);
      li.classList.toggle('is-voisin', a >= 0.5 && a < visibles - 0.4);
      li.classList.toggle('is-loin', a >= visibles - 0.4);
    });
  }

  function mesurer() {
    largeur = avis[0].getBoundingClientRect().width || 400;
    pas = largeur * (parseFloat(getComputedStyle(section).getPropertyValue('--deck-pas')) || 0.76);
    // Hauteur commune : la plus haute feuille à la largeur actuelle
    section.style.removeProperty('--deck-carte-h');
    let h = 0;
    avis.forEach((li) => { h = Math.max(h, li.scrollHeight); });
    h = Math.ceil(h + 2);
    section.style.setProperty('--deck-carte-h', `${h}px`);
    section.style.setProperty('--deck-h', `${h + (etroit.matches ? 14 : 34)}px`);
    placer();
  }

  function majCommandes() {
    if (courantEl) courantEl.textContent = deux(actif + 1);
    boutons.forEach((b, i) => {
      if (i === actif) b.setAttribute('aria-current', 'true');
      else b.removeAttribute('aria-current');
    });
  }

  function aller(i, annoncer = true) {
    relacher();
    // Chemin le plus court sur la boucle
    const cible = ((i % n) + n) % n;
    pos = Math.round(pos) + ecart(cible, Math.round(pos));
    actif = cible;
    placer();
    majCommandes();
    if (annoncer && annonce) {
      const li = avis[actif];
      const nom = li.querySelector('.hav-nom');
      const ent = li.querySelector('.hav-entreprise');
      annonce.textContent = `Témoignage ${actif + 1} sur ${n}${nom ? `, ${nom.textContent}` : ''}${ent ? `, ${ent.textContent}` : ''}`;
    }
  }

  prec && prec.addEventListener('click', () => aller(actif - 1));
  suiv && suiv.addEventListener('click', () => aller(actif + 1));
  avis.forEach((li, i) => li.addEventListener('click', () => {
    if (deplace) return;
    if (i !== actif && li.classList.contains('is-voisin')) aller(i);
  }));
  liste.addEventListener('keydown', (e) => {
    const t = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
    if (t) { e.preventDefault(); aller(actif + t); }
    else if (e.key === 'Home') { e.preventDefault(); aller(0); }
    else if (e.key === 'End') { e.preventDefault(); aller(n - 1); }
  });

  /* ── Glissé : la boucle suit le pointeur, puis se cale sur l'avis le plus proche ── */
  let depart = null;
  let deplace = false;
  liste.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    if (e.target.closest('.hav-avis.is-actif') && e.pointerType === 'mouse' && window.getSelection().toString()) return;
    depart = { x: e.clientX, y: e.clientY, pos, t: performance.now(), id: e.pointerId, capte: false };
    deplace = false;
  });
  liste.addEventListener('pointermove', (e) => {
    if (!depart || e.pointerId !== depart.id) return;
    const dx = e.clientX - depart.x;
    const dy = e.clientY - depart.y;
    if (!depart.capte) {
      if (Math.abs(dx) < 6 || Math.abs(dx) < Math.abs(dy)) {
        if (Math.abs(dy) > 10) depart = null;   // défilement vertical : on laisse la page
        return;
      }
      depart.capte = true;
      relacher();
      deplace = true;
      liste.setPointerCapture(e.pointerId);
      liste.classList.add('is-glisse');
    }
    pos = depart.pos - dx / pas;
    placer();
  });
  const finir = (e) => {
    if (!depart || (e && e.pointerId !== depart.id)) return;
    if (depart.capte) {
      const dx = e.clientX - depart.x;
      const vitesse = dx / Math.max(1, performance.now() - depart.t);   // px/ms
      let cible = depart.pos - dx / pas;
      if (Math.abs(vitesse) > 0.45) cible -= Math.sign(vitesse) * 0.5;  // un geste vif passe à l'avis suivant
      liste.classList.remove('is-glisse');
      pos = depart.pos;   // aller() recalcule depuis la position de départ arrondie
      aller(Math.round(cible));
      setTimeout(() => { deplace = false; }, 0);
    }
    depart = null;
  };
  liste.addEventListener('pointerup', finir);
  liste.addEventListener('pointercancel', (e) => { if (depart && depart.capte) { liste.classList.remove('is-glisse'); aller(actif, false); } depart = null; deplace = false; });

  /* ── Inclinaison au survol de la feuille courante (même effet que la photo des fondateurs) ──
     La feuille s'incline vers le curseur (5° au plus), une lueur bleue très légère suit le curseur
     à sa surface et une ombre douce se décale à l'opposé. Lissé à chaque image ; retour à plat en
     douceur. Souris seulement, jamais pendant un glissé, rien si le mouvement réduit est demandé. */
  const TILT = { max: 5, lissage: 0.12, retour: 0.08 };
  const survolFin = window.matchMedia('(hover: hover) and (pointer: fine)');
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  let incl = null;   // { li, f, cx, cy, tx, ty, actif, cible, raf }
  const poser = (st) => {
    st.raf = 0;
    const k = st.cible ? TILT.lissage : TILT.retour;
    st.cx += (st.tx - st.cx) * k;
    st.cy += (st.ty - st.cy) * k;
    st.actif += (st.cible - st.actif) * k;
    const fx = Math.sign(st.cx) * Math.pow(Math.abs(st.cx), 0.85);
    const fy = Math.sign(st.cy) * Math.pow(Math.abs(st.cy), 0.85);
    const f = st.f;
    f.style.transform = `perspective(1100px) rotateX(${(-fy * TILT.max).toFixed(3)}deg) rotateY(${(fx * TILT.max).toFixed(3)}deg) scale(${(1 + 0.012 * st.actif).toFixed(4)})`;
    f.style.setProperty('--gx', `${(50 + st.cx * 45).toFixed(1)}%`);
    f.style.setProperty('--gy', `${(50 + st.cy * 45).toFixed(1)}%`);
    f.style.setProperty('--go', st.actif.toFixed(3));
    f.style.boxShadow = `${(-fx * 14).toFixed(1)}px ${(10 - fy * 10 + 14 * st.actif).toFixed(1)}px ${(24 + 24 * st.actif).toFixed(1)}px -18px rgba(23, 27, 73, ${(0.1 + 0.22 * st.actif).toFixed(3)})`;
    if (!st.cible && Math.abs(st.cx) < 0.002 && Math.abs(st.cy) < 0.002 && st.actif < 0.002) {
      f.style.transform = '';
      f.style.boxShadow = '';
      f.style.setProperty('--go', '0');
      if (incl === st) incl = null;
      return;
    }
    st.raf = requestAnimationFrame(() => poser(st));
  };
  const relancer = (st) => { if (!st.raf) st.raf = requestAnimationFrame(() => poser(st)); };
  const relacher = () => { if (incl) { incl.tx = incl.ty = 0; incl.cible = 0; relancer(incl); } };
  if (!reduit.matches) {
    avis.forEach((li) => {
      const f = li.querySelector('.hav-deck-feuille');
      // On écoute le <li>, qui ne bouge pas pendant l'inclinaison : la feuille ne « fuit » pas sous le curseur.
      li.addEventListener('pointermove', (e) => {
        if (e.pointerType !== 'mouse' || !survolFin.matches || !li.classList.contains('is-actif') || liste.classList.contains('is-glisse')) return;
        if (!incl || incl.li !== li) { relacher(); incl = { li, f, cx: 0, cy: 0, tx: 0, ty: 0, actif: 0, cible: 0, raf: 0 }; }
        const r = li.getBoundingClientRect();
        incl.tx = clamp(((e.clientX - r.left) / r.width) * 2 - 1, -1, 1);
        incl.ty = clamp(((e.clientY - r.top) / r.height) * 2 - 1, -1, 1);
        incl.cible = 1;
        relancer(incl);
      });
      li.addEventListener('pointerleave', () => { if (incl && incl.li === li) relacher(); });
    });
  }

  /* ── Mesure au démarrage et au redimensionnement (polices chargées comprises) ── */
  let tic = 0;
  const remesurer = () => { cancelAnimationFrame(tic); tic = requestAnimationFrame(mesurer); };
  new ResizeObserver(remesurer).observe(liste);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(remesurer);
  window.addEventListener('load', remesurer);
  mesurer();
  aller(0, false);
})();
