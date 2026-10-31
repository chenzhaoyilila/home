/*
 * Subtle pointer feedback, shared by every page.
 *
 *   RING    a thin circle trails the mouse so visitors always know where the
 *           pointer is. It grows a little over anything clickable and dips
 *           when pressed. Shown only on devices with a real mouse.
 *   RIPPLE  a click or tap leaves a small soft circle that expands and fades.
 *
 * Neither gets in the way: pointer-events are off, the normal cursor stays,
 * and everything is skipped when the visitor asks for reduced motion.
 * Set either flag to false to turn that effect off.
 */
(function () {
  var RING = true;
  var RIPPLE = true;

  if (window.__fxInit) return;
  window.__fxInit = true;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var INTERACTIVE = 'a, button, input, textarea, select, label, summary, [role="button"]';
  var hasMouse = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  var css = document.createElement('style');
  css.textContent =
    '.fx-ring{position:fixed;top:0;left:0;width:0;height:0;pointer-events:none;' +
      'z-index:9999;opacity:0;transition:opacity .2s ease;will-change:transform}' +
    '.fx-ring.is-visible{opacity:1}' +
    '.fx-ring::after{content:"";position:absolute;width:28px;height:28px;' +
      'left:-14px;top:-14px;border-radius:50%;border:1px solid rgba(51,51,51,.35);' +
      'transition:transform .2s ease,background-color .2s ease,border-color .2s ease}' +
    '.fx-ring.is-hover::after{transform:scale(1.5);background-color:rgba(51,51,51,.05);' +
      'border-color:rgba(51,51,51,.5)}' +
    '.fx-ring.is-down::after{transform:scale(.8)}' +
    '.fx-ring.is-hover.is-down::after{transform:scale(1.25)}' +
    '.fx-ripple{position:fixed;width:40px;height:40px;margin:-20px 0 0 -20px;' +
      'border-radius:50%;background:rgba(51,51,51,.16);pointer-events:none;' +
      'z-index:9999;animation:fx-ripple .45s ease-out forwards}' +
    '@keyframes fx-ripple{from{transform:scale(.2);opacity:1}to{transform:scale(1);opacity:0}}';
  document.head.appendChild(css);

  if (RIPPLE) {
    document.addEventListener('pointerdown', function (e) {
      if (e.button !== 0) return;               // primary click / touch / pen only
      var dot = document.createElement('span');
      dot.className = 'fx-ripple';
      dot.setAttribute('aria-hidden', 'true');
      dot.style.left = e.clientX + 'px';
      dot.style.top = e.clientY + 'px';
      document.body.appendChild(dot);
      dot.addEventListener('animationend', function () { dot.remove(); });
    }, { passive: true });
  }

  if (!RING || !hasMouse) return;

  var ring = document.createElement('div');
  ring.className = 'fx-ring';
  ring.setAttribute('aria-hidden', 'true');
  document.body.appendChild(ring);

  var x = 0, y = 0, tx = 0, ty = 0, raf = 0, shown = false;

  // Ease toward the pointer, and stop the loop once it has caught up so an
  // idle page costs nothing.
  function frame() {
    x += (tx - x) * 0.25;
    y += (ty - y) * 0.25;
    ring.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0)';
    raf = (Math.abs(tx - x) > 0.1 || Math.abs(ty - y) > 0.1) ? requestAnimationFrame(frame) : 0;
  }

  document.addEventListener('mousemove', function (e) {
    tx = e.clientX;
    ty = e.clientY;
    if (!shown) {                               // appear where the pointer is, not fly in from 0,0
      x = tx; y = ty; shown = true;
      ring.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0)';
      ring.classList.add('is-visible');
    }
    if (!raf) raf = requestAnimationFrame(frame);
    var over = e.target && e.target.closest && e.target.closest(INTERACTIVE);
    ring.classList.toggle('is-hover', !!over);
  }, { passive: true });

  document.addEventListener('mousedown', function () { ring.classList.add('is-down'); });
  document.addEventListener('mouseup', function () { ring.classList.remove('is-down'); });

  // relatedTarget is null when the pointer leaves the window or enters an
  // iframe (the resume PDF), where this document stops receiving moves.
  document.addEventListener('mouseout', function (e) {
    if (!e.relatedTarget) {
      ring.classList.remove('is-visible', 'is-down');
      shown = false;
    }
  });
})();
