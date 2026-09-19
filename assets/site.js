// OnePunto: a dot that bounces in and unfolds the page, a grid that fills as
// the page scrolls, and the app's square, working. No libraries, no tracking.
(() => {
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const curve = 'cubic-bezier(.05, .7, .1, 1)';
  const lang = root.lang || 'es';
  const percent = new Intl.NumberFormat(lang, { style: 'percent' });

  // One dot drops onto the empty page and bounces. The page then unfolds out
  // of it, and the dot flies up to become the headline's full stop.
  function intro() {
    if (!root.classList.contains('intro')) return;
    const page = document.querySelector('.page');
    const period = document.querySelector('.period');
    const end = () => root.classList.remove('intro');
    if (!page || !period || scrollY > innerHeight / 2) return end();
    try { sessionStorage.setItem('onepunto-intro', '1'); } catch (_) { /* private mode */ }
    // The show starts at the top of the page, not wherever a reload left it.
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    scrollTo(0, 0);

    const stage = document.createElement('div');
    stage.className = 'stage';
    stage.setAttribute('aria-hidden', 'true');
    const drop = document.createElement('span');
    drop.className = 'drop';
    stage.append(drop);
    document.body.append(stage);

    let finished = false;
    const skips = ['pointerdown', 'keydown', 'wheel', 'touchstart'];
    function finish() {
      if (finished) return;
      finished = true;
      end();
      for (const a of page.getAnimations()) a.cancel();
      stage.remove();
      for (const type of skips) removeEventListener(type, finish);
    }
    // Anyone who wants the page now gets it now.
    for (const type of skips) addEventListener(type, finish, { passive: true });

    // Falling it stretches, it squashes only on impact, springs back
    // stretched, and each bounce is lower than the last.
    const h = innerHeight;
    const fallIn = 'cubic-bezier(.5, 0, 1, .6)';
    const riseOut = 'cubic-bezier(.1, .6, .4, 1)';
    const at = (y, sx, sy) => `translateY(${y}px) scale(${sx}, ${sy})`;
    const fall = drop.animate([
      { transform: at(-h / 2 - 60, .86, 1.16), easing: fallIn },
      { transform: at(0, .86, 1.16), offset: .33, easing: 'ease-out' },
      { transform: at(0, 1.45, .58), offset: .37, easing: 'ease-in-out' },
      { transform: at(-8, .9, 1.12), offset: .41, easing: riseOut },
      { transform: at(-h * .15, 1, 1), offset: .58, easing: fallIn },
      { transform: at(0, .94, 1.07), offset: .73, easing: 'ease-out' },
      { transform: at(0, 1.24, .78), offset: .76, easing: 'ease-in-out' },
      { transform: at(-4, .97, 1.04), offset: .79, easing: riseOut },
      { transform: at(-h * .04, 1, 1), offset: .87, easing: fallIn },
      { transform: at(0, 1, 1), offset: .94, easing: 'ease-out' },
      { transform: at(0, 1.1, .9), offset: .96, easing: 'ease-in-out' },
      { transform: at(0, 1, 1) },
    ], { duration: 1500, fill: 'forwards' });

    fall.finished.then(() => {
      if (finished) return;
      const dot = drop.getBoundingClientRect();
      const cx = dot.left + dot.width / 2;
      const cy = dot.top + dot.height / 2;
      const box = page.getBoundingClientRect();
      const x = cx - box.left;
      const y = cy - box.top;
      const r = Math.hypot(Math.max(cx, innerWidth - cx), Math.max(cy, innerHeight - cy)) + 24;
      const unfold = page.animate([
        { clipPath: `circle(0px at ${x}px ${y}px)` },
        { clipPath: `circle(${r}px at ${x}px ${y}px)` },
      // Slow to start and slow to settle, so the unfolding itself is seen.
      ], { duration: 1150, easing: 'cubic-bezier(.7, 0, .2, 1)', fill: 'forwards' });

      const target = period.getBoundingClientRect();
      fall.cancel();
      drop.style.transformOrigin = '50% 50%';
      const fly = drop.animate([
        { transform: 'translate(0, 0) scale(1)' },
        {
          transform: `translate(${target.left + target.width / 2 - cx}px, ` +
            `${target.top + target.height / 2 - cy}px) scale(${target.width / dot.width})`,
        },
      ], { duration: 900, delay: 140, easing: curve, fill: 'forwards' });
      Promise.all([unfold.finished, fly.finished]).then(finish, finish);
    }, finish);
  }

  // As the page scrolls, one dot becomes a whole goal, day by day.
  function story() {
    const section = document.querySelector('.story');
    if (!section) return;
    const dots = [...section.querySelectorAll('.grid .dot')];
    const captions = [...section.querySelectorAll('.captions h2')];
    const days = section.querySelector('[data-days]');
    const share = section.querySelector('[data-share]');
    const track = section.querySelector('.track');
    const total = dots.length;
    let shown = -1;
    let caption = -1;
    let queued = false;

    function update() {
      queued = false;
      const box = section.getBoundingClientRect();
      const span = box.height - innerHeight;
      const p = span > 0 ? Math.min(1, Math.max(0, -box.top / span)) : 1;
      const filled = 1 + Math.round(p * (total - 1));
      if (filled !== shown) {
        dots.forEach((dot, i) => {
          dot.classList.toggle('on', i < filled);
          dot.classList.toggle('today', i === filled);
        });
        // The newest dot sends out its ring, as it does in the app.
        if (filled === shown + 1 && !reduced) ring(dots[filled - 1]);
        days.textContent = days.dataset.days.replace('{n}', filled).replace('{t}', total);
        share.textContent = percent.format(filled / total);
        track.style.setProperty('--p', filled / total);
        shown = filled;
      }
      const next = p < .3 ? 0 : p < .68 ? 1 : 2;
      if (next !== caption) {
        captions.forEach((line, i) => {
          line.classList.toggle('shown', i === next);
          line.setAttribute('aria-hidden', String(i !== next));
        });
        caption = next;
      }
    }
    const request = () => {
      if (!queued) {
        queued = true;
        requestAnimationFrame(update);
      }
    };
    addEventListener('scroll', request, { passive: true });
    addEventListener('resize', request, { passive: true });
    update();
  }

  function ring(dot) {
    dot.classList.remove('ring');
    void dot.offsetWidth;
    dot.classList.add('ring');
    dot.addEventListener('animationend', () => dot.classList.remove('ring'), { once: true });
  }

  // The square from the app: one tap completes today, another undoes it.
  function demo() {
    const device = document.querySelector('.device');
    if (!device) return;
    const button = device.querySelector('.square');
    const today = device.querySelector('.grid .dot.today');
    const [pending, doneLine] = device.querySelectorAll('.headline h3');
    const days = device.querySelector('[data-days]');
    const share = device.querySelector('[data-share]');
    const tip = device.querySelector('.tip');
    const total = device.querySelectorAll('.grid .dot').length;
    const base = Number(button.dataset.completed);
    let done = false;

    function swap(from, to) {
      from.setAttribute('aria-hidden', 'true');
      to.setAttribute('aria-hidden', 'false');
      from.classList.add('leaving');
      // The old line is gone before the new one arrives.
      setTimeout(() => to.classList.remove('coming', 'leaving'), reduced ? 0 : 150);
      setTimeout(() => {
        from.classList.remove('leaving');
        from.classList.add('coming');
      }, reduced ? 0 : 320);
    }

    button.addEventListener('click', () => {
      done = !done;
      button.classList.toggle('done', done);
      button.setAttribute('aria-pressed', String(done));
      today.classList.toggle('on', done);
      today.classList.toggle('today', !done);
      if (done && !reduced) {
        button.classList.remove('pulse');
        void button.offsetWidth;
        button.classList.add('pulse');
        ring(today);
        // A light buzz where the phone allows it, as the app does.
        if (navigator.vibrate && navigator.userActivation?.isActive) navigator.vibrate(12);
      }
      done ? swap(pending, doneLine) : swap(doneLine, pending);
      const count = base + (done ? 1 : 0);
      days.textContent = days.dataset.days.replace('{n}', count).replace('{t}', total);
      share.textContent = percent.format(count / total);
      tip.textContent = done ? tip.dataset.undo : tip.dataset.tap;
    });
  }

  // Sections rise into place the first time they come into view.
  function reveals() {
    const items = document.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window)) {
      items.forEach((item) => item.classList.add('in'));
      return;
    }
    const seen = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('in');
        seen.unobserve(entry.target);
      }
    }, { rootMargin: '0px 0px -12% 0px' });
    items.forEach((item) => seen.observe(item));
  }

  intro();
  story();
  demo();
  reveals();
})();
