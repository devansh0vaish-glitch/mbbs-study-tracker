// MBBS Study Tracker V36 — Gemini assistant with safe, confirm-before-apply tracker proposals.
// Store GEMINI_API_KEY only as a Supabase Edge Function secret.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}
const SYSTEM = `You are the study-planning assistant inside an MBBS study tracker.
Use only the supplied tracker context. Do not invent syllabus topics, completion status, dates, or study statistics.
You may propose changes to the tracker, but NEVER claim that you have applied them. The user must review and explicitly confirm every proposal in the app.
Return ONLY a valid JSON object with exactly these top-level keys:
{"reply":"Markdown response for the user","actions":[...]}
Allowed action objects:
1) {"type":"complete_topics","topicKeys":["exact topicKey values from topicCatalog"]}
2) {"type":"add_planner_tasks","tasks":[{"date":"YYYY-MM-DD","topicKey":"exact topicKey","type":"study"|"revision","minutes":30}]}
3) {"type":"update_planner_settings","availableMinutes":240,"newLimit":5,"prioritySubject":"exact subject string"}
Only include an action when the user clearly asks you to change tracker data. Suggestions such as "what should I study?" are advice only and must have actions:[].
Never include more than 20 topicKeys or 14 planner tasks. Use only topicKey values present in topicCatalog. For planner tasks, use a date on or after today and realistic minutes from 5 to 240. Do not propose marking a topic complete unless the user explicitly requests it. If the requested change is ambiguous, ask a clarification in reply and return actions:[].
Do not act as a patient-care decision tool. Do not provide patient-specific diagnosis or treatment advice.`;
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Sign in is required." }, 401);
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const legacyKey = Deno.env.get("SUPABASE_ANON_KEY");
    let publishableKey = req.headers.get("apikey") || legacyKey || "";
    const keyMapRaw = Deno.env.get("SUPABASE_PUBLISHABLE_KEYS");
    if (!publishableKey && keyMapRaw) {
      try { publishableKey = JSON.parse(keyMapRaw).default || ""; } catch { /* validated below */ }
    }
    if (!supabaseUrl || !publishableKey) return json({ error: "Supabase function authentication is not configured." }, 500);
    const userCheck = await fetch(`${supabaseUrl}/auth/v1/user`, { headers: { apikey: publishableKey, Authorization: authHeader } });
    if (!userCheck.ok) return json({ error: "Your session is invalid or expired. Please sign in again." }, 401);

    let payload: any;
    try { payload = await req.json(); } catch { return json({ error: "Request body must be valid JSON." }, 400); }
    const message = typeof payload?.message === "string" ? payload.message.trim().slice(0, 2500) : "";
    const context = payload?.context && typeof payload.context === "object" ? JSON.stringify(payload.context).slice(0, 14000) : "{}";
    if (!message) return json({ error: "Enter a question first." }, 400);
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) return json({ error: "Live AI is not configured. Add GEMINI_API_KEY to Supabase Function secrets." }, 503);

    const input = `${SYSTEM}\n\nACTIVE CONVERSATION AND TRACKER CONTEXT (JSON):\n${context}\n\nLATEST USER REQUEST:\n${message}`;
    const modelFallbacks = ["gemini-3.8-flash", "gemini-3.5-flash-lite"];
    let aiResponse: Response | undefined;
    let activeModel = modelFallbacks[0];

    for (const candidate of modelFallbacks) {
      activeModel = candidate;
      let fallback = false;
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          aiResponse = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
            body: JSON.stringify({ model: candidate, input, store: false }),
            signal: AbortSignal.timeout(18000),
          });
        } catch (e) {
          console.warn(`Gemini request failed for ${candidate}`, e);
          fallback = true;
          break;
        }
        if (aiResponse.status === 503) {
          if (attempt === 0) {
            await new Promise(resolve => setTimeout(resolve, 900));
            continue;
          }
          fallback = true;
          break;
        }
        break;
      }
      if (!fallback) break;
      aiResponse = undefined;
    }
    if (!aiResponse) return json({ error: "Gemini primary and fallback models are temporarily unavailable. Please try again shortly." }, 503);

    const raw = await aiResponse.text();
    let result: any = {};
    try { result = raw ? JSON.parse(raw) : {}; } catch { return json({ error: "Gemini returned an unexpected response." }, 502); }
    if (!aiResponse.ok) {
      if (aiResponse.status === 429) return json({ error: "Gemini quota or rate limit reached. No paid-provider fallback was used." }, 429);
      const detail = typeof result?.error?.message === "string" ? result.error.message.slice(0, 400) : "Gemini request failed.";
      return json({ error: `Gemini error (HTTP ${aiResponse.status}): ${detail}` }, 502);
    }

    const textOutput = (result?.steps || [])
      .filter((step: any) => step?.type === "model_output")
      .flatMap((step: any) => Array.isArray(step.content) ? step.content : [])
      .filter((part: any) => part?.type === "text" && typeof part.text === "string")
      .map((part: any) => part.text).join("\n").trim();
    if (!textOutput) return json({ error: "Gemini returned no text. Try rephrasing your request." }, 502);

    let parsed: any = null;
    try {
      const cleaned = textOutput.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
      parsed = JSON.parse(cleaned);
    } catch { /* Return plain model text safely without executable actions. */ }
    const reply = typeof parsed?.reply === "string" ? parsed.reply : textOutput;
    const actions = Array.isArray(parsed?.actions) ? parsed.actions.slice(0, 5) : [];
    return json({ reply, actions, model: activeModel, provider: "Google Gemini Interactions API" });
  } catch (error) {
    console.error("study-assistant error:", error);
    return json({ error: "The study assistant is temporarily unavailable. Try again shortly." }, 500);
  }
});
