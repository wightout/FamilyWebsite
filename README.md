# Velvet Runway — The Enriquez Family

Aviation-themed family website featuring live weather data, a photo gallery, flight logbook, and family events.

## Tech Stack

- **HTML5** — semantic markup, no frameworks
- **CSS3** — custom styles (`styles.css`)
- **JavaScript (ES6+)** — vanilla JS, no libraries or build tools

## Features

- **Live METAR/TAF weather** — real-time aviation weather fetched from NOAA
- **Sunrise/sunset** — daily solar times for the home airport
- **Winds aloft** — upper-level wind data for flight planning
- **Photo gallery** — auto-sorted by image modification time
- **Flight logbook** — family flight history
- **Events** — upcoming family and aviation events

## Running Locally

No build step required. Open `index.html` directly in a browser:

```
open index.html
```

Or serve it with any static file server (e.g., `npx serve .`).

## Deployment

The site is deployed to **GitHub Pages** via automated CI/CD with GitHub Actions.

## Automation (GitHub Actions)

| Script | Schedule | Purpose |
|---|---|---|
| `scripts/update-aviation.js` | Every 30 min | Fetches METAR/TAF data from NOAA and writes to `data/` |
| `scripts/update-gallery.js` | On push | Sorts gallery images by modification time |

Run scripts manually with npm:

```bash
npm run update-aviation
npm run update-gallery
```

## License

MIT
