/* Stressie inner pages: nav state, gentle reveals, the legal contents list, and the contact form. */
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  /* ---------- Nav ---------- */
  const nav = $('#nav');
  const onScroll = () => nav.classList.toggle('is-scrolled', scrollY > 8);
  onScroll();
  addEventListener('scroll', onScroll, { passive: true });

  /* ---------- Reveals (shared with the home page) ---------- */
  const revealIO = new IntersectionObserver(entries => entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.remove('is-waiting'); revealIO.unobserve(e.target); }
  }), { threshold: .12, rootMargin: '0px 0px -40px 0px' });
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
    $$('.reveal').forEach(el => { if (el.getBoundingClientRect().top > innerHeight) { el.classList.add('is-waiting'); revealIO.observe(el); } });
  }

  /* ---------- Legal pages: highlight the section being read ---------- */
  const toc = $$('.toc a');
  if (toc.length) {
    const sections = toc.map(a => document.getElementById(a.hash.slice(1))).filter(Boolean);
    const mark = id => toc.forEach(a => a.classList.toggle('is-on', a.hash === `#${id}`));
    const spy = () => {
      const line = innerHeight * .3;
      let cur = sections[0];
      sections.forEach(s => { if (s.getBoundingClientRect().top <= line) cur = s; });
      if (innerHeight + scrollY >= document.documentElement.scrollHeight - 4) cur = sections[sections.length - 1];
      mark(cur.id);
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

  function setTopic(topic) {
    groups.forEach(g => { g.hidden = g.dataset.for !== topic; });
  }
  form.addEventListener('change', e => { if (e.target.name === 'topic') setTopic(e.target.value); });

  // Links from the home page pick the topic or the industry with a plain #token, e.g. contact.html#partner or #healthcare
  const token = (location.hash.slice(1) || new URLSearchParams(location.search).get('topic') || new URLSearchParams(location.search).get('industry') || '').toLowerCase();
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
    if (!validEmail()) {
      email.setAttribute('aria-invalid', 'true');
      emailErr.hidden = false;
      email.focus();
      return;
    }
    // No form service is connected yet, so the answers become a message the visitor sends from their own email.
    const data = new FormData(form);
    const t = data.get('topic');
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
    done.querySelector('h2').focus();
  });

  // Copy the prepared message; if the clipboard is refused, select the text so it can be copied by hand
  const copyBtn = $('#cf-copy');
  copyBtn.addEventListener('click', () => {
    const pre = $('#cf-preview');
    const pick = () => { const r = document.createRange(); r.selectNodeContents(pre); const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r); };
    const ok = () => { copyBtn.textContent = 'Copied'; setTimeout(() => { copyBtn.textContent = 'Copy message'; }, 1800); };
    try { navigator.clipboard.writeText(pre.textContent).then(ok, pick); } catch (err) { pick(); }
  });
  $('#cf-again').addEventListener('click', () => { done.hidden = true; form.hidden = false; email.focus(); });
})();
