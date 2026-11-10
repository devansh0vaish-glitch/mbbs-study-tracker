# MBBS Study Tracker V36 — Cross-device AI upgrade

This is a complete replacement build based on the supplied V36 project. Existing tracker storage, Supabase authentication/cloud sync, syllabus, PWA structure and confirm-before-apply tracker actions are retained.

## AI provider modes

The Study Assistant offers three modes in its sidebar:

- **Local only** (default): all inference runs in the current browser. Prompts and tracker context are not sent to an AI provider. Requires HTTPS and a usable WebGPU adapter.
- **Local first · cloud fallback**: use a loaded local model first. If local inference fails or is unavailable, the app can use Gemini through the secured Supabase Edge Function. This mode requires the separate cloud-consent checkbox.
- **Cloud AI**: send requests directly to Gemini through the secured Supabase Edge Function. This requires a signed-in user and a server-side `GEMINI_API_KEY` secret.

Cloud consent is off by default and is stored per browser/device. The UI explains that cloud mode sends the user's prompt and compact tracker context to Google. The user can revoke consent at any time. Gemini requests use `store:false`. API credentials are never included in frontend files. Provider usage may incur charges or be subject to quotas.

## Local model catalogue

The app reads `prebuiltAppConfig.model_list` from the pinned WebLLM `0.2.87` runtime and only offers exact model IDs present in that catalogue:

- Qwen3.5 0.8B — lightweight option for phones and lower-memory devices.
- Qwen3.5 2B — balanced default for capable tablets and laptops.
- Qwen3.5 4B — advanced option; may fail on mobile Safari due to memory limits.
- Gemma 4 E2B and Phi-4 Mini — alternatives where the browser exposes required WebGPU features and the runtime catalogue includes them.
- Llama 3.2 1B — compatibility fallback.

The current prebuilt model records specify a 4,096-token context window. The app does not falsely raise the model's native context limit. It reserves response space and enforces a conservative input budget. Browser APIs do not reliably expose total free RAM, so compatibility detection is only an estimate; successful model initialization is the final test.

## Context and conversation management

- The complete chat transcript remains saved in tracker storage.
- Requests send a bounded recent message window plus a small extractive digest of older messages.
- The topic catalogue is included only when the current question is relevant to topics, completion, revision or planning, and is capped.
- Planner history is shortened for ordinary questions and expanded only for planner-related questions.
- The local adapter enforces an input budget and reserves output tokens.
- The Supabase Edge Function applies a second context-size cap before calling Gemini.

## Download and compatibility UX

- Displays a visible model-loading progress bar and percentage when WebLLM provides progress data.
- Shows runtime, catalogue, HTTPS and WebGPU errors instead of silently failing.
- Disables the download button while model initialization is running.
- Retains browser-cached model weights for subsequent sessions where browser storage allows it.

## Tracker actions

The assistant may propose:
- Complete or reopen an exact syllabus topic.
- Complete a set of topics (up to 30 per proposal).
- Set today's new-topic goal.
- Update weekly study-minute and topic goals.
- Add or remove planner tasks.
- Change planner capacity, daily new-topic limit and priority subject.

The frontend validates identifiers, date ranges, limits and action types against current tracker state. The user must explicitly confirm each proposal. Models cannot directly execute JavaScript or write to the database.

## Supabase cloud provider

The `study-assistant` Edge Function is deployed to project `rnjmgtttujzfjonvnaae`, with JWT verification enabled. It uses Gemini 3.8 Flash and falls back to Gemini 3.5 Flash-Lite on transient failures/rate limits. It authenticates the Supabase user, uses `store:false`, applies request-size limits and returns structured proposals only.

Ensure `GEMINI_API_KEY` exists under Supabase Dashboard → Edge Functions → Secrets. If missing, add it there. Do not put it in `ai-provider.js`, `app.js`, or any other browser file. If the key is missing, local-only mode continues to work; cloud modes return a clear configuration error.

## Deployment

1. Export/backup tracker data and keep a copy of the current repository.
2. Replace the GitHub Pages repository files with this ZIP and commit/push them to the existing repository. Preserve GitHub Pages settings.
3. The Edge Function is already deployed by this upgrade; redeploy only if its source changes:
   ```bash
   supabase functions deploy study-assistant --project-ref rnjmgtttujzfjonvnaae
   ```
4. Keep JWT verification enabled for `study-assistant`.
5. Hard-refresh the site. For an installed PWA, close it and reopen it after the new service worker activates; if necessary remove and reinstall it.

## Verification status

JavaScript syntax checks and ZIP integrity checks are run for this build. The Supabase Edge Function deployment was verified as ACTIVE, version 24, with JWT verification enabled. A live Gemini request, real iPad Safari model download, and cross-device browser testing have not been performed in this environment. Verify these with a signed-in test account and a configured Gemini secret before relying on cloud mode. Local model download reliability varies by device, OS, browser and available memory.


## AI engine disposal fix
This build prevents unloading or switching a local model while inference is active, blocks overlapping local requests, and invalidates a disposed WebLLM engine with a clear reload instruction. The service-worker cache version is bumped so the updated runtime can be fetched.
