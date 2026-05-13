// drawer.js — turns the right-hand side panel into a slide-in drawer on mobile
// runs as an IIFE so none of the helpers leak into the global scope
(function () {
  function init() {
    var panel = document.getElementById('side-panel');
    if (!panel) return;

    // Add a floating "Controls" button at the bottom right that opens the drawer
    var toggle = document.createElement('button');
    toggle.id = 'drawer-toggle';
    toggle.setAttribute('aria-label', 'Open controls panel');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.innerHTML = '&#9776; Controls';
    document.body.appendChild(toggle);

    // Dark backdrop behind the open drawer so the page behind it is dimmed
    var backdrop = document.createElement('div');
    backdrop.id = 'drawer-backdrop';
    backdrop.setAttribute('aria-hidden', 'true');
    document.body.appendChild(backdrop);

    // Small close (×) button injected as the first child of the panel
    var closeRow = document.createElement('div');
    closeRow.id = 'drawer-close';
    var closeBtn = document.createElement('button');
    closeBtn.setAttribute('aria-label', 'Close controls panel');
    closeBtn.innerHTML = '&#10005;';
    closeRow.appendChild(closeBtn);
    panel.insertBefore(closeRow, panel.firstChild);

    function openDrawer() {
      panel.classList.add('drawer-open');
      panel.removeAttribute('aria-hidden');
      backdrop.classList.add('active');
      toggle.setAttribute('aria-expanded', 'true');
      document.body.classList.add('scroll-locked');
    }

    function closeDrawer() {
      panel.classList.remove('drawer-open');
      panel.setAttribute('aria-hidden', 'true');
      backdrop.classList.remove('active');
      toggle.setAttribute('aria-expanded', 'false');
      document.body.classList.remove('scroll-locked');
    }

    toggle.addEventListener('click', function () {
      panel.classList.contains('drawer-open') ? closeDrawer() : openDrawer();
    });

    backdrop.addEventListener('click', closeDrawer);
    closeBtn.addEventListener('click', closeDrawer);

    // close the drawer automatically after pressing an animation or camera button
    // but keep it open for the scene toggles since users usually flip a few in a row
    panel.addEventListener('click', function (e) {
      if (window.innerWidth > 700) return;
      if (!panel.classList.contains('drawer-open')) return;
      var btn = e.target.closest('.anim-btn, .cam-btn');
      if (btn) closeDrawer();
    });

    // press Escape to close, matches standard modal behavior
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && panel.classList.contains('drawer-open')) {
        closeDrawer();
      }
    });
  }

  // run init once the DOM is ready, or immediately if its already loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
