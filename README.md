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
- Automatically refreshed local study intelligence using current syllabus progress, revision queue, weak subjects, assessments, focus sessions, weekly goals and upcoming exams.
- Optional authenticated Google Gemini free-tier assistant for advanced study plans, progress reports, MCQ/flashcard generation and viva practice. No paid-provider fallback.
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

## Optional free live AI assistant (one-time setup)

The local study intelligence works without an API key and refreshes automatically whenever the Assistant page opens, the app regains focus, or tracker data is refreshed/imported/synchronised. It is rule-based rather than a trained language model. It analyses the latest local tracker state and remains available offline.

For advanced text generation, the included authenticated Supabase Edge Function uses the Google Gemini Developer API free tier (`gemini-2.5-flash` by default). Google changes model availability and free-tier quotas; check the current official pricing/limits before enabling it. Free-tier prompts may be used by Google to improve its products, so do not send sensitive personal information. The app does not switch to a paid model or provider when the free quota is exhausted.

1. Create an API key in [Google AI Studio](https://aistudio.google.com/app/apikey).
2. In Supabase Dashboard, open your project → Edge Functions → Secrets.
3. Add `GEMINI_API_KEY` with your key. Optionally add `GEMINI_MODEL` with `gemini-2.5-flash`.
4. Deploy the included `supabase/functions/study-assistant/index.ts` as the function named `study-assistant`.
5. Sign in to the tracker and test the Assistant page. If the function is not deployed, the key is missing, or the free quota is exhausted, the local assistant continues to work.

The API key must only be stored as a Supabase Function secret. Never place it in `app.js`, `index.html`, `v36.js`, or any public repository file. Supabase injects the secret into the server-side Edge Function at runtime. No OpenAI API key or paid subscription is required for this configuration.


## Important behavior and limitations

- The readiness percentage is a planning estimate (40% syllabus coverage, 30% revision coverage, 20% mastery ratings and 10% test performance); it is not a prediction of exam results. When no tests exist, the assessment component uses a neutral baseline.
- The smart planner respects available minutes and its topic cap, prioritises an explicitly selected subject, subjects attached to the nearest exam within 30 days, unresolved mistake-linked topics and due revisions. It is a planning suggestion. It does not infer an exact topic-level backlog from the legacy backlog counter because V35 stores backlog as a count rather than a list of named topics.
- Topic notes, assessments, sessions, exams, plans and preferences sync through the existing JSON user row.
- AI suggestions never modify tracker data automatically. When live AI is enabled, your prompt and a limited summary of study progress, due revisions and upcoming examination dates are sent to the AI provider through your authenticated Supabase function; do not enter sensitive personal information.
- Local intelligence is deterministic and does not train itself. Its recommendations update automatically from current tracker data; improvements to the underlying algorithms arrive through software updates.
- The website has no push-notification scheduler. Use the in-app planner and revision views for due work.

## Validation performed for this package

- JavaScript syntax checks: `app.js`, `v36.js`, `sw.js`.
- JSON validation: `manifest.json`.
- Syllabus structure and internal file references checked.
- ZIP integrity checked before delivery.
- A full live browser session against your Supabase project was not available during packaging; sign-in, cloud sync, Edge Function deployment and actual iOS installation must be verified after you deploy it.
