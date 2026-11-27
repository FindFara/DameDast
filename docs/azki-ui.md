# Azki UI branch

The `azki` branch starts at `fara` commit `8c64a0216f14213dc7b26273626e7489d8e1608e`.
Reference: https://www.azki.com/ (visually inspected 2026-11-27).

- Blue-and-white default, fine borders, rounded cards, a desktop navigation bar and service tiles follow the reference's component language. DameDast branding and product content remain its own.
- `azki.css` is the shared presentation layer for dashboard, accounts, transactions, notes, learning, language, exercise, calendar, notifications, settings, dialogs and pickers.
- `azki-ui.js` renders the header and real-route dashboard shortcuts. `azki-shell.js` manages native disclosure menus with keyboard/outside-click dismissal.
- The first-paint appearance script and application theme code share the `azki-blue` palette. This branch uses `damdast-azki-theme`, retaining the original `damdast-theme` selection. Other palettes remain selectable.
- Existing data models, account isolation, background synchronization and API endpoints are retained. This change introduces no runtime packages or third-party asset requests.
- The standalone Sites preview hosts the static frontend. ASP.NET Core, PostgreSQL and Google server authentication require the existing application server.

Validation: 219 JavaScript tests; desktop and 320px/390px browser checks; account forms, notifications, real navigation and mobile creation controls.
