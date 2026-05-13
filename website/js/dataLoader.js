// shared AJAX helper. tries PHP/SQLite first then falls back to a static JSON file
// this way the page still works when im viewing it without a PHP server running
(function () {
  'use strict';

  let fallbackMode = false;  //flag flips to true once PHP fails so we stop retrying

  async function loadStats() {
    try {
      const res = await fetch('../api.php?action=stats');
      if (!res.ok) throw new Error('non-2xx');
      const data = await res.json();
      if (!fallbackMode) {
        console.log('[Data Loader] Loaded from PHP/SQLite backend');
      }
      fallbackMode = false;
      return data;
    } catch (_) {
      // PHP unreachable, swap to the static JSON snapshot in /data.json
      if (!fallbackMode) {
        console.log('[Data Loader] PHP unavailable, using JSON fallback');
      }
      fallbackMode = true;
      const res = await fetch('../data.json');
      return res.json();
    }
  }

  // sends a POST to the backend whenever a button is pressed on a sport page
  async function recordInteraction(sport, type) {
    if (fallbackMode) {
      console.log('[Data Loader] Write skipped (JSON fallback mode)');
      return;
    }
    fetch('../api.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sport, type })
    }).catch(() => {
      // if the POST fails, flip into fallback mode for the rest of the session
      fallbackMode = true;
      console.log('[Data Loader] Write skipped (JSON fallback mode)');
    });
  }

  // expose helpers globally so the sport pages can call them without imports
  window.SportsAPI = { loadStats, recordInteraction, isFallback: () => fallbackMode };
})();
