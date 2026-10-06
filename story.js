/* Stressie story page.
   Hero: a live MapLibre map (OpenFreeMap tiles), cleared of labels and points of interest and tinted cream,
   with just two Stressie pins and their Figma cards.
   Steps: one pinned section per audience; scrolling moves through three steps, and a hand plays each one.
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
    const el = $('#map'), hero = $('.hero');
    const ready = () => hero.classList.add('is-ready');
    const fallback = setTimeout(ready, 2500); // pins and cards still arrive if the map is slow or offline
    if (!window.maplibregl) { ready(); return; }
    const C = {
      land: '#F5EDE1', residential: '#F2E8DA', park: '#E4E9D1', wood: '#DFE6CC', water: '#D6E2E1',
      building: '#EDE2D2', path: '#EEE2D1', minor: '#FFFBF5', majorCasing: '#E8D6BF', major: '#FFFDF9',
      motorCasing: '#EFCDA6', motor: '#FBE2C4',
    };
    const paint = {
      background: { 'background-color': C.land },
      park: { 'fill-color': C.park, 'fill-opacity': 1 },
      water: { 'fill-color': C.water },
      landuse_residential: { 'fill-color': C.residential },
      landcover_wood: { 'fill-color': C.wood, 'fill-opacity': .8 },
      waterway: { 'line-color': C.water },
      building: { 'fill-color': C.building, 'fill-outline-color': '#E6D7C2' },
      road_area_pier: { 'fill-color': C.land },
      road_pier: { 'line-color': C.land },
      highway_path: { 'line-color': C.path },
      highway_minor: { 'line-color': C.minor },
      highway_major_casing: { 'line-color': C.majorCasing },
      highway_major_inner: { 'line-color': C.major },
      highway_major_subtle: { 'line-color': C.majorCasing },
      highway_motorway_casing: { 'line-color': C.motorCasing },
      highway_motorway_inner: { 'line-color': C.motor },
      highway_motorway_subtle: { 'line-color': C.motorCasing },
      highway_motorway_bridge_casing: { 'line-color': C.motorCasing },
      highway_motorway_bridge_inner: { 'line-color': C.motor },
    };
    fetch('https://tiles.openfreemap.org/styles/positron')
      .then(r => r.json())
      .then(style => {
        // Clear everything that isn't ground, water, parks, buildings or streets: no labels, no POIs, no rail.
        style.layers = style.layers.filter(l => l.type !== 'symbol' && !/boundary|railway|aeroway|glacier|ice_shelf|tunnel|building|highway_path/.test(l.id));
        style.layers.forEach(l => { if (paint[l.id]) l.paint = Object.assign({}, l.paint, paint[l.id]); });
        const small = innerWidth < 900;
        const map = new maplibregl.Map({
          container: el, style, interactive: false, fadeDuration: 0,
          center: [-122.4108, 37.7738], zoom: small ? 13.7 : 14.5, bearing: -12,
          attributionControl: { compact: true, customAttribution: '<a href="https://openfreemap.org" target="_blank" rel="noopener">OpenFreeMap</a> © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>' },
        });
        map.once('idle', () => {
          clearTimeout(fallback);
          el.classList.add('is-ready');
          ready();
        });
        map.on('error', () => ready());
      })
      .catch(ready);
  })();

  /* ---------- Stress ramp and the check-in shape (same language as the app) ---------- */
  const css = getComputedStyle(root);
  const hexRgb = h => { const n = parseInt(h.trim().replace('#', ''), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
  const RAMP = [0, 1, 2, 3, 4, 5, 6].map(i => hexRgb(css.getPropertyValue(`--s${i}`)));
  const rampRgb = v => { const x = clamp(v, 0, 1) * 6, i = Math.min(5, Math.floor(x)), t = x - i; return RAMP[i].map((c, k) => Math.round(c + (RAMP[i + 1][k] - c) * t)); };
  const rgb = a => `rgb(${a.join(',')})`;
  const mix = (a, b, t) => a.map((c, k) => Math.round(c + (b[k] - c) * t));
  const WORDS = ['Lightly', 'A little', 'Somewhat', 'Moderately', 'Quite', 'Very', 'Extremely'];
  const levelWord = v => (v < .08 ? 'Not stressed' : `${WORDS[Math.round(clamp(v, 0, 1) * 6)]} stressed`);
  function shapePath(v, scale, rot) {
    let m, amp, q;
    if (v <= .5) { const t = 1 - v / .5; m = 5; amp = .26 * Math.pow(t, .9); q = .55; }
    else { const t = (v - .5) / .5; m = 8; amp = .44 * t; q = 1.4 + 3.6 * t; }
    const R = 100 * scale, N = 200;
    let d = '';
    for (let i = 0; i <= N; i++) {
      const th = (i / N) * Math.PI * 2;
      const r = R * (1 - amp + amp * Math.pow(Math.abs(Math.cos((m * th) / 2)), q));
      const a = th + rot - Math.PI / 2;
      d += `${i ? 'L' : 'M'}${(r * Math.cos(a)).toFixed(1)},${(r * Math.sin(a)).toFixed(1)}`;
    }
    return d + 'Z';
  }

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
      follow(p) { place(p, 0); },
      down() { hand.classList.add('down'); },
      up() { hand.classList.remove('down'); ripple(); },
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

  /* ---------- Scenes ---------- */
  const scenes = {
    checkin(stage) {
      const thumb = $('.ui-thumb', stage), fill = $('.fill', stage), track = $('.ui-slider', stage);
      const word = $('.ui-word', stage), pts = $('.ci-a .ui-pts', stage), pv = $('.pv', stage);
      const ciA = $('.ci-a', stage), ciB = $('.ci-b', stage), slide = $('.ci-slide', stage), ok = $('.ci-ok', stage);
      const [p1, p2, p3] = ['.u1', '.u2', '.u3'].map(s => $(s, stage));
      function setV(v) {
        const w = track.clientWidth || 300, x = 3 + v * (w - 30);
        thumb.style.left = `${x}px`;
        fill.style.width = `${x + 12}px`;
        const c = rampRgb(v);
        thumb.style.background = rgb(c);
        word.textContent = levelWord(v);
        [[p1, 1, .1, .3], [p2, .84, -.12, .45], [p3, .48, 0, 1]].forEach(([p, sc, rot, op]) => {
          p.setAttribute('d', shapePath(v, sc, rot));
          p.setAttribute('fill', op === 1 ? rgb(c) : rgb(mix(c, [255, 255, 255], .3)));
          p.setAttribute('fill-opacity', op);
          p.setAttribute('stroke', '#fff');
          p.setAttribute('stroke-width', '2');
        });
      }
      return {
        reset() { setV(.1); show(ciA); show(slide); show(ok, false); show(ciB, false); pv.textContent = '1,240'; },
        final() { setV(.74); show(ciA, false); show(ciB); pv.textContent = '1,245'; },
        async play(run, h) {
          this.reset();
          await wait(run, 500);
          await h.enter(run, h.at(thumb));
          h.down();
          thumb.classList.add('grab');
          await wait(run, 180);
          await animate(run, 1600, E.io, t => { setV(lerp(.1, .74, t)); h.follow(h.at(thumb)); });
          await wait(run, 200);
          thumb.classList.remove('grab');
          h.up();
          h.leave(run).catch(() => {});
          await wait(run, 250);
          show(slide, false);
          show(ok);
          pv.textContent = '1,245';
          pts.classList.add('bump');
          setTimeout(() => pts.classList.remove('bump'), 260);
          await wait(run, 1500);
          show(ciA, false);
          show(ciB);
          await wait(run, 3600);
        },
      };
    },

    reset(stage) {
      const one = $('.rs-one', stage), two = $('.rs-two', stage), start = $('.rs-start', stage);
      const orb = $('.rs-orb', stage), ring = $('.rs-ring .p', stage), phase = $('.rs-phase', stage), done = $('.rs-done', stage);
      const C = 534;
      phase.style.transition = 'opacity .18s';
      const setPhase = text => { phase.style.opacity = 0; setTimeout(() => { phase.textContent = text; phase.style.opacity = 1; }, 180); };
      return {
        reset() { one.classList.remove('gone', 'off'); two.classList.add('gone'); orb.style.transform = 'scale(.6)'; ring.style.strokeDashoffset = C; phase.textContent = 'Breathe in'; show(done, false); },
        final() { one.classList.add('gone'); two.classList.remove('gone'); orb.style.transform = 'scale(.8)'; ring.style.strokeDashoffset = 0; phase.textContent = 'Nicely done'; show(done); },
        async play(run, h) {
          this.reset();
          await wait(run, 500);
          await h.enter(run, h.at(start));
          await h.tap(run, start);
          one.classList.add('off');
          await wait(run, 280);
          one.classList.add('gone');
          two.classList.remove('gone');
          h.leave(run).catch(() => {});
          await animate(run, 2600, E.io, t => { orb.style.transform = `scale(${lerp(.6, 1, t)})`; ring.style.strokeDashoffset = C * (1 - t * .42); });
          setPhase('Hold');
          await animate(run, 1000, t => t, t => { ring.style.strokeDashoffset = C * (1 - .42 - t * .14); });
          setPhase('Breathe out');
          await animate(run, 2600, E.io, t => { orb.style.transform = `scale(${lerp(1, .62, t)})`; ring.style.strokeDashoffset = C * (1 - .56 - t * .44); });
          setPhase('Nicely done');
          show(done);
          await wait(run, 2600);
        },
      };
    },

    map(stage) {
      const pin = $('[data-pin="b"]', stage), card = $('.map-card', stage), redeem = $('.map-redeem', stage), code = $('.map-code', stage);
      return {
        reset() { show(card, false); show(code, false); pin.classList.remove('hit'); },
        final() { show(card, false); show(code); pin.classList.add('hit'); },
        async play(run, h) {
          this.reset();
          await wait(run, 500);
          await h.enter(run, h.at(pin, .5, .35));
          await h.tap(run);
          pin.classList.add('hit');
          show(card);
          await wait(run, 800);
          await h.move(run, h.at(redeem));
          await h.tap(run, redeem);
          show(card, false);
          show(code);
          await wait(run, 300);
          await h.leave(run);
          await wait(run, 2600);
        },
      };
    },

    code(stage) {
      const field = $('.code-field', stage), text = $('.code-text', stage), join = $('.code-join', stage), ok = $('.code-ok', stage);
      const CODE = 'EMBER24';
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

    trends(stage) {
      const ui = $('.ui', stage), bars = $$('.bars i', stage), work = $('.b-work', stage), tip = $('.tr-tip', stage), start = $('.tr-start', stage);
      const placeTip = () => {
        const u = ui.getBoundingClientRect(), b = $('i', work).getBoundingClientRect(), k = u.width / ui.offsetWidth || 1;
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

  /* ---------- Two ways in: one pinned section, two audiences. Scroll moves through the three steps. ---------- */
  const flowEl = $('.flow');
  const navH = () => parseFloat(getComputedStyle(root).getPropertyValue('--nav')) || 72;
  const span = () => flowEl.offsetHeight - (innerHeight - navH());
  let pinInView = false;
  const groups = $$('.flow-group').map(group => {
    const items = $$('.fs', group), stages = $$('.stage', group), dots = $$('.fs-dots i', group), rail = $('.flow-rail i', group);
    const players = stages.map(makePlayer);
    let idx = 0;
    const live = () => pinInView && !group.hidden;
    function activate(i, force = false) {
      if (i === idx && !force) return;
      idx = i;
      items.forEach((it, k) => { it.classList.toggle('is-on', k === i); k === i ? it.setAttribute('aria-current', 'step') : it.removeAttribute('aria-current'); });
      stages.forEach((st, k) => st.classList.toggle('is-on', k === i));
      dots.forEach((d, k) => d.classList.toggle('is-on', k === i));
      players.forEach((p, k) => (k === i && live() ? p.start() : p.stop()));
    }
    items.forEach((it, k) => $('.fs-head', it).addEventListener('click', () => {
      const top = flowEl.getBoundingClientRect().top + scrollY - navH() + span() * ((k + .5) / items.length);
      scrollTo({ top, behavior: still() ? 'auto' : 'smooth' });
    }));
    return {
      group,
      update(p) { if (rail) rail.style.transform = `scaleY(${p})`; activate(Math.floor(p * items.length)); },
      refresh() { players.forEach(pl => pl.stop()); activate(idx, true); },
    };
  });
  const progress = () => clamp((navH() - flowEl.getBoundingClientRect().top) / Math.max(1, span()), 0, .9999);
  const updateFlows = () => { const p = progress(); groups.forEach(g => { if (!g.group.hidden) g.update(p); }); };
  const refreshFlows = () => groups.forEach(g => g.refresh());
  new IntersectionObserver(([e]) => { pinInView = e.isIntersecting; refreshFlows(); }, { threshold: .3 }).observe($('.flow-pin'));
  addEventListener('scroll', updateFlows, { passive: true });
  addEventListener('resize', updateFlows);
  updateFlows();

  /* ---------- The toggle: switches the headline, the steps and the call to action ---------- */
  const toggle = $('.toggle'), tabs = $$('[role="tab"]', toggle);
  const who = $('.flow-title .who'), sub = $('.flow-sub');
  const COPY = {
    you: { who: 'you', sub: "For the long shifts, the full inbox and the nights you can't switch off." },
    teams: { who: 'your team', sub: 'For people who work long, uneven shifts, and the leaders who look out for them.' },
  };
  function setMode(mode, focus = false) {
    if (toggle.dataset.mode === mode) return;
    toggle.dataset.mode = mode;
    tabs.forEach(t => {
      const on = t.id === `tab-${mode}`;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      if (on && focus) t.focus();
    });
    const swap = (el, text) => {
      if (still()) { el.textContent = text; return; }
      el.classList.add('swap');
      setTimeout(() => { el.textContent = text; el.classList.remove('swap'); }, 200);
    };
    swap(who, COPY[mode].who);
    swap(sub, COPY[mode].sub);
    $$('.flow-group').forEach(m => { const on = m.id === `mode-${mode}`; m.hidden = !on; m.classList.toggle('is-on', on); });
    refreshFlows();
    updateFlows();
  }
  tabs.forEach(t => t.addEventListener('click', () => setMode(t.id.replace('tab-', ''))));
  toggle.addEventListener('keydown', e => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    setMode(toggle.dataset.mode === 'you' ? 'teams' : 'you', true);
  });
  $$('[data-mode]').forEach(a => { if (!a.closest('.toggle')) a.addEventListener('click', () => setMode(a.dataset.mode)); });
  if (location.hash === '#teams' || location.hash === '#you') {
    setMode(location.hash.slice(1));
    requestAnimationFrame(() => $('#ways').scrollIntoView());
  }

  /* ---------- Industries: tabs switch the text and the photo ---------- */
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

  /* ---------- Nav and reveals ---------- */
  const nav = $('#nav');
  const onScroll = () => nav.classList.toggle('is-scrolled', scrollY > 8);
  onScroll();
  addEventListener('scroll', onScroll, { passive: true });
  // Reveals rest visible. Only blocks below the first screen wait to fade in, and only once this script runs.
  const revealIO = new IntersectionObserver(entries => entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.remove('is-waiting'); revealIO.unobserve(e.target); }
  }), { threshold: .12, rootMargin: '0px 0px -40px 0px' });
  if (!osReduce) $$('.reveal').forEach(el => { if (el.getBoundingClientRect().top > innerHeight) { el.classList.add('is-waiting'); revealIO.observe(el); } });

  /* ---------- Pause animations (WCAG 2.2.2) ---------- */
  const mt = $('.motion-toggle');
  mt.addEventListener('click', () => {
    motionOff = !motionOff;
    root.classList.toggle('motion-off', motionOff);
    mt.setAttribute('aria-pressed', String(motionOff));
    mt.textContent = motionOff ? 'Play animations' : 'Pause animations';
    refreshFlows();
  });
})();
