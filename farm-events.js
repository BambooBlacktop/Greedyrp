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
        window.toast('👋 HELLO, ' + event.user + '!', 'Follow to become a farmer — gifts grow the rice field!');
      }
      if (event.type === 'session_start') {
        const previous = localStorage.getItem('rice-live-session');
        if (previous !== event.session) {
          localStorage.setItem('rice-live-session', event.session);
          localStorage.removeItem('rice-live-ended');
          localStorage.removeItem('rice-live-state');
          localStorage.removeItem('rice-day-state');
          location.reload();
        }
      }
      if (event.type === 'session_end') {
        const ended = String(event.id || 'ended');
        const alreadyReset = localStorage.getItem('rice-live-ended') === ended;
        localStorage.setItem('rice-live-ended', ended);
        localStorage.removeItem('rice-live-state');
        localStorage.removeItem('rice-day-state');
        if (!alreadyReset) location.reload();
        localStorage.removeItem('rice-live-session');
      }
    };
  }
  waitForReact();
})();
