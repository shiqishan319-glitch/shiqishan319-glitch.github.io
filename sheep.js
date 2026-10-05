/* A local mascot controller. No network calls, audio, or persistent visitor data.
   Stable SVG part names keep interaction logic separate from the chosen artwork. */
(() => {
  const root = document.querySelector('.sheep-companion');
  if (!root) return;
  const button = root.querySelector('.sheep-button');
  const svg = button.querySelector('svg');
  const motionData = JSON.parse(document.querySelector('#sheep-motion-data').textContent);
  // Short transitions share the same gaze-preserving controller as the full actions.
  for (const [name,id] of [['rest','idle'],['drowsy','drowsy'],['press','crouch'],['carry','air'],['land','land']]) {
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
  let roamer = null;
  const grass = document.querySelector('.meadow-grass');
  let pasture = null, grazingTrip = false;
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
    cancel('state'); cancel('blink'); cancel('idle'); cancel('reaction'); cancel('wander'); cancel('auto-wake');
    if (state==='feeding' && next!=='feeding') clearGrass();
    roamer?.stop(); stopAnimations(); delete button.dataset.mood;
    state = next; button.dataset.state = next;
    mascot.follow = finePointer.matches && next === 'awake' && active();
    button.toggleAttribute('data-sleeping', next === 'sleeping');
    caption.textContent = ({sleeping:'Daydreaming…',drowsy:'Getting sleepy',yawning:'A tiny yawn',
      landing:'Back on my hooves',petting:'More head pats?',feeding:'Nom, nom',pressed:'Soft little sheep',waking:'Oh, hello again'}[next] || 'Say hello');
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
  function scheduleWander(delay = 4000) {
    if (timers.has('wander') || !active() || motion.matches || state !== 'awake') return;
    later('wander', delay, () => {
      if (!mascot.scripted && !guide?.isOpen()) { if (pasture) visitGrass(); else roamer?.wander(); }
      // Retry after blocked routes or an overlapping blink; a single miss cannot strand it.
      scheduleWander(6500);
    });
  }
  function idleLater() {
    cancel('idle');
    if (!engaged || state !== 'awake' || !active()) return;
    scheduleWander();
    later('idle', 20000, () => {
      if (guide?.isOpen()) { idleLater(); return; }
      if (pasture) { visitGrass(); idleLater(); return; }
      setState('drowsy'); play('drowsy');
      later('state', 4000, yawnAndSleep);
    });
  }
  function scheduleGrass(delay=22000+Math.random()*16000) {
    if (!grass || timers.has('grow-grass') || pasture || !active() || motion.matches) return;
    later('grow-grass',delay,growGrass);
  }
  function clearGrass() {
    if (grazingTrip) roamer?.stop();
    pasture=null; grazingTrip=false;
    cancel('grass-expire'); cancel('grass-bite'); cancel('grass-visit');
    if (grass) { grass.hidden=true; delete grass.dataset.eaten; }
  }
  function growGrass() {
    if (state!=='awake' || guide?.isOpen() || !roamer || now()-lastClick<4000) { scheduleGrass(6000); return; }
    // Food may interrupt an idle walk, but never a user gesture or a project note.
    if (roamer.moving) roamer.stop();
    const spot=roamer.forageSpot();
    if (!spot) { scheduleGrass(6000); return; }
    pasture=spot; grass.style.setProperty('--grass-left',spot.grassX+'px');
    grass.style.setProperty('--grass-top',spot.grassY+'px');
    grass.hidden=false; delete grass.dataset.eaten;
    later('grass-expire',45000,()=>{clearGrass();scheduleGrass();});
    // Let the blades grow before the sheep notices them.
    later('grass-visit',1400,visitGrass);
  }
  function visitGrass() {
    if (!pasture || grazingTrip || state!=='awake' || guide?.isOpen() || mascot.scripted || !roamer.options.canMove()) return;
    const target=pasture;
    const controls=[...document.querySelectorAll('a,button,input,summary')].filter(el=>!root.contains(el))
      .flatMap(el=>[...el.getClientRects()]);
    if (!roamer.clearRoute(target.x,target.y,controls)) {clearGrass();scheduleGrass();return;}
    grazingTrip=true;
    roamer.moveTo(target.x,target.y,()=>{
      if (pasture!==target || state!=='awake') return;
      snack();
    });
  }
  function snack() {
    if (state !== 'awake') return;
    setState('feeding');
    if (pasture) later('grass-bite',1300,()=>{if(grass) grass.dataset.eaten='true';});
    // Passive reactions are visual; no unsolicited screen-reader announcement.
    play('eat', () => {clearGrass();awake();scheduleGrass();});
  }
  function awake() {
    setState('awake'); play('rest'); scheduleBlink(); idleLater();scheduleGrass();
  }
  function engage() {
    engaged = true;
    if (state === 'awake') { idleLater(); scheduleBlink(); scheduleGrass(); }
  }
  function yawnAndSleep() {
    setState('yawning');
    play('sleep', () => {
      setState('sleeping');
      later('auto-wake', 16000, () => { setState('waking'); play('wake', awake); });
    });
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
    delete button.dataset.carried;
    if (prior.dragging && cancelled) roamer.place(prior.originX,prior.originY);
    if (prior.dragging || prior.held || cancelled) skipPointerClickUntil = now() + 500;
    if (state === 'pressed') {
      if (prior.dragging && !cancelled) {
        setState('landing'); play('land',awake);
        speak('A new little spot. Thank ewe.',true);
      } else if (prior.held && !cancelled) bounce(); else awake();
    }
  }
  function quiet() {
    roamer?.stop(); clearGrass(); guide?.pause();
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
    engage(); press = {id:event.pointerId, held:false,dragging:false,
      x:event.clientX,y:event.clientY,originX:roamer.x,originY:roamer.y};
    button.setPointerCapture(event.pointerId);
    setState('pressed'); play('press');
    later('hold', 400, () => { if (press) press.held = true; });
  });
  button.addEventListener('pointermove', event => {
    if (!press || press.id !== event.pointerId) return;
    const dx=event.clientX-press.x,dy=event.clientY-press.y;
    if (!press.dragging && Math.hypot(dx,dy)<12) return;
    if (!press.dragging) {
      press.dragging=true; cancel('hold'); button.dataset.carried='true';
      play('carry');
    }
    roamer.place(press.originX+dx,press.originY+dy);
  });
  button.addEventListener('pointerup', event => { if (press?.id === event.pointerId) releasePress(); });
  button.addEventListener('pointercancel', () => releasePress(true));
  button.addEventListener('lostpointercapture', () => { if (press) releasePress(true); });
  button.addEventListener('dragstart', event => event.preventDefault());
  root.addEventListener('focusin', () => roamer?.stop());
  button.addEventListener('focus', () => {
    // Focus alone must not wake a sleeping sheep before the user's activation.
    if (state === 'awake') { engage(); clearStroke(); }
  });
  button.addEventListener('pointerenter', event => {
    cancel('look-away');
    if (event.pointerType !== 'mouse' || !finePointer.matches || resting()) return;
    roamer?.stop(); engage();
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
      if (Math.hypot(dx,dy)<75) {
        roamer?.stop(); cancel('wander');
        engage();
      }
      cancel('look-away');
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
  function walking() { play('walk', () => { if (roamer?.moving) walking(); }); }
  roamer = new window.SheepRoam(root, {
    canMove: () => active() && !motion.matches && state === 'awake' && !press && !guide?.isOpen()
      && !root.querySelector(':focus-visible'),
    walk: walking,
    rest: () => { grazingTrip=false; stopAnimations(); play('rest'); },
    arrive: () => { speak('Here I am. What are we reading?',true); hop(); }

  });
  cancel('grow-grass');scheduleGrass(9000+Math.random()*3000);
  addEventListener('scroll',()=>{if(pasture)clearGrass();scheduleGrass(8000);},{passive:true});
  addEventListener('resize',()=>{if(pasture)clearGrass();scheduleGrass(8000);});
  // Double-click only genuine empty space; text selection and real controls keep their meaning.
  document.addEventListener('dblclick', event => {
    const target=event.target;
    if (event.button!==0 || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey
      || root.contains(target) || !target.matches('body,main,section,article,div')
      || target.closest('a,button,input,textarea,select,summary,[contenteditable],header,nav,footer')
      || window.getSelection()?.toString().trim()) return;
    guide?.interacted(); engaged=true; awake();
    if (!roamer.approach(event.clientX,event.clientY)) {
      speak(motion.matches ? 'Right here with ewe.' : 'I’ll wave from here. That path is a little busy.',true); nod();
    } else speak('Coming over. Tiny legs, big effort.',true);
  });
  let finishedReading=false;
  addEventListener('scroll', () => {
    cancel('reading-end');
    const footer=document.querySelector('footer');
    if (finishedReading || !footer || footer.getBoundingClientRect().bottom>innerHeight+10) return;
    later('reading-end',1800,()=>{
      if (finishedReading || footer.getBoundingClientRect().bottom>innerHeight+10 || press
        || guide?.isOpen() || state!=='awake') return;
      finishedReading=true; awake();
      speak('You made it to the end. A tiny standing ovation.');hop();
    });
  },{passive:true});
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
        if (['pressed','petting','feeding','waking','landing'].includes(state)) {
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
