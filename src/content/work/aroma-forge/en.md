---
title: Aroma Forge
subtitle: A fragrance builder where every perfume note becomes a planet
year: 2026
order: 1
role: Interface concept, 3D scene, front end
stack: [Three.js, GLSL, Vite, Playwright]
cover: /work/aroma-forge/poster.webp
coverAlt: The Sun and three rings of note planets in Aroma Forge
video:
  mp4: /work/aroma-forge/preview.mp4
  webm: /work/aroma-forge/preview.webm
  poster: /work/aroma-forge/poster.webp
media:
  - src: /work/aroma-forge/desktop-start.webp
    alt: Start screen with the Sun, three orbits and the "Your fragrance" panel
    caption: Start screen. Three rings around the Sun for top, heart and base notes.
  - src: /work/aroma-forge/planet-rose.webp
    alt: The Rose planet up close with its note card
    caption: Tap a planet and the camera flies in while the note card opens.
  - src: /work/aroma-forge/results.webp
    alt: The "Similar fragrances" window with match percentages
    caption: Similar fragrances matched against the chosen notes, with a match percentage.
  - src: /work/aroma-forge/side.webp
    alt: The system seen almost edge-on
    caption: Edge-on view with the asteroid belt, tier labels and the Sun's glow.
  - src: /work/aroma-forge/mobile-start.webp
    alt: Start screen on a phone
    caption: The same scene on a phone, with a tab bar and the fragrance panel above it.
    portrait: true
  - src: /work/aroma-forge/mobile-planet-rose.webp
    alt: A note card on a phone
    caption: A note card on a phone.
    portrait: true
---

## The task

Build the main screen of a fragrance builder. The user composes a perfume from notes, and it had to feel like an object you want to touch. It also had to open on a phone and stay smooth.

## What I did

- Every note became a planet. Three orbits around the Sun for top, heart and base notes. A planet can be tapped, dragged to another ring or removed.
- Each planet's surface is baked once into a texture from a real map, noise and the note's colour. After that it is a plain sphere, which a phone renders easily.
- While the loading screen is still up, the scene measures the GPU and picks a quality tier: pixel density and anti-aliasing. If frames start dropping, it lowers the tier by itself.
- The Sun's glow is a custom five-level bloom pass. Gestures: tap, hold to drag, pinch, double tap to reset the camera.
- Similar fragrances are matched against the chosen notes, with a match percentage and a hint about which note to swap for a closer match.

## Result

The demo runs smoothly on a phone and on a laptop without a discrete GPU. All the controls fit on one screen, and composing a fragrance and finding similar ones takes about a minute.
