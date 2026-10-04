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

// Opt-in, entirely local illustrations. No generated claims or actual evaluation scores.
const evalLab = document.querySelector('#evaluation-lab');
const workflowLab = document.querySelector('#workflow-lab');
if (evalLab && workflowLab) {
  const prompts = {
    storyboard: 'Plan three shots for a 15-second camera ad, including framing and transitions.',
    copy: 'Write a 50-word camera ad for first-time buyers, with one clear call to action.',
    review: 'Review a camera ad for unsupported claims, audience fit, and clarity.'
  };
  const skillPicker = document.querySelector('#eval-skill');
  const controls = ['instruction', 'model', 'tools'].map(key => document.querySelector(`#eval-${key}`));
  function updateExperiment() {
    document.querySelector('#eval-prompt').textContent = prompts[skillPicker.value];
    const [instruction, model, toolset] = controls.map(control => control.checked);
    document.querySelector('#eval-variant').textContent = `${model ? 'Model A' : 'Model B'} · ${toolset ? 'Toolset A' : 'Toolset B'}${instruction ? '' : ' · Different instruction'}`;
    const result = document.querySelector('#eval-result');
    const fair = instruction && model && toolset;
    result.dataset.fair = fair;
    const title = document.createElement('strong');
    title.textContent = fair ? '✓ Ready for a controlled comparison' : '↗ Something else changed, too';
    const body = document.createElement('span');
    const differences = [!instruction && 'instruction', !model && 'model', !toolset && 'tool configuration'].filter(Boolean);
    body.textContent = fair ? 'Now the Skill is the intended difference. You can compare outputs, repeat runs, and investigate where quality changes. A fair setup does not guarantee that a Skill performs better.' : `The ${new Intl.ListFormat('en', {style: 'long', type: 'conjunction'}).format(differences)} also changed. Any difference in output could come from those changes, so it cannot be attributed to the Skill alone.`;
    result.replaceChildren(title, body);
  }
  skillPicker.addEventListener('change', updateExperiment);
  controls.forEach(control => control.addEventListener('change', updateExperiment));
  updateExperiment();

  const steps = [];
  const names = { audience: 'Audience', ideas: 'Ideas', draft: 'Draft', review: 'Review' };
  const palette = [...document.querySelectorAll('[data-node]')];
  const path = document.querySelector('#workflow-path');
  const output = document.querySelector('#workflow-output');
  const run = document.querySelector('#workflow-run');
  const undo = document.querySelector('#workflow-undo');
  const reset = document.querySelector('#workflow-reset');
  function renderWorkflow() {
    path.replaceChildren(...Array.from({length: 3}, (_, index) => {
      const node = document.createElement('li');
      node.textContent = names[steps[index]] || '';
      node.setAttribute('aria-label', `Step ${index + 1}: ${names[steps[index]] || 'empty'}`);
      return node;
    }));
    palette.forEach(button => {
      const selected = steps.includes(button.dataset.node);
      button.setAttribute('aria-pressed', String(selected));
      button.disabled = selected || steps.length === 3;
    });
    document.querySelector('#workflow-count').textContent = `${steps.length} / 3 steps connected`;
    undo.disabled = reset.disabled = steps.length === 0;
    run.disabled = steps.length !== 3;
    output.textContent = steps.length === 3 ? 'Your flow is connected. Preview it, or undo a step to try another sequence.' : 'Pick a step above. Each choice connects to the previous one.';
  }
  palette.forEach(button => button.addEventListener('click', () => {
    if (steps.length >= 3 || steps.includes(button.dataset.node)) return;
    const index = palette.indexOf(button);
    steps.push(button.dataset.node);
    renderWorkflow();
    // Keep a usable keyboard focus when the selected button becomes disabled.
    (palette.slice(index + 1).find(item => !item.disabled) || palette.find(item => !item.disabled) || run).focus({ preventScroll: true });
  }));
  undo.addEventListener('click', () => {
    const removed = steps.pop();
    renderWorkflow();
    palette.find(button => button.dataset.node === removed)?.focus({ preventScroll: true });
  });
  reset.addEventListener('click', () => { steps.length = 0; renderWorkflow(); palette[0].focus({ preventScroll: true }); });
  run.addEventListener('click', () => {
    const list = document.createElement('ol');
    let hasAudience = false, hasIdeas = false, hasDraft = false, reviewedDraft = false;
    for (const step of steps) {
      const row = document.createElement('li');
      const label = document.createElement('strong');
      label.textContent = `${names[step]}: `;
      let response;
      if (step === 'audience') { response = 'Focus on beginners who want everyday photos without a complicated setup.'; hasAudience = true; }
      if (step === 'ideas') { response = hasAudience ? 'Angle: “Three things to check before buying your first camera.” Lead with ease of use.' : 'Angle: “A camera worth knowing.” Without an audience, the angle stays broad.'; hasIdeas = true; }
      if (step === 'draft') { response = hasAudience ? '“Your first camera should make you want to take more photos. Start with comfort, simple controls, and a lens you will actually carry.”' : hasIdeas ? '“Meet a camera worth knowing: a versatile option for your next photo adventure.” The hook is still broad.' : '“Here is a camera for your next adventure.” Drafting is possible, but the angle and reader are undefined.'; hasDraft = true; }
      if (step === 'review') { response = hasDraft ? 'A draft is available to inspect. Flag vague promises and ask for one concrete example before publishing.' : 'No draft to review yet. Check the brief for missing constraints, then move this step after Draft to assess the actual content.'; reviewedDraft = hasDraft; }
      row.append(label, document.createTextNode(response)); list.append(row);
    }
    const verdict = document.createElement('p'); verdict.className = 'flow-verdict';
    verdict.textContent = !hasDraft ? 'You built a planning flow. Add Draft if the next goal is a publishable post.' : reviewedDraft ? 'Your flow includes feedback on an actual draft. Try swapping an earlier step to see how the context changes.' : 'You have a draft. A Review step after Draft would help catch issues before publishing.';
    output.replaceChildren(list, verdict);
  });
  renderWorkflow();
  document.querySelectorAll('.play-lab, [data-open-lab]').forEach(element => { element.hidden = false; });
  function openLabFromHash() {
    const target = document.getElementById(location.hash.slice(1));
    if (target?.classList.contains('play-lab')) target.open = true;
  }
  document.querySelectorAll('[data-open-lab]').forEach(link => link.addEventListener('click', () => {
    const target = document.getElementById(link.hash.slice(1));
    if (target) { target.open = true; target.querySelector('summary').focus({preventScroll:true}); }
  }));
  addEventListener('hashchange', openLabFromHash);
  openLabFromHash();
}
