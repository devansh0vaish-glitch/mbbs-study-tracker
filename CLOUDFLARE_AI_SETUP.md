# Cloudflare Workers AI setup for MBBS Study Tracker V36

## Architecture

Browser (GitHub Pages) -> authenticated Supabase Edge Function `study-assistant` -> Cloudflare Workers AI.

The browser never receives the Cloudflare API token. The Edge Function verifies the Supabase user session, forwards only the allow-listed study-tracker context and recent chat, and returns a JSON reply plus proposed tracker actions. Existing client-side validation and confirm-before-apply behaviour remains in place.

## Model selected

`@cf/zai-org/glm-4.7-flash`

Why: GLM-4.7-Flash is the single fixed cloud model used by the tracker. There is no manual model picker, on-device model, or automatic provider switching. As with any medical AI, verify important clinical and exam facts against the recommended textbooks.

## Strict-free-tier requirement

Cloudflare Workers AI documents a free allocation of 10,000 Neurons per day. On the Workers Free plan, requests stop when the free limit is exceeded. On the Workers Paid plan, usage above the free allocation is billed. To keep this project strictly free, keep the Cloudflare Workers plan on **Free** and do not enable paid overage or upgrade. The function does not retry to another provider and has no paid fallback. The frontend contains no on-device model runtime.

## One-time credentials setup

The Supabase Edge Function is deployed, but it will return HTTP 503 until these two secrets are configured:

1. In Cloudflare, open **Workers & Pages → Workers AI** and create a Workers AI API token. Use the minimum account permission **Workers AI: Read** (the API endpoint accepts Workers AI Read or Write).
2. Copy your Cloudflare **Account ID** from the Workers AI page.
3. In Supabase Dashboard, open project `rnjmgtttujzfjonvnaae` → **Edge Functions → Secrets**.
4. Add these exact secrets:
   - `CLOUDFLARE_ACCOUNT_ID` = your Cloudflare account ID
   - `CLOUDFLARE_API_TOKEN` = the Workers AI API token
5. Save. Do not paste the token into `app.js`, GitHub, or a chat message.

## Deploy the frontend

Upload the contents of this ZIP to the repository's `main` branch, replacing the matching project files. The frontend continues to call the existing Supabase function name `study-assistant`; no Cloudflare key is exposed to the browser.

## Privacy behaviour

Cloud AI is the only assistant provider. The function sends the current question, up to the last eight conversation turns, a short conversation summary, and a limited allow-list of tracker fields (study progress, topic catalog, planner, goals, upcoming exams). It does not forward authentication headers, passwords, email addresses, or arbitrary top-level payload fields. Requests are not cached by the function. Avoid entering patient-identifiable information or other sensitive personal data into the assistant.

## Verification

The Supabase function deployment is confirmed ACTIVE with JWT verification enabled. A live inference test still requires the Cloudflare secrets above. Once configured, sign in to the tracker, select **Cloudflare AI · online**, and ask a simple question. If Cloudflare quota is exhausted, the function returns a quota message and does not switch to a paid provider.
