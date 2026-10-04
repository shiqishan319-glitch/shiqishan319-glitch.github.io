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

// A local, opt-in greeting. No idle loop, sound, tracking, or stored state.
const sheepButton = document.querySelector('.sheep-button');
if (sheepButton) {
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const caption = sheepButton.querySelector('.sheep-caption');
  const status = document.querySelector('.sheep-status');
  const greetings = ['Baa, hello!', 'Stay curious.', 'Hi again, ewe.'];
  let greetingIndex = 0;
  let greetingTimer;
  let sheepAnimations = [];
  const stopSheepMotion = () => {
    sheepAnimations.forEach(animation => animation.cancel());
    sheepAnimations = [];
  };
  reducedMotion.addEventListener('change', () => { if (reducedMotion.matches) stopSheepMotion(); });
  sheepButton.hidden = false;
  sheepButton.addEventListener('click', () => {
    clearTimeout(greetingTimer);
    stopSheepMotion();
    const greeting = greetings[greetingIndex++ % greetings.length];
    caption.textContent = greeting;
    status.textContent = greeting;
    sheepButton.dataset.greeting = 'true';
    if (!reducedMotion.matches) {
      sheepAnimations = [
        sheepButton.querySelector('.sheep-head').animate([
          {transform:'rotate(0deg)'}, {transform:'rotate(-12deg)',offset:.35},
          {transform:'rotate(4deg)',offset:.7}, {transform:'rotate(0deg)'}
        ], {duration:750,easing:'ease-in-out'}),
        sheepButton.querySelector('.sheep-eyes').animate([
          {transform:'scaleY(1)'}, {transform:'scaleY(.1)',offset:.45},
          {transform:'scaleY(1)',offset:.6}, {transform:'scaleY(1)'}
        ], {duration:750,easing:'ease-in-out'})
      ];
    }
    greetingTimer = setTimeout(() => {
      caption.textContent = 'Say hello';
      status.textContent = '';
      delete sheepButton.dataset.greeting;
      stopSheepMotion();
    }, 3200);
  });
}
