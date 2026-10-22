/*
 * HWS Agency 2026 — héro « Sites web sur-mesure » : le patron de couture d'une page web.
 * ------------------------------------------------------------------------
 * Une page web dessinée comme une pièce de patron : trait de coupe plein, crans, ligne de couture
 * en pointillés, droit-fil, épingles. Un mètre ruban sorti de son boîtier mesure la largeur de la page,
 * une cote verticale mesure sa hauteur, une cote horizontale suit les colonnes.
 * Ce qui bouge, en continu et lentement :
 *   - la page s'ajuste en largeur (essayage), le ruban se déroule ou se rembobine avec elle ;
 *   - les trois colonnes changent de proportions, la cote au-dessus suit leurs bords ;
 *   - l'aiguille (le seul élément corail) coud la ligne de couture : derrière elle le point est serré,
 *     devant lui il reste un faufil léger.
 * Imprimé par le moteur commun ../systeme-2026/trame-2026.js (trame de points de la home).
 */
(() => {
  'use strict';
  const canvas = document.querySelector('.sm26-patron');
  if (!canvas || !window.HWSTrame2026) return;
  const { encre: E, clamp } = window.HWSTrame2026;
  const lisse = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };

  const REGLAGES = {
    essayage: 10,        // durée d'un cycle d'ajustement de la largeur (s)
    colonnes: 12,        // durée d'un cycle des proportions des colonnes (s)
    couture: 16,         // durée d'un tour de couture (s)
  };
  // Proportions successives des trois colonnes.
  const PROPORTIONS = [[1, 1, 1], [1.7, 1, 0.75], [0.8, 1.55, 1], [1, 0.75, 1.6]];

  // Cycle « tenue / transition » : renvoie 0 → 1 → 0 avec des paliers.
  function palier(t, periode) {
    const x = (t / periode) % 1;
    if (x < 0.35) return 0;
    if (x < 0.5) return lisse((x - 0.35) / 0.15);
    if (x < 0.85) return 1;
    return 1 - lisse((x - 0.85) / 0.15);
  }
  function proportions(t) {
    const n = PROPORTIONS.length, x = (t / REGLAGES.colonnes) * n;
    const i = Math.floor(x) % n, f = lisse(((x % 1) - 0.62) / 0.38);
    const a = PROPORTIONS[i], b = PROPORTIONS[(i + 1) % n];
    return a.map((v, j) => v + (b[j] - v) * f);
  }

  // Périmètre d'un rectangle parcouru dans le sens horaire depuis le coin haut gauche.
  function trajet(g, x, y, w, h, de, a) {
    const L = 2 * (w + h);
    const pts = [[x, y], [x + w, y], [x + w, y + h], [x, y + h], [x, y]];
    let acc = 0, ouvert = false;
    g.beginPath();
    for (let i = 0; i < 4; i++) {
      const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
      const l = Math.hypot(x1 - x0, y1 - y0);
      const s0 = clamp((de - acc) / l, 0, 1), s1 = clamp((a - acc) / l, 0, 1);
      if (s1 > s0) {
        const p0 = [x0 + (x1 - x0) * s0, y0 + (y1 - y0) * s0], p1 = [x0 + (x1 - x0) * s1, y0 + (y1 - y0) * s1];
        if (!ouvert || s0 > 0) g.moveTo(p0[0], p0[1]);
        g.lineTo(p1[0], p1[1]);
        ouvert = true;
      }
      acc += l;
    }
    return L;
  }
  function pointSur(x, y, w, h, d) {
    const L = 2 * (w + h);
    d = ((d % L) + L) % L;
    if (d < w) return [x + d, y];
    if (d < w + h) return [x + w, y + d - w];
    if (d < 2 * w + h) return [x + w - (d - w - h), y + h];
    return [x, y + h - (d - 2 * w - h)];
  }
  const rect = (g, x, y, w, h, e) => { g.fillStyle = E(e); g.fillRect(x, y, w, h); };
  const pilule = (g, x, y, w, h, e) => {
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
  const trait = (g, x0, y0, x1, y1, lw, e) => {
    g.strokeStyle = E(e);
    g.lineWidth = lw;
    g.beginPath();
    g.moveTo(x0, y0);
    g.lineTo(x1, y1);
    g.stroke();
  };
  const fleche = (g, x, y, ang, s, e) => {
    g.fillStyle = E(e);
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x - Math.cos(ang - 0.45) * s, y - Math.sin(ang - 0.45) * s);
    g.lineTo(x - Math.cos(ang + 0.45) * s, y - Math.sin(ang + 0.45) * s);
    g.closePath();
    g.fill();
  };
  const cran = (g, x, y, dir, s, e) => { // petit triangle de repère pointant vers l'intérieur
    g.fillStyle = E(e);
    g.beginPath();
    if (dir === 'g') { g.moveTo(x, y - s); g.lineTo(x + s * 1.2, y); g.lineTo(x, y + s); }
    if (dir === 'd') { g.moveTo(x, y - s); g.lineTo(x - s * 1.2, y); g.lineTo(x, y + s); }
    if (dir === 'h') { g.moveTo(x - s, y); g.lineTo(x, y + s * 1.2); g.lineTo(x + s, y); }
    g.closePath();
    g.fill();
  };
  const epingle = (g, x, y, ang, L, e) => {
    const x1 = x + Math.cos(ang) * L, y1 = y + Math.sin(ang) * L;
    trait(g, x, y, x1, y1, Math.max(3, L * 0.06), e * 0.8);
    g.fillStyle = E(e);
    g.beginPath();
    g.arc(x, y, Math.max(4.5, L * 0.12), 0, Math.PI * 2);
    g.fill();
  };

  function peindre(g, W, H, t) {
    // Cadre du dessin : un peu plus large que haut, centré dans le canvas.
    const bw = Math.min(W * 0.9, H * 1.18), bh = bw / 1.18;
    const bx = (W - bw) / 2, by = (H - bh) / 2;
    const u = bw;
    const lw = Math.max(4, u * 0.0075);              // épaisseur d'un trait plein
    const k = palier(t, REGLAGES.essayage);

    // Pièce de patron = la page
    const pw = u * (0.7 + 0.09 * k), ph = bh * 0.74;
    const px = bx + u * 0.15 + (u * 0.79 - pw) * 0.5, py = by + bh * 0.2;

    // 1. Trait de coupe et crans
    g.strokeStyle = E(0.9);
    g.lineWidth = lw;
    g.strokeRect(px, py, pw, ph);
    const s = u * 0.012;
    cran(g, px, py + ph * 0.5, 'g', s, 0.9);
    cran(g, px + pw, py + ph * 0.5, 'd', s, 0.9);
    cran(g, px + pw * 0.33, py, 'h', s, 0.9);
    cran(g, px + pw * 0.66, py, 'h', s, 0.9);

    // 2. Ligne de couture : serrée derrière l'aiguille, faufil léger devant
    const m = u * 0.022;
    const cx = px + m, cy = py + m, cw = pw - 2 * m, chh = ph - 2 * m;
    const L = 2 * (cw + chh);
    const d = ((t / REGLAGES.couture) % 1) * L;
    g.lineCap = 'butt';
    g.setLineDash([u * 0.016, u * 0.012]);
    g.lineWidth = Math.max(3.5, lw * 0.75);
    g.strokeStyle = E(0.28);
    trajet(g, cx, cy, cw, chh, d, L);
    g.stroke();
    g.strokeStyle = E(0.72);
    trajet(g, cx, cy, cw, chh, 0, d);
    g.stroke();
    g.setLineDash([]);

    // 3. Contenu de la page (maquette fil de fer)
    const ix = px + u * 0.05, iw = pw - u * 0.1;
    let y = py + u * 0.05;
    // navigation
    const nh = ph * 0.06;
    rect(g, ix, y, u * 0.055, nh * 0.7, 0.82);
    for (let i = 0; i < 3; i++) pilule(g, ix + iw - u * 0.05 * (i + 1) - u * 0.012 * i, y + nh * 0.2, u * 0.045, nh * 0.32, 0.5);
    y += nh + ph * 0.035;
    trait(g, ix, y, ix + iw, y, Math.max(3, lw * 0.6), 0.32);
    y += ph * 0.05;
    // héro : titre, texte, bouton à gauche ; image à droite avec le droit-fil
    const hh = ph * 0.3, imgW = iw * 0.36;
    rect(g, ix, y, iw * 0.5, hh * 0.15, 0.82);
    rect(g, ix, y + hh * 0.22, iw * 0.36, hh * 0.15, 0.82);
    rect(g, ix, y + hh * 0.48, iw * 0.46, hh * 0.06, 0.42);
    rect(g, ix, y + hh * 0.6, iw * 0.4, hh * 0.06, 0.42);
    pilule(g, ix, y + hh * 0.78, iw * 0.17, hh * 0.17, 0.88);
    const imx = ix + iw - imgW;
    rect(g, imx, y, imgW, hh, 0.2);
    // droit-fil : flèche à deux pointes, repère classique d'un patron
    const gx0 = imx + imgW * 0.2, gx1 = imx + imgW * 0.8, gy = y + hh * 0.5;
    trait(g, gx0, gy, gx1, gy, Math.max(3, lw * 0.6), 0.8);
    fleche(g, gx1 + lw, gy, 0, u * 0.016, 0.85);
    fleche(g, gx0 - lw, gy, Math.PI, u * 0.016, 0.85);
    y += hh + ph * 0.11;
    // colonnes, avec leur cote au-dessus
    const ch = ph * 0.2, gap = u * 0.018;
    const r = proportions(t), somme = r[0] + r[1] + r[2];
    const utile = iw - 2 * gap;
    const cote = y - ph * 0.045;
    trait(g, ix, cote, ix + iw, cote, Math.max(2.5, lw * 0.45), 0.5);
    let x = ix;
    for (let i = 0; i < 3; i++) {
      const w = (utile * r[i]) / somme;
      rect(g, x, y, w, ch, 0.17);
      rect(g, x + w * 0.1, y + ch * 0.16, w * 0.6, ch * 0.1, 0.72);
      rect(g, x + w * 0.1, y + ch * 0.38, w * 0.75, ch * 0.07, 0.38);
      rect(g, x + w * 0.1, y + ch * 0.52, w * 0.55, ch * 0.07, 0.38);
      // repères de cote aux bords de chaque colonne
      trait(g, x, cote - ph * 0.016, x, cote + ph * 0.016, Math.max(3, lw * 0.55), 0.85);
      if (i === 2) trait(g, x + w, cote - ph * 0.016, x + w, cote + ph * 0.016, Math.max(3, lw * 0.55), 0.85);
      x += w + gap;
    }
    y += ch + ph * 0.06;
    // pied de page
    rect(g, ix, y, iw, Math.max(6, py + ph - u * 0.045 - y), 0.36);

    // 4. Mètre ruban : boîtier à gauche, ruban jusqu'au bord droit de la page
    const ry = py - u * 0.075, rh = u * 0.034;
    const bxc = px - u * 0.085, byc = ry + rh * 0.5, br = u * 0.06;
    g.fillStyle = E(0.32);
    g.beginPath();
    g.arc(bxc, byc, br, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = E(0.88);
    g.lineWidth = lw;
    g.stroke();
    g.fillStyle = E(0.88);
    g.beginPath();
    g.arc(bxc, byc, br * 0.28, 0, Math.PI * 2);
    g.fill();
    const x0 = bxc + br * 0.75, x1 = px + pw + u * 0.01;
    rect(g, x0, ry, x1 - x0, rh, 0.24);
    trait(g, x0, ry, x1, ry, Math.max(2.5, lw * 0.5), 0.7);
    trait(g, x0, ry + rh, x1, ry + rh, Math.max(2.5, lw * 0.5), 0.7);
    // graduations fixes par rapport à la page : elles défilent quand le ruban se déroule
    const pasG = u * 0.016;
    for (let gxx = px + pw, i = 0; gxx > x0 + pasG * 0.5; gxx -= pasG, i++) {
      const long = i % 5 === 0;
      trait(g, gxx, ry, gxx, ry + rh * (long ? 0.72 : 0.38), Math.max(3, lw * 0.55), long ? 0.9 : 0.7);
    }
    // embout accroché au coin de la page
    rect(g, x1 - u * 0.004, ry - rh * 0.2, u * 0.014, rh * 1.4 + (py - ry - rh) + lw, 0.86);

    // 5. Cote verticale à droite de la page
    const vx = px + pw + u * 0.05;
    trait(g, vx, py + lw, vx, py + ph - lw, Math.max(2.5, lw * 0.5), 0.62);
    fleche(g, vx, py, -Math.PI / 2, u * 0.016, 0.85);
    fleche(g, vx, py + ph, Math.PI / 2, u * 0.016, 0.85);
    trait(g, vx - u * 0.018, py, vx + u * 0.018, py, Math.max(3, lw * 0.55), 0.8);
    trait(g, vx - u * 0.018, py + ph, vx + u * 0.018, py + ph, Math.max(3, lw * 0.55), 0.8);

    // 6. Épingles qui tiennent la pièce (bleu nuit)
    const pl = u * 0.075;
    epingle(g, px + pw * 0.08, py + ph - u * 0.012, -0.95, pl, 0.95);
    epingle(g, px + pw * 0.93, py + ph * 0.62, -2.35, pl, 0.95);

    // 7. L'aiguille : le seul élément corail
    const [ax, ay] = pointSur(cx, cy, cw, chh, d);
    g.fillStyle = E(0.96, true);
    g.beginPath();
    g.arc(ax, ay, Math.max(6, u * 0.011), 0, Math.PI * 2);
    g.fill();
  }

  const moteur = window.HWSTrame2026.monter(canvas, { peindre, tFixe: 7.5, densite: 0.42 });
  window.HWSPatron2026 = { REGLAGES, moteur };
})();
