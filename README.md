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

## Personal details

The sheep is drawn in `assets/sheep.svg` and embedded by the build. Its standalone controller, dialogue, and timers live in `sheep.js`. It supports pointer gaze, a short welcome, click responses and count-a-sheep milestones, head strokes, press/release bounce, drowsiness, yawning, sleep/wake, and feeding. The Play disclosure exposes head pats, a grass snack, and nap controls for keyboard and touch users.

The sheep stays in the homepage. Its interactions use no network requests, audio, or persistent visitor storage. Hidden/offscreen cleanup cancels timers, captures, and animation; reduced-motion settings preserve text/state feedback without movement. Keep SVG part class names when swapping in a selected new character.

Build after edits with `python3 build.py` so CSS/JS URL hashes update. Check behavior with `node --test tests/sheep.test.cjs`; these deterministic checks cover gesture thresholds, timer transitions, cancellation, feeding, and reduced motion. Also check native controls and layout in a browser at desktop/mobile widths.
