# MBBS Study Tracker V36 — Assistant upgrade

This package retains the existing tracker and adds the agreed Assistant improvements.

## Assistant changes
- Separate conversations with persistent history.
- New chat, rename chat, delete chat.
- Legacy flat assistant history is migrated into one conversation.
- Only the active conversation's recent messages are sent to Gemini.
- Gemini 3.8 Flash primary, Gemini Flash-Lite fallback; no paid-provider fallback.
- Safe, basic Markdown rendering for AI messages.
- AI can propose whitelisted tracker actions: complete selected topics, add planner tasks, or update planner settings.
- Every proposed tracker change requires an explicit in-app confirmation.
- Local rule-based recommendation is used only when live Gemini is unavailable.

## Data preservation
- Existing 19-subject syllabus, topic IDs, completion state, daily goals/backlog, revision history, account authentication, and Supabase JSON sync are retained.
- New chat data is stored in the existing per-user `user_tracker_data.data` JSON document; no SQL migration is required.
- The core exposes only a narrow topic-completion method to the Assistant. It does not permit arbitrary SQL, JavaScript, or direct database writes.
- Existing `assistantHistory` is preserved and migrated to the new conversation format when no chat threads exist.

## Files changed
- `v36.js`: Assistant chat interface, chat persistence, safe response rendering, action validation and confirmation.
- `v36.css`: responsive chat layout and message/action styling.
- `app.js`: narrow core methods for safe topic completion and tracker refresh.
- `sw.js`: cache version bump.
- `supabase/functions/study-assistant/index.ts`: authenticated Gemini request, model fallback and structured action proposals.

## Deploy
1. Back up the current repository and export your tracker data.
2. Extract this ZIP and copy its root contents over the repository root, replacing matching files.
3. Commit and push to the same GitHub Pages branch.
4. Deploy `supabase/functions/study-assistant/index.ts` to your existing Supabase project as `study-assistant` with JWT verification enabled.
5. Keep `GEMINI_API_KEY` only in Supabase Edge Function secrets. Do not put it in browser files.
6. Hard-refresh the website. On iOS/iPadOS, close and reopen the installed PWA after deployment.

## Important
- The Edge Function uses the Gemini Interactions API and the configured model order. Confirm both model IDs are available to your Google AI Studio API key and free-tier quota in your region before deploying. No paid fallback is included.
- The AI's proposed changes are validated again in the browser against current topic IDs and limits before the user can apply them.
- Bulk topic completion and planner changes require confirmation. Review the proposal carefully before accepting.
- Offline model downloads are intentionally not included; the offline model remains deferred. If Gemini is unavailable, the existing local rule-based assistant provides a fallback.
- A live browser sign-in/cloud-sync test was not possible during packaging. Run a backup/export and verify sign-in, sync and AI function deployment after publishing.
