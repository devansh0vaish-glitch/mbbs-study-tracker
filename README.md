# MBBS Study Tracker V36

A single-package upgrade of the V35 tracker. V36 keeps the existing 19-subject syllabus, topic completion, daily goal/backlog logic, revision ratings, history, administrator syllabus editor, email/password authentication, and existing Supabase JSON state model. New V36 fields are added to the same per-user `user_tracker_data.data` JSON document (schema version 2); no new database tables are required for the included local-first modules.

## What's new

- IsotopeAI-inspired responsive dashboard styling, default Overview landing page, dark sidebar, mobile navigation, light/dark/system theme.
- Smart daily and seven-day planner using topic durations, a topic cap, subject priority and due revisions. Generated tasks are suggestions and do not complete syllabus topics. Revision tasks include Forgot / Good / Easy actions that update the revision schedule.
- Pomodoro, stopwatch and custom focus timer with topic-linked study-session history.
- Topic Hub with topic notes, importance, resource links, favourites and search.
- Study analytics, six-month heatmap, subject progress, weekly trends, plan completion and weekly review.
- Examination countdowns and a transparent estimated readiness indicator.
- Mock-test score history, score trends, topic-linked mistakes and add-to-revision actions.
- Built-in offline study-planning assistant; optional authenticated OpenAI-powered assistant through a Supabase Edge Function.
- Quick Capture inbox, weekly goals, data export, PWA manifest and service-worker application-shell caching.

## Files

The ZIP is intended to be extracted into the root of the existing GitHub Pages repository. It contains the existing application files plus `v36.js`, `v36.css`, the updated `sw.js` and `manifest.json`, the optional Supabase function, icons and the existing GitHub workflow. Do not upload the ZIP file itself as the website source.

## Deploy to the existing GitHub Pages repository

1. Download and extract this ZIP.
2. Back up the current repository files and your Supabase data before replacing anything.
3. Copy the extracted root files/folders into the repository root, replacing matching files. Keep any unrelated repository files and workflows.
4. Commit and push to the same branch/folder currently used by GitHub Pages.
5. Open the site, sign in and check Cloud status. After deployment, do a hard refresh. On iPhone/iPad, close the installed web app and reopen it; if an old shell remains cached, remove the Home Screen shortcut and add it again after the site refreshes.

Existing Supabase project configuration and email/password authentication are retained in `app.js`. Do not replace the publishable key with a service-role key. The old user data table must continue to have its existing per-user RLS policies.

## Data and offline behavior

- V36 adds its new fields to the existing per-user JSON object and preserves legacy fields. Existing topic IDs are retained.
- `schema_version` is written as `2` on cloud upsert. The application does not run a SQL migration automatically.
- Local saves happen first. If the browser is offline, changes remain in that browser's local storage. When the app reconnects, it asks before choosing between this device's pending local changes and a newer cloud copy. Review the prompt carefully; choose the device copy only when it contains the edits you want to preserve.
- Offline use is limited to a device/browser that has previously signed in and cached the application. Offline edits are not guaranteed to merge automatically with simultaneous edits from another device. Export a backup before major changes.
- The PWA shell is cached; push notifications/background reminders and reliable cross-device offline conflict merging are not included in this build.

## Optional live AI assistant (one-time setup)

The Study Assistant works in built-in local mode without an API key. To enable live AI, deploy the included function and set your own OpenAI API key as a **Supabase Function secret**. Never place that key in `app.js`, `index.html`, or any public repository file.

Using the Supabase CLI from the extracted project folder:

```bash
supabase functions deploy study-assistant --project-ref rnjmgtttujzfjonvnaae
supabase secrets set OPENAI_API_KEY=YOUR_OPENAI_API_KEY OPENAI_MODEL=gpt-6-luna --project-ref rnjmgtttujzfjonvnaae
```

The function uses the OpenAI Responses API and the `gpt-6-luna` model by default. API usage is billed to the OpenAI API account associated with the key. You can change `OPENAI_MODEL` to another model available to your API account. After deployment, sign in to the tracker and test the Assistant page. If the function is not deployed or the secret is missing, the built-in local planner remains available.

## Important behavior and limitations

- The readiness percentage is a planning estimate (40% syllabus coverage, 30% revision coverage, 20% mastery ratings and 10% test performance); it is not a prediction of exam results. When no tests exist, the assessment component uses a neutral baseline.
- The smart planner respects available minutes and its topic cap, prioritises an explicitly selected subject, subjects attached to the nearest exam within 30 days, unresolved mistake-linked topics and due revisions. It is a planning suggestion. It does not infer an exact topic-level backlog from the legacy backlog counter because V35 stores backlog as a count rather than a list of named topics.
- Topic notes, assessments, sessions, exams, plans and preferences sync through the existing JSON user row.
- AI suggestions never modify tracker data automatically. When live AI is enabled, your prompt and a limited summary of study progress, due revisions and upcoming examination dates are sent to the AI provider through your authenticated Supabase function; do not enter sensitive personal information.
- The website has no push-notification scheduler. Use the in-app planner and revision views for due work.

## Validation performed for this package

- JavaScript syntax checks: `app.js`, `v36.js`, `sw.js`.
- JSON validation: `manifest.json`.
- Syllabus structure and internal file references checked.
- ZIP integrity checked before delivery.
- A full live browser session against your Supabase project was not available during packaging; sign-in, cloud sync, Edge Function deployment and actual iOS installation must be verified after you deploy it.
