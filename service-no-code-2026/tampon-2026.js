/*
 * HWS Agency 2026 — héro « Sites No-Code & Webflow » : le tampon.
 * ------------------------------------------------------------------------
 * Un tampon encreur dont la face est le gabarit d'une page web (le modèle du CMS). Vu d'un peu au-dessus
 * du bureau : une rangée de feuilles avance comme sur un tapis, le tampon descend sur la feuille vierge
 * au centre, appuie, remonte. L'empreinte montre d'abord le gabarit seul (cadres clairs), puis le contenu
 * s'y dépose : titre, image, lignes de texte, différents à chaque page. La dernière page imprimée porte
 * le seul élément corail : le point « publié ». Puis la rangée avance d'une feuille et le tampon recommence.
 * Dit en une image : un gabarit, des pages à volonté, publiées par vous.
 * Imprimé par le moteur commun ../systeme-2026/trame-2026.js (trame de points de la home).
 */
(() => {
  'use strict';
  const canvas = document.querySelector('.nc26-tampon');
  if (!canvas || !window.HWSTrame2026) return;
  const { encre: E, clamp } = window.HWSTrame2026;
  const lisse = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
  const entree = (x) => { x = clamp(x, 0, 1); return x * x * x; };          // accélère (le tampon tombe)
  const sortie = (x) => { x = clamp(x, 0, 1); return 1 - Math.pow(1 - x, 3); }; // ralentit (il remonte)

  const REGLAGES = {
    periode: 5.2,   // durée d'une impression complète, avance du tapis comprise (s)
  };
  // Phases d'un cycle (fractions de la période). Le tampon reste levé le plus longtemps au-dessus de la page
  // qu'il vient d'imprimer : c'est l'image qu'on voit le plus (gabarit rempli, point « publié »).
  const P = { descente: [0, 0.12], appui: [0.12, 0.19], montee: [0.19, 0.36], contenu: [0.28, 0.52], point: 0.5, avance: [0.78, 0.96] };
  const phase = (x, [a, b]) => clamp((x - a) / (b - a), 0, 1);

  // Contenus des pages : le gabarit est le même, le contenu change (longueurs, motif de l'image, lignes)
  const CONTENUS = [
    { titre: [0.62, 0.4], motif: 'soleil', lignes: [0.92, 0.78, 0.86, 0.5] },
    { titre: [0.5, 0.56], motif: 'montagne', lignes: [0.88, 0.94, 0.62] },
    { titre: [0.7, 0.3], motif: 'barres', lignes: [0.8, 0.9, 0.74, 0.88, 0.4] },
    { titre: [0.44, 0.6], motif: 'cercles', lignes: [0.94, 0.7, 0.82] },
  ];

  const rect = (g, x, y, w, h, e) => { if (e < 0.02) return; g.fillStyle = E(e); g.fillRect(x, y, w, h); };
  const cadre = (g, x, y, w, h, lw, e) => { if (e < 0.02) return; g.strokeStyle = E(e); g.lineWidth = lw; g.strokeRect(x, y, w, h); };
  const pilule = (g, x, y, w, h, e) => {
    if (e < 0.02) return;
    g.fillStyle = E(e);
    g.beginPath();
    const r = h / 2;
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.fill();
  };
  const disque = (g, x, y, r, e, corail = false) => { g.fillStyle = E(e, corail); g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); };
  const ovale = (g, x, y, rx, ry, e) => { g.fillStyle = E(e); g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); g.fill(); };

  // Chaque coup de tampon encre et cale un peu différemment (même gabarit, empreinte jamais identique)
  const hasard = (n, s) => { const v = Math.sin(n * 12.9898 + s * 78.233) * 43758.5453; return v - Math.floor(v); };

  // Une feuille : papier, puis gabarit (k = 0 → 1), puis contenu (c = 0 → 1). a = présence (fondu aux bords).
  function feuille(g, x, y, w, h, lw, a, k, c, contenu, ombre, n) {
    rect(g, x, y, w, h, (0.15 + ombre) * a);
    cadre(g, x, y, w, h, lw, 0.5 * a);
    if (k <= 0) return;
    // empreinte : encrage de 66 à 100 %, calage décalé de quelques pixels, légère inclinaison
    k *= 0.66 + 0.34 * hasard(n, 1);
    g.save();
    g.translate(x + w / 2, y + h / 2);
    g.rotate((hasard(n, 2) - 0.5) * 0.032);
    g.translate(-(x + w / 2) + (hasard(n, 3) - 0.5) * w * 0.06, -(y + h / 2) + (hasard(n, 4) - 0.5) * w * 0.045);
    const m = w * 0.09, ix = x + m, iw = w - 2 * m;
    const g1 = 0.24 * k * a;                        // encre du gabarit seul (cadres clairs)
    const plein = (v, e) => (0.24 + (e - 0.24) * v) * k * a; // du gabarit vers le contenu
    const etape = (i) => lisse(c * 4 - i);           // le contenu se dépose bloc par bloc
    let yy = y + m;
    // barre de navigation
    const nh = h * 0.05;
    rect(g, ix, yy, w * 0.14, nh, plein(etape(0), 0.82));
    for (let i = 0; i < 3; i++) pilule(g, ix + iw - w * 0.11 * (i + 1) + w * 0.02, yy + nh * 0.18, w * 0.08, nh * 0.64, g1 + 0.2 * etape(0) * a);
    yy += nh + h * 0.07;
    // titre sur deux lignes
    const th = h * 0.055;
    contenu.titre.forEach((l, i) => rect(g, ix, yy + i * th * 1.55, iw * (0.3 + (l - 0.3) * etape(1)), th, plein(etape(1), 0.84)));
    yy += th * 3.4;
    // image et son motif
    const imh = h * 0.27;
    rect(g, ix, yy, iw, imh, 0.1 * k * a + 0.12 * etape(2) * a);
    cadre(g, ix, yy, iw, imh, Math.max(3, lw * 0.75), plein(etape(2), 0.62));
    motif(g, contenu.motif, ix, yy, iw, imh, 0.7 * etape(2) * k * a);
    yy += imh + h * 0.07;
    // lignes de texte
    const lh = Math.max(4, h * 0.026);
    contenu.lignes.forEach((l, i) => {
      if (yy + i * lh * 2.4 + lh > y + h - m - h * 0.09) return;
      rect(g, ix, yy + i * lh * 2.4, iw * (0.35 + (l - 0.35) * etape(3)), lh, plein(etape(3), 0.56));
    });
    // bouton
    pilule(g, ix, y + h - m - h * 0.055, w * 0.3, h * 0.055, plein(etape(3), 0.86));
    g.restore();
  }
  function motif(g, nom, x, y, w, h, e) {
    if (e < 0.03) return;
    if (nom === 'soleil') {
      disque(g, x + w * 0.72, y + h * 0.36, h * 0.17, e);
      g.fillStyle = E(e * 0.8);
      g.beginPath();
      g.moveTo(x, y + h); g.lineTo(x + w * 0.38, y + h * 0.5); g.lineTo(x + w * 0.7, y + h); g.closePath(); g.fill();
    } else if (nom === 'montagne') {
      g.fillStyle = E(e);
      g.beginPath();
      g.moveTo(x, y + h); g.lineTo(x + w * 0.3, y + h * 0.42); g.lineTo(x + w * 0.5, y + h * 0.7); g.lineTo(x + w * 0.72, y + h * 0.3); g.lineTo(x + w, y + h); g.closePath(); g.fill();
    } else if (nom === 'barres') {
      const n = 5, bw = w * 0.1;
      for (let i = 0; i < n; i++) {
        const hh = h * (0.25 + 0.12 * ((i * 7) % 5));
        rect(g, x + w * 0.12 + i * w * 0.16, y + h - hh - h * 0.08, bw, hh, e);
      }
    } else {
      disque(g, x + w * 0.34, y + h * 0.52, h * 0.26, e * 0.75);
      disque(g, x + w * 0.62, y + h * 0.48, h * 0.2, e);
    }
  }

  function peindre(g, W, H, t) {
    const etroit = W < 600;                          // téléphone : le dessin prend toute la largeur
    const bw = Math.min(W * (etroit ? 1 : 0.92), H * (etroit ? 1.3 : 1.2)), bh = bw / 1.2;
    const bx = (W - bw) / 2, by = (H - bh) / 2;
    const u = bw;
    const lw = Math.max(3.5, u * 0.0065);
    const T = REGLAGES.periode;
    const cycle = Math.floor(t / T), x = (t / T) % 1;

    // Rangée de feuilles
    const pw = u * (etroit ? 0.31 : 0.285), ph = pw * 1.3;
    const pas = pw + u * 0.065;
    const xs = bx + u * 0.6;                         // centre de la feuille sous le tampon
    const yt = by + bh * 0.93 - ph;                  // haut des feuilles
    const s = lisse(phase(x, P.avance));             // avance du tapis

    // Tampon : hauteur (1 = levé, 0 = posé)
    let z;
    if (x < P.descente[1]) z = 1 - entree(phase(x, P.descente));
    else if (x < P.appui[1]) z = 0;
    else z = sortie(phase(x, P.montee));
    const imprime = x >= P.appui[0] + 0.04;          // la feuille centrale a reçu le gabarit
    const c = phase(x, P.contenu);

    for (let i = -2; i <= 2; i++) {
      const cx = xs + (i - s) * pas;
      const px = cx - pw / 2;
      if (px > W || px + pw < 0) continue;
      // les feuilles entières ; le fondu des bords est fait d'un seul dégradé à la fin (pas de raccord)
      const a = 1;
      const n = cycle + i;                           // numéro de la page dans la série
      const contenu = CONTENUS[((n % CONTENUS.length) + CONTENUS.length) % CONTENUS.length];
      let k = 0, cc = 0;
      if (i < 0) { k = 1; cc = 1; }
      else if (i === 0 && imprime) { k = 1; cc = c; }
      feuille(g, px, yt, pw, ph, lw, a, k, cc, contenu, 0, n);
      // le point « publié », posé sur le coin de la dernière page imprimée
      const porte = (i === 0 && x >= P.point) || (i === -1 && x < P.point);
      if (porte) disque(g, px + pw, yt, Math.max(7, u * 0.012), 0.96 * a, true);
    }

    // Le tampon, vu d'un peu au-dessus : plaque (dessus + tranche), caoutchouc, col et bouton
    const lev = u * 0.27 * z;                         // hauteur au-dessus du bureau (projetée) : levé, il dégage la page
    const ep = pw * 0.1;                              // épaisseur de la plaque (projetée)
    const tw = pw * 1.04, th = ph * 0.3;              // dessus de la plaque, raccourci par la vue
    const tx = xs - tw / 2;
    const ecrase = x >= P.appui[0] && x < P.appui[1] ? Math.sin(phase(x, P.appui) * Math.PI) * u * 0.004 : 0;
    const yContact = yt + ph * 0.5;                    // là où la plaque touche la feuille
    const yBas = yContact - lev + ecrase;              // bas de la tranche
    const yTr = yBas - ep, yDessus = yTr - th;
    // ombre portée sur la feuille : elle fonce quand le tampon approche (encre ajoutée, rien n'est effacé)
    if (z > 0 && z < 1 && s < 0.01) {
      g.save();
      g.globalAlpha = 0.16 * (1 - z);
      g.fillStyle = E(1);
      g.fillRect(tx + tw * 0.04, yContact - ep - th * 0.9, tw * 0.92, ep + th * 0.9);
      g.restore();
    }
    // caoutchouc (bande sombre sous la tranche) et tranche en bois
    rect(g, tx, yBas - ep * 0.32, tw, ep * 0.32, 0.92);
    rect(g, tx, yTr, tw, ep * 0.68, 0.56);
    // dessus de la plaque
    g.fillStyle = E(0.3);
    g.beginPath();
    const decal = tw * 0.06;
    g.moveTo(tx + decal, yDessus); g.lineTo(tx + tw - decal, yDessus); g.lineTo(tx + tw, yTr); g.lineTo(tx, yTr); g.closePath();
    g.fill();
    g.strokeStyle = E(0.8); g.lineWidth = lw; g.stroke();
    // col (cylindre) et bouton
    const cw = pw * 0.24, ch = ph * 0.3;
    const ccx = xs, cyBase = yDessus + th * 0.55;
    rect(g, ccx - cw / 2, cyBase - ch, cw, ch, 0.62);
    ovale(g, ccx, cyBase, cw / 2, cw * 0.16, 0.62);
    ovale(g, ccx, cyBase - ch, cw / 2, cw * 0.16, 0.4);
    disque(g, ccx, cyBase - ch - pw * 0.13, pw * 0.19, 0.86);
    disque(g, ccx - pw * 0.06, cyBase - ch - pw * 0.19, pw * 0.05, 0.5);   // reflet

    // Fondu sur les deux bords du dessin : les feuilles arrivent et partent sans être coupées net
    const fondu = Math.min(W * 0.16, 130);
    for (const [x0, x1] of [[0, fondu], [W, W - fondu]]) {
      const gr = g.createLinearGradient(x0, 0, x1, 0);
      gr.addColorStop(0, 'rgba(255,255,255,1)');
      gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr;
      g.fillRect(Math.min(x0, x1), 0, fondu, H);
    }
  }

  // Image fixe (mouvement réduit) : le tampon levé, la dernière page pleine avec son point corail
  const tFixe = REGLAGES.periode * 12 + REGLAGES.periode * 0.66;
  const moteur = window.HWSTrame2026.monter(canvas, { peindre, tFixe, densite: 0.42 });
  window.HWSTampon2026 = { REGLAGES, moteur };
})();
