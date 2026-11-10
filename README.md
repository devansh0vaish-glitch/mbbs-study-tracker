# MBBS Study Tracker V36 — AI, navigation and stability update

This is a complete replacement build based on the supplied V36 project. Existing tracker storage, Supabase authentication/cloud sync, syllabus and PWA structure are retained.

## What changed

### AI conversation context
- Sends every message in the active conversation, in chronological order, including the latest user message.
- No longer slices the conversation to the last 16 turns or deletes older messages after 60 turns.
- Sends the current tracker state alongside the conversation: complete topic catalogue, completion states, daily goal, weekly goals, planner settings and saved planner tasks.
- The full transcript remains saved locally/cloud-side, while only the latest 14 messages (with per-message length limits) are sent to the model.
- Topic identifiers are retained in a compact catalogue to reduce request size.
- The Edge Function falls back to Flash-Lite on primary-model 429, 503 or timeout errors; 503 receives one short retry. Individual model attempts are capped at 14 seconds.
- Assistant chats are counted as meaningful local data during cloud conflict checks, preventing chat-only local history from being overwritten on sign-in.

### Tracker actions (confirmation required)
The assistant can propose:
- Complete or reopen an exact syllabus topic.
- Complete a set of topics (up to 30 per proposal).
- Set today's new-topic goal.
- Update weekly study-minute and topic goals.
- Add or remove planner tasks.
- Change planner capacity, daily new-topic limit and priority subject.

The frontend validates identifiers, date ranges, limits and action types against the current tracker state. The user must confirm each proposal. The model cannot directly execute JavaScript or write to the database.

### Provider-independent AI architecture
`ai-provider.js` is the provider adapter. The chat UI calls the same `complete()` interface regardless of the selected model.

Default configuration:
```js
window.MBBS_AI_CONFIG = {
  provider: 'supabase-gemini',
  endpoint: '',
  sendTrackerContext: true,
  timeoutMs: 60000
};
```

Supported built-in modes:
- `supabase-gemini` — current authenticated Supabase Edge Function and Gemini provider.
- `private-endpoint` — a privately hosted endpoint that accepts `{ message, context }` and returns `{ reply, actions, model, provider }`. The app sends the signed-in user's Supabase access token as a Bearer token when available. Your server must validate it and enforce user-level authorization.
- `offline` — reserved for a local model adapter. Register the adapter using `MBBS_AI_PROVIDERS.register('offline', { complete: async ({message, context, config}) => ({reply, actions: [], model: 'Local model'}) })`.

To add another provider, register an adapter in `ai-provider.js` or a separately loaded script. It must implement `complete({message, context, config})` and return the same response shape. Keep provider secrets on the server; never put private API keys in browser files.

### Layout and page persistence
- The application brand header stays pinned at the top while scrolling.
- The Today summary, progress metrics and cloud controls appear only on Overview.
- Navigation is now outside the main page container and fixed as an independent scroll region on desktop/tablet.
- Main content no longer controls the sidebar's position or scroll.
- Mobile retains the bottom navigation rail.
- The last selected page is saved locally and restored after reload, returning to the site, or authentication/cloud initialization. Overview is used only on first visit or if the saved page no longer exists.
- Service worker cache version bumped to force updated assets to load.

## Deploy

1. Back up your current repository and export tracker data before replacing files.
2. Replace the repository contents with this ZIP, preserving your GitHub Pages repository settings.
3. Deploy the Edge Function source at `supabase/functions/study-assistant/index.ts` to the existing Supabase project:
   ```bash
   supabase functions deploy study-assistant --project-ref rnjmgtttujzfjonvnaae
   ```
4. Ensure `GEMINI_API_KEY` is configured in Supabase Function Secrets. Do not add it to `ai-provider.js` or any browser code.
5. Keep JWT verification enabled for the `study-assistant` function.
6. Commit and push the replacement files. Open the site and perform a hard refresh / remove the installed PWA and re-add it if an old shell persists.

## Important test status
- JavaScript syntax checks and ZIP integrity checks pass.
- The changes have not been deployed to GitHub Pages or Supabase from this environment.
- JavaScript syntax and ZIP integrity are checked, but a live Gemini request, private endpoint, offline model, browser/iPad layout and real cloud sync have not been end-to-end tested. Test with a backup account or exported data first.


## On-device AI (zero AI hosting cost)

The Study Assistant now uses WebLLM in the browser with WebGPU. A user chooses and downloads a supported model from the assistant sidebar; the model weights are cached by the browser on that device and inference runs locally. No AI provider API key or GPU server is required. The first model download requires internet; subsequent inference can work offline after the app shell, runtime and model assets are cached.

### Device compatibility and limitations

- Requires a secure HTTPS origin and a browser/device exposing WebGPU (recent Chrome/Edge and recent Safari releases; actual support varies by OS version and hardware).
- The app discovers the small Qwen2 model variants available in the pinned WebLLM build and offers those that are present. Small models are a compromise: they are not equivalent to a large cloud model for complex MBBS reasoning.
- Model downloads can be large and need free storage. Browser storage may be cleared or evicted by the operating system; the model may then need to be downloaded again.
- If WebGPU is unavailable, the local model cannot run in that browser. No automatic cloud fallback is used.
- Inference prompts and tracker context are processed in the browser. Existing tracker account sync may still sync saved chat history to Supabase.
- AI-proposed tracker changes continue to pass the existing action validation and explicit Review & apply confirmation flow.

The legacy `study-assistant` Edge Function is retained as a migration stub and returns HTTP 410; it no longer calls Gemini or another hosted model. Remove any unused `GEMINI_API_KEY` secret from Supabase Function secrets manually if it remains configured.
