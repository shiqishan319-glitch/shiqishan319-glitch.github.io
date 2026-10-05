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

The approved BU sheep is drawn as overlapping SVG layers in `assets/sheep.svg` and embedded by the build. Its 45 poses and 10 action sequences live in `assets/sheep-poses.json`; `bu-controller.js` interpolates the layers and preserves pointer gaze through blinks and other actions. Website interaction states, dialogue, and timers live in `sheep.js`. It supports pointer gaze, a short welcome, click responses and count-a-sheep milestones, head strokes, press/release bounce, drowsiness, yawning, sleep/wake, and feeding. There is no Play menu. Quick consecutive clicks/taps give head pats; holding and releasing produces a hop. After 8 seconds without nearby activity the sheep glances around, and after 20 seconds it takes a snack (at most once per 90 seconds). On the following quiet interval it becomes drowsy and falls asleep; clicking wakes it. Idle reactions pause while a project note is open. Keyboard Enter/Space activation supports greetings and quick-tap pats.

The sheep starts in the homepage and docks at the bottom right while reading. Project notes are stored in `content.json` under `sheepGuide`, keyed to section IDs. Each project has three short notes: an overview, approach, and outcome. After a brief pause on a project, its overview appears once per page visit; automatic notes are spaced apart and can be switched off within the reading-note card. About this project and Tell me more provide manual access. Returning home restores the original position.

Interactions use no network requests, audio, or persistent visitor storage. Hidden/offscreen cleanup cancels timers, captures, and animation; reduced-motion settings preserve text/state feedback without movement. Keep SVG part class names when swapping in a selected new character.

Build after edits with `python3 build.py` so CSS/JS URL hashes update. Check behavior with `node --test tests/*.test.cjs`; these deterministic checks cover gaze continuity, eyelid closure, action interruption, gesture thresholds, timer transitions, cancellation, feeding, reduced motion, project detection, note pacing, manual replay, and the automatic-note toggle. Also check native controls and layout in a browser at desktop/mobile widths.
