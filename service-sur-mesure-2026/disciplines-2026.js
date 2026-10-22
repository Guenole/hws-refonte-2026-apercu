/*
 * HWS Agency 2026 — « Les expertises » : cinq petites figures en trame de points, une par colonne.
 * Une seule illustration (un seul canvas) pour toute la section, posée derrière la rangée de colonnes ;
 * chaque figure se dessine dans l'emplacement .sm26-figure de sa colonne (mesuré à chaque image).
 *   1. Architecture : trois couches empilées, celle du dessus flotte légèrement.
 *   2. UX : une maquette d'écran, un curseur passe d'un bloc à l'autre.
 *   3. Performance : une jauge qui monte jusqu'au haut du cadran, trois mesures à côté.
 *   4. Sécurité : un bouclier, un cadenas, une coche qui se trace.
 *   5. Intégrations : trois nœuds reliés ; un paquet corail (le seul corail de la section) circule.
 *   6. Collection (CMS, page No-Code) : une liste de fiches, une nouvelle fiche arrive en tête.
 *   7. Stores (page Applications mobiles) : une app descend dans un téléphone, deux rangées d'étoiles se remplissent.
 * Chaque page choisit ses figures avec data-figure sur .sm26-figure (couches, maquette, jauge, bouclier,
 * noeuds, collection) ; sans attribut, l'ordre 1 → 5 ci-dessus s'applique (page sur-mesure).
 * Moteur commun : ../systeme-2026/trame-2026.js.
 */
(() => {
  'use strict';
  const canvas = document.querySelector('.sm26-disciplines-trame');
  if (!canvas || !window.HWSTrame2026) return;
  const { encre: E, clamp } = window.HWSTrame2026;
  const figs = [...document.querySelectorAll('.sm26-figure')];
  const lisse = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };

  const poly = (g, pts, e) => {
    g.fillStyle = E(e);
    g.beginPath();
    g.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
    g.closePath();
    g.fill();
  };
  const contour = (g, lw, e) => { g.strokeStyle = E(e); g.lineWidth = lw; g.stroke(); };
  const rect = (g, x, y, w, h, e) => { g.fillStyle = E(e); g.fillRect(x, y, w, h); };
  const trait = (g, x0, y0, x1, y1, lw, e) => { g.strokeStyle = E(e); g.lineWidth = lw; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); };
  const disque = (g, x, y, r, e, corail = false) => { g.fillStyle = E(e, corail); g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); };

  // 1. Trois couches (données, API, interface) en vue isométrique
  function couches(g, b, t) {
    const a = Math.min(b.w * 0.42, 72), cx = b.x + a + 4, ep = 7;
    const encres = [0.32, 0.46, 0.72];
    for (let k = 0; k < 3; k++) {
      const flotte = k === 2 ? Math.sin(t * 1.3) * 3.5 - 3.5 : k === 1 ? Math.sin(t * 1.3 + 0.8) * 1.5 : 0;
      const y = b.y + b.h * 0.7 - k * b.h * 0.24 + flotte;
      const h = a * 0.34;
      // tranche
      poly(g, [[cx - a, y], [cx, y + h], [cx, y + h + ep], [cx - a, y + ep]], encres[k] + 0.2);
      poly(g, [[cx, y + h], [cx + a, y], [cx + a, y + ep], [cx, y + h + ep]], encres[k] + 0.3);
      // dessus
      poly(g, [[cx - a, y], [cx, y - h], [cx + a, y], [cx, y + h]], encres[k]);
    }
  }
  // 2. Une maquette d'écran et un curseur
  function maquette(g, b, t) {
    const x = b.x + 2, y = b.y + 6, w = Math.min(b.w * 0.86, 150), h = b.h * 0.86;
    g.beginPath();
    g.rect(x, y, w, h);
    contour(g, 4, 0.86);
    rect(g, x, y, w, h * 0.14, 0.45);
    rect(g, x + w * 0.1, y + h * 0.28, w * 0.38, h * 0.1, 0.82);
    rect(g, x + w * 0.1, y + h * 0.48, w * 0.32, h * 0.06, 0.4);
    rect(g, x + w * 0.1, y + h * 0.6, w * 0.26, h * 0.06, 0.4);
    rect(g, x + w * 0.56, y + h * 0.28, w * 0.34, h * 0.5, 0.22);
    // le curseur va et vient entre le bouton et la carte
    const cible = [[x + w * 0.3, y + h * 0.36], [x + w * 0.74, y + h * 0.6], [x + w * 0.2, y + h * 0.66]];
    const cyc = (t / 2.6) % cible.length, i = Math.floor(cyc), f = lisse((cyc - i - 0.45) / 0.55);
    const p0 = cible[i], p1 = cible[(i + 1) % cible.length];
    const cxp = p0[0] + (p1[0] - p0[0]) * f, cyp = p0[1] + (p1[1] - p0[1]) * f;
    const s = 15;
    poly(g, [[cxp, cyp], [cxp, cyp + s * 1.25], [cxp + s * 0.32, cyp + s * 0.92], [cxp + s * 0.62, cyp + s * 1.42], [cxp + s * 0.8, cyp + s * 1.32], [cxp + s * 0.52, cyp + s * 0.84], [cxp + s * 0.92, cyp + s * 0.84]], 0.96);
  }
  // 3. Une jauge et trois mesures
  function jauge(g, b, t) {
    const r = Math.min(b.h * 0.62, b.w * 0.27), cx = b.x + r + 6, cy = b.y + b.h * 0.86;
    g.lineCap = 'round';
    g.beginPath();
    g.arc(cx, cy, r, Math.PI, Math.PI * 2);
    contour(g, 11, 0.2);
    const cycle = t % 9, v = 0.35 + 0.63 * lisse(cycle / 1.8) - 0.63 * lisse((cycle - 8.2) / 0.8);
    g.beginPath();
    g.arc(cx, cy, r, Math.PI, Math.PI * (1 + v));
    contour(g, 11, 0.86);
    g.lineCap = 'butt';
    disque(g, cx, cy, 5, 0.9);
    const x0 = b.x + b.w * 0.58, x1 = Math.min(b.x + b.w * 0.98, x0 + 70);
    const longueurs = [0.92, 0.7, 0.84];
    for (let k = 0; k < 3; k++) {
      const yy = b.y + b.h * (0.3 + k * 0.24), xe = x0 + (x1 - x0) * longueurs[k];
      trait(g, x0, yy, x1, yy, 4, 0.22);
      trait(g, x0, yy, xe, yy, 4, 0.62);
      disque(g, xe, yy, 5, 0.9);
    }
  }
  // 4. Un bouclier, un cadenas, une coche
  function bouclier(g, b, t) {
    const h = b.h * 0.9, w = h * 0.8, x = b.x + 4, y = b.y + 4, cx = x + w / 2;
    const forme = () => {
      g.beginPath();
      g.moveTo(cx, y);
      g.lineTo(x + w, y + h * 0.14);
      g.lineTo(x + w, y + h * 0.48);
      g.quadraticCurveTo(x + w, y + h * 0.86, cx, y + h);
      g.quadraticCurveTo(x, y + h * 0.86, x, y + h * 0.48);
      g.lineTo(x, y + h * 0.14);
      g.closePath();
    };
    forme();
    g.fillStyle = E(0.18);
    g.fill();
    forme();
    contour(g, 4.5, 0.86);
    const lw = w * 0.34, lh = h * 0.24, lx = cx - lw / 2, ly = y + h * 0.46;
    rect(g, lx, ly, lw, lh, 0.92);
    g.beginPath();
    g.arc(cx, ly, lw * 0.32, Math.PI, Math.PI * 2);
    contour(g, 4.5, 0.9);
    // la coche se trace, reste, puis s'efface
    const c = t % 6, k = lisse(c / 0.9) - lisse((c - 5.2) / 0.6);
    if (k > 0.01) {
      const ax = x + w + 14, ay = y + h * 0.66, p = [[ax, ay], [ax + 9, ay + 9], [ax + 30, ay - 14]];
      const L1 = Math.hypot(9, 9), L2 = Math.hypot(21, 23), d = k * (L1 + L2);
      g.strokeStyle = E(0.88);
      g.lineWidth = 5;
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(p[0][0], p[0][1]);
      if (d <= L1) g.lineTo(p[0][0] + 9 * (d / L1), p[0][1] + 9 * (d / L1));
      else { g.lineTo(p[1][0], p[1][1]); const u = (d - L1) / L2; g.lineTo(p[1][0] + 21 * u, p[1][1] - 23 * u); }
      g.stroke();
      g.lineCap = 'butt';
    }
  }
  // 5. Trois nœuds reliés, un paquet circule (corail)
  function noeuds(g, b, t) {
    const r = Math.min(b.h * 0.17, 17);
    const A = [b.x + r + 4, b.y + r + 6], C = [b.x + Math.min(b.w * 0.86, 150) - r, b.y + r + 6], B = [(A[0] + C[0]) / 2, b.y + b.h - r - 6];
    g.setLineDash([7, 6]);
    trait(g, A[0], A[1], B[0], B[1], 3.5, 0.55);
    trait(g, C[0], C[1], B[0], B[1], 3.5, 0.55);
    g.setLineDash([]);
    for (const [p, e] of [[A, 0.2], [C, 0.2], [B, 0.34]]) {
      g.beginPath();
      g.arc(p[0], p[1], p === B ? r * 1.2 : r, 0, Math.PI * 2);
      g.fillStyle = E(e);
      g.fill();
      contour(g, 4, 0.86);
    }
    // le paquet va du CRM à l'API puis de l'API au site
    const c = (t / 3.2) % 1, aller = c < 0.5, u = lisse((aller ? c : c - 0.5) / 0.42);
    const [p0, p1] = aller ? [A, B] : [B, C];
    disque(g, p0[0] + (p1[0] - p0[0]) * u, p0[1] + (p1[1] - p0[1]) * u, 6, 0.96, true);
  }

  // 6. Une collection : des fiches (vignette, titre, texte) ; toutes les 3 s une nouvelle fiche arrive en tête
  function collection(g, b, t) {
    const x = b.x + 2, w = Math.min(b.w * 0.86, 150), rh = b.h * 0.27, gap = b.h * 0.06;
    const c = (t / 3) % 1, f = lisse((c - 0.55) / 0.45);  // glissement vers le bas
    g.save();
    g.beginPath();
    g.rect(x - 4, b.y, w + 8, b.h);
    g.clip();
    for (let k = -1; k < 3; k++) {
      const y = b.y + 6 + (k + f) * (rh + gap);
      const arrivee = k === -1 ? f : 1;                         // la nouvelle fiche s'imprime en glissant
      const sortie = k === 2 ? 1 - f : 1;                       // la dernière s'efface en bas
      const a = Math.min(arrivee, sortie);
      if (a <= 0.02) continue;
      g.beginPath();
      g.rect(x, y, w, rh);
      g.fillStyle = E(0.12 * a);
      g.fill();
      contour(g, 3.5, 0.72 * a);
      rect(g, x + rh * 0.16, y + rh * 0.16, rh * 0.68, rh * 0.68, 0.34 * a);
      rect(g, x + rh * 1.02, y + rh * 0.24, w * 0.42, rh * 0.18, 0.82 * a);
      rect(g, x + rh * 1.02, y + rh * 0.56, w * 0.3, rh * 0.13, 0.4 * a);
    }
    g.restore();
  }

  // 7. Un téléphone qui reçoit l'app (flèche qui descend), deux notes d'étoiles qui se remplissent
  function etoile(g, x, y, r, e) {
    g.fillStyle = E(e);
    g.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.45 : r;
      g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    g.closePath();
    g.fill();
  }
  function stores(g, b, t) {
    const ph = b.h * 0.9, pw = ph * 0.52, x = b.x + 3, y = b.y + (b.h - ph) / 2;
    g.beginPath();
    g.roundRect ? g.roundRect(x, y, pw, ph, 8) : g.rect(x, y, pw, ph);
    g.fillStyle = E(0.12);
    g.fill();
    contour(g, 4, 0.86);
    rect(g, x + pw * 0.32, y + ph * 0.06, pw * 0.36, 4, 0.7);
    // l'app descend et se pose sur l'écran
    const c = (t / 3.4) % 1, d = lisse(c / 0.45), fin = 1 - lisse((c - 0.85) / 0.15);
    const icone = pw * 0.42, ix = x + (pw - icone) / 2, iy = y - icone + (ph * 0.36 + icone) * d;
    g.save();
    g.beginPath(); g.rect(x, y + 6, pw, ph - 12); g.clip();
    rect(g, ix, iy, icone, icone, 0.88 * fin);
    g.restore();
    // deux rangées de cinq étoiles, remplies l'une après l'autre
    const x0 = x + pw + 16, r = Math.min(11.5, b.h * 0.11);
    for (let k = 0; k < 2; k++) {
      const yy = b.y + b.h * (0.34 + k * 0.34);
      for (let i = 0; i < 5; i++) {
        const plein = lisse((c - 0.3 - k * 0.12 - i * 0.05) / 0.06) * fin;
        etoile(g, x0 + i * r * 2.35, yy, r, 0.28 + 0.66 * plein);
      }
    }
  }

  const DESSINS = { couches, maquette, jauge, bouclier, noeuds, collection, stores };
  const ORDRE = ['couches', 'maquette', 'jauge', 'bouclier', 'noeuds'];
  function peindre(g, W, H, t) {
    const rc = canvas.getBoundingClientRect();
    figs.forEach((f, i) => {
      const r = f.getBoundingClientRect();
      const dessin = DESSINS[f.dataset.figure || ORDRE[i]];
      if (!r.width || !dessin) return;
      dessin(g, { x: r.left - rc.left, y: r.top - rc.top, w: r.width, h: r.height }, t + i * 0.7);
    });
  }
  window.HWSTrame2026.monter(canvas, { peindre, tFixe: 2.4, intro: 1.6 });
})();
