/* HWS — Collaboration, petits écrans : les curseurs animés restent hors du texte et du bouton.
   Les scripts du site tirent leurs positions au hasard en évitant un rectangle fixe au centre,
   trop petit en mobile. Ici, toute position qui tomberait sur le contenu est renvoyée dans la
   bande libre au-dessus ou au-dessous. Les scripts du site ne sont pas modifiés.
   À reporter dans Webflow avec le script des curseurs (collabcursors). */
(() => {
  const mq = matchMedia('(max-width: 767px)');
  const sec = document.getElementById('collab');
  const content = sec && sec.querySelector('.collab-content');
  if (!sec || !content) return;
  const ids = ['fc-maxime', 'fc-gregory', 'fc-steven', 'fc-pierre', 'fc-bruno', 'fc-guenole'];

  // Chaque curseur garde sa bande (trois en haut, trois en bas) : ses trajets ne croisent jamais le texte.
  function keepClear(el, side) {
    if (!mq.matches) return;
    const y = parseFloat(el.style.top);
    if (Number.isNaN(y)) return;
    const s = sec.getBoundingClientRect();
    const c = content.getBoundingClientRect();
    const h = el.offsetHeight || 60;
    const top = c.top - s.top - 24;       // zone réservée au texte, avec une marge
    const bottom = c.bottom - s.top + 24;
    const up = top - h - 16 > 40 ? [16, top - h - 16] : null;
    const down = s.height - h - 16 - bottom > 40 ? [bottom, s.height - h - 16] : null;
    const band = (side === 'up' ? up || down : down || up);
    if (!band) {
      el.style.visibility = 'hidden';
      return;
    }
    if (y >= band[0] && y <= band[1]) return;
    el.style.top = `${Math.round(band[0] + Math.random() * (band[1] - band[0]))}px`;
  }

  ids.forEach((id, i) => {
    const el = document.getElementById(id);
    if (!el) return;
    const side = i < ids.length / 2 ? 'up' : 'down';
    new MutationObserver(() => keepClear(el, side)).observe(el, { attributes: true, attributeFilter: ['style'] });
    keepClear(el, side);
  });
})();
