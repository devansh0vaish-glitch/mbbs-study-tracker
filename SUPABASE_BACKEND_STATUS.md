# Supabase backend status

This ZIP contains the integrated v52 source for `study-assistant`. It uses Cloudflare Workers AI model `@cf/zai-org/glm-4.7-flash`, authenticates the caller through Supabase Auth, restricts browser origin, and proposes tracker actions for frontend validation/confirmation.

**Deployment status: not deployed by packaging this ZIP.** Deploy `supabase/functions/study-assistant/index.ts` to the existing Supabase project separately, then verify the active function version. The GitHub Pages frontend also needs to be updated from this ZIP.
