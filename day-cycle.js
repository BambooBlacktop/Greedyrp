(() => {
  const KEY = 'rice-day-state';
  const TOTAL_DAYS = 10;
  const REST_SECONDS = 30;
  const goalFor = day => 60 + ((day - 1) * 30);
  let game = JSON.parse(localStorage.getItem(KEY) || 'null') || {
    day: 1, progress: 0, phase: 'work', nextIncomeAt: Date.now() + 60000, restUntil: 0
  };

  const style = document.createElement('style');
  style.textContent = `
    #day-hud{position:fixed;top:21%;left:50%;transform:translateX(-50%);z-index:15;display:flex;gap:8px;align-items:center;color:#fff8db;font:900 clamp(13px,1.7vw,21px) Trebuchet MS,Arial,sans-serif;text-shadow:0 2px #3b2418;white-space:nowrap}
    .day-chip{padding:7px 11px;background:#3f7a3bdd;border:2px solid #e7ffb8;border-radius:12px;box-shadow:0 3px 0 #255122}.day-chip.goal{background:#a56a34dd}.day-chip.timer{background:#467ba0dd}
    #night{position:fixed;inset:0;z-index:12;background:linear-gradient(#071331d9,#172554cc);opacity:0;pointer-events:none;transition:opacity 1s}.night #night{opacity:1}.night #sign,.night .stats,#day-hud{z-index:15}.night .farmer{filter:brightness(.52) saturate(.6);animation:sleep 1.6s ease-in-out infinite alternate}.night .farmer:after{content:'💤';position:absolute;top:-25px;right:-15px;font-size:18px;filter:none}@keyframes sleep{to{transform:rotate(-8deg) translateY(4px)}}
    #cutscene{position:fixed;left:50%;top:44%;transform:translate(-50%,-50%);z-index:16;width:min(82vw,820px);text-align:center;color:#fff8d6;font:1000 clamp(28px,5vw,70px) Trebuchet MS,Arial,sans-serif;text-shadow:0 5px #1b2543,0 9px 12px #0008;opacity:0;pointer-events:none;transition:opacity .5s}.night #cutscene{opacity:1}.night #cutscene small{display:block;margin-top:8px;font-size:clamp(16px,2.4vw,31px)}
  `;
  document.head.append(style);
  const hud = document.createElement('div'); hud.id = 'day-hud';
  hud.innerHTML = '<div id="day" class="day-chip"></div><div id="goal" class="day-chip goal"></div><div id="income" class="day-chip timer"></div>';
  const night = document.createElement('div'); night.id = 'night';
  const cutscene = document.createElement('div'); cutscene.id = 'cutscene';
  document.body.append(night, hud, cutscene);
  const fmt = n => String(Math.max(0, n)).padStart(2, '0');
  const farmers = () => document.querySelectorAll('.farmer').length;
  const save = () => localStorage.setItem(KEY, JSON.stringify(game));
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
      const left = Math.ceil((game.nextIncomeAt - now) / 1000);
      document.querySelector('#income').textContent = '⏱ +' + farmers() + ' RICE IN ' + fmt(Math.floor(left / 60)) + ':' + fmt(left % 60);
      cutscene.textContent = '';
      if (now >= game.nextIncomeAt) {
        const workerCount = farmers();
        game.nextIncomeAt = now + 60000; save();
        if (workerCount) addProgress(workerCount, workerCount + ' farmers worked for one minute');
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
  wrap('feed', 5, 'Food gift helped the workers');
  wrap('water', 10, 'Water gift boosted the paddies');
  wrap('mega', 30, 'Big gift caused a Golden Harvest');
  setInterval(render, 500); render();
})();
