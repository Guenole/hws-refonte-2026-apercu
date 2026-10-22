/*
 * HWS Agency — section « Notre méthode » 2026.
 * 1. Apparition : à l'entrée dans l'écran, la trajectoire se trace et les étapes suivent.
 * 2. Trame : deux trains d'engrenages qui tournent en continu sur les bords (même moteur que le héro,
 *    « Notre vision » et « Projets »), derrière le contenu.
 */
(() => {
  'use strict';

  const section = document.querySelector('.hm26');
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

  /* ── 1. Apparition ── */
  section.classList.add('hm26--js');
  const io = new IntersectionObserver((entries) => {
    if (entries.some((en) => en.isIntersecting)) {
      section.classList.add('is-in');
      io.disconnect();
    }
  }, { threshold: 0.25 });
  io.observe(section.querySelector('.hm26-trajet') || section);

  // Ligne de la trajectoire : épaisseur constante de 1,4 px quelle que soit la largeur (le SVG fait 1586 unités de large).
  const svgTrajet = section.querySelector('.hm26-svg');
  if (svgTrajet) new ResizeObserver(() => {
    const w = svgTrajet.getBoundingClientRect().width;
    if (w) section.style.setProperty('--hm-trait', (1.4 * 1586 / w).toFixed(3));
  }).observe(svgTrajet);

  /* ── 2. Les engrenages tramés sur les bords (variante sans poulpes, 21 oct. 2026) ── */
  const REGLAGES = { densite: 0.4, pas: 3.2, angle: 45, contraste: 1.3, grain: 0.18, flou: 0.6, courbure: 1.2, dispersion: 0.06, tiret: 7, vitesse: 1, corail: true };
  // Place dans la section (fractions) ; taille en fraction de la largeur de la section.
  // Trains d'engrenages, en fractions de la section ; r = rayon primitif en fraction de la largeur.
  // Le premier engrenage de chaque train est le moteur ; chaque suivant engrène le précédent dans la direction « dir » (radians).
  const TRAINS = {
    large: [
      { x: -0.012, y: 0.1, vitesse: 0.16, encre: 1, roues: [
        { r: 0.062, dents: 20 }, { r: 0.036, dents: 12, dir: -0.12 }, { r: 0.021, dents: 7, dir: -0.75, corail: true } ] },
      { x: 1.018, y: 0.68, vitesse: -0.12, encre: 0.88, roues: [
        { r: 0.064, dents: 20 }, { r: 0.034, dents: 11, dir: Math.PI + 0.75 } ] },
    ],
    etroit: [
      { x: 1.0, y: 0.03, vitesse: 0.16, encre: 0.9, roues: [
        { r: 0.12, dents: 16 }, { r: 0.07, dents: 10, dir: Math.PI + 0.15, corail: true } ] },
    ],
  };

  const canvas = section.querySelector('.hm26-trame');
  if (!canvas) return;
  const params = new URLSearchParams(location.search);

  /* ── Un train d'engrenages : des roues dentées qui s'entraînent l'une l'autre, en continu ──
     Les vitesses respectent le rapport des dents et les dents s'emboîtent vraiment : la méthode
     est une mécanique où chaque pièce fait avancer les autres. Volume par la trame : couronne
     dense, voile plus clair, moyeu sombre, évidements en papier. */
  class Train {
    constructor(p) {
      Object.assign(this, p);
      this.angle = rnd(0, TAU);
    }
    update(dt, env) {
      this.angle += dt * this.vitesse;
      const U = env.unite;
      let cx = env.w * this.x, cy = env.h * this.y, prec = null, theta = this.angle;
      this.pos = this.roues.map((r, i) => {
        const R = r.r * U;
        if (i > 0) {
          const d = prec.R + R;
          cx = prec.cx + Math.cos(r.dir) * d;
          cy = prec.cy + Math.sin(r.dir) * d;
          // engrènement : rapport des dents + alignement d'une dent dans le creux du voisin
          theta = -(prec.dents / r.dents) * prec.theta + (1 + prec.dents / r.dents) * r.dir + Math.PI / r.dents;
        }
        prec = { cx, cy, R, theta, dents: r.dents };
        return prec;
      });
    }
    paint(g) {
      const E = this.encre;
      const ink = (e, coral = false) => `rgb(${Math.round((1 - clamp(e, 0, 1) * E) * 255)},${coral ? 0 : 255},255)`;
      this.roues.forEach((r, i) => {
        const { cx, cy, R, theta } = this.pos[i], n = r.dents, c = r.corail && REGLAGES.corail;
        const h = Math.min(R * 0.22, (TAU * R) / n * 0.55);     // hauteur de dent
        g.save();
        g.translate(cx, cy);
        g.rotate(theta);
        // denture
        g.beginPath();
        for (let k = 0; k < n; k++) {
          const a0 = (k / n) * TAU, p = TAU / n;
          const pts = [[a0 - p * 0.25, R - h * 0.5], [a0 - p * 0.15, R + h * 0.5], [a0 + p * 0.15, R + h * 0.5], [a0 + p * 0.25, R - h * 0.5]];
          for (const [a, rr] of pts) g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
        }
        g.closePath();
        g.fillStyle = ink(c ? 0.8 : 0.62, c);
        g.fill();
        // couronne sombre puis voile clair
        g.beginPath(); g.arc(0, 0, R * 0.86, 0, TAU); g.fillStyle = ink(c ? 0.9 : 0.85, c); g.fill();
        g.beginPath(); g.arc(0, 0, R * 0.72, 0, TAU); g.fillStyle = ink(c ? 0.5 : 0.3, c); g.fill();
        // évidements (papier), seulement sur les roues assez grandes
        if (n >= 10) {
          g.fillStyle = '#fff';
          const nb = n >= 18 ? 6 : 4;
          for (let k = 0; k < nb; k++) {
            const a = (k / nb) * TAU;
            g.beginPath();
            g.arc(Math.cos(a) * R * 0.46, Math.sin(a) * R * 0.46, R * (nb === 6 ? 0.13 : 0.16), 0, TAU);
            g.fill();
          }
        }
        // moyeu
        g.beginPath(); g.arc(0, 0, R * 0.2, 0, TAU); g.fillStyle = ink(0.95, c); g.fill();
        g.beginPath(); g.arc(0, 0, R * 0.08, 0, TAU); g.fillStyle = '#fff'; g.fill();
        g.restore();
      });
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
      poulpes = TRAINS[nom].map((p) => new Train(p));
    }
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

  window.HWSMethode2026 = { REGLAGES, TRAINS };
})();
