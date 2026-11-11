# Supabase backend status

The live `study-assistant` Supabase Edge Function was deployed separately and verified active at version 39.

- Project ref: `rnjmgtttujzfjonvnaae`
- Function: `study-assistant`
- Cloud default model: `@cf/zai-org/glm-4.7-flash`
- Supports account-scoped text-generation model catalogue lookup (`action: "list_models"`)
- Supports passing a selected model in `context.aiModel`
- Uses a medical-study system prompt and validates the response envelope.
- The frontend requires this live version for cloud model catalogue and manual selection.

The original ZIP contained an older function source snapshot. It is not copied into this upgraded package because redeploying it would downgrade the live function. Keep the currently deployed Supabase function version 39.
