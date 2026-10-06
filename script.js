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

// Keep each explanation beside the pointer, or beside its term for keyboard focus.
function positionTooltip(term, x, y) {
  const tip = term.querySelector('.tooltip-pop');
  if (!tip) return;
  const bounds = tip.getBoundingClientRect();
  const gap = 14, edge = 10;
  let left = x + gap;
  let top = y + gap;
  if (left + bounds.width > innerWidth - edge) left = x - bounds.width - gap;
  if (top + bounds.height > innerHeight - edge) top = y - bounds.height - gap;
  left = Math.max(edge, Math.min(left, innerWidth - bounds.width - edge));
  top = Math.max(edge, Math.min(top, innerHeight - bounds.height - edge));
  tip.style.setProperty('--tip-x', `${left}px`);
  tip.style.setProperty('--tip-y', `${top}px`);
}
for (const term of document.querySelectorAll('.term-tip')) {
  term.addEventListener('pointerenter', event => {
    if (event.pointerType === 'mouse') positionTooltip(term, event.clientX, event.clientY);
  });
  term.addEventListener('pointermove', event => {
    if (event.pointerType === 'mouse') positionTooltip(term, event.clientX, event.clientY);
  });
  term.addEventListener('focus', () => {
    const rect = term.getBoundingClientRect();
    positionTooltip(term, rect.right + 4, rect.top + rect.height / 2);
  });
}
