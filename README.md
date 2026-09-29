# Qishan Shi · Personal website

English website arranged in resume order: Education → Internship experience → Projects & awards → Personal profile.

## Editing

All displayed resume text is in **content.json**, in page order. Update the relevant entry and run:

```
python3 build.py
```

This updates `index.html`. `build.py` controls page structure and `style.css` controls layout and colors. The site uses plain HTML and CSS with a small navigation script (`script.js`). All content remains readable without JavaScript. There are no external dependencies. The browser print stylesheet also provides a simpler layout for printing.

## Local preview

Run `python3 -m http.server 8765` in this folder and visit http://localhost:8765.

## GitHub Pages

Repository: `shiqishan319-glitch.github.io`. In Settings → Pages, choose **Deploy from a branch**, **main**, **/ (root)**. Include `.nojekyll` in the root.
