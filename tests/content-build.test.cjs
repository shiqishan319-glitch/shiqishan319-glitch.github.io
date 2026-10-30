const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

test('a clean build publishes JSON edits in fallback copy, notes, tips and CV links', () => {
  const root = path.resolve(__dirname, '..');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'qs-content-'));
  try {
    for (const name of ['build.py', 'content.json', 'style.css', 'script.js', 'content-editor.js', 'bu-controller.js', 'sheep-roam.js', 'sheep.js', 'assets']) {
      fs.cpSync(path.join(root, name), path.join(dir, name), { recursive: true });
    }
    const data = JSON.parse(fs.readFileSync(path.join(dir, 'content.json')));
    data.hero.intro = 'Updated introduction from JSON';
    data.experience[0].projects[0].bullets[0].body = '[[Edited term|Edited explanation]]';
    data.experience[0].projects[0].notebook.stages[0][2] = 'Edited project notebook';
    data.projects.creatorAssistant.body = 'Edited independent project';
    data.projects.creatorAssistant.demo.src = 'assets/edited-demo.mp4';
    data.projects.creatorAssistant.demo.poster = 'assets/edited-poster.jpg';
    data.projects.creatorAssistant.demo.title = 'Edited demo title';
    data.projects.creatorAssistant.demo.repositoryUrl = 'https://github.com/example/edited-project';
    data.projects.imagegenSkills.body = 'Edited visual collection';
    data.projects.imagegenSkills.showcase.items[0].author = 'Updated Skill credit';
    data.projects.imagegenSkills.showcase.links[0].url = 'https://github.com/example/visual-collection';
    data.summary[0].body = 'Edited profile';
    data.sheepGuide[0].notes[0] = 'Edited sheep explanation';
    data.site.cv = 'assets/base-new.pdf?v=revision';
    data.site.cvChinese = 'assets/chinese-new.pdf?v=chinese-revision';
    fs.writeFileSync(path.join(dir, 'content.json'), JSON.stringify(data));
    execFileSync('python3', ['build.py'], { cwd: dir });
    const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
    for (const copy of ['Updated introduction from JSON', 'Edited term', 'Edited explanation', 'Edited project notebook', 'Edited independent project', 'Edited profile', 'Edited sheep explanation']) assert(html.includes(copy), copy);
    assert.equal((html.match(/href="assets\/base-new.pdf\?v=revision"/g) || []).length, 2);
    assert(html.includes('href="assets/chinese-new.pdf?v=chinese-revision"'));
    assert(html.includes('download="Qishan-Shi-CV-English.pdf"'));
    assert(!html.includes('cv-preview'));
    assert(html.includes('download="Qishan-Shi-CV-Chinese.pdf"'));
    assert(!html.includes('[[Edited term|'));
    assert(html.includes('src="assets/edited-demo.mp4"'));
    assert(html.includes('poster="assets/edited-poster.jpg"'));
    assert(html.includes('Edited demo title'));
    assert(html.includes('href="https://github.com/example/edited-project"'));
    assert(html.includes('<video controls playsinline preload="none"'));
    assert(!html.includes(' autoplay'));
    assert(html.includes('class="project-details behind-work"'));
    assert(html.includes('Edited visual collection'));
    assert(html.includes('Updated Skill credit'));
    assert(html.includes('href="https://github.com/example/visual-collection"'));
    assert.equal((html.match(/id="imagegen-skills"/g) || []).length, 1);
    assert(html.includes('content-editor.js?v='));
    assert(!fs.readFileSync(path.join(dir, 'script.js'), 'utf8').includes('Applied across 50+ posts'));
    execFileSync('python3', ['build.py'], { cwd: dir });
    assert.equal(fs.readFileSync(path.join(dir, 'index.html'), 'utf8'), html, 'build must be reproducible');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
