/*
 * HWS Agency — section « Témoignages » 2026.
 * 1. Les dix avis réels défilent par paires (un seul à la fois sur mobile) : flèches,
 *    flèches du clavier, glissé au doigt. Sans script, ils restent tous lisibles en liste.
 * 2. Un poulpe HWS tramé dans le coin bas droit (même moteur que les autres sections).
 */
(() => {
  'use strict';
  const section = document.querySelector('.hav');
  if (!section) return;
  section.classList.add('hav--js');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const rnd = (a, b) => a + Math.random() * (b - a);
  const ease = (t) => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
  const wrap = (a) => {
    a %= TAU;
    return a > Math.PI ? a - TAU : a < -Math.PI ? a + TAU : a;
  };

  /* ── 1. Pagination ── */
  const avis = [...section.querySelectorAll('.hav-avis')];
  const courant = section.querySelector('.hav-courant');
  const total = section.querySelector('.hav-total');
  const barre = section.querySelector('.hav-progression');
  const annonce = section.querySelector('.hav-controles [aria-live]');
  const etroit = window.matchMedia('(max-width: 900px)');
  let page = 0;
  const parPage = () => (etroit.matches ? 1 : 2);
  const pages = () => Math.ceil(avis.length / parPage());

  function montrer(p, annoncer) {
    const n = pages();
    page = (p + n) % n;
    const k = parPage();
    avis.forEach((el, i) => {
      const vu = Math.floor(i / k) === page;
      el.hidden = !vu;
      el.classList.remove('is-in');
      if (vu) requestAnimationFrame(() => el.classList.add('is-in'));
    });
    if (courant) courant.textContent = String(page + 1).padStart(2, '0');
    if (total) total.textContent = String(n).padStart(2, '0');
    if (barre) barre.style.setProperty('--progres', (page + 1) / n);
    if (annonce && annoncer) annonce.textContent = avis.filter((el) => !el.hidden).map((el) => el.querySelector('.hav-nom').textContent).join(' et ');
  }
  montrer(0, false);
  etroit.addEventListener('change', () => montrer(0, false));
  section.querySelector('.hav-btn--prec').addEventListener('click', () => montrer(page - 1, true));
  section.querySelector('.hav-btn--suiv').addEventListener('click', () => montrer(page + 1, true));
  const carrousel = section.querySelector('.hav-carrousel');
  carrousel.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); montrer(page - 1, true); }
    if (e.key === 'ArrowRight') { e.preventDefault(); montrer(page + 1, true); }
  });
  let x0 = null;
  carrousel.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse') x0 = e.clientX; });
  carrousel.addEventListener('pointerup', (e) => {
    if (x0 === null) return;
    const dx = e.clientX - x0;
    x0 = null;
    if (Math.abs(dx) > 45) montrer(page + (dx < 0 ? 1 : -1), true);
  });

  /* ── 2. Les poulpes tramés sur les bords ── */
  const REGLAGES = { densite: 0.4, pas: 3.2, angle: 45, contraste: 1.25, grain: 0.25, flou: 1.6, courbure: 3.2, dispersion: 0.45, tiret: 7, vitesse: 1, corail: true };
  // Place dans la section (fractions) ; taille en fraction de la largeur de la section.
  // Bulles de conversation : une nouvelle bulle toutes les « rythme » secondes, côté client puis côté HWS.
  const BULLES = { rythme: 2.2, visibles: 3 };

  const canvas = section.querySelector('.hav-trame');
  if (!canvas) return;
  const params = new URLSearchParams(location.search);

  /* ── Une conversation : des bulles arrivent tour à tour (client à gauche, HWS à droite),
        la plus récente en bas ; les autres remontent et les plus anciennes s'effacent.
        Avant chaque réponse de HWS, trois points « en train d'écrire » ; de temps en temps,
        une bulle ne contient qu'un petit cœur corail. Le mouvement ne s'arrête jamais. ── */
  class Conversation {
    constructor(zone) {
      this.zone = zone;
      this.clock = 0;
    }
    update(dt) { this.clock += dt; }
    paint(g) {
      const z = this.zone;
      if (!z || z.w < 80 || z.h < 60) return;
      const T = this.clock, R = BULLES.rythme, n = BULLES.visibles;
      const bh = Math.min(z.h / (n + 0.6), z.w * 0.24), gap = bh * 0.38, bw = Math.min(z.w * 0.78, bh * 4.2);
      const ink = (e, coral = false) => `rgb(${Math.round((1 - clamp(e, 0, 1)) * 255)},${coral ? 0 : 255},255)`;
      const k = T / R, base = Math.floor(k), f = k - base;
      const glisse = ease(clamp(f / 0.35, 0, 1));          // les anciennes bulles remontent d'un cran
      g.globalCompositeOperation = 'multiply';
      for (let i = 0; i <= n; i++) {
        const id = base - i;                               // i = 0 : la bulle qui arrive
        const hws = ((id % 2) + 2) % 2 === 1, coeur = ((id % 7) + 7) % 7 === 3;
        const larg = coeur ? bh * 1.5 : bw * (0.62 + 0.38 * Math.abs(Math.sin(id * 1.7)));
        const pos = i - 1 + glisse;                        // rang depuis le bas (−1 = pas encore là)
        const y = z.y + z.h - bh - Math.max(0, pos) * (bh + gap);
        const x = hws ? z.x + z.w - larg : z.x;
        let alpha = i === 0 ? clamp((f - 0.12) / 0.25, 0, 1) : 1;
        if (pos > n - 1.6) alpha *= clamp((n - 0.6 - pos) / 1, 0, 1);  // les plus anciennes s'effacent
        if (alpha <= 0.01) continue;
        const ecrit = hws && i === 0 && f < 0.55;          // HWS « en train d'écrire »
        const echelle = i === 0 ? 0.75 + 0.25 * ease(clamp((f - 0.12) / 0.3, 0, 1)) : 1;
        g.save();
        g.globalAlpha = alpha;
        g.translate(x + (hws ? larg : 0), y + bh);
        g.scale(echelle, echelle);
        g.translate(-(hws ? larg : 0), -bh);
        const w = ecrit ? bh * 1.9 : larg, ox = hws && ecrit ? larg - w : 0;
        // la bulle : rectangle arrondi + petite queue côté interlocuteur
        const r = bh * 0.38;
        g.beginPath();
        g.roundRect(ox, 0, w, bh, r);
        g.moveTo(hws ? ox + w - r * 0.5 : ox + r * 0.5, bh - 1);
        g.lineTo(hws ? ox + w + bh * 0.16 : ox - bh * 0.16, bh + bh * 0.2);
        g.lineTo(hws ? ox + w - r * 1.4 : ox + r * 1.4, bh - 1);
        g.fillStyle = ink(hws ? 0.58 : 0.26);
        g.fill();
        // contenu : lignes de texte en réserve, points qui écrivent, ou un cœur corail
        g.globalCompositeOperation = 'source-over';
        if (ecrit) {
          for (let d = 0; d < 3; d++) {
            const s = 0.5 + 0.5 * Math.sin(T * 7 - d * 0.9);
            g.fillStyle = '#fff';
            g.beginPath();
            g.arc(ox + w * (0.3 + d * 0.2), bh * 0.5 - s * bh * 0.08, bh * 0.1, 0, TAU);
            g.fill();
          }
        } else if (coeur) {
          const c = bh * 0.2, cx = ox + w / 2, cy = bh * 0.52;
          g.fillStyle = ink(0.85, REGLAGES.corail);
          g.beginPath();
          g.moveTo(cx, cy + c * 1.1);
          g.bezierCurveTo(cx - c * 2, cy - c * 0.2, cx - c * 0.9, cy - c * 1.6, cx, cy - c * 0.5);
          g.bezierCurveTo(cx + c * 0.9, cy - c * 1.6, cx + c * 2, cy - c * 0.2, cx, cy + c * 1.1);
          g.fill();
        } else {
          g.fillStyle = '#fff';
          const lignes = w > bh * 2.6 ? 2 : 1;
          for (let l = 0; l < lignes; l++) {
            const lw = (w - bh * 0.7) * (l === lignes - 1 ? 0.62 : 1);
            g.fillRect(ox + bh * 0.35, bh * (lignes === 2 ? 0.32 + l * 0.26 : 0.44), lw, Math.max(1.5, bh * 0.1));
          }
        }
        g.globalCompositeOperation = 'multiply';
        g.restore();
      }
      g.globalAlpha = 1;
      g.globalCompositeOperation = 'source-over';
    }
  }
  // Zone libre : sous les avis, à droite des boutons du carrousel (mobile : sous les boutons).
  function zoneLibre() {
    const s = section.getBoundingClientRect(), ctl = section.querySelector('.hav-controles');
    if (!ctl) return null;
    // le bloc des contrôles est large : on prend l'emprise réelle de ses boutons
    const c = { top: 1e9, bottom: -1e9, right: -1e9 };
    for (const el of ctl.children) {
      const r = el.getBoundingClientRect();
      if (!r.width) continue;
      c.top = Math.min(c.top, r.top); c.bottom = Math.max(c.bottom, r.bottom); c.right = Math.max(c.right, r.right);
    }
    const haut = c.top - s.top - 6, bas = s.height - 16;   // sous les noms des auteurs : jamais sur le texte
    if (s.width <= 700) return { x: s.width * 0.42, y: c.bottom - s.top + 12, w: s.width * 0.55, h: Math.max(90, s.height - (c.bottom - s.top) - 24) };
    const x = c.right - s.left + 60;
    return { x, y: haut, w: s.width - x - 32, h: bas - haut };
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
  let W = 0, H = 0, dpr = 1, nom = '', poulpes = [];
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
    const n2 = W <= 700 ? 'etroit' : 'large';
    if (n2 !== nom) {
      nom = n2;
      poulpes = [new Conversation(null)];
    }
    if (poulpes[0]) poulpes[0].zone = zoneLibre();
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

  window.HWSAvis2026 = { montrer, get page() { return page; }, get scene() { return poulpes; } };
})();
