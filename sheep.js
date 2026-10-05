/* A local mascot controller. No network calls, audio, or persistent visitor data.
   Stable SVG part names keep interaction logic separate from the chosen artwork. */
(() => {
  const root = document.querySelector('.sheep-companion');
  if (!root) return;
  const button = root.querySelector('.sheep-button');
  const svg = button.querySelector('svg');
  const body = button.querySelector('.sheep-body');
  const head = button.querySelector('.sheep-head');
  const eyes = button.querySelector('.sheep-eyes');
  const bubble = button.querySelector('.sheep-bubble');
  const caption = button.querySelector('.sheep-caption');
  const status = root.querySelector('.sheep-status');
  const menu = root.querySelector('.sheep-tools');
  const feedButton = root.querySelector('[data-sheep-action="feed"]');
  const hero = document.querySelector('.hero');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  const timers = new Map();
  const animations = new Set();
  const lines = [
    'Oh, hello. Nice to meet ewe.', 'Small sheep. Big thoughts.',
    'Just here to keep ewe company.', 'Still no pockets.',
    'Soft wool. Strong opinions on grass.', 'I supervise the daydreaming.'
  ];
  let state = 'awake', visible = true, engaged = false, clickCount = 0;
  let lastClick = -Infinity, lastWelcome = -Infinity, lastPat = -Infinity, lastPatSpeech = -Infinity;
  let press = null, skipPointerClickUntil = 0, frame = 0, point = null;
  let stroke = null;
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
  function stopAnimations() {
    animations.forEach(animation => animation.cancel()); animations.clear();
  }
  function animate(part, frames, duration = 600) {
    if (motion.matches || !active() || !part) return;
    const animation = part.animate(frames, {duration, easing:'ease-in-out'});
    animations.add(animation);
    animation.onfinish = () => animations.delete(animation);
  }
  function neutralGaze() {
    button.style.setProperty('--gaze-x', '0px');
    button.style.setProperty('--gaze-y', '0px');
    button.style.setProperty('--head-turn', '0deg');
  }
  function setState(next) {
    cancel('state'); cancel('blink'); cancel('idle'); cancel('reaction');
    stopAnimations(); delete button.dataset.mood;
    state = next; button.dataset.state = next;
    button.toggleAttribute('data-sleeping', next === 'sleeping');
    caption.textContent = ({sleeping:'Daydreaming…',drowsy:'Getting sleepy',yawning:'A tiny yawn',
      petting:'More head pats?',feeding:'Nom, nom',pressed:'Soft little sheep',waking:'Oh, hello again'}[next] || 'Say hello');
    feedButton.disabled = next === 'feeding';
  }
  function speak(text, announce = false) {
    bubble.textContent = text; button.dataset.talking = 'true';
    status.textContent = announce ? text : '';
    later('message', 4400, () => { delete button.dataset.talking; status.textContent = ''; });
  }
  function scheduleBlink() {
    if (!engaged || motion.matches || state !== 'awake' || !active() || timers.has('blink')) return;
    later('blink', 5500, () => {
      if (state === 'awake' && !button.dataset.mood) animate(eyes,
        [{transform:'scaleY(1)'},{transform:'scaleY(.08)',offset:.45},{transform:'scaleY(1)'}], 180);
      scheduleBlink();
    });
  }
  function idleLater() {
    cancel('idle');
    if (!engaged || state !== 'awake' || menu.open || !active()) return;
    later('idle', 12000, () => {
      setState('drowsy'); neutralGaze();
      later('state', 4000, yawnAndSleep);
    });
  }
  function awake() {
    setState('awake'); scheduleBlink(); idleLater();
  }
  function engage() {
    engaged = true;
    if (state === 'awake') { idleLater(); scheduleBlink(); }
  }
  function yawnAndSleep() {
    setState('yawning'); neutralGaze();
    later('state', 1100, () => { setState('sleeping'); neutralGaze(); });
  }
  function nod() {
    animate(head, [{transform:'rotate(0deg)'},{transform:'rotate(-10deg)',offset:.35},
      {transform:'rotate(3deg)',offset:.7},{transform:'rotate(0deg)'}], 650);
  }
  function hop() {
    animate(body, [{transform:'translateY(0) scaleY(1)'},
      {transform:'translateY(2px) scaleY(.94)',offset:.18},
      {transform:'translateY(-8px) scaleY(1.02)',offset:.48},
      {transform:'translateY(0) scaleY(1)'}], 650);
  }
  function happyHeart() {
    animate(button.querySelector('.sheep-heart'), [{opacity:0,transform:'translateY(5px) scale(.6)'},
      {opacity:1,transform:'translateY(0) scale(1)',offset:.4},
      {opacity:0,transform:'translateY(-6px) scale(1.05)'}], 1100);
  }
  function wakeGreeting() {
    engaged = true; setState('waking'); neutralGaze();
    speak('I was thinking. Probably.', true); nod();
    later('state', 900, awake);
  }
  function pet(announce = false) {
    if (state === 'feeding' || state === 'pressed') return;
    engaged = true; lastPat = now(); setState('petting'); neutralGaze(); happyHeart();
    animate(head, [{transform:'rotate(0)'},{transform:'rotate(-5deg)',offset:.5},{transform:'rotate(0)'}], 1000);
    if (announce || now() - lastPatSpeech > 8000) {
      speak('That’s the spot. Thank ewe.', announce); lastPatSpeech = now();
    }
    later('state', 1900, awake);
  }
  function greet() {
    if (state === 'feeding' || state === 'waking') return;
    if (resting()) { wakeGreeting(); return; }
    const fast = now() - lastClick < 600; lastClick = now();
    engage(); awake(); clickCount++;
    if (clickCount === 3) {
      speak('You’ve counted me three times.', true); hop();
    } else if (clickCount === 10) {
      speak('Ten hellos. Still just one sheep.', true); hop();
    } else if (fast) {
      speak('More head pats? Baa-liss.', true); button.dataset.mood = 'love'; happyHeart();
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
    animate(body, [{transform:'translateY(3px) scale(1.07,.89)'},
      {transform:'translateY(-5px) scale(.98,1.05)',offset:.4},
      {transform:'translateY(1px) scale(1.01,.98)',offset:.75},
      {transform:'translateY(0) scale(1)'}], 650);
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
  function closeMenu(focus = false) {
    menu.open = false;
    if (focus) menu.querySelector('summary').focus({preventScroll:true});
  }
  function quiet() {
    releasePress(true);
    timers.forEach(clearTimeout); timers.clear();
    cancelAnimationFrame(frame); frame = 0; point = null; stroke = null;
    stopAnimations(); neutralGaze(); engaged = false;
    setState('awake'); delete button.dataset.talking; status.textContent = '';
    closeMenu();
  }
  root.hidden = false; setState('awake');
  button.addEventListener('click', event => {
    if (event.detail !== 0 && now() < skipPointerClickUntil) return;
    greet();
  });
  button.addEventListener('pointerdown', event => {
    if (!event.isPrimary || event.button !== 0 || press || resting() || state === 'feeding' || state === 'waking') return;
    engage(); press = {id:event.pointerId, held:false};
    button.setPointerCapture(event.pointerId);
    setState('pressed'); neutralGaze();
    later('hold', 400, () => { if (press) press.held = true; });
  });
  button.addEventListener('pointerup', event => { if (press?.id === event.pointerId) releasePress(); });
  button.addEventListener('pointercancel', () => releasePress(true));
  button.addEventListener('lostpointercapture', () => { if (press) releasePress(true); });
  button.addEventListener('dragstart', event => event.preventDefault());
  button.addEventListener('focus', () => {
    // Focus alone must not wake a sleeping sheep before the user's activation.
    if (state === 'awake') { engage(); neutralGaze(); }
  });
  button.addEventListener('pointerenter', event => {
    cancel('look-away');
    if (event.pointerType !== 'mouse' || !finePointer.matches || resting()) return;
    engage();
    if (state === 'awake' && !button.dataset.talking && now() - lastWelcome > 15000) {
      lastWelcome = now(); speak('Oh! A visitor. Hello, ewe.');
      animate(button.querySelector('.sheep-ear-left'),
        [{transform:'rotate(0)'},{transform:'rotate(12deg)',offset:.5},{transform:'rotate(0)'}], 550);
    }
  });
  function detectStroke(x, y) {
    const rect = svg.getBoundingClientRect();
    const sx = (x - rect.left) / rect.width * 96;
    const sy = (y - rect.top) / rect.height * 76;
    if (sx < 53 || sx > 89 || sy < 9 || sy > 32 || (state !== 'awake' && state !== 'petting')) {
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
  hero.addEventListener('pointermove', event => {
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
        if (!timers.has('look-away')) later('look-away', 600, neutralGaze);
        return;
      }
      cancel('look-away'); engage();
      const clamp = (v,l) => Math.max(-l,Math.min(l,v));
      button.style.setProperty('--gaze-x', `${clamp(dx/85,1.5).toFixed(2)}px`);
      button.style.setProperty('--gaze-y', `${clamp(dy/100,1.4).toFixed(2)}px`);
      button.style.setProperty('--head-turn', `${clamp(dx/45,7).toFixed(2)}deg`);
    });
  }, {passive:true});
  hero.addEventListener('pointerleave', () => { stroke = null; later('look-away', 650, neutralGaze); });
  menu.addEventListener('toggle', () => {
    if (menu.open) cancel('idle'); else idleLater();
  });
  root.querySelectorAll('[data-sheep-action]').forEach(action => action.addEventListener('click', () => {
    const kind = action.dataset.sheepAction;
    // Restore focus before starting an action so focus never changes its state.
    closeMenu(true); engaged = true;
    if (kind === 'pat') pet(true);
    if (kind === 'feed') {
      if (state === 'feeding') return;
      setState('feeding'); neutralGaze(); speak('A little grass? You get me.', true);
      later('state', 2500, () => { awake(); speak('Excellent snack. Five baas.', true); });
    }
    if (kind === 'nap') { speak('Just resting my ideas.', true); yawnAndSleep(); }
  }));
  document.addEventListener('pointerdown', event => { if (!root.contains(event.target)) closeMenu(); });
  document.addEventListener('focusin', event => { if (!root.contains(event.target)) closeMenu(); });
  root.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      event.preventDefault(); closeMenu(true); releasePress(true);
      cancel('message'); delete button.dataset.talking; status.textContent = '';
    }
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) quiet(); });
  addEventListener('pagehide', quiet); addEventListener('blur', quiet);
  motion.addEventListener('change', quiet); finePointer.addEventListener('change', neutralGaze);
  if ('IntersectionObserver' in window) new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (!visible) quiet();
  }).observe(root);
})();
