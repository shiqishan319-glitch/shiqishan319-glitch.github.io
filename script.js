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

// Project notebooks keep the CV readable at a glance, then reveal the reasoning
// behind a few representative projects for visitors who want to go deeper.
const projectNotebooks = {
  'agent-teams': {
    trail: ['Skill capability', 'Test instruction', 'Controlled comparison'],
    stages: [
      ['01', 'The problem', 'A generic prompt cannot tell whether a Skill works in the situations it was designed for.'],
      ['02', 'The judgment', 'Write instructions around each Skill’s capability and use case, then hold model and tool conditions constant.'],
      ['03', 'The result', 'An internal evaluation system now covers 100+ Skills and their versions, making iteration traceable.']
    ]
  },
  'overseas-product': {
    trail: ['Agent performance', 'User demand', 'Acquisition feature'],
    stages: [
      ['01', 'The problem', 'Overseas growth cannot begin with available features alone: the product needs both a credible use case and demand.'],
      ['02', 'The judgment', 'Evaluate North American and Latin American marketing scenarios, then pair product feasibility with search and conversion signals.'],
      ['03', 'The result', 'The work prioritized background removal and AI face swap, while separating search-led opportunities from display-ad creative.']
    ]
  },
  'creator-assistant': {
    trail: ['Account history', 'Audience signals', 'Topic & structure'],
    stages: [
      ['01', 'The problem', 'Some creators have successful posts but no reliable way to turn those signals into the next strong idea.'],
      ['02', 'The judgment', 'Use account history and reader feedback, then let multiple Agents simulate audience reactions and discuss candidate content.'],
      ['03', 'The result', 'Applied across 50+ posts, the assistant helped raise average readership by approximately 18%.']
    ]
  }
};

function buildNotebook({ trail, stages }) {
  const trailMarkup = trail.map((item, index) => `
    <span class="notebook-trail-item"><b>${String(index + 1).padStart(2, '0')}</b>${item}</span>
  `).join('');
  const stageMarkup = stages.map(([number, label, copy]) => `
    <article class="notebook-stage">
      <span class="notebook-stage-number">${number}</span>
      <h5>${label}</h5>
      <p>${copy}</p>
    </article>
  `).join('');
  return `
    <summary>
      <span class="notebook-summary-mark" aria-hidden="true">✦</span>
      <span class="notebook-summary-copy"><b>Behind the work</b><small>Problem · judgment · result</small></span>
      <span class="expand-icon" aria-hidden="true">+</span>
    </summary>
    <div class="notebook-fold">
      <div class="notebook-trail" aria-label="Project reasoning flow">${trailMarkup}</div>
      <div class="notebook-stages">${stageMarkup}</div>
    </div>
  `;
}

for (const [projectId, notebook] of Object.entries(projectNotebooks)) {
  const project = document.getElementById(projectId);
  if (!project) continue;
  let details = project.querySelector(':scope > .project-details');
  if (!details) {
    details = document.createElement('details');
    project.append(details);
  }
  details.classList.add('behind-work');
  details.innerHTML = buildNotebook(notebook);
}
