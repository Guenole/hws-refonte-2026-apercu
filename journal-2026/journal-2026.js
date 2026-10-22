/*
 * HWS Agency — section « Journal & ressources » 2026 : un poulpe HWS tramé dans le coin,
 * même moteur que les autres sections. Le contenu, lui, fonctionne sans script.
 */
(() => {
  'use strict';
  const section = document.querySelector('.hjr');
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

  /* ── 2. Les poulpes tramés sur les bords ── */
  const REGLAGES = { pas: 2.4, angle: 135, contraste: 1.25, grain: 0.25, flou: 1.6, courbure: 3.2, dispersion: 0.45, tiret: 7, vitesse: 0.55, corail: true };
  // Place dans la section (fractions) ; taille en fraction de la largeur de la section.
  const POULPES = {
    // Un poulpe dans le coin bas droit : la tête sort de l'écran, les bras s'enroulent sous la dernière colonne.
    large: [{ x: 1.035, y: 0.99, taille: 0.042, cap: -0.6, encre: 0.85, corail: [3] }],
    etroit: [{ x: 1.03, y: 0.985, taille: 0.1, cap: -0.3, encre: 0.8 }],
  };
  const canvas = section.querySelector('.hjr-trame');
  if (!canvas) return;
  const params = new URLSearchParams(location.search);

  class Poulpe {
    constructor(p) {
      Object.assign(this, p);
      this.x0 = p.x;
      this.y0 = p.y;
      this.cap0 = p.cap;
      this.seed = rnd(0, 100);
      this.clock = rnd(0, 50);
      this.oeil = Math.cos(p.cap) >= 0 ? 1 : -1;
      this.serre = 0;
      this.ouvert = 0.9;
      this.N = 22;
      this.bras = Array.from({ length: 8 }, (_, k) => {
        const u = (k - 3.5) / 3.5;
        return {
          k, u, len: rnd(2.8, 3.6) * (1 - Math.abs(u) * 0.12), wAmp: rnd(0.06, 0.11), wFreq: rnd(0.8, 1.5), wPh: rnd(0, TAU),
          cAmp: rnd(0.18, 0.34) * (Math.random() < 0.5 ? -1 : 1), cFreq: rnd(0.2, 0.5), cPh: rnd(0, TAU), sway: rnd(0, TAU),
          base: p.cap + Math.PI + u * 0.7, corail: (p.corail || []).includes(k),
          pts: new Float32Array((this.N + 1) * 2), rad: new Float32Array(this.N + 1), nrm: new Float32Array((this.N + 1) * 2),
        };
      });
      this.taches = Array.from({ length: 22 }, () => ({ lx: rnd(0.2, 1.7), ly: rnd(-0.55, 0.55), r: rnd(0.04, 0.08), th: Math.random() }));
    }
    update(dt, env) {
      this.clock += dt;
      const k = this.clock, n = this.N, K = 20 / n;
      const R = (this.R = this.taille * env.unite);
      // Flotte autour de sa place ; les poulpes proches suivent un peu plus le curseur (profondeur).
      const prof = 0.01 + 0.025 * this.encre;
      this.x = env.w * (this.x0 + 0.016 * Math.sin(k * 0.23 + this.seed) + env.penche.x * prof);
      this.y = env.h * (this.y0 + 0.018 * Math.sin(k * 0.31 + this.seed * 2) + env.penche.y * prof);
      this.cap = this.cap0 + 0.24 * Math.sin(k * 0.17 + this.seed) - env.penche.x * 0.4 * this.encre;
      this.serre = Math.pow(Math.max(0, Math.sin(k * 0.8 + this.seed)), 6);
      this.ouvert = 0.8 + 0.25 * Math.sin(k * 0.8 + this.seed + 1.2);
      this.oeil += ((Math.cos(this.cap) >= 0 ? 1 : -1) - this.oeil) * Math.min(1, dt * 3);
      for (const arm of this.bras) {
        const P = arm.pts;
        const rootA = this.cap + Math.PI + arm.u * 0.55;
        let x = this.x + Math.cos(rootA) * R * 0.32, y = this.y + Math.sin(rootA) * R * 0.32;
        const baseT = this.cap + Math.PI + arm.u * this.ouvert * 0.7 + Math.sin(k * 0.6 + arm.sway) * 0.14;
        arm.base += wrap(baseT - arm.base) * Math.min(1, dt * 4);
        let a = arm.base;
        const seg = (R * arm.len) / n, waveK = 0.45 + 0.55 * (1 - this.serre);
        P[0] = x;
        P[1] = y;
        for (let i = 1; i <= n; i++) {
          const q = i / n;
          a += (arm.wAmp * waveK * Math.sin(k * arm.wFreq * 2.2 + arm.wPh - i * 0.55 * K) * (0.3 + 0.7 * q) + arm.cAmp * Math.sin(k * arm.cFreq * 2 + arm.cPh) * q * q * 2.4) * K;
          x += Math.cos(a) * seg;
          y += Math.sin(a) * seg;
          P[i * 2] = x;
          P[i * 2 + 1] = y;
        }
        for (let i = 0; i <= n; i++) {
          const i0 = Math.max(0, i - 1), i1 = Math.min(n, i + 1);
          const tx = P[i1 * 2] - P[i0 * 2], ty = P[i1 * 2 + 1] - P[i0 * 2 + 1], tl = Math.hypot(tx, ty) || 1;
          arm.rad[i] = R * (0.12 * Math.pow(1 - i / n, 0.9) + 0.012);
          arm.nrm[i * 2] = -ty / tl;
          arm.nrm[i * 2 + 1] = tx / tl;
        }
      }
    }
    // Masses douces et translucides, un seul œil, bras plus sombres au cœur, pointe corail.
    paint(g) {
      const R = this.R, n = this.N, E = this.encre;
      const ink = (e, a = 1, coral = false) => `rgba(${Math.round((1 - clamp(e, 0, 1) * E) * 255)},${coral ? 0 : 255},255,${a})`;
      const c = Math.cos(this.cap), sn = Math.sin(this.cap), px = -sn * this.oeil, py = c * this.oeil;
      const blob = (cx, cy, rx, ry, rot, e, edge = 0.55) => {
        g.save();
        g.translate(cx, cy);
        g.rotate(rot);
        g.scale(1, ry / rx);
        const gr = g.createRadialGradient(0, 0, 0, 0, 0, rx);
        gr.addColorStop(0, ink(e));
        gr.addColorStop(edge, ink(e * 0.82));
        gr.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = gr;
        g.beginPath();
        g.arc(0, 0, rx, 0, TAU);
        g.fill();
        g.restore();
      };
      const armPoly = (arm, kk, from = 0) => {
        const P = arm.pts, p = new Path2D(), L = [], Rr = [];
        for (let i = from; i <= n; i++) {
          const r = arm.rad[i] * kk, nx = arm.nrm[i * 2], ny = arm.nrm[i * 2 + 1];
          L.push(P[i * 2] + nx * r, P[i * 2 + 1] + ny * r);
          Rr.push(P[i * 2] - nx * r, P[i * 2 + 1] - ny * r);
        }
        p.moveTo(L[0], L[1]);
        for (let j = 2; j < L.length; j += 2) p.lineTo(L[j], L[j + 1]);
        p.lineTo(P[n * 2] + (P[n * 2] - P[n * 2 - 2]) * 0.4, P[n * 2 + 1] + (P[n * 2 + 1] - P[n * 2 - 1]) * 0.4);
        for (let j = Rr.length - 2; j >= 0; j -= 2) p.lineTo(Rr[j], Rr[j + 1]);
        p.closePath();
        return p;
      };
      g.globalCompositeOperation = 'multiply';
      for (const arm of this.bras) {
        g.fillStyle = ink(0.4);
        g.fill(armPoly(arm, 1));
        g.fillStyle = ink(0.28);
        g.fill(armPoly(arm, 0.42));
        if (arm.corail && REGLAGES.corail) {
          g.fillStyle = ink(0.75, 1, true);
          g.fill(armPoly(arm, 0.9, Math.floor(n * 0.82)));
        }
        const P = arm.pts;
        for (let i = 3; i < n - 2; i += 2) {
          const r = arm.rad[i], nx = arm.nrm[i * 2], ny = arm.nrm[i * 2 + 1], side = nx * px + ny * py > 0 ? -1 : 1;
          g.fillStyle = ink(0.55);
          g.beginPath();
          g.arc(P[i * 2] + nx * r * 0.62 * side, P[i * 2 + 1] + ny * r * 0.62 * side, Math.max(0.6, r * 0.3), 0, TAU);
          g.fill();
        }
      }
      blob(this.x - c * R * 0.42, this.y - sn * R * 0.42, R * 0.48, R * 0.42, this.cap, 0.42);
      blob(this.x + c * R * 0.05, this.y + sn * R * 0.05, R * 0.56, R * 0.5, this.cap, 0.46, 0.5);
      const mx = this.x + c * R * 0.95, my = this.y + sn * R * 0.95;
      const ma = R * 1.08 * (1 + 0.06 * this.serre), mb = R * 0.72 * (1 - 0.12 * this.serre) * (1 + 0.03 * Math.sin(this.clock * 1.6));
      blob(mx, my, ma, mb, this.cap, 0.46, 0.66);
      blob(mx + 0.55 * R * 0.22, my + 0.83 * R * 0.22, ma * 0.78, mb * 0.7, this.cap, 0.3, 0.4);
      const w1 = Math.sin(this.clock * 0.9 + this.seed), w2 = Math.sin(this.clock * 0.7 + this.seed * 2);
      blob(mx + c * R * 0.18 + px * R * 0.12, my + sn * R * 0.18 + py * R * 0.12, R * (0.36 + 0.03 * w1), R * 0.24, this.cap + 0.3 * w2, 0.72, 0.4);
      blob(mx - c * R * 0.28 - px * R * 0.1, my - sn * R * 0.28 - py * R * 0.1, R * 0.28, R * (0.2 + 0.02 * w2), this.cap - 0.4 * w1, 0.62, 0.4);
      for (const sp of this.taches) {
        if (sp.th > 0.6) continue;
        blob(this.x + (sp.lx * c - sp.ly * this.oeil * sn) * R, this.y + (sp.lx * sn + sp.ly * this.oeil * c) * R, sp.r * R * 1.6, sp.r * R * 1.6, 0, 0.32, 0.3);
      }
      // L'œil, seul visible de profil : globe clair, iris cerné, pupille en fente horizontale.
      g.globalCompositeOperation = 'source-over';
      const ex = this.x + c * R * 0.12 + px * R * 0.3, ey = this.y + sn * R * 0.12 + py * R * 0.3, er = R * 0.15;
      g.fillStyle = ink(0.06);
      g.beginPath();
      g.arc(ex, ey, er, 0, TAU);
      g.fill();
      g.lineWidth = Math.max(1, R * 0.035);
      g.strokeStyle = ink(0.85);
      g.stroke();
      g.fillStyle = ink(1);
      g.beginPath();
      g.ellipse(ex, ey, er * 0.62, Math.max(er * 0.24, 0.8), 0, 0, TAU);
      g.fill();
    }
  }

  /* ── Trame (WebGL, même shader que le héro) ── */
  const VERT = 'attribute vec2 p;varying vec2 v;void main(){v=p*0.5+0.5;gl_Position=vec4(p,0.0,1.0);}';
  const FRAG = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
varying vec2 v;
uniform sampler2D uTone;
uniform vec2 uRes, uDir, uMouse;
uniform float uPitch, uContrast, uGrain, uFuzz, uBend, uDisperse, uFrag, uFragAmp, uWarp, uTime, uIntro, uPush, uSpeed;
uniform vec3 uBlue, uCoral, uPaper;
float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
void main() {
  vec2 f = gl_FragCoord.xy;
  vec2 uv = vec2(v.x, 1.0 - v.y);
  float m = min(uRes.x, uRes.y);
  vec2 q = f / m; // coordonnées isotropes : le petit côté de l'écran vaut 1
  float T = uTime;
  // Le curseur écarte doucement la matière autour de lui.
  vec2 dm = q - vec2(uMouse.x, 1.0 - uMouse.y) * uRes / m;
  float dist = length(dm);
  float gm = exp(-dist * dist / 0.022);
  vec2 pq = dist > 0.0001 ? dm / dist * gm * uPush : vec2(0.0);
  vec2 push = vec2(pq.x, -pq.y) * m / uRes;
  // Un courant lent déforme les contours.
  vec2 flow = vec2(noise(q * 2.2 + vec2(T * 0.05, 0.0)), noise(q * 2.2 + vec2(5.2, T * 0.04))) - 0.5;
  vec2 base = uv - push + flow * uWarp / uRes;
  // Les lignes se courbent dans les formes (encre lissée : la courbe suit le volume, pas chaque bras),
  // ondulent à peine, et s'écartent sous le curseur.
  vec2 o = uPitch * 4.0 / uRes;
  float dark0 = 1.0 - (2.0 * texture2D(uTone, base).r + texture2D(uTone, base + o).r + texture2D(uTone, base - o).r
    + texture2D(uTone, base + vec2(o.x, -o.y)).r + texture2D(uTone, base + vec2(-o.x, o.y)).r) / 6.0;
  float k = dot(f, uDir) / uPitch + dark0 * uBend + (noise(q * 3.0 + vec2(T * 0.03, -T * 0.02)) - 0.5) * 1.2 + gm * uPush * 40.0;
  // Par endroits, la matière se défait en tirets qui dérivent, puis se recompose.
  vec2 perp = vec2(-uDir.y, uDir.x);
  float li = floor(k);
  vec2 cell = vec2(li, floor(dot(f, perp) / uFrag + hash(vec2(li, 1.3))));
  // (jamais au cœur des formes : seulement sur leurs bords et dans le vide autour)
  float zone = smoothstep(0.6, 0.86, noise(q * 1.6 + vec2(-T * 0.035, T * 0.025) + 7.0)) * uDisperse * (1.0 - smoothstep(0.06, 0.22, dark0));
  zone = max(zone, 1.0 - uIntro) + gm * uSpeed * 0.9;
  vec2 frag = (vec2(hash(cell), hash(cell + 11.7)) - 0.5) * zone * uFragAmp / uRes;
  vec2 jit = (vec2(hash(f), hash(f + 19.19)) - 0.5) * uFuzz / uRes;
  vec4 s = texture2D(uTone, base + frag + jit);
  // Encre marbrée : jamais tout à fait uniforme.
  // Jamais d'aplat : même au plus dense, un filet de papier reste entre deux lignes.
  float ink = min(0.84, (1.0 - s.r) * (0.8 + 0.4 * noise(q * 5.0 + vec2(T * 0.02, -T * 0.015)))) * smoothstep(0.0, 0.6, uIntro);
  float tone = clamp((0.5 - ink) * uContrast + 0.5, 0.0, 1.0);
  float g = (hash(floor(f)) - 0.5) * 0.24 + (hash(vec2(li, 3.7)) - 0.5) * 0.08;
  float t = 1.0 - abs(fract(k) - 0.5) * 2.0;
  float aa = 1.2 / uPitch;
  float mid = step(0.004, tone) * step(tone, 0.996);
  float light = tone < 0.004 ? 0.0 : tone > 0.996 ? 1.0 : smoothstep(t - aa, t + aa, tone + g * uGrain * mid);
  float coral = clamp(1.0 - s.g, 0.0, 1.0);
  // Canvas transparent : seule l'encre est peinte, le texte voisin n'est jamais recouvert.
  float encre = 1.0 - light;
  gl_FragColor = vec4(mix(uBlue, uCoral, coral) * encre, encre);
}`;
  const UNIFORMES = ['uTone', 'uRes', 'uDir', 'uMouse', 'uPitch', 'uContrast', 'uGrain', 'uFuzz', 'uBend', 'uDisperse', 'uFrag', 'uFragAmp', 'uWarp', 'uTime', 'uIntro', 'uPush', 'uSpeed', 'uBlue', 'uCoral', 'uPaper'];
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
      poulpes = POULPES[nom].map((p) => new Poulpe(p));
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
    gl.uniform1f(U.uPitch, Math.max(2.5, REGLAGES.pas * dpr));
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

})();
