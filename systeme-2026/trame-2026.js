/*
 * HWS Agency 2026 — moteur commun des illustrations en trame de points.
 * ------------------------------------------------------------------------
 * Même shader que les illustrations de la home (vision-2026-blocs.js, methode-2026-engrenages.js…),
 * sorti dans un module pour que toute nouvelle illustration le reprenne tel quel.
 *
 * Principe : l'illustration se peint en niveaux d'encre dans un petit canvas 2D (« carte d'encre ») :
 *   - canal rouge : 255 = papier, 0 = encre pleine (utiliser HWSTrame2026.encre(e) pour la couleur) ;
 *   - canal vert à 0 : la zone est imprimée en corail (HWSTrame2026.encre(e, true)).
 * Le shader la réimprime en grille de points inclinée à 45° (pas 3,2 px) : un point par cellule,
 * dont la taille vient de l'encre lue au centre de la cellule. Points fixes, jamais jointifs,
 * bleu nuit au-delà de 72 % d'encre, contours renforcés. La trame se rassemble à la première vue.
 *
 * Usage :
 *   HWSTrame2026.monter(canvas, {
 *     peindre(g, w, h, t, dt) { ... },   // g : contexte 2D en px CSS, t : temps en s
 *     densite: 0.4, pas: 3.2,            // facultatif
 *   });
 * Mouvement réduit (ou ?fixe) : une seule image, peinte au temps `tFixe` (60 s par défaut).
 * Sans WebGL : rien ne s'affiche, la section reste complète et lisible.
 */
(() => {
  'use strict';
  if (window.HWSTrame2026) return;

  const params = new URLSearchParams(location.search);
  const reduitGlobal = window.matchMedia('(prefers-reduced-motion: reduce)').matches || params.has('fixe');
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const ease = (t) => 1 - Math.pow(1 - clamp(t, 0, 1), 3);

  const VERT = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.0,1.0);}';
  const FRAG = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform sampler2D uTone;
uniform vec2 uRes, uDir;
uniform float uPitch, uIntro, uDensite;
uniform vec3 uBlue, uNuit, uCoral;
void main() {
  vec2 f = gl_FragCoord.xy;
  mat2 rot = mat2(uDir.x, -uDir.y, uDir.y, uDir.x);
  vec2 q = rot * f / uPitch;
  vec2 cel = floor(q) + 0.5;
  vec2 centre = (cel * uPitch) * rot;
  vec2 uv = vec2(centre.x / uRes.x, 1.0 - centre.y / uRes.y);
  vec4 s = texture2D(uTone, clamp(uv, 0.0, 1.0));
  float e = clamp(1.0 - s.r, 0.0, 1.0);
  vec2 o = vec2(uPitch / uRes.x, uPitch / uRes.y);
  float bord = max(max(abs(e - (1.0 - texture2D(uTone, uv + vec2(o.x, 0.0)).r)), abs(e - (1.0 - texture2D(uTone, uv - vec2(o.x, 0.0)).r))),
                   max(abs(e - (1.0 - texture2D(uTone, uv + vec2(0.0, o.y)).r)), abs(e - (1.0 - texture2D(uTone, uv - vec2(0.0, o.y)).r))));
  e = max(e, smoothstep(0.18, 0.5, bord) * 0.62 * step(0.04, e));
  e *= smoothstep(0.0, 0.7, uIntro);
  float couv = e < 0.05 ? 0.0 : uDensite * pow(e, 1.15);
  float r = uPitch * sqrt(couv / 3.14159);
  float d = length(q - cel) * uPitch;
  float a = couv > 0.0 ? 1.0 - smoothstep(r - 0.6, r + 0.6, d) : 0.0;
  float coral = clamp(1.0 - s.g, 0.0, 1.0);
  vec3 c = mix(mix(uBlue, uNuit, smoothstep(0.72, 0.95, e)), uCoral, coral);
  gl_FragColor = vec4(c * a, a);
}`;

  // Couleur à peindre dans la carte d'encre pour une encre e (0 → 1), en corail ou non.
  const encre = (e, corail = false) => `rgb(${Math.round((1 - clamp(e, 0, 1)) * 255)},${corail ? 0 : 255},255)`;

  function monter(canvas, opts) {
    if (!canvas || !opts || typeof opts.peindre !== 'function') return null;
    const R = { densite: 0.4, pas: 3.2, angle: 45, echelle: 0.5, tFixe: 60, intro: 2.4, ...opts };
    const reduit = reduitGlobal || !!R.reduit;
    let gl = null, U = {}, tex = null;

    function initGL() {
      if (params.has('cpu')) return null;
      let c = null;
      try {
        c = canvas.getContext('webgl', { antialias: false, alpha: true, premultipliedAlpha: true, depth: false, stencil: false });
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
      for (const n of ['uTone', 'uRes', 'uDir', 'uPitch', 'uIntro', 'uDensite', 'uBlue', 'uNuit', 'uCoral']) U[n] = c.getUniformLocation(prog, n);
      tex = c.createTexture();
      c.bindTexture(c.TEXTURE_2D, tex);
      c.texParameteri(c.TEXTURE_2D, c.TEXTURE_MIN_FILTER, c.LINEAR);
      c.texParameteri(c.TEXTURE_2D, c.TEXTURE_MAG_FILTER, c.LINEAR);
      c.texParameteri(c.TEXTURE_2D, c.TEXTURE_WRAP_S, c.CLAMP_TO_EDGE);
      c.texParameteri(c.TEXTURE_2D, c.TEXTURE_WRAP_T, c.CLAMP_TO_EDGE);
      c.uniform1i(U.uTone, 0);
      c.uniform3f(U.uBlue, 57 / 255, 116 / 255, 247 / 255);
      c.uniform3f(U.uNuit, 23 / 255, 27 / 255, 73 / 255);
      c.uniform3f(U.uCoral, 1, 90 / 255, 54 / 255);
      c.enable(c.BLEND);
      c.blendFunc(c.ONE, c.ONE_MINUS_SRC_ALPHA);
      return c;
    }

    gl = initGL();
    if (!gl) return null;
    canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      gl = null;
    });
    canvas.addEventListener('webglcontextrestored', () => {
      gl = initGL();
      demarrer();
    });

    const tone = document.createElement('canvas');
    const tg = tone.getContext('2d', { alpha: false });
    let W = 0, H = 0, dpr = 1;
    function redim() {
      W = Math.max(1, Math.round(canvas.clientWidth));
      H = Math.max(1, Math.round(canvas.clientHeight));
      dpr = Math.min(window.devicePixelRatio || 1, 3);
      if (W * H * dpr * dpr > 4e6) dpr = Math.max(1, Math.sqrt(4e6 / (W * H)));
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      tone.width = Math.max(1, Math.round(W * R.echelle));
      tone.height = Math.max(1, Math.round(H * R.echelle));
      if (typeof R.redim === 'function') R.redim(W, H);
      if (reduit) image(R.tFixe, 1);
      else if (!raf && intro > 0) image(horloge, intro);
    }

    let horloge = 0, intro = 0, t0 = 0, visible = false, raf = 0, dernier = 0;
    function image(t, k, dt = 0) {
      if (!gl || !W) return;
      tg.setTransform(1, 0, 0, 1, 0, 0);
      tg.globalCompositeOperation = 'source-over';
      tg.fillStyle = '#fff';
      tg.fillRect(0, 0, tone.width, tone.height);
      tg.setTransform(R.echelle, 0, 0, R.echelle, 0, 0);
      R.peindre(tg, W, H, t, dt);
      const a = (R.angle * Math.PI) / 180;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, tone);
      gl.uniform2f(U.uRes, canvas.width, canvas.height);
      gl.uniform2f(U.uDir, Math.cos(a), Math.sin(a));
      gl.uniform1f(U.uPitch, R.pas * dpr);
      gl.uniform1f(U.uDensite, R.densite);
      gl.uniform1f(U.uIntro, k);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    const lent = window.matchMedia('(pointer: coarse)').matches; // téléphones et tablettes : 30 images/s
    function boucle(now) {
      raf = 0;
      if (!visible || document.hidden || !gl) return;
      if (lent && dernier && now - dernier < 31) {
        raf = requestAnimationFrame(boucle);
        return;
      }
      const dt = Math.min(0.05, (now - (dernier || now)) / 1000);
      dernier = now;
      horloge += dt;
      if (!t0) t0 = now;
      intro = params.has('sansintro') ? 1 : ease((now - t0) / (R.intro * 1000));
      image(horloge, intro, dt);
      raf = requestAnimationFrame(boucle);
    }
    function demarrer() {
      if (reduit) {
        image(R.tFixe, 1);
        return;
      }
      if (!raf) {
        dernier = 0;
        raf = requestAnimationFrame(boucle);
      }
    }
    new ResizeObserver(redim).observe(canvas);
    new IntersectionObserver((entries) => {
      for (const en of entries) visible = en.isIntersecting;
      if (visible) demarrer();
    }, { rootMargin: '120px 0px' }).observe(canvas);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && visible) demarrer();
    });
    return { reglages: R, get horloge() { return horloge; }, set horloge(v) { horloge = v; }, image: () => image(horloge, 1) };
  }

  window.HWSTrame2026 = { monter, encre, clamp, ease };
})();
