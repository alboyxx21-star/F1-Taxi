/* Safe progressive enhancement for the pricing cards.
   It only touches .pricing__dest and leaves calculator/menu/map scripts alone. */
document.addEventListener('DOMContentLoaded', () => {
  /* Category lives on the markup (data-cat), so filtering never depends on
     matching accented place names in JS. */
  const cards = [...document.querySelectorAll('.pricing__dest')];
  const filters = [...document.querySelectorAll('.f1-dest-filter')];
  const search = document.querySelector('#dest-search');
  const empty = document.querySelector('#dest-empty');

  // Fold accents so "durres" finds "Durrës".
  const norm = (s) => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

  const apply = () => {
    const query = norm(search?.value);
    const active = document.querySelector('.f1-dest-filter.is-active')?.dataset.filter;
    let shown = 0;

    cards.forEach((card) => {
      const place = norm(card.querySelector('span')?.textContent);
      // A search spans every category; an empty box falls back to the pills.
      const match = query ? place.includes(query) : card.dataset.cat === active;
      card.classList.toggle('is-hidden', !match);
      if (match) shown++;
    });

    // While searching, no pill represents what's on screen.
    filters.forEach((f) => f.classList.toggle('is-muted', !!query));
    if (empty) empty.hidden = shown > 0;
  };

  filters.forEach((filter) => {
    filter.addEventListener('click', () => {
      document.querySelector('.f1-dest-filter.is-active')?.classList.remove('is-active');
      filter.classList.add('is-active');
      if (search) search.value = ''; // picking a category clears the search
      apply();
    });
  });

  search?.addEventListener('input', apply);
  if (cards.length) apply();
  document.querySelectorAll('.pricing__dest').forEach((card) => {
    let startX = 0;
    let startY = 0;
    let moved = false;

    const setTilt = (event) => {
      const bounds = card.getBoundingClientRect();
      const x = Math.max(0, Math.min(bounds.width, event.clientX - bounds.left));
      const y = Math.max(0, Math.min(bounds.height, event.clientY - bounds.top));
      card.style.setProperty('--rx', `${((.5 - y / bounds.height) * 10).toFixed(2)}deg`);
      card.style.setProperty('--ry', `${((x / bounds.width - .5) * 10).toFixed(2)}deg`);
      card.style.setProperty('--x', `${(x / bounds.width * 100).toFixed(0)}%`);
      card.style.setProperty('--y', `${(y / bounds.height * 100).toFixed(0)}%`);
    };
    const reset = () => {
      card.classList.remove('is-tilting');
      card.style.setProperty('--rx', '0deg');
      card.style.setProperty('--ry', '0deg');
    };

    card.addEventListener('pointermove', (event) => {
      if (event.pointerType !== 'mouse' && !card.classList.contains('is-tilting')) return;
      if (card.classList.contains('is-tilting') && Math.hypot(event.clientX - startX, event.clientY - startY) > 9) moved = true;
      setTilt(event);
    });
    card.addEventListener('pointerenter', () => card.classList.add('is-tilting'));
    card.addEventListener('pointerleave', reset);
    card.addEventListener('pointerdown', (event) => {
      startX = event.clientX;
      startY = event.clientY;
      moved = false;
      card.classList.add('is-tilting');
      setTilt(event);
    });
    card.addEventListener('pointerup', reset);
    card.addEventListener('pointercancel', reset);
  });
});


