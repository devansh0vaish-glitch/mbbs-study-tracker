# MBBS Study Tracker V36 — AI chat and model-selection upgrade

This build updates the Study Assistant frontend while retaining the existing tracker, Supabase authentication/cloud sync, syllabus, PWA structure, local WebLLM runtime and confirm-before-apply tracker actions.

## AI providers and model selection

The sidebar has three provider modes:

- **Local only:** inference runs in the current browser using a downloaded WebLLM model. Requires HTTPS, WebGPU and sufficient device memory. The selected local model is cached by the browser on that device.
- **Local first · cloud fallback:** uses the loaded local model first, then Cloudflare Workers AI if local inference is unavailable. Cloud fallback requires the cloud-consent setting.
- **Cloud AI:** sends the prompt and compact relevant tracker context through the authenticated Supabase Edge Function to Cloudflare Workers AI.

Cloud requests require sign-in. Cloudflare credentials remain in Supabase secrets and are never shipped to the browser. Quotas, rate limits, model access and any charges depend on the Cloudflare account.

### Cloud model selection

- **Automatic** uses the backend-configured default model: `@cf/zai-org/glm-4.7-flash` (GLM-4.7-Flash).
- **Manual** lets the user choose from the text-generation models returned by the authenticated Cloudflare account model catalogue.
- The chosen model ID is passed to the backend. The backend validates the ID format and calls the selected Cloudflare model.
- The catalogue is account-specific; it is not a universal list of every model Cloudflare offers. Refresh it after signing in.
- The application does **not** automatically switch models based on question difficulty. Automatic currently means the configured backend default. Manual selection is explicit.

The model shown below each assistant reply identifies the model/provider returned by the backend.

### Local model catalogue

The app reads exact model IDs from the pinned WebLLM `0.2.87` runtime catalogue. Depending on that runtime build, it may offer Qwen3.5 0.8B/2B/4B, Gemma 4 E2B, Phi-4 Mini and Llama 3.2 1B. Actual availability and compatibility are checked in the browser. iOS/iPadOS Safari may not support the required WebGPU features or memory footprint.

## Rich chat responses

The chat renderer supports:

- Markdown headings, emphasis, ordered/unordered lists and fenced code.
- Markdown tables with horizontal scrolling on small screens.
- Mermaid-style `flowchart TD`/`graph TD` sequences rendered as native flow diagrams; simple branches are rendered as connected rows.
- Explicit fenced `chart` JSON blocks for bar/line charts. The model must use real values supplied in tracker context or the conversation; it must not invent clinical or tracker statistics.

## Tracker actions

The AI can propose the following changes when the user explicitly requests them:

- Complete or reopen syllabus topics.
- Set the daily topic target.
- Update weekly study-minute/topic goals.
- Add study/revision planner tasks.
- Remove existing planner tasks.
- Update planner time, daily task limit and priority subject.

Every action is checked against current tracker topic keys, dates and planner task IDs. The user must review and confirm each proposal before the app writes data. Advice or explanations alone must not trigger actions.

## Medical-study behaviour

The cloud system prompt and local model prompt prioritise accurate MBBS-level explanations, mechanisms, classifications, clinical correlations and exam/viva framing. Preferred reference hierarchy includes Robbins & Cotran, KD Tripathi (8th edition), Apurba Sastry and Park for the relevant subjects. The assistant must not invent textbook quotations, page numbers or citations and should distinguish established facts from simplified teaching explanations.

## Supabase backend

The live Supabase Edge Function `study-assistant` is deployed separately and is currently **version 39**. It includes the account-scoped model catalogue endpoint, model selection and medical-study instructions. The previous Supabase function source snapshot in the original ZIP was older; it is intentionally not included in this frontend package so it cannot accidentally downgrade the live function. Do not redeploy an old `index.ts` over the live version.

Project reference: `rnjmgtttujzfjonvnaae`.

## Updating the hosted site

Upload/commit the updated frontend files to the repository's `main` branch and let GitHub Pages rebuild. The service-worker cache has been bumped to `mbbs-v36-shell-9-ai-rich-chat`; after deployment, refresh the site or close/reopen the installed PWA so the new shell is fetched.
