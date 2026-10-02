# RuckOn Fitness brand assets

- `ruckon-logo-original.png` — the original logo file (2172 × 724, transparent). Do not edit; regenerate the others from it.
- `ruckon-logo.png` — full logo, trimmed, for light backgrounds (1200 px wide).
- `ruckon-logo-on-dark.png` — full logo for dark backgrounds: black parts recolored white, yellow unchanged.
- `ruckon-emblem.png` / `ruckon-emblem-on-dark.png` — the rucksack emblem only, no text (512 × 512, transparent).
- `ruckon-icon-512.png` — the emblem on a white rounded tile, the source look for app icons.

App icons live in `app/` so Next.js adds the head tags: `favicon.ico` (16, 32, 48), `icon.png` (192), and
`apple-icon.png` (180, square white background). The 16–48 px favicons are box-downsampled with a small contrast
boost so the two chevrons stay separate at tab size.
