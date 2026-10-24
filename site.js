/* Stressie site script. Every part checks for its own markup, so one file serves every page.
   Hero: a live dark map (OpenFreeMap tiles), cleared down to streets, parks and water.
   Steps: one pinned section; scrolling moves through the steps and a hand plays each close-up of the app.
   Everything rests in its final state under reduced motion or "Pause animations". */
(() => {
  const root = document.documentElement;
  const osReduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let motionOff = false;
  const still = () => osReduce || motionOff;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const E = {
    io: t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    out: t => 1 - Math.pow(1 - t, 3),
  };
  const STOP = Symbol('stop');

  /* ---------- Hero map ---------- */
  (function heroMap() {
    const el = $('#map');
    if (!el || !window.maplibregl) return;
    const PALETTES = {
      dark: { land: '#201F1B', residential: '#22211D', park: '#232A21', wood: '#222820', water: '#192427',
              minor: '#2D2B27', majorCasing: '#2A2824', major: '#393632', motorCasing: '#3B2A22', motor: '#4B3327' },
      light: { land: '#EFEBE6', residential: '#ECE7E1', park: '#E2E7D9', wood: '#DDE4D3', water: '#D4DFE4',
               minor: '#FFFFFF', majorCasing: '#E2DCD5', major: '#FFFFFF', motorCasing: '#F2CDB9', motor: '#FADFD0' },
    };
    const paintFor = C => ({
      background: { 'background-color': C.land },
      park: { 'fill-color': C.park, 'fill-opacity': 1 },
      water: { 'fill-color': C.water },
      landuse_residential: { 'fill-color': C.residential },
      landcover_wood: { 'fill-color': C.wood, 'fill-opacity': .8 },
      waterway: { 'line-color': C.water },
      road_area_pier: { 'fill-color': C.land },
      road_pier: { 'line-color': C.land },
      highway_minor: { 'line-color': C.minor },
      highway_major_casing: { 'line-color': C.majorCasing },
      highway_major_inner: { 'line-color': C.major },
      highway_major_subtle: { 'line-color': C.majorCasing },
      highway_motorway_casing: { 'line-color': C.motorCasing },
      highway_motorway_inner: { 'line-color': C.motor },
      highway_motorway_subtle: { 'line-color': C.motorCasing },
      highway_motorway_bridge_casing: { 'line-color': C.motorCasing },
      highway_motorway_bridge_inner: { 'line-color': C.motor },
    });
    const theme = () => (root.dataset.theme === 'light' ? 'light' : 'dark');
    const paint = paintFor(PALETTES[theme()]);
    fetch('https://tiles.openfreemap.org/styles/positron')
      .then(r => r.json())
      .then(style => {
        // Keep only ground, water, parks and streets: no labels, no points of interest, no rail or buildings.
        style.layers = style.layers.filter(l => l.type !== 'symbol' && !/boundary|railway|aeroway|glacier|ice_shelf|tunnel|building|highway_path/.test(l.id));
        style.layers.forEach(l => { if (paint[l.id]) l.paint = Object.assign({}, l.paint, paint[l.id]); });
        const map = new maplibregl.Map({
          container: el, style, interactive: false, fadeDuration: 0,
          center: [-122.4108, 37.7738], zoom: innerWidth < 900 ? 13.7 : 14.5, bearing: -12,
          attributionControl: { compact: true, customAttribution: '<a href="https://openfreemap.org" target="_blank" rel="noopener">OpenFreeMap</a> © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>' },
        });
        map.once('idle', () => el.classList.add('is-ready'));
        window.addEventListener('stressie-theme', () => {
          const next = paintFor(PALETTES[theme()]);
          Object.entries(next).forEach(([id, props]) => { if (map.getLayer(id)) Object.entries(props).forEach(([k, v]) => map.setPaintProperty(id, k, v)); });
        });
      })
      .catch(() => {});
  })();

  /* ---------- The icon pattern from the brand board ---------- */
  const ICONS = ['moon', 'coffee', 'sun', 'sneaker', 'bus', 'house', 'buildings', 'credit-card', 'coins', 'heart', 'pill', 'calendar-dots', 'clock', 'map-pin', 'headphones', 'ticket',
    'tote', 'key', 'wrench', 'hard-hat', 'cube', 'truck', 'shopping-cart', 'fork-knife', 'stethoscope', 'star', 'bell', 'graduation-cap', 'chat', 'users', 'barbell', 'bed'];
  function fillPattern(el) {
    const w = el.clientWidth, h = el.clientHeight;
    if (!w || !h) return;
    const key = `${w}x${h}`;
    if (el.dataset.key === key) return;
    el.dataset.key = key;
    const gap = +el.dataset.gap || 58;
    el.style.setProperty('--ps', `${+el.dataset.ps || 22}px`);
    el.style.setProperty('--po', el.dataset.po || '.5');
    const rows = Math.ceil(h / gap) + 1, cols = Math.ceil(w / gap) + 1;
    let html = '', n = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = c * gap + (r % 2 ? gap / 2 : 0) + gap * .25, y = r * gap + gap * .5;
        html += `<i class="ph ph-${ICONS[(n * 7 + r * 5) % ICONS.length]}" style="left:${x.toFixed(1)}px;top:${y.toFixed(1)}px"></i>`;
        n++;
      }
    }
    el.innerHTML = html;
  }
  const patRO = new ResizeObserver(entries => entries.forEach(e => fillPattern(e.target)));
  $$('[data-pattern]').forEach(p => { p.setAttribute('aria-hidden', 'true'); fillPattern(p); patRO.observe(p); });

  /* ---------- A cancellable timeline ---------- */
  class Run { constructor() { this.alive = true; } stop() { this.alive = false; } }
  const wait = (run, ms) => new Promise((res, rej) => setTimeout(() => (run.alive ? res() : rej(STOP)), ms));
  const animate = (run, ms, ease, fn) => new Promise((res, rej) => {
    let start;
    const guard = setTimeout(() => { if (run.alive) { fn(1); res(); } }, ms + 500); // background tabs stall frames
    const step = now => {
      if (!run.alive) { clearTimeout(guard); rej(STOP); return; }
      if (start === undefined) start = now;
      const p = Math.min(1, (now - start) / ms);
      fn(ease(p));
      if (p < 1) requestAnimationFrame(step); else { clearTimeout(guard); res(); }
    };
    requestAnimationFrame(step);
  });
  const show = (el, on = true) => el.classList.toggle('off', !on);

  /* ---------- The hand ---------- */
  function makeHand(stage) {
    const hand = $('.hand', stage);
    let pos = [0, 0];
    const tip = () => [hand.offsetWidth * 18 / 64, hand.offsetHeight * 4 / 64];
    const place = ([x, y], ms) => {
      const [tx, ty] = tip();
      hand.style.setProperty('--t', `${ms}ms`);
      hand.style.setProperty('--x', `${x - tx}px`);
      hand.style.setProperty('--y', `${y - ty}px`);
      pos = [x, y];
    };
    const ripple = () => {
      const r = document.createElement('span');
      r.className = 'ripple';
      r.style.left = `${pos[0]}px`;
      r.style.top = `${pos[1]}px`;
      stage.append(r);
      r.addEventListener('animationend', () => r.remove());
    };
    return {
      at(el, fx = .5, fy = .5) {
        const s = stage.getBoundingClientRect(), r = el.getBoundingClientRect();
        return [r.left - s.left + r.width * fx, r.top - s.top + r.height * fy];
      },
      async enter(run, p) {
        place([p[0] + 140, p[1] + 170], 0);
        void hand.offsetWidth;
        hand.classList.add('on');
        place(p, 850);
        await wait(run, 880);
      },
      async move(run, p, ms = 650) { place(p, ms); await wait(run, ms + 30); },
      async tap(run, el) {
        hand.classList.add('down');
        if (el) el.classList.add('pressed');
        await wait(run, 150);
        hand.classList.remove('down');
        if (el) el.classList.remove('pressed');
        ripple();
        await wait(run, 160);
      },
      async leave(run) { place([pos[0] + 130, pos[1] + 160], 750); hand.classList.remove('on'); await wait(run, 760); },
      hide() { hand.classList.remove('on', 'down'); },
    };
  }

  /* ---------- Scenes: close-ups of the app ---------- */
  const scenes = {
    // Home: tap Breathe, then one slow breath with a blooming flower of petals
    moment(stage) {
      const one = $('.m-one', stage), two = $('.m-two', stage), tile = $('.mo-breathe', stage);
      const petals = $$('.petals circle', stage), halo = $('.halo', stage), count = $('.breath-count', stage);
      const phase = $('.breath-phase', stage), steps = $('.breath-steps', stage), pills = $$('.breath-steps span', stage), done = $('.done-pill', stage);
      const N = petals.length;
      // t: 0 closed, 1 fully open. spin adds a slow turn while holding.
      const bloom = (t, spin = 0) => {
        const d = lerp(3, 46, t), r = lerp(26, 44, t), rot = (lerp(-30, 30, t) + spin) * Math.PI / 180;
        petals.forEach((c, i) => {
          const a = (i / N) * Math.PI * 2 + rot;
          c.setAttribute('cx', (Math.cos(a) * d).toFixed(2));
          c.setAttribute('cy', (Math.sin(a) * d).toFixed(2));
          c.setAttribute('r', r.toFixed(2));
        });
        halo.style.opacity = lerp(.2, 1, t).toFixed(3);
      };
      const step = k => pills.forEach((el, i) => el.classList.toggle('on', i === k));
      const say = text => { phase.style.opacity = 0; setTimeout(() => { phase.textContent = text; phase.style.opacity = 1; }, 180); };
      const tick = (secs, t) => { count.textContent = String(Math.max(1, secs - Math.floor(t * secs))); };
      return {
        reset() { one.classList.remove('gone', 'off'); two.classList.add('gone'); bloom(0); count.textContent = '4'; phase.textContent = 'Breathe in'; step(0); show(steps); show(done, false); },
        final() { one.classList.add('gone'); two.classList.remove('gone'); bloom(.7); count.innerHTML = '<i class="ph ph-check"></i>'; phase.textContent = 'Nicely done'; show(steps, false); show(done); },
        async play(run, h) {
          this.reset();
          await wait(run, 600);
          await h.enter(run, h.at(tile));
          await h.tap(run, tile);
          one.classList.add('off');
          await wait(run, 280);
          one.classList.add('gone');
          two.classList.remove('gone');
          h.leave(run).catch(() => {});
          await wait(run, 300);
          await animate(run, 4000, E.io, t => { bloom(t); tick(4, t); });
          step(1); say('Hold');
          await animate(run, 2000, t => t, t => { bloom(1, t * 10); tick(2, t); });
          step(2); say('Breathe out');
          await animate(run, 4000, E.io, t => { bloom(1 - t, 10); tick(4, t); });
          say('Nicely done');
          count.innerHTML = '<i class="ph ph-check"></i>';
          show(steps, false);
          show(done);
          await wait(run, 2600);
        },
      };
    },

    // Discover: tap a place, add its perk to the Wallet
    discover(stage) {
      const pin = $('[data-pin="b"]', stage), sheet = $('.map-sheet', stage), add = $('.map-add', stage), added = $('.map-added', stage);
      return {
        reset() { show(sheet, false); show(added, false); pin.classList.remove('hit'); },
        final() { show(sheet, false); show(added); pin.classList.add('hit'); },
        async play(run, h) {
          this.reset();
          await wait(run, 600);
          await h.enter(run, h.at($('.pin-dot', pin), .5, .4));
          await h.tap(run);
          pin.classList.add('hit');
          show(sheet);
          await wait(run, 900);
          await h.move(run, h.at(add));
          await h.tap(run, add);
          show(sheet, false);
          show(added);
          await wait(run, 300);
          await h.leave(run);
          await wait(run, 2400);
        },
      };
    },

    // Wallet: tap a pass to show its code at the counter
    wallet(stage) {
      const pass = $('.pass.teal', stage), hint = $('.w-hint', stage);
      return {
        reset() { pass.classList.remove('open'); show(hint, false); },
        final() { pass.classList.add('open'); show(hint); },
        async play(run, h) {
          this.reset();
          await wait(run, 700);
          await h.enter(run, h.at(pass, .3, .55));
          await h.tap(run, pass);
          pass.classList.add('open');
          show(hint);
          await wait(run, 400);
          await h.leave(run);
          await wait(run, 3000);
        },
      };
    },

    // Partners: publish an offer and it goes live on the map
    listing(stage) {
      const pub = $('.lst-pub', stage), ok = $('.code-ok', stage), rows = $$('.lst-row', stage);
      return {
        reset() { show(ok, false); pub.textContent = 'Publish'; rows.forEach(r => { r.style.opacity = ''; }); },
        final() { show(ok); pub.textContent = 'Published'; },
        async play(run, h) {
          this.reset();
          rows.forEach(r => { r.style.transition = 'opacity .4s'; r.style.opacity = .35; });
          for (const r of rows) { await wait(run, 260); r.style.opacity = 1; }
          await wait(run, 400);
          await h.enter(run, h.at(pub));
          await h.tap(run, pub);
          pub.textContent = 'Published';
          show(ok);
          await wait(run, 300);
          await h.leave(run);
          await wait(run, 2600);
        },
      };
    },

    // Business: join with a company code
    code(stage) {
      const field = $('.code-field', stage), text = $('.code-text', stage), join = $('.code-join', stage), ok = $('.code-ok', stage);
      const CODE = 'BAYSIDE';
      return {
        reset() { text.textContent = ''; field.classList.remove('focus'); show(ok, false); },
        final() { text.textContent = CODE; show(ok); },
        async play(run, h) {
          this.reset();
          await wait(run, 500);
          await h.enter(run, h.at(field, .3, .5));
          await h.tap(run);
          field.classList.add('focus');
          for (const ch of CODE) { await wait(run, 120); text.textContent += ch; }
          await wait(run, 300);
          await h.move(run, h.at(join));
          await h.tap(run, join);
          field.classList.remove('focus');
          show(ok);
          await wait(run, 200);
          await h.leave(run);
          await wait(run, 2600);
        },
      };
    },

    // Business: names are never shown
    anon(stage) {
      const btn = $('.show-names', stage), tip = $('.anon-tip', stage);
      return {
        reset() { show(tip, false); },
        final() { show(tip); },
        async play(run, h) {
          this.reset();
          await wait(run, 600);
          await h.enter(run, h.at(btn));
          await h.tap(run, btn);
          btn.classList.remove('shake');
          void btn.offsetWidth;
          btn.classList.add('shake');
          show(tip);
          await wait(run, 500);
          await h.leave(run);
          await wait(run, 2800);
        },
      };
    },

    // Business: what's weighing on the team
    trends(stage) {
      const app = $('.app', stage), bars = $$('.bars i', stage), work = $('.b-work', stage), tip = $('.tr-tip', stage), start = $('.tr-start', stage);
      const placeTip = () => {
        const u = app.getBoundingClientRect(), b = $('i', work).getBoundingClientRect(), k = u.width / app.offsetWidth || 1;
        tip.style.left = `${(b.left - u.left + b.width / 2) / k}px`;
        tip.style.top = `${(b.top - u.top) / k}px`;
      };
      return {
        reset() { bars.forEach(b => { b.style.transitionDelay = '0ms'; b.style.setProperty('--k', 0); }); work.classList.remove('hot'); show(tip, false); start.textContent = 'Start'; },
        final() { bars.forEach(b => b.style.setProperty('--k', 1)); work.classList.add('hot'); placeTip(); show(tip); start.textContent = 'Booked'; },
        async play(run, h) {
          this.reset();
          await wait(run, 400);
          bars.forEach((b, i) => { b.style.transitionDelay = `${i * 90}ms`; b.style.setProperty('--k', 1); });
          await wait(run, 1300);
          await h.enter(run, h.at($('i', work), .5, .3));
          await h.tap(run);
          work.classList.add('hot');
          placeTip();
          show(tip);
          await wait(run, 1100);
          await h.move(run, h.at(start));
          await h.tap(run, start);
          start.textContent = 'Booked';
          show(tip, false);
          await wait(run, 200);
          await h.leave(run);
          await wait(run, 2600);
        },
      };
    },
  };

  /* Each stage scales its 520px artboard to fit, so the composition is the same at every size. */
  const fitArt = stage => stage.style.setProperty('--s', (stage.clientWidth / 520).toFixed(4));
  const artRO = new ResizeObserver(entries => entries.forEach(e => fitArt(e.target)));
  $$('.stage').forEach(st => { fitArt(st); artRO.observe(st); });

  function makePlayer(stage) {
    const scene = scenes[stage.dataset.scene](stage), hand = makeHand(stage);
    let run = null;
    scene.reset();
    return {
      start() {
        if (run) return;
        if (still()) { scene.final(); return; }
        run = new Run();
        const me = run;
        (async () => { try { while (me.alive) await scene.play(me, hand); } catch (e) { if (e !== STOP) console.error(e); } })();
      },
      stop() { if (run) { run.stop(); run = null; } hand.hide(); },
    };
  }

  /* ---------- The pinned steps ---------- */
  const flowRefreshers = [];
  const refreshFlows = () => flowRefreshers.forEach(f => f());
  $$('.flow').forEach(flowEl => {
    const navH = () => parseFloat(getComputedStyle(root).getPropertyValue('--nav')) || 68;
    const span = () => flowEl.offsetHeight - (innerHeight - navH());
    let pinInView = false;
    const items = $$('.fs', flowEl), stages = $$('.stage', flowEl), dots = $$('.fs-dots i', flowEl);
    const rail = $('.fs-rail i', flowEl), segs = $$('.flow-bar i', flowEl), count = $('.fs-count', flowEl);
    const railBox = $('.fs-rail', flowEl), nums = $$('.fs-n', flowEl);
    const placeRail = () => {
      if (!railBox || nums.length < 2) return;
      const w = railBox.parentElement.getBoundingClientRect();
      const a = nums[0].getBoundingClientRect(), b = nums[nums.length - 1].getBoundingClientRect();
      const top = a.top + a.height / 2 - w.top, end = b.top + b.height / 2 - w.top;
      railBox.style.top = `${top.toFixed(1)}px`;
      railBox.style.bottom = 'auto';
      railBox.style.height = `${Math.max(0, end - top).toFixed(1)}px`;
    };
    // Steps open and close with a short transition, so follow the numbers while they move
    const followRail = () => { const t0 = performance.now(); const loop = () => { placeRail(); if (performance.now() - t0 < 700) requestAnimationFrame(loop); }; loop(); };
    const players = stages.map(makePlayer);
    let idx = 0;
    const activate = (i, force = false) => {
      if (i === idx && !force) return;
      idx = i;
      items.forEach((it, k) => { it.classList.toggle('is-on', k === i); it.classList.toggle('is-done', k < i); k === i ? it.setAttribute('aria-current', 'step') : it.removeAttribute('aria-current'); });
      if (count) count.textContent = `Step ${i + 1} of ${items.length}`;
      followRail();
      stages.forEach((st, k) => st.classList.toggle('is-on', k === i));
      dots.forEach((d, k) => d.classList.toggle('is-on', k === i));
      players.forEach((p, k) => (k === i && pinInView ? p.start() : p.stop()));
    };
    items.forEach((it, k) => $('.fs-head', it).addEventListener('click', () => {
      const top = flowEl.getBoundingClientRect().top + scrollY - navH() + span() * ((k + .5) / items.length);
      scrollTo({ top, behavior: still() ? 'auto' : 'smooth' });
    }));
    const progress = () => clamp((navH() - flowEl.getBoundingClientRect().top) / Math.max(1, span()), 0, .9999);
    const update = () => {
      const p = progress(), n = items.length;
      if (rail) rail.style.transform = `scaleY(${(Math.min(p * n, n - 1) / (n - 1)).toFixed(4)})`;
      segs.forEach((seg, k) => { seg.style.transform = `scaleX(${clamp(p * n - k, 0, 1).toFixed(4)})`; });
      activate(Math.floor(p * n));
    };
    const refresh = () => { players.forEach(pl => pl.stop()); activate(idx, true); };
    flowRefreshers.push(refresh);
    new IntersectionObserver(([e]) => { pinInView = e.isIntersecting; refresh(); }, { threshold: .3 }).observe($('.flow-pin', flowEl));
    addEventListener('scroll', update, { passive: true });
    addEventListener('resize', () => { update(); placeRail(); });
    update();
    placeRail();
    if (document.fonts) document.fonts.ready.then(placeRail);
  });

  /* ---------- Your shift: each moment moves the day dial and changes the suggestion ---------- */
  (function shift() {
    const list = $('.times');
    if (!list) return;
    const tabs = $$('.time', list), dial = $('.dial'), sug = $('.suggest');
    const sel = $('.sel', dial), doneArc = $('.done', dial), time = $('.dial-mid b'), sub = $('.dial-mid span');
    const ic = $('.s-ic', sug), title = $('.s-body b', sug), meta = $('.s-body em', sug);
    const C = 2 * Math.PI * 112, START = 6, LEN = 8.5; // the shift runs 6:00 am to 2:30 pm
    function render(b) {
      const h = +b.dataset.h;
      sel.style.transform = `rotate(${(h / 24) * 360 - 90}deg)`;
      doneArc.setAttribute('stroke-dasharray', `${(clamp((h - START) / LEN, 0, 1) * LEN / 24 * C).toFixed(1)} ${C.toFixed(1)}`);
      time.textContent = b.dataset.time;
      sub.textContent = b.dataset.sub;
      const icon = b.dataset.icon;
      ic.innerHTML = icon.startsWith('img:') ? `<img src="${icon.slice(4)}" alt="">`
        : icon === 'mark' ? '<svg class="mark" aria-hidden="true"><use href="#mark-s"/></svg>'
        : `<i class="ph ${icon}" aria-hidden="true"></i>`;
      title.textContent = b.dataset.title;
      meta.textContent = b.dataset.meta;
    }
    function select(i, focus = false) {
      tabs.forEach((b, k) => { const on = k === i; b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1; if (on && focus) b.focus(); });
      if (still()) { render(tabs[i]); return; }
      sug.classList.add('swap');
      setTimeout(() => { render(tabs[i]); sug.classList.remove('swap'); }, 200);
    }
    tabs.forEach((b, i) => b.addEventListener('click', () => select(i)));
    $$('.dot', dial).forEach((d, i) => d.addEventListener('click', () => select(i)));
    list.addEventListener('keydown', e => {
      const cur = tabs.findIndex(t => t.getAttribute('aria-selected') === 'true');
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { e.preventDefault(); select((cur + 1) % tabs.length, true); }
      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { e.preventDefault(); select((cur + tabs.length - 1) % tabs.length, true); }
    });
    const current = () => tabs[Math.max(0, tabs.findIndex(t => t.getAttribute('aria-selected') === 'true'))];
    render(current());
    if (!still()) {
      // Start with an empty day, then fill the shift up to the chosen moment once the dial is in view
      doneArc.setAttribute('stroke-dasharray', `0 ${C.toFixed(1)}`);
      const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setTimeout(() => render(current()), 350); io.disconnect(); } }, { threshold: .45 });
      io.observe(dial);
    }
  })();

  /* ---------- Business: industry tabs switch the photo and the text ---------- */
  (function industries() {
    const bar = $('.ind-tabs');
    if (!bar) return;
    const tabs = $$('[role="tab"]', bar), thumb = $('.ind-thumb', bar);
    const panels = tabs.map(t => document.getElementById(t.getAttribute('aria-controls')));
    const photos = $$('.ind-photos > *');
    const place = (t, instant) => {
      if (instant) thumb.style.transition = 'none';
      thumb.style.width = `${t.offsetWidth}px`;
      thumb.style.height = `${t.offsetHeight}px`;
      thumb.style.transform = `translate(${t.offsetLeft}px, ${t.offsetTop}px)`;
      if (instant) { void thumb.offsetWidth; thumb.style.transition = ''; }
    };
    function select(i, focus = false) {
      tabs.forEach((t, k) => { const on = k === i; t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1; if (on && focus) t.focus(); });
      panels.forEach((p, k) => p.classList.toggle('is-off', k !== i));
      photos.forEach((p, k) => p.classList.toggle('is-on', k === i));
      place(tabs[i]);
    }
    tabs.forEach((t, i) => t.addEventListener('click', () => select(i)));
    bar.addEventListener('keydown', e => {
      const cur = tabs.findIndex(t => t.getAttribute('aria-selected') === 'true');
      if (e.key === 'ArrowRight') { e.preventDefault(); select((cur + 1) % tabs.length, true); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); select((cur + tabs.length - 1) % tabs.length, true); }
    });
    const sync = () => place(tabs.find(t => t.getAttribute('aria-selected') === 'true'), true);
    sync();
    addEventListener('resize', sync);
    if (document.fonts) document.fonts.ready.then(sync);
  })();

  /* ---------- Nav: scrolled state, the For business menu, the phone sheet ---------- */
  const nav = $('#nav');
  if (nav) {
    const onScroll = () => nav.classList.toggle('is-scrolled', scrollY > 8);
    onScroll();
    addEventListener('scroll', onScroll, { passive: true });
  }
  const menuBtn = $('.menu-btn'), menu = $('#biz-menu');
  if (menuBtn && menu) {
    const setMenu = open => { menuBtn.setAttribute('aria-expanded', String(open)); menu.classList.toggle('is-open', open); };
    menuBtn.addEventListener('click', () => setMenu(menuBtn.getAttribute('aria-expanded') !== 'true'));
    document.addEventListener('click', e => { if (!e.target.closest('.nav-links > li')) setMenu(false); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && menuBtn.getAttribute('aria-expanded') === 'true') { setMenu(false); menuBtn.focus(); } });
    menu.addEventListener('focusout', e => { if (!menu.contains(e.relatedTarget) && e.relatedTarget !== menuBtn) setMenu(false); });
    $$('a', menu).forEach(a => a.addEventListener('click', () => setMenu(false)));
  }
  const burger = $('.burger'), sheet = $('#sheet');
  if (burger && sheet) {
    const setSheet = open => { burger.setAttribute('aria-expanded', String(open)); sheet.hidden = !open; $('i', burger).className = open ? 'ph ph-x' : 'ph ph-list'; };
    burger.addEventListener('click', () => setSheet(sheet.hidden));
    $$('a', sheet).forEach(a => a.addEventListener('click', () => setSheet(false)));
    addEventListener('resize', () => { if (innerWidth >= 1180) setSheet(false); });
  }

  /* ---------- Entrance animations: each block rises in, in order, as it comes into view ---------- */
  const ANIM = [
    '.hero-copy > *', '.sec-head > *', '.flow-text > .eyebrow', '.flow-text > .h2', '.fs-wrap', '.flow-text > .flow-cta', '.flow-stages',
    '.times > *', '.wrist', '.sleep-chips', '.sleep-grid > .sleep-card', '.sleep-list > *', '.sleep-when', '.wallet-demo', '.wallet-grid > div:last-child > *',
    '.card-band > *', '.ways > *', '.private', '.biz > :not(img)', '.get > :not(.pattern)', '.ind-top > *', '.ind-bottom', '.words-lead > *', '.story',
    '.phero .partners > div:first-child > *', '.phero .partner-demo', '.xlink', '.page-hero .wrap > *', '.contact-intro > *', '.contact-form', '.legal', '.mani > .stanza', '.mani-photo',
  ];
  const BIG = ['flow-stages', 'wrist', 'wallet-demo', 'partner-demo', 'mani-photo', 'contact-form', 'ind-bottom'];
  if (!osReduce) {
    const els = [...new Set(ANIM.flatMap(sel => $$(sel)))];
    const set = new Set(els);
    const io = new IntersectionObserver(entries => entries.forEach(e => {
      if (!e.isIntersecting) return;
      const el = e.target;
      io.unobserve(el);
      el.classList.add('in');
      // Hand the element back to its own styles once it has arrived
      const delay = 1400 + (Number(el.style.getPropertyValue('--i')) || 0) * 90;
      setTimeout(() => { el.classList.remove('anim', 'in', 'big'); el.style.removeProperty('--i'); }, delay);
    }), { threshold: .12, rootMargin: '0px 0px -6% 0px' });
    els.forEach(el => {
      const sibs = [...el.parentElement.children].filter(c => set.has(c));
      el.style.setProperty('--i', String(Math.min(sibs.indexOf(el), 6)));
      el.classList.add('anim');
      if (BIG.some(c => el.classList.contains(c)) || el.matches('.biz > *, .ways > *, .sleep-card')) el.classList.add('big');
      io.observe(el);
    });
  }

  /* ---------- The QR code: points to get.html, which opens the right app store ---------- */
  (function qr() {
    const boxes = $$('[data-qr] .qr-box');
    if (!boxes.length) return;
    const url = new URL('get.html', location.href).href;
    const draw = () => {
      if (!window.qrcode) return false;
      const q = qrcode(0, 'H');
      q.addData(url);
      q.make();
      const n = q.getModuleCount();
      let cells = '';
      for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) cells += `<rect x="${c}" y="${r}" width="1.04" height="1.04"/>`;
      const svg = `<svg viewBox="0 0 ${n} ${n}" shape-rendering="crispEdges" role="img" aria-label="QR code to download Stressie"><g fill="#1C1B17">${cells}</g></svg><svg class="mark" aria-hidden="true"><use href="#mark"/></svg>`;
      boxes.forEach(b => { b.innerHTML = svg; });
      return true;
    };
    if (!draw()) addEventListener('load', () => { if (!draw()) boxes.forEach(b => { b.closest('[data-qr]').hidden = true; }); });
  })();

  /* ---------- Copy a link (Ways in: send your manager the companies page) ---------- */
  $$('[data-copy]').forEach(btn => btn.addEventListener('click', () => {
    const link = new URL(btn.dataset.copy, location.href).href;
    const done = () => { btn.textContent = 'Copied'; setTimeout(() => { btn.textContent = 'Copy link'; }, 1800); };
    const fallback = () => { btn.textContent = link; };
    try { navigator.clipboard.writeText(link).then(done, fallback); } catch (err) { fallback(); }
  }));

  /* ---------- get.html: open the right store ---------- */
  if (document.body.classList.contains('page-get')) {
    const ua = navigator.userAgent;
    const ios = /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    if (/Android/i.test(ua)) location.replace('https://play.google.com/store/apps/details?id=com.stressiefrontend.app');
    else if (ios) location.replace('https://apps.apple.com/us/app/stressieapp/id6737459302');
  }

  /* ---------- Dark or light: dark is the default, the choice is remembered ---------- */
  $$('.theme-btn').forEach(btn => btn.addEventListener('click', () => {
    const light = root.dataset.theme !== 'light';
    if (light) root.dataset.theme = 'light'; else delete root.dataset.theme;
    try { localStorage.setItem('stressie-theme', light ? 'light' : 'dark'); } catch (e) {}
    const meta = $('meta[name="theme-color"]');
    if (meta) meta.content = light ? '#FBF9F6' : '#1C1B17';
    window.dispatchEvent(new Event('stressie-theme'));
  }));

  /* ---------- Pause animations (WCAG 2.2.2) ---------- */
  const mt = $('.motion-toggle');
  if (mt) mt.addEventListener('click', () => {
    motionOff = !motionOff;
    root.classList.toggle('motion-off', motionOff);
    mt.setAttribute('aria-pressed', String(motionOff));
    mt.textContent = motionOff ? 'Play animations' : 'Pause animations';
    refreshFlows();
  });

  /* ---------- Legal pages: highlight the section being read ---------- */
  const toc = $$('.toc a');
  if (toc.length) {
    const sections = toc.map(a => document.getElementById(a.hash.slice(1))).filter(Boolean);
    const spy = () => {
      const line = innerHeight * .3;
      let cur = sections[0];
      sections.forEach(s => { if (s.getBoundingClientRect().top <= line) cur = s; });
      if (innerHeight + scrollY >= document.documentElement.scrollHeight - 4) cur = sections[sections.length - 1];
      toc.forEach(a => a.classList.toggle('is-on', a.hash === `#${cur.id}`));
    };
    spy();
    addEventListener('scroll', spy, { passive: true });
  }

  /* ---------- Contact form ---------- */
  const form = $('#contact-form');
  if (!form) return;
  const done = $('#contact-done');
  const email = $('#cf-email'), emailErr = $('#cf-email-err');
  const groups = $$('[data-for]', form);
  const setTopic = topic => groups.forEach(g => { g.hidden = g.dataset.for !== topic; });
  form.addEventListener('change', e => { if (e.target.name === 'topic') setTopic(e.target.value); });
  // Links pick the topic or the industry with a plain #token, e.g. contact.html#partner or #healthcare
  const token = location.hash.slice(1).toLowerCase();
  if (token) {
    const r = form.querySelector(`input[name="topic"][value="${CSS.escape(token)}"], input[name="industry"][data-key="${CSS.escape(token)}"]`);
    if (r) r.checked = true;
  }
  setTopic(form.querySelector('input[name="topic"]:checked').value);
  const validEmail = () => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim());
  email.addEventListener('input', () => {
    if (email.getAttribute('aria-invalid') === 'true' && validEmail()) { email.removeAttribute('aria-invalid'); emailErr.hidden = true; }
  });
  form.addEventListener('submit', e => {
    e.preventDefault();
    if (!validEmail()) { email.setAttribute('aria-invalid', 'true'); emailErr.hidden = false; email.focus(); return; }
    // No form service is connected yet, so the answers become a message the visitor sends from their own email.
    const data = new FormData(form), t = data.get('topic');
    const lines = [`Email: ${email.value.trim()}`];
    const add = (label, value) => { if (value && String(value).trim()) lines.push(`${label}: ${String(value).trim()}`); };
    if (t === 'team') {
      add('Team wellbeing (1 to 5)', data.get('wellbeing'));
      add('Industry', data.get('industry'));
      add('Workers managed', data.get('size'));
      add('Problems the team is facing', data.getAll('problems').join(', '));
    } else if (t === 'partner') {
      add('Business', data.get('business'));
      add('What they offer', data.get('offer'));
    }
    add('Message', data.get('message'));
    const subject = { team: 'Stressie for my team', partner: 'Joining Stressie as a wellness partner', other: 'Hello from the Stressie website' }[t];
    const body = lines.join('\n');
    $('#cf-preview').textContent = `Subject: ${subject}\n\n${body}`;
    $('#cf-open').href = `mailto:info@stressieapp.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    form.hidden = true;
    done.hidden = false;
    $('h2', done).focus();
  });
  const copyBtn = $('#cf-copy');
  copyBtn.addEventListener('click', () => {
    const pre = $('#cf-preview');
    const pick = () => { const r = document.createRange(); r.selectNodeContents(pre); const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r); };
    const ok = () => { copyBtn.textContent = 'Copied'; setTimeout(() => { copyBtn.textContent = 'Copy message'; }, 1800); };
    try { navigator.clipboard.writeText(pre.textContent).then(ok, pick); } catch (err) { pick(); }
  });
  $('#cf-again').addEventListener('click', () => { done.hidden = true; form.hidden = false; email.focus(); });
})();
