(() => {
  const KEY = 'rice-day-state';
  const LEDGER_KEY = 'rice-farmer-ledger';
  const TOTAL_DAYS = 10;
  const REST_SECONDS = 30;
  const MAX_ACTIVE_FARMERS = 24;
  const SHIFT_MS = 10 * 60 * 1000;
  const goalFor = day => 200 + ((day - 1) * 100);
  let game = JSON.parse(localStorage.getItem(KEY) || 'null') || {
    day: 1, progress: 0, phase: 'work', nextIncomeAt: Date.now() + 60000, restUntil: 0
  };
  let ledger = JSON.parse(localStorage.getItem(LEDGER_KEY) || '{}');

  const style = document.createElement('style');
  style.textContent = `
    #day-hud{position:fixed;top:21%;left:50%;transform:translateX(-50%);z-index:15;display:flex;gap:8px;align-items:center;color:#fff8db;font:900 clamp(13px,1.7vw,21px) Trebuchet MS,Arial,sans-serif;text-shadow:0 2px #3b2418;white-space:nowrap}
    .day-chip{padding:7px 11px;background:#3f7a3bdd;border:2px solid #e7ffb8;border-radius:12px;box-shadow:0 3px 0 #255122}.day-chip.goal{background:#a56a34dd}.day-chip.timer{background:#467ba0dd}
    #night{position:fixed;inset:0;z-index:12;background:linear-gradient(#071331d9,#172554cc);opacity:0;pointer-events:none;transition:opacity 1s}.night #night{opacity:1}.night #sign,.night .stats,#day-hud{z-index:15}.night .farmer{filter:brightness(.52) saturate(.6);animation:sleep 1.6s ease-in-out infinite alternate}.night .farmer:after{content:'💤';position:absolute;top:-25px;right:-15px;font-size:18px;filter:none}@keyframes sleep{to{transform:rotate(-8deg) translateY(4px)}}
    #cutscene{position:fixed;left:50%;top:44%;transform:translate(-50%,-50%);z-index:16;width:min(82vw,820px);text-align:center;color:#fff8d6;font:1000 clamp(28px,5vw,70px) Trebuchet MS,Arial,sans-serif;text-shadow:0 5px #1b2543,0 9px 12px #0008;opacity:0;pointer-events:none;transition:opacity .5s}.night #cutscene{opacity:1}.night #cutscene small{display:block;margin-top:8px;font-size:clamp(16px,2.4vw,31px)}
    #leaderboard{position:fixed;right:16px;top:29%;z-index:17;width:min(31vw,270px);padding:9px;border:3px solid #f7e6a5;border-radius:15px;background:#254d32df;color:#fff8df;font:800 clamp(11px,1.35vw,16px) Trebuchet MS,Arial,sans-serif;box-shadow:0 4px 0 #15331f}#leaderboard h2{margin:0 0 6px;font-size:1.05em;text-align:center}.leader{display:flex;gap:5px;align-items:center;margin:3px 0;padding:3px 5px;border-radius:7px;background:#ffffff17}.leader .name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1}.leader .rice{color:#ffe77b}.hat{position:absolute;top:-22px;left:50%;font-size:20px;filter:drop-shadow(0 1px 1px #000)}
  `;
  document.head.append(style);
  const hud = document.createElement('div'); hud.id = 'day-hud';
  hud.innerHTML = '<div id="day" class="day-chip"></div><div id="goal" class="day-chip goal"></div><div id="income" class="day-chip timer"></div>';
  const night = document.createElement('div'); night.id = 'night';
  const cutscene = document.createElement('div'); cutscene.id = 'cutscene';
  document.body.append(night, hud, cutscene);
  const board = document.createElement('aside'); board.id = 'leaderboard'; document.body.append(board);
  const fmt = n => String(Math.max(0, n)).padStart(2, '0');
  const farmers = () => Object.keys(ledger).length;
  const save = () => localStorage.setItem(KEY, JSON.stringify(game));
  const saveLedger = () => localStorage.setItem(LEDGER_KEY, JSON.stringify(ledger));
  function drawBoard() {
    const rows = Object.entries(ledger).sort((a,b) => b[1].rice - a[1].rice).slice(0,5);
    board.innerHTML = '<h2>🏆 TOP RICE FARMERS</h2>' + (rows.length ? rows.map(([name,p],i) => '<div class="leader"><b>#'+(i+1)+'</b><span class="name">'+name+(p.boost ? ' 👒' : '')+'</span><span class="rice">🌾 '+p.rice+'</span></div>').join('') : '<div class="leader">Waiting for farmers…</div>');
  }
  function decorate(name) {
    document.querySelectorAll('.farmer').forEach(worker => {
      const tag = worker.querySelector('.tag');
      if (!tag || tag.textContent !== name) return;
      worker.querySelector('.hat')?.remove();
      if (ledger[name]?.boost) { const hat = document.createElement('span'); hat.className = 'hat'; hat.textContent = '👒'; worker.append(hat); }
    });
  }
  function hideFarmer(name) {
    document.querySelectorAll('.farmer').forEach(worker => {
      if (worker.querySelector('.tag')?.textContent === name) worker.remove();
    });
  }
  function pruneRoster() {
    const now = Date.now(); let changed = false;
    Object.entries(ledger).forEach(([name, worker]) => {
      // Upgrade saves from the older version into timed shifts on first load.
      if (!worker.activeUntil) { worker.joinedAt = now; worker.activeUntil = now + SHIFT_MS; changed = true; }
      if (worker.activeUntil && worker.activeUntil <= now) {
        delete ledger[name]; hideFarmer(name); changed = true;
      }
    });
    while (Object.keys(ledger).length > MAX_ACTIVE_FARMERS) {
      const oldest = Object.entries(ledger).sort((a,b) => a[1].joinedAt - b[1].joinedAt)[0];
      if (!oldest) break;
      delete ledger[oldest[0]]; hideFarmer(oldest[0]); changed = true;
    }
    if (changed) saveLedger();
  }
  function register(name) {
    if (!name) return;
    pruneRoster();
    if (!ledger[name]) {
      const oldest = Object.entries(ledger).sort((a,b) => a[1].joinedAt - b[1].joinedAt)[0];
      if (Object.keys(ledger).length >= MAX_ACTIVE_FARMERS && oldest) {
        delete ledger[oldest[0]]; hideFarmer(oldest[0]);
        showToast('🔄 SHIFT CHANGE', oldest[0] + ' clocked out — ' + name + ' joined the crew!');
      }
      ledger[name] = { rice: 0, boost: 0, joinedAt: Date.now(), activeUntil: Date.now() + SHIFT_MS };
      saveLedger(); drawBoard();
    }
  }
  function upgrade(name) {
    register(name); ledger[name].boost = 3; saveLedger(); drawBoard(); setTimeout(() => decorate(name), 80);
    showToast('👒 FARMER UPGRADED!', name + ' followed — their farmer hat earns +3 rice every minute!');
  }
  window.addEventListener('rice:join', event => { register(event.detail.user); setTimeout(() => decorate(event.detail.user), 80); });
  window.addEventListener('rice:follow', event => upgrade(event.detail.user));
  function showToast(title, detail) { if (window.toast) window.toast(title, detail, true); }
  function resetToNextDay() {
    if (game.day >= TOTAL_DAYS) { game.phase = 'complete'; save(); return; }
    game.day += 1; game.progress = 0; game.phase = 'work'; game.nextIncomeAt = Date.now() + 60000; game.restUntil = 0; save();
    showToast('☀️ DAY ' + game.day + ' BEGINS!', 'Goal: ' + goalFor(game.day) + ' rice — farmers are back to work!');
  }
  function completeDay() {
    if (game.phase !== 'work') return;
    if (game.day === TOTAL_DAYS) { game.phase = 'complete'; save(); showToast('🏆 FARM COMPLETE!', 'All 10 days are finished — thank you, farmers!'); return; }
    game.phase = 'rest'; game.restUntil = Date.now() + REST_SECONDS * 1000; save();
    showToast('🌙 DAY ' + game.day + ' COMPLETE!', 'The farmers are resting. Day ' + (game.day + 1) + ' starts in 30 seconds.');
  }
  function addProgress(amount, reason) {
    if (game.phase !== 'work') return;
    game.progress = Math.min(goalFor(game.day), game.progress + amount); save();
    if (reason) showToast('🌾 +' + amount + ' RICE!', reason);
    if (game.progress >= goalFor(game.day)) completeDay();
  }
  function render() {
    const now = Date.now(); const resting = game.phase === 'rest';
    document.body.classList.toggle('night', resting);
    document.querySelector('#day').textContent = game.phase === 'complete' ? '🏆 FARM COMPLETE' : '☀️ DAY ' + game.day + ' / ' + TOTAL_DAYS;
    document.querySelector('#goal').textContent = game.phase === 'complete' ? '🌾 ALL GOALS DONE' : '🌾 GOAL ' + game.progress + ' / ' + goalFor(game.day);
    if (resting) {
      const left = Math.ceil((game.restUntil - now) / 1000);
      document.querySelector('#income').textContent = '🌙 NEXT DAY ' + fmt(Math.floor(left / 60)) + ':' + fmt(left % 60);
      cutscene.innerHTML = '🌙 THE FARMERS ARE SLEEPING<small>Day ' + (game.day + 1) + ' starts in ' + Math.max(0, left) + ' seconds</small>';
      if (left <= 0) resetToNextDay();
    } else if (game.phase === 'complete') {
      document.querySelector('#income').textContent = '🎉 10 DAYS COMPLETE'; cutscene.textContent = '';
    } else {
      pruneRoster();
      drawBoard();
      const left = Math.ceil((game.nextIncomeAt - now) / 1000);
      document.querySelector('#income').textContent = '⏱ CREW ' + farmers() + '/' + MAX_ACTIVE_FARMERS + ' · IN ' + fmt(Math.floor(left / 60)) + ':' + fmt(left % 60);
      cutscene.textContent = '';
      if (now >= game.nextIncomeAt) {
        const workers = Object.entries(ledger);
        const workerCount = workers.reduce((total, [, worker]) => total + 1 + (worker.boost || 0), 0);
        game.nextIncomeAt = now + 60000; save();
        if (workerCount) {
          workers.forEach(([, worker]) => { worker.rice += 1 + (worker.boost || 0); });
          saveLedger(); drawBoard();
          addProgress(workerCount, workerCount + ' rice harvested by the farmers');
        }
      }
    }
  }
  function wrap(name, points, label) {
    const wait = () => {
      if (typeof window[name] !== 'function') return setTimeout(wait, 60);
      const original = window[name];
      window[name] = (...args) => { original(...args); addProgress(points, label); };
    }; wait();
  }
  wrap('feed', 15, 'Food gift helped the workers');
  wrap('water', 30, 'Water gift boosted the paddies');
  wrap('mega', 100, 'Big gift caused a Golden Harvest');
  setInterval(render, 500); drawBoard(); render();
})();
