# Habit Tracker: Behaviour Insights & AI Coach

A browser-local habit workspace built with React and Vite. Track daily routines, review completion history, and calculate behaviour insights without a backend. Optional prediction requests are controlled by an AI preference that starts off.

[Published project demo](https://theunknown550.github.io/Habit-Tracker-Web-App/) · [Installation guide](INSTALLATION.md) · [Frontend implementation handoff](FRONTEND_HANDOFF.md)

The published demo may differ from the branch you run locally. The Coach is a future backend integration; a conversation feature is not implemented in this frontend.

## Features and navigation

Desktop uses a labeled sidebar; smaller screens use a modal navigation drawer. The existing state-based tabs remain in place, with Dashboard added as the daily starting point.

| Tab | Purpose |
| --- | --- |
| Dashboard | Today’s due habits, check-ins, progress, streaks, badges, and a seven-day summary. |
| Habits | Create, edit, check in, and confirm deletion of habits and their history. |
| Calendar | Browse months and select a day to inspect its eligible habits and completions. |
| Statistics | Habit totals, active habits, current streaks, monthly completion, top habits, and the last 14 days. |
| Insights | Weekly consistency, weekday completion, per-habit drop-off comparisons, and optional ranked risk predictions for tomorrow. |
| Data | Export JSON backups, validate and confirm import, or confirm clearing local habit data. |
| Settings | Control AI sharing, manage backups, and explicitly load synthetic demo history. |

Habit opportunities respect creation dates and imported weekday schedules. Charts exclude future dates and show eligible opportunities as their denominator. Insights includes accessible data tables and a working 4/8/12-calendar-week selector. The current week ends today. Drop-off comparisons use two fixed 14-day windows and show an insufficient-history state when a comparison is not supported.

## Stack

- React 19 and JavaScript, using the existing state and tab-navigation approach.
- Vite 7 and npm, with `package-lock.json` retained.
- Tailwind CSS 4 and shared semantic CSS tokens.
- Recharts 3.11 for analytical charts.
- Lucide React icons and locally bundled IBM Plex Sans, with a system-font fallback.
- Vitest and jsdom for calculation, request-layer, hook, and interaction tests.
- Browser `localStorage` as the source of truth. No database or backend is required for local features.

## Local development

Use Node.js **22.22.2 or newer** with npm. The installed test environment reports an engine warning on the development host’s Node 22.22.1; tests still ran there.

```bash
npm ci
npm run dev
```

Open the Vite URL printed in the terminal, normally `http://localhost:5173/Habit-Tracker-Web-App/`.

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start Vite development server. |
| `npm run lint` | Run ESLint. |
| `npm test` | Run Vitest once. |
| `npm run build` | Build static assets into `dist/`. |
| `npm run preview` | Serve the production build locally. |

See [INSTALLATION.md](INSTALLATION.md) for the contributed installation and deployment guide. Use the Node version and npm workflow above for the current dependency set.

## Optional AI configuration and privacy

Copy the public URL setting from [.env.example](.env.example) into `.env.local`:

```dotenv
VITE_API_BASE_URL=http://localhost:8000
```

Restart Vite after changing it. Enable **AI predictions** in Settings only when you want requests sent to that backend. `VITE_` variables are public client configuration: never put database credentials, Gemini keys, or other secrets there.

When enabled, the frontend sends `POST /predict` with the habit ID, local creation date, today’s local date, and recorded completion dates. Habit names and descriptions are not included. Valid backend probabilities, levels, and reasons are displayed for the chance of missing **tomorrow**. No frontend probability thresholds or fake predictions are used.

AI starts **off** and its preference persists separately from habit data. With AI off, the shared request layer blocks AI calls, queued work, and retries; no automatic health probe runs. Turning AI off aborts in-flight work where possible and ignores late results. It cannot recall information already transmitted.

Missing configuration, timeouts, invalid responses, and a backend outage produce explicit unavailable states and a retry action when enabled. Check-ins, calendar, statistics, local charts, and backups remain usable. A FastAPI implementation and live contract verification are not included in this repository; see the [handoff](FRONTEND_HANDOFF.md) for questions for the backend owner.

## Local data and demo history

The original storage keys remain `habits`, `completions`, and `aiEnabled`. Completion history is an object keyed by habit ID, with local `YYYY-MM-DD` date arrays. Data is scoped to this browser and origin; export a JSON backup before clearing browser storage or switching origins.

**Load demo data** in Settings creates six explicitly synthetic habits with deterministic 84-day history. It is never loaded automatically. Existing data is replaced only after confirmation. Import and clear actions also require confirmation; all preserve the separate AI preference. Export remains available before replacement.

Core features need no backend or API connection after the app has loaded. The project does not include a service worker for offline launch or reload; its static assets still need to be available.

## Project structure

```text
src/
├── App.jsx                    # Shared shell, tabs, local state, data replacement
├── components/                # Habit UI, dialogs, reports, calendar, settings
├── hooks/
│   ├── useLocalStorage.js     # Original keys, functional updates, save feedback
│   ├── useLocalDate.js        # Local midnight/focus date refresh
│   └── usePredictions.js      # Cancellation, concurrency, snapshot invalidation
├── services/predictionApi.js  # Shared opt-in gate, timeout, response validation
├── utils/insights.js          # Pure local-date, eligibility, reporting, risk helpers
├── utils/statistics.js        # Existing statistics using eligible opportunities
├── data/demoData.js           # Synthetic frontend demo fixture
├── data/backup.js             # JSON backup validation
└── index.css                  # Shared design tokens and responsive shell
```

Tests sit beside their components, hooks, services, and helpers. See [FRONTEND_HANDOFF.md](FRONTEND_HANDOFF.md) for file responsibilities, requirement mapping, verification evidence, and a short demo sequence.

## Deployment

The existing [GitHub Pages workflow](.github/workflows/deploy.yml) builds with `npm ci` and `npm run build`, then uploads `dist/`. It runs on pushes to `main` and through a manual workflow dispatch.

To configure a fork, open repository **Settings → Pages** and choose **GitHub Actions** as the source. To run an approved deployment manually, open **Actions → Deploy to GitHub Pages → Run workflow**. Follow its status in Actions. See [INSTALLATION.md](INSTALLATION.md#deploying-to-github-pages) for additional deployment instructions.

Vite retains the `/Habit-Tracker-Web-App/` base path. Adjust that existing configuration only when intentionally changing the hosting path. A deployed AI backend needs HTTPS and CORS permission for the frontend origin; configure the public build-time API URL in the deployment environment if predictions are wanted.

## Contributing

Preserve the existing JavaScript, npm, tab navigation, and browser-local storage model. Keep backend, model, database, and training-data work with the backend owner. Run lint, tests, and a production build for changes; review your branch and diff before committing or publishing.

Useful future work includes backend schema agreement, a verified Coach contract, optional schedule editing, and offline launch support. The current frontend does not claim backend model validation or evaluation.

## License and references

The project uses the [MIT License](LICENSE). The redesign uses original application code; reference implementations were inspected for layout and interaction guidance without copying their source or adding a second chart framework.

- [React](https://react.dev/), [Vite](https://vite.dev/), and [Tailwind CSS](https://tailwindcss.com/).
- [shadcn/ui source](https://github.com/shadcn-ui/ui), [Vite installation guidance](https://ui.shadcn.com/docs/installation/vite), and [dashboard blocks](https://ui.shadcn.com/blocks/dashboard).
- [Radix Dialog behavior](https://www.radix-ui.com/primitives/docs/components/dialog).
- [Tremor source](https://github.com/tremorlabs/tremor) as an analytics presentation reference.
- [Recharts 3 API](https://recharts.github.io/en-US/api/) and [Lucide React](https://lucide.dev/guide/react).

Bundled font and icon license notices are included in [public/licenses](public/licenses/) and in production builds. UI references and implementation notes are listed in [FRONTEND_HANDOFF.md](FRONTEND_HANDOFF.md).
