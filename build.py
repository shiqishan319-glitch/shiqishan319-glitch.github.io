"""Build the English resume website. Edit content.json, then run python3 build.py."""
import json
from html import escape as e
import re
from pathlib import Path
root=Path(__file__).parent
c=json.loads((root/'content.json').read_text())
# Decorative icons are hidden from assistive technology; visible text labels remain.
ICON_PATHS = {
    'education': '<path d="m3 9 9-5 9 5-9 5-9-5Z"/><path d="M7 12v5c3 2 7 2 10 0v-5M21 9v7"/>',
    'experience': '<rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12c6 4 12 4 18 0M10 13v3h4v-3"/>',
    'projects': '<path d="M8 3h8v5a4 4 0 0 1-8 0V3ZM8 5H4v2a4 4 0 0 0 4 4m8-6h4v2a4 4 0 0 1-4 4M12 12v5m-4 4v-2a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2H8Z"/>',
    'profile': '<circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>',
    'mail': '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 6 9 7 9-7"/>',
    'external': '<path d="M7 17 17 7M7 7h10v10"/>',
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

def bullets(items):
    return '<ul class="bullet-list">'+''.join('<li'+(' class="has-label"' if title else '')+'>'+(f'<strong class="bullet-label">{e(title)}</strong>' if title else '')+'<p>'+format_body(body)+'</p></li>' for title,body in items)+'</ul>' 
def heading(name,title):
    return f'<div class="section-heading"><span class="section-number">{icon(name)}</span><h2>{title}</h2><span class="heading-line"></span></div>'
education=''
for x in c['education']:
    education+=f'''<article class="education-card"><div class="school-top"><div class="school-identity">{logo(LOGOS[x['short']])}<span class="school-label">{e(x['short'])}</span></div><span class="date">{e(x['date'])}</span></div><h3>{e(x['school'])}</h3><p class="degree">{e(x['degree'])}</p><p class="distinction">{e(x['distinction'])}</p><p class="courses"><strong>Coursework:</strong> {e(x['courses'])}</p></article>'''
experience=''
for x in c['experience']:
    parts=''
    for i,p in enumerate(x.get('projects',[]),1):
        parts+=f'''<section class="work-project"><div class="project-heading"><span class="project-number">PROJECT {i:02}</span><h4>{e(p['title'])}</h4><p>{e(p['subtitle'])}</p></div><p class="intro">{e(p['intro'])}</p>{bullets(p['bullets'])}</section>'''
    if 'intro' in x:parts+=f'<p class="intro">{e(x["intro"])}</p>'
    if 'bullets' in x:parts+=bullets(x['bullets'])
    experience+=f'''<article class="experience-entry"><header class="entry-header"><div class="organization">{logo(LOGOS[x['company']])}<div class="organization-copy"><h3>{e(x['company'])}</h3><p class="entry-role">{e(x['role'])}</p></div></div><span class="date">{e(x['date'])}</span></header>{parts}</article>'''
projects=''.join(f'''<article class="standalone-project"><header class="entry-header"><h3>{e(p['title'])}</h3><span class="project-label">{e(p['label'])}</span></header>{bullets(p['bullets'])}</article>''' for p in c['projects'])
summary=''.join(f'<article class="summary-item"><h3>{e(t)}</h3><p>{format_body(b)}</p></article>' for t,b in c['summary'])
html=f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>{e(c['name'])} · AI Product</title>
<meta name="description" content="Qishan Shi: AI product experience at Qwen and Xiaohongshu, social anthropology at LSE, and creator projects."><meta name="theme-color" content="#f8faf8"><meta property="og:title" content="Qishan Shi · AI Product"><meta property="og:description" content="Agent evaluation, creator products, and cross-cultural research."><meta property="og:type" content="website"><meta property="og:url" content="https://shiqishan319-glitch.github.io/"><link rel="icon" href="favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="style.css"><script src="script.js" defer></script></head>
<body><a class="skip" href="#education">Skip to content</a><div class="header-shell"><header class="site-header wrap"><a class="brand" href="#home"><span class="brand-dot"></span>{e(c['name'])}</a><nav aria-label="Main navigation"><a href="#education">Education</a><a href="#experience">Experience</a><a href="#projects">Projects & awards</a><a href="#summary">Profile</a></nav></header></div>
<main class="wrap"><section class="hero" id="home"><div class="hero-copy"><p class="eyebrow">{e(c['role'])}</p><h1>{e(c['name'])}</h1><p class="hero-intro">{e(c['intro'])}</p><div class="hero-links"><a href="mailto:{e(c['email'])}">{icon('mail')}{e(c['email'])}</a><a href="https://github.com/shiqishan319-glitch" target="_blank" rel="noopener noreferrer">{icon('github')}GitHub{icon('external')}</a></div></div><div class="hero-note"><span>FOCUS</span><p>Agent evaluation<br>Creator workflows<br>Cross-cultural research</p></div></section>
<section class="resume-section" id="education">{heading('education','Education')}<div class="education-grid">{education}</div></section>
<section class="resume-section" id="experience">{heading('experience','Internship experience')}<div class="experience-list">{experience}</div></section>
<section class="resume-section" id="projects">{heading('projects','Projects & awards')}{projects}</section>
<section class="resume-section" id="summary">{heading('profile','Personal profile')}<div class="summary-grid">{summary}</div></section></main>
<footer class="wrap"><a class="footer-email" href="mailto:{e(c['email'])}">{icon('mail')}Email Qishan</a><span>© 2026 {e(c['name'])}</span><a href="#home">{icon('up')}Back to top</a></footer></body></html>'''
(root/'index.html').write_text(html)
print('Built resume-layout website: 2 education entries, 3 internships, 3 projects/awards entries, 4 profile points.')
