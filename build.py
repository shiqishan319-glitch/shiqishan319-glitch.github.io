"""Build the English resume website. Edit content.json, then run python3 build.py."""
import json
import hashlib
from html import escape as e
import re
from pathlib import Path
root=Path(__file__).parent
c=json.loads((root/'content.json').read_text())
name_parts=c['name'].rsplit(' ',1)
name_heading=e(name_parts[0])+(f' <em>{e(name_parts[1])}</em>' if len(name_parts)>1 else '')
# Decorative icons are hidden from assistive technology; visible text labels remain.
ICON_PATHS = {
    'education': '<path d="m3 9 9-5 9 5-9 5-9-5Z"/><path d="M7 12v5c3 2 7 2 10 0v-5M21 9v7"/>',
    'experience': '<rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12c6 4 12 4 18 0M10 13v3h4v-3"/>',
    'projects': '<path d="M8 3h8v5a4 4 0 0 1-8 0V3ZM8 5H4v2a4 4 0 0 0 4 4m8-6h4v2a4 4 0 0 1-4 4M12 12v5m-4 4v-2a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2H8Z"/>',
    'profile': '<circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>',
    'mail': '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 6 9 7 9-7"/>',
    'external': '<path d="M7 17 17 7M7 7h10v10"/>',
    'link': '<path d="m10 13 4-4m-6 6-1 1a3.5 3.5 0 0 1-5-5l4-4a3.5 3.5 0 0 1 5 0m2 2 1-1a3.5 3.5 0 0 1 5 5l-4 4a3.5 3.5 0 0 1-5 0"/>',
    'download': '<path d="M12 3v12m-4-4 4 4 4-4M4 16v4h16v-4"/>',
    'copy': '<rect x="8" y="8" width="12" height="13" rx="2"/><path d="M16 8V3H3v13h5"/>',
    'linkedin': '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 10v7m5 0v-7m0 3a3 3 0 0 1 6 0v4"/><path d="M7 7h.01"/>',
    'up': '<path d="M12 20V4m-6 6 6-6 6 6"/>',
}
def icon(name):
    if name == 'github':
        return '<img class="icon github-icon" src="assets/logos/github.svg" width="18" height="18" alt="" aria-hidden="true">'
    return '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">'+ICON_PATHS[name]+'</svg>'

def logo(filename):
    return f'<span class="organization-logo"><img src="assets/logos/{filename}" alt="" width="44" height="44" decoding="async"></span>'

LOGOS = {'LSE':'lse.svg', 'CUC':'cuc.jpg', 'Alibaba · Qwen':'qwen.png', 'Xiaohongshu · Pugongying':'xiaohongshu.png', 'Publicis Groupe':'publicis.png'}

def format_body(body):
    # Highlight only quantitative evidence already present in the source text.
    pattern = r"(?<![\w.])(?:RMB 3 million|100K\+|7K\+|1\.5K|1\.4K|100\+|130\+|65\+|60\+|50\+|\d+(?:\.\d+)?%)(?![\w])"
    return re.sub(pattern, lambda m: '<span class="evidence">'+m.group()+'</span>', e(body))

def details(item):
    d=item.get('details')
    if not d:return ''
    return f'<details class="project-details"><summary>{e(d["label"])}<span class="expand-icon" aria-hidden="true">+</span></summary><p>{e(d["text"])}</p></details>'

linkedin=''
if c.get('linkedin'):
    assert c['linkedin'].startswith('https://www.linkedin.com/in/'), 'Use the full LinkedIn profile URL'
    linkedin=f'<a class="action-link" href="{e(c["linkedin"])}" target="_blank" rel="noopener noreferrer">{icon("linkedin")}LinkedIn{icon("external")}<span class="sr-only"> (opens in a new tab)</span></a>'

def bullets(items):
    return '<ul class="bullet-list">'+''.join('<li'+(' class="has-label"' if title else '')+'>'+(f'<strong class="bullet-label">{e(title)}</strong>' if title else '')+'<p>'+format_body(body)+'</p></li>' for title,body in items)+'</ul>' 
def permalink(anchor,title):
    return f'<a class="permalink" href="#{anchor}" aria-label="Link to {e(title)}" title="Link to this project">{icon("link")}</a>'

def heading(name,title):
    number={'education':'01','experience':'02','projects':'03','profile':'04'}[name]
    return f'<div class="section-heading"><span class="section-number">{icon(name)}</span><h2>{title}</h2><span class="heading-line"></span><span class="section-index" aria-hidden="true">{number}</span></div>'
education=''
for x in c['education']:
    education+=f'''<article class="education-card"><div class="school-top"><div class="school-identity">{logo(LOGOS[x['short']])}<span class="school-label">{e(x['short'])}</span></div><span class="date">{e(x['date'])}</span></div><h3>{e(x['school'])}</h3><p class="degree">{e(x['degree'])}</p><p class="distinction">{e(x['distinction'])}</p><p class="courses"><strong>Coursework:</strong> {e(x['courses'])}</p></article>'''
experience=''
for x in c['experience']:
    parts=''
    for i,p in enumerate(x.get('projects',[]),1):
        anchor=['agent-teams','overseas-product'][i-1]
        parts+=f'''<section class="work-project" id="{anchor}" tabindex="-1"><div class="project-heading"><span class="project-number">PROJECT {i:02}</span><div class="project-title-row"><h4>{e(p['title'])}</h4>{permalink(anchor,p['title'])}</div><p>{e(p['subtitle'])}</p></div><p class="intro">{e(p['intro'])}</p>{bullets(p['bullets'])}{details(p)}</section>'''
    if 'intro' in x:parts+=f'<p class="intro">{e(x["intro"])}</p>'
    if 'bullets' in x:parts+=bullets(x['bullets'])
    experience+=f'''<article class="experience-entry" id="{ {"Alibaba · Qwen":"qwen-experience", "Xiaohongshu · Pugongying":"creator-platform", "Publicis Groupe":"publicis"}[x["company"]] }"><header class="entry-header"><div class="organization">{logo(LOGOS[x['company']])}<div class="organization-copy"><h3>{e(x['company'])}</h3><p class="entry-role">{e(x['role'])}</p></div></div><span class="date">{e(x['date'])}</span></header>{parts}</article>'''
projects=''
for anchor,p in zip(['creator-assistant','china-open','competition-awards'],c['projects']):
    workflow='<div class="project-workflow" aria-label="Assistant workflow"><span>Account history</span><span aria-hidden="true">→</span><span>Audience perspectives</span><span aria-hidden="true">→</span><span>Content feedback</span></div>' if anchor=='creator-assistant' else ''
    projects+=f'''<article class="standalone-project" id="{anchor}" tabindex="-1"><header class="entry-header"><div class="project-title-row"><h3>{e(p['title'])}</h3>{permalink(anchor,p['title'])}</div><span class="project-label">{e(p['label'])}</span></header>{workflow}{bullets(p['bullets'])}{details(p)}</article>'''

sheep_svg=(root/'assets/sheep.svg').read_text().replace('<svg ', '<svg aria-hidden="true" focusable="false" ', 1)
sheep=f'''<div class="sheep-home"><div class="sheep-companion" hidden><button type="button" class="sheep-project-prompt" hidden>About this project</button><button class="sheep-button" type="button" aria-label="Say hello to the little sheep" aria-describedby="sheep-help"><span class="sheep-bubble" aria-hidden="true"></span>{sheep_svg}<span class="sheep-caption" aria-hidden="true">Say hello</span></button><span id="sheep-help" class="sr-only">Tap to say hello, tap twice or stroke my head for a pat, or hold and release for a little hop. I snack and nap while you read.</span><section class="sheep-guide-card" aria-labelledby="sheep-guide-title" hidden><div class="sheep-guide-heading"><span>READ ALONG</span><button type="button" class="sheep-guide-close" aria-label="Close project note">×</button></div><h2 id="sheep-guide-title"></h2><p class="sheep-guide-text"></p><div class="sheep-guide-footer"><span class="sheep-guide-count"></span><button type="button" class="sheep-guide-more">Tell me more</button></div><button type="button" class="sheep-auto" aria-pressed="true">Automatic notes: on</button></section><span class="sr-only sheep-status" role="status" aria-live="polite" aria-atomic="true"></span></div></div>'''
summary=''.join(f'<article class="summary-item"><h3>{e(t)}</h3><p>{format_body(b)}</p></article>' for t,b in c['summary'])
guide_json=json.dumps(c.get('sheepGuide', []),ensure_ascii=False).replace('<','\\u003c')
css_version=hashlib.sha256((root/'style.css').read_bytes()).hexdigest()[:10]
js_version=hashlib.sha256((root/'script.js').read_bytes()).hexdigest()[:10]
motion_json=json.dumps(json.loads((root/'assets/sheep-poses.json').read_text()),separators=(',',':')).replace('<','\\u003c')
controller_version=hashlib.sha256((root/'bu-controller.js').read_bytes()).hexdigest()[:10]
sheep_version=hashlib.sha256((root/'sheep.js').read_bytes()).hexdigest()[:10]
html=f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>{e(c['name'])} · AI Product</title>
<meta name="description" content="Qishan Shi: AI product experience at Qwen and Xiaohongshu, social anthropology at LSE, and creator projects."><meta name="theme-color" content="#faf9f6"><meta property="og:title" content="Qishan Shi · AI Product"><meta property="og:description" content="Agent evaluation, creator products, and cross-cultural research."><meta property="og:type" content="website"><meta property="og:url" content="https://shiqishan319-glitch.github.io/"><link rel="icon" href="favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="style.css?v={css_version}"><script src="script.js?v={js_version}" defer></script><script src="bu-controller.js?v={controller_version}" defer></script><script src="sheep.js?v={sheep_version}" defer></script></head>
<body><a class="skip" href="#education">Skip to content</a><div class="header-shell"><header class="site-header wrap"><div class="header-identity"><a class="brand" href="#home"><span class="brand-dot"></span>{e(c['name'])}</a><a class="header-cv" href="{e(c['cv'])}" download="Qishan-Shi-CV.pdf" aria-label="Download CV (Chinese PDF)" title="Download CV · Chinese PDF" inert>{icon('download')}CV</a></div><nav aria-label="Main navigation"><a href="#education">Education</a><a href="#experience">Experience</a><a href="#projects">Projects & awards</a><a href="#summary">Profile</a></nav></header><div class="reading-progress" aria-hidden="true"></div></div>
<main class="wrap"><section class="hero" id="home" tabindex="-1"><div class="hero-copy"><div class="hero-kicker"><p class="eyebrow">{e(c['role'])}</p>{sheep}</div><h1>{name_heading}<span class="name-period" aria-hidden="true">.</span></h1><p class="hero-intro">{e(c['intro'])}</p><div class="hero-actions"><a class="cv-button" href="{e(c['cv'])}" download="Qishan-Shi-CV.pdf">{icon('download')}Download CV<span class="file-language">中文 PDF</span></a><a class="cv-preview" href="{e(c['cv'])}" target="_blank" rel="noopener noreferrer" aria-label="Preview CV (Chinese PDF, opens in a new tab)">Preview{icon('external')}</a>{linkedin}<a class="action-link" href="https://github.com/shiqishan319-glitch" target="_blank" rel="noopener noreferrer">{icon('github')}GitHub{icon('external')}<span class="sr-only"> (opens in a new tab)</span></a></div><div class="hero-contact"><a href="mailto:{e(c['email'])}">{icon('mail')}{e(c['email'])}</a><button class="copy-email" type="button" data-email="{e(c['email'])}" aria-label="Copy email address" title="Copy email address" hidden>{icon('copy')}</button><span class="copy-status" role="status" aria-live="polite"></span></div></div><div class="focus-canvas" aria-label="Explore my focus areas">
<div class="canvas-orbit" aria-hidden="true"></div><span class="canvas-caption">A FEW THINGS I WORK ON</span>
<a class="focus-card focus-primary" href="#agent-teams"><div class="focus-card-top"><span>01 / AGENT EVALUATION</span>{icon('external')}</div><div class="mini-workflow" aria-hidden="true"><span class="workflow-node"><svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="7" y="4" width="18" height="24" rx="3"/><path d="M11 10h10m-10 6h10m-10 6h6"/></svg></span><i></i><span class="workflow-node node-purple"><svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M16 3 29 16 16 29 3 16 16 3Z"/><path d="m12 11 8 5-8 5V11Z"/></svg></span><i></i><span class="workflow-node"><svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="16" cy="16" r="12"/><path d="m10 16 4 4 8-8"/></svg></span></div><strong>Test. Compare. Iterate.</strong><span class="focus-card-caption">From Skill instructions to better outcomes.</span></a>
<a class="focus-card focus-secondary" href="#creator-assistant"><span class="focus-card-symbol" aria-hidden="true">✳</span><div><span class="focus-card-number">02 / CREATOR TOOLS</span><strong>Ideas into workflows.</strong></div>{icon('external')}</a>
<a class="focus-card focus-tertiary" href="#summary"><span class="focus-card-symbol">{icon('profile')}</span><div><span class="focus-card-number">03 / HUMAN CONTEXT</span><strong>Cross-cultural perspectives.</strong></div>{icon('external')}</a>
</div><div class="hero-footnote"><span>PRODUCT × CREATIVITY × ANTHROPOLOGY</span><a href="#experience">Explore my work <span aria-hidden="true">↓</span></a></div></section>
<section class="resume-section" id="education" tabindex="-1">{heading('education','Education')}<div class="education-grid">{education}</div></section>
<section class="resume-section" id="experience" tabindex="-1">{heading('experience','Internship experience')}<div class="experience-list">{experience}</div></section>
<section class="resume-section" id="projects" tabindex="-1">{heading('projects','Projects & awards')}{projects}</section>
<section class="resume-section" id="summary" tabindex="-1">{heading('profile','Personal profile')}<div class="summary-grid">{summary}</div></section></main>
<footer class="wrap"><a class="footer-email" href="mailto:{e(c['email'])}">{icon('mail')}Email Qishan</a><span>© 2026 {e(c['name'])}</span><a href="#home">{icon('up')}Back to top</a></footer><script type="application/json" id="sheep-motion-data">{motion_json}</script><script type="application/json" id="sheep-guide-data">{guide_json}</script></body></html>'''
(root/'index.html').write_text(html)
print('Built resume-layout website: 2 education entries, 3 internships, 3 projects/awards entries, 4 profile points.')
