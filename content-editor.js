// The visual template stays in index.html. This file turns content.json into the
// editable source of truth, while keeping the original HTML as a safe fallback.
(() => {
  let tooltipNumber = 200;
  const escapeHTML = value => String(value ?? '')
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');

  function inline(source) {
    return escapeHTML(source).replace(/\[\[([^|\]]+)\|([^\]]+)\]\]/g, (_, label, tip) => {
      const id = `content-tip-${tooltipNumber++}`;
      return `<span class="term-tip" tabindex="0" aria-describedby="${id}"><span class="evidence">${label}</span><span class="tooltip-pop" id="${id}" role="tooltip">${tip}</span></span>`;
    }).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  }

  function setText(element, value) { if (element) element.textContent = value ?? ''; }
  function setInline(element, value) { if (element) element.innerHTML = inline(value); }
  function direct(root, selector) { return root?.querySelector(selector); }

  function renderBullets(root, bullets) {
    const list = direct(root, ':scope > .bullet-list');
    if (!list || !Array.isArray(bullets)) return;
    list.innerHTML = bullets.map(item => item.label
      ? `<li class="has-label"><strong class="bullet-label">${inline(item.label)}</strong><p>${inline(item.body)}</p></li>`
      : `<li><p>${inline(item.body)}</p></li>`
    ).join('');
  }

  function notebookMarkup(notebook) {
    const trail = notebook.trail.map((item, index) =>
      `<span class="notebook-trail-item"><b>${String(index + 1).padStart(2, '0')}</b>${escapeHTML(item)}</span>`
    ).join('');
    const stages = notebook.stages.map(([number, label, copy]) => `
      <article class="notebook-stage"><span class="notebook-stage-number">${escapeHTML(number)}</span><h5>${escapeHTML(label)}</h5><p>${escapeHTML(copy)}</p></article>
    `).join('');
    return `<summary><span class="notebook-summary-mark" aria-hidden="true">✦</span><span class="notebook-summary-copy"><b>Behind the work</b><small>Problem · judgment · result</small></span><span class="expand-icon" aria-hidden="true">+</span></summary><div class="notebook-fold"><div class="notebook-trail" aria-label="Project reasoning flow">${trail}</div><div class="notebook-stages">${stages}</div></div>`;
  }

  function renderNotebook(root, notebook) {
    if (!root || !notebook) return;
    let details = direct(root, ':scope > .project-details, :scope > details.behind-work');
    if (!details) { details = document.createElement('details'); root.append(details); }
    details.classList.add('project-details', 'behind-work');
    details.innerHTML = notebookMarkup(notebook);
  }

  function renderProject(project) {
    const root = document.getElementById(project.id);
    if (!root) return;
    setText(direct(root, '.project-number'), project.number);
    setInline(direct(root, '.project-heading h4'), project.title);
    setInline(direct(root, '.project-heading > p'), project.subtitle);
    setInline(direct(root, ':scope > .intro'), project.intro);
    renderBullets(root, project.bullets);
    renderNotebook(root, project.notebook);
  }

  function renderExperience(item) {
    const root = document.getElementById(item.id);
    if (!root) return;
    setText(direct(root, '.organization-copy h3'), item.company);
    setText(direct(root, '.entry-role'), item.role);
    setText(direct(root, ':scope > .entry-header > .date'), item.date);
    setInline(direct(root, ':scope > .intro'), item.intro);
    if (item.projects) item.projects.forEach(renderProject);
    else renderBullets(root, item.bullets);
  }

  function renderStandalone(root, data) {
    if (!root || !data) return;
    setText(direct(root, 'h3'), data.title);
    setText(direct(root, '.project-label'), data.label);
    if (data.bullets) renderBullets(root, data.bullets);
  }

  function wireTooltips(root = document) {
    for (const term of root.querySelectorAll('.term-tip')) {
      if (term.dataset.tipWired) continue;
      term.dataset.tipWired = 'true';
      const place = (x, y) => {
        const tip = term.querySelector('.tooltip-pop');
        if (!tip) return;
        const box = tip.getBoundingClientRect(), gap = 14, edge = 10;
        let left = x + gap, top = y + gap;
        if (left + box.width > innerWidth - edge) left = x - box.width - gap;
        if (top + box.height > innerHeight - edge) top = y - box.height - gap;
        tip.style.setProperty('--tip-x', `${Math.max(edge, Math.min(left, innerWidth - box.width - edge))}px`);
        tip.style.setProperty('--tip-y', `${Math.max(edge, Math.min(top, innerHeight - box.height - edge))}px`);
      };
      term.addEventListener('pointerenter', event => { if (event.pointerType === 'mouse') place(event.clientX, event.clientY); });
      term.addEventListener('pointermove', event => { if (event.pointerType === 'mouse') place(event.clientX, event.clientY); });
      term.addEventListener('focus', () => { const rect = term.getBoundingClientRect(); place(rect.right + 4, rect.top + rect.height / 2); });
    }
  }

  function renderContent(data) {
    document.title = `${data.site.name} · AI Product`;
    const brand = document.querySelector('.brand');
    if (brand?.lastChild?.nodeType === Node.TEXT_NODE) brand.lastChild.textContent = data.site.name;
    const heading = document.querySelector('#home h1');
    if (heading) heading.innerHTML = `${escapeHTML(data.hero.firstName)} <em>${escapeHTML(data.hero.lastName)}</em><span class="name-period" aria-hidden="true">.</span>`;
    setText(document.querySelector('#home .eyebrow'), data.hero.eyebrow);
    setText(document.querySelector('#home .hero-intro'), data.hero.intro);

    for (const link of document.querySelectorAll('[href^="mailto:"]')) { link.href = `mailto:${data.site.email}`; if (link.classList.contains('footer-email') || link.closest('.hero-contact')) link.lastChild.textContent = data.site.email; }
    const copy = document.querySelector('.copy-email'); if (copy) copy.dataset.email = data.site.email;
    for (const link of document.querySelectorAll('.cv-button,.cv-preview,.header-cv')) link.href = data.site.cv;
    const linkedin = document.querySelector('.hero-actions a[href*="linkedin"]'); if (linkedin) linkedin.href = data.site.linkedin;
    const github = document.querySelector('.hero-actions a[href*="github"]'); if (github) github.href = data.site.github;

    document.querySelectorAll('#education .education-card').forEach((card, index) => {
      const item = data.education[index]; if (!item) return;
      setText(direct(card, '.school-label'), item.schoolLabel); setText(direct(card, '.date'), item.date);
      setText(direct(card, 'h3'), item.school); setText(direct(card, '.degree'), item.degree);
      setText(direct(card, '.distinction'), item.distinction); setInline(direct(card, '.courses'), item.courses);
    });

    data.experience.forEach(renderExperience);

    const assistant = data.projects.creatorAssistant, assistantRoot = document.getElementById('creator-assistant');
    if (assistant && assistantRoot) {
      setText(direct(assistantRoot, 'h3'), assistant.title); setText(direct(assistantRoot, '.project-label'), assistant.label);
      const workflow = direct(assistantRoot, '.project-workflow'); if (workflow) workflow.innerHTML = assistant.workflow.map((step, index) => `${index ? '<i aria-hidden="true"></i>' : ''}<span>${escapeHTML(step)}</span>`).join('');
      const list = direct(assistantRoot, ':scope > .bullet-list'); if (list) list.innerHTML = `<li><p>${inline(assistant.body)}</p></li>`;
      renderNotebook(assistantRoot, assistant.notebook);
    }
    renderStandalone(document.getElementById('china-open'), { title: data.projects.chinaOpen.title, label: data.projects.chinaOpen.label, bullets: [{ label: data.projects.chinaOpen.bulletLabel, body: data.projects.chinaOpen.body }] });
    renderStandalone(document.getElementById('competition-awards'), data.projects.awards);

    document.querySelectorAll('#summary .summary-item').forEach((item, index) => {
      const summary = data.summary[index]; if (!summary) return;
      setText(direct(item, 'h3'), summary.title); setInline(direct(item, 'p'), summary.body);
    });

    const guide = document.querySelector('#sheep-guide-data');
    if (guide) guide.textContent = JSON.stringify(data.sheepGuide);
    wireTooltips();
    document.documentElement.dataset.contentSource = 'json';
    document.dispatchEvent(new CustomEvent('sitecontent:update', { detail: { sheepGuide: data.sheepGuide, Qsheep: data.Qsheep } }));
  }

  fetch('content.json', { cache: 'no-store' })
    .then(response => { if (!response.ok) throw new Error(`Could not load content.json (${response.status})`); return response.json(); })
    .then(renderContent)
    .catch(error => console.info('Using the built-in content fallback.', error));
})();
