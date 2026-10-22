/*
 * HWS Agency — section « Collaboration » 2026.
 * 1. Curseurs : Guénolé, Bruno et Maxime font de petits gestes lents autour de leurs mots ;
 *    « Vous » suit la souris dans la section (et reprend sa place près du cadre en sortant).
 *    Les positions se recalculent à partir du vrai texte : le cadre épouse « à vous. ».
 *    Au doigt ou si le mouvement réduit est demandé, tout reste immobile et lisible.
 * 2. Ruban : deux bandes abstraites en bas de section, imprimées en lignes diagonales et
 *    fragments par le même moteur de trame que les autres sections.
 */
(() => {
  'use strict';
  const section = document.querySelector('.hco');
  if (!section) return;
  section.classList.add('hco--js');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const souris = window.matchMedia('(hover: hover) and (pointer: fine)');
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const ease = (t) => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
  const doux = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };

  /* ── 1. Curseurs ── */
  const q = (s) => section.querySelector(s);
  const C = { g: q('.hco-cur--guenole'), b: q('.hco-cur--bruno'), m: q('.hco-cur--maxime'), v: q('.hco-cur--vous') };
  const cadre = q('.hco-cadre'), traitP = q('.hco-trait--projet'), traitE = q('.hco-trait--echanges');
  const mots = { projet: q('.hco-projet'), l1: q('.hco-l1'), l2: q('.hco-l2'), echanges: q('.hco-echanges'), texte: q('.hco-texte') };
  const rangeRect = (el) => { const r = document.createRange(); r.selectNodeContents(el); return r.getBoundingClientRect(); };
  let S = { w: 0, h: 0 }, ancres = {};
  // Hauteurs du ruban (fractions de la section), recalées sur le texte et le bouton.
  const RU = { haut: 0.62, creux: 0.9 };
  let echelle = 1; // les gestes suivent la taille du titre

  // Gestes : petits déplacements (en px) depuis la place de chacun, avec des pauses.
  const GESTES = {
    g: [[0, 0, 2.2], [26, 34, 1.4], [70, 38, 1.8], [8, 6, 2.4]],
    b: [[0, 0, 2.8], [-18, 14, 1.6], [6, -10, 2.2]],
    m: [[0, 0, 2.4], [-60, -2, 1.6], [-130, 0, 1.4], [-20, 2, 2.6]],
  };
  const etat = {};
  for (const k of ['g', 'b', 'm']) etat[k] = { i: 0, de: [0, 0], vers: [0, 0], t: 1, pause: 1 + k.charCodeAt(0) % 3, x: 0, y: 0 };
  const vous = { x: 0, y: 0, tx: 0, ty: 0, suit: false };

  function mesurer() {
    const s = section.getBoundingClientRect();
    S = { w: s.width, h: s.height };
    const rel = (r) => ({ x: r.left - s.left, y: r.top - s.top, w: r.width, h: r.height });
    const p = rel(mots.projet.getBoundingClientRect());
    const l1 = rel(rangeRect(mots.l1));
    const l2 = rel(rangeRect(mots.l2));
    const er = mots.echanges.getClientRects(), e = rel(er[er.length - 1]), e0 = rel(er[0]);
    const t = rel(mots.texte.getBoundingClientRect());
    const bt = rel(section.querySelector('.hco-btn').getBoundingClientRect());
    // Sur les côtés, le ruban monte jusqu'au bas du paragraphe ; au centre, il passe sous le bouton.
    RU.haut = (t.y + t.h) / S.h + 0.02;
    RU.creux = Math.min(0.93, (bt.y + bt.h) / S.h + (S.w <= 760 ? 0.1 : 0.09));
    const fs = parseFloat(getComputedStyle(mots.l1).fontSize);
    const pad = Math.max(6, fs * 0.05);
    echelle = clamp(fs / 170, 0.35, 1.2);
    // Cadre de sélection autour de « à vous. »
    const cad = { x: l2.x - pad, y: l2.y + l2.h * 0.08, w: l2.w + 2 * pad, h: l2.h * 0.9 };
    Object.assign(cadre.style, { width: cad.w + 'px', height: cad.h + 'px', transform: `translate(${cad.x}px, ${cad.y}px)` });
    // Soulignements
    Object.assign(traitP.style, { width: p.w * 0.3 + 'px', transform: `translate(${p.x + p.w * 0.2}px, ${p.y + p.h * 0.76}px)` });
    Object.assign(traitE.style, { width: (e0.x === e.x ? e.w : e0.w) + 'px', transform: `translate(${e0.x}px, ${e0.y + e0.h - 1}px)` });
    ancres = {
      g: [p.x - fs * 0.13, p.y + p.h * 0.12],
      b: [l1.x + l1.w + fs * 0.02, l1.y + l1.h * 0.12],
      m: [e.x + e.w * 0.98, e.y + e.h * 0.55],
      v: [cad.x + cad.w + 10, cad.y + cad.h - 6],
    };
    // Étiquette de Maxime sous le paragraphe, hors du texte.
    C.m.querySelector('.hco-nom').style.top = Math.max(26, t.y + t.h + 10 - ancres.m[1]) + 'px';
    if (!vous.suit) { vous.tx = ancres.v[0]; vous.ty = ancres.v[1]; }
    if (!vous.x) { vous.x = vous.tx; vous.y = vous.ty; }
    poser(true);
  }

  // Garde chaque curseur (et son étiquette) dans la section.
  const borner = (el, x, y) => {
    const w = el.offsetWidth + 110, h = el.offsetHeight + 30;
    return [clamp(x, 8, Math.max(8, S.w - w)), clamp(y, 40, Math.max(40, S.h - h))];
  };
  function poser(immobile) {
    for (const k of ['g', 'b', 'm']) {
      const st = etat[k], a = ancres[k];
      if (!a) continue;
      const x = a[0] + (immobile ? 0 : st.x * echelle), y = a[1] + (immobile ? 0 : st.y * echelle);
      C[k].style.transform = `translate(${x}px, ${y}px)`;
    }
    if (ancres.v) {
      const [x, y] = vous.suit ? [vous.x, vous.y] : borner(C.v, vous.x, vous.y);
      C.v.style.transform = `translate(${x}px, ${y}px)`;
    }
  }

  function animer(dt) {
    for (const k of ['g', 'b', 'm']) {
      const st = etat[k], g = GESTES[k];
      if (st.t >= 1) {
        st.pause -= dt;
        if (st.pause <= 0) {
          st.i = (st.i + 1) % g.length;
          st.de = [st.x, st.y];
          st.vers = [g[st.i][0], g[st.i][1]];
          st.t = 0;
          st.pause = g[st.i][2];
        }
      } else {
        st.t = Math.min(1, st.t + dt / 1.1);
        const e = doux(st.t);
        st.x = st.de[0] + (st.vers[0] - st.de[0]) * e;
        st.y = st.de[1] + (st.vers[1] - st.de[1]) * e;
      }
    }
    // Guénolé ajuste le soulignement en même temps que son geste.
    traitP.style.transform = traitP.style.transform.replace(/ scaleX\([^)]*\)/, '') + ` scaleX(${(0.7 + 0.3 * clamp(etat.g.x / 70, 0, 1)).toFixed(3)})`;
    const k = vous.suit ? 0.45 : 0.08;
    vous.x += (vous.tx - vous.x) * k;
    vous.y += (vous.ty - vous.y) * k;
    poser(false);
  }

  if (!reduced) {
    section.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse' || !souris.matches) return;
      const s = section.getBoundingClientRect();
      vous.tx = e.clientX - s.left;
      vous.ty = e.clientY - s.top;
      if (!vous.suit) { vous.suit = true; section.classList.add('is-suivi'); }
      lancer();
    });
    section.addEventListener('pointerleave', () => {
      vous.suit = false;
      section.classList.remove('is-suivi');
      if (ancres.v) { vous.tx = ancres.v[0]; vous.ty = ancres.v[1]; }
    });
  }
  new ResizeObserver(() => mesurer()).observe(section);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(mesurer);

  /* ── 2. Ruban tramé ── */
  const REGLAGES = { pas: 2.4, angle: 135, contraste: 1.25, grain: 0.35, flou: 2.6, courbure: 3.2, dispersion: 0.85, tiret: 7, vitesse: 0.5 };
  const canvas = section.querySelector('.hco-trame');
  const params = new URLSearchParams(location.search);
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
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); gl = null; });
  canvas.addEventListener('webglcontextrestored', () => { gl = initGL(); lancer(); });

  const TS = 0.5;
  const tone = document.createElement('canvas');
  const tg = tone.getContext('2d', { alpha: false });
  let W = 0, H = 0, dpr = 1;
  function resize() {
    W = Math.max(1, Math.round(canvas.clientWidth));
    H = Math.max(1, Math.round(canvas.clientHeight));
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (W * H * dpr * dpr > 4e6) dpr = Math.max(1, Math.sqrt(4e6 / (W * H)));
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    tone.width = Math.max(1, Math.round(W * TS));
    tone.height = Math.max(1, Math.round(H * TS));
    if (reduced || !souris.matches) once();
  }
  if (canvas) new ResizeObserver(resize).observe(canvas);

  // Le ruban : une seule bande continue d'un bord à l'autre, qui plonge sous le bouton et
  // remonte sur les côtés. Une onde la parcourt en permanence (position et épaisseur),
  // un second brin plus fin l'accompagne en décalé. Il s'arrête au-dessus du filet du bas.
  function brin(g, t, haut, creux, large, dephase, encres) {
    const n = 160;
    g.lineCap = 'round';
    for (const [k, e] of encres) {
      let px = 0, py = 0;
      for (let i = 0; i <= n; i++) {
        const u = -0.06 + (1.12 * i) / n;
        const c = 2 * u - 1;
        const y = H * (haut + (creux - haut) * Math.pow(Math.max(0, 1 - c * c), 0.85)
          + 0.022 * Math.sin(u * 7.5 - t * 1.3 + dephase) + 0.01 * Math.sin(u * 15 + t * 0.9));
        const x = u * W;
        const w = large * (0.5 + 0.5 * c * c) * (1 + 0.28 * Math.sin(u * 10 - t * 1.6 + dephase)) * k;
        if (i > 0 && w > 0.5) {
          g.strokeStyle = `rgb(${Math.round((1 - e) * 255)},255,255)`;
          g.lineWidth = w;
          g.beginPath();
          g.moveTo(px, py);
          g.lineTo(x, y);
          g.stroke();
        }
        px = x;
        py = y;
      }
    }
  }
  function ruban(g, t) {
    const etroit = W <= 760;
    const e = Math.min(W, H);
    g.globalCompositeOperation = 'darken';
    if (etroit) {
      brin(g, t, RU.haut + 0.1, RU.creux, e * 0.1, 0, [[1, 0.22], [0.55, 0.42], [0.22, 0.6]]);
      brin(g, t * 0.8, RU.haut + 0.06, RU.creux - 0.03, e * 0.04, 2.1, [[1, 0.3]]);
    } else {
      brin(g, t, RU.haut + 0.05, RU.creux, e * 0.11, 0, [[1, 0.2], [0.6, 0.4], [0.24, 0.58]]);
      brin(g, t * 0.8, RU.haut, RU.creux - 0.05, e * 0.035, 2.1, [[1, 0.32]]);
    }
    g.globalCompositeOperation = 'source-over';
  }

  let clock = 0, intro = 0, t0 = 0;
  function render() {
    if (!W || !gl) return;
    tg.setTransform(1, 0, 0, 1, 0, 0);
    tg.fillStyle = '#fff';
    tg.fillRect(0, 0, tone.width, tone.height);
    tg.setTransform(TS, 0, 0, TS, 0, 0);
    ruban(tg, clock * 2.2);
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
    gl.uniform1f(U.uTime, clock * 4);
    gl.uniform1f(U.uIntro, intro);
    gl.uniform1f(U.uPush, 0);
    gl.uniform1f(U.uSpeed, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  function once() {
    intro = 1;
    render();
  }

  /* ── Boucle commune, suspendue hors écran ── */
  let visible = false, raf = 0, last = 0;
  function frame(now) {
    raf = 0;
    if (!visible || document.hidden) return;
    const dt = Math.min(0.05, (now - (last || now)) / 1000);
    last = now;
    clock += dt * REGLAGES.vitesse;
    if (!t0) t0 = now;
    intro = ease((now - t0) / 2000);
    animer(dt);
    render();
    raf = requestAnimationFrame(frame);
  }
  function lancer() {
    if (reduced || !souris.matches) { poser(true); once(); return; }
    if (!raf && visible) { last = 0; raf = requestAnimationFrame(frame); }
  }
  new IntersectionObserver((entries) => {
    for (const en of entries) visible = en.isIntersecting;
    if (visible) lancer();
  }, { rootMargin: '120px 0px' }).observe(section);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) lancer(); });

  window.HWSCollab2026 = { mesurer, get ancres() { return ancres; }, vous };
})();
