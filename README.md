# Qishan Shi · Personal website

English website arranged in resume order: Education → Internship experience → Projects & awards → Personal profile.

## Editing

All displayed resume text is in **content.json**, in page order. Update the relevant entry and run:

```
python3 build.py
```

The `cv` field points to the downloadable PDF. Replace that file to update the CV. Set `linkedin` to the full `https://www.linkedin.com/in/...` profile URL to show its button; an empty value keeps it hidden. Optional `details` blocks hold expandable project methods.

This updates `index.html`. `build.py` controls page structure and `style.css` controls layout and colors. The site uses plain HTML and CSS with a small navigation script (`script.js`). All content remains readable without JavaScript. There are no external dependencies. The browser print stylesheet also provides a simpler layout for printing.

## Local preview

Run `python3 -m http.server 8765` in this folder and visit http://localhost:8765.

## GitHub Pages

Repository: `shiqishan319-glitch.github.io`. In Settings → Pages, choose **Deploy from a branch**, **main**, **/ (root)**. Include `.nojekyll` in the root.

## Interactive illustrations

The optional Skill comparison and creator workflow demos live in `partials/evaluation.html` and `partials/workflow.html`. Their behavior is in `script.js`; they use invented, scripted examples, not internal data or live AI. They are hidden without JavaScript, support keyboard/touch input, and are excluded from print. Resume content in `content.json` stays separate.

Run `python3 build.py` after changing any source or asset stylesheet/script. The build adds content hashes to CSS/JS URLs so returning visitors receive current assets.

Manual checks: open both demos from the homepage link; switch Skills and each control; build different step orders; undo/reset; test keyboard input and narrow screens. Verify the CV and LinkedIn links still work.
