// Progressive enhancements; content, PDF links, and details work without JS.
const navLinks = [...document.querySelectorAll('nav a')];
const sections = navLinks.map(link => document.querySelector(link.hash));
const header = document.querySelector('.header-shell');
const nav = document.querySelector('nav');
const heroActions = document.querySelector('.hero-actions');
const headerCV = document.querySelector('.header-cv');
let scheduled = false;
let previousSection = null;
function updateNavigation() {
  const headerHeight = header.getBoundingClientRect().height;
  document.documentElement.style.setProperty('--header-offset', `${headerHeight + 24}px`);
  let current = null;
  for (const section of sections) {
    if (section.getBoundingClientRect().top <= headerHeight + 70) current = section.id;
  }
  const scrollable = document.documentElement.scrollHeight - innerHeight;
  if (scrollY > 0 && scrollY >= scrollable - 4) current = sections.at(-1).id;
  header.style.setProperty('--reading-progress', scrollable > 0 ? Math.min(1, Math.max(0, scrollY / scrollable)) : 0);
  const cvVisible = heroActions.getBoundingClientRect().bottom < headerHeight;
  headerCV.classList.toggle('is-visible', cvVisible);
  headerCV.inert = !cvVisible;
  for (const link of navLinks) {
    if (link.hash === `#${current}`) {
      link.setAttribute('aria-current', 'location');
      // Only scroll the horizontal navigation, never move the reader's page.
      if (current !== previousSection && nav.scrollWidth > nav.clientWidth) {
        const linkRect = link.getBoundingClientRect();
        const navRect = nav.getBoundingClientRect();
        if (linkRect.left < navRect.left) nav.scrollLeft -= navRect.left - linkRect.left;
        else if (linkRect.right > navRect.right) nav.scrollLeft += linkRect.right - navRect.right;
      }
    } else link.removeAttribute('aria-current');
  }
  const activeLink = navLinks.find(link => link.hash === `#${current}`);
  nav.classList.add('with-indicator');
  nav.style.setProperty('--nav-visible', activeLink ? '1' : '0');
  if (activeLink) {
    nav.style.setProperty('--nav-left', `${activeLink.offsetLeft}px`);
    nav.style.setProperty('--nav-width', `${activeLink.offsetWidth}px`);
  }
  previousSection = current;
  scheduled = false;
}
function scheduleUpdate() {
  if (!scheduled) { scheduled = true; requestAnimationFrame(updateNavigation); }
}
addEventListener('scroll', scheduleUpdate, { passive: true });
addEventListener('resize', scheduleUpdate);
addEventListener('load', scheduleUpdate);
if ('ResizeObserver' in window) new ResizeObserver(scheduleUpdate).observe(document.body);
updateNavigation();

// Native anchor navigation retains URL/history behavior and respects reduced motion.
// Moving focus also makes Skip to content and section links useful to keyboard users.
for (const link of document.querySelectorAll('a[href^="#"]')) {
  link.addEventListener('click', event => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    document.getElementById(link.hash.slice(1))?.focus({ preventScroll: true });
  });
}

const copyButton = document.querySelector('.copy-email');
const copyStatus = document.querySelector('.copy-status');
let copyStatusTimer;
if (copyButton && navigator.clipboard && window.isSecureContext) {
  copyButton.hidden = false;
  copyButton.addEventListener('click', async () => {
    clearTimeout(copyStatusTimer);
    try {
      await navigator.clipboard.writeText(copyButton.dataset.email);
      copyStatus.textContent = 'Email copied';
      copyButton.dataset.copied = 'true';
      copyButton.setAttribute('aria-label', 'Email copied. Copy again');
    } catch {
      copyStatus.textContent = 'Select the address to copy.';
    }
    copyStatusTimer = setTimeout(() => {
      copyStatus.textContent = '';
      delete copyButton.dataset.copied;
      copyButton.setAttribute('aria-label', 'Copy email address');
    }, 3500);
  });
}

// A tiny local mascot: pointer-aware eyes, short greetings and opt-in reactions.
// No messages leave the browser. All behavior pauses when hidden or offscreen.
const sheepButton = document.querySelector('.sheep-button');
if (sheepButton) {
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  const hero = document.querySelector('.hero');
  const bubble = sheepButton.querySelector('.sheep-bubble');
  const caption = sheepButton.querySelector('.sheep-caption');
  const status = document.querySelector('.sheep-status');
  const eyes = sheepButton.querySelector('.sheep-eyes');
  const greetings = [
    ['Baa, hello! I’m the little sheep here.', 'hello'],
    ['That counts as a head pat. Thank ewe.', 'love'],
    ['Big ideas. Very small hooves.', 'hop'],
    ['Just here to keep ewe company.', 'love'],
    ['I supervise the daydreaming.', 'hello'],
    ['One tiny hop for a sheep…', 'hop'],
    ['Soft wool. Strong opinions on grass.', 'hello'],
    ['Ewe have excellent clicking skills.', 'love']
  ];
  let visible = true, engaged = false, frame = 0, point = null;
  let messageTimer, restTimer, blinkTimer, reactionTimer;
  let greetingIndex = 0, lastClick = 0, lastWelcome = 0;
  let animations = [];
  function stopAnimations() {
    animations.forEach(animation => animation.cancel());
    animations = [];
  }
  function animate(element, keyframes, options) {
    if (!motion.matches && visible && !document.hidden) {
      const animation = element.animate(keyframes, options);
      animations.push(animation);
      animation.onfinish = () => { animations = animations.filter(item => item !== animation); };
    }
  }
  function neutralGaze() {
    sheepButton.style.setProperty('--gaze-x', '0px');
    sheepButton.style.setProperty('--gaze-y', '0px');
    sheepButton.style.setProperty('--head-turn', '0deg');
  }
  function quiet() {
    clearTimeout(messageTimer); clearTimeout(restTimer); clearTimeout(blinkTimer); clearTimeout(reactionTimer);
    cancelAnimationFrame(frame); frame = 0; point = null;
    stopAnimations(); neutralGaze();
    delete sheepButton.dataset.talking; delete sheepButton.dataset.mood; delete sheepButton.dataset.sleeping;
    status.textContent = ''; caption.textContent = 'Say hello';
  }
  function scheduleBlink() {
    clearTimeout(blinkTimer);
    if (motion.matches || !engaged || !visible || document.hidden || sheepButton.dataset.sleeping) return;
    blinkTimer = setTimeout(() => {
      if (!sheepButton.dataset.mood) animate(eyes, [
        {transform:'scaleY(1)'}, {transform:'scaleY(.08)',offset:.45}, {transform:'scaleY(1)'}
      ], {duration:180,easing:'ease-in-out'});
      scheduleBlink();
    }, 4500 + Math.random() * 2500);
  }
  function wake() {
    engaged = true;
    clearTimeout(restTimer);
    delete sheepButton.dataset.sleeping;
    caption.textContent = 'Say hello';
    restTimer = setTimeout(() => {
      if (!visible || document.hidden || motion.matches) return;
      clearTimeout(blinkTimer); stopAnimations(); neutralGaze();
      sheepButton.dataset.sleeping = 'true'; caption.textContent = 'Daydreaming…';
    }, 16000);
  }
  function speak(text, announce = false) {
    clearTimeout(messageTimer);
    bubble.textContent = text;
    sheepButton.dataset.talking = 'true';
    if (announce) status.textContent = text;
    messageTimer = setTimeout(() => {
      delete sheepButton.dataset.talking; status.textContent = '';
    }, 4200);
  }
  function react(mood) {
    clearTimeout(reactionTimer); stopAnimations();
    sheepButton.dataset.mood = mood;
    animate(sheepButton.querySelector('.sheep-head'), [
      {transform:'rotate(0deg)'}, {transform:'rotate(-11deg)',offset:.35},
      {transform:'rotate(4deg)',offset:.7}, {transform:'rotate(0deg)'}
    ], {duration:650,easing:'ease-in-out'});
    if (mood === 'hop') animate(sheepButton.querySelector('.sheep-body'), [
      {transform:'translateY(0) scaleY(1)'}, {transform:'translateY(2px) scaleY(.95)',offset:.15},
      {transform:'translateY(-9px) scaleY(1.02)',offset:.45}, {transform:'translateY(0) scaleY(1)'}
    ], {duration:600,easing:'ease-in-out'});
    if (mood === 'love') animate(sheepButton.querySelector('.sheep-heart'), [
      {opacity:0,transform:'translateY(7px) scale(.6)'},
      {opacity:1,transform:'translateY(0) scale(1)',offset:.35},
      {opacity:0,transform:'translateY(-6px) scale(1.05)'}
    ], {duration:1000,easing:'ease-out'});
    reactionTimer = setTimeout(() => { delete sheepButton.dataset.mood; }, 1500);
    scheduleBlink();
  }
  sheepButton.hidden = false;
  sheepButton.addEventListener('click', () => {
    wake();
    const now = Date.now();
    const quickPat = now - lastClick < 550;
    lastClick = now;
    const [text, mood] = quickPat ? ['So many head pats. Baa-liss.', 'love'] : greetings[greetingIndex++ % greetings.length];
    speak(text, true); react(mood);
  });
  sheepButton.addEventListener('pointerenter', event => {
    if (event.pointerType !== 'mouse' || !finePointer.matches) return;
    wake(); scheduleBlink();
    if (!sheepButton.dataset.talking && Date.now() - lastWelcome > 15000) {
      lastWelcome = Date.now(); speak('Oh! A visitor. Hello, ewe.');
    }
  });
  sheepButton.addEventListener('focus', () => { wake(); });
  hero.addEventListener('pointermove', event => {
    if (event.pointerType !== 'mouse' || !finePointer.matches || motion.matches || !visible || document.hidden) return;
    point = {x:event.clientX, y:event.clientY};
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      const rect = sheepButton.getBoundingClientRect();
      const dx = point.x - (rect.left + rect.width * .72);
      const dy = point.y - (rect.top + rect.height * .36);
      const distance = Math.hypot(dx, dy);
      if (distance > 550) { neutralGaze(); return; }
      wake();
      const clamp = (value, limit) => Math.max(-limit, Math.min(limit, value));
      sheepButton.style.setProperty('--gaze-x', `${clamp(dx / 85, 1.5).toFixed(2)}px`);
      sheepButton.style.setProperty('--gaze-y', `${clamp(dy / 100, 1.4).toFixed(2)}px`);
      sheepButton.style.setProperty('--head-turn', `${clamp(dx / 45, 7).toFixed(2)}deg`);
    });
  }, {passive:true});
  hero.addEventListener('pointerleave', neutralGaze);
  document.documentElement.addEventListener('pointerleave', neutralGaze);
  document.addEventListener('visibilitychange', () => { if (document.hidden) quiet(); });
  addEventListener('pagehide', quiet);
  addEventListener('blur', quiet);
  motion.addEventListener('change', quiet);
  finePointer.addEventListener('change', neutralGaze);
  if ('IntersectionObserver' in window) new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (!visible) quiet();
  }).observe(sheepButton);
}
