/*
 * HWS Agency 2026 — héro « Applications mobiles & SaaS » : le téléphone et l'écran.
 * ------------------------------------------------------------------------
 * Un téléphone et la fenêtre d'une plateforme web, côte à côte, reliés par un fil en pointillés.
 * À chaque cycle : un doigt touche le bouton de l'app (le point corail, seul élément corail),
 * une nouvelle ligne s'ajoute en tête de la liste du téléphone, le point voyage le long du fil,
 * et la même ligne apparaît dans le tableau de la plateforme ; le premier indicateur grandit.
 * Dit en une image : l'app mobile et son SaaS sont un seul produit, synchronisé.
 * Imprimé par le moteur commun ../systeme-2026/trame-2026.js (trame de points de la home).
 */
(() => {
  'use strict';
  const canvas = document.querySelector('.ap26-ecran');
  if (!canvas || !window.HWSTrame2026) return;
  const { encre: E, clamp } = window.HWSTrame2026;
  const lisse = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };

  const REGLAGES = { periode: 5.6 };
  // Phases d'un cycle (fractions de la période)
  const P = { appui: [0.03, 0.15], mobile: [0.1, 0.26], voyage: [0.22, 0.54], web: [0.52, 0.66], fondu: [0.76, 0.9], eclatMobile: [0.5, 0.7], eclatWeb: [0.84, 0.99] };
  const phase = (x, [a, b]) => clamp((x - a) / (b - a), 0, 1);
  const hasard = (n, s) => { const v = Math.sin(n * 12.9898 + s * 78.233) * 43758.5453; return v - Math.floor(v); };

  const rect = (g, x, y, w, h, e) => { if (e < 0.02 || w <= 0 || h <= 0) return; g.fillStyle = E(e); g.fillRect(x, y, w, h); };
  const arrondi = (g, x, y, w, h, r) => {
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  };
  const pilule = (g, x, y, w, h, e) => { if (e < 0.02) return; arrondi(g, x, y, w, h, h / 2); g.fillStyle = E(e); g.fill(); };
  const disque = (g, x, y, r, e, corail = false) => { if (e < 0.02) return; g.fillStyle = E(e, corail); g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); };

  // Une liste qui reçoit une nouvelle ligne en tête : la ligne n vit à la position (j - 1 + f).
  function liste(g, x, y, w, rangee, nb, cycle, f, eclat, dessinLigne) {
    g.save();
    g.beginPath();
    g.rect(x - 2, y - 2, w + 4, rangee * nb + 4);
    g.clip();
    for (let j = 0; j <= nb; j++) {
      const n = cycle - j, p = j - 1 + f;
      if (p < -1 || p > nb) continue;
      const a = j === 0 ? f : p > nb - 1 ? 1 - (p - (nb - 1)) : 1;
      if (a <= 0.02) continue;
      dessinLigne(g, x, y + p * rangee, w, rangee, n, a, j === 0 ? eclat : 0);
    }
    g.restore();
  }

  function peindre(g, W, H, t) {
    const etroit = W < 600;
    const bw = Math.min(W * (etroit ? 0.86 : 0.94), H * 1.25), bh = bw / 1.25;
    const bx = (W - bw) / 2, by = (H - bh) / 2;
    const u = bw;
    const lw = Math.max(3.5, u * 0.006);
    const T = REGLAGES.periode, cycle = Math.floor(t / T), x = (t / T) % 1;
    const fMob = lisse(phase(x, P.mobile)), fWeb = lisse(phase(x, P.web));
    // la nouvelle ligne reste marquée un moment après son arrivée, puis rejoint les autres
    const eMob = x >= P.mobile[0] ? 1 - lisse(phase(x, P.eclatMobile)) : 0;
    const eWeb = x >= P.web[0] ? 1 - lisse(phase(x, P.eclatWeb)) : 0;

    // ── Téléphone ──
    const pw = u * 0.25, ph = pw * 2.05;
    const px = bx + u * 0.07, py = by + bh * 0.56 - ph / 2;
    arrondi(g, px, py, pw, ph, pw * 0.16);
    g.fillStyle = E(0.14); g.fill();
    g.strokeStyle = E(0.9); g.lineWidth = lw * 1.3; g.stroke();
    pilule(g, px + pw * 0.36, py + pw * 0.07, pw * 0.28, pw * 0.06, 0.88);        // encoche
    pilule(g, px + pw * 0.34, py + ph - pw * 0.09, pw * 0.32, pw * 0.035, 0.7);   // barre d'accueil
    const sx = px + pw * 0.1, sw = pw * 0.8;
    let sy = py + pw * 0.22;
    rect(g, sx, sy, sw * 0.5, pw * 0.07, 0.84);                                   // titre de l'écran
    sy += pw * 0.17;
    const rM = pw * 0.24;
    liste(g, sx, sy, sw, rM, 4, cycle, fMob, eMob, (g2, lx, ly, lwid, rh, n, a, neuf) => {
      rect(g2, lx, ly + rh * 0.08, lwid, rh * 0.84, (0.08 + 0.36 * neuf) * a);
      disque(g2, lx + rh * 0.42, ly + rh * 0.5, rh * 0.24, 0.5 * a);
      rect(g2, lx + rh * 0.82, ly + rh * 0.3, lwid * (0.35 + 0.3 * hasard(n, 1)), rh * 0.14, 0.78 * a);
      rect(g2, lx + rh * 0.82, ly + rh * 0.56, lwid * (0.25 + 0.25 * hasard(n, 2)), rh * 0.1, 0.38 * a);
    });
    // bouton principal de l'app
    const btw = sw, bth = pw * 0.15, btx = sx, bty = py + ph - pw * 0.38;
    pilule(g, btx, bty, btw, bth, 0.88);

    // ── Plateforme web ──
    const ww = u * 0.58, wh = ww * 0.74;
    const wx = bx + u * 0.4, wy = by + bh * 0.47 - wh / 2;
    g.beginPath(); g.rect(wx, wy, ww, wh);
    g.fillStyle = E(0.1); g.fill();
    g.strokeStyle = E(0.88); g.lineWidth = lw; g.stroke();
    const barre = wh * 0.09;
    rect(g, wx, wy, ww, barre, 0.32);
    for (let i = 0; i < 3; i++) disque(g, wx + barre * (0.5 + i * 0.55), wy + barre / 2, barre * 0.16, 0.8);
    pilule(g, wx + ww * 0.28, wy + barre * 0.28, ww * 0.44, barre * 0.44, 0.16);
    // barre latérale
    const sbw = ww * 0.2, cy0 = wy + barre;
    rect(g, wx, cy0, sbw, wh - barre, 0.16);
    for (let i = 0; i < 5; i++) rect(g, wx + sbw * 0.18, cy0 + wh * 0.08 + i * wh * 0.085, sbw * (i === 0 ? 0.6 : 0.5), wh * 0.026, i === 0 ? 0.82 : 0.42);
    // indicateurs : le premier grandit quand la ligne arrive
    const mx = wx + sbw + ww * 0.05, mw = ww - sbw - ww * 0.1;
    rect(g, mx, cy0 + wh * 0.07, mw * 0.36, wh * 0.045, 0.84);
    const ky = cy0 + wh * 0.17, kh = wh * 0.16, kw = (mw - ww * 0.04) / 3;
    for (let i = 0; i < 3; i++) {
      const kx = mx + i * (kw + ww * 0.02);
      g.beginPath(); g.rect(kx, ky, kw, kh);
      g.fillStyle = E(0.12); g.fill();
      g.strokeStyle = E(0.5); g.lineWidth = Math.max(3, lw * 0.7); g.stroke();
      const base = [0.55, 0.38, 0.7][i];
      const v = i === 0 ? base + 0.1 * fWeb + 0.1 * ((cycle % 3) / 3) : base;
      rect(g, kx + kw * 0.12, ky + kh * 0.26, kw * 0.5 * v, kh * 0.18, 0.86);
      rect(g, kx + kw * 0.12, ky + kh * 0.6, kw * 0.6, kh * 0.1, 0.36);
    }
    // tableau qui reçoit la ligne
    const ty = ky + kh + wh * 0.07, rW = wh * 0.088;
    rect(g, mx, ty - rW * 0.45, mw, Math.max(3, lw * 0.6), 0.5);
    liste(g, mx, ty, mw, rW, 4, cycle, fWeb, eWeb, (g2, lx, ly, lwid, rh, n, a, neuf) => {
      rect(g2, lx, ly + rh * 0.08, lwid, rh * 0.84, (0.06 + 0.4 * neuf) * a);
      rect(g2, lx + lwid * 0.03, ly + rh * 0.38, lwid * (0.18 + 0.12 * hasard(n, 1)), rh * 0.24, 0.72 * a);
      rect(g2, lx + lwid * 0.4, ly + rh * 0.4, lwid * (0.16 + 0.14 * hasard(n, 2)), rh * 0.2, 0.38 * a);
      pilule(g2, lx + lwid * 0.8, ly + rh * 0.3, lwid * 0.14, rh * 0.4, (0.3 + 0.3 * hasard(n, 3)) * a);
      rect(g2, lx, ly + rh - 2, lwid, Math.max(2.5, lw * 0.4), 0.22 * a);
    });

    // ── Le fil de synchronisation et le point corail ──
    const ax = px + pw + u * 0.012, ay = bty + bth / 2;
    const cx2 = wx - u * 0.012, cy2 = ty + rW * 0.5;
    const qx = (ax + cx2) / 2, qy = Math.max(ay, cy2) + u * 0.06;
    const courbe = (s) => [(1 - s) * (1 - s) * ax + 2 * (1 - s) * s * qx + s * s * cx2, (1 - s) * (1 - s) * ay + 2 * (1 - s) * s * qy + s * s * cy2];
    g.setLineDash([u * 0.012, u * 0.012]);
    g.strokeStyle = E(0.55); g.lineWidth = Math.max(3.5, lw * 0.75);
    g.beginPath(); g.moveTo(ax, ay); g.quadraticCurveTo(qx, qy, cx2, cy2); g.stroke();
    g.setLineDash([]);
    const rp = Math.max(6.5, u * 0.012);
    const kA = phase(x, P.appui), kV = lisse(phase(x, P.voyage)), kF = phase(x, P.fondu);
    if (x >= P.appui[0] && x < P.voyage[0]) {
      // le doigt touche le bouton : un point corail et une onde qui s'ouvre
      const bxp = btx + btw * 0.5, byp = bty + bth / 2;
      disque(g, bxp, byp, rp * 1.1, 0.96, true);
      g.strokeStyle = E(0.6 * (1 - kA)); g.lineWidth = Math.max(3, lw * 0.6);
      g.beginPath(); g.arc(bxp, byp, rp * (1.4 + 2.4 * kA), 0, Math.PI * 2); g.stroke();
    } else if (x >= P.voyage[0] && x < P.fondu[1]) {
      const [vx, vy] = x < P.voyage[1] ? courbe(kV) : [cx2, cy2];
      disque(g, vx, vy, rp * (1 - 0.5 * kF), 0.96 * (1 - kF * 0.9), true);
    }

    // Fondu sur les bords du dessin (téléphone ou fenêtre jamais coupés net)
    const fondu = Math.min(W * 0.06, 50);
    for (const [x0, x1] of [[0, fondu], [W, W - fondu]]) {
      const gr = g.createLinearGradient(x0, 0, x1, 0);
      gr.addColorStop(0, 'rgba(255,255,255,1)');
      gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr;
      g.fillRect(Math.min(x0, x1), 0, fondu, H);
    }
  }

  // Image fixe (mouvement réduit) : le point corail en route du téléphone vers la plateforme
  const tFixe = REGLAGES.periode * 9 + REGLAGES.periode * 0.4;
  const moteur = window.HWSTrame2026.monter(canvas, { peindre, tFixe, densite: 0.42 });
  window.HWSEcran2026 = { REGLAGES, moteur };
})();
