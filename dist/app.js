(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const screen = $('screen');
  const KEY = 'entre-nous-v1';
  const LEVELS = [
    { name: 'Soft', icon: 'soft-art', subtitle: 'Commencez en douceur', title: 'Commencez en douceur', description: 'Des questions pour se redécouvrir, des attentions tendres et de la proximité. Prenez le temps de vous retrouver, de rire et de vous surprendre. Le meilleur début, c’est celui qui vous fait envie à tous les deux.' },
    { name: 'Hot', icon: 'hot-art', subtitle: 'Faites monter la température !', title: 'Faites monter la température !', description: 'Place aux baisers, au flirt et aux confidences sur ce qui vous attire. Explorez votre complicité et vos envies, avec des défis sensuels à proposer à votre partenaire. Chacun garde le choix, à chaque instant.' },
    { name: 'Hard', icon: 'hard-art', subtitle: 'Augmentez la tension !', title: 'Augmentez la tension !', description: 'Parlez plus librement de votre désir et de votre vie intime. Les questions deviennent plus personnelles, les invitations plus audacieuses. Dites ce qui vous plaît, ce qui vous tente et ce que vous préférez garder pour une autre fois.' },
    { name: 'Extrême', icon: 'extreme-art', subtitle: 'Vos envies, vos règles', title: 'Osez, à votre rythme.', description: 'Votre niveau le plus intime pour exprimer vos envies et imaginer la suite à deux. Définissez ensemble vos limites et un mot pour faire une pause. Aucune carte n’est une obligation. Vous pouvez aussi ajouter vos propres défis pour personnaliser ce niveau.' }
  ];
  const TABS = [ ['challenges', 'Défis', 'heart'], ['dice', 'Dés', 'dice'], ['cards', 'Cartes', 'cards'], ['quiz', 'Quiz', 'quiz'], ['profile', 'Profil', 'user'] ];
  const fresh = () => ({ names: ['', ''], mode: 'random', pauseWord: 'Pause', ownOnly: false, seen: [], favorites: [], customs: [], game: null, lastPlayer: 1 });
  let state = fresh();
  let adult = false;
  let tab = 'challenges';
  let view = 'home';
  let introLevel = 0;
  let libraryTab = 'favorites';
  let spinning = false;
  let spinTimeout;
  let toastTimeout;
  let timer = null;
  let timerEnd = 0;
  let timerRemaining = 30;
  let adultCallback = null;
  let diceReceiver = 0;
  let diceResult = null;
  let diceRolling = false;
  let diceTimeout;
  let quiz = null;
  const esc = value => String(value).replace(/[&<>"']/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[ch]));
  const icon = (name, classes = '') => `<svg class="${classes}" aria-hidden="true"><use href="#${name}"/></svg>`;
  const playerName = i => state.names[i].trim() || (i === 0 ? 'Joueur 1' : 'Joueur 2');
  const allCards = () => [...CARDS, ...state.customs];
  const cardById = id => allCards().find(card => card.id === id);
  const validLevel = level => Number.isInteger(level) && level >= 0 && level < 4;
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    if (saved && typeof saved === 'object') {
      state.names = [0,1].map(i => typeof saved.names?.[i] === 'string' ? saved.names[i].slice(0,24) : '');
      state.mode = saved.mode === 'alternate' ? 'alternate' : 'random';
      state.pauseWord = typeof saved.pauseWord === 'string' && saved.pauseWord.trim() ? saved.pauseWord.slice(0,30) : 'Pause';
      state.ownOnly = saved.ownOnly === true;
      state.lastPlayer = saved.lastPlayer === 0 ? 0 : 1;
      if (Array.isArray(saved.customs)) state.customs = saved.customs.filter(c => c && typeof c.id === 'string' && c.id.startsWith('custom-') && validLevel(c.level) && ['truth','dare'].includes(c.type) && typeof c.text === 'string' && c.text.trim()).slice(0,500).map(c => ({ id:c.id.slice(0,90), level:c.level, type:c.type, text:c.text.slice(0,400) }));
      const ids = new Set(allCards().map(c => c.id));
      for (const key of ['seen','favorites']) if (Array.isArray(saved[key])) state[key] = [...new Set(saved[key].filter(id => ids.has(id)))];
      const g = saved.game;
      if (g && validLevel(g.level)) {
        state.game = { level:g.level, stage:['wheel','choice','card'].includes(g.stage) ? g.stage : 'wheel', player:g.player === 1 ? 1 : 0, round:Number.isSafeInteger(g.round) && g.round > 0 ? g.round : 1, current:ids.has(g.current) ? g.current : null };
        if (state.game.stage === 'card' && !state.game.current) state.game.stage = 'wheel';
      }
    }
  } catch { /* Game remains playable without browser storage. */ }
  try { adult = sessionStorage.getItem('entre-nous-adult') === 'yes'; } catch {}
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {} }
  function setAdult(value) { adult = value; try { sessionStorage.setItem('entre-nous-adult', value ? 'yes' : 'no'); } catch {} }
  function toast(message) { clearTimeout(toastTimeout); $('toast').textContent = message; $('toast').classList.add('visible'); toastTimeout = setTimeout(() => $('toast').classList.remove('visible'), 3800); }
  function scrollTop() { window.scrollTo({top:0,behavior:'instant'}); }
  function showModal(html) { $('modal-content').innerHTML = html; if (!$('modal').open) $('modal').showModal(); }
  function closeModal() { $('modal').close(); adultCallback = null; }
  function stopTimer() { clearInterval(timer); timer = null; timerRemaining = 30; const label = $('timer-label'); if (label) label.textContent = tab === 'dice' && diceResult ? `Lancer le minuteur · ${diceResult.seconds} s` : 'Minuteur 30 s'; }
  function timerLabel() { return timer ? `${Math.floor(timerRemaining / 60)}:${String(timerRemaining % 60).padStart(2,'0')} · arrêter` : 'Minuteur 30 s'; }
  function startTimer(seconds = 30) {
    if (timer) { stopTimer(); return; }
    timerRemaining = seconds; timerEnd = Date.now() + seconds * 1000;
    const tick = () => {
      timerRemaining = Math.max(0, Math.ceil((timerEnd - Date.now()) / 1000));
      const label = $('timer-label'); if (label) label.textContent = timerLabel();
      if (!timerRemaining) { stopTimer(); if ($('timer-label')) $('timer-label').textContent = 'Temps écoulé · relancer'; toast('Temps écoulé. Rien ne presse, prenez votre temps.'); }
    };
    timer = setInterval(tick,250); tick();
  }
  function requireAdult(callback) {
    if (adult) { callback(); return; }
    adultCallback = callback;
    showModal(`<h2 class="modal-title">Un moment entre adultes.</h2><p class="modal-copy">Ce jeu est réservé aux personnes de 18 ans et plus. Chaque geste se propose avec l’accord de l’autre.</p><form data-form="adult"><label class="consent-row"><input type="checkbox" name="adult" required><span>Nous avons tous les deux 18 ans ou plus et envie de jouer.</span></label><button class="primary wide" type="submit">Continuer</button></form>`);
  }
  function header(title, subtitle) { return `<header class="topbar"><div><p class="brand-eyebrow">ENTRE NOUS · 18+</p><h1 tabindex="-1">${title}</h1></div><button class="icon-button" data-action="${tab === 'profile' ? 'rules' : 'profile'}" aria-label="${tab === 'profile' ? 'Les règles du jeu' : 'Modifier les joueurs'}">${icon(tab === 'profile' ? 'quiz' : 'people')}</button></header>${subtitle ? `<p class="page-subtitle">${subtitle}</p>` : ''}`; }
  function immersiveHeader(title = '', favorite = false) { return `<header class="immersive-header"><button class="icon-button" data-action="home" aria-label="Retour aux niveaux">${icon('back')}</button>${title ? `<h1>${title}</h1>` : '<span></span>'}${favorite ? `<button class="icon-button ${state.favorites.includes(state.game?.current) ? 'favorite-active' : ''}" data-action="favorite" aria-label="${state.favorites.includes(state.game?.current) ? 'Retirer des favoris' : 'Ajouter aux favoris'}" aria-pressed="${state.favorites.includes(state.game?.current)}">${icon('heart')}</button>` : '<span class="header-spacer"></span>'}</header>`; }
  function nav() {
    const immersive = tab === 'challenges' && view !== 'home';
    $('bottom-nav').hidden = immersive;
    $('bottom-nav').innerHTML = TABS.map(([id,label,symbol]) => `<button class="nav-button ${tab === id ? 'active' : ''}" data-action="tab" data-tab="${id}" ${tab === id ? 'aria-current="page"' : ''}>${icon(symbol)}<span>${label}</span></button>`).join('');
    document.body.classList.toggle('playing', immersive);
  }
  function homePage() {
    return `<main class="page fade-in">${header('Défis coquins')} ${state.game ? `<button class="resume" data-action="resume">${icon('cards')} Reprendre · ${LEVELS[state.game.level].name} · Tour ${state.game.round}<span>↗</span></button>` : ''}<div class="intro-banner"><div><strong>Ce soir, on joue à deux.</strong><p>${state.names.some(n => n.trim()) ? `${esc(playerName(0))} &amp; ${esc(playerName(1))}` : 'Un téléphone. Vos envies. Le hasard.'}<br>Une carte à la fois, à votre rythme.</p></div>${icon('spark')}</div><p class="section-caption">Choisissez votre niveau</p><section class="level-list" aria-label="Niveaux de jeu">${LEVELS.map((level,i) => `<button class="level-button" data-action="level" data-level="${i}">${icon(level.icon,'art')}<span><strong>${level.name}</strong><small>${level.subtitle}</small></span></button>`).join('')}</section><section class="own-section"><label class="switch-row"><span>Jouer avec vos défis uniquement</span><input id="own-only" type="checkbox" role="switch" ${state.ownOnly ? 'checked' : ''}></label><button class="custom-banner" data-action="customs">${icon('spark','art')}<span><strong>Vos défis</strong><small>Personnalisez votre expérience</small></span></button></section><p class="home-note">Tout se propose, rien ne s’impose.<br>Un défi ne vous plaît pas ? Passez-le, sans pénalité.</p></main>`;
  }
  function introPage() {
    const level = LEVELS[introLevel];
    return `<main class="immersive fade-in" data-level="${introLevel}">${immersiveHeader(level.name)}<section class="intro-content">${icon(level.icon,'intro-level-art')}<h2>${level.title}</h2><p>${level.description}</p>${introLevel === 3 ? `<div class="pause-word">Votre mot-pause : <strong>${esc(state.pauseWord)}</strong></div>` : ''}${!adult ? '<label class="consent-row"><input type="checkbox" id="intro-adult"><span>Nous avons tous les deux 18 ans ou plus et envie de jouer.</span></label>' : ''}<button class="primary wide" data-action="launch">Lancer la partie</button><p class="quiet-note">${state.ownOnly ? 'Vos cartes personnelles uniquement.' : '30 cartes par niveau · Questions intimes & défis sensuels.'}<br>Arrêtez ou passez à tout moment.</p></section></main>`;
  }
  function wheelPage() {
    const g = state.game; const level = LEVELS[g.level];
    return `<main class="immersive wheel-view fade-in" data-level="${g.level}">${immersiveHeader()}<div class="level-heading">${icon(level.icon,'art')}<h1>${level.name}</h1><p>${state.mode === 'alternate' ? 'Chacun son tour' : 'Qui va se laisser surprendre ?'}</p></div><section class="wheel-block" aria-label="Roue des joueurs"><div class="rings"></div><div class="wheel-orbit"><button class="player-bubble" data-action="choose-player" data-player="0" aria-label="Choisir ${esc(playerName(0))}">${esc(playerName(0))}</button><button class="player-bubble second" data-action="choose-player" data-player="1" aria-label="Choisir ${esc(playerName(1))}">${esc(playerName(1))}</button></div><button class="go" data-action="spin" aria-label="Tourner la roue">GO</button></section><p class="wheel-hint" id="wheel-hint">Touchez GO pour lancer la roue.<br>Ou choisissez directement un prénom.</p><p class="wheel-round">TOUR ${String(g.round).padStart(2,'0')} · ${level.name.toUpperCase()}</p></main>`;
  }
  function choicePage() {
    const g = state.game;
    return `<main class="immersive choice-view fade-in" data-level="${g.level}"><div class="choice-stage"><button class="choice-button" data-action="draw" data-type="dare">Action<small>Un défi à oser à deux</small></button><div class="choice-center"><div class="rings"></div><div class="choice-name">${esc(playerName(g.player))}</div></div><button class="choice-button truth" data-action="draw" data-type="truth">Vérité<small>Une confidence à partager</small></button></div><div class="choice-mini">${esc(LEVELS[g.level].name.toUpperCase())} · À TOI DE CHOISIR</div>${immersiveHeader()}</main>`;
  }
  function promptPage() {
    const g = state.game; const card = cardById(g.current);
    if (!card) { g.stage = 'wheel'; return wheelPage(); }
    return `<main class="immersive prompt-page fade-in" data-level="${g.level}">${immersiveHeader(card.type === 'truth' ? 'Vérité' : 'Action',true)}<p class="prompt-meta">${esc(LEVELS[g.level].name.toUpperCase())} · POUR ${esc(playerName(g.player).toLocaleUpperCase('fr'))}</p><article class="prompt-card" aria-live="polite"><h2>${esc(card.text)}</h2></article><div class="prompt-footer"><span>Tour ${g.round} ${card.id.startsWith('custom-') ? '· Votre défi' : ''}</span>${card.type === 'dare' ? `<button class="timer-button" data-action="timer">${icon('clock')}<span id="timer-label">${timerLabel()}</span></button>` : ''}</div><div class="prompt-actions"><button class="secondary" data-action="next" data-done="false">Passer ↗</button><button class="primary" data-action="next" data-done="true">C’est fait ${icon('check')}</button></div><p class="prompt-footnote">Vous pouvez changer d’avis à tout moment.<br>Mot-pause : ${esc(state.pauseWord)}.</p></main>`;
  }
  function libraryPage() {
    const cards = libraryTab === 'favorites' ? [...state.favorites].reverse().map(cardById).filter(Boolean) : [...state.customs].reverse();
    return `<main class="page fade-in">${header('Vos cartes','Les cartes qui vous plaisent. Les défis que vous inventez.')}<div class="library-tabs"><button class="${libraryTab === 'favorites' ? 'active' : ''}" data-action="library" data-library="favorites">Favoris · ${state.favorites.length}</button><button class="${libraryTab === 'customs' ? 'active' : ''}" data-action="library" data-library="customs">Vos défis · ${state.customs.length}</button></div>${libraryTab === 'customs' ? `<button class="primary wide" data-action="add-custom">${icon('plus')} Créer un défi</button><p class="quiet-note">Ajoutez vos propres actions et vérités à chacun des niveaux.</p>` : ''}<div style="margin-top:20px">${cards.length ? cards.map(card => `<article class="library-card"><button class="card-preview" data-action="preview" data-id="${esc(card.id)}"><small>${LEVELS[card.level].name.toUpperCase()} · ${card.type === 'dare' ? 'ACTION' : 'VÉRITÉ'}</small><p>${esc(card.text)}</p></button><div class="card-row-actions">${libraryTab === 'customs' ? `<button data-action="edit-custom" data-id="${esc(card.id)}">Modifier</button><button data-action="delete-custom" data-id="${esc(card.id)}">Supprimer</button>` : `<button data-action="unfavorite" data-id="${esc(card.id)}">Retirer des favoris</button>`}</div></article>`).join('') : `<div class="empty-state">${icon(libraryTab === 'favorites' ? 'heart' : 'spark')}<p>${libraryTab === 'favorites' ? 'Pas encore de coup de cœur.<br>Touchez le cœur sur une carte pendant la partie<br>pour la retrouver ici.' : 'Votre imagination a sa place ici.<br>Créez votre première carte pour commencer.'}</p></div>`}</div></main>`;
  }
  const DICE_ACTIONS = ['Un baiser, si vous en avez envie', 'Un massage des mains', 'Des compliments sincères', 'Un câlin tout doux', 'Une danse rapprochée', 'Un regard sans un mot'];
  const DICE_TIMES = [15,20,30,45,60,90];
  function dicePage() {
    return `<main class="page fade-in">${header('Les dés du désir','Un geste, un peu de temps et un moment juste pour vous.')}<p class="subheading">Qui reçoit l’attention ?</p><div class="dice-options">${[0,1].map(i => `<button class="player-chip ${diceReceiver === i ? 'active' : ''}" data-action="dice-player" data-player="${i}" aria-pressed="${diceReceiver === i}">${esc(playerName(i))}</button>`).join('')}</div><div class="dice-area ${diceRolling ? 'dice-spinning' : ''}"><div class="die">${icon(diceResult ? 'heart' : 'dice')}<strong>${diceResult ? ['Baiser','Massage','Compliments','Câlin','Danse','Regard'][diceResult.action] : 'Le geste'}</strong><small>Dé n° 1</small></div><div class="die">${icon('clock')}<strong>${diceResult ? `${diceResult.seconds} s` : 'Le temps'}</strong><small>Dé n° 2</small></div></div><p class="dice-result" aria-live="polite">${diceResult ? `${DICE_ACTIONS[diceResult.action]}<br>pour <strong>${esc(playerName(diceReceiver))}</strong>, pendant ${diceResult.seconds} secondes.` : 'Laissez les dés vous donner une idée.<br>Vous décidez ensemble de la réaliser.'}</p><button class="primary wide" data-action="roll-dice" ${diceRolling ? 'disabled' : ''}>${icon('dice')} ${diceResult ? 'Relancer les dés' : 'Lancer les dés'}</button>${diceResult ? `<button class="secondary wide" data-action="dice-timer" style="margin-top:13px">${icon('clock')}<span id="timer-label">${timer ? timerLabel() : `Lancer le minuteur · ${diceResult.seconds} s`}</span></button>` : ''}<p class="home-note">Chaque geste se propose avec l’accord de l’autre.<br>Vous pouvez relancer aussi souvent que vous le souhaitez.</p></main>`;
  }
  const QUIZ_QUESTIONS = ['Quel est mon rendez-vous idéal ?', 'Quel petit geste me fait me sentir aimé·e ?', 'Quelle chanson me fait penser à nous ?', 'Qu’est-ce qui me fait le plus craquer chez toi ?', 'Quelle ambiance me plaît pour une soirée intime ?', 'Quel type de baiser est mon préféré ?', 'Quelle surprise romantique me ferait plaisir ?', 'Quel souvenir de nous deux aimerais-je revivre ?', 'Quel compliment me fait me sentir désirable ?', 'Où aimerais-je partir en amoureux ?', 'Quelle activité voudrais-je essayer avec toi ?', 'Comment est-ce que je préfère recevoir de la tendresse ?'];
  function quizPage() {
    let content;
    if (!quiz) content = `<div class="quiz-intro-art">${icon('quiz')}</div><section class="panel"><h2>Tu me connais vraiment ?</h2><p>8 questions, à tour de rôle. L’un écrit sa réponse en secret, l’autre essaie de la deviner. Révélez vos réponses et accordez un point quand vous êtes d’accord.</p><p>Aucune réponse ne part sur un serveur. Elles disparaissent à la fermeture de la page.</p></section><button class="primary wide" data-action="quiz-start">Commencer le quiz</button>`;
    else if (quiz.phase === 'finished') content = `<div class="handoff">${icon('heart')}<h2>Vous avez encore<br>des choses à découvrir.</h2><div class="score-row">${[0,1].map(i => `<div><strong>${quiz.scores[i]}</strong><span>${esc(playerName(i))}<br>sur 4 points</span></div>`).join('')}</div><p>Le meilleur résultat ?<br>Avoir pris le temps de se parler.</p><button class="primary wide" data-action="quiz-start">Rejouer</button></div>`;
    else {
      const writer = quiz.index % 2; const guesser = 1 - writer; const question = quiz.questions[quiz.index];
      const progress = `<div class="quiz-progress"><span style="width:${quiz.index / 8 * 100}%"></span></div><p class="quiz-eyebrow">QUESTION ${quiz.index + 1} / 8</p>`;
      if (quiz.phase === 'write') content = `${progress}<p class="page-subtitle" style="margin-top:19px">${esc(playerName(writer))}, réponds en secret.</p><h2 class="quiz-question">${question}</h2><form data-form="quiz-write"><label class="field-label" for="quiz-answer">Ta réponse · ${esc(playerName(guesser))} ne regarde pas</label><textarea class="text-input" id="quiz-answer" name="answer" maxlength="200" placeholder="Écris ta réponse ici…" required></textarea><button class="primary wide" style="margin-top:23px" type="submit">Cacher ma réponse et continuer</button></form>`;
      else if (quiz.phase === 'handoff') content = `${progress}<section class="handoff">${icon('people')}<h2>Passe le téléphone<br>à ${esc(playerName(guesser))}.</h2><p>La réponse de ${esc(playerName(writer))} est cachée.<br>À toi de deviner !</p><button class="primary wide" data-action="quiz-ready">J’ai le téléphone</button></section>`;
      else if (quiz.phase === 'guess') content = `${progress}<p class="page-subtitle" style="margin-top:19px">${esc(playerName(guesser))}, que répondrait ${esc(playerName(writer))} ?</p><h2 class="quiz-question">${question}</h2><form data-form="quiz-guess"><label class="field-label" for="quiz-guess">À ton avis…</label><textarea class="text-input" id="quiz-guess" name="guess" maxlength="200" placeholder="Essaie de deviner…" required></textarea><button class="primary wide" style="margin-top:23px" type="submit">Révéler nos réponses</button></form>`;
      else content = `${progress}<h2 class="quiz-question">${question}</h2><div class="answer-box"><small>LA RÉPONSE DE ${esc(playerName(writer).toLocaleUpperCase('fr'))}</small><p>${esc(quiz.answer)}</p></div><div class="answer-box"><small>CE QUE ${esc(playerName(guesser).toLocaleUpperCase('fr'))} AVAIT DEVINÉ</small><p>${esc(quiz.guess)}</p></div><p class="page-subtitle" style="margin:24px 0 16px">Est-ce que ça correspond ? Décidez ensemble.</p><div class="prompt-actions"><button class="secondary" data-action="quiz-score" data-correct="false">Pas tout à fait</button><button class="primary" data-action="quiz-score" data-correct="true">Oui, +1 point ${icon('check')}</button></div>`;
    }
    return `<main class="page fade-in">${header('Le quiz à deux')}${content}</main>`;
  }
  function profilePage() {
    return `<main class="page fade-in">${header('Votre duo','Votre jeu, vos prénoms, votre rythme.')}<form data-form="profile"><section class="panel"><h2>Qui joue ce soir ?</h2><label class="field-label" for="profile-name-0">Joueur 1</label><input class="text-input" id="profile-name-0" name="name0" maxlength="24" placeholder="Ton prénom" value="${esc(state.names[0])}" autocomplete="off"><label class="field-label" for="profile-name-1">Joueur 2</label><input class="text-input" id="profile-name-1" name="name1" maxlength="24" placeholder="Son prénom" value="${esc(state.names[1])}" autocomplete="off"></section><section class="panel"><h2>Qui la roue choisit-elle ?</h2><label class="radio-row"><input type="radio" name="mode" value="random" ${state.mode === 'random' ? 'checked' : ''}>Au hasard, à chaque tour</label><label class="radio-row"><input type="radio" name="mode" value="alternate" ${state.mode === 'alternate' ? 'checked' : ''}>Chacun son tour</label><label class="field-label" for="pause-word">Votre mot pour faire une pause</label><input class="text-input" id="pause-word" name="pauseWord" maxlength="30" value="${esc(state.pauseWord)}"><p class="profile-note">Dites-le pour arrêter immédiatement le défi. Un simple « non » suffit aussi.</p></section><label class="consent-row" style="margin-bottom:23px"><input name="adult" type="checkbox" ${adult ? 'checked' : ''}><span>Nous avons tous les deux 18 ans ou plus et envie de jouer.</span></label><button class="primary wide" type="submit">Enregistrer</button></form><button class="secondary wide" data-action="rules" style="margin-top:14px">Les règles du jeu</button><p class="home-note">Vos prénoms, vos défis et vos favoris restent dans ce navigateur.<br>Le jeu se partage sur le même téléphone.</p></main>`;
  }
  function render() {
    nav();
    if (tab === 'challenges') {
      if (view !== 'home' && view !== 'intro' && !state.game) view = 'home';
      screen.innerHTML = view === 'intro' ? introPage() : view === 'wheel' ? wheelPage() : view === 'choice' ? choicePage() : view === 'card' ? promptPage() : homePage();
    } else screen.innerHTML = tab === 'dice' ? dicePage() : tab === 'cards' ? libraryPage() : tab === 'quiz' ? quizPage() : profilePage();
  }
  function goHome() { clearTimeout(spinTimeout); spinning = false; stopTimer(); tab = 'challenges'; view = 'home'; render(); scrollTop(); }
  function launch() {
    if (!adult) { const check = $('intro-adult'); if (!check?.checked) { toast('Confirmez que vous êtes tous les deux adultes et partants.'); check?.focus(); return; } setAdult(true); }
    if (state.ownOnly && !state.customs.some(card => card.level === introLevel)) { toast('Ajoutez un défi pour ce niveau ou désactivez « vos défis uniquement ».'); customEditor(null,introLevel); return; }
    stopTimer(); state.game = {level:introLevel,stage:'wheel',player:0,round:1,current:null}; state.lastPlayer = 1; view = 'wheel'; save(); render(); scrollTop();
  }
  function choosePlayer(i) { state.game.player = i; state.game.stage = 'choice'; state.game.current = null; view = 'choice'; save(); render(); scrollTop(); }
  function spin() {
    if (spinning || !state.game) return;
    spinning = true;
    const selected = state.mode === 'alternate' ? 1 - state.lastPlayer : Math.floor(Math.random() * 2);
    const angle = 1080 + (selected ? 315 : 135);
    const orbit = screen.querySelector('.wheel-orbit');
    orbit.style.setProperty('--rotation',`${angle}deg`); orbit.style.setProperty('--counter',`${-angle}deg`);
    screen.querySelector('.go').disabled = true;
    screen.querySelectorAll('.player-bubble').forEach(button => button.disabled = true);
    $('wheel-hint').textContent = 'Le hasard choisit…';
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    spinTimeout = setTimeout(() => { spinning = false; choosePlayer(selected); },reduced ? 150 : 2350);
  }
  function draw(type) {
    if (!state.game || !['truth','dare'].includes(type)) return;
    const g = state.game;
    const pool = (state.ownOnly ? state.customs : allCards()).filter(card => card.level === g.level && card.type === type);
    if (!pool.length) { toast(`Aucune ${type === 'truth' ? 'vérité' : 'action'} personnelle dans ce niveau. Ajoutez-en une dans « Vos défis ».`); return; }
    let available = pool.filter(card => !state.seen.includes(card.id));
    if (!available.length) { const ids = new Set(pool.map(card => card.id)); state.seen = state.seen.filter(id => !ids.has(id)); available = pool; toast('Toutes ces cartes ont été vues : on remélange !'); }
    const card = available[Math.floor(Math.random() * available.length)];
    state.seen.push(card.id); g.current = card.id; g.stage = 'card'; view = 'card'; stopTimer(); save(); render(); scrollTop();
  }
  function nextRound(done) { if (!state.game) return; stopTimer(); state.lastPlayer = state.game.player; state.game.round++; state.game.stage = 'wheel'; state.game.current = null; view = 'wheel'; save(); render(); scrollTop(); if (!done) toast('Carte passée. Sans pénalité, sans justification.'); }
  function customEditor(id = null, level = state.game?.level ?? introLevel) {
    const card = state.customs.find(c => c.id === id);
    showModal(`<h2 class="modal-title">${card ? 'Modifier votre défi' : 'Un défi à votre façon.'}</h2><p class="modal-copy">Écrivez une action ou une vérité. Elle sera conservée uniquement dans ce navigateur.</p><form data-form="custom"><input type="hidden" name="id" value="${esc(card?.id || '')}"><div class="form-pair"><div><label class="field-label" for="custom-type">Type</label><select class="select-input" name="type" id="custom-type"><option value="dare" ${card?.type === 'dare' ? 'selected' : ''}>Action</option><option value="truth" ${card?.type === 'truth' ? 'selected' : ''}>Vérité</option></select></div><div><label class="field-label" for="custom-level">Niveau</label><select class="select-input" name="level" id="custom-level">${LEVELS.map((item,i) => `<option value="${i}" ${(card?.level ?? level) === i ? 'selected' : ''}>${item.name}</option>`).join('')}</select></div></div><label class="field-label" for="custom-text">Votre carte</label><textarea class="text-input" id="custom-text" name="text" required maxlength="400" placeholder="Votre idée, avec vos mots…">${esc(card?.text || '')}</textarea><button class="primary wide" type="submit">${card ? 'Enregistrer les modifications' : 'Ajouter le défi'}</button></form>`);
  }
  function showRules() {
    showModal(`<h2 class="modal-title">À deux, à votre rythme.</h2><div class="modal-rule"><strong>1. Choisissez votre niveau</strong>Soft, Hot, Hard ou Extrême. Chaque niveau a ses propres cartes.</div><div class="modal-rule"><strong>2. Lancez la roue</strong>GO choisit un joueur. Vous pouvez aussi toucher un prénom, ou choisir l’alternance dans Profil.</div><div class="modal-rule"><strong>3. Action ou Vérité ?</strong>La personne choisie sélectionne son défi ou sa question. Touchez le cœur pour garder une carte.</div><div class="modal-rule"><strong>4. Tout se propose</strong>Demandez l’accord de l’autre avant un geste. Passez ou arrêtez à tout moment. Votre mot-pause : ${esc(state.pauseWord)}.</div><p class="modal-copy">Jeu réservé aux adultes de 18 ans et plus. Questions intimes et défis sensuels sans descriptions sexuelles explicites.</p><button class="primary wide" data-action="close-modal">C’est compris</button>`);
  }
  function startQuiz() { quiz = {phase:'write',index:0,questions:[...QUIZ_QUESTIONS].sort(() => Math.random() - .5).slice(0,8),answer:'',guess:'',scores:[0,0]}; render(); scrollTop(); }
  function rollDice() {
    if (diceRolling) return; stopTimer(); diceRolling = true; render();
    diceTimeout = setTimeout(() => { diceResult = {action:Math.floor(Math.random() * DICE_ACTIONS.length),seconds:DICE_TIMES[Math.floor(Math.random() * DICE_TIMES.length)]}; diceRolling = false; if (tab === 'dice') render(); },window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 80 : 700);
  }
  document.addEventListener('click', event => {
    const button = event.target.closest('[data-action]'); if (!button || button.disabled) return;
    const action = button.dataset.action;
    if (action === 'close-modal') { closeModal(); return; }
    if (action === 'tab') { clearTimeout(spinTimeout); spinning = false; stopTimer(); tab = button.dataset.tab; if (tab === 'challenges') view = 'home'; render(); scrollTop(); }
    else if (action === 'profile') { stopTimer(); tab = 'profile'; render(); scrollTop(); }
    else if (action === 'rules') showRules();
    else if (action === 'home') goHome();
    else if (action === 'level') { introLevel = Number(button.dataset.level); view = 'intro'; render(); scrollTop(); }
    else if (action === 'launch') launch();
    else if (action === 'resume') requireAdult(() => { view = state.game.stage; tab = 'challenges'; render(); scrollTop(); });
    else if (action === 'spin') requireAdult(spin);
    else if (action === 'choose-player' && !spinning) requireAdult(() => choosePlayer(Number(button.dataset.player)));
    else if (action === 'draw') requireAdult(() => draw(button.dataset.type));
    else if (action === 'next') nextRound(button.dataset.done === 'true');
    else if (action === 'favorite') { const id = state.game?.current; if (!id) return; if (state.favorites.includes(id)) state.favorites = state.favorites.filter(value => value !== id); else state.favorites.push(id); save(); render(); }
    else if (action === 'timer') startTimer();
    else if (action === 'customs') { tab = 'cards'; libraryTab = 'customs'; render(); scrollTop(); }
    else if (action === 'library') { libraryTab = button.dataset.library; render(); }
    else if (action === 'add-custom') customEditor();
    else if (action === 'edit-custom') customEditor(button.dataset.id);
    else if (action === 'delete-custom') { const card = cardById(button.dataset.id); if (card) showModal(`<h2 class="modal-title">Supprimer ce défi ?</h2><p class="modal-copy">${esc(card.text)}</p><p class="modal-copy">Il sera retiré de votre jeu et de vos favoris.</p><button class="primary wide" data-action="confirm-delete" data-id="${esc(card.id)}">Supprimer ce défi</button><button class="secondary" data-action="close-modal">Garder le défi</button>`); }
    else if (action === 'confirm-delete') { const id = button.dataset.id; state.customs = state.customs.filter(c => c.id !== id); state.favorites = state.favorites.filter(value => value !== id); state.seen = state.seen.filter(value => value !== id); if (state.game?.current === id) { state.game.current = null; state.game.stage = 'wheel'; } save(); closeModal(); render(); toast('Votre défi a été supprimé.'); }
    else if (action === 'unfavorite') { state.favorites = state.favorites.filter(value => value !== button.dataset.id); save(); render(); }
    else if (action === 'preview') requireAdult(() => { const card = cardById(button.dataset.id); if (card) showModal(`<p class="quiz-eyebrow">${LEVELS[card.level].name.toUpperCase()} · ${card.type === 'dare' ? 'ACTION' : 'VÉRITÉ'}</p><p class="modal-prompt">${esc(card.text)}</p><button class="primary wide" data-action="close-modal">Fermer la carte</button>`); });
    else if (action === 'dice-player') { stopTimer(); diceReceiver = Number(button.dataset.player); render(); }
    else if (action === 'roll-dice') requireAdult(rollDice);
    else if (action === 'dice-timer') startTimer(diceResult?.seconds || 30);
    else if (action === 'quiz-start') requireAdult(startQuiz);
    else if (action === 'quiz-ready' && quiz?.phase === 'handoff') { quiz.phase = 'guess'; render(); scrollTop(); }
    else if (action === 'quiz-score' && quiz?.phase === 'reveal') { if (button.dataset.correct === 'true') quiz.scores[1 - quiz.index % 2]++; quiz.index++; quiz.answer = ''; quiz.guess = ''; quiz.phase = quiz.index >= 8 ? 'finished' : 'write'; render(); scrollTop(); }
  });
  document.addEventListener('change', event => { if (event.target.id === 'own-only') { state.ownOnly = event.target.checked; save(); if (state.ownOnly && !state.customs.length) toast('Créez vos premières cartes dans « Vos défis ».'); } });
  document.addEventListener('submit', event => {
    const form = event.target; const kind = form.dataset.form; if (!kind) return; event.preventDefault();
    const data = new FormData(form);
    if (kind === 'adult') { if (!data.has('adult')) return; const callback = adultCallback; setAdult(true); closeModal(); callback?.(); }
    else if (kind === 'profile') { state.names = [String(data.get('name0') || '').trim().slice(0,24),String(data.get('name1') || '').trim().slice(0,24)]; state.mode = data.get('mode') === 'alternate' ? 'alternate' : 'random'; state.pauseWord = String(data.get('pauseWord') || 'Pause').trim().slice(0,30) || 'Pause'; setAdult(data.has('adult')); save(); toast('Votre duo est prêt.'); goHome(); }
    else if (kind === 'custom') {
      const text = String(data.get('text') || '').trim().slice(0,400); if (!text) { toast('Écrivez le texte de votre carte.'); return; }
      const level = Number(data.get('level')); const type = data.get('type'); if (!validLevel(level) || !['truth','dare'].includes(type)) return;
      const existing = state.customs.find(c => c.id === data.get('id'));
      if (existing) { Object.assign(existing,{level,type,text}); if (state.game?.current === existing.id) state.game.level = level; }
      else { if (state.customs.length >= 500) { toast('Votre bibliothèque contient déjà 500 défis.'); return; } state.customs.push({id:`custom-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,level,type,text}); }
      save(); closeModal(); render(); toast(existing ? 'Votre défi a été modifié.' : `Votre défi a rejoint le niveau ${LEVELS[level].name}.`);
    } else if (kind === 'quiz-write' && quiz?.phase === 'write') { const answer = String(data.get('answer') || '').trim().slice(0,200); if (!answer) return; quiz.answer = answer; quiz.phase = 'handoff'; render(); scrollTop(); }
    else if (kind === 'quiz-guess' && quiz?.phase === 'guess') { const guess = String(data.get('guess') || '').trim().slice(0,200); if (!guess) return; quiz.guess = guess; quiz.phase = 'reveal'; render(); scrollTop(); }
  });
  $('modal').addEventListener('cancel',() => { adultCallback = null; });
  $('modal').addEventListener('click',event => { if (event.target !== $('modal')) return; const r = $('modal').getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) closeModal(); });
  window.addEventListener('pagehide',() => { stopTimer(); clearTimeout(spinTimeout); clearTimeout(diceTimeout); });
  render();
})();
