(() => {
  const button = document.querySelector('#sound-toggle');
  const style = document.createElement('style');
  style.textContent = `#sound-toggle{position:fixed;right:22px;bottom:22px;z-index:20;border:3px solid #fff5c7;border-radius:999px;padding:12px 18px;background:#5c8b36;color:#fff;font:800 15px Trebuchet MS,Arial,sans-serif;box-shadow:0 4px 0 #315320;cursor:pointer}#sound-toggle.enabled{background:#406b92}`;
  document.head.append(style);

  let ctx, musicTimer;
  const tone = (frequency, seconds, volume, type = 'sine') => {
    if (!ctx) return;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(volume, ctx.currentTime + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + seconds);
    oscillator.connect(gain).connect(ctx.destination);
    oscillator.start(); oscillator.stop(ctx.currentTime + seconds + 0.04);
  };
  const sounds = {
    follow() { tone(587, .18, .06); setTimeout(() => tone(784, .35, .055), 110); },
    food() { tone(440, .13, .06, 'triangle'); setTimeout(() => tone(554, .2, .06, 'triangle'), 100); },
    water() { tone(660, .12, .045); setTimeout(() => tone(523, .25, .04), 90); },
    mega() { [392,523,659,784].forEach((n,i) => setTimeout(() => tone(n,.42,.075,'triangle'), i*115)); },
  };
  function startMusic() {
    const scale = [262,294,330,392,440,494,587,659];
    let index = 0;
    musicTimer = setInterval(() => {
      const note = scale[(index++ * 3 + Math.floor(Math.random() * 2)) % scale.length];
      tone(note, 1.2, .017, 'triangle');
      if (index % 4 === 0) tone(note / 2, 1.7, .009, 'sine');
    }, 1150);
  }
  button.addEventListener('click', async () => {
    if (ctx) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    await ctx.resume();
    startMusic();
    button.textContent = '🔊 Farm sounds on'; button.classList.add('enabled');
  });

  const waitFor = (name, handler) => {
    const timer = setInterval(() => {
      if (typeof window[name] !== 'function') return;
      clearInterval(timer);
      const original = window[name];
      window[name] = (...args) => { original(...args); handler(...args); };
    }, 50);
  };
  waitFor('addFarmer', () => sounds.follow());
  waitFor('feed', () => sounds.food());
  waitFor('water', () => sounds.water());
  waitFor('mega', () => sounds.mega());
})();
