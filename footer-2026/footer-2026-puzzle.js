/*
 * HWS Agency — footer 2026 : apparition et forme tramée.
 * ------------------------------------------------------------------------
 * Deux poulpes HWS, de profil, peints en niveaux de gris (une « carte d'encre » :
 * blanc = papier, sombre = encre) : masses douces, un seul œil, bras qui ondulent. Un shader WebGL imprime ensuite cette image en fines lignes
 * diagonales, comme une trame offset : plus c'est sombre, plus la ligne s'épaissit.
 * À l'entrée dans l'écran, la trame « s'imprime » ; le curseur écarte doucement les lignes.
 * L'animation s'arrête quand le footer n'est pas visible.
 */
(() => {
  'use strict';

  const REGLAGES = {
    pas: 3.2,          // pas de la trame de points, en px CSS
    angle: 45,        // angle des lignes, en degrés (135 = lignes montantes « / »)
    contraste: 1.3,
    grain: 0.3,        // encre irrégulière dans les lignes
    flou: 3,           // bords qui s'effritent, en px
    vitesse: 1,        // nage des poulpes (0 = figés)
    corail: true,      // pointe de bras corail sur le grand poulpe
    curseur: 1,        // force de la réaction au curseur (0 = aucune)
  };

  const footer = document.querySelector('.hf26');
  if (!footer) return;
  footer.classList.add('hf26--js');
  const box = footer.querySelector('.hf26-trame');
  const canvas = box && box.querySelector('canvas');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Couleurs de la trame (RVB) : fond clair = lignes bleues ; variante hf26--bleu = lignes blanches sur bleu, sans corail.
  const COUL = footer.classList.contains('hf26--bleu')
    ? { encre: [255, 255, 255], corail: [255, 255, 255], papier: [57, 116, 247] }
    : { encre: [57, 116, 247], corail: [255, 90, 54], papier: [247, 247, 244] };

  // « Haut de page » : défilement doux (instantané si le mouvement est réduit).
  const up = footer.querySelector('.hf26-up');
  if (up) up.addEventListener('click', (e) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
  });

  /* ── Apparition à l'entrée dans l'écran ── */
  let visible = false, revealT = null;
  const io = new IntersectionObserver((entries) => {
    for (const en of entries) {
      visible = en.isIntersecting;
      if (visible && !footer.classList.contains('is-in')) {
        footer.classList.add('is-in');
        revealT = performance.now();
      }
      if (visible) start();
    }
  }, { threshold: 0.08 });
  io.observe(footer);
  if (!canvas) return;

  /* ── Outils ── */
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const rnd = (a, b) => a + Math.random() * (b - a);
  const ease = (t) => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
  const LOGO = [
    'M129.757 0.1875H42.2191H20.0031C4.49217 0.1875 -4.64224 17.6008 4.17444 30.3622L58.8265 109.467C66.4574 120.512 82.7685 120.543 90.4417 109.527L145.544 30.4229C154.429 17.6678 145.302 0.1875 129.757 0.1875Z',
    'M215.306 0H201.104C194.821 0 188.933 3.06858 185.334 8.21936L96.7281 135.026C87.8172 147.778 96.9411 165.284 112.498 165.284H127.039C133.334 165.284 139.232 162.204 142.829 157.037L231.096 30.2301C239.975 17.4745 230.847 0 215.306 0Z',
    'M301.078 0H286.882C280.598 0 274.71 3.06891 271.111 8.22015L182.514 135.027C173.604 147.779 182.728 165.284 198.285 165.284H212.82C219.117 165.284 225.014 162.203 228.611 157.036L316.869 30.2294C325.747 17.4736 316.62 0 301.078 0Z',
  ].map((d) => new Path2D(d));

  const mouse = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5, push: 0, target: 0 };

  /* ── Carte d'encre : les poulpes HWS, de profil ── */
  const tone = document.createElement('canvas');
  const tctx = tone.getContext('2d', { alpha: false });
  const TONE_SCALE = 0.5;
  let S = 0, dpr = 1;
  const dust = Array.from({ length: 46 }, () => ({ x: Math.random(), y: Math.random(), s: rnd(0.0018, 0.0042), e: rnd(0.5, 1), vx: rnd(-1, 1) * 0.004, vy: rnd(-1, 1) * 0.004 }));
  const lean = { x: 0, y: 0 };
  const wrap = (a) => {
    a %= TAU;
    return a > Math.PI ? a - TAU : a < -Math.PI ? a + TAU : a;
  };

  // Un poulpe flotte autour de sa place (coordonnées relatives à la zone), bras en faisceau.
  /* ── Un puzzle de quatre pièces qui s'assemble, vit et réagit au curseur ──
        Boucle de 10 s : pièces éparses qui flottent et tournent lentement → elles se rejoignent une à une
        (éclat de points quand la dernière s'emboîte) → le carré assemblé respire → elles se dispersent.
        Le curseur repousse doucement les pièces proches et fait pencher l'ensemble : on peut « jouer » avec. */
  const PUZZLE = { cx: 0.37, cy: 0.46, piece: 0.155, boucle: 10 };
  // Bords : [haut, droite, bas, gauche] ; 1 = tenon, −1 = mortaise, 0 = bord droit.
  const PIECES = [
    { i: 0, j: 0, bords: [0, 1, 1, 0], loin: [-1.55, -1.05, -0.5], encre: 0.26 },
    { i: 1, j: 0, bords: [0, 0, -1, -1], loin: [1.45, -1.2, 0.45], encre: 0.44 },
    { i: 0, j: 1, bords: [-1, 1, 0, 0], loin: [-1.3, 1.25, 0.35], encre: 0.44 },
    { i: 1, j: 1, bords: [1, 0, 0, -1], loin: [1.6, 1.05, -0.4], encre: 0.26, corail: true },
  ];
  // Place du puzzle (fractions de la boîte de trame) : au centre de l'espace libre à droite du texte,
  // à mi-hauteur du bloc titre + contact. Recalculée à chaque changement de taille.
  function centrer() {
    const title = footer.querySelector('.hf26-title'), contact = footer.querySelector('.hf26-contact'), inner = footer.querySelector('.hf26-inner');
    if (!title || !contact || !inner || !box) return;
    const bx = box.getBoundingClientRect();
    if (!bx.width || window.innerWidth <= 640) return;
    const rg = document.createRange();
    rg.selectNodeContents(title);
    const t = rg.getBoundingClientRect(), c = contact.getBoundingClientRect(), ins = inner.getBoundingClientRect();
    const droite = ins.right - parseFloat(getComputedStyle(inner).paddingRight);
    const gauche = Math.max(t.right, c.left + 260);
    PUZZLE.cx = ((gauche + droite) / 2 - bx.left) / bx.width;
    PUZZLE.cy = ((t.top + c.bottom) / 2 - bx.top) / bx.height;
  }
  new ResizeObserver(centrer).observe(footer);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(centrer);

  class Puzzle {
    constructor() {
      this.t = 1.5;
      this.pos = PIECES.map(() => ({ x: 0, y: 0, vx: 0, vy: 0 }));
      this.penche = 0;
    }
    update(dt) { this.t += dt; this.dt = dt; }
    paint(g, s) {
      const k = PUZZLE.piece * s, T = this.t % PUZZLE.boucle;
      const lis = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
      const ink = (e) => `rgb(${Math.round((1 - clamp(e, 0, 1)) * 255)},255,255)`;
      const mx = mouse.x * s, my = mouse.y * s, actif = mouse.target > 0;
      this.penche += ((actif ? (mouse.x - PUZZLE.cx) * 0.35 : 0) - this.penche) * 0.04;
      const cx = PUZZLE.cx * s, cy = PUZZLE.cy * s + Math.sin(this.t * 0.8) * 0.06 * k;
      // trace un bord de p0 à p1 (normale extérieure n), avec tenon (+1) ou mortaise (−1)
      const bord = (x0, y0, x1, y1, nx, ny, type) => {
        if (!type) { g.lineTo(x1, y1); return; }
        const L = (u) => [x0 + (x1 - x0) * u, y0 + (y1 - y0) * u], b = type * 0.42 * k;
        g.lineTo(...L(0.36));
        const [ax, ay] = L(0.14), [bx, by] = L(0.86), [ex, ey] = L(0.64);
        g.bezierCurveTo(ax + nx * b, ay + ny * b, bx + nx * b, by + ny * b, ex, ey);
        g.lineTo(x1, y1);
      };
      const forme = (p) => {
        const h = k / 2, [t, r, bo, l] = p.bords;
        g.beginPath();
        g.moveTo(-h, -h);
        bord(-h, -h, h, -h, 0, -1, t);
        bord(h, -h, h, h, 1, 0, r);
        bord(h, h, -h, h, 0, 1, bo);
        bord(-h, h, -h, -h, -1, 0, l);
        g.closePath();
      };
      g.globalCompositeOperation = 'source-over';
      let derniere = 0;
      PIECES.forEach((p, n) => {
        // progression d'assemblage, décalée pièce par pièce
        const ass = lis((T - 2.4 - n * 0.45) / 1.1) * (1 - lis((T - 7.6 - n * 0.2) / 1.6));
        derniere = Math.max(derniere, n === 3 ? ass : 0);
        const flx = Math.sin(this.t * (0.5 + n * 0.13) + n * 2) * 0.12, fly = Math.cos(this.t * (0.45 + n * 0.11) + n) * 0.12;
        const hx = (p.i - 0.5) * k, hy = (p.j - 0.5) * k;
        const lx = p.loin[0] * 0.85 * k + flx * k, ly = p.loin[1] * 0.78 * k + fly * k;   // dispersion contenue : jamais sur la navigation
        let x = cx + lx + (hx - lx) * ass, y = cy + ly + (hy - ly) * ass;
        const rot = (p.loin[2] + Math.sin(this.t * 0.3 + n) * 0.25) * (1 - ass) + this.penche * 0.3;
        // le curseur repousse doucement la pièce (inertie amortie)
        const q = this.pos[n];
        let fx = 0, fy = 0;
        if (actif) {
          const dx = x + q.x - mx, dy = y + q.y - my, d = Math.hypot(dx, dy) || 1, rayon = 1.6 * k;
          if (d < rayon) { const f = (1 - d / rayon) * 2.2 * k; fx = (dx / d) * f; fy = (dy / d) * f; }
        }
        q.vx += ((fx - q.x) * 0.06 - q.vx) * 0.25;
        q.vy += ((fy - q.y) * 0.06 - q.vy) * 0.25;
        q.x += q.vx * 4; q.y += q.vy * 4;
        x += q.x; y += q.y;
        g.save();
        g.translate(x, y);
        g.rotate(rot);
        g.save(); g.translate(0.06 * k, 0.08 * k); forme(p); g.fillStyle = ink(0.7); g.fill(); g.restore();  // épaisseur
        forme(p); g.fillStyle = ink(p.encre); g.fill();
        g.lineWidth = 0.04 * k; g.lineJoin = 'round'; g.strokeStyle = ink(0.95); g.stroke();
        g.restore();
      });
      // éclat de points quand la dernière pièce s'emboîte
      const ec = T > 4.6 && T < 5.9 ? (T - 4.6) / 1.3 : 0;
      if (ec > 0) {
        g.fillStyle = ink(0.95 * (1 - ec));
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * TAU, r = (1.0 + ec * 0.5) * k;
          g.beginPath(); g.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 0.03 * k, 0, TAU); g.fill();
        }
      }
    }
  }
  const octos = [new Puzzle()];
  let lastPaint = null;

  function paint(t) {
    const g = tctx, s = S * TONE_SCALE;
    const dt = lastPaint === null ? 0 : clamp(t - lastPaint, 0, 0.05);
    lastPaint = t;
    // Le curseur fait légèrement pivoter les poulpes, comme s'ils le suivaient du regard.
    const turn = (mouse.target ? (mouse.x - 0.5) * -0.5 : 0) * REGLAGES.curseur;
    for (const o of octos) o.update(dt || 0.016);
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalCompositeOperation = 'source-over';
    g.fillStyle = '#fff';
    g.fillRect(0, 0, tone.width, tone.height);
    for (const o of octos) o.paint(g, s);
    g.globalCompositeOperation = 'source-over';
  }

  /* ── Trame (WebGL) ── */
  const VERT = 'attribute vec2 p;varying vec2 v;void main(){v=p*0.5+0.5;gl_Position=vec4(p,0.0,1.0);}';
  // Trame de points (21 oct. 2026) : grille régulière à 45°, un point par cellule, taille = encre au centre
  // de la cellule (points fixes, pas de scintillement), jamais jointifs ; contours renforcés.
  const FRAG = `
precision highp float;
varying vec2 v;
uniform sampler2D uTone;
uniform float uPitch, uInk;
uniform vec2 uDir, uRes;
uniform vec3 uBlue, uCoral, uPaper;
void main() {
  vec2 f = gl_FragCoord.xy;
  mat2 rot = mat2(uDir.x, -uDir.y, uDir.y, uDir.x);
  vec2 q = rot * f / uPitch;
  vec2 cel = floor(q) + 0.5;
  vec2 c = (cel * uPitch) * rot;
  vec2 uv = clamp(vec2(c.x / uRes.x, 1.0 - c.y / uRes.y), 0.0, 1.0);
  float e = 1.0 - texture2D(uTone, uv).r;
  vec2 o = vec2(uPitch / uRes.x, uPitch / uRes.y);
  float bord = max(max(abs(e - (1.0 - texture2D(uTone, uv + vec2(o.x, 0.0)).r)), abs(e - (1.0 - texture2D(uTone, uv - vec2(o.x, 0.0)).r))),
                   max(abs(e - (1.0 - texture2D(uTone, uv + vec2(0.0, o.y)).r)), abs(e - (1.0 - texture2D(uTone, uv - vec2(0.0, o.y)).r))));
  e = max(e, smoothstep(0.18, 0.5, bord) * 0.62 * step(0.04, e));
  e *= uInk * smoothstep(0.0, 0.1, uv.x) * smoothstep(0.0, 0.08, uv.y) * smoothstep(0.0, 0.08, 1.0 - uv.y);
  float couv = e < 0.05 ? 0.0 : 0.4 * pow(e, 1.15);
  float r = uPitch * sqrt(couv / 3.14159);
  float d = length(q - cel) * uPitch;
  float a = couv > 0.0 ? 1.0 - smoothstep(r - 0.6, r + 0.6, d) : 0.0;
  gl_FragColor = vec4(mix(uPaper, uBlue, a), 1.0);
}`;
  let gl = null, U = {}, tex = null;
  try {
    gl = canvas.getContext('webgl', { antialias: false, alpha: false, depth: false, stencil: false });
  } catch (e) {
    gl = null;
  }
  if (gl) {
    const sh = (type, src) => {
      const o = gl.createShader(type);
      gl.shaderSource(o, src);
      gl.compileShader(o);
      return o;
    };
    const prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) gl = null;
    else {
      gl.useProgram(prog);
      const b = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, b);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(prog, 'p');
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      for (const n of ['uRes', 'uTone', 'uPitch', 'uContrast', 'uGrain', 'uInk', 'uPush', 'uRadius', 'uAspect', 'uDir', 'uJitter', 'uMouse', 'uBlue', 'uCoral', 'uPaper']) U[n] = gl.getUniformLocation(prog, n);
      tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.uniform1i(U.uTone, 0);
      gl.uniform3f(U.uBlue, ...COUL.encre.map((c) => c / 255));
      gl.uniform3f(U.uCoral, ...COUL.corail.map((c) => c / 255));
      gl.uniform3f(U.uPaper, ...COUL.papier.map((c) => c / 255));
    }
  }
  // Sans WebGL : la même trame calculée une fois par le processeur (image fixe).
  let ctx2d = null;
  if (!gl) ctx2d = canvas.getContext('2d');

  /* ── Curseur ── */
  footer.addEventListener('pointermove', (e) => {
    if (REGLAGES.curseur <= 0) return;
    const r = box.getBoundingClientRect();
    mouse.tx = (e.clientX - r.left) / r.width;
    mouse.ty = (e.clientY - r.top) / r.height;
    const inside = mouse.tx > -0.1 && mouse.tx < 1.1 && mouse.ty > -0.1 && mouse.ty < 1.1;
    mouse.target = inside ? 0.035 * REGLAGES.curseur : 0;
  });
  footer.addEventListener('pointerleave', () => (mouse.target = 0));

  /* ── Taille ── */
  function resize() {
    const r = box.getBoundingClientRect();
    S = Math.max(1, Math.round(r.width));
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(S * dpr);
    canvas.height = Math.round(S * dpr);
    tone.width = tone.height = Math.max(1, Math.round(S * TONE_SCALE));
    if (reduced || !gl) once();
  }
  new ResizeObserver(resize).observe(box);
  // Sur mobile, la forme se place juste sous les boutons de contact.
  const contact = footer.querySelector('.hf26-contact');
  function place() {
    if (window.innerWidth <= 640 && contact) footer.style.setProperty('--hf-trame-top', `${contact.offsetTop + contact.offsetHeight - box.offsetWidth * 0.06}px`);
    else footer.style.removeProperty('--hf-trame-top');
  }
  new ResizeObserver(place).observe(footer);

  /* ── Rendu ── */
  function render(t, inkAmount) {
    paint(t);
    if (gl) {
      const a = (REGLAGES.angle * Math.PI) / 180;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, tone);
      gl.uniform1f(U.uPitch, REGLAGES.pas * dpr);
      gl.uniform2f(U.uRes, canvas.width, canvas.height);
      gl.uniform2f(U.uDir, Math.cos(a), Math.sin(a));
      gl.uniform1f(U.uContrast, REGLAGES.contraste);
      gl.uniform1f(U.uGrain, REGLAGES.grain);
      gl.uniform1f(U.uInk, inkAmount);
      gl.uniform2f(U.uJitter, (2 * REGLAGES.flou) / S, (2 * REGLAGES.flou) / S);
      gl.uniform2f(U.uMouse, mouse.x, mouse.y);
      gl.uniform1f(U.uPush, mouse.push);
      gl.uniform1f(U.uRadius, 0.16);
      gl.uniform1f(U.uAspect, 1);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    } else if (ctx2d) {
      cpu(inkAmount);
    }
  }

  function cpu(inkAmount) {
    const w = canvas.width, h = canvas.height, out = ctx2d.createImageData(w, h), od = out.data;
    const td = tctx.getImageData(0, 0, tone.width, tone.height).data, tw = tone.width;
    const pitch = Math.max(2.5, REGLAGES.pas * dpr), a = (REGLAGES.angle * Math.PI) / 180, ca = Math.cos(a) / pitch, sa = -Math.sin(a) / pitch, aa = 1 / pitch;
    for (let y = 0, o = 0; y < h; y++) {
      for (let x = 0; x < w; x++, o += 4) {
        const i = (Math.min(tone.height - 1, ((y / h) * tone.height) | 0) * tw + Math.min(tw - 1, ((x / w) * tw) | 0)) * 4;
        const raw = 1 - (1 - td[i] / 255) * inkAmount;
        const tn = clamp((raw - 0.5) * REGLAGES.contraste + 0.5, 0, 1);
        const q = x * ca + y * sa, t = 1 - Math.abs(q - Math.floor(q) - 0.5) * 2;
        const light = tn < 0.004 ? 0 : tn > 0.996 ? 1 : clamp((tn - t + aa) / (2 * aa), 0, 1);
        const coral = 1 - td[i + 1] / 255;
        const [er, eg, eb] = COUL.encre, [cr, cg, cb] = COUL.corail, [pr, pg, pb] = COUL.papier;
        const ir = er + (cr - er) * coral, ig = eg + (cg - eg) * coral, ib = eb + (cb - eb) * coral;
        od[o] = ir + (pr - ir) * light;
        od[o + 1] = ig + (pg - ig) * light;
        od[o + 2] = ib + (pb - ib) * light;
        od[o + 3] = 255;
      }
    }
    ctx2d.putImageData(out, 0, 0);
  }

  // Image fixe (mouvement réduit, ou sans WebGL).
  function once() {
    if (!S) return;
    render(12, footer.classList.contains('is-in') ? 1 : 0);
  }

  let raf = 0, last = 0, clock = 0;
  function frame(now) {
    raf = 0;
    if (!visible) return;
    const dt = Math.min(0.05, (now - (last || now)) / 1000);
    last = now;
    clock += dt;
    // Poussières qui dérivent, curseur lissé.
    for (const p of dust) {
      p.x = (p.x + p.vx * dt + 1) % 1;
      p.y = (p.y + p.vy * dt + 1) % 1;
    }
    mouse.x += (mouse.tx - mouse.x) * 0.08;
    mouse.y += (mouse.ty - mouse.y) * 0.08;
    mouse.push += (mouse.target - mouse.push) * 0.06;
    lean.x += ((mouse.target ? mouse.x - 0.5 : 0) - lean.x) * 0.03;
    lean.y += ((mouse.target ? mouse.y - 0.5 : 0) - lean.y) * 0.03;
    // La trame s'imprime en 1,6 s à l'apparition du footer.
    const inkAmount = revealT ? ease((now - revealT - 250) / 1600) : 0;
    render(clock, inkAmount);
    raf = requestAnimationFrame(frame);
  }
  function start() {
    if (reduced || !gl) {
      once();
      return;
    }
    if (!raf) {
      last = 0;
      raf = requestAnimationFrame(frame);
    }
  }
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && visible) start();
  });

  window.HWSFooter2026 = { REGLAGES };
})();
