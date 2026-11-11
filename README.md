# MBBS Study Tracker — Cloud AI build

## AI architecture
- The app uses one cloud AI provider: Cloudflare Workers AI through the authenticated Supabase `study-assistant` Edge Function.
- Fixed model: `@cf/meta/llama-3.3-70b-instruct-fp8-fast` (Llama 3.3 70B Fast).
- There is no on-device AI runtime, WebGPU dependency, local model download, provider switch, or manual model selector.
- `local-llm.js` has been removed.
- Prompts and a compact, relevant tracker context are sent to the cloud function. The app requires a valid Supabase sign-in.
- The assistant can propose tracker changes, but the frontend validates them and asks for confirmation before applying anything.

## Assistant presentation
- Markdown headings, lists, inline formatting, code blocks, tables, Mermaid-style flowcharts, and JSON chart blocks are rendered in the conversation.
- Charts must be based on numerical data supplied in the response; the assistant is instructed not to fabricate chart values.

## Supabase
- Project ref: `rnjmgtttujzfjonvnaae`
- Function: `study-assistant`
- JWT verification: enabled
- Required Supabase Edge Function secrets: `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN`.
- Do not place Cloudflare credentials in frontend files.
- The deployed function was restored as version 44 and uses Llama 3.3 70B Fast. The source in `supabase/functions/study-assistant/index.ts` is included for project maintenance; check the deployed source before redeploying if the backend has been changed independently.

## Deployment
Upload the updated project files to the repository's `main` branch and allow GitHub Pages to rebuild. The service-worker cache name was incremented so clients fetch the new shell. If the installed PWA still shows old code, close it completely and reopen the site once online.


## Cloud AI update

The only assistant model is Cloudflare Workers AI GLM-4.7-Flash (`@cf/zai-org/glm-4.7-flash`). The UI reads the model identity returned by the authenticated Supabase Edge Function and does not silently relabel an unexpected model. Tracker mutations are proposed, validated, shown for confirmation, then applied through the app's tracker state functions. Subject-wide completion resolves all topics for the selected subject from the full local syllabus.


## Integrated Upgrade v52

This release consolidates the existing tracker modules into one project and expands the cloud assistant's validated action proposals to cover topic completion, goals, planner, revision eligibility/queue, Topic Hub notes/favourites, exams, assessments, quick capture and mistake resolution. The assistant uses GLM-4.7-Flash only. No local/on-device model is included. Actions require explicit user intent and frontend confirmation.

The included Supabase Edge Function source and frontend are packaged together; deploying either is a separate step.
