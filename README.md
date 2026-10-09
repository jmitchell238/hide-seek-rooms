# Hide & Seek Rooms

Find toys hidden around cozy rooms, with sparkle hints and a celebration for each find. There's no way to fail. Made for ages 4–6.

Play at https://jmitchell238.github.io/hide-seek-rooms/. It's one of the games in [Arcade Hub](https://jmitchell238.github.io/arcade-hub/).

## Modes

| Mode | Toys per room | Rooms |
|------|---------------|-------|
| Free Play | 3 | Endless |
| Cozy Seek | 3 | 4 |
| Seeker | 4 | 6 |
| Super Seek | 5 | 8 |

## Features

- Six rooms: Bedroom, Kitchen, Living Room, Playground, Bathroom and Garden
- Drawn furniture and 12 toys to find (star, ball, teddy, duck and more)
- A sparkle trail toward a toy after about 7 seconds without a find
- A "Warm!" message when you tap close to a toy
- Mute and Calm motion settings
- Progress saved in localStorage
- Installable PWA that works offline after the first visit

## For parents

- No lives, ads, accounts or fail screens. A wrong tap never says "you lose".
- Calm motion tones the animation down.
- Turn the sound off for quiet car rides.

## Running locally

```bash
python3 -m http.server 8080
```

Then open http://localhost:8080. The service worker needs `localhost` or HTTPS.

Plain HTML, CSS and canvas with no build step.

## Tests

```bash
node tests/run.mjs
```

## Versioning

When you bump `GAME_VERSION` in `js/config.js`, set `CACHE` in `sw.js` to `'hide-seek-rooms-' + GAME_VERSION`.

## License

Personal project for the family.
