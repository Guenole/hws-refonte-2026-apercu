/*
 * HWS Agency 2026 — page projet, v3 (template CMS Webflow « Projets »).
 * Tout le contenu est natif Webflow (liaisons, listes de collection, texte riche, visibilité conditionnelle).
 * Seul script : la vidéo, même comportement que les scripts déjà en production (hwsprojetvideocore, volume, plein écran) :
 * lecture muette quand elle est visible, pause, son, plein écran ; rien n'est chargé avant d'être vu.
 */
(() => {
  'use strict';
  const page = document.querySelector('.pj26');
  if (!page) return;
  const reduit = window.matchMedia('(prefers-reduced-motion: reduce)');

  const cadre = page.querySelector('.pj26-video');
  const src = cadre && cadre.querySelector('.pj26-video-src:not(.w-dyn-bind-empty)');
  if (cadre && src && src.getAttribute('href') && src.getAttribute('href') !== '#') {
    const video = cadre.querySelector('video');
    const bLecture = cadre.querySelector('[data-pj26="lecture"]');
    const bSon = cadre.querySelector('[data-pj26="son"]');
    const bPlein = cadre.querySelector('[data-pj26="plein"]');
    const economie = navigator.connection && navigator.connection.saveData;
    let voulue = !reduit.matches && !economie;
    let chargee = false;
    const charger = () => { if (!chargee) { video.src = src.getAttribute('href'); chargee = true; } };
    const lire = () => { charger(); video.play().then(() => cadre.classList.add('is-lue')).catch(() => {}); };
    const maj = () => {
      bLecture.setAttribute('aria-pressed', String(!video.paused));
      bLecture.setAttribute('aria-label', video.paused ? 'Lire la vidéo' : 'Mettre la vidéo en pause');
    };
    video.addEventListener('play', maj);
    video.addEventListener('pause', maj);
    bLecture.addEventListener('click', () => { if (video.paused) { voulue = true; lire(); } else { voulue = false; video.pause(); } });
    bSon.addEventListener('click', () => {
      video.muted = !video.muted;
      if (!video.muted && video.volume === 0) video.volume = 0.5;
      bSon.setAttribute('aria-pressed', String(!video.muted));
      bSon.setAttribute('aria-label', video.muted ? 'Activer le son' : 'Couper le son');
      if (video.paused) { voulue = true; lire(); }
    });
    const enPlein = () => document.fullscreenElement || document.webkitFullscreenElement;
    bPlein.addEventListener('click', () => {
      if (enPlein()) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
      else if (cadre.requestFullscreen) cadre.requestFullscreen();
      else if (cadre.webkitRequestFullscreen) cadre.webkitRequestFullscreen();
      else if (video.webkitEnterFullscreen) { charger(); video.webkitEnterFullscreen(); }
    });
    const majPlein = () => { bPlein.setAttribute('aria-pressed', String(!!enPlein())); bPlein.setAttribute('aria-label', enPlein() ? 'Quitter le plein écran' : 'Plein écran'); };
    document.addEventListener('fullscreenchange', majPlein);
    document.addEventListener('webkitfullscreenchange', majPlein);
    new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { if (voulue) lire(); } else if (!video.paused) video.pause();
    }, { threshold: 0.35 }).observe(cadre);
  }
})();
