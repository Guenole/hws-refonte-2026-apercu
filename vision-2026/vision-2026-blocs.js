/*
 * HWS Agency — section « Notre vision » 2026.
 * ------------------------------------------------------------------------
 * 1. Dither : la vraie photo de l'équipe est réduite à une grille de points (1,6 px CSS),
 *    sa luminosité est normalisée et légèrement accentuée, puis tramée par diffusion
 *    d'erreur (Atkinson par défaut, Floyd–Steinberg en option) en deux encres : bleu HWS
 *    et papier. Recalculé à chaque changement de taille, au pixel près de l'écran.
 *    Si le canvas est indisponible, la photo d'origine reste affichée.
 * 2. Trame : deux constructions de blocs en volume qui se posent un à un et s'emboîtent, derrière
 *    la photo, imprimées en fines lignes diagonales par le même shader que le héro.
 *    Variante « sans poulpes » (21 oct. 2026), chargée par home-ascii/index-2026-collaboration.html.
 * 3. Apparition au défilement et chiffres qui se comptent une fois.
 */
(() => {
  'use strict';

  const REGLAGES = {
    // Dither de la photo (désactivé le 20 oct. 2026 : la photo reste d'origine ; true pour le remettre)
    dither: false,
    point: 1.6,          // taille d'un point, en px CSS, sur une photo de 640 px (plus grand = trame plus visible)
    algo: 'atkinson',    // 'atkinson' (contrasté, éditorial) ou 'floyd' (plus doux)
    clarte: 1.7,         // éclaircit les ombres (gamma) : la photo est sombre
    nettete: 0.9,        // accentue les contours avant de tramer (0 = aucune)
    plancher: 0.07,      // même les noirs gardent quelques points de papier : jamais d'aplat bleu
    // Trame des blocs (réglages du héro, bords plus nets : l'ouvrage doit paraître solide)
    densite: 0.4, pas: 3.2, angle: 45, contraste: 1.3, grain: 0.18, flou: 0.6, courbure: 1.2,
    dispersion: 0.06, tiret: 7, vitesse: 1, corail: true,
  };
  // Constructions de blocs dans le cadre de la trame (fractions) ; bloc : arête d'un cube en fraction de la largeur
  // de la photo. Le cadre de la trame déborde de la photo : la photo y occupe x 0,15 → 0,85 et y 0,21 → 0,81.
  // Une construction est posée sur le coin haut droit de la photo, l'autre au pied de son coin bas gauche.
  // Chaque bloc : i, j (au sol), k (étage), li, lj (longueur), en cubes ; corail : le bloc corail.
  const MUR_HAUT = [
    { i: 0, j: 0, k: 0, li: 2, lj: 1 }, { i: 2, j: 0, k: 0, li: 2, lj: 1 }, { i: 4, j: 0, k: 0, li: 2, lj: 1 },
    { i: 0, j: 1, k: 0, li: 2, lj: 1 }, { i: 2, j: 1, k: 0, li: 2, lj: 1 }, { i: 4, j: 1, k: 0, li: 2, lj: 1 },
    { i: 1, j: 0, k: 1, li: 2, lj: 1 }, { i: 3, j: 0, k: 1, li: 2, lj: 1 }, { i: 1, j: 1, k: 1, li: 2, lj: 1 },
    { i: 3, j: 1, k: 1, li: 2, lj: 1 },
    { i: 2, j: 0, k: 2, li: 2, lj: 1 }, { i: 2, j: 1, k: 2, li: 1, lj: 1 },
    { i: 3, j: 1, k: 2, li: 1, lj: 1, corail: true },
  ];
  const MUR_BAS = [
    { i: 0, j: 0, k: 0, li: 2, lj: 1 }, { i: 2, j: 0, k: 0, li: 2, lj: 1 }, { i: 0, j: 1, k: 0, li: 2, lj: 1 },
    { i: 2, j: 1, k: 0, li: 2, lj: 1 }, { i: 1, j: 0, k: 1, li: 2, lj: 1 }, { i: 1, j: 1, k: 1, li: 1, lj: 1 },
    { i: 2, j: 1, k: 1, li: 1, lj: 1 },
  ];
  // ox, oy : coin arrière du sol de la construction (fractions du cadre de la trame).
  const CONSTRUCTIONS = {
    large: [
      { x: 0.66, y: 0.12, bloc: 0.05, blocs: MUR_HAUT, encre: 1, delai: 0, zone: { i: [0, 6], j: [0, 2] } },
      { x: 0.08, y: 0.74, bloc: 0.045, blocs: MUR_BAS, encre: 0.9, delai: 1.2, zone: { i: [0, 4], j: [0, 2] } },
    ],
    etroit: [
      { x: 0.62, y: 0.1, bloc: 0.055, blocs: MUR_HAUT, encre: 1, delai: 0, zone: { i: [0, 6], j: [0, 2] } },
      { x: 0.06, y: 0.76, bloc: 0.05, blocs: MUR_BAS, encre: 0.9, delai: 1.2, zone: { i: [0, 4], j: [0, 2] } },
    ],
  };

  const section = document.querySelector('.hv26');
  if (!section) return;
  section.classList.add('hv26--js');
  const params = new URLSearchParams(location.search);
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches || params.has('fixe');
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const rnd = (a, b) => a + Math.random() * (b - a);
  const ease = (t) => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
  const wrap = (a) => {
    a %= TAU;
    return a > Math.PI ? a - TAU : a < -Math.PI ? a + TAU : a;
  };

  /* ── Apparition et chiffres ── */
  const apparitions = [
    ...section.querySelectorAll('.hv26-texte > *'),
    section.querySelector('.hv26-media'),
    ...section.querySelectorAll('.hv26-args li'),
    section.querySelector('.hv26-chiffres .hv26-label'),
    ...section.querySelectorAll('.hv26-chiffres dl > div'),
  ].filter(Boolean);
  const groupes = new Map();
  for (const el of apparitions) {
    el.setAttribute('data-hv26-apparition', '');
    const parent = el.parentElement;
    const i = groupes.get(parent) || 0;
    groupes.set(parent, i + 1);
    el.style.setProperty('--d', i);
  }
  const compter = (dd) => {
    const fin = +dd.dataset.hv26Compte, avant = dd.dataset.avant || '', apres = dd.dataset.apres || '';
    if (reduced) return;
    const t0 = performance.now(), duree = 1400;
    const pas = (now) => {
      const t = ease((now - t0) / duree);
      dd.textContent = avant + Math.round(fin * t) + apres;
      if (t < 1) requestAnimationFrame(pas);
    };
    requestAnimationFrame(pas);
  };
  const io = new IntersectionObserver((entries) => {
    for (const en of entries) {
      if (!en.isIntersecting) continue;
      en.target.classList.add('is-in');
      const dd = en.target.querySelector && en.target.querySelector('dd[data-hv26-compte]');
      if (dd) compter(dd);
      io.unobserve(en.target);
    }
  }, { threshold: 0.2, rootMargin: '0px 0px -40px 0px' });
  for (const el of apparitions) io.observe(el);

  /* ── 1. Dither de la photographie ── */
  const cadre = section.querySelector('.hv26-photo');
  const img = cadre && cadre.querySelector('img');
  const dcan = cadre && cadre.querySelector('.hv26-dither');
  const BLEU = [57, 116, 247], PAPIER = [247, 247, 244];

  function dither() {
    if (!img || !dcan || !img.naturalWidth) return;
    const cw = cadre.clientWidth, ch = cadre.clientHeight;
    if (!cw || !ch) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const W = Math.round(cw * dpr), H = Math.round(ch * dpr);
    // Sur une petite photo, des points plus fins : sinon les visages se perdent.
    const point = REGLAGES.point * clamp(cw / 640, 0.7, 1);
    const cell = Math.max(2, Math.round(point * dpr)); // un point = un nombre entier de pixels d'écran
    const gw = Math.ceil(W / cell), gh = Math.ceil(H / cell);
    // Recadrage identique à object-fit: cover, centré.
    const nw = img.naturalWidth, nh = img.naturalHeight, br = gw / gh;
    let sw = nw, sh = nh;
    if (nw / nh > br) sw = nh * br;
    else sh = nw / br;
    const sx = (nw - sw) / 2, sy = (nh - sh) / 2;
    let src;
    try {
      const pc = document.createElement('canvas');
      pc.width = gw;
      pc.height = gh;
      const pg = pc.getContext('2d', { willReadFrequently: true });
      pg.imageSmoothingEnabled = true;
      pg.imageSmoothingQuality = 'high';
      pg.drawImage(img, sx, sy, sw, sh, 0, 0, gw, gh);
      src = pg.getImageData(0, 0, gw, gh).data;
    } catch (e) {
      return; // image d'une autre origine sans autorisation, ou canvas indisponible : on garde la photo
    }
    const n = gw * gh, L = new Float32Array(n);
    const hist = new Uint32Array(256);
    for (let i = 0; i < n; i++) {
      const v = 0.2126 * src[i * 4] + 0.7152 * src[i * 4 + 1] + 0.0722 * src[i * 4 + 2];
      L[i] = v / 255;
      hist[Math.min(255, v | 0)]++;
    }
    // Niveaux : 1 % le plus sombre = noir, 1 % le plus clair = blanc.
    const centile = (p) => {
      let acc = 0;
      for (let k = 0; k < 256; k++) {
        acc += hist[k];
        if (acc >= p * n) return k / 255;
      }
      return 1;
    };
    const lo = centile(0.01), hi = Math.max(lo + 0.05, centile(0.99));
    const g = 1 / REGLAGES.clarte;
    const f = REGLAGES.plancher;
    for (let i = 0; i < n; i++) L[i] = f + (1 - f) * Math.pow(clamp((L[i] - lo) / (hi - lo), 0, 1), g);
    // Netteté : on renforce l'écart avec un flou 3×3 pour garder les traits des visages.
    if (REGLAGES.nettete > 0) {
      const B = new Float32Array(n);
      for (let y = 0; y < gh; y++) {
        for (let x = 0; x < gw; x++) {
          let s = 0, c = 0;
          for (let dy = -1; dy <= 1; dy++) {
            const yy = y + dy;
            if (yy < 0 || yy >= gh) continue;
            for (let dx = -1; dx <= 1; dx++) {
              const xx = x + dx;
              if (xx < 0 || xx >= gw) continue;
              s += L[yy * gw + xx];
              c++;
            }
          }
          B[y * gw + x] = s / c;
        }
      }
      for (let i = 0; i < n; i++) L[i] = clamp(L[i] + REGLAGES.nettete * (L[i] - B[i]), 0, 1);
    }
    // Diffusion d'erreur : chaque point est bleu ou papier, l'erreur passe aux voisins.
    const ink = new Uint8Array(n);
    const atk = REGLAGES.algo !== 'floyd';
    const add = (x, y, e) => {
      if (x >= 0 && x < gw && y < gh) L[y * gw + x] += e;
    };
    for (let y = 0; y < gh; y++) {
      for (let x = 0; x < gw; x++) {
        const i = y * gw + x, old = L[i], v = old < 0.5 ? 0 : 1;
        ink[i] = v ? 0 : 1;
        const err = old - v;
        if (atk) {
          const e = err / 8;
          add(x + 1, y, e); add(x + 2, y, e); add(x - 1, y + 1, e); add(x, y + 1, e); add(x + 1, y + 1, e); add(x, y + 2, e);
        } else {
          add(x + 1, y, (err * 7) / 16); add(x - 1, y + 1, (err * 3) / 16); add(x, y + 1, (err * 5) / 16); add(x + 1, y + 1, err / 16);
        }
      }
    }
    const out = new ImageData(gw, gh), od = out.data;
    for (let i = 0; i < n; i++) {
      const c = ink[i] ? BLEU : PAPIER;
      od[i * 4] = c[0];
      od[i * 4 + 1] = c[1];
      od[i * 4 + 2] = c[2];
      od[i * 4 + 3] = 255;
    }
    const small = document.createElement('canvas');
    small.width = gw;
    small.height = gh;
    small.getContext('2d').putImageData(out, 0, 0);
    dcan.width = W;
    dcan.height = H;
    const dg = dcan.getContext('2d');
    dg.imageSmoothingEnabled = false;
    dg.drawImage(small, 0, 0, gw * cell, gh * cell); // agrandi sans lissage : des points nets
    cadre.classList.add('is-dither');
  }
  let attente = 0;
  const redither = () => {
    clearTimeout(attente);
    attente = setTimeout(dither, 120);
  };
  if (img && dcan && REGLAGES.dither) {
    // Les images du CDN Webflow autorisent la lecture (Access-Control-Allow-Origin: *).
    if (!img.crossOrigin && /^https?:/.test(img.src) && new URL(img.src).origin !== location.origin) img.crossOrigin = 'anonymous';
    img.loading = 'eager';
    if (img.complete && img.naturalWidth) dither();
    else img.addEventListener('load', dither, { once: true });
    new ResizeObserver(redither).observe(cadre);
  }

  /* ── 1 bis. Inclinaison 3D de la photo au survol (souris seulement) ──
     La photo s'incline vers le curseur (5° au plus), avec une ombre qui suit. Le mouvement
     est lissé à chaque image ; quand la souris sort, la photo revient à plat en douceur.
     Rien ne bouge au doigt, ni si le mouvement réduit est demandé. */
  const TILT = { max: 5, lissage: 0.12, retour: 0.08 };
  const survolFin = window.matchMedia('(hover: hover) and (pointer: fine)');
  if (cadre && !reduced) {
    let cx = 0, cy = 0, tx = 0, ty = 0, actif = 0, cible = 0, rafT = 0;
    // Reflet « verre » : une lueur douce qui suit le curseur à la surface de la photo.
    const reflet = document.createElement('span');
    reflet.className = 'hv26-reflet';
    reflet.setAttribute('aria-hidden', 'true');
    cadre.appendChild(reflet);
    const appliquer = () => {
      rafT = 0;
      const k = cible ? TILT.lissage : TILT.retour;
      cx += (tx - cx) * k;
      cy += (ty - cy) * k;
      actif += (cible - actif) * k;
      // Vers les bords, l'inclinaison s'accentue un peu (courbe douce), sans dépasser TILT.max.
      const fx = Math.sign(cx) * Math.pow(Math.abs(cx), 0.85), fy = Math.sign(cy) * Math.pow(Math.abs(cy), 0.85);
      const ry = fx * TILT.max, rx = -fy * TILT.max;
      cadre.style.transform = `perspective(1100px) rotateX(${rx.toFixed(3)}deg) rotateY(${ry.toFixed(3)}deg) scale(${(1 + 0.012 * actif).toFixed(4)})`;
      // L'ombre se décale à l'opposé de l'inclinaison : la photo semble avoir une épaisseur.
      // Le reflet se place sous le curseur et glisse un peu au-delà, comme sur une plaque de verre.
      cadre.style.setProperty('--gx', `${(50 + cx * 45).toFixed(1)}%`);
      cadre.style.setProperty('--gy', `${(50 + cy * 45).toFixed(1)}%`);
      cadre.style.setProperty('--go', actif.toFixed(3));
      cadre.style.boxShadow = `${(-fx * 14).toFixed(1)}px ${(10 - fy * 10 + 14 * actif).toFixed(1)}px ${(24 + 24 * actif).toFixed(1)}px -18px rgba(23, 27, 73, ${(0.1 + 0.22 * actif).toFixed(3)})`;
      const fini = !cible && Math.abs(cx) < 0.002 && Math.abs(cy) < 0.002 && actif < 0.002;
      if (fini) {
        cadre.style.transform = '';
        cadre.style.boxShadow = '';
        cadre.style.setProperty('--go', '0');
        return;
      }
      rafT = requestAnimationFrame(appliquer);
    };
    const lancer = () => { if (!rafT) rafT = requestAnimationFrame(appliquer); };
    // On écoute le conteneur, qui ne bouge pas : la photo inclinée ne « fuit » pas sous le curseur près des bords.
    const zone = cadre.parentElement;
    zone.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse' || !survolFin.matches) return;
      const r = zone.getBoundingClientRect();
      tx = clamp(((e.clientX - r.left) / r.width) * 2 - 1, -1, 1);
      ty = clamp(((e.clientY - r.top) / r.height) * 2 - 1, -1, 1);
      cible = 1;
      lancer();
    });
    zone.addEventListener('pointerleave', () => {
      tx = ty = 0;
      cible = 0;
      lancer();
    });
  }

  /* ── 2. Les blocs tramés derrière la photo ── */
  const canvas = section.querySelector('.hv26-trame');
  const media = section.querySelector('.hv26-media');
  if (!canvas || !media) return;

  /* ── Une construction : des blocs en volume (vue isométrique) qui se posent un à un et s'emboîtent ──
     1. Montage : chaque bloc descend et se pose avec un léger tassement.
     2. Chantier permanent : il y a toujours un bloc en mouvement. Un bloc libre du sommet se soulève,
        se déplace et vient s'emboîter sur une autre place libre et portée, puis le suivant prend le relais.
        L'ouvrage reste toujours stable : un bloc ne se pose que sur des blocs pleins.
     Faces : dessus clair, côté gauche moyen, côté droit sombre : la trame de lignes donne le volume. */
  class Construction {
    constructor(p) {
      Object.assign(this, p);
      this.blocs = p.blocs.map((b) => ({ ...b }));
      this.ordre = [...this.blocs].sort((a, b) => a.k - b.k || (a.i + a.j) - (b.i + b.j));
      this.ordre.forEach((b, r) => (b.pose = this.delai + 0.25 + r * 0.3));
      this.fin = this.delai + 0.25 + this.ordre.length * 0.3 + 0.8;
      this.clock = 0;
      this.vol = null;              // le bloc en mouvement : { b, de, vers, t0, dur }
      this.prochain = this.fin;
    }
    occupe(i, j, k, sauf) {
      for (const b of this.blocs) {
        if (b === sauf) continue;
        if (k >= b.k && k < b.k + 1 && i >= b.i && i < b.i + b.li && j >= b.j && j < b.j + b.lj) return true;
      }
      return false;
    }
    libre(b) { // rien au-dessus du bloc
      for (let i = b.i; i < b.i + b.li; i++) for (let j = b.j; j < b.j + b.lj; j++) if (this.occupe(i, j, b.k + 1, b)) return false;
      return true;
    }
    places(b) { // places portées et libres pour ce bloc, ailleurs qu'ici
      const out = [], z = this.zone;
      for (let k = 1; k <= 4; k++) for (let i = z.i[0]; i + b.li <= z.i[1]; i++) for (let j = z.j[0]; j + b.lj <= z.j[1]; j++) {
        if (i === b.i && j === b.j && k === b.k) continue;
        let ok = true;
        for (let a = i; a < i + b.li && ok; a++) for (let c = j; c < j + b.lj && ok; c++) {
          if (this.occupe(a, c, k, b) || !this.occupe(a, c, k - 1, b)) ok = false;
        }
        // un bloc ne doit pas se porter lui-même
        if (ok && k - 1 >= b.k && k - 1 < b.k + 1 && i < b.i + b.li && i + b.li > b.i && j < b.j + b.lj && j + b.lj > b.j) ok = false;
        if (ok) out.push({ i, j, k });
      }
      return out;
    }
    update(dt, env) {
      this.clock += dt;
      this.ox = env.w * this.x;
      this.oy = env.h * this.y;
      this.s = env.unite * this.bloc;
      const T = this.clock;
      if (this.vol && T >= this.vol.t0 + this.vol.dur) {
        Object.assign(this.vol.b, this.vol.vers);
        this.vol = null;
      }
      if (!this.vol && T >= this.prochain) {
        const candidats = this.blocs.filter((b) => b.k > 0 && this.libre(b));
        for (let essai = 0; essai < 6 && !this.vol; essai++) {
          const b = candidats[Math.floor(Math.random() * candidats.length)];
          if (!b) break;
          const pl = this.places(b).filter((q) => Math.abs(q.i - b.i) + Math.abs(q.j - b.j) <= 4);
          if (!pl.length) continue;
          const vers = pl[Math.floor(Math.random() * pl.length)];
          this.vol = { b, de: { i: b.i, j: b.j, k: b.k }, vers, t0: T, dur: rnd(2.2, 2.8) };
        }
        this.prochain = T + (this.vol ? this.vol.dur : 0) + rnd(0.15, 0.5);
      }
    }
    // Position courante d'un bloc (pendant un vol : il se soulève, glisse, se pose avec un tassement).
    position(b) {
      const T = this.clock;
      if (T < b.pose) return null;
      let { i, j, k } = b;
      const t = T - b.pose;
      if (t < 0.55) k += Math.pow(1 - t / 0.55, 2) * 2.2;
      else if (t < 0.85) k -= Math.sin(((t - 0.55) / 0.3) * Math.PI) * 0.05;
      const v = this.vol;
      if (v && v.b === b) {
        const u = clamp((T - v.t0) / v.dur, 0, 1);
        const monte = clamp(u / 0.3, 0, 1), glisse = clamp((u - 0.25) / 0.5, 0, 1), pose = clamp((u - 0.7) / 0.3, 0, 1);
        const haut = Math.max(v.de.k, v.vers.k) + 1.4;
        const e = (x) => x * x * (3 - 2 * x);
        i = v.de.i + (v.vers.i - v.de.i) * e(glisse);
        j = v.de.j + (v.vers.j - v.de.j) * e(glisse);
        k = pose > 0 ? haut + (v.vers.k - haut) * e(pose) - Math.sin(clamp((u - 0.94) / 0.06, 0, 1) * Math.PI) * 0.04
                     : v.de.k + (haut - v.de.k) * e(monte);
      }
      return { i, j, k };
    }
    paint(g) {
      const s = this.s, E = this.encre, cx = Math.cos(Math.PI / 6) * s, cy = 0.5 * s;
      const ink = (e, coral = false) => `rgb(${Math.round((1 - clamp(e, 0, 1) * E) * 255)},${coral ? 0 : 255},255)`;
      const P = (i, j, k) => [this.ox + (i - j) * cx, this.oy + (i + j) * cy - k * s];
      const poly = (pts) => {
        g.beginPath();
        g.moveTo(pts[0][0], pts[0][1]);
        for (let q = 1; q < pts.length; q++) g.lineTo(pts[q][0], pts[q][1]);
        g.closePath();
        g.fill();
      };
      g.globalCompositeOperation = 'source-over';
      const vus = [];
      for (const b of this.blocs) {
        const p = this.position(b);
        if (p) vus.push({ b, ...p });
      }
      // Du fond vers l'avant (le bloc en vol passe devant ceux qu'il survole).
      vus.sort((a, c) => (a.i + a.b.li / 2 + a.j + a.b.lj / 2 + a.k * 0.9) - (c.i + c.b.li / 2 + c.j + c.b.lj / 2 + c.k * 0.9));
      for (const { b, i, j, k } of vus) {
        const i0 = i, j0 = j, i1 = i + b.li, j1 = j + b.lj, h = 1;
        const c = b.corail && REGLAGES.corail;
        g.fillStyle = ink(c ? 0.8 : 0.62, c);
        poly([P(i0, j1, k), P(i1, j1, k), P(i1, j1, k + h), P(i0, j1, k + h)]);
        g.fillStyle = ink(c ? 0.9 : 0.86, c);
        poly([P(i1, j0, k), P(i1, j1, k), P(i1, j1, k + h), P(i1, j0, k + h)]);
        g.fillStyle = ink(c ? 0.6 : 0.2, c);
        poly([P(i0, j0, k + h), P(i1, j0, k + h), P(i1, j1, k + h), P(i0, j1, k + h)]);
        // Joints : un filet de papier sur les arêtes, pour lire chaque bloc.
        g.strokeStyle = '#fff';
        g.lineWidth = Math.max(1, s * 0.05);
        g.beginPath();
        const arete = (a1, a2) => { g.moveTo(...a1); g.lineTo(...a2); };
        arete(P(i0, j1, k + h), P(i1, j1, k + h));
        arete(P(i1, j0, k + h), P(i1, j1, k + h));
        arete(P(i1, j1, k), P(i1, j1, k + h));
        g.stroke();
      }
    }
  }

  /* ── Trame (WebGL, même shader que le héro) ── */
  const VERT = 'attribute vec2 p;varying vec2 v;void main(){v=p*0.5+0.5;gl_Position=vec4(p,0.0,1.0);}';
  // Trame de points (21 oct. 2026) : grille régulière inclinée à 45°, un point par cellule.
  // La taille du point vient de l'encre lue AU CENTRE de la cellule : les points restent fixes et nets,
  // ils grossissent ou maigrissent seulement quand une forme passe dessous (pas de scintillement).
  // Points jamais jointifs (l'ivoire respire toujours) ; ombres en bleu nuit, lumière en bleu électrique.
  const FRAG = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
varying vec2 v;
uniform sampler2D uTone;
uniform vec2 uRes, uDir;
uniform float uPitch, uIntro, uDensite;
uniform vec3 uBlue, uNuit, uCoral;
void main() {
  vec2 f = gl_FragCoord.xy;
  mat2 rot = mat2(uDir.x, -uDir.y, uDir.y, uDir.x);
  vec2 q = rot * f / uPitch;
  vec2 cel = floor(q) + 0.5;
  vec2 centre = (cel * uPitch) * rot;                     // retour dans le repère écran
  vec2 uv = vec2(centre.x / uRes.x, 1.0 - centre.y / uRes.y);
  vec4 s = texture2D(uTone, clamp(uv, 0.0, 1.0));
  float e = clamp(1.0 - s.r, 0.0, 1.0);
  // Contours : là où l'encre change brusquement (bord d'une forme), le point est renforcé.
  vec2 o = vec2(uPitch / uRes.x, uPitch / uRes.y);
  float bord = max(max(abs(e - (1.0 - texture2D(uTone, uv + vec2(o.x, 0.0)).r)), abs(e - (1.0 - texture2D(uTone, uv - vec2(o.x, 0.0)).r))),
                   max(abs(e - (1.0 - texture2D(uTone, uv + vec2(0.0, o.y)).r)), abs(e - (1.0 - texture2D(uTone, uv - vec2(0.0, o.y)).r))));
  e = max(e, smoothstep(0.18, 0.5, bord) * 0.62 * step(0.04, e));
  e *= smoothstep(0.0, 0.7, uIntro);
  float couv = e < 0.05 ? 0.0 : uDensite * pow(e, 1.15);  // part de la cellule couverte par le point
  float r = uPitch * sqrt(couv / 3.14159);
  float d = length(q - cel) * uPitch;
  float a = couv > 0.0 ? 1.0 - smoothstep(r - 0.6, r + 0.6, d) : 0.0;
  float coral = clamp(1.0 - s.g, 0.0, 1.0);
  vec3 c = mix(mix(uBlue, uNuit, smoothstep(0.72, 0.95, e)), uCoral, coral);
  gl_FragColor = vec4(c * a, a);
}`;
  const UNIFORMES = ['uTone', 'uRes', 'uDir', 'uMouse', 'uPitch', 'uContrast', 'uGrain', 'uFuzz', 'uBend', 'uDisperse', 'uFrag', 'uFragAmp', 'uWarp', 'uTime', 'uIntro', 'uPush', 'uSpeed', 'uBlue', 'uCoral', 'uPaper', 'uNuit', 'uDensite'];
  let gl = null, U = {}, tex = null, ctx2d = null;

  function initGL() {
    if (params.has('cpu')) return null;
    let c = null;
    try {
      c = canvas.getContext('webgl', { antialias: false, alpha: true, premultipliedAlpha: true, depth: false, stencil: false, preserveDrawingBuffer: false });
    } catch (e) {
      c = null;
    }
    if (!c) return null;
    const sh = (type, src) => {
      const o = c.createShader(type);
      c.shaderSource(o, src);
      c.compileShader(o);
      return o;
    };
    const prog = c.createProgram();
    c.attachShader(prog, sh(c.VERTEX_SHADER, VERT));
    c.attachShader(prog, sh(c.FRAGMENT_SHADER, FRAG));
    c.linkProgram(prog);
    if (!c.getProgramParameter(prog, c.LINK_STATUS)) return null;
    c.useProgram(prog);
    const b = c.createBuffer();
    c.bindBuffer(c.ARRAY_BUFFER, b);
    c.bufferData(c.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), c.STATIC_DRAW);
    const loc = c.getAttribLocation(prog, 'p');
    c.enableVertexAttribArray(loc);
    c.vertexAttribPointer(loc, 2, c.FLOAT, false, 0, 0);
    U = {};
    for (const name of UNIFORMES) U[name] = c.getUniformLocation(prog, name);
    tex = c.createTexture();
    c.bindTexture(c.TEXTURE_2D, tex);
    c.texParameteri(c.TEXTURE_2D, c.TEXTURE_MIN_FILTER, c.LINEAR);
    c.texParameteri(c.TEXTURE_2D, c.TEXTURE_MAG_FILTER, c.LINEAR);
    c.texParameteri(c.TEXTURE_2D, c.TEXTURE_WRAP_S, c.CLAMP_TO_EDGE);
    c.texParameteri(c.TEXTURE_2D, c.TEXTURE_WRAP_T, c.CLAMP_TO_EDGE);
    c.uniform1i(U.uTone, 0);
    c.uniform3f(U.uBlue, 57 / 255, 116 / 255, 247 / 255);
    c.uniform3f(U.uCoral, 1, 90 / 255, 54 / 255);
    c.uniform3f(U.uPaper, 247 / 255, 247 / 255, 244 / 255);
    c.uniform3f(U.uNuit, 23 / 255, 27 / 255, 73 / 255);
    c.uniform1f(U.uDensite, REGLAGES.densite);
    return c;
  }

  gl = initGL();
  if (!gl) return; // sans WebGL, pas de blocs : la section reste complète et lisible
  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    gl = null;
  });
  canvas.addEventListener('webglcontextrestored', () => {
    gl = initGL();
    start();
  });

  const TS = 0.5;
  const tone = document.createElement('canvas');
  const tg = tone.getContext('2d', { alpha: false });
  let W = 0, H = 0, dpr = 1, nom = '', poulpes = [];
  const penche = { x: 0, y: 0 };
  function resize() {
    W = Math.max(1, Math.round(canvas.clientWidth));
    H = Math.max(1, Math.round(canvas.clientHeight));
    dpr = Math.min(window.devicePixelRatio || 1, 3);
    if (W * H * dpr * dpr > 4e6) dpr = Math.max(1, Math.sqrt(4e6 / (W * H)));
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    tone.width = Math.max(1, Math.round(W * TS));
    tone.height = Math.max(1, Math.round(H * TS));
    const n2 = window.innerWidth <= 640 ? 'etroit' : 'large';
    if (n2 !== nom) {
      nom = n2;
      poulpes = CONSTRUCTIONS[nom].map((p) => new Construction(p));
    }
    if (reduced) once();
  }
  new ResizeObserver(resize).observe(canvas);

  let clock = 30, intro = 0, t0 = 0;
  function render(dt) {
    if (!W || !gl) return;
    const env = { w: W, h: H, unite: cadre.clientWidth, penche };
    for (const p of poulpes) p.update(dt, env);
    tg.setTransform(1, 0, 0, 1, 0, 0);
    tg.globalCompositeOperation = 'source-over';
    tg.fillStyle = '#fff';
    tg.fillRect(0, 0, tone.width, tone.height);
    tg.setTransform(TS, 0, 0, TS, 0, 0);
    for (const p of poulpes) p.paint(tg);
    const a = (REGLAGES.angle * Math.PI) / 180;
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, tone);
    const echelle = clamp(Math.min(W, H) / 800, 0.5, 1);
    gl.uniform2f(U.uRes, canvas.width, canvas.height);
    gl.uniform2f(U.uDir, Math.cos(a), Math.sin(a));
    gl.uniform2f(U.uMouse, -5, -5);
    gl.uniform1f(U.uPitch, REGLAGES.pas * dpr);
    gl.uniform1f(U.uContrast, REGLAGES.contraste);
    gl.uniform1f(U.uGrain, REGLAGES.grain);
    gl.uniform1f(U.uFuzz, 2 * REGLAGES.flou * dpr);
    gl.uniform1f(U.uBend, REGLAGES.courbure * echelle);
    gl.uniform1f(U.uWarp, 0.044 * Math.min(W, H) * dpr);
    gl.uniform1f(U.uDisperse, REGLAGES.dispersion);
    gl.uniform1f(U.uFrag, REGLAGES.tiret * dpr);
    gl.uniform1f(U.uFragAmp, 0.09 * Math.min(W, H) * dpr);
    gl.uniform1f(U.uTime, clock);
    gl.uniform1f(U.uIntro, intro);
    gl.uniform1f(U.uPush, 0);
    gl.uniform1f(U.uSpeed, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  function once() {
    intro = 1;
    for (const p of poulpes) p.clock = 60; // image fixe : l'ouvrage est déjà construit
    const d = REGLAGES.dispersion;
    REGLAGES.dispersion = d * 0.3;
    render(0);
    REGLAGES.dispersion = d;
  }
  let visible = false, raf = 0, last = 0;
  const lent = window.matchMedia('(pointer: coarse)').matches;
  function frame(now) {
    raf = 0;
    if (!visible || document.hidden || !gl) return;
    if (lent && last && now - last < 31) {
      raf = requestAnimationFrame(frame);
      return;
    }
    const dt = Math.min(0.05, (now - (last || now)) / 1000) * REGLAGES.vitesse;
    last = now;
    clock += dt;
    if (!t0) t0 = now;
    intro = ease((now - t0) / 2400); // la trame se rassemble la première fois qu'on la voit
    render(dt);
    raf = requestAnimationFrame(frame);
  }
  function start() {
    if (reduced) {
      once();
      return;
    }
    if (!raf) {
      last = 0;
      raf = requestAnimationFrame(frame);
    }
  }
  new IntersectionObserver((entries) => {
    for (const en of entries) visible = en.isIntersecting;
    if (visible) start();
  }, { rootMargin: '120px 0px' }).observe(canvas);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && visible) start();
  });

  window.HWSVision2026 = { REGLAGES, CONSTRUCTIONS, dither, get poulpes() { return poulpes; } };
})();
