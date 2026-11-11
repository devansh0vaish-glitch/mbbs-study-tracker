# MBBS Study Tracker — Cloud AI build

## AI architecture
- The app uses one cloud AI provider: Cloudflare Workers AI through the authenticated Supabase `study-assistant` Edge Function.
- Fixed model: `@cf/zai-org/glm-4.7-flash` (GLM-4.7-Flash).
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
- The deployed function was restored as version 41 and uses GLM-4.7-Flash. The source in `supabase/functions/study-assistant/index.ts` is included for project maintenance; check the deployed source before redeploying if the backend has been changed independently.

## Deployment
Upload the updated project files to the repository's `main` branch and allow GitHub Pages to rebuild. The service-worker cache name was incremented so clients fetch the new shell. If the installed PWA still shows old code, close it completely and reopen the site once online.
