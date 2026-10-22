/*
 * HWS Agency — section « Projets sélectionnés » 2026.
 * 1. Carrousel : le HTML porte les projets (une seule source) ; le script ne fait que
 *    placer chaque diapositive (data-pos -2…2) autour du projet actif. Boutons, flèches
 *    du clavier, glissé au doigt ou à la souris, clic sur un voisin.
 * 2. Trame : « du croquis au produit », un tapis d'écrans esquissés au crayon qui deviennent des
 *    interfaces nettes, en lignes bleues (même moteur que le héro). Variante sans poulpes (21 oct. 2026).
 */
(() => {
  'use strict';

  const section = document.querySelector('.hp26');
  if (!section) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const rnd = (a, b) => a + Math.random() * (b - a);
  const ease = (t) => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
  const wrap = (a) => {
    a %= TAU;
    return a > Math.PI ? a - TAU : a < -Math.PI ? a + TAU : a;
  };

  /* ── 1. Carrousel ── */
  const piste = section.querySelector('.hp26-piste');
  const slides = [...section.querySelectorAll('.hp26-slide')];
  const n = slides.length;
  const courant = section.querySelector('.hp26-courant');
  const barre = section.querySelector('.hp26-progression');
  const annonce = section.querySelector('.hp26-controles [aria-live]');
  let actif = 0;

  function placer(i, annoncer) {
    actif = (i + n) % n;
    slides.forEach((el, k) => {
      let pos = k - actif;
      if (pos > n / 2) pos -= n;
      if (pos < -n / 2) pos += n;
      pos = clamp(pos, -2, 2);
      const avant = +el.dataset.pos;
      // Une diapositive qui passe d'un bord à l'autre ne doit pas traverser l'écran.
      el.classList.toggle('sans-transition', Math.abs(avant - pos) > 2);
      el.dataset.pos = pos;
      const cache = pos !== 0;
      el.setAttribute('aria-hidden', cache ? 'true' : 'false');
      el.inert = cache;
    });
    if (courant) courant.textContent = String(actif + 1).padStart(2, '0');
    if (barre) barre.style.setProperty('--progres', (actif + 1) / n);
    if (annonce && annoncer) annonce.textContent = `Projet ${actif + 1} sur ${n} : ${slides[actif].querySelector('.hp26-nom').textContent}`;
  }
  placer(0, false);
  section.querySelector('.hp26-btn--prec').addEventListener('click', () => placer(actif - 1, true));
  section.querySelector('.hp26-btn--suiv').addEventListener('click', () => placer(actif + 1, true));
  section.querySelector('.hp26-carrousel').addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); placer(actif - 1, true); }
    if (e.key === 'ArrowRight') { e.preventDefault(); placer(actif + 1, true); }
  });
  // Clic sur un voisin : il passe au centre.
  slides.forEach((el, k) => el.addEventListener('click', (e) => {
    if (el.dataset.pos !== '0' && !glisse) { e.preventDefault(); placer(k, true); }
  }));
  // Glisser (doigt ou souris) : au-delà de 45 px, on change de projet.
  let x0 = null, y0 = 0, glisse = false;
  piste.addEventListener('pointerdown', (e) => { x0 = e.clientX; y0 = e.clientY; glisse = false; });
  piste.addEventListener('pointermove', (e) => {
    if (x0 === null) return;
    if (Math.abs(e.clientX - x0) > 8 && Math.abs(e.clientX - x0) > Math.abs(e.clientY - y0)) glisse = true;
  });
  const fin = (e) => {
    if (x0 === null) return;
    const dx = e.clientX - x0;
    x0 = null;
    if (glisse && Math.abs(dx) > 45) placer(actif + (dx < 0 ? 1 : -1), true);
    setTimeout(() => (glisse = false), 0);
  };
  piste.addEventListener('pointerup', fin);
  piste.addEventListener('pointercancel', () => (x0 = null));
  piste.addEventListener('dragstart', (e) => e.preventDefault());

  /* ── 2. « Du croquis au produit » : un tapis d'écrans qui passent du trait de crayon à l'interface finie ── */
  const REGLAGES = { densite: 0.4, pas: 3.2, angle: 45, contraste: 1.3, grain: 0.2, flou: 0.7, courbure: 1.4, dispersion: 0.12, tiret: 7, vitesse: 1, corail: true };
  // Durée de la traversée d'un écran (s) ; un nouvel écran entre toutes les « traversee / nombre » secondes.
  const TAPIS = { traversee: 16 };
  const canvas = section.querySelector('.hp26-trame');
  if (!canvas) return;
  const params = new URLSearchParams(location.search);

  /* Trois mises en page d'écran (coordonnées 0 → 1 dans l'écran) : site, application, tableau de bord.
     Chaque élément : type, x, y, l, h. « bloc » = image / zone pleine, « ligne » = texte, « bouton » = action (corail). */
  const MAQUETTES = [
    [ { t: 'barre', x: 0, y: 0, l: 1, h: 0.12 }, { t: 'bloc', x: 0.07, y: 0.2, l: 0.5, h: 0.44 },
      { t: 'ligne', x: 0.64, y: 0.24, l: 0.29 }, { t: 'ligne', x: 0.64, y: 0.33, l: 0.24 }, { t: 'ligne', x: 0.64, y: 0.42, l: 0.27 },
      { t: 'bouton', x: 0.64, y: 0.53, l: 0.22, h: 0.09 },
      { t: 'ligne', x: 0.07, y: 0.74, l: 0.86 }, { t: 'ligne', x: 0.07, y: 0.83, l: 0.7 } ],
    [ { t: 'barre', x: 0, y: 0, l: 1, h: 0.12 }, { t: 'ligne', x: 0.07, y: 0.22, l: 0.46 },
      { t: 'bloc', x: 0.07, y: 0.32, l: 0.26, h: 0.3 }, { t: 'bloc', x: 0.37, y: 0.32, l: 0.26, h: 0.3 }, { t: 'bloc', x: 0.67, y: 0.32, l: 0.26, h: 0.3 },
      { t: 'ligne', x: 0.07, y: 0.72, l: 0.26 }, { t: 'ligne', x: 0.37, y: 0.72, l: 0.22 }, { t: 'ligne', x: 0.67, y: 0.72, l: 0.24 },
      { t: 'bouton', x: 0.39, y: 0.82, l: 0.22, h: 0.09 } ],
    [ { t: 'barre', x: 0, y: 0, l: 1, h: 0.12 }, { t: 'bloc', x: 0, y: 0.12, l: 0.2, h: 0.88, clair: true },
      { t: 'courbe', x: 0.28, y: 0.22, l: 0.64, h: 0.36 },
      { t: 'bloc', x: 0.28, y: 0.67, l: 0.19, h: 0.22 }, { t: 'bloc', x: 0.51, y: 0.67, l: 0.19, h: 0.22 }, { t: 'bouton', x: 0.74, y: 0.67, l: 0.18, h: 0.22 },
      { t: 'ligne', x: 0.04, y: 0.24, l: 0.12 }, { t: 'ligne', x: 0.04, y: 0.33, l: 0.1 }, { t: 'ligne', x: 0.04, y: 0.42, l: 0.12 } ],
  ];

  /* ── Le tapis : des écrans glissent de gauche à droite. À l'entrée, un crayon les esquisse trait par trait ;
        au milieu, les zones se remplissent ; à la sortie, c'est une interface nette (titre dense, image pleine,
        bouton corail). Le mouvement ne s'arrête jamais : une idée entre pendant qu'une autre sort, prête. ── */
  class Tapis {
    constructor(zone) {
      this.zone = zone;
      this.clock = 0;
      this.graine = rnd(0, 100);
    }
    update(dt, env) {
      this.clock += dt;
      this.env = env;
    }
    paint(g) {
      const z = this.zone;
      if (!z || z.w < 60) return;
      // Taille d'un écran : au moins trois écrans côte à côte (croquis, en cours, fini), sans chevauchement.
      // Mobile : une rangée plate de 3 écrans bien lisibles (pas d'escalier de petits écrans qui se chevauchent).
      const mobile = z.w <= 700;
      const cw = mobile ? Math.min(z.w / 3.5, z.h * 0.86 * 1.42) : Math.min(z.h * 0.55 * 1.42, z.w / 3.6), ch = cw / 1.42;
      const n = mobile ? 3 : Math.max(3, Math.floor((z.w + cw * 0.2) / (cw * 1.08)));
      const T = this.clock, tr = TAPIS.traversee;
      const pente = mobile ? 0 : -0.16;                    // le tapis monte un peu vers la droite (à plat sur mobile)
      const posX = (p) => z.x - cw * 0.5 + p * (z.w + cw * 0.2);
      const posY = (p) => z.y + z.h * 0.5 + (p - 0.5) * Math.min(z.w * pente, -(z.h - ch) * 0.7) * -Math.sign(pente) * -1 - ch / 2;
      g.globalCompositeOperation = 'multiply';
      // Le tapis : une ligne de fond pointillée, très légère.
      g.globalAlpha = 1;
      g.strokeStyle = ink(0.22);
      g.lineWidth = 1.4;
      g.setLineDash([2, 7]);
      g.beginPath();
      g.moveTo(posX(0) + cw * 0.5, posY(0) + ch + ch * 0.18);
      g.lineTo(posX(1) + cw * 0.5, posY(1) + ch + ch * 0.18);
      g.stroke();
      g.setLineDash([]);
      for (let c = 0; c < n; c++) {
        const brut = T / tr + c / n;
        const p = brut - Math.floor(brut);
        const id = Math.floor(brut) * n + c;
        this.ecran(g, posX(p), posY(p), cw, ch, p, MAQUETTES[((id % 3) + 3) % 3], id);
      }
      g.globalAlpha = 1;
      g.globalCompositeOperation = 'source-over';
    }
    // Un écran à l'avancement p (0 entrée → 1 sortie).
    ecran(g, X, Y, cw, ch, p, maquette, id) {
      const k = (a, b) => clamp((p - a) / (b - a), 0, 1);
      const trace = k(0.04, 0.36), remplit = ease(k(0.3, 0.58)), net = ease(k(0.56, 0.78));
      g.globalAlpha = clamp(p / 0.07, 0, 1) * clamp((1 - p) / 0.09, 0, 1);
      const trem = (1 - net) * 2.2;                        // tremblé du crayon, qui disparaît en fin de course
      const bruit = (a, b) => Math.sin(a * 12.9898 + b * 78.233 + id * 3.1) * 0.5 + Math.sin(a * 4.1 + b * 7.7 + id) * 0.5;
      // Trait de crayon : polyligne tremblée, tracée jusqu'à « part ».
      let pointe = null;
      const trait = (x1, y1, x2, y2, part, e, larg, cle) => {
        if (part <= 0) return;
        const N = 10, L = Math.hypot(x2 - x1, y2 - y1) || 1, nx = -(y2 - y1) / L, ny = (x2 - x1) / L;
        g.strokeStyle = ink(e);
        g.lineWidth = larg;
        g.lineCap = 'round';
        g.beginPath();
        let lx = x1, ly = y1;
        for (let i = 0; i <= N; i++) {
          const u = Math.min(i / N, part);
          const d = i === 0 || u >= 1 ? 0 : bruit(cle, i) * trem;
          lx = x1 + (x2 - x1) * u + nx * d;
          ly = y1 + (y2 - y1) * u + ny * d;
          if (i === 0) g.moveTo(lx, ly); else g.lineTo(lx, ly);
          if (i / N >= part) break;
        }
        g.stroke();
        if (part < 1) pointe = [lx, ly];
      };
      const rect = (x, y, l, h, part, e, larg, cle) => {
        const q = part * 4;
        trait(x, y, x + l, y, clamp(q, 0, 1), e, larg, cle);
        trait(x + l, y, x + l, y + h, clamp(q - 1, 0, 1), e, larg, cle + 1);
        trait(x + l, y + h, x, y + h, clamp(q - 2, 0, 1), e, larg, cle + 2);
        trait(x, y + h, x, y, clamp(q - 3, 0, 1), e, larg, cle + 3);
      };
      const lw = Math.max(1.6, ch * 0.016);
      // Fond de l'écran : papier pendant l'esquisse, puis très léger voile, et une ombre portée à la fin.
      if (net > 0) {
        g.fillStyle = ink(0.16 * net);
        g.fillRect(X + ch * 0.05, Y + ch * 0.06, cw, ch);
      }
      // Éléments dans l'ordre : le crayon les trace l'un après l'autre (le cadre en premier).
      const el = maquette, nb = el.length + 1;
      const part = (i) => clamp(trace * nb - i, 0, 1);
      rect(X, Y, cw, ch, part(0), 0.9 - 0.1 * remplit + 0.1 * net, lw * (1 + net * 0.4), 1);
      el.forEach((o, i) => {
        const pr = part(i + 1), x = X + o.x * cw, y = Y + o.y * ch, l = o.l * cw, h = (o.h || 0) * ch, cle = 10 + i * 7;
        if (o.t === 'ligne') {
          // un trait de texte : fin au crayon, puis barre d'encre nette
          trait(x, y, x + l, y, pr, 0.75, lw * (1 + remplit * 1.8), cle);
          return;
        }
        if (o.t === 'courbe') {
          rect(x, y, l, h, pr, 0.55, lw * 0.8, cle);
          const pts = [0.85, 0.6, 0.7, 0.35, 0.45, 0.2];
          if (pr > 0.5) {
            for (let j = 0; j < pts.length - 1; j++) trait(x + (j / (pts.length - 1)) * l, y + pts[j] * h, x + ((j + 1) / (pts.length - 1)) * l, y + pts[j + 1] * h, clamp((pr - 0.5) * 2 * 5 - j, 0, 1), 0.85, lw * (1 + net), cle + 20 + j);
          }
          if (remplit > 0) {
            g.fillStyle = ink(0.22 * remplit);
            g.beginPath();
            g.moveTo(x, y + h);
            for (let j = 0; j < pts.length; j++) g.lineTo(x + (j / (pts.length - 1)) * l, y + pts[j] * h);
            g.lineTo(x + l, y + h);
            g.closePath();
            g.fill();
          }
          return;
        }
        rect(x, y, l, h, pr, o.t === 'barre' ? 0.6 : 0.8, lw, cle);
        if (o.t === 'bloc' && !o.clair && pr >= 1 && remplit < 1) {
          // croix de l'emplacement d'image, comme sur un vrai zoning
          trait(x, y, x + l, y + h, clamp(pr * 3 - 2, 0, 1) * (1 - remplit), 0.5, lw * 0.8, cle + 30);
          trait(x + l, y, x, y + h, clamp(pr * 3 - 2, 0, 1) * (1 - remplit), 0.5, lw * 0.8, cle + 31);
        }
        if (remplit > 0) {
          const corail = o.t === 'bouton' && REGLAGES.corail;
          const fin = o.t === 'barre' ? 0.62 : o.t === 'bouton' ? 0.85 : o.clair ? 0.24 : 0.66;
          g.fillStyle = ink(fin * (0.45 * remplit + 0.55 * net), corail && net > 0.2);
          g.fillRect(x, y, l * remplit, h);
        }
      });
      // Le crayon, là où le trait avance.
      if (pointe && trace < 1) {
        const [px, py] = pointe, L = ch * 0.42, a = -0.95;
        g.save();
        g.translate(px, py);
        g.rotate(a);
        g.fillStyle = ink(0.95);
        g.beginPath();
        g.moveTo(0, 0); g.lineTo(L * 0.16, -L * 0.06); g.lineTo(L * 0.16, L * 0.06); g.closePath(); g.fill();
        g.fillStyle = ink(0.55);
        g.fillRect(L * 0.16, -L * 0.06, L * 0.84, L * 0.12);
        g.restore();
      }
    }
  }
  const ink = (e, coral = false) => `rgb(${Math.round((1 - clamp(e, 0, 1)) * 255)},${coral ? 0 : 255},255)`;

  // Zone libre pour le tapis : à droite du titre et au-dessus de « Tous nos projets » (mobile : bande au-dessus du libellé).
  function zoneLibre() {
    const s = section.getBoundingClientRect();
    const titre = section.querySelector('.hp26-titre'), tous = section.querySelector('.hp26-tous'), label = section.querySelector('.hp26-label');
    if (!titre || !tous || !label) return null;
    const rg = document.createRange();
    rg.selectNodeContents(titre);
    const t = rg.getBoundingClientRect(), to = tous.getBoundingClientRect(), lb = label.getBoundingClientRect();
    if (s.width <= 700) {
      return { x: 10, y: 10, w: s.width - 20, h: Math.max(40, lb.top - s.top - 18) };
    }
    const x = t.right - s.left + 48, y = Math.max(24, lb.top - s.top - 110);
    return { x, y, w: s.width - x - 24, h: to.top - s.top - 28 - y };
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
  if (!gl) return;
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); gl = null; });
  canvas.addEventListener('webglcontextrestored', () => { gl = initGL(); start(); });

  const TS = 0.5;
  const tone = document.createElement('canvas');
  const tg = tone.getContext('2d', { alpha: false });
  let W = 0, H = 0, dpr = 1, poulpes = [];
  const penche = { x: 0, y: 0 };
  function resize() {
    W = Math.max(1, Math.round(canvas.clientWidth));
    H = Math.max(1, Math.round(canvas.clientHeight));
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (W * H * dpr * dpr > 4e6) dpr = Math.max(1, Math.sqrt(4e6 / (W * H)));
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    tone.width = Math.max(1, Math.round(W * TS));
    tone.height = Math.max(1, Math.round(H * TS));
    if (!poulpes.length) poulpes = [new Tapis(null)];
    poulpes[0].zone = zoneLibre();
    if (reduced) once();
  }
  new ResizeObserver(resize).observe(canvas);

  let clock = 30, intro = 0, t0 = 0;
  function render(dt) {
    if (!W || !gl) return;
    const env = { w: W, h: H, unite: W, penche };
    for (const p of poulpes) p.update(dt, env);
    tg.setTransform(1, 0, 0, 1, 0, 0);
    tg.globalCompositeOperation = 'source-over';
    tg.fillStyle = '#fff';
    tg.fillRect(0, 0, tone.width, tone.height);
    tg.setTransform(TS, 0, 0, TS, 0, 0);
    for (const p of poulpes) p.paint(tg);
    const a = (REGLAGES.angle * Math.PI) / 180;
    const m = Math.min(W, 900);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, tone);
    gl.uniform2f(U.uRes, canvas.width, canvas.height);
    gl.uniform2f(U.uDir, Math.cos(a), Math.sin(a));
    gl.uniform2f(U.uMouse, -5, -5);
    gl.uniform1f(U.uPitch, REGLAGES.pas * dpr);
    gl.uniform1f(U.uContrast, REGLAGES.contraste);
    gl.uniform1f(U.uGrain, REGLAGES.grain);
    gl.uniform1f(U.uFuzz, 2 * REGLAGES.flou * dpr);
    gl.uniform1f(U.uBend, REGLAGES.courbure * clamp(m / 800, 0.5, 1));
    gl.uniform1f(U.uWarp, 0.044 * m * dpr);
    gl.uniform1f(U.uDisperse, REGLAGES.dispersion);
    gl.uniform1f(U.uFrag, REGLAGES.tiret * dpr);
    gl.uniform1f(U.uFragAmp, 0.09 * m * dpr);
    gl.uniform1f(U.uTime, clock);
    gl.uniform1f(U.uIntro, intro);
    gl.uniform1f(U.uPush, 0);
    gl.uniform1f(U.uSpeed, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  function once() {
    intro = 1;
    render(0);
  }
  let visible = false, raf = 0, last = 0;
  const lent = window.matchMedia('(pointer: coarse)').matches;
  function frame(now) {
    raf = 0;
    if (!visible || document.hidden || !gl) return;
    if (lent && last && now - last < 31) { raf = requestAnimationFrame(frame); return; }
    const dt = Math.min(0.05, (now - (last || now)) / 1000) * REGLAGES.vitesse;
    last = now;
    clock += dt;
    if (!t0) t0 = now;
    intro = ease((now - t0) / 2400);
    render(dt);
    raf = requestAnimationFrame(frame);
  }
  function start() {
    if (reduced) { once(); return; }
    if (!raf) { last = 0; raf = requestAnimationFrame(frame); }
  }
  new IntersectionObserver((entries) => {
    for (const en of entries) visible = en.isIntersecting;
    if (visible) start();
  }, { rootMargin: '120px 0px' }).observe(section);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && visible) start(); });

  window.HWSProjets2026 = { placer, get actif() { return actif; }, REGLAGES, TAPIS };
})();
