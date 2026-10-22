/*
 * HWS Agency — héro 2026, scène d'équipe tramée (remplace les poulpes).
 * ------------------------------------------------------------------------
 * Même principe que le héro des poulpes : une « carte d'encre » imprimée par un shader WebGL.
 * 1. La carte d'encre vient de l'illustration Codex (equipe-arc-encre.png, fabriquée par
 *    outils/preparer-encre.py) : canal rouge = encre, canal vert = densité locale lissée.
 *    Les points d'origine sont gardés tels quels : visages, lunettes et mains ne sont pas redessinés.
 * 2. Le shader réimprime cette carte nette à toutes les tailles (seuil doux), répartit les deux bleus
 *    selon la densité (ombres et masses en bleu nuit), et fait vivre la trame : les points épars des
 *    bords dérivent et respirent lentement, de façon continue (bruit lissé, jamais tiré au hasard à
 *    chaque image), se rassemblent au chargement et s'écartent sous le curseur. Les visages ne
 *    bougent jamais sous le curseur.
 * 3. Les personnages vivent par petites déformations locales et douces, chacune à son rythme :
 *    têtes qui s'inclinent autour du cou, paupières qui se ferment, main qui désigne l'écran,
 *    doigts qui tapent, bustes qui se réajustent. Rien n'étire l'image entière.
 * 4. Le logo et les textes restent du vrai HTML. Mouvement réduit : une image fixe. Sans WebGL :
 *    l'image de repli (equipe-arc-repli.webp).
 */
(() => {
  'use strict';

  const REGLAGES = {
    seuilBas: 0.24,    // encre en dessous : papier
    seuilHaut: 0.52,   // encre au-dessus : point plein (entre les deux : bord adouci)
    profondeur: 0.5,   // part de bleu nuit dans les masses denses (0 = tout en bleu électrique)
    lointain: 0.18,    // bleu nuit en plus sur les deux collègues du second plan
    derive: 2.6,       // dérive des points épars, en px de l'illustration
    fremissement: 2.4, // frémissement continu de tous les points, en px (visages presque immobiles ; 0 = aucun)
    respiration: 0.65, // les points épars s'effacent et reviennent lentement (0 = jamais)
    curseur: 1,        // réaction au curseur (0 = aucune)
    vie: 1,            // amplitude des mouvements des personnages (0 = figés)
  };

  // Illustration en arc (22 oct. 2026) : six portraits, bande y 64 → 736 de la source 2048 × 768.
  const SRC = { w: 2048, h: 672 };
  const DY = 64;
  const P = (x, y) => [x, y - DY];
  // Têtes : centre, rayons de l'ellipse, pivot (cou).
  const TETES = [
    { c: P(391, 387), r: [100, 119], pivot: P(400, 503), vers: 1 },
    { c: P(620, 322), r: [94, 120], pivot: P(625, 447), vers: 1 },
    { c: P(892, 243), r: [92, 118], pivot: P(910, 366), vers: 1 },
    { c: P(1150, 242), r: [95, 126], pivot: P(1170, 378), vers: -1 },
    { c: P(1430, 320), r: [100, 121], pivot: P(1455, 454), vers: -1 },
    { c: P(1691, 388), r: [96, 122], pivot: P(1710, 516), vers: -1 },
  ];
  // Yeux, deux par personne (les deux clignent ensemble) : centre, rayons, inclinaison en degrés
  // (négatif = l'œil remonte vers la droite). Recalés sur les six portraits de l'arc.
  const YEUX = [
    [{ c: P(395, 386), r: [12, 4], a: -17 }, { c: P(443, 366), r: [10, 4], a: -20 }],
    [{ c: P(611, 298), r: [13, 4], a: -4 }, { c: P(657, 290), r: [12, 4], a: -15 }],
    [{ c: P(883, 249), r: [15, 5], a: -18 }, { c: P(931, 231), r: [13, 5], a: -18 }],
    [{ c: P(1112, 247), r: [14, 5], a: -14 }, { c: P(1168, 229), r: [14, 5], a: -14 }],
    [{ c: P(1385, 310), r: [14, 5], a: -6 }, { c: P(1433, 300), r: [14, 5], a: -8 }],
    [{ c: P(1643, 385), r: [12, 4], a: 12 }, { c: P(1697, 394), r: [12, 4], a: 12 }],
  ];
  // Mains : 0 = la main qui désigne l'écran, 1 = la main au menton, 2 = les mains sur le clavier.
  const MAINS = [
    { c: P(957, 491), r: [62, 36] },
    { c: P(643, 400), r: [34, 42] },
    { c: P(1348, 562), r: [55, 24] },
  ];
  // Bustes (petits réajustements de posture) : personnes 1, 3 et 6.
  const BUSTES = [
    { c: P(350, 537), r: [190, 90] },
    { c: P(865, 430), r: [160, 100] },
    { c: P(1740, 564), r: [180, 90] },
  ];
  // Second plan (un peu plus de bleu nuit) : personnes 3 et 4, au sommet de l'arc.
  const LOINTAINS = [
    { c: P(892, 340), r: [125, 180] },
    { c: P(1150, 335), r: [125, 180] },
  ];

  const hero = document.querySelector('.hh26');
  if (!hero) return;
  hero.classList.add('hh26--js');
  const params = new URLSearchParams(location.search);
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches || params.has('fixe');
  requestAnimationFrame(() => hero.classList.add('is-in'));

  const canvas = hero.querySelector('.hh26-scene');
  const repli = hero.querySelector('.hh26-scene-repli');
  const logoEl = hero.querySelector('.hh26-logo');
  if (!canvas) return;
  const base = (document.currentScript && document.currentScript.src) || '';
  const dossier = canvas.dataset.dossier || base.replace(/[^/]*$/, '');

  /* ── Outils ── */
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const rnd = (a, b) => a + Math.random() * (b - a);
  const lisse = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
  const ease = (t) => 1 - Math.pow(1 - clamp(t, 0, 1), 3);

  // Même carte d'encre, scène ancrée en bas avec 128 px de dispersion au-dessus.
  // La bande inférieure est recadrée dans la matière dense : mains et ordinateur restent entiers.
  const VUE = { haut: -128, bas: 520 };
  const paysage = hero.querySelector('.hh26-paysage');
  const decor = hero.querySelector('.hh26-decor');
  const reserves = decor.querySelector('.hh26-decor-reserves');
  const DECOR = { w: 1586, h: 992 };
  let reserveTexte = [0, 0, 0, 0];
  const NS = 'http://www.w3.org/2000/svg';
  function protegerDecor(ws) {
    if (W < 1100) return;
    H = hero.clientHeight;
    decor.setAttribute('viewBox', `0 0 ${W} ${H}`);
    for (const el of decor.querySelectorAll('mask, .hh26-decor-papier, image')) {
      el.setAttribute('width', W);
      el.setAttribute('height', H);
    }
    const scale = ws / SRC.w;
    const px = x => (W - ws) / 2 + x * scale;
    const py = y => H + (y - VUE.bas) * scale;
    const formes = [];
    function ellipse(x, y, rx, ry) {
      const el = document.createElementNS(NS, 'ellipse');
      el.setAttribute('cx', px(x)); el.setAttribute('cy', py(y));
      el.setAttribute('rx', rx * scale); el.setAttribute('ry', ry * scale);
      formes.push(el);
    }
    // Réserve du papier derrière chaque visage et chaque buste : aucun meuble ne traverse la peau.
    for (const tete of TETES) {
      ellipse(tete.c[0], tete.c[1], tete.r[0] * 1.20, tete.r[1] * 1.18);
      ellipse(tete.c[0], tete.c[1] + 210, tete.r[0] * 2.3, 175);
    }
    ellipse(1120, 480, 430, 105); // ordinateur, mains, table centrale
    // La réserve centrale suit les vrais éléments HTML, indépendamment des tailles de police.
    const a = hero.querySelector('.hh26-logo').getBoundingClientRect();
    const b = hero.querySelector('.hh26-bas').getBoundingClientRect();
    const h = hero.getBoundingClientRect();
    const text = hero.querySelector('.hh26-titre').getBoundingClientRect();
    const rect = document.createElementNS(NS, 'rect');
    rect.setAttribute('x', text.left - h.left - 40);
    rect.setAttribute('y', a.top - h.top - 40);
    rect.setAttribute('width', text.width + 80);
    rect.setAttribute('height', b.bottom - a.top + 80);
    rect.setAttribute('rx', 48);
    formes.push(rect);
    reserves.replaceChildren(...formes);
    reserveTexte = [
      (text.left - h.left - 48 - (W - ws) / 2) / scale,
      (a.top - h.top - 48 - H) / scale + VUE.bas,
      (text.width + 96) / scale,
      (b.bottom - a.top + 96) / scale,
    ];
  }
  let W = 0, H = 0, dpr = 1, boite = null;
  function placer() {
    W = hero.clientWidth;
    const etroit = W < 700, moyen = W < 1100;
    const ws = etroit ? W * 1.28 : moyen ? W * 1.10 : Math.min(W, 2560);
    const hs = ws / SRC.w * (VUE.bas - VUE.haut);
    hero.style.setProperty('--hh-paysage-h', `${hs}px`);
    const visible = Math.min(W, ws);
    const fen = visible / ws * SRC.w;
    H = hero.clientHeight;
    if (W >= 1100) {
      const scale = ws / SRC.w;
      // Le repère de l'équipe reste identique : le canvas s'étend simplement vers le haut et les côtés.
      boite = { left: 0, top: 0, w: W, h: H,
        sx: (SRC.w - W / scale) / 2, sw: W / scale,
        sy: VUE.bas - H / scale, sh: H / scale };
    } else {
      boite = { left: (W - visible) / 2, top: 0, w: visible, h: hs,
        sx: (SRC.w - fen) / 2, sw: fen, sy: VUE.haut, sh: VUE.bas - VUE.haut };
    }
    canvas.style.left = `${boite.left}px`;
    canvas.style.top = '0px';
    canvas.style.width = `${boite.w}px`;
    canvas.style.height = `${boite.h}px`;
    if (repli) {
      repli.style.left = `${(W - visible) / 2}px`;
      repli.style.top = 'auto';
      repli.style.width = `${visible}px`;
      repli.style.height = `${hs}px`;
      repli.style.objectPosition = '50% 100%';
    }
    dpr = Math.min(devicePixelRatio || 1, 2, Math.sqrt(5.2e6 / (boite.w * boite.h)));
    canvas.width = Math.max(1, Math.round(boite.w * dpr));
    canvas.height = Math.max(1, Math.round(boite.h * dpr));
    protegerDecor(ws);
    if (hero.classList.contains('hh26--repli')) montrerRepli();
    if (gl && W >= 1100 && !decorPrete && !decorCharge) chargerDecor();
    if (gl && (reduced || !anime)) dessiner(0);
  }

  /* ── Shader ── */
  const NT = TETES.length, NY = YEUX.length * 2, NM = MAINS.length, NB = BUSTES.length, NL = LOINTAINS.length;
  const VERT = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.0,1.0);}';
  const FRAG = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform sampler2D uEncre, uDecor;
uniform vec2 uDecorTex;
uniform vec4 uDecorFen, uReserveTexte;
uniform float uDecorPret, uExportDecor;
uniform vec2 uRes, uTex, uMouse;
uniform vec4 uFen;            // x, y, largeur, hauteur de la fenêtre dans l'illustration
uniform float uImmersion;
uniform float uTime, uIntro, uPush, uDerive, uFremit, uRespire, uBas, uHaut, uProf, uLoin, uAA;
uniform vec4 uTete[${NT}];   // centre, rayons
uniform vec4 uTeteM[${NT}];  // pivot, angle, hochement
uniform vec4 uOeil[${NY}];   // centre, rayons
uniform vec2 uOeilA[${NY}];  // cosinus, sinus de l'inclinaison
uniform float uCligne[${NY}];
uniform vec4 uMain[${NM}];
uniform vec2 uMainD[${NM}];
uniform vec4 uBuste[${NB}];
uniform vec2 uBusteD[${NB}];
uniform vec4 uLoinZ[${NL}];
uniform vec3 uBleu, uNuit;
float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
// Poids d'une zone elliptique : 1 au cœur, 0 au-delà du bord, transition douce.
float zone(vec2 p, vec4 z, float a, float b) {
  return 1.0 - smoothstep(a, b, length((p - z.xy) / z.zw));
}
// Papier central commun au groupe et au décor ; le déplacement des points reste sous ce masque.
float papierTexte(vec2 p) {
  if (uImmersion < 0.5 || abs(uExportDecor) > 0.5) return 1.0;
  vec2 d = abs(p - uReserveTexte.xy - uReserveTexte.zw * 0.5) - uReserveTexte.zw * 0.5;
  return smoothstep(0.0, 30.0, max(d.x, d.y));
}
float fonduEquipe(float y) {
  return uImmersion < 0.5 || uExportDecor < -0.5 ? 1.0 : smoothstep(-100.0, 260.0, y);
}
vec2 pointVersDecor(vec2 p) {
  return uDecorFen.xy + (p - uFen.xy) / uFen.zw * uDecorFen.zw;
}
vec4 particulesDecor(vec2 p) {
  if (uDecorPret < 0.5 || uExportDecor < -0.5) return vec4(0.0);
  float papier = papierTexte(p);
  if (papier < 0.001) return vec4(0.0);
  float reserve = 0.0;
  if (uExportDecor < 0.5) {
    for (int i = 0; i < ${NT}; i++) {
      vec4 t = uTete[i];
      reserve = max(reserve, zone(p, vec4(t.xy, t.zw * vec2(1.2, 1.18)), 0.82, 1.12));
      reserve = max(reserve, zone(p, vec4(t.xy + vec2(0.0, 210.0), t.z * 2.3, 175.0), 0.84, 1.10));
    }
    reserve = max(reserve, zone(p, vec4(1120.0, 480.0, 430.0, 105.0), 0.85, 1.12));
  }
  if (reserve > 0.999) return vec4(0.0);
  vec2 q = pointVersDecor(p);
  float dens = texture2D(uDecor, q / uDecorTex).g;
  float epars = 1.0 - smoothstep(0.10, 0.60, dens);
  // Même champ, mêmes vitesses et mêmes amplitudes que les points du groupe.
  vec2 der = vec2(noise(p * 0.03 + vec2(uTime * 0.09, 3.1)), noise(p * 0.03 + vec2(7.7, -uTime * 0.08))) - 0.5;
  vec2 fr = vec2(noise(p * 0.05 + vec2(uTime * 0.6, 1.7)), noise(p * 0.05 + vec2(5.3, -uTime * 0.55))) - 0.5;
  vec2 s = p + der * uDerive * 2.0 * epars + fr * uFremit * 2.0;
  float dispers = 1.0 - uIntro;
  vec2 arrivee = floor(p / 3.0);
  s += (vec2(hash(arrivee), hash(arrivee + 17.3)) - 0.5) * 70.0 * dispers * dispers;
  vec2 dm = p - uMouse;
  float gm = exp(-dot(dm, dm) / 9000.0);
  s += (length(dm) > 0.001 ? normalize(dm) : vec2(0.0)) * gm * uPush * 26.0 * (0.35 + 0.65 * epars);
  // Des particules fines et irrégulières remplacent les hachures du bitmap.
  float pas = 2.45;
  vec2 cellule = floor(s / pas);
  vec2 centre = (cellule + 0.5 + (vec2(hash(cellule + 9.0), hash(cellule + 31.0)) - 0.5) * 0.42) * pas;
  vec4 t = texture2D(uDecor, pointVersDecor(centre) / uDecorTex);
  float encre = mix(t.r, t.g, 0.66);
  float resp = smoothstep(0.48, 0.78, noise(p * 0.022 + vec2(-uTime * 0.07, uTime * 0.05) + 11.0));
  encre *= 1.0 - resp * uRespire * epars;
  float hauteur = (p.y - uFen.y) / uFen.w;
  float fondu = uExportDecor > 0.5 ? 1.0 : smoothstep(0.08, 0.53, hauteur);
  float garde = step(hash(cellule + 53.0), mix(0.025, 1.0, pow(fondu, 0.72)));
  float rayon = mix(0.28, 1.08, pow(encre, 0.62));
  float aa = clamp(uFen.z / uRes.x * 0.52, 0.16, 0.62);
  float a = (1.0 - smoothstep(rayon - aa, rayon + aa, length(s - centre))) * smoothstep(0.025, 0.20, encre);
  a *= garde * (0.35 + 0.65 * fondu) * smoothstep(0.0, 0.5, uIntro + 0.15);
  a *= papier * (1.0 - reserve);
  float nuit = smoothstep(0.28, 0.90, t.g) * uProf;
  vec3 col = mix(uBleu, uNuit, nuit);
  return vec4(col * a, a);
}

void main() {
  // Coordonnées dans l'illustration.
  vec2 f = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
  vec2 p = uFen.xy + f / uRes * uFen.zw;
  vec4 fond = particulesDecor(p);
  if (uExportDecor > 0.5) { gl_FragColor = fond; return; }
  if (p.x < 0.0 || p.x > uTex.x || p.y > uTex.y) { gl_FragColor = fond; return; }
  if (p.y < 0.0) {
    // Quelques points seulement dans l'air au-dessus du dessin, sans prolonger les bords de texture.
    vec2 cell = floor(p / 11.0);
    float rise = smoothstep(-128.0, 0.0, p.y);
    vec2 centre = (cell + vec2(hash(cell + 7.0), hash(cell + 19.0))) * 11.0;
    float garde = step(hash(cell + 37.0), rise * rise * 0.09);
    float a = (1.0 - smoothstep(0.45, 1.15, length(p - centre))) * garde * rise * 0.7;
    a *= smoothstep(0.0, 0.5, uIntro + 0.15);
    a *= papierTexte(p) * fonduEquipe(p.y);
    gl_FragColor = vec4(uBleu * a, a) + fond * (1.0 - a);
    return;
  }

  vec2 s = p;
  float visage = 0.0;
  // Têtes : légère rotation autour du cou (le cou ne bouge presque pas, la déformation reste continue).
  for (int i = 0; i < ${NT}; i++) {
    float w = zone(p, uTete[i], 0.72, 1.02);
    visage = max(visage, w);
    vec4 m = uTeteM[i];
    float a = -m.z * w;
    vec2 d = s - m.xy;
    s = m.xy + vec2(d.x * cos(a) - d.y * sin(a), d.x * sin(a) + d.y * cos(a));
    s.y -= m.w * w;
  }
  for (int i = 0; i < ${NB}; i++) s -= uBusteD[i] * zone(p, uBuste[i], 0.55, 1.0);
  for (int i = 0; i < ${NM}; i++) s -= uMainD[i] * zone(p, uMain[i], 0.6, 1.0);
  // Densité autour du point : les zones claires et dispersées sont celles qui vivent.
  float dens = texture2D(uEncre, s / uTex).g;
  float epars = (1.0 - smoothstep(0.1, 0.42, dens)) * (1.0 - visage);
  // Dérive lente et continue des points épars (champ de bruit lissé qui glisse doucement).
  vec2 der = vec2(noise(p * 0.03 + vec2(uTime * 0.09, 3.1)), noise(p * 0.03 + vec2(7.7, -uTime * 0.08))) - 0.5;
  s += der * uDerive * 2.0 * epars;
  // Frémissement : toute la trame ondule de 2 à 3 px, en continu, par larges plaques (les points restent ronds)
  // (bruit lissé : pas de scintillement). Les visages restent presque immobiles.
  vec2 fr = vec2(noise(p * 0.05 + vec2(uTime * 0.6, 1.7)), noise(p * 0.05 + vec2(5.3, -uTime * 0.55))) - 0.5;
  s += fr * uFremit * 2.0 * (1.0 - 0.85 * visage);
  // Arrivée : la matière se rassemble à partir de points épars.
  float dispers = 1.0 - uIntro;
  vec2 cel = floor(p / 3.0);
  s += (vec2(hash(cel), hash(cel + 17.3)) - 0.5) * 70.0 * dispers * dispers * (0.4 + 0.6 * (1.0 - visage * 0.6));
  // Curseur : écarte doucement les points épars, jamais les visages.
  vec2 dm = p - uMouse;
  float gm = exp(-dot(dm, dm) / 9000.0);
  s += (length(dm) > 0.001 ? normalize(dm) : vec2(0.0)) * gm * uPush * 26.0 * (1.0 - visage) * (0.35 + 0.65 * epars);
  vec4 t = texture2D(uEncre, s / uTex);
  float encre = t.r;
  // Respiration : quelques points épars s'effacent puis reviennent, lentement.
  float resp = smoothstep(0.48, 0.78, noise(p * 0.022 + vec2(-uTime * 0.07, uTime * 0.05) + 11.0));
  encre *= 1.0 - resp * uRespire * epars;
  // Clignements : la paupière se ferme en un trait fin, le reste de l'œil devient peau.
  // Calcul dans le repère de l'œil (incliné comme lui).
  for (int i = 0; i < ${NY}; i++) {
    float c = uCligne[i];
    if (c > 0.001) {
      vec4 o = uOeil[i];
      vec2 cs = uOeilA[i];
      vec2 d = p - o.xy;
      vec2 q = vec2(d.x * cs.x + d.y * cs.y, -d.x * cs.y + d.y * cs.x);
      // Zone effacée serrée sur l'œil, plus courte vers le haut : sourcils et montures restent intacts.
      float w = 1.0 - smoothstep(0.75, 1.0, length(vec2(q.x / (o.z * 1.08), q.y / (o.w * (q.y < 0.0 ? 0.85 : 1.4)))));
      float u = q.x / o.z;
      float ly = o.w * 0.25 - o.w * 0.3 * (1.0 - u * u);
      float paupiere = 0.95 * (1.0 - smoothstep(0.45, 1.05, abs(q.y - ly))) * (1.0 - smoothstep(0.8, 1.05, abs(u)));
      encre = mix(encre, paupiere, c * w);
    }
  }
  encre *= smoothstep(0.0, 0.5, uIntro + 0.15);
  // Impression : bords nets à toutes les tailles, sans perdre les points clairs.
  float a = smoothstep(uBas - uAA, uHaut + uAA, encre);
  // La disparition raréfie d'abord le décor et les points libres. Les traits du visage restent précis.
  float monte = smoothstep(0.0, 420.0, p.y);
  float garde = mix(0.06, 1.0, monte);
  garde = max(garde, visage * 0.985);
  garde = max(garde, smoothstep(0.3, 0.72, t.g) * 0.91);
  float seuil = hash(floor(s / 2.2) + 53.0);
  a *= smoothstep(seuil - 0.08, seuil + 0.08, garde);

  // Le cadre latéral remplace les fragments de fenêtre et de bibliothèque de la bande source.
  float bord = smoothstep(160.0, 315.0, p.x) * (1.0 - smoothstep(1750.0, 1910.0, p.x));
  a *= mix(1.0, max(bord, visage), uImmersion);
  // Deux bleus : masses denses et second plan en bleu nuit, lumière et détails en bleu électrique.
  float loin = 0.0;
  for (int i = 0; i < ${NL}; i++) loin = max(loin, zone(p, uLoinZ[i], 0.4, 1.0));
  float nuit = clamp(smoothstep(0.42, 0.9, t.g) * uProf + loin * uLoin * smoothstep(0.15, 0.5, t.g), 0.0, 0.85);
  vec3 col = mix(uBleu, uNuit, nuit);
  // Le dessin de l'équipe reste entier (22 oct. 2026) : ni fondu vertical ni réserve du texte sur les personnes,
  // sinon le haut des deux têtes centrales, les plus hautes, s'efface. Fondu et réserve restent sur le décor
  // et sur les points épars au-dessus du dessin.
  gl_FragColor = vec4(col * a, a) + fond * (1.0 - a);
}`;

  let gl = null, U = {}, tex = null, texPrete = false;
  let texDecor = null, decorPrete = false, decorCharge = false, exportDecor = 0;
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
      if (!c.getShaderParameter(o, c.COMPILE_STATUS)) console.warn('hero-equipe', c.getShaderInfoLog(o));
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
    const noms = ['uDecor', 'uDecorTex', 'uDecorFen', 'uReserveTexte', 'uDecorPret', 'uExportDecor', 'uImmersion', 'uEncre', 'uRes', 'uTex', 'uMouse', 'uFen', 'uTime', 'uIntro', 'uPush', 'uDerive', 'uFremit', 'uRespire', 'uBas', 'uHaut', 'uProf', 'uLoin', 'uAA', 'uBleu', 'uNuit',
      'uTete', 'uTeteM', 'uOeil', 'uOeilA', 'uCligne', 'uMain', 'uMainD', 'uBuste', 'uBusteD', 'uLoinZ'];
    U = {};
    for (const n of noms) U[n] = c.getUniformLocation(prog, n) || c.getUniformLocation(prog, `${n}[0]`);
    c.uniform1i(U.uEncre, 0);
    c.uniform1i(U.uDecor, 1);
    c.uniform2f(U.uDecorTex, DECOR.w, DECOR.h);
    c.uniform2f(U.uTex, SRC.w, SRC.h);
    c.uniform3f(U.uBleu, 57 / 255, 116 / 255, 247 / 255);
    c.uniform3f(U.uNuit, 23 / 255, 27 / 255, 73 / 255);
    const v4 = (list) => new Float32Array(list.flatMap((z) => [z.c[0], z.c[1], z.r[0], z.r[1]]));
    c.uniform4fv(U.uTete, v4(TETES));
    c.uniform4fv(U.uOeil, v4(YEUX.flat()));
    c.uniform2fv(U.uOeilA, new Float32Array(YEUX.flat().flatMap((o) => [Math.cos((o.a * Math.PI) / 180), Math.sin((o.a * Math.PI) / 180)])));
    c.uniform4fv(U.uMain, v4(MAINS));
    c.uniform4fv(U.uBuste, v4(BUSTES));
    c.uniform4fv(U.uLoinZ, v4(LOINTAINS));
    c.enable(c.BLEND);
    c.blendFunc(c.ONE, c.ONE_MINUS_SRC_ALPHA);
    tex = c.createTexture();
    c.bindTexture(c.TEXTURE_2D, tex);
    c.texParameteri(c.TEXTURE_2D, c.TEXTURE_MIN_FILTER, c.LINEAR);
    c.texParameteri(c.TEXTURE_2D, c.TEXTURE_MAG_FILTER, c.LINEAR);
    c.texParameteri(c.TEXTURE_2D, c.TEXTURE_WRAP_S, c.CLAMP_TO_EDGE);
    c.texParameteri(c.TEXTURE_2D, c.TEXTURE_WRAP_T, c.CLAMP_TO_EDGE);
    texDecor = c.createTexture();
    c.activeTexture(c.TEXTURE1);
    c.bindTexture(c.TEXTURE_2D, texDecor);
    c.texParameteri(c.TEXTURE_2D, c.TEXTURE_MIN_FILTER, c.LINEAR);
    c.texParameteri(c.TEXTURE_2D, c.TEXTURE_MAG_FILTER, c.LINEAR);
    c.texParameteri(c.TEXTURE_2D, c.TEXTURE_WRAP_S, c.CLAMP_TO_EDGE);
    c.texParameteri(c.TEXTURE_2D, c.TEXTURE_WRAP_T, c.CLAMP_TO_EDGE);
    c.texImage2D(c.TEXTURE_2D, 0, c.RGBA, 1, 1, 0, c.RGBA, c.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]));
    c.activeTexture(c.TEXTURE0);
    decorPrete = false;
    decorCharge = false;
    return c;
  }

  /* ── Les personnages : chaque geste a son propre rythme, avec des pauses ── */
  const now0 = performance.now() / 1000;
  const tetes = TETES.map((t, i) => ({ a: 0, a0: 0, a1: 0, n: 0, n0: 0, n1: 0, t0: 0, dur: 1, prochain: now0 + 2.5 + i * 2.6 + rnd(0, 4) }));
  const paupieres = YEUX.map(() => ({ t0: -10, double: false, prochain: now0 + rnd(1.2, 5.5) }));
  const mains = MAINS.map((m, i) => ({ x: 0, y: 0, x0: 0, y0: 0, x1: 0, y1: 0, t0: 0, dur: 1, prochain: now0 + 3 + i * 2 + rnd(0, 3), tape: 0 }));
  const bustes = BUSTES.map(() => ({ y: 0, y0: 0, y1: 0, t0: 0, dur: 1, prochain: now0 + rnd(4, 9) }));
  // Courbe d'un clignement (s) : fermeture rapide, réouverture un peu plus lente.
  const cligne = (dt) => (dt < 0 ? 0 : dt < 0.07 ? dt / 0.07 : dt < 0.1 ? 1 : dt < 0.22 ? 1 - (dt - 0.1) / 0.12 : 0);

  function vivre(T) {
    const vie = REGLAGES.vie;
    // Têtes : au plus deux bougent en même temps ; petites inclinaisons vers l'écran ou un collègue.
    let enMouvement = tetes.filter((h) => T < h.t0 + h.dur).length;
    tetes.forEach((h, i) => {
      if (T >= h.prochain && enMouvement < 2) {
        h.a0 = h.a;
        h.n0 = h.n;
        const vers = TETES[i].vers;
        h.a1 = (Math.random() < 0.7 ? vers : -vers) * rnd(0.004, 0.022) * (Math.random() < 0.25 ? 0 : 1);
        h.n1 = rnd(-1.2, 1.4);
        h.t0 = T;
        h.dur = rnd(1.3, 2.4);
        h.prochain = T + h.dur + rnd(7, 16);
        enMouvement++;
      }
      const k = lisse((T - h.t0) / h.dur);
      h.a = h.a0 + (h.a1 - h.a0) * k;
      h.n = h.n0 + (h.n1 - h.n0) * k;
    });
    // Paupières : chacun cligne à son rythme, parfois deux fois de suite.
    const cl = new Float32Array(NY);
    paupieres.forEach((e, i) => {
      if (T >= e.prochain) {
        e.t0 = T;
        e.double = Math.random() < 0.18;
        e.prochain = T + rnd(3.2, 8);
      }
      const dt = T - e.t0;
      const v = Math.max(cligne(dt), e.double ? cligne(dt - 0.3) : 0);
      cl[i * 2] = v;
      cl[i * 2 + 1] = v;
    });
    // Main qui désigne l'écran : s'avance vers lui, marque un temps, revient.
    const m0 = mains[0];
    if (T >= m0.prochain) {
      m0.t0 = T;
      m0.dur = rnd(2.4, 3.2);
      m0.prochain = T + m0.dur + rnd(5, 10);
    }
    {
      const d = (T - m0.t0) / m0.dur;
      const k = d < 0 || d > 1 ? 0 : d < 0.3 ? lisse(d / 0.3) : d < 0.6 ? 1 : 1 - lisse((d - 0.6) / 0.4);
      m0.x = 2.6 * k;
      m0.y = 2.2 * k;
    }
    // Main au menton : un très léger frottement, rarement.
    const m1 = mains[1];
    if (T >= m1.prochain) {
      m1.t0 = T;
      m1.dur = rnd(1.6, 2.2);
      m1.prochain = T + m1.dur + rnd(7, 13);
    }
    {
      const d = (T - m1.t0) / m1.dur;
      const k = d < 0 || d > 1 ? 0 : Math.sin(d * Math.PI);
      m1.x = 0.9 * k;
      m1.y = -0.7 * k;
    }
    // Clavier : quelques frappes, puis une pause.
    const m2 = mains[2];
    if (T >= m2.prochain) {
      m2.t0 = T;
      m2.tape = 3 + Math.floor(Math.random() * 4);
      m2.dur = m2.tape * 0.24;
      m2.prochain = T + m2.dur + rnd(3.5, 8);
    }
    {
      const d = T - m2.t0;
      const k = d < 0 || d > m2.dur ? 0 : Math.pow(Math.abs(Math.sin((d / 0.24) * Math.PI)), 3);
      m2.x = 0;
      m2.y = 0.9 * k;
    }
    // Bustes : un réajustement de posture de temps en temps.
    bustes.forEach((b) => {
      if (T >= b.prochain) {
        b.y0 = b.y;
        b.y1 = rnd(-0.9, 0.9);
        b.t0 = T;
        b.dur = rnd(2.2, 3.4);
        b.prochain = T + b.dur + rnd(6, 14);
      }
      b.y = b.y0 + (b.y1 - b.y0) * lisse((T - b.t0) / b.dur);
    });
    const tm = new Float32Array(NT * 4);
    TETES.forEach((t, i) => {
      tm.set([t.pivot[0], t.pivot[1], tetes[i].a * vie, tetes[i].n * vie], i * 4);
    });
    gl.uniform4fv(U.uTeteM, tm);
    gl.uniform1fv(U.uCligne, vie ? cl : new Float32Array(NY));
    gl.uniform2fv(U.uMainD, new Float32Array(mains.flatMap((m) => [m.x * vie, m.y * vie])));
    gl.uniform2fv(U.uBusteD, new Float32Array(bustes.flatMap((b) => [0, b.y * vie])));
  }
  function immobile() {
    const tm = new Float32Array(NT * 4);
    TETES.forEach((t, i) => tm.set([t.pivot[0], t.pivot[1], 0, 0], i * 4));
    gl.uniform4fv(U.uTeteM, tm);
    gl.uniform1fv(U.uCligne, new Float32Array(NY));
    gl.uniform2fv(U.uMainD, new Float32Array(NM * 2));
    gl.uniform2fv(U.uBusteD, new Float32Array(NB * 2));
  }

  /* ── Curseur (souris et stylet ; au doigt, on fait défiler) ── */
  const ptr = { x: -1e4, y: -1e4, tx: -1e4, ty: -1e4, on: 0, speed: 0, push: 0 };
  hero.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch' || !boite || REGLAGES.curseur <= 0 || reduced) return;
    const r = canvas.getBoundingClientRect();
    const x = boite.sx + ((e.clientX - r.left) / r.width) * boite.sw;
    const y = (boite.sy || 0) + ((e.clientY - r.top) / r.height) * (boite.sh || SRC.h);
    if (ptr.on) ptr.speed = Math.min(1, ptr.speed + Math.hypot(x - ptr.tx, y - ptr.ty) / 400);
    else { ptr.x = x; ptr.y = y; }
    ptr.tx = x;
    ptr.ty = y;
    ptr.on = 1;
  });
  hero.addEventListener('pointerleave', () => (ptr.on = 0));

  /* ── Rendu ── */
  let clock = 0, intro = 0, t0 = 0, anime = false;
  function dessiner(T) {
    if (!gl || !texPrete || !boite) return;
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, texDecor);
    gl.activeTexture(gl.TEXTURE0);
    gl.uniform1f(U.uDecorPret, decorPrete && W >= 1100 ? 1 : 0);
    gl.uniform1f(U.uExportDecor, exportDecor);
    gl.uniform4fv(U.uReserveTexte, reserveTexte);
    const cover = Math.max(boite.w / DECOR.w, boite.h / DECOR.h);
    const dw = boite.w / cover, dh = boite.h / cover;
    gl.uniform4f(U.uDecorFen, exportDecor ? 0 : (DECOR.w - dw) / 2, exportDecor ? 0 : (DECOR.h - dh) / 2, exportDecor ? DECOR.w : dw, exportDecor ? DECOR.h : dh);
    gl.uniform2f(U.uRes, canvas.width, canvas.height);
    gl.uniform4f(U.uFen, boite.sx, boite.sy || 0, boite.sw, boite.sh || SRC.h);
    // Largeur d'un pixel écran en encre : plus l'illustration est réduite, plus le bord s'adoucit.
    const pxSrc = boite.sw / canvas.width;
    gl.uniform1f(U.uImmersion, W >= 1100 ? 1 : 0);
    gl.uniform1f(U.uAA, clamp(pxSrc * 0.16, 0.02, 0.2));
    gl.uniform1f(U.uBas, REGLAGES.seuilBas);
    gl.uniform1f(U.uHaut, REGLAGES.seuilHaut);
    gl.uniform1f(U.uProf, REGLAGES.profondeur);
    gl.uniform1f(U.uLoin, REGLAGES.lointain);
    gl.uniform1f(U.uTime, T);
    gl.uniform1f(U.uIntro, anime ? intro : 1);
    gl.uniform1f(U.uDerive, anime ? REGLAGES.derive : 0);
    gl.uniform1f(U.uFremit, anime ? REGLAGES.fremissement : 0);
    gl.uniform1f(U.uRespire, anime ? REGLAGES.respiration : REGLAGES.respiration * 0.25);
    gl.uniform2f(U.uMouse, ptr.x, ptr.y);
    gl.uniform1f(U.uPush, ptr.push * REGLAGES.curseur);
    if (anime) vivre(performance.now() / 1000);
    else immobile();
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  let visible = true, raf = 0, last = 0;
  const lent = window.matchMedia('(pointer: coarse)').matches; // téléphones et tablettes : 30 images/s
  function frame(now) {
    raf = 0;
    if (!visible || document.hidden || !gl) return;
    if (lent && last && now - last < 31) {
      raf = requestAnimationFrame(frame);
      return;
    }
    const dt = Math.min(0.05, (now - (last || now)) / 1000);
    last = now;
    clock += dt;
    intro = ease((now - t0 - 200) / 2400);
    ptr.x += (ptr.tx - ptr.x) * 0.12;
    ptr.y += (ptr.ty - ptr.y) * 0.12;
    ptr.speed *= 0.94;
    const cible = ptr.on ? 0.25 + 0.75 * ptr.speed : 0;
    ptr.push += (cible - ptr.push) * 0.06;
    dessiner(clock);
    raf = requestAnimationFrame(frame);
  }
  function start() {
    if (!gl || !texPrete) return;
    if (!anime) {
      dessiner(0);
      return;
    }
    if (!raf) {
      last = 0;
      raf = requestAnimationFrame(frame);
    }
  }

  gl = initGL();
  anime = !!gl && !reduced;
  if (!gl) {
    montrerRepli(); // sans WebGL : l'image fixe prend le relais
  } else {
    canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      gl = null;
      montrerRepli();
    });
    canvas.addEventListener('webglcontextrestored', () => {
      gl = initGL();
      texPrete = false;
      hero.classList.remove('hh26--decor-pret');
      chargerDecor();
      charger();
    });
  }
  // L'image fixe n'est téléchargée que si elle sert (sans WebGL, ou carte d'encre introuvable).
  function montrerRepli() {
    chargerDecorRepli();
    if (repli && W > 0) {
      const fichier = W >= 1100 ? repli.dataset.srcDesktop : repli.dataset.src;
      if (fichier && repli.getAttribute('src') !== fichier) repli.src = fichier;
    }
    hero.classList.add('hh26--repli');
  }
  function charger() {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      if (!gl) return;
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      texPrete = true;
      t0 = params.has('sansintro') ? -1e9 : performance.now();
      hero.classList.remove('hh26--repli');
      hero.classList.add('hh26--scene-prete');
      start();
    };
    img.onerror = montrerRepli;
    img.src = canvas.dataset.encre || `${dossier}../hero-equipe-2026/equipe-arc-encre.webp`;
  }
  function chargerDecorRepli() {
    const image = decor.querySelector('image');
    if (image && !image.getAttribute('href') && image.dataset.src) image.setAttribute('href', image.dataset.src);
  }
  // Conversion du décor en carte d'encre, en mémoire : aucune nouvelle image de personnes.
  function chargerDecor() {
    if (!gl || decorCharge || decorPrete || W < 1100) return;
    decorCharge = true;
    const contexte = gl;
    const texture = texDecor;
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => {
      if (gl !== contexte) return;
      try {
        const plan = document.createElement('canvas');
        plan.width = DECOR.w; plan.height = DECOR.h;
        const ctx = plan.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(image, 0, 0, DECOR.w, DECOR.h);
        const pixels = ctx.getImageData(0, 0, DECOR.w, DECOR.h);
        const p = pixels.data;
        for (let i = 0; i < p.length; i += 4) {
          const encre = Math.round(p[i + 3] * (0.30 + 0.70 * (1.0 - p[i] / 255)));
          p[i] = p[i + 1] = p[i + 2] = encre;
          p[i + 3] = 255;
        }
        ctx.putImageData(pixels, 0, 0);
        const flou = document.createElement('canvas');
        flou.width = DECOR.w; flou.height = DECOR.h;
        const fc = flou.getContext('2d', { willReadFrequently: true });
        fc.filter = 'blur(3px)';
        fc.drawImage(plan, 0, 0);
        const local = fc.getImageData(0, 0, DECOR.w, DECOR.h).data;
        for (let i = 0; i < p.length; i += 4) { p[i + 1] = local[i]; p[i + 2] = 0; }
        ctx.putImageData(pixels, 0, 0);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, plan);
        gl.activeTexture(gl.TEXTURE0);
        decorPrete = true;
        hero.classList.add('hh26--decor-pret');
        start();
      } catch (error) {
        chargerDecorRepli();
        console.warn('hero-equipe: décor de repli', error.message);
      }
    };
    image.onerror = chargerDecorRepli;
    image.src = canvas.dataset.decor || `${dossier}../hero-equipe-immersion-2026/decor-bureau.webp`;
  }

  let placementRaf = 0;
  function planifierPlacement() {
    if (placementRaf) return;
    placementRaf = requestAnimationFrame(() => { placementRaf = 0; placer(); });
  }
  new ResizeObserver(planifierPlacement).observe(hero);
  window.addEventListener('resize', placer, { passive: true });
  if (logoEl) new ResizeObserver(planifierPlacement).observe(logoEl);
  if (paysage) new ResizeObserver(planifierPlacement).observe(paysage);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(placer);
  placer();
  if (gl) charger();
  new IntersectionObserver((entries) => {
    for (const en of entries) visible = en.isIntersecting;
    if (visible) start();
  }).observe(hero);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) start();
  });
  // Les textes finissent d'apparaître (décalage vertical de 14 px) : on recale la scène.
  setTimeout(placer, 1500);

  // Pour les vérifications : déclencher un geste à la demande (ex. HWSHeroEquipe.cligner(2)).
  const maintenant = () => performance.now() / 1000;
  window.HWSHeroEquipe = {
    REGLAGES, TETES, YEUX, MAINS, VUE, placer, get boite() { return boite; },
    get decorPret() { return decorPrete; }, get temps() { return clock; },
    capturer: (temps = clock) => { if (!gl || !texPrete) return ''; dessiner(temps); return canvas.toDataURL('image/png'); },
    exporterDecor: () => {
      if (!gl || !decorPrete) return '';
      const saved = { b: boite, w: canvas.width, h: canvas.height, anime, exportDecor };
      boite = { left: 0, top: 0, w: DECOR.w, h: DECOR.h, sx: 0, sy: 0, sw: SRC.w, sh: SRC.w * DECOR.h / DECOR.w };
      canvas.width = DECOR.w * 2; canvas.height = DECOR.h * 2;
      anime = false; exportDecor = 1;
      dessiner(0);
      const url = canvas.toDataURL('image/png');
      boite = saved.b; canvas.width = saved.w; canvas.height = saved.h;
      anime = saved.anime; exportDecor = saved.exportDecor;
      dessiner(clock);
      return url;
    },
    cligner: (i) => { paupieres[i].t0 = maintenant(); paupieres[i].double = false; paupieres[i].prochain = maintenant() + 30; },
    designer: () => { mains[0].t0 = maintenant(); mains[0].dur = 2.8; mains[0].prochain = maintenant() + 30; },
    pencher: (i, angle, hoche) => { const h = tetes[i]; h.a0 = h.a; h.n0 = h.n; h.a1 = angle; h.n1 = hoche || 0; h.t0 = maintenant(); h.dur = 1.6; h.prochain = maintenant() + 30; },
    // Image de repli (equipe-arc-repli.webp) : la scène entière, fixe, à deux fois sa taille.
    exporterRepli: () => {
      if (!gl || !texPrete) return '';
      const sauve = { b: boite, w: canvas.width, h: canvas.height, anime, exportDecor };
      boite = { ...boite, sx: 0, sw: SRC.w, sy: VUE.haut, sh: VUE.bas - VUE.haut };
      canvas.width = SRC.w * 2;
      canvas.height = (VUE.bas - VUE.haut) * 2;
      anime = false;
      exportDecor = -1;
      dessiner(0);
      const url = canvas.toDataURL('image/png');
      boite = sauve.b;
      canvas.width = sauve.w;
      canvas.height = sauve.h;
      anime = sauve.anime;
      exportDecor = sauve.exportDecor;
      dessiner(clock);
      return url;
    },
    figer: () => { tetes.forEach((h) => (h.prochain = 1e9)); paupieres.forEach((e) => (e.prochain = 1e9)); mains.forEach((m) => (m.prochain = 1e9)); bustes.forEach((b) => (b.prochain = 1e9)); },
  };
})();
