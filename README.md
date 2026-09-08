# Take Care

A smart diet tracking assistant powered by Gemini. Log meals in plain language, get nutritional breakdowns, track weight goals, and get coaching based on what you actually logged.

Runs as an installable PWA with offline support. All of your data stays in your browser.

## Features

- **Natural language meal logging.** Type what you ate. Gemini parses it into calories and macros, and asks for clarification when an entry is ambiguous.
- **AI-generated macro targets.** Targets are derived from your profile, with the Mifflin-St Jeor equation as a fallback.
- **Weight tracking** with trend charts and logging streaks.
- **Mood and wellbeing logging** with daily grading.
- **Coach chat** that answers questions against your own logged history.
- **Daily insights** and the ability to review any past date.
- **Installable PWA** with a service worker for offline use.
- **Import and export** your data as JSON, plus CSV export.

## Tech stack

React 19, TypeScript, Vite 6, React Router, Recharts, Tailwind (via CDN), and `@google/genai` against `gemini-3-flash-preview`.

Dependencies are loaded through an import map in `index.html` rather than bundled.

## Run locally

Prerequisites: Node.js

1. Install dependencies:

```bash
npm install
```

2. Create a `.env.local` file in the project root:

```
GEMINI_API_KEY=your-key-here
```

Get a key from [Google AI Studio](https://aistudio.google.com/apikey).

3. Start the dev server:

```bash
npm run dev
```

The app runs at `http://localhost:3000`.

## Configuration

| Variable | Required | Purpose |
| --- | --- | --- |
| `GEMINI_API_KEY` | Yes | Gemini access for meal parsing, coaching, and plan generation. Without it, the AI features return errors and the rest of the app still works. |
| `GA_MEASUREMENT_ID` | No | Google Analytics 4 measurement ID. Analytics is skipped entirely when unset, which is the default. |

Both belong in `.env.local`, which is gitignored.

## Security note on the API key

`vite.config.ts` uses Vite's `define` to inline `GEMINI_API_KEY` into the client bundle at build time. Vite's `define` is a compile-time string substitution, so the key ends up as a literal in the shipped JavaScript.

**Anyone who loads a deployed build can read the key out of the bundle and spend against your quota.** That is acceptable for local development. It is not safe for a public deployment.

If you deploy this, move the Gemini calls behind a server-side proxy that holds the key and have the client call your proxy instead.

## Data and privacy

Profile, meal, weight, and mood data is stored in browser local storage under the key `nutriflow_state`. There is no backend and no account. Clearing site data deletes everything, so use the JSON export in Settings if you want a backup.

The only data that leaves the browser is the meal and coaching text sent to the Gemini API for processing, plus page views and events if you configure `GA_MEASUREMENT_ID`.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Dev server on port 3000 |
| `npm run build` | Production build |
| `npm run preview` | Serve the production build locally |

## Disclaimer

This is a personal project, not a medical device. Nutritional estimates come from a language model and will sometimes be wrong. Do not use it to make medical decisions.
