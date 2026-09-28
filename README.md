# Signa — your hands speak

> **Sign → Text → Voice.** Show a sign to an ordinary webcam. Signa recognizes it in real time, writes the phrase on screen and says it out loud. Everything runs in the browser, and the video never leaves your device.

Built for **ADMIT HACKATHON — MOTION: "Camera instead of a joystick"**.

### ▶ Live demo: **https://sgrrsmcbk7-ship-it.github.io/signa/**

Open in Chrome / Edge / Safari → *Start talking* → allow the camera → show a sign.

---

## Problem

Millions of people communicate with their hands: deaf and hard-of-hearing people, non-verbal people, and people after a stroke or intubation. Most people around them don't know sign language. Something simple like *"I need help"*, *"I'm in pain"* or *"Where is the bathroom?"* can turn into a frustrating guessing game.

## Solution

Signa turns a laptop or phone into a small interpreter:

```
Camera → Hand landmarks → Our rule engine → Phrase → Text + Speech → Conversation
```

1. Open the link and press **Start talking**.
2. Allow the camera.
3. Show a sign. The hand skeleton lights up, a progress ring fills while you hold it, and the phrase appears in large text and is **spoken aloud** (Web Speech API).
4. The conversation is kept as a chat. The hearing partner can **reply by typing or by voice**, so the conversation goes both ways.
5. If the sign is not quite right, **Error Mode** says exactly what to fix (for example *"Fold your middle finger"*), and the finger to fix glows red on the video.

## Features

| | |
|---|---|
| ✋ **19 signs** | 15 static + 4 dynamic (motion) signs, full list below |
| 🧠 **Own recognition logic** | Rule-based classifier on hand features. MediaPipe gives only landmarks |
| ⚠️ **Error Mode** | Priority-based diagnosis with concrete, finger-level hints |
| ⏱ **Temporal validation** | Hold time, stability check, cooldown, "release" before the same word repeats |
| 🔊 **Voice** | Browser Text-to-Speech, a Repeat button, voice and speed selection |
| 💬 **Conversation mode** | Chat history, replay each phrase, partner reply (typed or voice) |
| 🎯 **Practice mode** | Pick a sign, get live coaching, "✓ Perfect!", auto-advance, progress *Signs learned 14 / 19* (saved locally) |
| 🌐 **EN · RU · KZ** | Interface, hints, phrases and speech in 3 languages |
| 📱 **Mobile** | Portrait layout, front camera, touch-sized controls |
| ♿ **Accessibility** | Large text, high-contrast mode, visual + sound notifications, reduced-motion support, keyboard focus |
| 🔒 **Privacy** | Video is processed locally. No backend, no accounts, no uploads |
| 🛠 **Developer overlay** | Live view of the features the rules see (finger curl, palm orientation, spread, contact…) |

## Vocabulary

A simplified, one-handed, webcam-friendly vocabulary inspired by ASL handshapes and common gestures. It is **not** a full sign language (see *Limitations*).

| Phrase | Type | How to sign |
|---|---|---|
| HELLO | dynamic | Open palm facing the camera, **wave** side to side |
| MY NAME IS | static | Index + middle together, pointing **sideways** (letter H) |
| THANK YOU | dynamic | Flat hand near the chin, **move down** |
| YES | static | Thumbs up |
| NO | static | Thumbs down |
| HELP | static | Closed fist, thumb tucked, held still |
| I LOVE YOU | static | Thumb + index + pinky out (🤟) |
| PLEASE | static | OK sign: thumb touches index, other three up |
| SORRY | dynamic | Fist drawing a **circle** |
| STOP | static | Flat palm to camera, fingers **together**, held still |
| PAIN | static | Claw: all fingers half-bent, thumb apart |
| EAT | static | All fingertips pinched onto the thumb |
| DRINK | static | Thumb + pinky out (🤙, "bottle") |
| MORE | static | V sign, fingers **apart** |
| BATHROOM | static | Only the pinky up, thumb tucked |
| HOW? | static | Index finger pointing sideways |
| WHAT? | static | W: index, middle, ring up |
| WHERE? | dynamic | Index up, **wag** left and right |
| WHEN? | static | L shape (clock hands): index up, thumb sideways |

## How the recognition works (our own logic)

MediaPipe **HandLandmarker** is used only as a sensor: it returns 21 3D points per hand. Everything after that is our code in [`src/vision/`](src/vision):

```
landmarks (21 × 2D image + 21 × 3D world)
   │
   ▼  features.js ─ interpretable hand features
   │   • finger curl 0..1 = joint-angle sum (MCP+PIP+DIP) ⊕ tip/knuckle distance ratio
   │   • reach (tip distance): separates a claw from a fist
   │   • thumb extension = distance from thumb tip to the other fingers ⊕ thumb straightness
   │   • pointing direction of the hand / each finger (up · down · side)
   │   • finger spread = fingertip gap ÷ knuckle gap
   │   • fingertip contacts (thumb ↔ index / middle …)
   │   • palm orientation = sign of the 2D cross product (wrist→index × wrist→pinky) + handedness
   │   • framing: hand size, cut off by frame edges, number of hands
   ▼  gestureRules.js ─ rule primitives: each rule → soft score 0..1 + a concrete hint + priority
   ▼  gestureClassifier.js ─ weighted match per sign; accept only if match ≥ 0.8 AND no rule < 0.45
   ▼  motion.js ─ dynamic signs: wave / wag (zig-zag stroke counting), down (vertical travel),
   │              circle (accumulated angle); everything measured in palm-lengths
   ▼  gestureEngine.js ─ temporal validation + Error Mode
       • static sign must stay accepted AND still (drift < 0.45 palm) for ~650 ms (~20 frames)
       • dynamic sign: hand shape held while the motion pattern completes
       • tracking jumps are ignored (not counted as movement)
       • 1.3 s cooldown + the same word needs the hand to change first ("release")
```

Signs are **data**, not code. [`src/data/gestures.js`](src/data/gestures.js) declares each sign:

```js
{
  id: 'more', type: 'static',
  phrase: { en: 'MORE', ru: 'ЕЩЁ', kk: 'ТАҒЫ' },
  speech: { en: 'More, please', ru: 'Ещё, пожалуйста', kk: 'Тағы, өтінемін' },
  shape: {
    fingers: { index: 'extended', middle: 'extended', ring: 'folded', pinky: 'folded' },
    pointing: { index: 'up' },
    spread: { indexMiddle: 'apart' },
  },
}
```

To add a new sign, add one object. The classifier, Error Mode hints, practice card and the icon (`HandGlyph` draws the hand from `shape`) all pick it up automatically. To add a language, add a key to `phrase/speech/howTo` and one file in `src/i18n/`.

## Error Mode (the twist)

Signa never says just *"not recognized"*. Every rule knows how to explain its own failure, and the engine reports problems **in priority order**:

| Priority | Problem | Example hint |
|---|---|---|
| 1 | No hand / two hands / cut off by frame / too far / too close | *"Show only one hand"*, *"Bring your hand closer to the camera"*, *"Raise your hand — it is cut off at the bottom"* |
| 3 | Orientation: palm, hand, finger or thumb direction | *"Turn your palm toward the camera"*, *"Point your thumb down"*, *"Turn your hand sideways"* |
| 4 | Finger configuration | *"Fold down your middle finger"*, *"Straighten your ring finger"*, *"Tuck your thumb in"* |
| 5 | Details: spread and contact | *"Spread your index and middle fingers apart"*, *"Touch your thumb to the tip of your index finger"* |
| 6 | Hold and motion | *"Hold your hand still"*, *"Hold it… 0.3s"*, *"Now wave side to side"*, *"Make the circle bigger"* |

How it decides **what** you are trying to show:

- **Practice mode**: the target sign is known, so hints are always about it. If you show a different valid sign, it also says *"That looks like YES."*
- **Conversation mode**: once the hand settles (~0.3 s), the closest sign with match ≥ 55 % is diagnosed. If the shape already fits a dynamic sign, it prompts the movement and also lists alternatives (*"Or: STOP — Keep your index finger and middle finger together"*).
- **On the video**, the finger that needs fixing is drawn **red** and pulses. Correct fingers are green. A finger checklist is shown under the hint.
- Hints are **debounced** (≈260 ms) so they don't flicker between frames.

## Tech stack

- **React 18 + Vite 6** (JavaScript)
- **MediaPipe Tasks Vision — HandLandmarker** (WASM + WebGL GPU delegate, CPU fallback), landmarks only
- **Web Speech API**: `speechSynthesis` (voice), optional `SpeechRecognition` (partner replies)
- **getUserMedia** (front camera), Canvas 2D overlay, Web Audio (UI sounds)
- Plain CSS (custom properties), no UI framework
- `node:test` unit tests (no extra dependencies)

## Architecture

```
src/
├── App.jsx                     screens (welcome → camera → app), live / practice orchestration
├── config.js                   all thresholds in one place
├── data/gestures.js            the vocabulary (declarative)
├── vision/
│   ├── handTracking.js         MediaPipe wrapper (GPU→CPU, local WASM→CDN fallback)
│   ├── landmarks.js            landmark indices + geometry helpers
│   ├── features.js             landmarks → features
│   ├── gestureRules.js         rule primitives with hints & priorities
│   ├── gestureClassifier.js    weighted matching
│   ├── gestureValidation.js    framing checks (Error Mode level 1)
│   ├── motion.js               dynamic sign detectors
│   └── gestureEngine.js        temporal validation, cooldown, diagnosis
├── speech/                     textToSpeech, speechToText, soundEffects
├── hooks/                      useRecognition (camera + loop), useLocalStorage
├── i18n/                       en / ru / kk
└── components/                 CameraView, handOverlay, GestureResult, ErrorFeedback,
                                ConversationHistory, PracticeMode, HandGlyph, Settings, …
tests/
├── recognition.test.mjs        synthetic 3D hands: all 19 signs, Error Mode hints, timing, motion
├── realHands.test.mjs          real MediaPipe landmarks (calibration regression)
└── fixtures/real-hands.json
```

The classifier and engine are plain JS with **no React or DOM dependency**, so they run in Node tests.

## Run locally

Requires Node.js 18+.

```bash
npm install
npm run dev
```

Open http://localhost:5173 and allow the camera. `npm install` also copies the MediaPipe WASM runtime into `public/mediapipe/wasm` (script `scripts/copy-mediapipe-wasm.mjs`).

To test on a phone in the same Wi-Fi, run `npm run dev` and open the "Network" URL. Note that browsers only allow the camera on **https** or localhost, so for a phone use the deployed version.

### Tests

```bash
npm test
```

50 tests: every sign is recognized and wins, 10 Error Mode scenarios produce the right hint, static hold / no repetition, all 4 motion patterns, tracking jumps are ignored, framing errors, and **real MediaPipe landmarks** (thumbs up/down, V sign, pointing up; left and right hand).

## Build

```bash
npm run build
npm run preview
```

The output is a static site in `dist/`.

## Deployment

It's a static site, so any static host works (HTTPS is required for the camera; all of these provide it).

**Vercel**: push to GitHub → *New Project* → import the repo → Deploy (`vercel.json` is included). Or from the CLI: `npx vercel --prod`.

**Netlify**: *Add new site → Import from Git* (`netlify.toml` is included), or drag-and-drop the `dist/` folder.

**GitHub Pages** (used for the live demo): `npm run deploy:pages` builds with `BASE_PATH=/<repo>/` and force-pushes `dist/` to the `gh-pages` branch (needs `gh auth login`). Enable Pages → *Deploy from branch* → `gh-pages` once.

## Privacy

- The camera stream is processed **locally in the browser** by WebAssembly/WebGL. No frame, image or landmark is sent anywhere. There is no backend.
- On first load the browser downloads the public MediaPipe model file (`hand_landmarker.task`, ~8 MB) from Google's model storage. That is a download only; nothing is uploaded.
- Settings and practice progress live in `localStorage` on your device.
- The optional **partner voice reply** (🎙 button) uses the browser's Speech Recognition. In Chrome that service sends *microphone audio* to the browser vendor. It is off unless pressed, and typing a reply works without it.

## Calibration

The first thresholds were tuned on a synthetic 3D hand. Then we recorded MediaPipe output for real photos (`tests/fixtures`) and found that real folded fingers are "less folded" than anatomy suggests (joint-bend sum 130–215°, tip/knuckle ratio 0.8–1.2). We also found that for a non-mirrored frame the handedness label matches the real hand. Thresholds were recalibrated, and those photos are now regression tests. If palm checks misbehave on some device, *Settings → Invert palm-direction check* flips the orientation rule.

## Limitations (honest)

- A **prototype vocabulary** of 19 one-handed signs, not a sign language. Real sign languages use two hands, facial expression, body location and grammar.
- Rules were calibrated on a limited set of real hands. Unusual lighting, gloves, strong motion blur or a hand seen edge-on reduce accuracy. Use *Settings → Recognition strictness* to relax or tighten.
- **PAIN (claw)** and **EAT (pinch)** are the hardest shapes for a single RGB camera, and fingertips often occlude each other.
- Dynamic signs are pattern-based (wave / wag / down / circle), not general motion recognition.
- One signer at a time. Two hands in view block recognition on purpose.
- Voice quality depends on the OS voices. If no Kazakh voice is installed, a Russian voice reads the Kazakh text.
- The camera needs HTTPS or localhost.
