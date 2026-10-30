"""Build the English resume website. Edit content.json, then run python3 build.py."""
import json
import hashlib
from html import escape as e
import re
from pathlib import Path
root=Path(__file__).parent
c=json.loads((root/'content.json').read_text())
# Layout aliases only; all copy, tooltips and notes come from content.json.
c = {**c, **c['site'], 'role': c['hero']['eyebrow'], 'intro': c['hero']['intro']}
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
    escaped = e(str(body))
    def replace(match):
        format_body.tip_id += 1
        label, explanation = match.groups()
        ident = f"tip-{format_body.tip_id}"
        return (f'<span class="term-tip" tabindex="0" aria-describedby="{ident}">'
                f'<span class="evidence">{label}</span>'
                f'<span class="tooltip-pop" id="{ident}" role="tooltip">{explanation}</span></span>')
    escaped = re.sub(r"\[\[([^|\]]+)\|([^\]]+)\]\]", replace, escaped)
    return re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", escaped)
format_body.tip_id = 0

def plain(body):
    return re.sub(r"\*\*([^*]+)\*\*", r"\1", re.sub(r"\[\[([^|\]]+)\|([^\]]+)\]\]", r"\1", body))

def details(item):
    n = item.get('notebook')
    if not n: return ''
    trail = ''.join(f'<span class="notebook-trail-item"><b>{i:02}</b>{e(step)}</span>' for i, step in enumerate(n['trail'],1))
    stages = ''.join(f'<article class="notebook-stage"><span class="notebook-stage-number">{e(num)}</span><h5>{e(label)}</h5><p>{e(copy)}</p></article>' for num,label,copy in n['stages'])
    return ('<details class="project-details behind-work"><summary><span class="notebook-summary-mark" aria-hidden="true">✦</span>'
            '<span class="notebook-summary-copy"><b>Behind the work</b><small>Problem · judgment · result</small></span>'
            '<span class="expand-icon" aria-hidden="true">+</span></summary>'
            f'<div class="notebook-fold"><div class="notebook-trail" aria-label="Project reasoning flow">{trail}</div><div class="notebook-stages">{stages}</div></div></details>')

def showcase(item):
    s = item.get('showcase')
    if not s: return ''
    cards = ''.join(
        f'<figure><a class="showcase-image" href="{e(x["url"])}" target="_blank" rel="noopener noreferrer" aria-label="View {e(x["title"])} examples (opens in a new tab)">'
        f'<img src="{e(x["src"])}" alt="{e(x["alt"])}" width="{x["width"]}" height="{x["height"]}" loading="lazy" decoding="async"></a>'
        f'<figcaption><strong>{e(x["title"])}</strong><span>Skill by <a href="{e(x["authorUrl"])}" target="_blank" rel="noopener noreferrer">{e(x["author"])}</a></span></figcaption></figure>'
        for x in s['items'])
    links = ''.join(f'<a href="{e(x["url"])}" target="_blank" rel="noopener noreferrer">{e(x["label"])}{icon("external")}<span class="sr-only"> (opens in a new tab)</span></a>' for x in s['links'])
    return f'<section class="project-showcase" aria-label="{e(s["title"])}"><h4>{e(s["title"])}</h4><p class="showcase-caption">{e(s["caption"])}</p><div class="showcase-grid">{cards}</div><div class="demo-links">{links}</div></section>'

def demo(item):
    d = item.get('demo')
    if not d: return ''
    return (f'<figure class="project-demo"><figcaption><h4>{e(d["title"])}</h4>'
            f'<p class="demo-meta">{e(d["caption"])}</p></figcaption>'
            f'<video controls playsinline preload="none" width="1920" height="1080" poster="{e(d["poster"])}" src="{e(d["src"])}" aria-label="{e(d["title"])}"></video>'
            f'<p class="demo-description">{e(d["description"])}</p>'
            f'<div class="demo-links"><a href="{e(d["repositoryUrl"])}" target="_blank" rel="noopener noreferrer">{icon("github")}View project on GitHub<span class="sr-only"> (opens in a new tab)</span>{icon("external")}</a>'
            f'<a href="{e(d["src"])}" download>Download video{icon("download")}</a></div></figure>')

linkedin=''
if c.get('linkedin'):
    assert c['linkedin'].startswith('https://www.linkedin.com/in/'), 'Use the full LinkedIn profile URL'
    linkedin=f'<a class="action-link" href="{e(c["linkedin"])}" target="_blank" rel="noopener noreferrer">{icon("linkedin")}LinkedIn{icon("external")}<span class="sr-only"> (opens in a new tab)</span></a>'

chinese_cv = ''
if c.get('cvChinese'):
    chinese_cv = f'<a class="action-link cv-chinese" href="{e(c["cvChinese"])}" download="Qishan-Shi-CV-Chinese.pdf" aria-label="下载中文简历 PDF">{icon("download")}<span>{e(c.get("cvChineseLabel", "中文简历"))}</span></a>'

def bullets(items):
    return '<ul class="bullet-list">'+''.join('<li'+(' class="has-label"' if title else '')+'>'+(f'<strong class="bullet-label">{format_body(title)}</strong>' if title else '')+'<p>'+format_body(body)+'</p></li>' for title,body in ((item.get('label',''),item['body']) for item in items))+'</ul>'
def permalink(anchor,title):
    return f'<a class="permalink" href="#{anchor}" aria-label="Link to {e(plain(title))}" title="Link to this project">{icon("link")}</a>'

def heading(name,title):
    number={'education':'01','experience':'02','projects':'03','profile':'04'}[name]
    return f'<div class="section-heading"><span class="section-number">{icon(name)}</span><h2>{title}</h2><span class="heading-line"></span><span class="section-index" aria-hidden="true">{number}</span></div>'
education=''
for x in c['education']:
    education+=f'''<article class="education-card"><div class="school-top"><div class="school-identity">{logo(LOGOS[x['schoolLabel']])}<span class="school-label">{e(x['schoolLabel'])}</span></div><span class="date">{e(x['date'])}</span></div><h3>{e(x['school'])}</h3><p class="degree">{e(x['degree'])}</p><p class="distinction">{format_body(x['distinction'])}</p><p class="courses">{format_body(x['courses'])}</p></article>'''
experience=''
for x in c['experience']:
    parts=f'<p class="intro">{format_body(x.get("intro",""))}</p>'
    for i,p in enumerate(x.get('projects',[]),1):
        anchor=p['id']
        parts+=f'''<section class="work-project" id="{anchor}" tabindex="-1"><div class="project-heading"><span class="project-number">{e(p['number'])}</span><div class="project-title-row"><h4>{format_body(p['title'])}</h4>{permalink(anchor,p['title'])}</div><p>{format_body(p['subtitle'])}</p></div><p class="intro">{format_body(p['intro'])}</p>{bullets(p['bullets'])}{details(p)}</section>'''
    if 'bullets' in x:parts+=bullets(x['bullets'])
    experience+=f'''<article class="experience-entry" id="{ {"Alibaba · Qwen":"qwen-experience", "Xiaohongshu · Pugongying":"creator-platform", "Publicis Groupe":"publicis"}[x["company"]] }"><header class="entry-header"><div class="organization">{logo(LOGOS[x['company']])}<div class="organization-copy"><h3>{e(x['company'])}</h3><p class="entry-role">{e(x['role'])}</p></div></div><span class="date">{e(x['date'])}</span></header>{parts}</article>'''
projects=''
for anchor,key in [('creator-assistant','creatorAssistant'),('imagegen-skills','imagegenSkills'),('china-open','chinaOpen'),('competition-awards','awards')]:
    p=c['projects'][key]
    workflow=''
    if p.get('workflow'):
        workflow='<div class="project-workflow" aria-label="Assistant workflow">'+'<i aria-hidden="true"></i>'.join(f'<span>{e(step)}</span>' for step in p['workflow'])+'</div>'
    items=p.get('bullets',[{'label':p.get('bulletLabel',''),'body':p.get('body','')}])
    projects+=f'''<article class="standalone-project" id="{anchor}" tabindex="-1"><header class="entry-header"><div class="project-title-row"><h3>{format_body(p['title'])}</h3>{permalink(anchor,p['title'])}</div><span class="project-label">{format_body(p['label'])}</span></header>{workflow}{bullets(items)}{demo(p)}{showcase(p)}{details(p)}</article>'''

sheep_svg=(root/'assets/sheep.svg').read_text().replace('<svg ', '<svg aria-hidden="true" focusable="false" ', 1)
sheep=f'''<div class="sheep-home"><div class="sheep-companion" hidden><button type="button" class="sheep-project-prompt" hidden>About this project</button><button class="sheep-button" type="button" aria-label="Say hello to the little sheep" aria-describedby="sheep-help"><span class="sheep-bubble" aria-hidden="true"></span>{sheep_svg}<span class="sheep-caption" aria-hidden="true">Say hello</span></button><span id="sheep-help" class="sr-only">Tap to say hello. Double-click me to alternate between a snack and a head pat, stroke my head for a pat, or hold and release for a little hop. Drag me to a new spot, or double-click empty space to grow a tuft of grass for me. I snack and nap while you read.</span><section class="sheep-guide-card" aria-labelledby="sheep-guide-title" hidden><div class="sheep-guide-heading"><span>READ ALONG</span><button type="button" class="sheep-guide-close" aria-label="Close project note">×</button></div><h2 id="sheep-guide-title"></h2><p class="sheep-guide-text"></p><div class="sheep-guide-footer"><span class="sheep-guide-count"></span><button type="button" class="sheep-guide-more">Tell me more</button></div><button type="button" class="sheep-auto" aria-pressed="true">Automatic notes: on</button></section><span class="sr-only sheep-status" role="status" aria-live="polite" aria-atomic="true"></span></div></div>'''
summary=''.join(f'<article class="summary-item"><h3>{e(t)}</h3><p>{format_body(b)}</p></article>' for t,b in ((x['title'],x['body']) for x in c['summary']))
guide_json=json.dumps(c.get('sheepGuide', []),ensure_ascii=False).replace('<','\\u003c')
css_version=hashlib.sha256((root/'style.css').read_bytes()).hexdigest()[:10]
js_version=hashlib.sha256((root/'script.js').read_bytes()).hexdigest()[:10]
motion_json=json.dumps(json.loads((root/'assets/sheep-poses.json').read_text()),separators=(',',':')).replace('<','\\u003c')
controller_version=hashlib.sha256((root/'bu-controller.js').read_bytes()).hexdigest()[:10]
roam_version=hashlib.sha256((root/'sheep-roam.js').read_bytes()).hexdigest()[:10]
sheep_version=hashlib.sha256((root/'sheep.js').read_bytes()).hexdigest()[:10]
content_version=hashlib.sha256((root/'content-editor.js').read_bytes()).hexdigest()[:10]
html=f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>{e(c['name'])} · AI Product</title>
<meta name="description" content="Qishan Shi: AI agents and evaluation at Qwen, brand and creator workflows at Xiaohongshu, and independent product development."><meta name="theme-color" content="#faf9f6"><meta property="og:title" content="Qishan Shi · AI Product"><meta property="og:description" content="Skill evaluation, agent workflows, and independent product development."><meta property="og:type" content="website"><meta property="og:url" content="https://shiqishan319-glitch.github.io/"><link rel="icon" href="favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="style.css?v={css_version}"><script src="script.js?v={js_version}" defer></script><script src="bu-controller.js?v={controller_version}" defer></script><script src="sheep-roam.js?v={roam_version}" defer></script><script src="sheep.js?v={sheep_version}" defer></script><script src="content-editor.js?v={content_version}" defer></script></head>
<body><span class="sheep-dropping" aria-hidden="true" hidden><svg viewBox="0 0 28 20"><ellipse cx="14" cy="17" rx="12" ry="2" fill="#775d4520"/><ellipse cx="9" cy="13" rx="4.5" ry="3.5" fill="#92745d"/><ellipse cx="18" cy="13.5" rx="4.8" ry="3.5" fill="#80644f"/><ellipse cx="14" cy="8" rx="4.2" ry="3.7" fill="#a08369"/></svg></span><span class="meadow-grass" aria-hidden="true" hidden><svg viewBox="0 0 40 30" fill="none"><ellipse cx="20" cy="27" rx="17" ry="2" fill="#b6bd9633"/><path d="M20 27C15 22 10 17 4 17C9 22 11 26 12 27Z" fill="#899e73"/><path d="M19 27C16 15 13 10 10 7C11 17 10 23 14 27Z" fill="#708961"/><path d="M19 27C15 13 18 5 23 2C21 12 24 18 22 27Z" fill="#a5b47d"/><path d="M21 27C24 16 29 10 34 8C29 16 32 21 25 27Z" fill="#728f65"/><path d="M24 27C29 20 34 19 38 20C32 23 32 26 30 27Z" fill="#93aa75"/></svg></span><a class="skip" href="#education">Skip to content</a><div class="header-shell"><header class="site-header wrap"><div class="header-identity"><a class="brand" href="#home"><span class="brand-dot"></span>{e(c['name'])}</a><a class="header-cv" href="{e(c['cv'])}" download="Qishan-Shi-CV-English.pdf" aria-label="Download CV (English PDF)" title="Download CV · English PDF" inert>{icon('download')}CV</a></div><nav aria-label="Main navigation"><a href="#education">Education</a><a href="#experience">Experience</a><a href="#projects">Projects & awards</a><a href="#summary">Profile</a></nav></header><div class="reading-progress" aria-hidden="true"></div></div>
<main class="wrap"><section class="hero" id="home" tabindex="-1"><div class="hero-copy"><div class="hero-kicker"><p class="eyebrow">{e(c['role'])}</p>{sheep}</div><h1>{name_heading}<span class="name-period" aria-hidden="true">.</span></h1><p class="hero-intro">{e(c['intro'])}</p><div class="hero-actions"><a class="cv-button" href="{e(c['cv'])}" download="Qishan-Shi-CV-English.pdf" aria-label="Download CV (English PDF)">{icon('download')}Download CV</a>{chinese_cv}{linkedin}<a class="action-link" href="{e(c['github'])}" target="_blank" rel="noopener noreferrer">{icon('github')}GitHub{icon('external')}<span class="sr-only"> (opens in a new tab)</span></a></div><div class="hero-contact"><a href="mailto:{e(c['email'])}">{icon('mail')}{e(c['email'])}</a><button class="copy-email" type="button" data-email="{e(c['email'])}" aria-label="Copy email address" title="Copy email address" hidden>{icon('copy')}</button><span class="copy-status" role="status" aria-live="polite"></span></div></div><div class="focus-canvas" aria-label="Explore my focus areas">
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
print(f'Built resume-layout website: {len(c["education"])} education entries, {len(c["experience"])} internships, {len(c["projects"])} projects/awards entries, {len(c["summary"])} profile points.')
