(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const KEY = 'entre-nous-v1';
  const byId = new Map(CARDS.map(card => [card.id, card]));
  const fresh = () => ({ names: ['', ''], level: 0, player: 0, round: 1, completed: 0, started: false, current: null, seen: [], favorites: [] });
  let state = fresh();
  let consent = false;
  let timerId = null;
  let remaining = 30;
  let timerEnd = 0;
  let toastId;
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    if (saved && typeof saved === 'object') {
      state.names = [0, 1].map(i => typeof saved.names?.[i] === 'string' ? saved.names[i].slice(0, 24) : '');
      state.level = Number.isInteger(saved.level) && saved.level >= 0 && saved.level < 4 ? saved.level : 0;
      state.player = saved.player === 1 ? 1 : 0;
      for (const key of ['round', 'completed']) state[key] = Number.isSafeInteger(saved[key]) && saved[key] >= (key === 'round' ? 1 : 0) ? saved[key] : state[key];
      for (const key of ['seen', 'favorites']) state[key] = Array.isArray(saved[key]) ? [...new Set(saved[key].filter(id => byId.has(id)))] : [];
      state.current = byId.has(saved.current) ? saved.current : null;
      state.started = saved.started === true;
    }
  } catch { /* Storage is optional. */ }

  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* Still playable in private browsing. */ } }
  function name(i) { return state.names[i].trim() || `Joueur ${i + 1}`; }
  function toast(message) { clearTimeout(toastId); $('toast').textContent = message; $('toast').classList.add('visible'); toastId = setTimeout(() => $('toast').classList.remove('visible'), 3800); }
  function stopTimer() {
    clearInterval(timerId); timerId = null; remaining = 30;
    $('timer-label').textContent = 'Minuteur 30 s';
    $('timer-toggle').setAttribute('aria-label', 'Démarrer un minuteur de 30 secondes');
  }
  function render() {
    document.body.classList.toggle('started', state.started && consent);
    document.querySelectorAll('.mood').forEach(button => { const active = Number(button.dataset.level) === state.level; button.classList.toggle('active', active); button.setAttribute('aria-pressed', String(active)); });
    const card = consent ? byId.get(state.current) : null;
    const game = $('game-card');
    game.dataset.level = card?.level ?? state.level;
    game.classList.toggle('has-card', !!card);
    $('card-art').hidden = !!card;
    $('card-subtext').hidden = !!card;
    $('favorite').hidden = !card;
    $('draw-controls').hidden = !!card;
    $('answer-controls').hidden = !card;
    $('timer-toggle').hidden = !card || card.type !== 'dare';
    $('restart').hidden = !state.started;
    $('favorites-count').textContent = state.favorites.length;
    $('round-label').textContent = state.started && consent ? `TOUR ${String(state.round).padStart(2, '0')}` : 'LE PREMIER PAS ?';
    const label = $('turn-label');
    label.replaceChildren();
    const dot = document.createElement('i'); dot.className = `player-dot ${state.player ? 'two' : 'one'}`; label.append(dot, document.createTextNode(state.started && consent ? `À toi, ${name(state.player)}` : 'À vous deux de jouer'));
    $('card-kind').textContent = card ? (card.type === 'truth' ? 'VÉRITÉ' : 'ACTION') : 'LE JEU À DEUX';
    $('card-kicker').textContent = card ? `POUR ${name(state.player).toLocaleUpperCase('fr')}` : 'DÉCONNECTEZ. RECONNECTEZ-VOUS.';
    if (card) $('card-text').textContent = card.text;
    else { $('card-text').replaceChildren(document.createTextNode('Ce soir,'), document.createElement('br')); const em = document.createElement('em'); em.textContent = 'on se choisit.'; $('card-text').append(em); }
    $('card-mood').textContent = DECKS[card?.level ?? state.level].name.toLocaleUpperCase('fr');
    $('card-number').firstChild.textContent = card ? `N° ${String(state.round).padStart(2, '0')} ` : `${String(state.level + 1).padStart(2, '0')} / 04 `;
    $('favorite').setAttribute('aria-pressed', String(!!card && state.favorites.includes(card.id)));
    $('favorite').setAttribute('aria-label', card && state.favorites.includes(card.id) ? 'Retirer la carte des favoris' : 'Ajouter la carte aux favoris');
    $('progress-label').textContent = state.started && consent ? `${state.completed} carte${state.completed > 1 ? 's' : ''} jouée${state.completed > 1 ? 's' : ''} · À votre rythme` : `${CARDS.length} cartes pour sortir du quotidien`;
    $('mobile-settings').setAttribute('aria-expanded', String($('setup').classList.contains('expanded')));
  }
  function ensureConsent() {
    if (consent) return true;
    $('setup').classList.add('expanded');
    $('adult-consent').focus();
    $('adult-consent').closest('label').classList.add('attention');
    toast('Confirmez que vous êtes tous les deux adultes et partants pour jouer.');
    return false;
  }
  function pick(type) {
    if (!ensureConsent() || state.current) return;
    const selectedType = type === 'random' ? (Math.random() < 0.5 ? 'truth' : 'dare') : type;
    const pool = CARDS.filter(card => card.level === state.level && card.type === selectedType);
    let available = pool.filter(card => !state.seen.includes(card.id));
    if (!available.length) { const ids = new Set(pool.map(card => card.id)); state.seen = state.seen.filter(id => !ids.has(id)); available = pool; toast('Toutes ces cartes ont été découvertes : on remélange !'); }
    const card = available[Math.floor(Math.random() * available.length)];
    state.current = card.id; state.seen.push(card.id); state.started = true;
    $('setup').classList.remove('expanded');
    stopTimer(); save(); render();
    $('game-card').classList.remove('reveal'); void $('game-card').offsetWidth; $('game-card').classList.add('reveal');
    if (window.matchMedia('(max-width: 740px)').matches) document.querySelector('.play-topline').scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
  }
  function next(completed) {
    if (!state.current || !consent) return;
    stopTimer();
    if (completed) state.completed++;
    state.current = null; state.player = 1 - state.player; state.round++;
    save(); render();
    toast(completed ? `À ${name(state.player)} de choisir une carte.` : `Carte passée, sans pression. À ${name(state.player)} !`);
  }
  document.querySelectorAll('[data-draw]').forEach(button => button.addEventListener('click', () => pick(button.dataset.draw)));
  document.querySelectorAll('.mood').forEach(button => button.addEventListener('click', () => {
    state.level = Number(button.dataset.level); save(); render();
    if (state.current && consent) toast(`Ambiance ${DECKS[state.level].name} pour la prochaine carte.`);
  }));
  [0, 1].forEach(i => { $(`name-${i}`).value = state.names[i]; $(`name-${i}`).addEventListener('input', event => { state.names[i] = event.target.value.slice(0, 24); save(); render(); }); });
  $('adult-consent').addEventListener('change', event => { consent = event.target.checked; event.target.closest('label').classList.remove('attention'); stopTimer(); render(); });
  $('skip').addEventListener('click', () => next(false));
  $('done').addEventListener('click', () => next(true));
  $('favorite').addEventListener('click', () => {
    if (!state.current || !consent) return;
    const index = state.favorites.indexOf(state.current);
    if (index < 0) state.favorites.push(state.current); else state.favorites.splice(index, 1);
    save(); render(); toast(index < 0 ? 'Cette carte reste dans vos favoris.' : 'Carte retirée des favoris.');
  });
  $('timer-toggle').addEventListener('click', () => {
    if (timerId) { stopTimer(); return; }
    remaining = 30; timerEnd = Date.now() + 30000;
    $('timer-label').textContent = '0:30 · arrêter';
    $('timer-toggle').setAttribute('aria-label', 'Arrêter le minuteur');
    timerId = setInterval(() => {
      remaining = Math.max(0, Math.ceil((timerEnd - Date.now()) / 1000));
      $('timer-label').textContent = `0:${String(remaining).padStart(2, '0')} · arrêter`;
      if (!remaining) { stopTimer(); $('timer-label').textContent = 'Temps écoulé · rejouer'; toast('Les 30 secondes sont écoulées. Prenez votre temps.'); }
    }, 250);
  });
  $('mobile-settings').addEventListener('click', () => { $('setup').classList.toggle('expanded'); render(); if ($('setup').classList.contains('expanded')) $('setup').scrollIntoView({behavior: 'smooth', block: 'start'}); });
  $('rules-open').addEventListener('click', () => $('rules-dialog').showModal());
  $('restart').addEventListener('click', () => $('restart-dialog').showModal());
  $('restart-confirm').addEventListener('click', () => { stopTimer(); state = { ...fresh(), names: state.names, level: state.level, favorites: state.favorites }; save(); render(); $('restart-dialog').close(); toast('Une nouvelle soirée commence.'); });
  function renderFavorites() {
    const list = $('favorites-list'); list.replaceChildren();
    if (!consent) { const p = document.createElement('p'); p.textContent = 'Confirmez d’abord que vous avez tous les deux 18 ans ou plus dans les réglages du jeu.'; list.append(p); return; }
    if (!state.favorites.length) { const p = document.createElement('p'); p.textContent = 'Pas encore de coup de cœur. Touchez le petit cœur sur une carte pour la retrouver ici.'; list.append(p); }
    [...state.favorites].reverse().forEach(id => {
      const card = byId.get(id); const item = document.createElement('article'); item.className = 'saved-card';
      const meta = document.createElement('small'); meta.textContent = `${DECKS[card.level].name.toLocaleUpperCase('fr')} · ${card.type === 'truth' ? 'VÉRITÉ' : 'ACTION'}`;
      const p = document.createElement('p'); p.textContent = card.text;
      const remove = document.createElement('button'); remove.textContent = 'Retirer'; remove.setAttribute('aria-label', `Retirer des favoris : ${card.text}`);
      remove.addEventListener('click', () => { state.favorites = state.favorites.filter(value => value !== id); save(); render(); renderFavorites(); });
      item.append(meta, p, remove); list.append(item);
    });
  }
  $('favorites-open').addEventListener('click', () => { renderFavorites(); $('favorites-dialog').showModal(); });
  document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => button.closest('dialog').close()));
  document.querySelectorAll('dialog').forEach(dialog => dialog.addEventListener('click', event => { if (event.target !== dialog) return; const bounds = dialog.getBoundingClientRect(); if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close(); }));
  window.addEventListener('pagehide', stopTimer);
  render();
})();
