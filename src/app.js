(function () {
  const KEY = 'dgu.v1';
  const PRACTICE_DAYS = 7; // last week before the exam is for practice exams only
  const $app = document.getElementById('app');
  const $tabs = document.getElementById('tabs');

  // ---------- state ----------
  let state = load();
  let tab = 'today';
  let draft = { step: 1 };

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; }
  }
  function save() { localStorage.setItem(KEY, JSON.stringify(state)); }

  // ---------- dates ----------
  const pad = (n) => String(n).padStart(2, '0');
  const keyOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const fromKey = (k) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
  const addDays = (k, n) => { const d = fromKey(k); d.setDate(d.getDate() + n); return keyOf(d); };
  const diffDays = (a, b) => Math.round((fromKey(b) - fromKey(a)) / 86400000);
  const today = () => keyOf(new Date());

  // ---------- helpers ----------
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const allLessons = () => (state.course ? state.course.sections.flatMap((s) => s.lessons) : []);
  const fmtMin = (m) => (m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`);

  function dayOk(k) {
    const did = allLessons().some((l) => l.done && l.doneAt === k);
    const note = state.log && state.log[k] && state.log[k].note;
    return did && !!note;
  }

  function stats() {
    const t = today();
    const lessons = allLessons();
    const done = lessons.filter((l) => l.done).length;
    const total = lessons.length;
    const doneToday = lessons.filter((l) => l.done && l.doneAt === t).length;
    const remaining = total - done;
    const studyEnd = addDays(state.examDate, -PRACTICE_DAYS);
    const daysToExam = diffDays(t, state.examDate);
    const studyDaysLeft = Math.max(1, diffDays(t, studyEnd) + 1);
    const inPracticeWeek = daysToExam <= PRACTICE_DAYS;
    const target = inPracticeWeek ? remaining + doneToday : Math.ceil((remaining + doneToday) / studyDaysLeft);
    const remainingMin = lessons.filter((l) => !l.done).reduce((a, l) => a + (l.min || 0), 0);

    // expected progress if you had studied evenly from the start date
    const span = Math.max(1, diffDays(state.startedAt, studyEnd) + 1);
    const elapsed = Math.min(span, Math.max(0, diffDays(state.startedAt, t)));
    const expected = Math.floor((elapsed / span) * total);

    const y1 = addDays(t, -1), y2 = addDays(t, -2);
    const started = (k) => diffDays(state.startedAt, k) >= 0;
    const missed1 = started(y1) && !dayOk(y1);
    const missed2 = missed1 && started(y2) && !dayOk(y2);

    let streak = 0;
    for (let k = dayOk(t) ? t : y1; started(k) && dayOk(k); k = addDays(k, -1)) streak++;

    return { t, done, total, doneToday, remaining, target, daysToExam, inPracticeWeek, remainingMin,
      pct: total ? done / total : 0, behind: Math.max(0, expected - done), missed1, missed2, streak };
  }

  // ---------- buddy ----------
  function buddyLink(msg) {
    const phone = (state.buddyPhone || '').replace(/[^\d]/g, '');
    const text = encodeURIComponent(msg);
    return phone ? `https://wa.me/${phone}?text=${text}` : `sms:?&body=${text}`;
  }
  function confessionMsg(s) {
    return `${state.buddyName || 'Hey'}, I'm telling you as agreed: I skipped studying 2 days in a row for my ${state.examName} exam (${state.examDate}). ` +
      `I'm at ${Math.round(s.pct * 100)}%. Our deal: ${state.stake || 'call me out'}. Hold me to it.`;
  }

  // ---------- views ----------
  function render() {
    $tabs.hidden = !state.course;
    [...$tabs.children].forEach((b) => b.classList.toggle('on', b.dataset.tab === tab));
    if (!state.course) return renderSetup();
    if (tab === 'lessons') return renderLessons();
    if (tab === 'settings') return renderSettings();
    renderToday();
  }

  function renderSetup() {
    if (draft.step === 1) {
      $app.innerHTML = `
        <h1>Don't Give Up</h1>
        <p class="muted">No exam date, no goal. Start with the exam you booked.</p>
        <div class="card">
          <label>Exam</label>
          <input id="examName" value="${esc(draft.examName || 'AWS Certified Cloud Practitioner')}">
          <label>Exam date (the one you booked)</label>
          <input id="examDate" type="date" min="${addDays(today(), 1)}" value="${esc(draft.examDate || '')}">
          <label>Accountability buddy (name)</label>
          <input id="buddyName" placeholder="Someone who will call you out" value="${esc(draft.buddyName || '')}">
          <label>Buddy's WhatsApp number (with country code, optional)</label>
          <input id="buddyPhone" inputmode="tel" placeholder="+34 600 000 000" value="${esc(draft.buddyPhone || '')}">
          <label>What do you lose if you quit?</label>
          <input id="stake" placeholder="e.g. I pay you $20" value="${esc(draft.stake || '')}">
          <button class="primary" data-act="step2">Next: add the course</button>
        </div>`;
      return;
    }
    const preview = draft.sections || [];
    const n = preview.reduce((a, s) => a + s.lessons.length, 0);
    const mins = preview.reduce((a, s) => a + s.lessons.reduce((b, l) => b + (l.min || 0), 0), 0);
    $app.innerHTML = `
      <h1>Add your course</h1>
      <p class="muted">One course at a time. You unlock the next one when you pass.</p>
      <div class="card">
        <label>Udemy course link</label>
        <input id="url" type="url" placeholder="https://www.udemy.com/course/..." value="${esc(draft.url || '')}">
        <label>Course name</label>
        <input id="title" value="${esc(draft.title || '')}">
        <label>Paste the lesson list</label>
        <textarea id="curr" placeholder="Paste here...">${esc(draft.curr || '')}</textarea>
        <ol class="steps">
          <li>Open the course page on Udemy in a browser (works on phone in Chrome/Safari).</li>
          <li>Go to <b>Course content</b> and tap <b>Expand all sections</b>.</li>
          <li>Select the whole list, copy, and paste it above.</li>
        </ol>
        <p class="muted">Udemy doesn't let other apps read its lesson list, so a link alone can't load it. Pasting takes about 30 seconds.</p>
        ${draft.url ? `<button class="link" data-act="openUdemy">Open course on Udemy ↗</button>` : ''}
        <p><b>${n}</b> lessons in <b>${preview.length}</b> sections${mins ? ` · ${fmtMin(mins)}` : ''}</p>
        ${preview.slice(0, 3).map((s) => `<p class="muted">• ${esc(s.title)} (${s.lessons.length})</p>`).join('')}
        <button class="primary" data-act="finish" ${n ? '' : 'disabled'}>Start</button>
        <button class="link" data-act="back">← Back</button>
      </div>`;
  }

  function renderToday() {
    const s = stats();
    const next = allLessons().filter((l) => !l.done || l.doneAt === s.t);
    const todays = next.slice(0, Math.max(s.target, s.doneToday));
    const note = (state.log && state.log[s.t] && state.log[s.t].note) || '';
    const okToday = dayOk(s.t);
    const alerts = [];

    if (s.daysToExam < 0) {
      alerts.push(`<div class="alert good">Exam day has passed. Did you pass? Mark it in Settings to unlock your next course.</div>`);
    } else if (s.missed2) {
      alerts.push(`<div class="alert bad">You missed 2 days in a row.
        <p>This is where you usually quit. You agreed to tell ${esc(state.buddyName || 'your buddy')}. Do it now, then do today's lessons.</p>
        <a href="${esc(buddyLink(confessionMsg(s)))}" target="_blank" rel="noopener"><button class="primary">Message ${esc(state.buddyName || 'buddy')}</button></a></div>`);
    } else if (s.missed1) {
      alerts.push(`<div class="alert warn">You missed yesterday. Fine, once. Never miss twice: today isn't optional.</div>`);
    }
    if (s.inPracticeWeek && s.daysToExam >= 0) {
      alerts.push(`<div class="alert warn">Practice-exam week. Do one full practice exam per day and review every mistake.</div>`);
    } else if (s.pct >= 0.3 && s.pct < 0.5) {
      alerts.push(`<div class="alert warn">The boring middle (30–50%). Most people quit here. Expect it to feel slow. Keep the daily minimum anyway.</div>`);
    }
    if (s.behind > 0 && !s.inPracticeWeek) {
      alerts.push(`<div class="alert bad">${s.behind} lessons behind schedule.<p>Today's target already includes catching up.</p></div>`);
    }

    const strip = [];
    for (let i = 13; i >= 0; i--) {
      const k = addDays(s.t, -i);
      strip.push(`<span class="${dayOk(k) ? 'ok' : ''} ${i === 0 ? 'today' : ''}" title="${k}"></span>`);
    }

    $app.innerHTML = `
      <h1>${esc(state.examName)}</h1>
      <div class="row">
        <div class="card stat"><div class="big">${Math.max(0, s.daysToExam)}</div><div class="muted">days to exam</div></div>
        <div class="card stat"><div class="big">${s.streak}</div><div class="muted">day streak</div></div>
        <div class="card stat"><div class="big">${Math.round(s.pct * 100)}%</div><div class="muted">done</div></div>
      </div>
      ${alerts.join('')}
      <div class="card next">
        <h2>Today: ${s.doneToday} / ${s.target} lessons ${okToday && s.doneToday >= s.target ? '✅' : ''}</h2>
        ${todays.length ? todays.map(lessonRow).join('') : '<p class="muted">All lessons done. Now do practice exams.</p>'}
      </div>
      <div class="card">
        <h2>Proof: one thing you learned today</h2>
        <p class="muted">Watching isn't learning. Write it in your own words. Today only counts with a lesson done <b>and</b> this filled in.</p>
        <textarea id="note" placeholder="e.g. S3 is object storage; durability 11 nines; storage classes trade cost for retrieval time...">${esc(note)}</textarea>
        <button class="primary" data-act="saveNote">Save</button>
      </div>
      <div class="card">
        <h2>Last 14 days</h2>
        <div class="days">${strip.join('')}</div>
        <p class="muted">${s.done}/${s.total} lessons${s.remainingMin ? ` · ${fmtMin(s.remainingMin)} left` : ''}</p>
        <div class="bar"><div style="width:${s.pct * 100}%"></div></div>
      </div>`;
  }

  function lessonRow(l) {
    const id = allLessons().indexOf(l);
    return `<label class="lesson ${l.done ? 'done' : ''}">
      <input type="checkbox" data-lesson="${id}" ${l.done ? 'checked' : ''}>
      <span class="t">${esc(l.title)}</span>${l.min ? `<span class="m">${l.min}m</span>` : ''}</label>`;
  }

  function renderLessons() {
    const s = stats();
    const firstOpen = state.course.sections.findIndex((sec) => sec.lessons.some((l) => !l.done));
    $app.innerHTML = `
      <h1>${esc(state.course.title)}</h1>
      <p class="muted">${s.done}/${s.total} lessons · ${Math.round(s.pct * 100)}%</p>
      <div class="bar"><div style="width:${s.pct * 100}%"></div></div>
      ${state.course.url ? `<button class="link" data-act="openCourse">Open in Udemy ↗</button>` : ''}
      ${state.course.sections.map((sec, i) => {
        const d = sec.lessons.filter((l) => l.done).length;
        return `<details ${i === firstOpen ? 'open' : ''}>
          <summary><span>${esc(sec.title)}</span><span class="muted">${d}/${sec.lessons.length}${d === sec.lessons.length ? ' ✅' : ''}</span></summary>
          ${sec.lessons.map(lessonRow).join('')}
        </details>`;
      }).join('')}`;
  }

  function renderSettings() {
    const s = stats();
    $app.innerHTML = `
      <h1>Settings</h1>
      <div class="card">
        <label>Exam date</label>
        <input id="examDate" type="date" value="${esc(state.examDate)}">
        <p class="muted">Moving the date later is how you lie to yourself. Only change it if the exam was really rescheduled.</p>
        <label>Buddy name</label><input id="buddyName" value="${esc(state.buddyName || '')}">
        <label>Buddy WhatsApp</label><input id="buddyPhone" inputmode="tel" value="${esc(state.buddyPhone || '')}">
        <label>Stake</label><input id="stake" value="${esc(state.stake || '')}">
        <button class="primary" data-act="saveSettings">Save</button>
      </div>
      <div class="card">
        <h2>Update lesson list</h2>
        <p class="muted">Paste the list again if the course changed. Lessons with the same name stay marked as done.</p>
        <textarea id="curr" placeholder="Paste here..."></textarea>
        <button class="primary" data-act="replaceCurr">Update lessons</button>
      </div>
      <div class="card">
        <h2>Exam result</h2>
        <button class="primary" data-act="passed" ${s.daysToExam > 0 ? 'disabled' : ''}>I passed — unlock next course</button>
        ${s.daysToExam > 0 ? '<p class="muted">Available on exam day.</p>' : ''}
        <button class="danger" data-act="quit">I give up</button>
      </div>
      <div class="card">
        <h2>Backup</h2>
        <p class="muted">Your progress is saved only on this phone. Export it now and then.</p>
        <button data-act="export">Export</button> <button data-act="import">Import</button>
      </div>
      ${state.history && state.history.length ? `<div class="card"><h2>Finished</h2>${state.history.map((h) => `<p>✅ ${esc(h.examName)} · ${esc(h.passedOn)}</p>`).join('')}</div>` : ''}`;
  }

  // ---------- actions ----------
  const val = (id) => (document.getElementById(id) || {}).value || '';

  function readStep1() {
    ['examName', 'examDate', 'buddyName', 'buddyPhone', 'stake'].forEach((k) => { draft[k] = val(k).trim(); });
  }

  function mergeSections(sections, old) {
    const doneByTitle = new Map(old.filter((l) => l.done).map((l) => [l.title, l.doneAt]));
    return sections.map((sec) => ({
      title: sec.title,
      lessons: sec.lessons.map((l) => ({ title: l.title, min: l.min || 0, done: doneByTitle.has(l.title), doneAt: doneByTitle.get(l.title) || null })),
    }));
  }

  const actions = {
    step2() {
      readStep1();
      if (!draft.examDate) return alert('Put the exam date you booked. No date, no plan.');
      if (diffDays(today(), draft.examDate) < 1) return alert('The exam date must be in the future.');
      draft.step = 2; render();
    },
    back() { draft.step = 1; render(); },
    openUdemy() { window.open(draft.url, '_blank', 'noopener'); },
    openCourse() { window.open(state.course.url, '_blank', 'noopener'); },
    finish() {
      Object.assign(state, {
        examName: draft.examName || 'My exam', examDate: draft.examDate, buddyName: draft.buddyName,
        buddyPhone: draft.buddyPhone, stake: draft.stake, startedAt: today(), log: state.log || {},
        course: { title: draft.title || draft.examName, url: draft.url, sections: mergeSections(draft.sections, []) },
      });
      draft = { step: 1 }; tab = 'today'; save(); render();
    },
    saveNote() {
      const note = val('note').trim();
      state.log = state.log || {};
      state.log[today()] = { ...(state.log[today()] || {}), note };
      save(); render();
      if (note && !dayOk(today())) alert('Saved. Mark at least one lesson done to count today.');
    },
    saveSettings() {
      const d = val('examDate');
      if (d && d !== state.examDate && diffDays(state.examDate, d) > 0 &&
          !confirm(`Move the exam ${diffDays(state.examDate, d)} days later? Is it really rescheduled, or are you avoiding it?`)) return;
      Object.assign(state, { examDate: d || state.examDate, buddyName: val('buddyName').trim(), buddyPhone: val('buddyPhone').trim(), stake: val('stake').trim() });
      save(); alert('Saved.'); render();
    },
    replaceCurr() {
      const secs = Parser.parseCurriculum(val('curr'));
      if (!secs.length) return alert('No lessons found in that text.');
      state.course.sections = mergeSections(secs, allLessons());
      save(); tab = 'lessons'; render();
    },
    passed() {
      if (!confirm(`Passed ${state.examName}? This archives this course.`)) return;
      state.history = [...(state.history || []), { examName: state.examName, passedOn: today() }];
      delete state.course; draft = { step: 1, examName: 'AWS Certified Solutions Architect – Associate' };
      save(); render();
    },
    quit() {
      const s = stats();
      const typed = prompt(`You're ${Math.round(s.pct * 100)}% through, ${s.daysToExam} days from the exam. Quitting deletes all progress.\n\nType I GIVE UP to confirm.`);
      if (typed !== 'I GIVE UP') return;
      const keepHistory = state.history;
      state = { history: keepHistory }; draft = { step: 1 }; save(); render();
    },
    export() {
      const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = `dont-give-up-${today()}.json`; a.click();
    },
    import() {
      const input = document.createElement('input');
      input.type = 'file'; input.accept = 'application/json';
      input.onchange = async () => {
        try { state = JSON.parse(await input.files[0].text()); save(); render(); } catch { alert('Invalid backup file.'); }
      };
      input.click();
    },
  };

  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-act],[data-tab]');
    if (!t) return;
    if (t.dataset.tab) { tab = t.dataset.tab; render(); window.scrollTo(0, 0); return; }
    actions[t.dataset.act] && actions[t.dataset.act]();
  });

  document.addEventListener('change', (e) => {
    const id = e.target.dataset.lesson;
    if (id === undefined) return;
    const l = allLessons()[+id];
    l.done = e.target.checked;
    l.doneAt = l.done ? today() : null;
    save(); render();
  });

  document.addEventListener('input', (e) => {
    if (state.course) return;
    if (e.target.id === 'url') {
      draft.url = e.target.value.trim();
      if (!draft.title) { draft.title = Parser.titleFromUrl(draft.url); const t = document.getElementById('title'); if (t) t.value = draft.title; }
    }
    if (e.target.id === 'title') draft.title = e.target.value;
    if (e.target.id === 'curr') {
      draft.curr = e.target.value;
      draft.sections = Parser.parseCurriculum(draft.curr);
      const pos = e.target.selectionStart;
      render();
      const ta = document.getElementById('curr');
      ta.focus(); ta.setSelectionRange(pos, pos);
    }
  });

  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
  render();
})();
