/* A local mascot controller. No network calls, audio, or persistent visitor data.
   Stable SVG part names keep interaction logic separate from the chosen artwork. */
(() => {
  const root = document.querySelector('.sheep-companion');
  if (!root) return;
  const button = root.querySelector('.sheep-button');
  const svg = button.querySelector('svg');
  const motionData = JSON.parse(document.querySelector('#sheep-motion-data').textContent);
  // Short transitions share the same gaze-preserving controller as the full actions.
  for (const [name,id] of [['rest','idle'],['drowsy','drowsy'],['press','crouch']]) {
    motionData.sequences[name] = {frames:[[id,300]]};
  }
  const mascot = new window.BUSheep(svg, motionData);
  // This page owns proximity and interaction gating; avoid a second pointer listener.
  document.removeEventListener('pointermove', mascot.pointer);
  let actionRevision = 0;
  const bubble = button.querySelector('.sheep-bubble');
  const caption = button.querySelector('.sheep-caption');
  const status = root.querySelector('.sheep-status');
  const hero = document.querySelector('.hero');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  const timers = new Map();
  const lines = [
    'Oh, hello. Nice to meet ewe.', 'Small sheep. Big thoughts.',
    'Just here to keep ewe company.', 'Still no pockets.',
    'Soft wool. Strong opinions on grass.', 'I supervise the daydreaming.'
  ];
  let state = 'awake', visible = true, engaged = false, clickCount = 0;
  let lastClick = -Infinity, lastWelcome = -Infinity, lastPat = -Infinity, lastPatSpeech = -Infinity;
  let press = null, skipPointerClickUntil = 0, frame = 0, point = null;
  let stroke = null;
  let guide = null;
  let lastSnack = -Infinity;
  const now = () => performance.now();
  const active = () => visible && !document.hidden;
  const resting = () => ['drowsy', 'yawning', 'sleeping'].includes(state);
  function cancel(name) {
    clearTimeout(timers.get(name)); timers.delete(name);
  }
  function later(name, delay, action) {
    cancel(name);
    timers.set(name, setTimeout(() => {
      timers.delete(name);
      if (active()) action();
    }, delay));
  }
  function stopAnimations() { actionRevision++; mascot.stop(); }
  function play(name, done) {
    if (!active()) return;
    const revision = ++actionRevision;
    mascot.play(name).then(() => {
      if (revision === actionRevision && active()) done?.();
    });
  }
  function clearStroke() {
    // Let the next pointer event update the target. Never snap during an action.
    stroke = null;
  }
  function setState(next) {
    cancel('state'); cancel('blink'); cancel('idle'); cancel('reaction'); cancel('wander');
    stopAnimations(); delete button.dataset.mood;
    state = next; button.dataset.state = next;
    mascot.follow = finePointer.matches && next === 'awake' && active();
    button.toggleAttribute('data-sleeping', next === 'sleeping');
    caption.textContent = ({sleeping:'Daydreaming…',drowsy:'Getting sleepy',yawning:'A tiny yawn',
      petting:'More head pats?',feeding:'Nom, nom',pressed:'Soft little sheep',waking:'Oh, hello again'}[next] || 'Say hello');
  }
  function speak(text, announce = false) {
    bubble.textContent = text; button.dataset.talking = 'true';
    status.textContent = announce ? text : '';
    later('message', 4400, () => { delete button.dataset.talking; status.textContent = ''; });
  }
  function scheduleBlink() {
    if (!engaged || motion.matches || state !== 'awake' || !active() || timers.has('blink')) return;
    later('blink', 5500, () => {
      if (state === 'awake' && !button.dataset.mood && !mascot.scripted) play('blink');
      scheduleBlink();
    });
  }
  function idleLater() {
    cancel('idle'); cancel('wander');
    if (!engaged || state !== 'awake' || !active()) return;
    // A quiet glance, then an occasional snack; never interrupt a project note.
    later('wander', 8000, () => {
      if (!motion.matches && !mascot.scripted && !guide?.isOpen()) play('turn');
    });
    later('idle', 20000, () => {
      if (guide?.isOpen()) { idleLater(); return; }
      if (now() - lastSnack >= 90000) { snack(); return; }
      setState('drowsy'); play('drowsy');
      later('state', 4000, yawnAndSleep);
    });
  }
  function snack() {
    if (state !== 'awake') return;
    lastSnack = now(); setState('feeding');
    // Passive reactions are visual; no unsolicited screen-reader announcement.
    play('eat', awake);
  }
  function awake() {
    setState('awake'); play('rest'); scheduleBlink(); idleLater();
  }
  function engage() {
    engaged = true;
    if (state === 'awake') { idleLater(); scheduleBlink(); }
  }
  function yawnAndSleep() {
    setState('yawning');
    play('sleep', () => setState('sleeping'));
  }
  function nod() { play('talk', () => { if (motion.matches) play('rest'); }); }
  function hop() { play('hop', () => { if (motion.matches) play('rest'); }); }
  function wakeGreeting() {
    engaged = true; setState('waking');
    speak('I was thinking. Probably.', true);
    play('wake', awake);
  }
  function pet(announce = false) {
    guide?.interacted();
    if (state === 'pressed') return;
    engaged = true; lastPat = now(); setState('petting');
    if (announce || now() - lastPatSpeech > 8000) {
      speak('That’s the spot. Thank ewe.', announce); lastPatSpeech = now();
    }
    play('pat', awake);
  }
  function greet() {
    if (state === 'waking') return;
    if (resting()) { wakeGreeting(); return; }
    const fast = now() - lastClick < 600; lastClick = now();
    engage(); awake(); clickCount++;
    if (clickCount === 3) {
      speak('You’ve counted me three times.', true); hop();
    } else if (clickCount === 10) {
      speak('Ten hellos. Still just one sheep.', true); hop();
    } else if (fast) {
      pet(true);
    } else {
      speak(lines[(clickCount - 1) % lines.length], true);
      button.dataset.mood = 'hello';
      if (clickCount % 4 === 0) hop(); else nod();
    }
    later('reaction', 1400, () => { delete button.dataset.mood; });
  }
  function bounce() {
    engaged = true; awake();
    speak('Soft wool. Springy little hooves.', true);
    hop();
  }
  function releasePress(cancelled = false) {
    if (!press) return;
    const prior = press; press = null; cancel('hold');
    if (button.hasPointerCapture(prior.id)) button.releasePointerCapture(prior.id);
    if (prior.held || cancelled) skipPointerClickUntil = now() + 500;
    if (state === 'pressed') {
      if (prior.held && !cancelled) bounce(); else awake();
    }
  }
  function quiet() {
    guide?.pause();
    releasePress(true);
    timers.forEach(clearTimeout); timers.clear();
    cancelAnimationFrame(frame); frame = 0; point = null; stroke = null;
    stopAnimations(); clearStroke(); engaged = false;
    setState('awake'); mascot.follow = false; mascot.frame('idle'); delete button.dataset.talking; status.textContent = '';
  }
  root.hidden = false; setState('awake'); engage();
  button.addEventListener('click', event => {
    guide?.interacted();
    if (event.detail !== 0 && now() < skipPointerClickUntil) return;
    greet();
  });
  button.addEventListener('pointerdown', event => {
    if (!event.isPrimary || event.button !== 0 || press || resting() || state === 'waking') return;
    guide?.interacted();
    engage(); press = {id:event.pointerId, held:false};
    button.setPointerCapture(event.pointerId);
    setState('pressed'); play('press');
    later('hold', 400, () => { if (press) press.held = true; });
  });
  button.addEventListener('pointerup', event => { if (press?.id === event.pointerId) releasePress(); });
  button.addEventListener('pointercancel', () => releasePress(true));
  button.addEventListener('lostpointercapture', () => { if (press) releasePress(true); });
  button.addEventListener('dragstart', event => event.preventDefault());
  button.addEventListener('focus', () => {
    // Focus alone must not wake a sleeping sheep before the user's activation.
    if (state === 'awake') { engage(); clearStroke(); }
  });
  button.addEventListener('pointerenter', event => {
    cancel('look-away');
    if (event.pointerType !== 'mouse' || !finePointer.matches || resting()) return;
    engage();
    if (state === 'awake' && !button.dataset.talking && now() - lastWelcome > 15000) {
      lastWelcome = now(); speak('Oh! A visitor. Hello, ewe.');
      if (!mascot.scripted) nod();
    }
  });
  function detectStroke(x, y) {
    const rect = svg.getBoundingClientRect();
    const sx = (x - rect.left) / rect.width * 265;
    const sy = (y - rect.top) / rect.height * 265;
    if (sx < 88 || sx > 220 || sy < 18 || sy > 100 || (state !== 'awake' && state !== 'petting')) {
      stroke = null; return;
    }
    const t = now();
    if (!stroke || t - stroke.time > 800) stroke = {x,time:t,start:t,direction:0,turns:0,distance:0};
    const dx = x - stroke.x;
    if (Math.abs(dx) < 2) return;
    const direction = Math.sign(dx);
    if (stroke.direction && direction !== stroke.direction) stroke.turns++;
    stroke.distance += Math.abs(dx); stroke.direction = direction; stroke.x = x; stroke.time = t;
    if (stroke.turns >= 2 && stroke.distance >= 28 && t - stroke.start >= 350 && t - lastPat > 2500) {
      pet(); stroke = null;
    }
  }
  document.addEventListener('pointermove', event => {
    if (event.pointerType !== 'mouse' || !finePointer.matches || !active() || event.buttons) return;
    point = {x:event.clientX,y:event.clientY};
    detectStroke(point.x, point.y);
    if (motion.matches || resting() || state !== 'awake') return;
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      if (!point || state !== 'awake') return;
      const rect = svg.getBoundingClientRect();
      const dx = point.x - (rect.left + rect.width * .74);
      const dy = point.y - (rect.top + rect.height * .45);
      if (Math.hypot(dx, dy) > 480) {
        if (!timers.has('look-away')) later('look-away', 600, clearStroke);
        return;
      }
      cancel('look-away'); engage();
      mascot.follow = true; mascot.lookAt(point.x, point.y);
    });
  }, {passive:true});
  hero.addEventListener('pointerleave', () => { stroke = null; later('look-away', 650, clearStroke); });
  root.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      event.preventDefault(); guide?.dismiss(); releasePress(true);
      cancel('message'); delete button.dataset.talking; status.textContent = '';
    }
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) quiet(); });
  addEventListener('pagehide', quiet); addEventListener('blur', quiet);
  addEventListener('focus', () => { if (active()) engage(); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden && visible) engage(); });
  motion.addEventListener('change', quiet); finePointer.addEventListener('change', clearStroke);
  if ('IntersectionObserver' in window) new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (!visible) quiet(); else engage();
  }).observe(root);
  // Guide prose is authored alongside resume content, not generated from visitor data.
  guide = setupProjectGuide();
  function setupProjectGuide() {
    let data;
    try { data = JSON.parse(document.querySelector('#sheep-guide-data')?.textContent || '[]'); }
    catch { return null; }
    if (!Array.isArray(data) || !data.length) return null;
    const entries = data.map(item => ({...item, element:document.getElementById(item.id)}))
      .filter(item => item.element && Array.isArray(item.notes) && item.notes.length);
    const card = root.querySelector('.sheep-guide-card');
    const title = root.querySelector('#sheep-guide-title');
    const text = root.querySelector('.sheep-guide-text');
    const count = root.querySelector('.sheep-guide-count');
    const more = root.querySelector('.sheep-guide-more');
    const close = root.querySelector('.sheep-guide-close');
    const shortcut = root.querySelector('.sheep-project-prompt');
    const autoButton = root.querySelector('.sheep-auto');
    const seen = new Set();
    let current = null, index = 0, automatic = true, pinned = false, updateFrame = 0;
    let lastAuto = -Infinity, holdUntil = 0;
    function hide() {
      cancel('guide-close');
      if (!card.hidden && card.contains(document.activeElement)) button.focus({preventScroll:true});
      card.hidden = true; pinned = false;
    }
    function dismiss() {
      if (current) seen.add(current.id);
      cancel('guide-open'); hide();
    }
    function pin() { if (!card.hidden) { pinned = true; cancel('guide-close'); } }
    function render() {
      title.textContent = current.title;
      text.textContent = current.notes[index];
      count.textContent = `${index + 1} / ${current.notes.length}`;
      more.textContent = index === current.notes.length - 1 ? 'Back to overview' : 'Tell me more';
    }
    function show(manual = false) {
      if (!current || !root.classList.contains('is-docked')) return;
      cancel('guide-open'); cancel('message'); delete button.dataset.talking;
      engaged = true; awake(); nod();
      index = 0; pinned = manual; render(); card.hidden = false; seen.add(current.id);
      if (manual) {
        status.textContent = `${current.title}. ${current.notes[0]}`;
        more.focus({preventScroll:true});
      } else {
        // Automatic notes are visual only, with no unsolicited screen-reader announcement.
        status.textContent = ''; lastAuto = now();
        later('guide-close', 8500, () => { if (!pinned) hide(); });
      }
    }
    function scheduleNote() {
      if (!automatic || !current || seen.has(current.id) || timers.has('guide-open') || !active()) return;
      const id = current.id;
      const delay = Math.max(1000, lastAuto + 10000 - now(), holdUntil - now());
      later('guide-open', delay, () => {
        if (!automatic || current?.id !== id || seen.has(id)) return;
        if (['pressed','petting','feeding','waking'].includes(state)) {
          holdUntil = now() + 1200; scheduleNote(); return;
        }
        show();
      });
    }
    function update() {
      updateFrame = 0;
      if (document.hidden) return;
      const headerBottom = document.querySelector('.header-shell').getBoundingClientRect().bottom;
      const docked = hero.getBoundingClientRect().bottom <= headerBottom + 16;
      const changedDock = root.classList.contains('is-docked') !== docked;
      root.classList.toggle('is-docked', docked);
      if (changedDock) { releasePress(true); clearStroke(); }
      if (docked) visible = true;
      const readingLine = headerBottom + Math.min(180, (innerHeight - headerBottom) * .28);
      let candidate = null;
      if (docked) {
        const bounds = entries.map(item => ({item, rect:item.element.getBoundingClientRect()}));
        candidate = bounds.find(({rect}) => rect.top <= readingLine && rect.bottom > readingLine)?.item
          || bounds.find(({rect}) => rect.top > readingLine && rect.top < innerHeight * .62)?.item || null;
      }
      if (candidate?.id !== current?.id) {
        cancel('guide-open'); hide(); current = candidate; index = 0;
      }
      shortcut.hidden = !current || !docked;
      if (!docked) { cancel('guide-open'); hide(); }
      else scheduleNote();
    }
    function requestUpdate() {
      if (!updateFrame) updateFrame = requestAnimationFrame(update);
    }
    function manualExplain() { show(true); }
    shortcut.addEventListener('click', manualExplain);
    more.addEventListener('click', () => {
      if (!current) return;
      pin(); index = (index + 1) % current.notes.length; render();
      status.textContent = current.notes[index];
    });
    close.addEventListener('click', () => { dismiss(); shortcut.focus({preventScroll:true}); });
    card.addEventListener('pointerenter', pin); card.addEventListener('focusin', pin);
    autoButton.addEventListener('click', () => {
      automatic = !automatic;
      autoButton.setAttribute('aria-pressed', String(automatic));
      autoButton.textContent = `Automatic notes: ${automatic ? 'on' : 'off'}`;
      if (!automatic) { cancel('guide-open'); hide(); }
      else scheduleNote();
    });
    addEventListener('scroll', requestUpdate, {passive:true});
    addEventListener('resize', requestUpdate); addEventListener('load', requestUpdate);
    addEventListener('focus', requestUpdate);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) requestUpdate(); });
    if ('ResizeObserver' in window) new ResizeObserver(requestUpdate).observe(document.querySelector('main'));
    update();
    return {
      pause() { cancel('guide-open'); hide(); cancelAnimationFrame(updateFrame); updateFrame = 0; },
      interacted() { holdUntil = now() + 10000; cancel('guide-open'); hide(); },
      isOpen() { return !card.hidden; },
      dismiss
    };
  }
})();
