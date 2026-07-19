# Hide & Seek Rooms

Find hidden toys in cozy rooms — sparkle hints, celebrations, **zero fail.** Built for ages **4–6**.

**Play:** https://jmitchell238.github.io/hide-seek-rooms/

Part of [Arcade Hub](https://jmitchell238.github.io/arcade-hub/).

---

## Modes

| Mode | Toys | Rooms |
|------|------|-------|
| **Free Play** | 3 | Endless |
| **Cozy Seek** | 3 | 4 |
| **Seeker** | 4 | 6 |
| **Super Seek** | 5 | 8 |

## Features

- Six rooms: Bedroom, Kitchen, Living Room, Playground, Bathroom, Garden
- Canvas-drawn furniture + 12 cute toys (star, ball, teddy, duck, …)
- Soft sparkle trail after ~7s idle (Maze Adventure helper pattern)
- “Warm!” nudge when you tap near a toy
- Sound mute + reduced motion
- Progress in `localStorage`
- Installable PWA (offline after first visit)

## Stack

Static HTML / CSS / Canvas. No build step.

## Versioning

- `GAME_VERSION` in `js/config.js`
- Keep `CACHE` in `sw.js` in sync: `'hide-seek-rooms-' + GAME_VERSION`

## Local preview

```bash
python3 -m http.server 8080
```

## Parents

- No lives, ads, accounts, or fail screens
- Wrong taps are soft — never “you lose”
- **Calm motion** for sensitive kids
- **Sound off** for quiet car rides

## License

Personal project for family Arcade Hub.
