// Keep the section navigation in sync with the reader's position.
// All content and anchor navigation remain available without JavaScript.
const navLinks = [...document.querySelectorAll('nav a')];
const sections = navLinks.map(link => document.querySelector(link.hash));
const header = document.querySelector('.header-shell');
let scheduled = false;
function updateNavigation() {
  const offset = header.getBoundingClientRect().height + 70;
  let current = null;
  for (const section of sections) {
    if (section.getBoundingClientRect().top <= offset) current = section.id;
  }
  if (window.scrollY > 0 && window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) {
    current = sections[sections.length - 1].id;
  }
  for (const link of navLinks) {
    if (link.hash === `#${current}`) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  }
  scheduled = false;
}
function scheduleUpdate() {
  if (!scheduled) { scheduled = true; requestAnimationFrame(updateNavigation); }
}
addEventListener('scroll', scheduleUpdate, { passive: true });
addEventListener('resize', scheduleUpdate);
addEventListener('load', scheduleUpdate);
updateNavigation();
