/*
 * HWS Agency 2026 — section « L'équipe », v2 « l'étendoir ».
 * Chaque portrait est un pendule à deux articulations :
 *   θ : le fil pivote sur la tringle (période qui dépend de la longueur du fil, comme un vrai pendule) ;
 *   φ : le tirage pivote un peu à part sur sa pince et prend du retard quand le fil accélère (inertie).
 * Ce qui les met en mouvement : le passage de la souris (sa vitesse horizontale), le glissement du doigt sur la
 * tringle en mobile, un toucher, et un léger balancement quand la section apparaît (« on vient de les accrocher »).
 * Au repos, rien ne tourne : la boucle s'arrête. Mouvement réduit : aucun balancement.
 */
(() => {
  'use strict';
  const section = document.querySelector('.heq26');
  if (!section) return;
  const etendoir = section.querySelector('.heq26-etendoir');
  const reduit = window.matchMedia('(prefers-reduced-motion: reduce)');
  const souris = window.matchMedia('(hover: hover) and (pointer: fine)');
  section.classList.add('js');

  const R = {
    gravite: 4600,     // px/s² « équivalents » : fil de 300 px → période d'environ 1,6 s
    amortiFil: 1.5,    // 1/s : l'oscillation s'éteint en 2 à 3 s
    raideurPince: 95,  // le tirage revient vite dans l'axe du fil
    amortiPince: 7,
    retard: 0.9,       // part de l'accélération du fil que le tirage « subit » en retard
    pousseFil: 0.05,   // souris : degrés/s gagnés par px/s de vitesse, par seconde de contact
    poussePince: 0.09,
    doigt: 0.32,       // mobile : degrés/s par px glissé
    max: 11,           // angle maximal du fil, en degrés
  };

  const membres = [...section.querySelectorAll('.heq26-membre')].map((el, i) => {
    el.style.setProperty('--i', i);
    return { el, susp: el.querySelector('.heq26-suspension'), tirage: el.querySelector('.heq26-tirage'), fil: el.querySelector('.heq26-fil'), th: 0, w: 0, ph: 0, wp: 0, L: 300, rect: null };
  });

  const mesurer = () => membres.forEach((m) => {
    m.L = m.fil.offsetHeight + m.tirage.offsetHeight * 0.55;
    m.rect = m.tirage.getBoundingClientRect();
  });

  /* ── Boucle : pas fixe de 1/120 s, arrêtée quand tout est immobile ── */
  let raf = 0, dernier = 0, visible = false;
  const pas = 1 / 120;
  const calculer = (m, dt) => {
    const aFil = -(R.gravite / m.L) * m.th - R.amortiFil * m.w;
    m.w += aFil * dt;
    m.th += m.w * dt;
    if (Math.abs(m.th) > R.max) { m.th = Math.sign(m.th) * R.max; m.w *= -0.3; }
    const aPince = -R.raideurPince * m.ph - R.amortiPince * m.wp - R.retard * aFil;
    m.wp += aPince * dt;
    m.ph += m.wp * dt;
  };
  const tic = (t) => {
    raf = 0;
    let dt = Math.min(0.05, (t - (dernier || t)) / 1000);
    dernier = t;
    let enMouvement = false;
    while (dt > 0) {
      const h = Math.min(pas, dt);
      membres.forEach((m) => calculer(m, h));
      dt -= h;
    }
    membres.forEach((m) => {
      const bouge = Math.abs(m.th) + Math.abs(m.w) * 0.05 + Math.abs(m.ph) + Math.abs(m.wp) * 0.05 > 0.004;
      if (bouge) {
        enMouvement = true;
        m.susp.style.transform = `rotate(${m.th.toFixed(3)}deg)`;
        m.tirage.style.transform = `rotate(${m.ph.toFixed(3)}deg)`;
      } else if (m.th || m.ph) {
        m.th = m.w = m.ph = m.wp = 0;
        m.susp.style.transform = m.tirage.style.transform = '';
      }
    });
    if (enMouvement && visible) raf = requestAnimationFrame(tic);
    else dernier = 0;
  };
  const lancer = () => { if (!raf && !reduit.matches) raf = requestAnimationFrame(tic); };

  /* ── Apparition : la légende monte, les portraits se balancent un peu, une seule fois ── */
  let vu = false;
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (!visible) return;
    mesurer();
    if (!vu) {
      vu = true;
      section.classList.add('is-vu');
      if (!reduit.matches) membres.forEach((m, i) => setTimeout(() => {
        m.w += (i % 2 ? 1 : -1) * (16 + ((i * 37) % 9));
        lancer();
      }, 120 + i * 70));
    }
    lancer();
  }, { threshold: 0.2 }).observe(etendoir);
  window.addEventListener('resize', mesurer, { passive: true });
  window.addEventListener('scroll', () => { if (visible) membres.forEach((m) => { m.rect = null; }); }, { passive: true });

  /* ── Souris : la vitesse horizontale du curseur pousse le tirage qu'il traverse ── */
  let px = null, pt = 0;
  etendoir.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse' || reduit.matches) return;
    const t = e.timeStamp;
    if (px !== null && t > pt) {
      const dt = Math.min(0.05, (t - pt) / 1000);
      const vx = Math.max(-3000, Math.min(3000, (e.clientX - px) / Math.max(dt, 0.004)));
      membres.forEach((m) => {
        const r = m.rect || (m.rect = m.tirage.getBoundingClientRect());
        if (e.clientX < r.left - 14 || e.clientX > r.right + 14 || e.clientY < r.top - 10 || e.clientY > r.bottom + 10) return;
        // Plus on touche bas, plus le bras de levier est long : le fil bouge davantage, la pince moins.
        const bas = Math.max(0, Math.min(1, (e.clientY - r.top) / r.height));
        m.w -= vx * dt * R.pousseFil * (0.55 + 0.45 * bas);
        m.wp -= vx * dt * R.poussePince * (1 - 0.5 * bas);
      });
      lancer();
    }
    px = e.clientX; pt = t;
  });
  etendoir.addEventListener('pointerleave', () => { px = null; });

  /* ── Survol : le tirage survolé passe devant, les autres s'estompent un peu ── */
  membres.forEach((m) => {
    m.tirage.addEventListener('pointerenter', (e) => {
      if (e.pointerType !== 'mouse') return;
      m.el.classList.add('is-survol');
      etendoir.classList.add('a-survol');
    });
    m.tirage.addEventListener('pointerleave', () => {
      m.el.classList.remove('is-survol');
      if (!etendoir.querySelector('.is-survol')) etendoir.classList.remove('a-survol');
    });
    // Toucher : une pichenette dans le sens opposé au dernier mouvement.
    m.tirage.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' || reduit.matches) return;
      m.w += (m.w > 0 ? -1 : 1) * 22;
      lancer();
    });
  });

  /* ── Mobile : faire glisser la tringle balance les portraits (ils prennent du retard sur le mouvement) ── */
  let sx = etendoir.scrollLeft;
  etendoir.addEventListener('scroll', () => {
    const dx = etendoir.scrollLeft - sx;
    sx = etendoir.scrollLeft;
    if (reduit.matches || souris.matches || !dx) return;
    membres.forEach((m) => { m.w -= Math.max(-14, Math.min(14, dx * R.doigt)); });
    lancer();
  }, { passive: true });
})();
