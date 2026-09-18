(() => {
  function waitForReact() {
    if (typeof window.react !== 'function' || typeof window.toast !== 'function') {
      setTimeout(waitForReact, 60);
      return;
    }
    const originalReact = window.react;
    window.react = event => {
      originalReact(event);
      if (event.type === 'join') {
        // Everyone who enters the LIVE becomes a worker. Following upgrades
        // that same worker later rather than creating a duplicate.
        window.addFarmer(event.user);
        window.dispatchEvent(new CustomEvent('rice:join', { detail: { user: event.user } }));
        window.toast('👋 HELLO, ' + event.user + '!', 'Follow to become a farmer — gifts grow the rice field!');
      }
      if (event.type === 'follow') {
        window.dispatchEvent(new CustomEvent('rice:follow', { detail: { user: event.user } }));
      }
      if (event.type === 'session_start') {
        const previous = localStorage.getItem('rice-live-session');
        if (previous !== event.session) {
          localStorage.setItem('rice-live-session', event.session);
          localStorage.removeItem('rice-live-ended');
          localStorage.removeItem('rice-live-state');
          localStorage.removeItem('rice-day-state');
          localStorage.removeItem('rice-farmer-ledger');
          location.reload();
        }
      }
      if (event.type === 'session_end') {
        const ended = String(event.id || 'ended');
        const alreadyReset = localStorage.getItem('rice-live-ended') === ended;
        localStorage.setItem('rice-live-ended', ended);
        localStorage.removeItem('rice-live-state');
        localStorage.removeItem('rice-day-state');
        localStorage.removeItem('rice-farmer-ledger');
        if (!alreadyReset) location.reload();
        localStorage.removeItem('rice-live-session');
      }
    };
  }
  waitForReact();
})();
